# Chospleng Payroll (Demo)
Aplikasi payroll sederhana untuk PT. Chospleng Indonesia — static web app (HTML/CSS/JS) yang berjalan di browser menggunakan localStorage.

## Fitur
- Login admin (hrd / owner)
- Tambah/Edit/Hapus karyawan
- Input absensi harian (status & jam datang)
- Generate payroll per bulan (menghitung gaji kotor, potongan, pajak, gaji bersih)
- Cetak slip gaji PDF (jsPDF)
- Export / Import JSON, Export CSV payroll

## Cara pakai (lokal)
1. Extract folder `chospleng-payroll`.
2. Buka `index.html` di browser.
3. Login dengan akun demo: `hrd/hrd123` atau `owner/owner123`.
4. Load sample data via tombol `Load Sample` atau tambah karyawan manual.
5. Input absensi, pilih periode (YYYY-MM) lalu klik Generate.
6. Klik Cetak Slip untuk menyimpan PDF.

## Deploy ke Vercel
1. Buat repository di GitHub, push seluruh folder.
2. Login ke Vercel, pilih _New Project_ -> Import Git Repository.
3. Pilih repo dan deploy (Default static build; root is fine).
4. Selesai — aplikasi akan tersedia secara publik.

## Catatan
- Aplikasi ini bersifat demo (client-only). Untuk multi-device atau akses terpusat, butuh backend (Node.js / DB).
- Peraturan potongan sesuai permintaan: alfa 70k, telat 1 jam 5k, 2 jam 10k, >=3 jam 20k.