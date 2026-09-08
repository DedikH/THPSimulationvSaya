# Pencarian Persen THP Berdasarkan Point Factor
![[assets/image 2.png]]

Sebagai seorang analis yang dituntut untuk merumuskan Standard Operating Procedure (SOP) secara logis dan tahan uji, kita harus mampu menceritakan dari mana sebuah angka berasal. Rumusan persentase margin ini tidak boleh dianggap sebagai angka yang "jatuh dari langit". Setiap desimalnya harus bisa dipertanggungjawabkan di hadapan manajemen maupun saat diaudit oleh pihak eksternal.
Berikut adalah narasi rasionalisasi End-to-End (dari awal hingga akhir) mengenai tata cara penentuan Margin THP, yang dirancang khusus untuk memandu pembaca teknis maupun non-teknis memahami alur arsitektur kompensasi perusahaan.

## Fase 1: Menetapkan Batas Bawah dan Batas Atas (Jangkar Anggaran)
Langkah pertama yang mutlak dilakukan sebelum membagi uang adalah mengetahui ukuran "kue" yang kita miliki. Kita harus mematok titik terendah yang legal dan titik tertinggi yang mampu dibayar perusahaan.
- **Lantai Dasar (Floor):** Kita mulai dari karyawan Entry Level (D1). Sesuai aturan kepatuhan, Gaji Pokok mereka adalah 75% dari UMK (misal UMK Rp 3.750.000). Karena posisi ini murni eksekusi tanpa risiko strategis, margin tunjangannya ditetapkan 0%. Maka, batas bawah Take Home Pay ($THP_{D1}$) terkunci di angka Rp 2.812.500.
- **Plafon Maksimal (Ceiling):** Manajemen telah menetapkan batas maksimal kemampuan bayar (Ability to Pay) untuk posisi puncak Eksekutif (D6) adalah Rp 15.000.000.
- **Selisih Anggaran (Budget Spread):** Untuk mengetahui berapa uang yang bisa dibagikan sebagai kompensasi kenaikan jabatan dari D2 hingga D6, kita kurangi Plafon Maksimal dengan Lantai Dasar (Rp 15.000.000 - Rp 2.812.500). Hasilnya, kita memiliki anggaran penyebaran sebesar Rp 12.187.500.

## Fase 2: Mendistribusikan Bobot Risiko Bertingkat (Point-Factor)
Uang sebesar Rp 12.187.500 tidak boleh dibagi rata. Sebagai problem solver, kita harus membaginya secara proporsional berdasarkan pertambahan risiko, beban kelangkaan (scarcity), dan Span of Control di setiap jenjang.
Kita menggunakan sistem Poin Kumulatif berjenjang (Tiered):
- **D1 (Titik Nol):** 0 Poin.
- **D2 (Kemandirian):** Tambah 1 Poin $\rightarrow$ Total 1 Poin.
- **D3-1 (Keahlian)** : Tambah 2 Poin $\rightarrow$ Total 3 Poin.
- **D3-2 (Supervisi):** Tambah 2 Poin $\rightarrow$ Total 5 Poin.
- **D4-1 (Kelangkaan):** Tambah 3 Poin $\rightarrow$ Total 8 Poin.
- **D4-2 (Orkestrasi):** Tambah 3 Poin $\rightarrow$ Total 11 Poin.
- **D5:** Tambah 4 Poin $\rightarrow$ Total 15 & 19 Poin.
- **D6:** Tambah 4 Poin $\rightarrow$ Total 19 Poin
Puncak akumulasi dari seluruh risiko di perusahaan ini dihargai dengan total 19 Poin Maksimal.

## Fase 3: Menentukan "Harga" dari Sebuah Tanggung Jawab (Nilai Poin)
Setelah kita mengetahui bahwa total beban di perusahaan bernilai 19 poin, kita konversikan poin tersebut ke dalam bentuk uang menggunakan rumus pembagian anggaran.

$$Nilai\ Poin = \frac{Spread\ Anggaran}{\sum Poin\ Maksimal}$$
Dengan membagi Rp 12.187.500 dengan 19 poin, kita menemukan bahwa setiap kali seorang karyawan mengambil 1 lapis risiko atau tanggung jawab baru, perusahaan akan menghargai risiko tersebut senilai Rp 641.447.

## Fase 4: Mengkalkulasi Gaji Final yang Adil (Target THP)
Di tahap ini, kita sudah bisa mencari tahu berapa gaji riil yang pantas diterima oleh setiap jenjang. Logikanya, semua karyawan memulai dari garis start yang sama (Gaji D1), barulah ditambah dengan "Harga Risiko" yang mereka pikul.

$$Target\ THP = Gapok_{D1} + (Poin_{Factor} \times Nilai\ Poin)$$
Sebagai contoh, jika kita menghitung target gaji Spesialis (D4-1) yang memikul beban 8 poin:
Target gajinya adalah Gaji Dasar (Rp 2.812.500) ditambah dengan nilai kompensasi risikonya (8 dikali Rp 641.447). Mesin hitung akan mendaratkan Target THP Spesialis (D4-1) di angka rasional Rp 7.944.076.

## Fase 5: Ekstraksi ke Persentase untuk Otomatisasi Sistem (Margin THP %)
Tahap terakhir ini sangat krusial. Sistem Payroll dan SOP tidak dirancang untuk menelan angka Rupiah mati (absolut) karena UMK berubah setiap tahun. Kita harus mengubah angka Target THP (Rp 7.944.076) menjadi sebuah format Persentase Margin (%) terhadap Gaji Pokok.
Rumus ini mencari tahu "berapa porsi selisih tunjangan jika dibandingkan dengan gaji pokoknya":

$$Margin\ THP\% = \left( \frac{Target\ THP - Gapok_{Grade}}{Gapok_{Grade}} \right) \times 100$$
- **Pencarian Selisih:** Mesin akan menghitung selisih antara Target THP (Rp 7.944.076) dengan Gaji Pokok spesialis tersebut (misal Rp 3.375.000). Selisihnya adalah uang ekstra sebesar Rp 4.569.076.
- **Pembentukan Rasio (Desimal):** Uang ekstra (Rp 4.569.076) dibagi dengan Gaji Pokok (Rp 3.375.000), menghasilkan rasio desimal 1,3538. Angka ini bermakna bahwa uang ekstra tersebut besarnya adalah 1,35 kali lipat dari gaji pokoknya.
- **Konversi Persentase Final:** Agar bisa dibaca oleh sistem, angka desimal tersebut dikalikan 100, menghasilkan persentase akhir 135,38%.
Angka 135,38% inilah yang akhirnya dicetak tebal ke dalam lembar Standard Operating Procedure (SOP).
Narasi struktural di atas dirancang untuk menyatukan realitas di lapangan dengan landasan akademis/matematis yang kokoh. Jika narasi ini dibaca oleh jajaran direksi, mereka akan melihat sebuah sistem yang logis, tidak emosional, dan melindungi keuangan perseroan.
Setelah narasi arsitektur ini selesai, apakah kita akan langsung bergerak untuk menyusun protokol transisi (klausul proteksi/ Grandfathering) untuk menangani karyawan eksisting yang saat ini mungkin terlanjur menerima gaji di atas struktur baru ini?
