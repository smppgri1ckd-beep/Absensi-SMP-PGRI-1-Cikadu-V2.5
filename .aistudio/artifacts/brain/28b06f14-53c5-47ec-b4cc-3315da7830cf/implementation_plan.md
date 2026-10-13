# Pembaruan Format Tampilan & Input Jam 24-Jam WIB Kustom

Pembaruan ini secara menyeluruh mengganti seluruh input jam bawaan HTML (`type="time"`) yang sering terpengaruh oleh sistem/browser (menampilkan AM/PM 12 jam) dengan **Komponen Input Teks Kustom 24-Jam WIB (`TimePicker24h`)** beserta tombol preset fleksibel dan penjaminan format baku 24 jam (`00:00` - `23:59` WIB) di seluruh modul aplikasi.

> [!IMPORTANT] Keputusan & Solusi yang Dikonfirmasi
> - **Area Terdampak**: Seluruh input jam (Pengaturan Sesi, Jam Pelajaran JP 1-10, Jadwal Mengajar, Guru Piket, Presensi Guru/Siswa, dan Batas Tugas) serta tampilan tabel/jadwal/laporan.
> - **Solusi Input**: Menggunakan komponen input kustom dengan masker format 24 Jam (`HH:mm`), validasi jam `00:00 - 23:59`, tombol cepat preset jam pelajaran, serta tombol otomatis "WIB Sekarang" untuk mencegah browser merender format AM/PM.

---

## 1. Ikhtisar & Tujuan

Aplikasi pengelolaan sekolah SMP PGRI 1 Cikadu membutuhkan kepastian format waktu yang konsisten dalam **Format 24 Jam (WIB / UTC+7)**. Karena input bawaan browser (`type="time"`) dapat merender format 12 jam (AM/PM) tergantung pada pengaturan bahasa OS pengguna, komponen kustom `TimePicker24h` akan diterapkan untuk memastikan keakuratan waktu mengajar, jadwal piket, dan presensi.

---

## 2. Pengalaman Pengguna & Desain Visual

- **Komponen Input Jam 24-Jam (`TimePicker24h`)**:
  - Input teks terformat dengan pengetikan mudah (`HH:mm`), misalnya `07:30`, `13:15`, `14:00`.
  - Tombol penyesuaian jam cepat (`-15m`, `+15m`, `-1h`, `+1h`).
  - Menu popover / chip preset waktu (misalnya `JP 1: 07:30`, `JP 2: 08:10`, `Istirahat: 10:10`, `Sesi Siang: 12:00`, `Set Jam Sekarang`).
  - Indikator status zona waktu **WIB** secara jelas.
- **Tampilan Jadwal & Presensi**:
  - Semua tabel jadwal, kartu jurnal mengajar, dan rekapitulasi presensi menampilkan jam secara eksplisit dalam format `HH:mm WIB` (contoh: `07:30 - 08:50 WIB`).

---

## 3. Keputusan Produk & Arsitektur Teknik

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Komponen Input Kustom TimePicker24h                    │
│  [ Input Teks HH:mm ]  +  [ Tombol Increment ±15m/1h ]  +  [ Chip Presets ]  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌──────────────┐              ┌────────────────┐             ┌────────────────┐
│ Settings     │              │ Teaching       │             │ Guru Piket &   │
│ Modal        │              │ Schedule /     │             │ Presensi Guru  │
│ (Sesi & JP)  │              │ Journal        │             │ / Siswa        │
└──────────────┘              └────────────────┘             └────────────────┘
```

### Rincian Modul yang Diperbarui:
1. **`src/components/TimePicker24h.tsx`**: Komponen kustom input 24 jam reusable dengan validasi `00:00` - `23:59`.
2. **`src/components/SettingsModal.tsx`**: Mengganti 10+ elemen `<input type="time">` pada Jam Sesi Pagi, Siang, Toleransi Jumat, dan Master JP 1-10.
3. **`src/components/TeachingScheduleManager.tsx`**: Mengganti input `jamMulai` dan `jamSelesai` jadwal pelajaran.
4. **`src/components/GuruPiketManagement.tsx`**: Mengganti input jam tugas piket.
5. **`src/components/TeacherAttendanceManagement.tsx` & `TeacherSelfProfile.tsx`**: Mengganti input jam presensi guru dan jadwal mandiri.
6. **`src/components/AssignmentManagement.tsx`**: Mengganti input jam tenggat waktu tugas.
7. **`src/utils/wibTime.ts`**: Menambah pembantu penyeleksi dan pemformatan teks 24h yang ketat.
