# Rencana Implementasi Aplikasi Android Gratis (PWA) - SMP PGRI 1 Cikidang

Ubah aplikasi web **Absensi & Jurnal Mengajar SMP PGRI 1 Cikidang** menjadi aplikasi Android instan berbasis **Progressive Web App (PWA)** yang dapat diinstal secara **100% gratis tanpa biaya langganan Play Store**, berjalan dalam layar penuh (layaknya aplikasi Android asli di layar utama HP), dan terhubung langsung secara real-time saat online.

---

## 1. Pengalaman Pengguna & Fitur Utama

### A. Instalasi Instan Tanpa Play Store (100% Gratis)
- **Ikon Aplikasi di Layar Utama Android**: Saat diinstal, aplikasi akan muncul di layar utama (Home Screen) dan daftar aplikasi HP Android lengkap dengan nama **"Absensi SMP PGRI 1"** serta ikon resmi aplikasi.
- **Tampilan Layar Penuh (Standalone)**: Saat dibuka dari HP Android, aplikasi tampil penuh tanpa bilah alamat browser (URL bar), lengkap dengan warna tema biru (`#2563eb`) yang menyatu dengan status bar Android.
- **Mode Koneksi Online Real-Time**: Aplikasi dikonfigurasi menggunakan *Service Worker* ringan (network-first/online) agar setiap data absensi, jurnal mengajar, dan laporan selalu langsung tersinkronisasi secara akurat dengan server/database tanpa menyimpan antrean lokal yang berisiko usang.

### B. Tombol "Instal Aplikasi Android" di Halaman Login & Dashboard
- **Di Halaman Pemilihan Peran / Login**: Menampilkan kartu/tombol khusus **"Instal Aplikasi Android (Gratis)"** di bagian atas/bawah pilihan masuk (*Guru / Staf*, *Administrator*, *Orang Tua / Siswa*) agar seluruh pengguna dapat langsung memasang aplikasi sebelum masuk.
- **Di Header Dashboard Utama (Semua Peran)**: Menampilkan tombol **"Instal Aplikasi"** yang mudah dijangkau di bilah navigasi atas untuk Guru, Administrator, maupun Orang Tua/Siswa jika aplikasi belum terinstal di perangkat mereka.
- **Deteksi Pintar & Panduan Otomatis**:
  - Jika browser Android mendukung instalasi langsung (*native install prompt*), menekan tombol akan langsung memunculkan dialog **"Instal Aplikasi"** resmi dari Android.
  - Jika pengguna membuka melalui browser bawaan tertentu atau iOS/perangkat lain yang memerlukan langkah manual, menekan tombol akan menampilkan **Panduan Singkat 2 Langkah** (*"Ketuk ikon titik tiga di pojok kanan atas browser Chrome, lalu pilih Tambahkan ke Layar Utama / Instal Aplikasi"*) beserta kode QR untuk membagikan aplikasi ke HP lain.
  - Jika aplikasi sudah dibuka dari dalam aplikasi Android yang terinstal, tombol instalasi otomatis disembunyikan agar tampilan tetap bersih.

---

## 2. Arsitektur & Komponen Teknis

- **Web App Manifest (`/public/manifest.json`)**:
  - Mengatur metadata aplikasi Android (`name`, `short_name`, `display: "standalone"`, `orientation: "portrait"`, `theme_color: "#2563eb"`, `background_color: "#f8fafc"`).
  - Menyediakan ikon aplikasi resolusi tinggi (`192x192` dan `512x512` dengan dukungan `any` dan `maskable`) di folder `/public/icons/`.
- **Service Worker Ringan (`/public/sw.js`) & Registrasi (`/index.html` & `/src/main.tsx`)**:
  - Memenuhi syarat wajib instalasi PWA di Android Chrome (`beforeinstallprompt`) dengan strategi *online pass-through* agar data selalu segar dan langsung terhubung ke Firebase.
  - Menambahkan meta tag mobile & Android (`theme-color`, `mobile-web-app-capable`, `apple-mobile-web-app-capable`, dan tautan manifest) pada `index.html`.
- **Komponen Tombol & Modal Instalasi (`/src/components/InstallPwaPrompt.tsx`)**:
  - Menangkap event `beforeinstallprompt` dan `appinstalled` secara global.
  - Menyediakan dua varian tampilan: varian **Banner/Kartu Login** untuk halaman awal dan varian **Tombol Header** untuk halaman dashboard, dilengkapi modal panduan instalasi manual & QR Code berbagi aplikasi.
