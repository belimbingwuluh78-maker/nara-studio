# Unggah Nara Studio ke GitHub

Paket ini sudah disiapkan sebagai source repository. Belum ada repository dibuat atau file diunggah ke akun GitHub.

## Lewat website

1. Ekstrak ZIP lalu buka folder `Nara-Studio`.
2. Di GitHub, buat repository baru dengan nama misalnya `nara-studio`. Tentukan Public atau Private sesuai pilihanmu. Jangan tambahkan README, license atau .gitignore otomatis karena semua sudah ada dalam paket.
3. Pada repository kosong, pilih **uploading an existing file** / **Upload files**.
4. Unggah seluruh ISI folder `Nara-Studio`, bukan ZIP-nya dan bukan folder pembungkusnya. `README.md`, `package.json`, `public/` dan `.github/` harus berada langsung di root repository.
5. Pastikan file bertitik ikut terbawa: `.github/`, `.gitignore`, `.gitattributes`, dan `.env.example`.
6. Commit perubahan. Buka tab **Actions** untuk melihat hasil pemeriksaan setelah workflow berjalan.

## Lewat Git

Jalankan dari folder `Nara-Studio`. Ganti `USERNAME` dan nama repository sesuai akunmu:

```powershell
git init
git branch -M main
git add .
git status --short
git commit -m "Initial Nara Studio alpha"
git remote add origin https://github.com/USERNAME/nara-studio.git
git push -u origin main
```

Gunakan login GitHub/Git Credential Manager ketika diminta; jangan menaruh token dalam perintah atau file source. Untuk repository yang sudah berisi commit, gunakan clone/branch dan gabungkan perubahan, jangan force-push panduan ini.

GitHub menyimpan source. Aplikasi ini tidak bisa dijalankan lewat GitHub Pages karena membutuhkan server Node.js, FFmpeg, dan browser/model lokal.
