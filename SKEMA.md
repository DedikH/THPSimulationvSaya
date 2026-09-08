# SKEMA: Simulasi Payroll Dasaria (v2.1)

**Version:** 2.1  
**Date:** 2026-09-02  
**Status:** UPDATED (HO & Branch Integration)

---

## 1. Konsep Dasar & Entitas

### 1.1 Perbandingan Head Office (HO) vs Branch

| Aspek | Head Office (HO) | Branch |
|-------|------------------|--------|
| **Plafon THP** | Rp15.000.000 (Default) | Rp10.000.000 (Default) |
| **Puncak Grade** | D6 - Executive Management | D5 - General Regional |
| **Struktur Grade** | 8 Grade (D1 - D6) | 7 Grade (D1 - D5) |
| **Managerial Code** | D3-2 & D4-2 | D33 & D43 |
| **Overtime** | Tidak Ada | Ada (Coming Soon - Tunj. Tidak Tetap) |

### 1.2 Parameter Utama (Adjustable)

- **Plafon:** Batas atas THP (Ceiling).
- **UMK:** Floor untuk perhitungan Gaji Pokok (berdasarkan 39 lokasi Jatim).
- **Gapok Anchor:** % UMK yang dijadikan Gaji Pokok (D1: 80%, D2: 78%, D3-D6: 75%).
- **THP Margin:** % Kenaikan THP di atas Gaji Pokok untuk menentukan Paket THP Dasar.

---

## 2. Formula Inti (Grade Stacking)

### 2.1 Perhitungan Paket THP Dasar
Paket THP Dasar dihitung dari Gaji Pokok ditambah margin persentase yang dapat disesuaikan per jenjang.

```
Gapok (Grade) = UMK × GapokAnchor% (Grade)
THP_Paket (Grade) = Gapok + (Gapok × Margin%)
```

### 2.2 Sub-Level Multiplier (A–E)
Multiplier diterapkan ke **THP_Paket** untuk menghasilkan 5 sub-level (Min ke Max).

| Sub-Level | Multiplier | Keterangan |
|-----------|------------|------------|
| A | 1.01 | Min |
| B | 1.02 | - |
| C | 1.03 | Midpoint |
| D | 1.04 | - |
| E | 1.05 | Max |

```
THP_Sub = min(Plafon, THP_Paket × SubMultiplier)
```

---

## 3. Komposisi Tunjangan Tetap (TT)

Terdapat 2 model perlakuan tunjangan tetap terhadap Paket THP yang aktif:

### 3.1 Perlakuan Tunjangan (Hybrid - Model Tunggal)

Hanya satu model perlakuan tunjangan tetap terhadap Paket THP yang aktif:

- **Struktural:** Masuk ke dalam Paket THP Dasar (memotong porsi Tunjangan Profesional/TTT).
- **Keluarga & Lama Kerja:** Ditambahkan di atas Paket THP Dasar (menambah total THP).

**Rumus Komposisi:**
```
THP_Akhir = Paket_THP + TT_Keluarga + TT_LamaKerja
TTT = max(0, (Paket_THP - Gapok) - TT_Struktural)
```

### 3.2 Tunjangan Lama Kerja (Pukul Rata)
Tunjangan Lama Kerja dihitung seragam untuk seluruh baris simulasi berdasarkan input tahun di parameter.

```
Lama_Kerja = Tunj_Dasar + (Tahun_Input × Kenaikan_per_Tahun)
```

### 3.3 Tunjangan Keluarga & Struktural
- **Keluarga:** `(Pasangan + Anak) × Tunj_per_Orang`.
- **Struktural:** Berdasarkan Structural Group (A, B, C) dengan Managerial Premium (1.03x atau sesuai input). Memotong TTT pada Opsi A.

---

## 4. Struktur Grade Regional (Branch)

| Golongan | Technical & Managerial | Kepangkatan | Keterangan |
|----------|------------------------|-------------|------------|
| D1 | Staff Branch | Entry Level | Fungsional |
| D2 | Staff Branch | Officer | Fungsional |
| D3-1 | Staff Branch | Principal | Fungsional |
| D4-1 | Staff Branch | Specialist | Fungsional |
| **D33** | **Branch Leader** | **Junior Management** | **Managerial Branch** |
| **D43** | **Head of Regional** | **Middle Management** | **Managerial Branch** |
| D5 | General Regional | Senior Management | Puncak Branch |

---

## 5. Constraint & Kepatuhan

1.  **PP 36/2021 (75% Rule):**
    `Gaji Pokok ≥ 75% × (Gaji Pokok + Tunjangan Tetap)`.
2.  **UMK Floor:**
    `THP D1-A (Min) ≥ UMK Lokasi`.
3.  **Plafon Cap:**
    Semua THP tidak boleh melebihi Plafon yang ditetapkan.

---

**Document Status:** UPDATED (v2.1)  
**Next Step:** Penambahan modul Overtime riil pada tabel simulasi Branch.
