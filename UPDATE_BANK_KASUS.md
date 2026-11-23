# Pembaruan Bank Kasus dan Logo Riskman

Paket ini hanya berisi file baru atau file yang perlu diganti. Ekstrak ZIP dan gabungkan isinya ke repository Riskman yang sudah dipakai. Pertahankan seluruh struktur direktorinya. Logo kompas yang disetujui berada di `public/branding/riskman-logo.png`; aset karakter hasil yang sebelumnya diunggah tetap dipakai.

## Memasang pembaruan

1. Unggah file hasil ekstraksi ke GitHub pada direktori yang sama. Ganti file lama jika nama dan lokasinya sama. `package.json` dan `package-lock.json` wajib ikut karena fitur Excel menggunakan dependensi baru.
2. Tambahkan migrasi baru `db/migrations/0003_case_packages.sql`. Jangan mengganti atau menghapus migrasi sebelumnya.
3. Buka terminal pada salinan repository terbaru, misalnya di GitHub Codespaces. Jalankan `npm ci` dengan Node.js 22.
4. Pastikan `.env.local` berisi `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` yang mengarah ke database aplikasi Vercel. Jika berkas itu belum ada, buat secara lokal. Gunakan nilai dari konfigurasi Turso yang sudah dipakai. Jangan mengunggah `.env.local` ke GitHub.
5. Jalankan:

```bash
npm run db:migrate
```

Tunggu pesan `Applied 0003_case_packages.sql` dan `Database siap.`. Jika migrasi sudah pernah diterapkan, perintah melewatinya. Migrasi menambah tabel paket kasus dan dua kolom kelas; tidak menghapus kelas, jawaban, atau hasil yang ada.

6. Setelah migrasi selesai, deploy ulang di Vercel menggunakan commit pembaruan ini. Jika unggahan GitHub telah memicu deploy lebih dahulu, lakukan Redeploy setelah migrasi.
7. Muat ulang aplikasi dengan Ctrl + F5. Login sebagai pengajar dan buka menu **Bank Kasus**. Konfigurasi Clerk dan daftar email pengajar tetap memakai nilai yang sudah ada.

Jika aplikasi menampilkan gangguan penyimpanan saat membuka Bank Kasus, periksa bahwa migrasi dijalankan pada database Turso yang sama dengan Vercel.

## Mengisi paket kasus baru

Ada tiga cara untuk mulai:

- **Buat kasus baru** untuk menyiapkan draf dengan empat instansi, kode terkait, dan baris tugas yang siap diisi.
- **Unduh template kosong**, isi di Excel, lalu **Unggah Excel**.
- **Lihat contoh** pada kasus air bersih lalu **Buat salinan draf**, atau unduh contoh Excel untuk diubah. Ini cara tercepat jika struktur tugas masih serupa.

Di editor, pilih bagian pada menu kiri. Buka tombol **Isi** pada baris untuk mengisi semua kolomnya. **Gunakan perubahan** menerapkan perubahan ke editor; **Simpan & periksa draf** menyimpannya ke database. Perubahan yang belum disimpan ditandai dan memicu pengingat ketika tab ditutup.

Format terdiri atas Profil Kasus, Profil Instansi, Proses Bisnis, Pernyataan, Bukti Berita, Pengendalian, Mitigasi, Kunci Penilaian, Register Assurer, dan Kunci Assurer. Template Excel juga memuat Panduan dan Acuan. Nama sheet dan header perlu dipertahankan. Panduan dan Acuan adalah referensi; perubahan matriks atau bobot pada sheet referensi tidak mengganti aturan penilaian aplikasi.

Per paket: empat instansi. Per instansi: 40 pernyataan dengan tepat 10 risiko benar, 10 risiko beserta berita dan kontrol, 30 opsi mitigasi, 10 register auditor, dan 60 aspek reviu. Biaya dalam Rp juta, tenaga dalam orang-hari, dan durasi paralel dalam hari. File unggahan menggunakan `.xlsx`, maksimal 2 MB, dengan nilai biasa tanpa formula atau makro.

Simpan draf untuk melihat daftar masalah menurut sheet, baris dan kolom. Pemeriksaan mencakup jumlah dan keunikan ID, hubungan antardata, K/D dan matriks, angka berita, prioritas, serta kelayakan portofolio mitigasi acuan. Validasi ini memeriksa struktur dan konsistensi angka; pengajar tetap meninjau mutu rumusan risiko, narasi berita dan alasan penilaian melalui **Pratinjau peserta**.

Setelah isian lengkap, klik **Terbitkan kasus**. Versi terbit tidak dapat ditimpa. Untuk revisi, buat salinan draf atau unggah Excel revisi sebagai paket baru. Setiap pengajar hanya dapat mengelola kasus buatannya; kasus air bersih bawaan tersedia untuk semua pengajar.

## Menggunakan kasus dalam kelas

Buka **Kelas → Buat sesi kelas**, pilih paket kasus yang sudah terbit, pilih Risk Specialist atau Risk Assurer, lalu masukkan nama kabupaten/kota kelompok. Empat tugas mengikuti instansi dalam paket tersebut. Peserta tetap memakai kode kelas tanpa login. Setiap kelas menyimpan salinan kasus dan kunci saat dibuat, sehingga perubahan atau versi baru tidak mengubah soal dan hasil kelas sebelumnya.

Bobot Specialist tetap 20/20/20/15/25; analisis kemungkinan dan dampak masing-masing 50%. Bobot Assurer tetap 50/20/30. MRI kabupaten/kota tetap gabungan empat instansi. Kelas lama tanpa paket tersimpan otomatis memakai kasus air bersih bawaan.

## Pemeriksaan yang dijalankan

- Tes penilaian Specialist dan Assurer, akses peserta, penyimpanan jawaban dan MRI gabungan.
- Tes impor/ekspor Excel, penolakan formula dan header keliru, validasi draf, akses antarpengajar, penerbitan, instansi dinamis dan versi kasus pada kelas.
- Pemeriksaan TypeScript dan build produksi.
- Pratinjau browser menggunakan identitas pengajar uji dan database lokal terpisah. Koneksi Clerk/Turso produksi diperiksa setelah pemasangan di akun Vercel Anda.
