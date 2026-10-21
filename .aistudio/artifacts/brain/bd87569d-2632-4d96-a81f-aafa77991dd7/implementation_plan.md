# Sistem Pendaftaran Komunitas Eksklusif Berbasis Undangan & WhatsApp Gateway

Aplikasi portal pendaftaran komunitas berbasis link undangan unik satu kali pakai (one-time token), nomor referensi anggota otomatis, dashboard admin real-time untuk pemantauan anggota dan validasi undangan, serta integrasi otomatis pengiriman notifikasi WhatsApp Gateway melalui WaGate (`wa.printpro.my.id`) dan skema database MySQL terstruktur.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan sesi klarifikasi pada Phase 1, berikut adalah arahan yang telah dikonfirmasi dan disepakati:
> - **Jenis Komunitas**: Komunitas Umum & Sosial yang ramah, inklusif, dan profesional.
> - **WhatsApp Gateway**: Terintegrasi langsung dengan endpoint REST API WaGate (`https://wa.printpro.my.id/api/v1/messages/send`) dengan dukungan input `x-api-key`, `deviceId`, serta template pesan dinamis.
> - **Mekanisme Validasi Undangan**: Validasi otomatis saat pendaftar mengakses dan menyelesaikan form dengan link token unik 1 kali pakai. Status link langsung berubah menjadi *Used* dan menerbitkan Nomor Referensi Unik anggota (misal `REF-KOM-2026-XXXX`).
> - **Koneksi Database MySQL**: Disediakan modul koneksi ke MySQL (`posapp.hostr.my.id:3306`, DB: `db_print_new`) dengan skema tabel DDL lengkap, modul eksekusi SQL langsung dari dashboard, serta fallback database lokal jika terdapat batasan firewall egress di lingkungan container.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Admin Invite Engine**: Admin membuat undangan baru untuk calon anggota (nama/target nomor WhatsApp), menghasilkan link unik berekstensi token acak kriptografis (contoh: `/join?token=inv_98a7bc...`). Link otomatis hangus setelah dipakai satu kali.
  2. **WhatsApp Dispatcher**: Saat undangan dibuat atau anggota berhasil mendaftar, sistem otomatis memicu pengiriman pesan WhatsApp via gateway `wa.printpro.my.id` dengan menyertakan link pendaftaran dan nomor referensi unik anggota baru.
  3. **Halaman Pendaftaran Anggota**: Calon anggota membuka link unik, sistem memvalidasi validitas token (aktif, belum pernah dipakai, belum kedaluwarsa). Anggota mengisi data diri (Nama Lengkap, Nomor WhatsApp, Email, Domisili/Kota, Minat/Alasan Bergabung).
  4. **Penerbitan Nomor Referensi Unik**: Setelah pendaftaran tersimpan, sistem menerbitkan kartu ID / bukti registrasi digital dengan Nomor Referensi Unik (misal `REF-KOM-892147`) dan QR Code referensi yang bisa diunduh atau dibagikan.
  5. **Admin Monitoring Dashboard**: Menampilkan statistik total anggota, undangan aktif vs terpakai, tabel daftar anggota dengan filter status, manajemen undangan, riwayat log pengiriman notifikasi WhatsApp (status sukses/gagal, response payload), dan panel konfigurasi gateway serta skrip SQL.

- **Target Audience / Persona**:
  - **Pengurus / Pengelola Komunitas**: Memerlukan kontrol penuh atas siapa yang boleh bergabung tanpa link pendaftaran bocor ke publik.
  - **Calon Anggota**: Mendapatkan pengalaman registrasi yang cepat, elegan, dan menerima bukti keanggotaan terverifikasi langsung ke nomor WhatsApp mereka.

- **Key Value**: Mencegah spam dan pendaftaran tak terkontrol melalui sistem *1 Link 1 Registrasi*, akurasi identitas nomor WhatsApp, dan otomatisasi pelaporan di dashboard.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Admin Mengakses Dashboard**:
   - Melihat metrik ringkasan: Total Anggota, Undangan Aktif, Undangan Terpakai, Tingkat Keberhasilan Notifikasi WA.
   - Mengklik *"Buat Undangan Baru"*, memasukkan nama calon penerima & nomor WA.
   - Sistem menyimpan token undangan, meng-generate URL pendaftaran unik, dan otomatis mengirim pesan WA pengantar jika opsi broadcast aktif.
2. **Penerima Membuka Link Pendaftaran**:
   - Sistem memvalidasi token. Jika token sudah pernah dipakai / tidak valid, sistem menampilkan layar penjelasan ramah dengan kontak admin.
   - Jika valid, form pendaftaran interaktif terbuka dengan nama penerima yang sudah ter-praterisi secara elegan.
   - Anggota mengisi form dan menekan *"Konfirmasi & Bergabung"*.
3. **Penerbitan Referensi & Notifikasi Sukses**:
   - Token ditandai sebagai `USED`, data anggota masuk ke database, nomor referensi unik `REF-KOM-XXXXX` diterbitkan.
   - Layar sukses menampilkan ID Card Keanggotaan dengan tombol download/salin.
   - Gateway WhatsApp otomatis mengirim pesan ucapan selamat datang beserta nomor referensi unik ke WhatsApp anggota.
4. **Admin Memantau & Mengelola Data**:
   - Memfilter anggota berdasarkan tanggal, kota, atau status.
   - Melihat log pengiriman WhatsApp dengan detail waktu, nomor tujuan, payload, dan status HTTP response.
   - Melakukan uji kirim WhatsApp langsung (Test Message) untuk mengecek koneksi API Key dan Device ID.

#### Visual Identity & Theme
- **Aesthetic Direction**: *Refined Editorial SaaS & Community Hub*. Tampilan bersih, kontras tinggi, terstruktur dengan baik, tanpa elemen "AI slop" (tanpa pill capsules berlebihan, tanpa ornamen berkedip semu).
- **Color Palette**:
  - Canvas: Slate soft off-white (`#F8FAFC`) dan panel putih bersih (`#FFFFFF`) dengan hairline borders (`#E2E8F0`).
  - Primary Accent: Deep Indigo / Slate Navy (`#0F172A` & `#2563EB`) untuk tombol aksi utama dan fokus navigasi.
  - Semantic Status: Emerald (`#059669` / `#10B981`) untuk status terverifikasi & terkirim, Amber (`#D97706`) untuk pending/pending invitation, Rose (`#E11D48`) untuk token hangus atau pesan gagal.
- **Typography & Hierarchy**:
  - Font Display & UI: `Plus Jakarta Sans` untuk judul dan kontrol navigasi.
  - Monospace Data / Referensi: `JetBrains Mono` / tabular numerals (`tabular-nums`) untuk kode referensi unik, token URL, dan timestamp log.
- **Zero-Pill Discipline**:
  - Informasi status dan metadata disajikan sebagai teks bersih tanpa kapsul obat warna-warni, dipisahkan oleh tipografi separator (`·` atau `/`).
  - Filter interaktif menggunakan segmented button bar fungsional.

---

### 3. Key Product Decisions & Trade-Offs

1. **Format Token & Siklus Hidup Undangan**:
   - *Keputusan*: Token menggunakan UUIDv4 acak berkekuatan kriptografi tinggi yang disimpan di tabel `invitations`. Kolom status mencatat `pending`, `used`, atau `revoked`.
   - *Alasan*: Menjamin link tidak bisa ditebak (*tamper-proof*) dan menjamin prinsip *1 link 1 undangan* mutlak ditegakkan dalam database transaction level.

2. **Integrasi WhatsApp Gateway WaGate (`wa.printpro.my.id`)**:
   - *Keputusan*: Integrasi server-side langsung ke endpoint `https://wa.printpro.my.id/api/v1/messages/send` dengan header `x-api-key`, field `deviceId`, `receiver`, dan `message`. Disediakan panel pengaturan di dashboard agar admin bisa mengubah API Key, Device ID, dan template pesan tanpa menyentuh kode program.
   - *Alasan*: Menjaga kerahasiaan API Key di backend dan memungkinkan penyesuaian teks pesan undangan & pendaftaran secara dinamis.

3. **Manajemen Database & Eksekutor SQL**:
   - *Keputusan*: Server Express mengonfigurasi koneksi ke MySQL `posapp.hostr.my.id` sesuai kredensial pengguna, dengan proteksi fallback lokal dan menyediakan tab *"Database & Skema SQL"* di dalam dashboard untuk mengecek status koneksi, mengunduh file `.sql`, atau mengeksekusi DDL tabel secara otomatis.
   - *Alasan*: Menjawab instruksi spesifik pengguna untuk menyediakan tabel SQL aman sekaligus memastikan aplikasi tetap 100% responsif dan dapat diuji langsung di preview environment.

---

### 4. Technical Architecture & Data Strategy

#### Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19 + Vite)                      │
│                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │   Admin Dashboard   │   │       Halaman Pendaftaran Publik     │   │
│   │ ─────────────────── │   │ ──────────────────────────────────── │   │
│   │ • Ringkasan Metrik  │   │ • Validasi Token 1-Link-1-Undangan   │   │
│   │ • Kelola Undangan   │   │ • Form Data Calon Anggota            │   │
│   │ • Database Anggota  │   │ • Kartu Nomor Referensi Unik         │   │
│   │ • Log WhatsApp &    │   │ • Unduh / Salin Bukti Pendaftaran    │   │
│   │   Konfigurasi API   │   └──────────────────────────────────────┘   │
│   └─────────────────────┘                                              │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ JSON REST API
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Full-Stack Server (Express.js)                    │
│                                                                        │
│   ┌───────────────────┐   ┌────────────────────┐   ┌────────────────┐  │
│   │  /api/invitations │   │   /api/register    │   │ /api/whatsapp  │  │
│   │  Generate / Revoke│   │  Validasi & Submit │   │  WaGate Client │  │
│   └─────────┬─────────┘   └─────────┬──────────┘   └────────┬───────┘  │
└─────────────┼───────────────────────┼───────────────────────┼──────────┘
              ▼                       ▼                       ▼
┌───────────────────────────┐                 ┌──────────────────────────┐
│  Database MySQL / SQLite  │                 │ WhatsApp Gateway API     │
│  - users_members          │                 │ https://wa.printpro.my.id│
│  - invitations            │                 │ POST /api/v1/messages/   │
│  - notification_logs      │                 │      send                │
│  - app_settings           │                 └──────────────────────────┘
└───────────────────────────┘
```

#### Rancangan Tabel Database SQL (MySQL DDL)

Berikut tabel yang akan dibuat dan dieksekusi di server:

1. **`users_members`** (Menyimpan data anggota komunitas yang telah tervalidasi):
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `reference_number` (VARCHAR(50) UNIQUE NOT NULL) -- Contoh: REF-KOM-2026-87912
   - `full_name` (VARCHAR(150) NOT NULL)
   - `phone_number` (VARCHAR(30) NOT NULL)
   - `email` (VARCHAR(150) NULL)
   - `city` (VARCHAR(100) NULL)
   - `bio_interest` (TEXT NULL)
   - `invitation_id` (INT UNIQUE NOT NULL) -- Relasi 1-ke-1 dengan tabel undangan
   - `status` (ENUM('active', 'inactive', 'suspended') DEFAULT 'active')
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
   - `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

2. **`invitations`** (Menyimpan link undangan unik 1-kali-pakai):
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `token` (VARCHAR(64) UNIQUE NOT NULL) -- Hash/token kriptografis unik
   - `recipient_name` (VARCHAR(150) NOT NULL)
   - `recipient_phone` (VARCHAR(30) NOT NULL)
   - `status` (ENUM('pending', 'used', 'expired', 'revoked') DEFAULT 'pending')
   - `created_by` (VARCHAR(100) DEFAULT 'admin')
   - `expires_at` (DATETIME NULL)
   - `used_at` (DATETIME NULL)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

3. **`notification_logs`** (Mencatat setiap pengiriman notifikasi WhatsApp Gateway):
   - `id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `type` (ENUM('invite_link', 'registration_success', 'admin_alert', 'manual_test') NOT NULL)
   - `recipient_phone` (VARCHAR(30) NOT NULL)
   - `message_body` (TEXT NOT NULL)
   - `gateway_url` (VARCHAR(255) NOT NULL)
   - `http_status` (INT NULL)
   - `status` (ENUM('success', 'failed', 'pending') NOT NULL)
   - `response_payload` (TEXT NULL)
   - `error_message` (TEXT NULL)
   - `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)

4. **`app_settings`** (Menyimpan konfigurasi dinamis WhatsApp & Komunitas):
   - `setting_key` (VARCHAR(100) PRIMARY KEY)
   - `setting_value` (TEXT NULL)
   - `updated_at` (DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)

---

### 5. Rencana Tahapan Eksekusi Setelah Persetujuan

1. **Inisialisasi Backend & Dependensi Database**:
   - Memastikan paket backend (`mysql2`, `cors`, dll.) siap digunakan pada `server.ts`.
   - Mengonfigurasi script koneksi MySQL dengan pooling aman dan fallback database engine.
2. **Implementasi API REST Server**:
   - Endpoint generator & verifikator token undangan (`/api/invitations`, `/api/invitations/validate/:token`).
   - Endpoint pendaftaran anggota baru dengan transaksi atomik dan pembentukan nomor referensi unik (`/api/register`).
   - Endpoint integrasi WhatsApp WaGate (`/api/whatsapp/send`, `/api/whatsapp/test-connection`, `/api/whatsapp/logs`).
   - Endpoint manajemen database & eksekusi SQL schema (`/api/database/migrate`, `/api/database/status`).
3. **Pembangunan Halaman Pendaftaran Publik**:
   - Tampilan bersih untuk pengecekan validitas token undangan.
   - Form pendaftaran responsif dengan feedback interaktif saat pengiriman data.
   - Tampilan Kartu Identitas Digital Anggota (Ref Number, QR Code, tombol simpan/salin).
4. **Pembangunan Admin Dashboard Interaktif**:
   - Navigasi sidebar terpadu: Ringkasan Metrik, Daftar Anggota, Kelola Undangan, Log WhatsApp Gateway, Pengaturan & SQL.
   - Modal pembuatan undangan dengan opsi otomatis kirim WhatsApp.
   - Live testing WhatsApp message & pemantauan status API gateway.
5. **Verifikasi dan Pengujian Menyeluruh**:
   - Pengujian siklus penuh: Buat undangan -> Salin/Kirim link -> Isi pendaftaran -> Token hangus -> Nomor referensi terbit -> Log WhatsApp tersimpan -> Data muncul di dashboard admin.
