# Panduan Menjalankan Aplikasi Menggunakan PM2 di VPS / Server

Aplikasi ini adalah full-stack Node.js (Express API + Vite React Frontend) yang berjalan pada file `server.ts`. Berikut adalah langkah-langkah lengkap untuk menjalankan dan mengelola aplikasi menggunakan **PM2** di server produksi (Ubuntu/Debian/CentOS).

---

## 1. Persiapan Server

Pastikan Node.js (versi 18, 20, atau 22) dan npm sudah terpasang. Install **PM2** secara global di server Anda:

```bash
npm install -g pm2
```

---

## 2. Setup File Environment (`.env`)

Pastikan file `.env` sudah dikonfigurasi dengan benar di folder aplikasi Anda:

```env
# Port aplikasi (default: 3000)
PORT=3000

# Konfigurasi Database MySQL
DB_CONNECTION=mysql
DB_HOST=posapp.hostr.my.id
DB_PORT=3306
DB_DATABASE=db_print_new
DB_USERNAME=db_print_new
DB_PASSWORD=YOUR_DB_PASSWORD

# WhatsApp Gateway
WA_GATEWAY_URL="https://tiket.sayuti.com/api/gateway/send"
WA_API_KEY="YOUR_WA_BEARER_TOKEN"
WA_DEVICE_ID=""
```

---

## 3. Instalasi Dependensi & Build Frontend

Sebelum menjalankan PM2 untuk pertama kali atau setelah melakukan pembaruan kode (git pull):

```bash
# 1. Masuk ke direktori aplikasi
cd /path/ke/aplikasi-anda

# 2. Install dependensi
npm install

# 3. Buat direktori logs untuk PM2
mkdir -p logs

# 4. Build frontend React ke folder dist/
npm run build
```

---

## 4. Menjalankan Aplikasi Menggunakan PM2

File konfigurasi `ecosystem.config.cjs` sudah disediakan di dalam proyek ini.

### Opsi A: Menggunakan file `ecosystem.config.cjs` (Sangat Direkomendasikan)

```bash
pm2 start ecosystem.config.cjs
```

Jika ingin menjalankan dalam mode development:
```bash
pm2 start ecosystem.config.cjs --env development
```

### Opsi B: Menggunakan Perintah Langsung (npm script)

```bash
pm2 start npm --name "portal-komunitas" -- run start
```

---

## 5. Perintah Manajemen PM2 Sehari-hari

| Perintah | Fungsi |
| :--- | :--- |
| `pm2 status` | Melihat status aplikasi (apakah online/error, penggunaan CPU & RAM) |
| `pm2 logs portal-komunitas` | Melihat log output dan error secara real-time |
| `pm2 restart portal-komunitas` | Merestart aplikasi |
| `pm2 reload portal-komunitas` | Merestart aplikasi dengan zero-downtime |
| `pm2 stop portal-komunitas` | Menghentikan sementara aplikasi |
| `pm2 delete portal-komunitas` | Menghapus aplikasi dari daftar PM2 |
| `pm2 monit` | Membuka dashboard pemantauan interaktif (CPU/RAM/Logs) |

---

## 6. Agar Aplikasi Otomatis Menyala Saat Server Reboot (Auto-Start on Boot)

Jalankan perintah ini agar PM2 otomatis menyalakan aplikasi ketika VPS Anda di-restart/reboot:

```bash
# 1. Generate skrip startup otomatis untuk OS Anda
pm2 startup

# (Salin dan jalankan perintah `sudo env PATH=...` yang dimunculkan di terminal jika diminta)

# 2. Simpan daftar proses yang sedang berjalan saat ini
pm2 save
```

---

## 7. Rekomendasi Konfigurasi Nginx Reverse Proxy (Opsional)

Jika Anda menggunakan domain sendiri (misal: `portal.domainanda.com`), arahkan domain tersebut ke port 3000 menggunakan Nginx:

```nginx
server {
    server_name portal.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Pasang SSL gratis dari Let's Encrypt:
```bash
sudo certbot --nginx -d portal.domainanda.com
```
