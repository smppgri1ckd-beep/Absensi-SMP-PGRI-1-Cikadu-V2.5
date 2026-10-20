/**
 * Generator File Pemasang & Peluncur Aplikasi Android (Standalone HTML Installer / WebAPK Launcher)
 * Memungkinkan pengguna mengunduh file fisik (.html) yang dapat dibuka langsung di HP Android
 * atau dibagikan sebagai dokumen/file melalui Grup WhatsApp Sekolah.
 */

export function getPublicShareableAppUrl(): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  // Di lingkungan AI Studio, URL ais-pre-* adalah Shared App URL publik yang bisa diakses di HP lain
  if (origin.includes('//ais-dev-')) {
    return origin.replace('//ais-dev-', '//ais-pre-');
  }
  return origin;
}

export function getDirectInstallTabUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/?install=1`;
}

export function downloadAndroidInstallerFile(schoolName = 'SMP PGRI 1 Cikidang'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const targetUrl = getPublicShareableAppUrl() || window.location.origin;
  const installUrl = `${targetUrl}/?install=1`;
  const safeFileName = `Aplikasi-Android-${schoolName.replace(/[^a-zA-Z0-9]+/g, '-')}.html`;

  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#059669" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <title>Pemasang Aplikasi Android - ${schoolName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body {
      min-height: 100vh;
      background: linear-gradient(135deg, #064e3b 0%, #0f172a 60%, #1e1b4b 100%);
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      background: #ffffff;
      color: #0f172a;
      width: 100%;
      max-width: 440px;
      border-radius: 28px;
      padding: 28px 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: #d1fae5;
      color: #065f46;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 5px 12px;
      border-radius: 999px;
      margin-bottom: 14px;
    }
    .icon-box {
      width: 76px;
      height: 76px;
      margin: 0 auto 14px;
      border-radius: 22px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      font-weight: 900;
      box-shadow: 0 12px 24px -6px rgba(37, 99, 235, 0.45);
    }
    h1 { font-size: 20px; font-weight: 900; color: #0f172a; line-height: 1.3; margin-bottom: 6px; }
    .sub { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 20px; }
    .btn-primary {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #059669, #0d9488);
      color: #ffffff;
      text-decoration: none;
      font-size: 15px;
      font-weight: 800;
      padding: 15px 20px;
      border-radius: 16px;
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 20px -5px rgba(5, 150, 105, 0.4);
      margin-bottom: 12px;
    }
    .btn-secondary {
      display: block;
      width: 100%;
      background: #f1f5f9;
      color: #334155;
      text-decoration: none;
      font-size: 12px;
      font-weight: 700;
      padding: 11px 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      margin-bottom: 18px;
    }
    .steps {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 18px;
      padding: 16px;
      text-align: left;
      font-size: 12px;
      line-height: 1.5;
      color: #334155;
    }
    .steps-title {
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .step-item { margin-bottom: 8px; }
    .step-item:last-child { margin-bottom: 0; }
    .footer {
      margin-top: 16px;
      font-size: 11px;
      color: #94a3b8;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Paket Pemasang &amp; Peluncur Resmi</span>
    <div class="icon-box">PGRI</div>
    <h1>${schoolName}</h1>
    <p class="sub">Sistem Presensi Digital, Jurnal Mengajar &amp; Portal Pantau Anak</p>

    <a href="${installUrl}" class="btn-primary">
      🚀 BUKA &amp; PASANG APLIKASI SEKARANG
    </a>

    <button type="button" id="copyBtn" class="btn-secondary" onclick="copyAppLink()">
      📋 Salin Link Aplikasi untuk Chrome Android
    </button>

    <div class="steps">
      <div class="steps-title">Cara Pasang Ikon Aplikasi di Layar Utama HP Android:</div>
      <div class="step-item"><strong>1.</strong> Ketuk tombol hijau <strong>"BUKA &amp; PASANG APLIKASI SEKARANG"</strong> di atas (pastikan terbuka di browser <strong>Google Chrome</strong>).</div>
      <div class="step-item"><strong>2.</strong> Ketuk tombol <strong>"Instal Aplikasi"</strong> di dalam aplikasi, atau ketuk menu titik tiga <strong>(⋮)</strong> di pojok kanan atas Chrome lalu pilih <strong>"Instal aplikasi" / "Tambahkan ke layar utama"</strong>.</div>
      <div class="step-item"><strong>3.</strong> Selesai! Aplikasi akan terpasang penuh di daftar aplikasi HP Android Anda secara gratis tanpa Play Store.</div>
    </div>

    <div class="footer">
      Mode Online Real-Time • Aman &amp; Bebas Peringatan Play Protect
    </div>
  </div>
  <script>
    function copyAppLink() {
      var url = "${installUrl}";
      var btn = document.getElementById("copyBtn");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          if (btn) btn.textContent = "✅ Link Berhasil Disalin! Tempel di Chrome Android";
        });
      }
    }
  </script>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = safeFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
