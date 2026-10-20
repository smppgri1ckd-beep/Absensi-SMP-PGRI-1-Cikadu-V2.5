# Pemulihan Kecepatan Web & Stabilitas Database (Penghapusan Penuh Fitur PWA & Service Worker)

Rencana ini memulihkan kecepatan pemuatan (*loading*) web dan menormalkan kembali seluruh aliran data *real-time* Firebase Firestore seperti semula dengan menghapus penuh fitur Aplikasi Android (PWA), mencabut pencegatan jaringan oleh Service Worker di browser, serta tetap mempertahankan komponen pilihan cepat waktu (**TimePreset** format 24 jam) pada jadwal dan presensi.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi Anda, seluruh komponen dan layanan latar belakang PWA/Android akan dihapus sepenuhnya sekaligus dibersihkan secara otomatis dari memori browser agar koneksi database kembali cepat dan stabil.

- **Keputusan Terkonfirmasi 1 (Penghapusan Penuh PWA & Service Worker)**: Menghapus seluruh tombol, banner, modal, pelacak statistik instalasi aplikasi Android, serta mencabut Service Worker yang sebelumnya mencegat koneksi *streaming* Firebase Firestore.
- **Keputusan Terkonfirmasi 2 (Pertahankan TimePreset 24 Jam)**: Mempertahankan fitur dropdown pilihan jam cepat (**TimePreset** 24 jam: `07:00`, `07:30`, `08:30`, `12:00`, `13:00`, `14:15` + Jam JP aktif) pada form jadwal dan presensi.

---

## 1. Overview & Core Concept

- **Apa yang Dilakukan**: Mengembalikan arsitektur jaringan aplikasi ke koneksi langsung (*Direct Cloud & Local IndexedDB Cache*) tanpa perantara Service Worker maupun *plugin* pembungkus PWA, sehingga pembacaan dan penyimpanan data siswa, guru, presensi apel, jurnal KBM, dan portal Pantau Anak berjalan instan seperti sediakala.
- **Target Pengguna**: Administrator, Kepala Sekolah, Guru Mapel, Guru Piket, Siswa, dan Orang Tua di SMP PGRI 1 Cikidang.
- **Nilai Utama**: Menghilangkan *loading* lambat dan gangguan sinkronisasi database akibat intervensi Service Worker pada protokol *WebChannel/Long-Polling* milik Firestore.

---

## 2. User Experience & Visual Design

- **Alur Pengguna yang Dipulihkan**:
  1. Saat halaman dibuka, aplikasi langsung memuat state lokal dari *cache* IndexedDB secara instan tanpa tertahan oleh registrasi Service Worker atau pembacaan dokumen statistik PWA tambahan.
  2. Header navigasi atas, halaman *Login Sistem*, dan *Dashboard Utama* kembali bersih seperti tampilan awal sebelum penambahan tombol/banner instalasi aplikasi Android.
  3. Saat mengisi jam pada jadwal pelajaran, pengaturan jam apel, maupun koreksi waktu presensi, pengguna tetap dapat mengeklik kolom jam untuk memilih waktu standar sekolah dalam format 24 jam (`HH:mm`).
- **Identitas Visual & Tema**:
  - Mempertahankan desain antarmuka akademik modern berbasis *slate*, *blue*, dan *indigo* dengan tipografi tegas, kontras tinggi, dan tata letak responsif tanpa elemen *banner* promosi instalasi APK/PWA yang memenuhi ruang layar.

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Pencabutan Otomatis (*Auto-Unregister*) Service Worker yang Masih Aktif di Browser**
  - *Pendekatan yang Dipilih*: Selain menghapus kode registrasi Service Worker, aplikasi akan menjalankan pembersihan otomatis (`unregister`) atas Service Worker yang telanjur terpasang di browser pengguna saat halaman dimuat.
  - *Mengapa*: Browser menyimpan Service Worker lama di latar belakang meskipun kodenya telah dihapus dari halaman web. Dengan melakukan *auto-unregister*, browser pengguna langsung terbebas dari pencegatan jaringan tanpa perlu menghapus data browser secara manual.
- **Keputusan 2: Penghentian Penuh Operasi Firestore Tambahan dari Pelacak PWA**
  - *Pendekatan yang Dipilih*: Menghapus modul pelacak adopsi PWA yang sebelumnya melakukan pembacaan dan penulisan ke koleksi pengaturan setiap kali komponen dimuat.
  - *Mengapa*: Menghemat kuota baca/tulis harian Firestore dan memastikan jalur antrean jaringan sepenuhnya diprioritaskan untuk data inti sekolah (siswa, guru, presensi, jurnal, tugas, dan nilai).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Diagram Arsitektur Sistem (Setelah Pemulihan)**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Antarmuka Web SMP PGRI 1 Cikidang                    │
│  ┌──────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │  Navbar & Login  │  │  Dashboard & Modul   │  │ Input Jam 24 Jam  │  │
│  │ (Bersih Tanpa    │  │  Presensi / Jurnal / │  │  (TimePicker24h + │  │
│  │  Komponen PWA)   │  │     Pantau Anak      │  │   TimePreset JP)  │  │
│  └────────┬─────────┘  └──────────┬───────────┘  └─────────┬─────────┘  │
└───────────┼───────────────────────┼────────────────────────┼────────────┘
            │                       │                        │
            ▼                       ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             Layanan Data Inti & Cache-First State Manager               │
│     (Penyimpanan Lokal Instan + Sinkronisasi Langsung Tanpa Proxy)      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
         Koneksi Langsung (Tanpa Pencegatan Fetch Service Worker)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Database Cloud Firestore                          │
│   (Siswa, Guru, Presensi Apel, Jurnal KBM, Nilai, Tugas, Izin, Piket)   │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Pemetaan Komponen & Pemulihan State**:
  - **Pembersih Service Worker**: Saat aplikasi menyala, secara otomatis memeriksa dan mencabut registrasi Service Worker aktif agar koneksi *streaming* Firestore kembali langsung (*direct connection*).
  - **Navigasi, Login & Dashboard**: Menghapus seluruh *render* komponen instalasi aplikasi dari bilah navigasi, menu profil, modal login, dan halaman utama.
  - **Komponen TimePreset 24 Jam**: Tetap terhubung penuh dengan pemilih waktu 24 jam pada formulir jadwal KBM, presensi siswa/guru, izin, dan pengaturan sekolah.
