# SKEMA: Simulasi Payroll Dasaria

**Version:** 1.0
**Date:** 2026-08-25
**Status:** APPROVED

---

## 1. Konsep Dasar

### 1.1 Dua Pendekatan

| Pendekatan | Alias | Basis Anchor | Keterangan |
|------------|-------|--------------|------------|
| **Pendekatan Lama** | `lama` | Manual anchor per jenjang | User input anchor % langsung |
| **Pendekatan Baru** | `baru` | Plafon-Based (otomatis) | Anchor dihitung dari Plafon & Sigma |

### 1.2 Parameter Utama

| Parameter | Default | Keterangan |
|-----------|---------|------------|
| Plafon | Rp15.000.000 | Batas atas THP (ceiling) |
| Sigma | 85% | Porsi tetap di puncak → D6 anchor default |
| sigmaC | Rp12.750.000 | = Plafon × Sigma% (referensi puncak, **bukan** basis anchor) |
| GapPct | 2% | Gap antar jenjang (untuk interpolasi) |
| UMK | Bervariasi per lokasi | Floor untuk Gapok |

### 1.3 8 Jenjang

| Code | Nama | Track | Loading | Structural Group |
|------|------|-------|---------|------------------|
| D1 | Entry Level | Functional | 10.0% | - |
| D2 | Officer | Functional | 24.2% | - |
| D3-1 | Principal | Functional | 38.4% | A |
| D4-1 | Specialist | Functional | 52.6% | B |
| D3-2 | Junior Management | Managerial | 38.4% | A |
| D4-2 | Middle Management | Managerial | 52.6% | B |
| D5 | Senior Management | Managerial | 66.8% | C |
| D6 | Executive Management | Managerial | 81.0% | C |

> D3-2 dan D4-2 mendapat **Premium Managerial** (default 1.03×)

### 1.4 5 Sub-Level

| Sub-Level | Label | Keterangan |
|-----------|-------|------------|
| A | Min | Dasar (sub terendah) |
| B | - | |
| C | Mid | Midpoint |
| D | - | |
| E | Max | Maksimum |

---

## 2. Formula Inti

### 2.1 Anchor % THP per Jenjang (Plafon-Based)

**Anchor = % dari Plafon** (bukan sigmaC)

```
D6 Anchor  = Sigma%           (default 85%)
D1 Anchor  = (75% × UMK) / Plafon × 100
D2-D5      = Geometric interpolation antara D1 dan D6
```

**Rumus Interpolasi:**
```
growth = (D6_Anchor / D1_Anchor) ^ (1/5)
D(i)   = D1_Anchor × growth^(i-1)
```

**Constraint:**
- D1 Anchor ≥ 1% (floor absolut)
- D1 Anchor < D6 Anchor (jika tidak, D1 = D6 × 0.5)

**THP per jenjang:**
```
THP = Anchor% × Plafon
```

**Contoh (Plafon=15M, Sigma=85%, UMK Kota Malang=3.736.101):**

| Grade | Anchor% | THP |
|-------|---------|-----|
| D1 | 18.68% | Rp2.802.000 |
| D2 | 25.29% | Rp3.794.000 |
| D3-1 | 34.25% | Rp5.137.000 |
| D4-1 | 46.37% | Rp6.955.000 |
| D5 | 62.78% | Rp9.417.000 |
| D6 | 85.00% | Rp12.750.000 |

> **Manual Override:** User bisa ubah anchor per jenjang di Menu 2.
> Contoh: D6 = 75% → THP = 75% × Rp15M = **Rp11.250.000**

### 2.2 Anchor % Gapok per Jenjang (UMK-Based)

**Gapok = GapokAnchor% × UMK** (flat, tidak ada sub-level multiplier)

| Grade | GapokAnchor% | Keterangan |
|-------|-------------|------------|
| D1 | 80% | |
| D2 | 78% | |
| D3-1 | 75% | |
| D4-1 | 75% | |
| D3-2 | 75% | |
| D4-2 | 75% | |
| D5 | 75% | |
| D6 | 75% | |

**Constraint Hukum (PP 36/2021 Pasal 7):**
```
Gapok ≥ 75% × (Gapok + TT)
```
Diperiksa via `calc75Ratio(gapok, tt)` → harus ≥ 75%

### 2.3 Sub-Level Multiplier

Multiplier diterapkan ke **THP base** (bukan ke Gapok)

| Sub-Level | Multiplier | Keterangan |
|-----------|------------|------------|
| A | 1.01 | Dasar |
| B | 1.02 | |
| C | 1.03 | Midpoint |
| D | 1.04 | |
| E | 1.05 | Maksimum |

```
THP_sub = THP_base × Multiplier_sub
Gapok_sub = Gapok (sama untuk A-E)
```

### 2.4 Komponen THP

```
THP = Gapok + TT_Riil + TTT

Dimana:
  TT_Riil  = Keluarga + Lama_Kerja + Struktural
  TTT      = max(0, TT_Riil_total - TT_Riil)
```

> **Catatan:** `TTT` (Tunjangan Tidak Tetap) adalah residual jika TT_Riil > komponen tunjangan.

---

## 3. Tunjangan Tetap (TT)

### 3.1 Tunjangan Keluarga

```
Keluarga = (Pasangan + Anak) × Tunj_per_Anak

Default:
  Pasangan    = 1
  Anak        = 2
  Per Anak    = Rp100.000
  Keluarga    = (1 + 2) × 100.000 = Rp300.000
```

### 3.2 Tunjangan Lama Kerja

```
Lama_Kerja = Tahun × Tunj_per_Tahun

Tahun dihitung dari sub-level:
  Sub A (idx=0): 0 tahun
  Sub B (idx=1): 1.25 tahun
  Sub C (idx=2): 2.5 tahun
  Sub D (idx=3): 3.75 tahun
  Sub E (idx=4): 5 tahun

Rumus: years = (subIdx / 4) × maxMasaKerjaTahun

Default:
  maxMasaKerjaTahun  = 5
  Tunj_per_Tahun     = Rp50.000
```

### 3.3 Tunjangan Struktural

```
Struktural = Nominal Group + Premium Managerial

Structural Groups:
  Group A (D3-1, D3-2): Rp200.000
  Group B (D4-1, D4-2): Rp400.000
  Group C (D5, D6):     Rp600.000

Premium Managerial (D3-2, D4-2):
  Nominal = Base × (1 + extraManajerialPct / 100)
  Default extraManajerialPct = 50%
  → D3-2: 200.000 × 1.5 = Rp300.000
  → D4-2: 400.000 × 1.5 = Rp600.000

Toggle:
  D3-1 bisa di-disable (enableStrukturalD31)
  D4-1 bisa di-disable (enableStrukturalD41)
  D1, D2 = 0 (tidak ada struktural)
```

---

## 4. Alur Perhitungan

### 4.1 Pendekatan Baru (Plafon-Based)

```
INPUT:
  Plafon  = Rp15.000.000
  Sigma   = 85%
  UMK     = Rp3.736.101 (Kota Malang)

STEP 1 — Hitung Anchor (% dari Plafon):
  sigmaC     = Plafon × Sigma% = Rp12.750.000
  D6_Anchor  = Sigma = 85%
  D1_Anchor  = (75% × UMK) / Plafon × 100 = 18.68%
  growth     = (85 / 18.68)^(1/5) = 1.354
  D3-1       = 18.68% × 1.354^2 = 34.25%

STEP 2 — Hitung THP Base:
  THP_base(D3-1) = Plafon × Anchor% = 15M × 34.25% = Rp5.137.000

STEP 3 — Apply Sub-Level Multiplier:
  THP(D3-1, Sub C) = 5.137.000 × 1.03 = Rp5.291.000

STEP 4 — Hitung Gapok:
  Gapok(D3-1) = GapokAnchor% × UMK = 75% × 3.736.101 = Rp2.802.000

STEP 5 — Hitung TT Riil:
  TT_Riil = THP - Gapok = 5.291.000 - 2.802.000 = Rp2.489.000

STEP 6 — Split TT Riil ke Komponen:
  Keluarga    = Rp300.000  (fixed)
  Lama_Kerja  = Rp125.000  (varies by sub-level)
  Struktural  = Rp200.000  (Group A)
  Total TT    = Rp625.000

STEP 7 — Hitung TTT:
  TTT = max(0, TT_Riil - Total_TT)
      = max(0, 2.489.000 - 625.000)
      = Rp1.864.000

STEP 8 — Final:
  THP = Gapok + Total_TT + TTT
      = 2.802.000 + 625.000 + 1.864.000
      = Rp5.291.000 ✓

STEP 9 — Compliance Check:
  Ratio = Gapok / (Gapok + Total_TT) = 2.802.000 / 3.427.000 = 81.8% ≥ 75% ✓
```

### 4.2 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT PARAMETERS                         │
│  Plafon, Sigma%, UMK Lokasi, GapokAnchor per Jenjang       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           STEP 1: ANCHOR CALCULATION                        │
│  calcAnchorsFromPlafon(plafon, sigma, umk)                  │
│  → Anchor% per jenjang (% dari Plafon)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           STEP 2: THP BASE                                  │
│  THP_base = Plafon × Anchor%                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           STEP 3: SUB-LEVEL MULTIPLIER                      │
│  THP_sub = THP_base × Multiplier(A-E)                       │
│  Gapok = GapokAnchor% × UMK (flat, no multiplier)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           STEP 4: COMPONENT SPLIT                           │
│  TT_Riil = THP - Gapok                                      │
│  TT_Keluarga    = fixed                                     │
│  TT_LamaKerja   = f(subIdx)                                 │
│  TT_Struktural  = f(structuralGroup)                        │
│  TTT = max(0, TT_Riil - Total_TT)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           STEP 5: COMPLIANCE                                │
│  75% Rule: Gapok / (Gapok + TT) ≥ 75%                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Default Values

### 5.1 Anchor % THP per Jenjang (Plafon-Based)

| Grade | Anchor% | THP (Plafon=15M) |
|-------|---------|-------------------|
| D1 | 18.68% | Rp2.802.000 |
| D2 | 25.29% | Rp3.794.000 |
| D3-1 | 34.25% | Rp5.137.000 |
| D3-2 | 34.25% | Rp5.137.000 |
| D4-1 | 46.37% | Rp6.955.000 |
| D4-2 | 46.37% | Rp6.955.000 |
| D5 | 62.78% | Rp9.417.000 |
| D6 | 85.00% | Rp12.750.000 |

### 5.2 Anchor % Gapok per Jenjang (UMK-Based)

| Grade | GapokAnchor% | Gapok (UMK Kota Malang) |
|-------|-------------|-------------------------|
| D1 | 80% | Rp2.989.000 |
| D2 | 78% | Rp2.914.000 |
| D3-1 | 75% | Rp2.802.000 |
| D4-1 | 75% | Rp2.802.000 |
| D3-2 | 75% | Rp2.802.000 |
| D4-2 | 75% | Rp2.802.000 |
| D5 | 75% | Rp2.802.000 |
| D6 | 75% | Rp2.802.000 |

### 5.3 Sub-Level Multipliers

| Sub-Level | Multiplier | THP D3-1 (base=5.137.000) |
|-----------|------------|---------------------------|
| A | 1.01 | Rp5.188.000 |
| B | 1.02 | Rp5.240.000 |
| C | 1.03 | Rp5.291.000 |
| D | 1.04 | Rp5.342.000 |
| E | 1.05 | Rp5.394.000 |

### 5.4 Tunjangan

| Komponen | Default | Keterangan |
|----------|---------|------------|
| Pasangan | 1 | |
| Anak | 2 | |
| Tunj/Anak | Rp100.000 | |
| Max Masa Kerja | 5 tahun | |
| Tunj/Tahun | Rp50.000 | |
| Struktural A | Rp200.000 | D3-1, D3-2 |
| Struktural B | Rp400.000 | D4-1, D4-2 |
| Struktural C | Rp600.000 | D5, D6 |
| Extra Manajerial | 50% | D3-2, D4-2 |

---

## 6. Constraint & Validasi

### 6.1 PP 36/2021 Pasal 7 — 75% Rule

```
Gapok ≥ 75% × (Gapok + TT)
```

- Diperiksa di setiap baris simulasi
- Ditampilkan sebagai badge hijau (pass) atau merah (fail)
- Ratio = Gapok / (Gapok + TT) × 100%

### 6.2 UMK Floor

```
THP_D1_A ≥ UMK
```

- D1-A adalah sub-level terendah
- Jika THP D1-A < UMK, tampilkan warning

### 6.3 Monotonicity

```
THP(D1-A) < THP(D1-B) < ... < THP(D6-E)
```

- THP harus meningkat dari D1-A ke D6-E
- Gapok bersifat flat per jenjang (tidak di-check monotonic-nya)

### 6.4 Rounding

Semua nilai dibulatkan ke ribuan terdekat:
```javascript
Math.round(value / 1000) * 1000
```

---

## 7. Data Flow antar Menu

```
Menu 1 (Watson Factors) → jvScores
    ↓
Menu 2 (Parameter) → approachBaruParams
    ├── plafon, sigmaPct, gapPct
    ├── gapokAnchors (per jenjang)
    ├── anchorOverrides (manual)
    ├── subLevelMultipliers (A-E)
    ├── structuralAllowance, extraManajerialPct
    └── tunjangan params
    ↓
Menu 3 (Simulasi) → generateSpreadTableData / deriveGradeStack
    ├── Reads: approachBaruParams.plafon, .sigmaPct, .gapokAnchors
    ├── Calls: calcAnchorsFromPlafon() → anchors (% of Plafon)
    ├── Calls: calcComponents() / calcBaruCellComponents()
    └── Output: Tabel simulasi (THP, Gapok, TT, TTT, 75% check)
    ↓
Menu 4 (Perbandingan) → compare across locations
Menu 5 (Spread Table) → % view
Menu 7 (Simulasi Persentase) → interactive % simulation
```

---

## 8. Implementasi Kode

### 8.1 Fungsi Utama

| Fungsi | File | Keterangan |
|--------|------|------------|
| `calcAnchorsFromPlafon(plafon, sigma, gap, umk)` | formulas.js | Hitung anchor % per jenjang |
| `generateSpreadTableData(umk, params, jvScores)` | formulas.js | Generate 3 baris/grade (Min A, Mid C, Max E) |
| `generateFullTable(umk, params, jvScores)` | formulas.js | Generate 1 baris/grade (Mid C) |
| `deriveGradeStack(U, C, sigma, gap)` | formulas.js | Bangun 8 grade × 5 sub-levels |
| `calcComponents(thp, params, gapok, mult, ...)` | formulas.js | Split THP ke komponen |
| `calcBaruCellComponents(baseTHP, subIdx, ...)` | ui.js | Hitung komponen untuk Menu 3 Baru |
| `calc75Ratio(gapok, tt)` | formulas.js | Hitung ratio 75% rule |

### 8.2 Render Functions

| Fungsi | File | Keterangan |
|--------|------|------------|
| `renderMenu2()` | ui.js | Parameter inputs + anchor display |
| `renderMenu2Baru()` | ui.js | Parameter Baru (Plafon/Sigma/anchors) |
| `renderMenu3()` | ui.js | Simulasi (dispatch ke Lama/Baru) |
| `renderMenu3Baru()` | ui.js | Simulasi Baru (8×5 grid) |
| `renderMenu5Baru()` | ui.js | Spread Table Baru |

### 8.3 Event Handlers

| Fungsi | Trigger | Keterangan |
|--------|---------|------------|
| `onApproachBaruParamChange(key, value)` | Input change | Update approachBaruParams |
| `onAnchorManualChange(grade, value)` | Anchor input | Override anchor per jenjang |
| `onGapokAnchorChange(grade, value)` | Gapok input | Override gapok % per jenjang |
| `resetAnchorOverrides()` | Button click | Reset anchor ke default |

---

## 9. Contoh Skenario

### Skenario 1: D6 dengan Anchor 75%

```
Plafon   = Rp15.000.000
D6 Anchor = 75% (manual override)
THP_D6   = 75% × 15M = Rp11.250.000

D6 Sub A = 11.250.000 × 1.01 = Rp11.363.000
D6 Sub E = 11.250.000 × 1.05 = Rp11.813.000
```

### Skenario 2: UMK Surabaya (Rp5.288.796)

```
Plafon    = Rp15.000.000
Sigma     = 85%
D1 Anchor = (75% × 5.288.796) / 15M × 100 = 26.44%
D1 THP    = 26.44% × 15M = Rp3.967.000

D1 Gapok  = 80% × 5.288.796 = Rp4.231.000

→ WARNING: Gapok (4.231.000) > THP (3.967.000)!)
→ Perlu adjust anchor D1 atau GapokAnchor D1
```

### Skenario 3: Toggle Struktural OFF

```
D3-1 tanpa struktural:
  TT_Riil = THP - Gapok = 5.291.000 - 2.802.000 = 2.489.000
  TT_Keluarga   = 300.000
  TT_LamaKerja  = 125.000
  TT_Struktural = 0 (disabled)
  Total_TT      = 425.000
  TTT           = 2.489.000 - 425.000 = Rp2.064.000
```

---

## 10. Perbedaan Pendekatan Lama vs Baru

| Aspek | Pendekatan Lama | Pendekatan Baru |
|-------|-----------------|-----------------|
| Anchor Source | Manual input per jenjang | Auto dari Plafon/Sigma |
| THP Base | manual anchors | Plafon × Anchor% |
| Gapok | composition.gapok (flat) | gapokAnchors per jenjang |
| Sub-Level Mult | Adjustable (default 1.00-1.29) | Fixed (1.01-1.05) |
| TT Split | Proporsional (% of nonGapok) | Nominal (Keluarga+LK+Struktural) |
| Menu 3 | 3 baris/grade (Min/Mid/Max) | 5 baris/grade (A-E) |
| Compliance | 75% rule | 75% rule |

---

**Document Status:** APPROVED
**Next Step:** Implementasi mengikuti skema ini secara konsisten
