# Nara — AI Live Studio

Prototipe alpha studio localhost untuk live game dengan avatar AI dan integrasi YouTube. Kode asli aplikasi berlisensi MIT; dependensi memiliki lisensi sendiri (lihat THIRD-PARTY-NOTICES.md). Tidak memerlukan instalasi OBS.

## Jalankan

Windows, Node.js 22 atau lebih baru, Chrome/Edge. Di laptop ini dependensi sudah terpasang.

Klik `start-studio.cmd`, atau jalankan dari folder proyek:

```powershell
npm install
npm start
```

Buka **http://localhost:3210** di Chrome atau Edge. Server harus tetap berjalan. Jika halaman tidak terbuka di browser dalam aplikasi, gunakan Chrome/Edge biasa. Suara Windows dan FFmpeg tetap berjalan sebagai proses lokal; localhost bukan berarti tanpa program executable sama sekali. Jangan memakai dua tab untuk mengendalikan satu siaran.

FFmpeg diunduh melalui `ffmpeg-static` saat instalasi. Jika npm memblokir install script, ikuti instruksi npm untuk mengizinkan script paket tersebut atau jalankan `npm rebuild ffmpeg-static`. Tidak ada installer OBS.

## Coba tanpa akun

1. Klik **Tes suara avatar**. Avatar berbicara dan mulut mengikuti audio.
2. Pilih scene Gameplay, Just chatting, atau Be right back.
3. Klik **Pilih** pada Game / layar. Pilih jendela atau layar; aktifkan berbagi audio jika tersedia. Cek label sumber untuk memastikan audio ikut ditangkap.
4. Aktifkan mikrofon/webcam bila diperlukan. Pakai headphone agar suara AI tidak tertangkap ulang oleh mikrofon.
5. Klik **Rekam lokal**, kemudian **Selesai rekam** untuk mengunduh WebM. Rekaman otomatis berhenti setelah 5 menit untuk membatasi buffer RAM.

Suara awal memakai Windows System.Speech; OmniVoice tersedia melalui panel **Avatar & suara**. Voice `id-ID` dipilih jika terpasang; jika tidak, voice default Windows digunakan dan pelafalan Indonesia bisa kurang alami. Suara ini benar-benar masuk ke mixer rekaman/stream, bukan sekadar dibacakan browser.

## AI DeepSeek / Kimi / OpenAI

1. Buka **Pengaturan**.
2. Pilih provider, masukkan API key platform developer, dan tentukan model.
3. Atur persona dan informasi game/acara. AI belum melihat layar game.
4. Simpan, masukkan komentar lokal, lalu klik **Balas dengan AI**. Aktifkan **Balas otomatis** jika dibutuhkan.

Default saat dibuat: DeepSeek `deepseek-flash`, Kimi `kimi-k2.6` dengan thinking dinonaktifkan untuk percakapan singkat, OpenAI `gpt-4.1-mini`. Nama model dapat diubah sesuai akses akun. Varian Kimi K3 memakai reasoning effort rendah dan token budget lebih besar. Tidak ada fallback jawaban palsu jika API gagal.

Antrean maksimum 10 komentar, jeda default 15 detik setelah respons selesai, default batas 50 respons per sesi tab. Batas ini bukan pengganti spending limit provider. Pause membatalkan request yang berjalan, menghentikan suara, dan menghapus antrean. Riwayat lama YouTube tidak otomatis dijawab. Chat dibalas melalui suara avatar, bukan dikirim sebagai pesan teks ke chat platform.

API key AI, token login pengguna, dan stream key hanya di memori server, hilang ketika server berhenti. Kredensial aplikasi Google dibaca dari environment atau file .env milik pengembang; tidak tampil pada antarmuka pengguna. Mengganti provider menghapus key aktif agar key provider lama tidak terkirim ke provider baru. Pengaturan belum persisten. Jangan membagikan token atau memasukkan kredensial ke file source.

## Integrasi YouTube yang tersedia

- OAuth Google dengan state dan PKCE, refresh access token selama sesi.
- Daftar siaran milik akun, pilih siaran, ambil tujuan ingest dan stream key dari API.
- Live chat asli melalui YouTube Data API, pagination, deduplikasi, interval polling sesuai respons server.
- Komposisi browser + audio dikirim via WebSocket lokal ke FFmpeg, lalu H.264/AAC ke RTMP(S).
- Tombol Go live dan Akhiri live memakai transisi broadcast API.
- Koneksi manual RTMP(S) + stream key tersedia; koneksi manual saja tidak memberikan akses live chat.

### Pengguna: login dengan akun Google

1. Klik **Login dengan Google** pada kartu YouTube di studio.
2. Pilih akun Google/Gmail yang memiliki channel YouTube, lalu izinkan akses yang diminta Google.
3. Buat siaran tipe encoder di YouTube Studio (Private/Unlisted untuk uji), lalu klik **Pilih siaran** di Nara.
4. Klik **Hubungkan chat**, siapkan gambar/audio, dan klik **Kirim ke YouTube**. Auto-start di YouTube dapat langsung menayangkan siaran.
5. Jika auto-start mati, tunggu video diterima lalu klik **Go live**. Untuk monitor aktif, klik pertama memulai testing; ikuti pesan aplikasi dan klik lagi setelah siap.
6. **Hentikan encoder** menghentikan media. **Akhiri live** menutup siaran YouTube.

Pengguna biasa tidak perlu mengisi Client ID atau Client Secret. Jika aktivasi belum selesai, tombol login membuka panduan empat langkah di dalam studio. Login Google tetap memakai OAuth di belakang layar sesuai mekanisme resmi YouTube; bukan login dengan memasukkan password Gmail ke studio.

### Pengembang: aktifkan Login Google satu kali

Prototipe ini belum memiliki proyek Google terdaftar. Panduan **Aktivasi Google** di studio membantu konfigurasi sekali untuk pemilik aplikasi. Pendaftaran dan consent di Google tetap harus diselesaikan dengan akun pemilik project.

1. Buat/pilih proyek Google Cloud dan aktifkan **YouTube Data API v3**.
2. Siapkan consent screen. Dalam mode Testing, tambahkan akun penguji sebagai test user. Untuk distribusi umum, selesaikan publikasi/verifikasi yang diminta Google.
3. Buat OAuth client **Web application** dan daftarkan redirect URI `http://localhost:3210/oauth/callback`.
4. Unduh JSON client dari Google Cloud. Di studio, klik **Aktivasi Google**, pilih file tersebut, lalu **Impor & aktifkan login**. File divalidasi (jenis Web application dan redirect URI harus cocok), disimpan ke `data/google-client.json`, dan langsung aktif tanpa restart. Alternatif pengembang: isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` pada `.env`, lalu restart; environment mengambil prioritas atas file impor.
5. Tombol **Login dengan Google** membuka browser utama Windows untuk pemilihan akun dan izin YouTube. Jika tidak terbuka, gunakan **Salin tautan login**, lalu tempel di Chrome/Edge. Callback menampilkan hasil dan studio mendeteksi channel secara otomatis. Jangan membundel Client Secret asli atau folder `data/` ke repository maupun zip source. Token akun tetap hanya berada di memori server; login ulang setelah server dihentikan.

Untuk produk open-source yang dibagikan ke pengguna umum, desain distribusi autentikasi masih perlu ditentukan (misalnya client aplikasi terinstal atau layanan autentikasi yang dikelola pengembang). Konfigurasi web-client lokal di atas untuk alpha milik pengembang sendiri; jangan mengedarkan rahasia web-client bersama aplikasi. Seluruh jalur tersebut tetap menggunakan izin Google yang resmi.

Jika chat berhenti karena kuota/koneksi, pesan error muncul; sambungkan kembali secara manual. Polling menggunakan kuota YouTube; durasi panjang belum dioptimalkan dengan streamList. Tidak ada klaim sudah tersambung sebelum OAuth berhasil.

## Batas versi alpha

- YouTube memiliki integrasi akun/chat. Twitch memiliki pembaca chat publik; TikTok memiliki pembaca chat browser lokal eksperimental. Facebook Live, Kick, dan Custom RTMP/RTMPS belum memiliki pembaca chat. Semua tujuan manual menggunakan stream key.
- Capture melalui izin browser, bukan hook native game seperti OBS. Audio sistem tergantung browser, sumber capture, dan Windows.
- Tetap buka tab studio; browser dapat memperlambat rendering saat tab diminimalkan/di latar belakang.
- Media di-encode WebM di browser, lalu ditranscode FFmpeg. Ini menambah beban; **belum terbukti lebih ringan daripada OBS**. Encoder GPU tersedia sebagai pilihan jika hardware mendukung; default CPU untuk kompatibilitas.
- Avatar bawaan atau PNG dengan gambar diam, berbicara, dan kedipan opsional; posisi, ukuran, dan gerakan idle dapat diatur. Belum mendukung impor VRM/Live2D, pelacakan wajah, atau ekspresi semantik dari model.
- AI dapat membalas chat dan memakai konteks persona. Belum ada STT untuk percakapan mikrofon dengan AI, deteksi giliran bicara, atau analisis layar game.
- Belum ada reconnect encoder otomatis, recovery crash, atau uji live dua jam.
- Model AI dan YouTube membutuhkan internet. Source aplikasi terbuka; layanan cloud masing-masing bukan bagian dari lisensi aplikasi.

## Verifikasi

```powershell
npm run check
npm test
```

Tes memeriksa format ingest, deduplikasi/interval chat, perlindungan request localhost, error kredensial kosong, suara Windows WAV, serta konversi FFmpeg nyata WebM menjadi H.264/AAC FLV. Uji browser juga berhasil membuka studio, menyimpan pilihan provider, menambahkan komentar simulasi, membuat suara lokal, dan merekam komposisi WebM dengan audio nyata (peak audio -1,9 dB pada rekaman uji). Pengujian YouTube end-to-end dan AI berbayar membutuhkan kredensial pemilik akun dan belum dijalankan.

## Struktur

`server.mjs`: API lokal, OAuth, chat, AI, suara, relay encoder. `core.mjs`: adapter/model dan helper media/chat. `public/`: antarmuka dan komposisi canvas/audio. `host-controls.js`: pengaturan avatar PNG dan suara. `voice-engine.mjs` dan `omnivoice-worker.py`: pengelola model lokal. `test/`: uji otomatis.

Source aplikasi berlisensi MIT. Dependensi memiliki lisensi sendiri. FFmpeg binary yang diunduh oleh ffmpeg-static memiliki persyaratan lisensi terpisah; lihat informasi paket/binary saat mendistribusikan build. Arsip source tidak menyertakan binary atau node_modules.

Referensi: [YouTube Live API](https://developers.google.com/youtube/data/live/getting-started), [Live chat](https://developers.google.com/youtube/data/live/reference/rest/v3/liveChatMessages/list), [DeepSeek API](https://api-docs.deepseek.com/quick_start/agent_integrations/), [Kimi API](https://platform.kimi.ai/docs/get-your-api-key), [Kimi thinking](https://platform.kimi.ai/docs/guide/use-thinking-models).


## OmniVoice lokal dan avatar sendiri

Buka **Avatar & suara** di bagian atas studio. Pengaturan karakter langsung diterapkan ke canvas yang sama dengan output rekaman dan siaran.

### Avatar PNG

- Pilih **PNG milik saya**, lalu unggah gambar diam/mulut tertutup.
- Tambahkan gambar berbicara/mulut terbuka agar gambar berganti mengikuti amplitudo suara AI.
- Gambar mata tertutup opsional dipakai untuk kedipan. Pakai resolusi/posisi karakter yang sama pada ketiga gambar.
- Maksimum 5 MB per PNG, resolusi maksimum 4096×4096. Transparansi dipertahankan.
- Ukuran, posisi horizontal/vertikal, idle bernapas/bergoyang/diam, dan kedipan dapat diatur.
- PNG hanya dianimasikan dengan perpindahan gambar dan transformasi ringan; tidak memiliki rig tubuh seperti Live2D/VRM.
- Gambar disimpan dalam IndexedDB browser lokal, pengaturan posisi dalam localStorage. Tidak diunggah ke penyedia AI. Menghapus data situs akan menghapus avatar tersimpan.

### Instalasi OmniVoice

Jalankan `setup-omnivoice.ps1` dengan PowerShell dari folder proyek. Memerlukan uv (https://docs.astral.sh/uv/) dan unduhan beberapa GB. Script membuat Python 3.11 terisolasi di `.venv` dan memasang PyTorch 2.8/CUDA 12.8 serta OmniVoice 0.2.1. Tidak mengubah Python sistem. Model `k2-fsa/OmniVoice` diunduh saat pemuatan pertama ke `.runtime/models`.

1. Pilih **OmniVoice · AI lokal**.
2. Pilih CPU atau NVIDIA GPU. GPU laptop pengembangan ini RTX 3050 Ti 4 GB; ruang untuk model dan game bersamaan terbatas. CPU memberi GPU lebih banyak ruang, tetapi waktu generasi bisa lebih lama.
3. Pilih mode **Atur karakter suara**, **Gunakan contoh suara saya**, atau **Suara otomatis**. Mode otomatis tidak menjamin identitas suara yang sama pada tiap jawaban.
4. Mode karakter menggunakan atribut yang dikenali OmniVoice, contoh `female, young adult` atau `male, low pitch`. Bahasa output dipilih terpisah. Voice design terutama dilatih dalam bahasa Inggris/China; kualitas Indonesia perlu diuji.
5. Mode contoh suara: unggah WAV/MP3 milikmu/berizin (1–30 detik), isi transkripsi tepat, lalu simpan. File maksimal 12 MB, dikonversi lokal ke WAV mono 24 kHz; hanya 30 detik pertama disimpan. Transkrip wajib agar tidak memuat Whisper tambahan.
6. Klik **Simpan suara**, **Muat OmniVoice**, lalu **Tes suara**. Muat pertama memerlukan internet dan bisa lama. Setelah model cache lengkap, generasi berlangsung lokal.
7. **Lepaskan memori** menghentikan worker dan melepas model. Pause AI membatalkan proses aktif; jika sedang menghasilkan suara, worker dihentikan, sehingga permintaan berikutnya memuat model lagi.

Backend model adalah proses Python terpisah yang berkomunikasi melalui stdio, tanpa membuka port tambahan. Suara WAV masuk ke Web Audio mixer, lip sync, rekaman, dan encoder YouTube. Tidak ada fallback diam-diam ke Windows jika OmniVoice gagal. Pengaturan suara disimpan di `data/voice.json`; rekaman contoh di `data/voice-reference.wav`. Folder data, environment, dan model cache tidak termasuk arsip source. Hapus file referensi tersebut saat tidak dibutuhkan.

OmniVoice merupakan proyek pihak ketiga (Apache-2.0); lihat https://github.com/k2-fsa/OmniVoice. Model dan komponen tokenizer memiliki lisensi masing-masing. VRM/Live2D belum termasuk perubahan ini.


### Hasil uji pembaruan OmniVoice

- Tujuh tes otomatis lulus (validasi profil suara, pemilihan frame PNG, batas posisi avatar, API lokal, WAV Windows, dan encoder).
- OmniVoice 0.2.1 berhasil dimuat dan menghasilkan WAV Bahasa Indonesia pada RTX 3050 Ti 4 GB. Sampel 16 langkah: 2,11 detik generasi pada uji awal, 1,41 detik pada uji dari studio; waktu unduh/muat model tidak termasuk angka generasi. Ini bukan jaminan latensi semua kalimat atau saat game berjalan.
- Rekaman WebM melalui UI berisi suara OmniVoice nyata (peak -7,3 dB pada hasil uji).
- Unggah PNG dan persistensi setelah reload diuji melalui browser. Lip-sync pergantian frame juga diuji otomatis. Mode voice cloning sudah dihubungkan ke API model, tetapi belum diuji menggunakan rekaman pengguna.
- Tombol Lepaskan memori diuji. Integrasi AI berbayar dan siaran YouTube tetap memerlukan kredensial serta uji akun sungguhan.

### Validasi perbaikan Google Login

Delapan tes otomatis lulus. Pengujian server terisolasi memakai respons Google tiruan untuk memeriksa impor dan persistensi konfigurasi, redirect URI, PKCE, state salah, callback berulang, penolakan izin, API belum aktif, channel kosong, dan sukses yang baru diakui setelah channel tervalidasi. Secret tidak dikirim kembali lewat API status/setup; HTML callback meng-escape nama channel. Google login dengan akun sungguhan belum diuji karena project Google belum dibuat.

## TikTok via stream key

1. Di kartu **Platform siaran**, pilih **TikTok · Stream key**.
2. Klik **Atur stream key**, lalu tempel **Server URL** dan **Stream Key** yang diberikan TikTok untuk akunmu. Key dengan parameter `?` dan `&` dipertahankan utuh. Jangan masukkan key ke chat atau membagikannya.
3. Klik **Simpan koneksi**. Ini hanya menyimpan tujuan selama server berjalan, belum mengirim video.
4. Siapkan game, avatar dan audio di preview. Klik **Kirim ke TikTok** lalu konfirmasi ketika siap menyiarkan. Pastikan preview diterima dan kelola mulai/akhir LIVE dari TikTok.
5. **Hentikan encoder** menghentikan kiriman media; periksa dan akhiri sesi LIVE di TikTok bila masih berjalan.

Tidak perlu login Google untuk TikTok. Pilihan ini memakai komposisi 1280×720 (landscape) yang sama. Akses Server URL/Stream Key harus sudah tersedia di akun TikTok; studio tidak membuat akses tersebut. Pembaca komentar TikTok tersedia terpisah melalui Hubungkan chat (eksperimental); lihat panduan chat di bawah. Status tujuan tersimpan atau encoder mengirim tidak membuktikan siaran sudah tayang.

Mengganti platform menghapus tujuan dan key sebelumnya, menghentikan koneksi chat aktif, serta membatalkan pilihan siaran. Pergantian tujuan/platform ditolak saat encoder berjalan. Key tidak dikirim kembali melalui status/pengaturan. Tes lokal memeriksa isolasi platform, key berparameter, konfigurasi salah, serta alur encode video/audio. Siaran langsung ke TikTok belum diuji karena tidak ada stream key akun yang diberikan.

## Twitch, Facebook Live, Kick, dan platform lain

Di **Platform siaran**, pilih layanan lalu klik **Atur stream key**. Tiap pilihan menampilkan panduan dan tautan dashboard resmi. Ini mengirim satu komposisi game + avatar + audio AI ke satu tujuan pada satu waktu.

| Pilihan | Konfigurasi |
| --- | --- |
| Twitch | Server awal `rtmp://live.twitch.tv/app`; bisa diganti dengan ingest server pilihan. Masukkan stream key dari dashboard kreator. Atur judul dan kategori di Twitch. |
| Facebook Live | Salin Server URL dan Stream Key sesi di Live Producer. Periksa preview dan kelola LIVE di Facebook. |
| Kick | Salin Stream URL dan Key dari dashboard → Channel. Siapkan judul dan kategori sebelum mengirim. |
| Lainnya / Custom RTMP/RTMPS | Masukkan Server URL dan Stream Key dari penyedia yang menerima RTMP/RTMPS. Belum mendukung SRT, WHIP atau protokol lain. |

Penyimpanan konfigurasi tidak memulai siaran. Klik **Kirim ke [platform]** saat siap dan konfirmasi; kiriman media dapat langsung menayangkan siaran. Hentikan encoder untuk berhenti mengirim, lalu verifikasi status di platform. Login akun untuk platform tambahan ini belum tersedia. Chat Twitch dapat dihubungkan terpisah melalui username; Facebook, Kick, dan Custom belum memiliki konektor chat. Avatar, OmniVoice, capture, serta simulasi komentar tetap memakai jalur studio yang sama.

Tiga belas tes lulus, termasuk empat pilihan baru, default server Twitch, penolakan platform tidak valid, isolasi key, proteksi perubahan saat encoder aktif, dan encode H264/AAC lokal. UI pemilihan dan penyimpanan diuji dengan key contoh tanpa menyiarkan. Belum diuji dengan stream key akun sungguhan ke layanan eksternal.

Rujukan: [Twitch broadcast](https://dev.twitch.tv/docs/video-broadcast/), [Twitch stream key](https://help.twitch.tv/s/article/twitch-stream-key-faq?language=en_US), [Kick streaming](https://help.kick.com/en/articles/7066931-how-to-stream-on-kick-com), [Facebook Live Producer](https://www.facebook.com/live/producer/).


## Chat Twitch dan TikTok → suara avatar

1. Pilih platform di studio, lalu **Hubungkan chat** atau pintasan **03 · Hubungkan penonton**.
2. Masukkan username saja. Twitch membaca chat publik tanpa login. TikTok membuka jendela Microsoft Edge (fallback Google Chrome) ke halaman LIVE akun tersebut. Browser harus sudah terpasang; studio tidak mengunduh browser.
3. Biarkan jendela pembaca terbuka. Login atau CAPTCHA, jika diminta, diselesaikan sendiri di TikTok. Studio tidak mengisi password, mengambil cookie, melewati verifikasi, atau memakai Euler Stream. API key chat tidak diperlukan.
4. Status **Periksa browser** berarti belum ada komentar yang dikenali, halaman lain terbuka, atau ada login/verifikasi. Tunggu panel chat terlihat dan komentar muncul. **Membaca chat** baru diakui setelah pembaca mengenali pasangan nama + isi komentar pada halaman LIVE yang tepat.
5. Isi API key AI melalui Pengaturan, pilih suara melalui Avatar & suara, kemudian aktifkan **Balas otomatis**. Jawaban menjadi suara di mixer dan menggerakkan mulut avatar, termasuk ke siaran saat encoder aktif. Tidak mengirim pesan teks ke TikTok/Twitch.
6. **Batalkan koneksi / Putus chat** menutup browser pembaca milik studio dan menghentikan antrean AI. Browser pribadi pengguna tidak ditutup. Pergantian platform, tab pembaca ditutup, dan penghentian server juga membersihkan koneksi.

Username terakhir disimpan di browser studio. Pembaca menggunakan sesi browser sementara terpisah; sesi login tidak disimpan untuk penggunaan berikutnya. Audio halaman TikTok dibisukan agar tidak masuk kembali ke capture game. Jendela tambahan tetap memakai RAM/CPU dan dapat memutar video; belum terbukti lebih ringan daripada OBS.

Pembaca TikTok **eksperimental dan tidak resmi**. Hanya komentar yang dirender halaman dan dikenali selektornya yang bisa diambil. Komentar lama saat halaman pertama terbaca diabaikan; pesan ganda saat render ulang disaring. Komentar sangat cepat, yang tidak dirender, tampilan baru TikTok, atau halaman tertahan verifikasi dapat membuat komentar terlewat. Username saja bukan jaminan setiap akun dapat dibaca tanpa login. Status menunggu tidak membuktikan akun sedang LIVE. Tidak ada koneksi ke Euler atau layanan signing pengganti.

Implementasi: `tiktok-browser.mjs` mengelola browser terpisah melalui Playwright Core; `tiktok-dom.mjs` membaca elemen chat dan status halaman. Worker menutup browser dengan pesan stop sebelum keluar. Selektor DOM perlu diperbarui jika TikTok berubah. `test/tiktok-browser.test.mjs` menggunakan halaman tiruan dan browser tiruan untuk memeriksa riwayat, deduplikasi, login/CAPTCHA, salah channel, pembatalan startup dan penutupan; ini tidak menggantikan uji TikTok LIVE sungguhan.

Pembaruan UI: tiga pintasan persiapan yang berfungsi, platform berada di atas pratinjau, ukuran teks dan kontras ditingkatkan, status AI/chat sesuai koneksi sebenarnya, kontrol siaran mudah dijangkau, serta tata letak menyesuaikan layar kecil. Avatar, audio, dan pengaturan provider tetap menggunakan jalur studio yang sama.

Validasi manual: tombol Hubungkan chat berhasil membuka Edge ke halaman @tiktok/live tanpa key; membatalkan koneksi menutup jendela tersebut. Pembacaan komentar LIVE pengguna belum terverifikasi karena username akun LIVE belum diberikan. Inspeksi isi jendela Edge melalui alat UI tidak selesai karena persetujuannya kedaluwarsa. Jalur komentar nyata → AI berbayar → siaran publik belum diuji.

Referensi: [Twitch IRC](https://dev.twitch.tv/docs/chat/irc/), [Playwright browser channels](https://playwright.dev/docs/browsers).

Pemeriksaan akhir: 21 tes otomatis lulus. UI diuji pada viewport desktop dan 390 px; tidak ada luapan horizontal pada layar kecil. Pintasan pengaturan AI, avatar/suara, dan koneksi chat berfungsi.
