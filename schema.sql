-- ==============================================================================
-- SKEMA TABEL DATABASE SISTEM PENDAFTARAN KOMUNITAS & WHATSAPP GATEWAY
-- Host: posapp.hostr.my.id | Database: db_print_new
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABEL UNDANGAN (invitations)
-- Menyimpan link unik 1-kali-pakai (single-use token) dan status penggunaan
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invitations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `token` VARCHAR(64) NOT NULL COMMENT 'Kunci kriptografi unik untuk link undangan',
  `recipient_name` VARCHAR(150) NOT NULL COMMENT 'Nama calon anggota yang diundang',
  `recipient_phone` VARCHAR(30) NOT NULL COMMENT 'Nomor WhatsApp calon anggota (format internasional)',
  `status` ENUM('pending', 'used', 'expired', 'revoked') NOT NULL DEFAULT 'pending' COMMENT 'Status link undangan',
  `created_by` VARCHAR(100) NOT NULL DEFAULT 'admin' COMMENT 'Pihak pembuat undangan',
  `expires_at` DATETIME NULL DEFAULT NULL COMMENT 'Batas waktu berlaku undangan',
  `used_at` DATETIME NULL DEFAULT NULL COMMENT 'Waktu undangan berhasil dipakai',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_invitation_token` (`token`),
  KEY `idx_recipient_phone` (`recipient_phone`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daftar link undangan pendaftaran 1-kali-pakai';

-- ------------------------------------------------------------------------------
-- 2. TABEL PENGGUNA / ANGGOTA (users_members)
-- Menyimpan data anggota komunitas yang berhasil mendaftar beserta Nomor Referensi Unik
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users_members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reference_number` VARCHAR(50) NOT NULL COMMENT 'Nomor referensi unik anggota baru (contoh: REF-64248)',
  `full_name` VARCHAR(150) NOT NULL COMMENT 'Nama lengkap anggota',
  `phone_number` VARCHAR(30) NOT NULL COMMENT 'Nomor WhatsApp terverifikasi',
  `email` VARCHAR(150) NULL DEFAULT NULL COMMENT 'Alamat email aktif anggota',
  `city` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Kota/Domisili tempat tinggal',
  `bio_interest` TEXT NULL DEFAULT NULL COMMENT 'Alasan bergabung atau bidang minat di komunitas',
  `invitation_id` INT UNSIGNED NOT NULL COMMENT 'ID referensi dari tabel invitations (Relasi 1-to-1)',
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active' COMMENT 'Status keanggotaan',
  `password_hash` VARCHAR(255) NULL DEFAULT NULL COMMENT 'Hash sandi akun anggota untuk login aman',
  `bank_name` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Nama bank / e-wallet untuk pencairan komisi',
  `account_number` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Nomor rekening pencairan dana',
  `account_holder` VARCHAR(150) NULL DEFAULT NULL COMMENT 'Nama pemilik rekening / atas nama',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_reference_number` (`reference_number`),
  UNIQUE KEY `idx_member_invitation_id` (`invitation_id`),
  KEY `idx_member_phone` (`phone_number`),
  KEY `idx_member_status` (`status`),
  KEY `idx_member_created_at` (`created_at`),
  CONSTRAINT `fk_members_invitation` FOREIGN KEY (`invitation_id`) REFERENCES `invitations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Data anggota komunitas terdaftar dengan nomor referensi unik';

-- ------------------------------------------------------------------------------
-- 3. TABEL LOG NOTIFIKASI WHATSAPP (notification_logs)
-- Mencatat seluruh riwayat kirim notifikasi melalui WhatsApp Gateway WaGate
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type` ENUM('invite_link', 'registration_success', 'admin_alert', 'manual_test') NOT NULL COMMENT 'Kategori pesan',
  `recipient_phone` VARCHAR(30) NOT NULL COMMENT 'Nomor WhatsApp tujuan',
  `message_body` TEXT NOT NULL COMMENT 'Isi teks pesan yang dikirimkan',
  `gateway_url` VARCHAR(255) NOT NULL COMMENT 'URL endpoint WhatsApp Gateway',
  `http_status` INT NULL DEFAULT NULL COMMENT 'HTTP status code dari gateway (200, 400, 500, etc)',
  `status` ENUM('success', 'failed', 'pending') NOT NULL DEFAULT 'pending' COMMENT 'Status pengiriman pesan',
  `response_payload` TEXT NULL DEFAULT NULL COMMENT 'Payload balasan respon JSON dari WhatsApp Gateway',
  `error_message` TEXT NULL DEFAULT NULL COMMENT 'Pesan error jika pengiriman gagal',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_log_type` (`type`),
  KEY `idx_log_status` (`status`),
  KEY `idx_log_phone` (`recipient_phone`),
  KEY `idx_log_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Riwayat audit log pengiriman notifikasi WhatsApp Gateway';

-- ------------------------------------------------------------------------------
-- ------------------------------------------------------------------------------
-- 4. TABEL PENGATURAN APLIKASI (app_settings)
-- Konfigurasi dinamis WhatsApp Gateway API, Device ID, template pesan, dan persentase komisi
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pengaturan konfigurasi dinamis aplikasi';

-- ------------------------------------------------------------------------------
-- 5. TABEL INVOICE TRANSAKSI (MENGGUNAKAN TABEL EKSIS `invoice`)
-- PENTING: Sesuai instruksi, TIDAK MEMBUAT TABEL BARU (seperti invoices)!
-- Di database db_print_new sudah ada tabel `invoice` dan terdapat kolom `nomor_referensi`.
-- Kolom `nomor_referensi` ini mencatat nomor referensi anggota penerima komisi.
--
-- Query di bawah ini menambahkan kolom pelengkap komisi ke tabel `invoice` eksis
-- jika kolom tersebut belum ada di database:
-- ------------------------------------------------------------------------------
ALTER TABLE `invoice` MODIFY COLUMN `nomor_referensi` VARCHAR(50) NULL COMMENT 'Nomor referensi unik anggota penerima komisi';
ALTER TABLE `invoice` ADD COLUMN IF NOT EXISTS `customer_name` VARCHAR(150) NULL COMMENT 'Nama customer pembeli';
ALTER TABLE `invoice` ADD COLUMN IF NOT EXISTS `customer_phone` VARCHAR(50) NULL COMMENT 'Nomor telepon/WA customer';
ALTER TABLE `invoice` ADD COLUMN IF NOT EXISTS `commission_rate_percent` DECIMAL(5,2) NULL DEFAULT 10.00 COMMENT 'Persentase komisi anggota';
ALTER TABLE `invoice` ADD COLUMN IF NOT EXISTS `commission_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00 COMMENT 'Nominal komisi anggota (Rp)';
ALTER TABLE `invoice` ADD COLUMN IF NOT EXISTS `paid_at` DATETIME NULL DEFAULT NULL COMMENT 'Waktu pembayaran lunas';

-- Index pencarian pada nomor_referensi untuk optimasi query komisi
-- CREATE INDEX idx_invoice_nomor_referensi ON `invoice` (`nomor_referensi`);

-- ------------------------------------------------------------------------------
-- 6. TABEL PENCAIRAN KOMISI / DANA ANGGOTA (disbursements)
-- Mencatat pengajuan penarikan dana/komisi anggota dan proses persetujuan (approval) admin
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `disbursements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `disbursement_code` VARCHAR(50) NOT NULL COMMENT 'Kode unik pengajuan pencairan (contoh: WD-202610-1849)',
  `member_id` INT UNSIGNED NOT NULL COMMENT 'ID anggota pengaju pencairan',
  `reference_number` VARCHAR(50) NOT NULL COMMENT 'Nomor referensi unik anggota',
  `member_name` VARCHAR(150) NOT NULL COMMENT 'Nama lengkap anggota',
  `member_phone` VARCHAR(50) NOT NULL COMMENT 'Nomor WhatsApp anggota',
  `amount` DECIMAL(14,2) NOT NULL COMMENT 'Nominal dana yang dicairkan (Rp)',
  `bank_name` VARCHAR(100) NOT NULL COMMENT 'Nama Bank / E-Wallet tujuan transfer (BCA, Mandiri, BRI, Dana, dll)',
  `account_number` VARCHAR(100) NOT NULL COMMENT 'Nomor rekening atau akun e-wallet tujuan',
  `account_holder` VARCHAR(150) NOT NULL COMMENT 'Nama pemilik rekening bank/e-wallet',
  `notes` TEXT NULL DEFAULT NULL COMMENT 'Catatan tambahan dari anggota saat pengajuan',
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT 'Status persetujuan pencairan',
  `admin_notes` TEXT NULL DEFAULT NULL COMMENT 'Catatan/alasan dari admin (bukti transfer / alasan penolakan)',
  `transfer_proof_ref` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Nomor referensi bukti transfer bank dari admin',
  `processed_by` VARCHAR(100) NULL DEFAULT NULL COMMENT 'Nama admin pemroses approval',
  `processed_at` DATETIME NULL DEFAULT NULL COMMENT 'Waktu persetujuan/penolakan diproses',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pengajuan diajukan oleh anggota',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_disbursement_code` (`disbursement_code`),
  KEY `idx_disb_member` (`member_id`),
  KEY `idx_disb_ref` (`reference_number`),
  KEY `idx_disb_status` (`status`),
  KEY `idx_disb_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Data riwayat pengajuan dan approval pencairan komisi anggota';

-- ------------------------------------------------------------------------------
-- DATA AWAL PENGATURAN (Seed Defaults)
-- ------------------------------------------------------------------------------
INSERT INTO `app_settings` (`setting_key`, `setting_value`) VALUES
('wa_gateway_url', 'https://wa.printpro.my.id/api/v1/messages/send'),
('wa_api_key', 'wg_28c0213725be4a79be28634f525db716'),
('wa_device_id', '4b2a2dcb-689f-4af5-91a3-e64a26138c12'),
('community_name', 'Portal Sayuti.com'),
('community_tagline', 'Wadah Kolaborasi, Inspirasi, dan Pertumbuhan Bersama'),
('default_invite_message', 'Halo {name}! Anda mendapatkan undangan eksklusif untuk bergabung dengan {community}. Silakan lengkapi pendaftaran melalui link resmi 1-kali-pakai berikut: {link} . Terima kasih!'),
('default_success_message', 'Selamat bergabung di {community}, {name}! Pendaftaran Anda telah berhasil diverifikasi. Nomor Referensi Unik Anggota Anda adalah: {reference_number}. Simpan nomor ini sebagai bukti identitas keanggotaan resmi Anda.'),
('commission_rate_percent', '10'),
('commission_calculation_mode', 'percentage'),
('commission_fixed_amount', '50000'),
('commission_description', 'Komisi referral diberikan untuk setiap transaksi yang berhasil dan telah berstatus lunas.'),
('min_disbursement_amount', '25000')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;
