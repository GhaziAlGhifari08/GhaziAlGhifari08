<?php
declare(strict_types=1);
/*
 * POST /api/checkout.php — menyimpan transaksi POS ke database.
 * Semua harga, stok, pajak, total, dan kembalian dihitung ulang di server.
 */
session_start();
require __DIR__ . '/../config/database.php';
header('Content-Type: application/json; charset=utf-8');

function respond(int $code, array $data): never
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(int $code, string $message): never
{
    respond($code, ['ok' => false, 'message' => $message]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Metode tidak diizinkan.');
if (empty($_SESSION['user']['id'])) fail(401, 'Sesi berakhir. Silakan login ulang.');
if (!hash_equals($_SESSION['csrf'] ?? '', $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) fail(403, 'Token keamanan tidak valid. Muat ulang halaman.');

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) fail(400, 'Data tidak valid.');

// --- Validasi input ---
$types   = ['Dine-In' => 'dine_in', 'Takeaway' => 'takeaway'];
$methods = ['Tunai' => 'tunai', 'QRIS' => 'qris', 'Debit' => 'debit', 'Transfer Bank' => 'transfer_bank'];
$type    = $types[$in['type'] ?? ''] ?? null;
$method  = $methods[$in['method'] ?? ''] ?? null;
if (!$type) fail(422, 'Tipe pesanan tidak valid.');
if (!$method) fail(422, 'Metode pembayaran tidak valid.');

$table    = trim((string)($in['table'] ?? ''));
$customer = trim((string)($in['customer'] ?? ''));
$note     = trim((string)($in['note'] ?? ''));
if ($type === 'dine_in' && $table === '') fail(422, 'Nomor meja wajib diisi untuk Dine-In.');
if ($type === 'takeaway') $table = '';
if (strlen($table) > 20 || strlen($customer) > 120 || strlen($note) > 1000) fail(422, 'Input terlalu panjang.');

$discount = $in['discount'] ?? 0;
if (!is_numeric($discount) || $discount < 0) fail(422, 'Diskon tidak valid.');
$discount = (int)round((float)$discount);

$qtyById = [];
foreach ((array)($in['items'] ?? []) as $it) {
    $id  = filter_var($it['id'] ?? null, FILTER_VALIDATE_INT);
    $qty = filter_var($it['qty'] ?? null, FILTER_VALIDATE_INT);
    if (!$id || $id < 1 || !$qty || $qty < 1 || $qty > 99) fail(422, 'Data item tidak valid.');
    $qtyById[$id] = ($qtyById[$id] ?? 0) + $qty;
}
if (!$qtyById) fail(422, 'Keranjang masih kosong.');

try {
    $pdo = db();
    $pdo->beginTransaction();

    // Kunci baris produk agar stok tidak bisa dijual ganda oleh transaksi lain.
    $ids = array_keys($qtyById);
    $ph  = implode(',', array_fill(0, count($ids), '?'));
    $st  = $pdo->prepare("SELECT id, nama_produk, harga_jual, stok, status FROM products WHERE id IN ($ph) ORDER BY id FOR UPDATE");
    $st->execute($ids);
    $products = [];
    foreach ($st->fetchAll() as $p) $products[(int)$p['id']] = $p;

    $subtotal = 0;
    $lines = [];
    foreach ($qtyById as $id => $qty) {
        $p = $products[$id] ?? null;
        if (!$p || $p['status'] !== 'aktif') { $pdo->rollBack(); fail(422, 'Ada menu yang tidak tersedia. Muat ulang halaman kasir.'); }
        if ((int)$p['stok'] < $qty) { $pdo->rollBack(); fail(422, 'Stok "' . $p['nama_produk'] . '" tidak cukup (sisa ' . (int)$p['stok'] . ').'); }
        $price = (int)round((float)$p['harga_jual']);
        $sub   = $price * $qty;
        $subtotal += $sub;
        $lines[] = ['id' => $id, 'name' => $p['nama_produk'], 'price' => $price, 'qty' => $qty, 'sub' => $sub, 'stock_left' => (int)$p['stok'] - $qty];
    }

    if ($discount > $subtotal) { $pdo->rollBack(); fail(422, 'Diskon tidak boleh melebihi subtotal.'); }
    $tax   = (int)round(($subtotal - $discount) * 0.10);
    $total = $subtotal - $discount + $tax;

    if ($method === 'tunai') {
        $paid = $in['cash'] ?? 0;
        if (!is_numeric($paid) || (float)$paid < $total) { $pdo->rollBack(); fail(422, 'Uang diterima kurang dari total tagihan.'); }
        $paid   = (int)round((float)$paid);
        $change = $paid - $total;
    } else {
        $paid = $total;
        $change = 0;
    }

    // Nomor invoice unik: INV-POS-YYYYMMDD-XXXX (coba ulang bila bentrok unique key).
    $prefix = 'INV-POS-' . date('Ymd') . '-';
    $insOrder = $pdo->prepare(
        'INSERT INTO orders (invoice_number, user_id, tipe_pesanan, nomor_meja, nama_pemesan, subtotal, pajak, diskon, grand_total, metode_bayar, uang_dibayar, uang_kembali, catatan, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,"selesai")'
    );
    $invoice = null; $orderId = 0;
    for ($try = 0; $try < 5; $try++) {
        $seq = (int)$pdo->query("SELECT COALESCE(MAX(CAST(RIGHT(invoice_number,4) AS UNSIGNED)),0)+1 FROM orders WHERE invoice_number LIKE '" . $prefix . "%'")->fetchColumn();
        $invoice = $prefix . str_pad((string)$seq, 4, '0', STR_PAD_LEFT);
        try {
            $insOrder->execute([$invoice, $_SESSION['user']['id'], $type, $table ?: null, $customer ?: null, $subtotal, $tax, $discount, $total, $method, $paid, $change, $note ?: null]);
            $orderId = (int)$pdo->lastInsertId();
            break;
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? 0) !== 1062) throw $e;
            $invoice = null;
        }
    }
    if (!$invoice) { $pdo->rollBack(); fail(500, 'Gagal membuat nomor invoice. Coba lagi.'); }

    $insDet = $pdo->prepare('INSERT INTO order_details (order_id, product_id, harga_satuan, kuantiti, subtotal_baris) VALUES (?,?,?,?,?)');
    $updStk = $pdo->prepare('UPDATE products SET stok = stok - ? WHERE id = ?');
    foreach ($lines as $l) {
        $insDet->execute([$orderId, $l['id'], $l['price'], $l['qty'], $l['sub']]);
        $updStk->execute([$l['qty'], $l['id']]);
    }

    $pdo->commit();
    respond(200, [
        'ok' => true, 'invoice' => $invoice, 'subtotal' => $subtotal, 'discount' => $discount, 'tax' => $tax,
        'total' => $total, 'paid' => $paid, 'change' => $change,
        'cashier' => $_SESSION['user']['name'], 'created_at' => date('d/m/Y H:i'), 'items' => $lines,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('checkout error: ' . $e->getMessage());
    fail(500, 'Terjadi kesalahan server. Transaksi dibatalkan.');
}
