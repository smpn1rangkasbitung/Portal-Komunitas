# Solusi & Panduan Deployment di aaPanel (portal.sayuti.com)

Error:
```
Loading module from “https://portal.sayuti.com/src/main.tsx” was blocked because of a disallowed MIME type (“application/octet-stream”).
```

---

## 🔍 Mengapa Masalah Ini Terjadi?

Pada aaPanel, web server Nginx secara default membaca file `index.html` langsung dari **root folder** (`/www/wwwroot/portal.sayuti.com/index.html`). 
File `index.html` di root adalah file mentah untuk development yang masih mengarah ke `/src/main.tsx`. 

Karena Nginx tidak mengenali ekstensi `.tsx`, Nginx mengirimkannya dengan tipe file `application/octet-stream`, sehingga browser menolaknya.

Aplikasi ini adalah **Full-Stack Node.js (Express Backend + React Frontend)**. Nginx di aaPanel harus bertindak sebagai **Reverse Proxy** yang meneruskan request ke Node.js (port 3000), atau mengarahkan direktori public ke folder hasil build (`dist/`).

---

## 🚀 Langkah Perbaikan di aaPanel (Pilih Salah Satu)

### Cara 1: Mengatur Reverse Proxy di aaPanel (SANGAT DIREKOMENDASIKAN)

Cara ini paling ideal karena semua API backend (`/api/...`), database MySQL, dan frontend otomatis dilayani oleh Node.js pada port 3000.

1. Buka panel **aaPanel** Anda.
2. Masuk ke menu **Website** -> Klik domain **portal.sayuti.com** -> Klik tombol **Settings** (Pengaturan).
3. Di menu sebelah kiri, pilih tab **Reverse Proxy**.
4. Klik tombol **Add reverse proxy**:
   - **Proxy Name**: `portal-node`
   - **Target URL**: `http://127.0.0.1:3000`
   - **Sent Domain**: `$host` (atau biarkan default)
5. Klik **Save** / **Submit**.
6. Pastikan Node.js / PM2 Anda sedang berjalan di server:
   ```bash
   cd /www/wwwroot/portal.sayuti.com
   npm run build
   pm2 restart ecosystem.config.cjs || npm run start
   ```
7. Buka kembali `https://portal.sayuti.com` di browser (lakukan Hard Refresh: `Ctrl + Shift + R` atau `Cmd + Shift + R`). Masalah langsung teratasi!

---

### Cara 2: Melalui Menu "Node project" di aaPanel

Jika Anda mengelola Node.js langsung dari menu **Node project** di aaPanel:

1. Buka menu **Website** -> Klik tab **Node project** di bagian atas.
2. Klik **Add Node Project**:
   - **Path**: `/www/wwwroot/portal.sayuti.com`
   - **Name**: `portal-sayuti`
   - **Run Opt**: `start` (atau ketik command: `npm run start`)
   - **Port**: `3000`
   - **Node version**: Pilih Node v18, v20, atau v22.
3. Setelah project dibuat, klik pada kolom **Domain** project tersebut, lalu masukkan:
   `portal.sayuti.com`
4. aaPanel akan secara otomatis membuatkan konfigurasi Reverse Proxy Nginx ke port 3000.

---

### Cara 3: Mengubah Running Directory (Jika Nginx Melayani Statis)

Jika Anda ingin Nginx melayani file statis secara langsung:
1. Masuk ke **Website** -> Settings **portal.sayuti.com**.
2. Buka tab **Site directory**.
3. Pada bagian **Running directory**, ubah dari `/` menjadi `/dist`.
4. Klik **Save**.
5. Tambahkan reverse proxy khusus untuk backend API di tab **Reverse Proxy**:
   - Target URL: `http://127.0.0.1:3000`
   - Proxy Dir: `/api`

---

## ⚡ Ringkasan Perintah di Terminal Server

Pastikan Anda sudah menjalankan perintah build sebelum menyalakan server:
```bash
# 1. Masuk ke folder proyek
cd /www/wwwroot/portal.sayuti.com

# 2. Build aplikasi (menghasilkan folder dist/ yang bersih & teroptimasi)
npm run build

# 3. Jalankan server produksi via PM2
pm2 start ecosystem.config.cjs

# 4. Simpan status PM2
pm2 save
```
