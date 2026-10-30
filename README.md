# DapOS

DapOS adalah simulasi sistem operasi berbasis web yang dibuat dengan React, TypeScript, Zustand, dan Vite. Aplikasi dapat dijalankan di browser, dipasang sebagai Progressive Web App (PWA), atau dibuka sebagai aplikasi desktop melalui Electron.

## Fitur

- Desktop dengan jendela yang bisa dipindah, diubah ukurannya, diminimalkan, dimaksimalkan, dan di-snap ke sisi layar.
- Empat desktop virtual, Task View, pengalih jendela, menu Mulai, notifikasi, dan taskbar yang dapat dikustomisasi.
- Penyimpanan lokal untuk file, folder, catatan, alarm, daftar tugas, posisi ikon, pengaturan, bookmark, dan aplikasi terpasang.
- Penjelajah file dengan operasi buat, ubah nama, pindah, salin, potong, tempel, Tempat Sampah, dan pemulihan file.
- Aplikasi bawaan: Peramban bertab, Kalkulator, Terminal, Catatan, Galeri, Editor Kode Monaco, Paint, Pemutar Video, Kamera dan Perekam Suara, Jam, Arkade (Minesweeper, Snake, dan 2048), Toko Aplikasi, Pengelola Tugas, Pengaturan, dan Portofolio.
- Personalisasi tema, wallpaper, warna aksen, ukuran ikon, posisi/perataan taskbar, suara, format jam, dan mode mobile.
- Widget cuaca Open-Meteo tanpa API key dan daftar tugas di panel widget.
- Login Firebase Email/Password opsional dan sinkronisasi otomatis file serta pengaturan melalui Firestore.
- Login PIN lokal opsional untuk layar DapOS.
- PWA yang dapat dipasang dan mendukung akses offline setelah build produksi.
- Mode desktop Electron dengan sesi browser khusus yang mempertahankan cookie situs pada jendela browser eksternal.

## Persyaratan

- Node.js `24.12.0` atau lebih baru (diperlukan oleh dependensi Firebase pada lockfile saat ini).
- npm (sudah disertakan bersama Node.js).
- Firebase hanya diperlukan jika ingin menggunakan sinkronisasi cloud.

## Instalasi dan menjalankan

Jalankan perintah dari folder proyek yang berisi `package.json`:

```sh
npm install
npm run dev
```

Vite akan menampilkan alamat lokal di terminal. Buka alamat tersebut di browser.

### Peramban

Untuk development, proxy peramban lokal dijalankan pada terminal terpisah:

```sh
npm run proxy
```

Lalu jalankan `npm run dev` di terminal lain. Proxy berjalan pada port `8787`. DapOS tetap dapat dibuka tanpa proxy, tetapi sebagian situs mungkin menolak dimuat.

Server deployment mengaktifkan proxy terbatas untuk domain publik yang diizinkan: Wikipedia/Wikimedia, Mozilla/MDN, GitHub, DuckDuckGo, Bing, Hacker News, dan `dafaalfiansyah.my.id`. Proxy hanya menerima HTTPS, memeriksa DNS agar tidak menuju jaringan privat, membatasi ukuran respons menjadi 8 MB, membatasi redirect dan hingga 900 permintaan per menit per alamat IP sumber, serta tidak menerima port atau metode non-standar. Domain lain ditolak; gunakan tombol panah keluar untuk membuka situs langsung di browser utama. Situs pihak ketiga yang memerlukan login, cookie, SPA kompleks, DRM, atau WebSocket mungkin tidak berfungsi di iframe.

Proxy menggunakan koneksi HTTPS yang dipakai ulang, cache DNS singkat, dan cache memori terbatas untuk aset statis. Cache aset berlaku hingga 10 menit dan dapat membuat kunjungan ulang lebih cepat pada instance server yang sama; cache akan kosong saat server dimulai ulang dan tidak mengurangi latensi awal dari situs eksternal.

Allowlist ada di `server/proxy.mjs` (`allowedDomains`). Tambahkan hanya domain publik yang dipercaya dan butuhkan; jangan mengubah proxy menjadi penerus URL tanpa batas atau menonaktifkan validasi jaringan.

### Aplikasi desktop Electron

```sh
npm run electron:dev
```

Untuk membuat build produksi lalu membuka aplikasi desktop:

```sh
npm run desktop
```

## Build dan hosting

Buat build web produksi dengan:

```sh
npm run build
```

Hasilnya berada di folder `dist`. Folder tersebut dapat di-host pada layanan statis yang mendukung fallback SPA. Untuk PWA, gunakan HTTPS (localhost juga diperbolehkan untuk pengembangan); service worker aktif pada build produksi.

Server Node.js menyajikan folder `dist`:

```sh
npm run build
npm start
```

Server menggunakan port dari environment variable `PORT` yang disediakan platform.

### Deploy ke Railway

1. Pastikan folder `webos` (folder yang berisi `package.json`) sudah di-push ke GitHub.
2. Di Railway, buat project baru dari repository GitHub tersebut.
3. Jika repository memiliki folder `webos` di dalamnya, atur **Root Directory** service menjadi `/webos`.
4. Pastikan build menggunakan Node.js `24.12.0` atau lebih baru. `package.json` menetapkan versi minimum melalui `engines.node`; jika Railway masih memakai Node.js 18, atur variabel service `NIXPACKS_NODE_VERSION` ke versi `24` atau lebih baru.
5. Di pengaturan service Railway, tambahkan enam variabel `VITE_FIREBASE_*` yang tercantum di `.env.example`. Gunakan nilai dari Firebase Console > Project settings > Your apps > Web app.
6. Pastikan Firebase Authentication Email/Password dan Firestore Database sudah aktif pada proyek yang sama.
7. Deploy. `railway.json` mengatur build `npm run build`, start `npm start`, dan health check `/health`.
8. Setelah service berstatus aktif, buat domain publik dari pengaturan **Networking > Generate Domain**, lalu buka URL tersebut di komputer maupun HP.
9. Tambahkan domain Railway tersebut pada Firebase Console > Authentication > Settings > Authorized domains, kemudian deploy ulang jika variabel environment diubah.

Jangan isi Firebase service-account/private key ke environment `VITE_*`; hanya konfigurasi Firebase Web yang boleh dibundel di frontend. Jangan commit `.env.local` ke repository.

Kamera dan mikrofon memerlukan izin browser serta HTTPS atau localhost. Editor Kode memerlukan koneksi internet untuk memuat Monaco dari CDN pada penggunaan awal.

## Login dan penyimpanan data

DapOS menyimpan file dan pengaturan secara otomatis di penyimpanan lokal browser/perangkat. Data lokal terikat pada profil browser atau instalasi Electron yang digunakan; membersihkan data situs atau menghapus profil browser dapat menghapus data tersebut. Login PIN di Pengaturan > Keamanan hanya mengunci akses ke layar DapOS dan **bukan** enkripsi atau akun cloud.

Untuk sinkronisasi antarperangkat, aplikasi memakai satu proyek Firebase yang dikonfigurasi oleh pemilik/developer. Pengguna tidak perlu memasukkan konfigurasi Firebase. Salin `.env.example` menjadi `.env.local`, lalu isi nilainya dari **Firebase Console > Project settings > Your apps > Web app > firebaseConfig**. File `.env.local` diabaikan Git dan hanya dipakai untuk pengembangan di komputer lokal.

Saat menerbitkan website, tambahkan enam variabel `VITE_FIREBASE_*` dari `.env.example` ke pengaturan **Environment Variables** pada layanan hosting, lalu jalankan build/deploy ulang. Variabel `VITE_*` dibaca saat proses build frontend; menambahkannya hanya setelah file `dist` sudah dibangun tidak mengubah bundle yang sudah ada. Jangan commit `.env.local` ke GitHub. Website hasil deploy yang sudah dibangun dengan konfigurasi tersebut dapat dibuka dari HP dan perangkat lain melalui URL yang sama.

Layar **Masuk ke DapOS** tampil saat startup. Pengguna cukup memasukkan email dan kata sandi untuk masuk atau membuat akun pada proyek Firebase aplikasi. Firebase Authentication harus mengaktifkan Email/Password dan Firestore harus dibuat lebih dulu.

Masuk ke akun yang sama satu kali pada setiap perangkat. Firebase mempertahankan sesi login pada perangkat tersebut; data DapOS disinkronkan melalui akun cloud, bukan melalui penyimpanan browser lokal. Setelah akun masuk, perubahan file dan pengaturan disimpan otomatis ke Firestore. Ketika aplikasi dibuka kembali, jika ditemukan cadangan cloud, DapOS meminta pilihan:

- **OK**: pulihkan cadangan cloud ke perangkat ini.
- **Batal**: gunakan data perangkat ini dan unggahnya sebagai cadangan cloud.

Pilihan tersebut dapat mengganti data pada tujuan yang dipilih. Pastikan memilih sumber data yang benar sebelum melanjutkan. Login lokal tetap tersedia pada layar startup; jika PIN lokal aktif, masukkan PIN, atau pilih **Lanjutkan tanpa akun** jika belum memasang PIN. Login akun juga dapat dikelola melalui Pengaturan > Cloud, tempat tombol unggah dan unduh manual tersedia. Sinkronisasi cloud memerlukan koneksi internet; data lokal masih tersimpan ketika offline.

### Menyiapkan Firebase

1. Buat proyek di [Firebase Console](https://console.firebase.google.com/) dan tambahkan aplikasi Web.
2. Salin nilai konfigurasi aplikasi Web ke `.env.local` untuk development atau ke environment variables service hosting.
3. Aktifkan **Authentication > Sign-in method > Email/Password**.
4. Buat **Firestore Database**.
5. Atur Firestore Rules agar setiap pengguna hanya dapat membaca dan menulis dokumen dengan UID miliknya:

   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /dapos/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

6. Isi environment Firebase di `.env.local` untuk pengembangan atau pada konfigurasi environment layanan hosting, lalu build ulang/deploy aplikasi.
7. Pada layar Masuk, pilih **Buat akun** atau **Masuk dengan akun**.

Konfigurasi Firebase Web berada di sisi klien (termasuk saat dibundel ke aplikasi) dan bukan pengganti aturan keamanan. API key Firebase Web bukan rahasia; lindungi data menggunakan Firestore Rules dan jangan pernah memasukkan service-account key atau kredensial admin ke variabel `VITE_*`. Jangan gunakan aturan Firestore yang mengizinkan akses publik. Sinkronisasi menyimpan file dan pengaturan sebagai satu dokumen Firestore dengan batas sekitar 1 MB; file media besar seperti gambar dan rekaman dapat melewati batas tersebut.

## Pintasan keyboard

| Pintasan | Aksi |
| --- | --- |
| `Alt + S` | Buka/tutup menu Mulai |
| `Alt + T` / `Alt + E` | Buka Terminal / Penjelajah File |
| `Alt + V` | Buka Task View |
| `Alt + 1` sampai `Alt + 4` | Berpindah desktop virtual |
| `Alt + Q` (tahan Alt) | Berpindah antarjendela |
| `Alt + ← / → / ↑ / ↓` | Snap kiri / kanan / maksimal / pulihkan |
| `Alt + D` | Tampilkan desktop |
| `Alt + W` | Tutup jendela aktif |
| `Alt + L` | Kunci layar |
| `Ctrl + C / X / V` | Salin / potong / tempel file di Penjelajah File |

## Troubleshooting

### `npm install` atau build gagal

- Pastikan terminal berada di folder proyek yang memiliki `package.json`.
- Periksa versi Node.js dengan `node --version`; gunakan Node.js LTS yang masih didukung.
- Jalankan ulang `npm install`, kemudian `npm run build` untuk melihat diagnostik TypeScript/Vite.

### Peramban menampilkan halaman kosong atau situs tidak bisa dibuka

- Jalankan `npm run proxy` di terminal terpisah dan pastikan port `8787` tidak sedang digunakan.
- Sebagian situs memang memblokir iframe atau proxy, memerlukan login/cookie, memakai WebSocket/DRM, atau memiliki perlindungan bot. Coba buka situs di browser utama.
- Untuk domain proxy yang berbeda dengan frontend, set `VITE_PROXY_URL` sebelum build.

### Data tidak muncul di perangkat lain

- Periksa koneksi internet, konfigurasi Firebase, metode Email/Password, dan Firestore Rules.
- Pastikan login menggunakan akun yang sama. Pada prompt pemulihan, pilih sumber data yang benar.
- Periksa ukuran data: satu dokumen cloud dibatasi sekitar 1 MB. Hapus atau pindahkan media besar lalu coba lagi.
- Data lokal tidak otomatis berpindah perangkat tanpa koneksi akun Firebase dan sinkronisasi cloud.

### `Firebase: Error (auth/configuration-not-found)`

- Di Firebase Console, buka **Authentication** dan selesaikan **Get started** jika belum pernah diaktifkan.
- Pada **Authentication > Sign-in method**, aktifkan **Email/Password**.
- Pastikan `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, dan `VITE_FIREBASE_APP_ID` pada `.env.local` berasal dari aplikasi Web dalam proyek Firebase yang sama.
- Tambahkan `localhost` atau domain aplikasi ke **Authentication > Settings > Authorized domains**.
- Hentikan lalu jalankan ulang server dev setelah mengubah `.env.local`. Untuk hosting, atur variabel environment lalu build dan deploy ulang.

### `Failed to get document because the client is offline`

- Login Firebase Authentication dapat berhasil meskipun Firestore belum tersedia; DapOS tetap membuka sesi lokal dan menampilkan bahwa sinkronisasi belum berhasil.
- Pastikan Firestore Database sudah dibuat pada Firebase project yang sama, perangkat terhubung ke internet, dan jaringan tidak memblokir koneksi Firebase.
- Pastikan Firestore Rules mengizinkan pengguna yang login membaca dokumen `dapos/{uid}` miliknya.
- Setelah koneksi pulih, buka Pengaturan > Cloud dan coba **Unggah ke cloud** atau **Unduh dari cloud** lagi. Jangan unggah data lokal jika belum memastikan apakah ada cadangan cloud yang harus dipulihkan.

### `Missing or insufficient permissions`

- Error ini berarti Firestore menolak operasi karena Security Rules. Dokumen cloud yang terlihat di Firebase Console tidak otomatis berarti aplikasi punya izin membacanya.
- Di Firebase Console, buka **Firestore Database > Rules**, salin isi file [`firestore.rules`](./firestore.rules), lalu tekan **Publish**.
- Pastikan pengguna sudah login dan ID dokumen berada di `dapos/{uid}` dengan `{uid}` sama persis seperti Firebase Authentication UID pengguna tersebut.
- Tunggu rules ter-publish, muat ulang aplikasi, lalu coba **Unduh dari cloud**. Jika data sudah tampil, sinkronisasi otomatis dapat berjalan.

### Kamera atau mikrofon tidak berfungsi

- Izinkan akses kamera/mikrofon pada browser atau sistem operasi.
- Gunakan HTTPS atau `localhost`; banyak browser menolak akses perangkat pada koneksi HTTP biasa.

### PWA tidak memperbarui aplikasi

- Buat dan deploy ulang build menggunakan `npm run build`.
- Tutup lalu buka kembali aplikasi. Jika masih menggunakan versi lama, hapus cache/site data PWA dari pengaturan browser lalu pasang ulang.

## Kontribusi dan lisensi

Pull request dan laporan bug dipersilakan. Sertakan langkah reproduksi, browser/OS, dan pesan kesalahan yang relevan tanpa membagikan kata sandi atau data pribadi.

Sebelum menerbitkan atau menerima kontribusi, tambahkan file `LICENSE` dengan lisensi open-source yang sesuai dengan kebutuhan proyek dan hak atas seluruh aset yang disertakan.
