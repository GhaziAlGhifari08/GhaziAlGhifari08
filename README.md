# MED-WEB-01 — Sistem Kasir & Pemesanan Kafe Modern

UI starter berbasis PHP Native + MySQL untuk latihan web developer. Tampilan memakai CSS/JavaScript vanilla dan dirancang responsif.

## Fitur UI
- Login dari database (password_hash/password_verify) dengan session dan logout; role admin dan kasir.
- Dashboard statistik, grafik, menu terlaris, transaksi terbaru.
- POS interaktif: pencarian menu, kategori, keranjang, Dine-In/Takeaway, meja, catatan, pajak 10%, diskon, metode bayar, uang tunai/kembalian, pratinjau struk.
- Halaman katalog menu, kategori, riwayat pesanan, laporan, pengguna/role, pengaturan.
- Ekspor CSV contoh dan cetak / simpan PDF melalui dialog browser.
- Skema database MySQL untuk 5 tabel sesuai spesifikasi.

## Menjalankan secara lokal
1. Instal PHP 8.1+ dan MySQL/MariaDB (XAMPP/Laragon dapat digunakan), lalu aktifkan Apache dan MySQL.
2. Ekstrak folder proyek ke `htdocs`, misalnya `htdocs/MED-WEB-01-PHP-Native-UI`.
3. Import `database/schema.sql` melalui phpMyAdmin (tab Import) atau CLI. File ini aman di-import berulang dan sudah berisi akun serta menu awal.
4. Buka `http://localhost/MED-WEB-01-PHP-Native-UI/`.
5. Login demo: Admin `admin` / `admin123`, Kasir `kasir` / `kasir123`.
6. Jika koneksi database berbeda dari default XAMPP (user `root`, password kosong), ubah `config/database.php` atau set env `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`.

## Status implementasi
Sudah tersambung ke MySQL:
- Login (tabel `users`, password di-hash, akun harus berstatus aktif).
- Daftar menu di halaman Kasir dibaca dari tabel `products` dan `categories`, lengkap dengan stok.
- Pembayaran memanggil `api/checkout.php`: validasi di server, harga/stok dari database (bukan dari browser), transaksi PDO dengan `SELECT ... FOR UPDATE`, simpan `orders` + `order_details`, kurangi stok, `commit()`/`rollBack()`, nomor invoice unik `INV-POS-YYYYMMDD-XXXX`, token CSRF.
- Riwayat pesanan dibaca dari tabel `orders` dengan filter tanggal, metode, dan status.

Masih data ilustrasi (belum dari database): Dashboard, halaman Menu/Kategori (form tambah belum menyimpan), Laporan, Pengguna, dan Pengaturan.

## Sebelum produksi
- Buat `config/database.php` dengan PDO, `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION`, prepared statements, dan kredensial melalui environment variables.
- Autentikasi dari database memakai `password_hash()` dan `password_verify()`, status akun aktif, `session_regenerate_id(true)`, cookie session `HttpOnly`, `Secure` di HTTPS, dan `SameSite`.
- Tambahkan middleware autentikasi dan pemeriksaan role di setiap halaman/API. Admin mengelola menu/kategori/pengguna/laporan; kasir mengelola transaksi dan melihat riwayat sesuai izin.
- Tambahkan CSRF token pada seluruh form mutasi, validasi input sisi server, escaping output dengan `htmlspecialchars`, rate limiting login, dan pesan error generik.
- Pada checkout, validasi harga/stok dari database (jangan percaya harga dari browser), mulai transaksi PDO, kunci stok dengan `SELECT ... FOR UPDATE`, cek stok, simpan `orders` dan seluruh `order_details`, kurangi stok, lalu `commit()`. Jika ada kegagalan, `rollBack()`.
- Hitung ulang subtotal, diskon, pajak, total, uang diterima, dan kembalian di server; cegah diskon melebihi subtotal dan uang tunai kurang dari total.
- Buat nomor invoice unik di server dan tangani benturan unique key.
- Buat query laporan menggunakan rentang tanggal inklusif yang benar, filter kategori/metode, serta ekspor CSV/PDF dari hasil database yang telah diotorisasi.
- Tambahkan uji integrasi untuk stok habis, pembayaran kurang, transaksi rollback, akses role, duplikasi invoice, dan input berbahaya.

## Struktur
- `index.php` — login dan halaman aplikasi.
- `config/database.php` — koneksi PDO.
- `api/checkout.php` — endpoint penyimpanan transaksi POS.
- `logout.php` — logout dan penghapusan session.
- `assets/style.css` — sistem desain responsif.
- `assets/app.js` — interaksi demo POS dan UI.
- `database/schema.sql` — skema database relasional 5 tabel.

## Pemetaan rubrik
- Fungsionalitas & alur bisnis: antarmuka 4 modul dan alur POS interaktif; integrasi backend masih perlu dikerjakan.
- Integritas & keamanan: logout/session dasar pada demo, skema InnoDB; hashing DB, validasi server, transaksi ACID dan proteksi CSRF masih perlu implementasi.
- UI/UX: sidebar, status, statistik, tabel, filter, formulir, responsif.
- Kualitas kode & dokumentasi: struktur aset terpisah, komentar, skema SQL, README.
