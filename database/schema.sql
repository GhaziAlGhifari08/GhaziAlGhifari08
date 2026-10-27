CREATE DATABASE IF NOT EXISTS med_web_01 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE med_web_01;

CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(60) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 nama_lengkap VARCHAR(120) NOT NULL,
 role ENUM('admin','kasir') NOT NULL DEFAULT 'kasir',
 status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 nama_kategori VARCHAR(100) NOT NULL,
 slug VARCHAR(120) NOT NULL UNIQUE,
 status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 category_id BIGINT UNSIGNED NOT NULL,
 kode_produk VARCHAR(40) NOT NULL UNIQUE,
 nama_produk VARCHAR(140) NOT NULL,
 harga_jual DECIMAL(12,2) NOT NULL,
 harga_pokok DECIMAL(12,2) NOT NULL DEFAULT 0,
 stok INT UNSIGNED NOT NULL DEFAULT 0,
 status ENUM('aktif','nonaktif') NOT NULL DEFAULT 'aktif',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
 CONSTRAINT chk_products_price CHECK (harga_jual >= 0 AND harga_pokok >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 invoice_number VARCHAR(40) NOT NULL UNIQUE,
 user_id BIGINT UNSIGNED NOT NULL,
 tipe_pesanan ENUM('dine_in','takeaway') NOT NULL,
 nomor_meja VARCHAR(20) NULL,
 nama_pemesan VARCHAR(120) NULL,
 subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
 pajak DECIMAL(12,2) NOT NULL DEFAULT 0,
 diskon DECIMAL(12,2) NOT NULL DEFAULT 0,
 grand_total DECIMAL(12,2) NOT NULL DEFAULT 0,
 metode_bayar ENUM('tunai','qris','transfer_bank','debit') NOT NULL,
 uang_dibayar DECIMAL(12,2) NOT NULL DEFAULT 0,
 uang_kembali DECIMAL(12,2) NOT NULL DEFAULT 0,
 catatan TEXT NULL,
 status ENUM('diproses','selesai','dibatalkan') NOT NULL DEFAULT 'diproses',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
 INDEX idx_orders_created_at (created_at),
 INDEX idx_orders_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_details (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 product_id BIGINT UNSIGNED NOT NULL,
 harga_satuan DECIMAL(12,2) NOT NULL,
 kuantiti INT UNSIGNED NOT NULL,
 subtotal_baris DECIMAL(12,2) NOT NULL,
 catatan_khusus VARCHAR(255) NULL,
 CONSTRAINT fk_order_details_order FOREIGN KEY (order_id) REFERENCES orders(id),
 CONSTRAINT fk_order_details_product FOREIGN KEY (product_id) REFERENCES products(id),
 CONSTRAINT chk_order_details_qty CHECK (kuantiti > 0)
) ENGINE=InnoDB;

-- ===== DATA AWAL (aman dijalankan berulang) =====
-- Akun demo: admin / admin123, kasir / kasir123, kasir_pagi / kasir123
-- (password disimpan sebagai hash password_hash(), bukan teks biasa)
INSERT INTO users (username, password_hash, nama_lengkap, role) VALUES
('admin', '$2y$10$acdlRwwFIIVGLqwMnIdAFuqEScfW541/to3jVWJKSctY0KVC2tHQ2', 'Admin Kafe', 'admin'),
('kasir', '$2y$10$HpeCs2eY4b7RENQcsWH4YO5E9/sygY5RCt0.AroxbNGodSbD2xzMi', 'Kasir Pagi', 'kasir'),
('kasir_pagi', '$2y$10$HpeCs2eY4b7RENQcsWH4YO5E9/sygY5RCt0.AroxbNGodSbD2xzMi', 'Kasir Pagi', 'kasir')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nama_lengkap = VALUES(nama_lengkap), role = VALUES(role), status = 'aktif';

INSERT IGNORE INTO categories (id, nama_kategori, slug) VALUES
(1, 'Coffee', 'coffee'),
(2, 'Non-Coffee', 'noncoffee'),
(3, 'Food', 'food'),
(4, 'Pastry', 'pastry');

INSERT IGNORE INTO products (id, category_id, kode_produk, nama_produk, harga_jual, harga_pokok, stok) VALUES
(1, 1, 'PRD-001', 'Es Kopi Susu Aren', 28000, 12000, 50),
(2, 1, 'PRD-002', 'Café Latte', 30000, 13000, 50),
(3, 1, 'PRD-003', 'Americano', 24000, 9000, 50),
(4, 2, 'PRD-004', 'Iced Matcha Latte', 32000, 15000, 40),
(5, 2, 'PRD-005', 'Chocolate Frappe', 33000, 15000, 40),
(6, 4, 'PRD-006', 'Butter Croissant', 22000, 10000, 30),
(7, 3, 'PRD-007', 'Chicken Sandwich', 38000, 18000, 30),
(8, 3, 'PRD-008', 'French Fries', 25000, 9000, 40);
