# PRD: Prototype Simulasi Payroll v2 (Watson Wyatt Based)

**Version:** 1.0  
**Date:** 2026-08-24  
**Status:** APPROVED - Ready for Implementation  
**Location:** `E:\ZenNotes\ALLProject\Payroll\simulation-v-saya\`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Formulas (LOCKED)](#2-core-formulas-locked)
3. [Sidebar Menus](#3-sidebar-menus)
4. [Data Structures](#4-data-structures)
5. [UI/UX Guidelines](#5-uiux-guidelines)
6. [Edge Cases](#6-edge-cases)
7. [Milestones & Acceptance Criteria](#7-milestones--acceptance-criteria)

---

## 1. Project Overview

### 1.1 Identity

| Item | Value |
|------|-------|
| **Name** | Prototype Simulasi Payroll v2 (Watson Wyatt Based) |
| **Type** | Single-page web application (prototype) |
| **Purpose** | Simulate job evaluation, salary structuring, and payroll comparison across 39 East Java locations using Watson Wyatt methodology |

### 1.2 Tech Stack

| Technology | Usage |
|------------|-------|
| HTML5 | Semantic markup, single `index.html` |
| Tailwind CSS CDN | Utility-first styling, responsive layout |
| Vanilla JavaScript | All logic, no frameworks, no build step |
| Chart.js CDN | Radar charts (job eval) and stacked bar charts (payroll simulation) |
| localStorage | All data persistence (no backend, no database) |

### 1.3 Constraints

- **No login/authentication** — open access prototype
- **No backend/server** — pure client-side
- **No external API calls** — offline capable after load
- **No npm/node_modules** — CDN only
- **Single-user mode** — one data set per browser

### 1.4 Folder Structure

```
simulation-v-saya/
├── index.html          # Main entry point
├── PRD.md              # This document
├── css/
│   └── style.css       # Custom styles (beyond Tailwind)
└── js/
    ├── data.js         # Constants, UMK data, default scores
    ├── formulas.js     # 3 core formulas + helper functions
    ├── ui.js           # DOM rendering, sidebar, tables
    ├── charts.js       # Chart.js configurations
    └── app.js          # Main controller, event handlers, init
```

---

## 2. Core Formulas (LOCKED)

> **⚠️ CRITICAL: These formulas are LOCKED and must NOT be modified. Any deviation is a bug.**

### 2.1 Formula 1: Job Value (JV)

```
JV = K×15 + E×10 + S×12 + D×15 + C×10 + I×8 + X×8 + V×8 + N×5 + R×9
```

**10 Factors:**

| Huruf | Faktor | Bobot (%) |
|-------|--------|-----------|
| K | Pendidikan | 15 |
| E | Pengalaman | 10 |
| S | Ruang Lingkup | 12 |
| D | Tingkat Keputusan | 15 |
| C | Konsekuensi Kesalahan | 10 |
| I | Kontak Internal | 8 |
| X | Kontak Eksternal | 8 |
| V | Pengawasan / Pengaruh | 8 |
| N | Jumlah Karyawan yang Diawasi | 5 |
| R | Riset & Pengembangan | 9 |

**Total Bobot = 100%** (15+10+12+15+10+8+8+8+5+9)

**Score Range:** 1-5 per factor  
**JV Range:** Minimum = 100 (all 1s × weights) → Maximum = 500 (all 5s × weights)

### 2.2 Formula 2: Sub-Level Progression

```
Faktor Elastis = E(10) + C(10) + R(9) = 29
Kenaikan per step = Faktor Elastis / 4 transisi / 100 = 7.25%
```

**Multiplier Table:**

| Sub-Level | Multiplier | Calculation |
|-----------|------------|-------------|
| A | 1.00 | Base |
| B | 1.0725 | 1.00 + (29/4/100) |
| C | 1.1450 | 1.00 + 2×(29/4/100) |
| D | 1.2175 | 1.00 + 3×(29/4/100) |
| E | 1.2900 | 1.00 + 4×(29/4/100) |

> **Note:** In display, round to 2 decimal places: 1.00, 1.07, 1.15, 1.22, 1.29

### 2.3 Formula 3: Loading THP per Jenjang

```
Faktor Skala = K(15) + S(12) + D(15) + I(8) + X(8) + V(8) + N(5) = 71
Base D1 = 10%
Loading per jenjang = Faktor Skala / 5 transisi / 100 = 14.20%
```

**Loading Table:**

| Jenjang | Loading % | Calculation |
|---------|-----------|-------------|
| D1 | 10.00% | Base |
| D2 | 24.20% | 10% + 14.20% |
| D3 | 38.40% | 10% + 2×14.20% |
| D4 | 52.60% | 10% + 3×14.20% |
| D5 | 66.80% | 10% + 4×14.20% |
| D6 | 81.00% | 10% + 5×14.20% |

### 2.4 Salary Calculation Flow

```
Step 1: Get Anchor % (from Menu 2, default 50%)
Step 2: Get Multiplier (from Formula 2, based on Sub-Level A-E)
Step 3: Get Loading (from Formula 3, based on Jenjang D1-D6)
Step 4: Effective % = (Anchor% × Multiplier) + Loading
Step 5: THP = UMK × Effective%
Step 6: Gapok = THP × Gapok%
Step 7: TT (Tunjangan Tetap) = THP × TT%
Step 8: TTT (Tunjangan Tidak Tetap) = THP × TTT%
```

**Composition Validation:** Gapok% + TT% + TTT% MUST equal 100%

---

## 3. Sidebar Menus

### 3.1 Menu 1: Watson Wyatt Job Evaluation

**Purpose:** Evaluate job positions using Watson Wyatt 10-factor method

**UI Elements:**

1. **Jenjang Dropdown**
   - Options: D1, D2, D3, D4, D5, D6
   - D3 and D4 have sub-variants (D3-1, D3-2, D4-1, D4-2)

2. **Sub-Level Selector**
   - Options: A, B, C, D, E
   - Appears after jenjang selected

3. **10-Factor Input Table**

| Huruf | Faktor | Bobot | Score (input 1-5) | Weighted Score |
|-------|--------|-------|-------------------|----------------|
| K | Pendidikan | 15% | [slider/input] | K×15 |
| E | Pengalaman | 10% | [slider/input] | E×10 |
| S | Ruang Lingkup | 12% | [slider/input] | S×12 |
| D | Tingkat Keputusan | 15% | [slider/input] | D×15 |
| C | Konsekuensi | 10% | [slider/input] | C×10 |
| I | Kontak Internal | 8% | [slider/input] | I×8 |
| X | Kontak Eksternal | 8% | [slider/input] | X×8 |
| V | Pengawasan | 8% | [slider/input] | V×8 |
| N | Karyawan | 5% | [slider/input] | N×5 |
| R | Riset | 9% | [slider/input] | R×9 |
| **TOTAL** | | **100%** | | **JV Score** |

4. **Radar Chart** (Chart.js)
   - Shows 10-factor profile for selected jenjang
   - X-axis: 10 factors (K, E, S, D, C, I, X, V, N, R)
   - Y-axis: Score 1-5
   - Multiple jenjang overlay for comparison

5. **LocalStorage Keys:**
   - `jw_scores_{jenjang}` → JSON object of scores

**Default Scores (Jenjang D3-1):**

| Factor | D1 | D2 | D3-1 | D4-1 | D3-2 | D4-2 | D5 | D6 |
|--------|----|----|------|------|------|------|----|----|
| K | 2 | 3 | 3 | 4 | 3 | 4 | 4 | 5 |
| E | 1 | 2 | 2 | 3 | 2 | 3 | 4 | 5 |
| S | 1 | 2 | 2 | 3 | 2 | 3 | 4 | 5 |
| D | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 |
| C | 1 | 2 | 2 | 3 | 2 | 3 | 4 | 5 |
| I | 1 | 1 | 2 | 2 | 2 | 3 | 4 | 5 |
| X | 1 | 1 | 1 | 2 | 2 | 3 | 4 | 5 |
| V | 1 | 1 | 1 | 2 | 2 | 3 | 4 | 5 |
| N | 1 | 1 | 1 | 1 | 2 | 2 | 3 | 4 |
| R | 1 | 2 | 2 | 3 | 2 | 3 | 4 | 5 |

---

### 3.2 Menu 2: Adjustable Parameters

**Purpose:** Configure simulation parameters that affect salary calculations

#### Section A: Anchor & Interval

| Parameter | Description | Default | Input |
|-----------|-------------|---------|-------|
| % Gapok D1-A | Base gapok percentage for D1-A level | 50% | Number input (0-100) |
| % THP Max | Maximum THP percentage cap | - | Number input |
| THP Cap (Rp) | Absolute THP ceiling in Rupiah | Rp 15,000,000 | Number input |
| Stream Positioning | Multiplier for stream positioning | 1.03 | Number input (1.00-2.00) |

**Tooltips:**
- `% Gapok D1-A`: "Persentase komponen Gapok terhadap THP untuk level D1-A. Ini adalah anchor dari mana seluruh perhitungan berawal."
- `THP Cap`: "Batas maksimum Take Home Pay yang bisa diterima karyawan. Jika perhitungan melebihi batas ini, THP akan di-cap."

#### Section B: Composition Matrix

| Komponen | Default % | Input |
|----------|-----------|-------|
| Gapok (Base Salary) | 50% | Number input |
| TT (Tunjangan Tetap) | 15% | Number input |
| TTT (Tunjangan Tidak Tetap) | 35% | Number input |

**Validation:** Sum MUST equal 100%. Show warning if not.

#### Section C: UMK Selector

- Dropdown with 39 locations in East Java (Jawa Timur)
- Locations sorted alphabetically
- Selection affects THP calculation in Menu 3

**UMK Locations (39 kabupaten/kota Jawa Timur):**

```
Bangkalan, Banyuwangi, Blitar, Bojonegoro, Bondowoso,
Gresik, Jember, Jombang, Kediri, Lamongan, Lumajang,
Madiun, Magetan, Malang, Mojokerto, Nganjuk, Ngawi,
Pacitan, Pamekasan, Pasuruan, Ponorogo, Probolinggo,
Sampang, Sidoarjo, Situbondo, Sumenep, Surabaya,
Trenggalek, Tuban, Tulungagung, Batu, Kepulauan Bangkalan,
Kota Blitar, Kota Kediri, Kota Madiun, Kota Malang,
Kota Mojokerto, Kota Pasuruan, Kota Probolinggo
```

#### Section D: Dual Track Weight

| Track | Default Weight | Input |
|-------|----------------|-------|
| Technical/Functional | 40% | Number input |
| Managerial | 60% | Number input |

**Validation:** Sum MUST equal 100%

**Tooltips:**
- `Technical/Functional`: "Bobot jalur karir fungsional/teknis. Karyawan di jalur ini fokus pada keahlian teknis."
- `Managerial`: "Bobot jalur karir manajerial. Karyawan di jalur ini fokus pada kepemimpinan dan manajemen."

---

### 3.3 Menu 3: Simulasi Penggajian

**Purpose:** Run full payroll simulation across all jenjang and sub-levels

#### Filter Bar

| Filter | Type | Options |
|--------|------|---------|
| UMK Lokasi | Dropdown | 39 locations (from Menu 2) |
| Track | Dropdown | All, Functional, Managerial |

#### Main Table

| Column | Description | Source |
|--------|-------------|--------|
| D-Code | Jenjang code (D1-D6) | Static |
| Jenjang | Full jenjang name | Static |
| Sub-Level | A, B, C, D, E | From Formula 2 |
| Track | Functional/Managerial | Based on jenjang |
| JV Score | Job Value from Formula 1 | From Menu 1 |
| Anchor % | Base percentage | From Menu 2 |
| Multiplier | Sub-level multiplier | From Formula 2 |
| Loading | Jenjang loading | From Formula 3 |
| Effective % | Calculated effective rate | Anchor × Multiplier + Loading |
| Gapok (Rp) | Base salary component | THP × Gapok% |
| TT (Rp) | Fixed allowance | THP × TT% |
| TTT (Rp) | Variable allowance | THP × TTT% |
| THP (Rp) | Total take-home pay | UMK × Effective% |
| Status | Validation status | Monotonic check, cap check |

#### Calculation Per Row

```javascript
// For each row (jenjang × sub-level):
effective = (anchorPercent × multiplier) + loadingPercent
thp = umk × effective
gapok = thp × gapokPercent
tt = thp * ttPercent
ttt = thp * tttPercent

// Rounding: All amounts rounded to nearest 1000 (ribuan)
thp = Math.round(thp / 1000) * 1000
gapok = Math.round(gapok / 1000) * 1000
tt = Math.round(tt / 1000) * 1000
ttt = Math.round(ttt / 1000) * 1000
```

#### Stacked Bar Chart (Chart.js)

- **X-axis:** Jenjang × Sub-Level combinations
- **Y-axis:** Rupiah amount
- **Stacks:** Gapok (blue), TT (green), TTT (orange)
- **Hover:** Show tooltip with exact values

#### Validation Dashboard

Display below the table:

| Check | Condition | Status |
|-------|-----------|--------|
| Monotonic | THP increases from D1-A to D6-E | ✅/❌ |
| Composition | Gapok% + TT% + TTT% = 100% | ✅/❌ |
| THP Cap | No THP exceeds cap | ✅/❌ |
| Min THP | All THP above UMK minimum | ✅/❌ |

---

### 3.4 Menu 4: Comparation Gaji

**Purpose:** Compare salary structures across 2-5 locations side-by-side

#### Location Selectors

- 2-5 dropdown selectors
- Each dropdown contains all 39 UMK locations
- Default: 2 locations selected (e.g., Surabaya + Malang)

#### Comparison Table

| Column | Description |
|--------|-------------|
| D-Code | Jenjang code |
| Sub-Level | A, B, C, D, E |
| Lokasi 1 | THP for location 1 |
| Lokasi 2 | THP for location 2 |
| ... | Additional locations (up to 5) |
| Selisih (Rp) | Max difference between locations |
| Selisih (%) | Percentage difference |

#### Highlighting

- **Max value** in each row: green background
- **Min value** in each row: red background
- **Selisih**: Bold if > 20% difference

#### Export CSV

Button to export current comparison table as CSV file:
- Filename: `komparasi_gaji_{timestamp}.csv`
- Includes all columns
- Values formatted with thousand separators

---

## 4. Data Structures

### 4.1 Constants

```javascript
const FACTORS = [
    { code: 'K', name: 'Pendidikan', weight: 15 },
    { code: 'E', name: 'Pengalaman', weight: 10 },
    { code: 'S', name: 'Ruang Lingkup', weight: 12 },
    { code: 'D', name: 'Tingkat Keputusan', weight: 15 },
    { code: 'C', name: 'Konsekuensi', weight: 10 },
    { code: 'I', name: 'Kontak Internal', weight: 8 },
    { code: 'X', name: 'Kontak Eksternal', weight: 8 },
    { code: 'V', name: 'Pengawasan', weight: 8 },
    { code: 'N', name: 'Karyawan', weight: 5 },
    { code: 'R', name: 'Riset', weight: 9 }
];

const SUB_LEVELS = ['A', 'B', 'C', 'D', 'E'];

const JENJANG_LIST = [
    { code: 'D1', name: 'D1', track: 'Functional', loading: 10.0 },
    { code: 'D2', name: 'D2', track: 'Functional', loading: 24.2 },
    { code: 'D3', name: 'D3', track: 'Functional', loading: 38.4 },
    { code: 'D4', name: 'D4', track: 'Functional', loading: 52.6 },
    { code: 'D5', name: 'D5', track: 'Managerial', loading: 66.8 },
    { code: 'D6', name: 'D6', track: 'Managerial', loading: 81.0 }
];

const ELASTIC_FACTOR = 29; // E(10) + C(10) + R(9)
const SCALE_FACTOR = 71;   // K(15)+S(12)+D(15)+I(8)+X(8)+V(8)+N(5)
const SUB_LEVEL_COUNT = 4; // Transisi from A to E
const JENJANG_COUNT = 5;   // Transisi from D1 to D6
```

### 4.2 Default Parameters

```javascript
const DEFAULT_PARAMS = {
    anchorPercent: 50,        // % Gapok D1-A
    thpMaxPercent: null,      // % THP Max (null = no limit)
    thpCap: 15000000,         // Rp 15,000,000
    streamPositioning: 1.03,
    composition: {
        gapok: 50,
        tt: 15,
        ttt: 35
    },
    dualTrack: {
        technical: 40,
        managerial: 60
    }
};
```

### 4.3 UMK Data

```javascript
const UMK_DATA = {
    'Bangkalan': 2850000,
    'Banyuwangi': 2690000,
    'Blitar': 2550000,
    'Bojonegoro': 2650000,
    'Bondowoso': 2550000,
    'Gresik': 2850000,
    'Jember': 2650000,
    'Jombang': 2650000,
    'Kediri': 2650000,
    'Lamongan': 2650000,
    'Lumajang': 2650000,
    'Madiun': 2650000,
    'Magetan': 2550000,
    'Malang': 2750000,
    'Mojokerto': 2850000,
    'Nganjuk': 2550000,
    'Ngawi': 2550000,
    'Pacitan': 2550000,
    'Pamekasan': 2650000,
    'Pasuruan': 2850000,
    'Ponorogo': 2550000,
    'Probolinggo': 2650000,
    'Sampang': 2650000,
    'Sidoarjo': 2850000,
    'Situbondo': 2550000,
    'Sumenep': 2650000,
    'Surabaya': 3200000,
    'Trenggalek': 2550000,
    'Tuban': 2650000,
    'Tulungagung': 2550000,
    'Batu': 2750000,
    'Kota Blitar': 2550000,
    'Kota Kediri': 2650000,
    'Kota Madiun': 2650000,
    'Kota Malang': 2750000,
    'Kota Mojokerto': 2850000,
    'Kota Pasuruan': 2850000,
    'Kota Probolinggo': 2650000
};
```

> **⚠️ NOTE:** UMK values above are PLACEHOLDER. Real values should be verified and updated from official sources.

### 4.4 Default Job Evaluation Scores

```javascript
const DEFAULT_SCORES = {
    'D1': { K: 2, E: 1, S: 1, D: 1, C: 1, I: 1, X: 1, V: 1, N: 1, R: 1 },
    'D2': { K: 3, E: 2, S: 2, D: 2, C: 2, I: 1, X: 1, V: 1, N: 1, R: 2 },
    'D3-1': { K: 3, E: 2, S: 2, D: 2, C: 2, I: 2, X: 1, V: 1, N: 1, R: 2 },
    'D3-2': { K: 3, E: 2, S: 2, D: 3, C: 2, I: 2, X: 2, V: 2, N: 2, R: 2 },
    'D4-1': { K: 4, E: 3, S: 3, D: 3, C: 3, I: 2, X: 2, V: 2, N: 1, R: 3 },
    'D4-2': { K: 4, E: 3, S: 3, D: 4, C: 3, I: 3, X: 3, V: 3, N: 2, R: 3 },
    'D5': { K: 4, E: 4, S: 4, D: 4, C: 4, I: 4, X: 4, V: 4, N: 3, R: 4 },
    'D6': { K: 5, E: 5, S: 5, D: 5, C: 5, I: 5, X: 5, V: 5, N: 4, R: 5 }
};
```

### 4.5 LocalStorage Schema

| Key Pattern | Value | Description |
|-------------|-------|-------------|
| `jw_scores_{jenjang}` | `{ K: 3, E: 2, ... }` | Job eval scores per jenjang |
| `params_anchor` | `50` | Anchor percentage |
| `params_thp_cap` | `15000000` | THP cap in Rupiah |
| `params_composition` | `{ gapok: 50, tt: 15, ttt: 35 }` | Composition percentages |
| `params_dual_track` | `{ technical: 40, managerial: 60 }` | Dual track weights |
| `params_umk_selected` | `'Surabaya'` | Last selected UMK |
| `params_stream` | `1.03` | Stream positioning value |
| `comparison_locations` | `['Surabaya', 'Malang']` | Saved comparison locations |

---

## 5. UI/UX Guidelines

### 5.1 Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  HEADER BAR (sticky)                                    │
│  [Logo] Simulasi Payroll v2    [Export] [Reset] [Help]  │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ SIDEBAR  │              MAIN CONTENT AREA               │
│ (240px)  │                                              │
│          │  ┌─────────────────────────────────────────┐ │
│ ● Menu 1 │  │  Content changes based on active menu   │ │
│ ○ Menu 2 │  │                                         │ │
│ ○ Menu 3 │  │                                         │ │
│ ○ Menu 4 │  │                                         │ │
│          │  └─────────────────────────────────────────┘ │
│          │                                              │
│ [Footer] │  VALIDATION DASHBOARD (if Menu 3)           │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 5.2 Color Palette

| Element | Color | Tailwind Class |
|---------|-------|----------------|
| Sidebar bg | Dark gray | `bg-gray-800` |
| Sidebar active | Blue | `bg-blue-600` |
| Header | White | `bg-white` |
| Cards | White | `bg-white rounded-lg shadow` |
| Primary button | Blue | `bg-blue-600 hover:bg-blue-700` |
| Success | Green | `text-green-600` |
| Warning | Amber | `text-amber-500` |
| Error | Red | `text-red-600` |
| Table stripe | Light gray | `bg-gray-50` |

### 5.3 Responsive Behavior

- **Desktop (≥1280px):** Full sidebar + content
- **Tablet (768-1279px):** Collapsible sidebar (hamburger)
- **Mobile (<768px):** Sidebar hidden, bottom nav

### 5.4 Input Controls

- **Number inputs:** Use `type="number"` with `min`, `max`, `step`
- **Dropdowns:** Native `<select>` with Tailwind styling
- **Sliders:** Range inputs for scores 1-5
- **Tooltips:** Hover tooltips using `title` attribute or custom tooltip component

### 5.5 Table Styling

```css
/* Base table */
.table payroll-table {
    @apply w-full text-sm text-left;
}

/* Header */
.table thead th {
    @apply px-4 py-3 bg-gray-50 text-gray-600 font-semibold border-b;
}

/* Body */
.table tbody td {
    @apply px-4 py-3 border-b border-gray-100;
}

/* Hover */
.table tbody tr:hover {
    @apply bg-blue-50;
}

/* Stripe */
.table tbody tr:nth-child(even) {
    @apply bg-gray-50;
}
```

### 5.6 Chart Styling

- **Radar Chart:** Semi-transparent fills, 0.3 opacity
- **Bar Chart:** Rounded corners (borderRadius: 4)
- **Grid:** Light gray dashed lines
- **Legend:** Bottom position, horizontal layout

---

## 6. Edge Cases

### 6.1 D7 Negotiation

- **Scenario:** Some organizations have D7 level for C-suite
- **Implementation:** NOT included in this prototype
- **Future:** Add as extension in v3

### 6.2 Rounding Rules

| Value | Rule | Example |
|-------|------|---------|
| THP | Round to nearest 1000 | Rp 5,234,000 → Rp 5,234,000 |
| THP | Round to nearest 1000 | Rp 5,234,500 → Rp 5,235,000 |
| Percentages | 2 decimal places | 14.20% |
| Multiplier | 2 decimal places | 1.07 |

### 6.3 Composition Validation

**Before calculation:**
1. Check `gapok% + tt% + ttt% === 100`
2. If not equal, show red warning and disable simulation
3. Highlight which component is off

### 6.4 THP Cap Override

**When THP exceeds cap:**
1. Calculate uncapped THP normally
2. If `THP > Cap`, set `THP = Cap`
3. Recalculate composition: `gapok = Cap × gapok%`
4. Show "CAPPED" badge in Status column

### 6.5 Monotonic Check

**Validates:**
- For each sub-level (A→E within jenjang): THP must increase
- For each jenjang (D1→D6): Base THP (at same sub-level) must increase

**If violated:**
- Show ❌ with specific violating row highlighted
- Log warning in console

### 6.6 Empty State

**When no data:**
- Menu 1: Show message "Pilih jenjang untuk memulai evaluasi"
- Menu 3: Show message "Konfigurasi parameter di Menu 2 terlebih dahulu"
- Menu 4: Show message "Pilih minimal 2 lokasi untuk perbandingan"

### 6.7 localStorage Full

**If quota exceeded:**
- Catch error on save
- Show toast: "Penyimpanan penuh. Beberapa data mungkin tidak tersimpan."
- Offer to export and clear old data

---

## 7. Milestones & Acceptance Criteria

### Milestone 1: Foundation (Day 1)

**Deliverables:**
- [x] Folder structure created
- [x] `index.html` with CDN links
- [ ] `data.js` with all constants
- [ ] `formulas.js` with 3 formulas
- [ ] Basic sidebar rendering

**Acceptance Criteria:**
- Page loads without errors
- Sidebar shows 4 menu items
- Clicking menu changes content area

### Milestone 2: Job Evaluation (Day 2)

**Deliverables:**
- [ ] Menu 1: Jenjang dropdown
- [ ] Menu 1: 10-factor input table
- [ ] Menu 1: JV calculation display
- [ ] Menu 1: Radar chart
- [ ] localStorage save/load

**Acceptance Criteria:**
- Selecting jenjang loads default scores
- Changing score updates JV in real-time
- Radar chart reflects current scores
- Refresh page → data persists

### Milestone 3: Parameters (Day 2-3)

**Deliverables:**
- [ ] Menu 2: All parameter inputs
- [ ] Menu 2: Composition validation
- [ ] Menu 2: UMK dropdown
- [ ] Menu 2: Tooltips

**Acceptance Criteria:**
- Changing anchor % shows effect on Menu 3
- Composition sum validation works
- UMK selection persists

### Milestone 4: Simulation (Day 3-4)

**Deliverables:**
- [ ] Menu 3: Full calculation table
- [ ] Menu 3: Stacked bar chart
- [ ] Menu 3: Validation dashboard
- [ ] Menu 3: Filter by track

**Acceptance Criteria:**
- All 30 rows (6 jenjang × 5 sub-levels) calculated correctly
- Values match manual calculation
- Chart renders correctly
- Validation checks pass

### Milestone 5: Comparison (Day 4)

**Deliverables:**
- [ ] Menu 4: 2-5 location selectors
- [ ] Menu 4: Side-by-side table
- [ ] Menu 4: Difference highlighting
- [ ] Menu 4: CSV export

**Acceptance Criteria:**
- Comparison table shows correct differences
- Max/min highlighting works
- CSV downloads with correct data

### Milestone 6: Polish (Day 5)

**Deliverables:**
- [ ] Responsive design
- [ ] Error handling
- [ ] Empty states
- [ ] Toast notifications
- [ ] Final testing

**Acceptance Criteria:**
- Works on tablet view
- All edge cases handled
- No console errors
- All localStorage operations work

---

## Appendix A: Calculation Verification

### Test Case: D3-1, Sub-Level B, Surabaya

**Given:**
- UMK Surabaya = Rp 3,200,000
- Anchor = 50%
- Multiplier (B) = 1.0725
- Loading (D3) = 38.40%
- Composition: Gapok 50%, TT 15%, TTT 35%

**Calculation:**
```
Effective % = (50% × 1.0725) + 38.40%
            = 53.625% + 38.40%
            = 92.025%

THP = 3,200,000 × 92.025%
    = 2,944,800

Gapok = 2,944,800 × 50%
      = 1,472,400

TT = 2,944,800 × 15%
   = 441,720

TTT = 2,944,800 × 35%
    = 1,030,680

Verification: 1,472,400 + 441,720 + 1,030,680 = 2,944,800 ✓
```

---

## Appendix B: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-24 | Initial PRD approved |
| 1.1 | 2026-08-24 | Updated simulation approach to Spread THP & Gapok format, split TT into 3 tunjangans, added Menu 5 |

---

## Appendix C: Spread & Tunjangan Update (v1.1)

**1. Tunjangan Tetap Split**
Tunjangan Tetap (15% dari THP) dipecah menjadi 3 sub-komponen (default bisa diubah di Parameter):
- **Tunjangan Struktural** (Default 60% dari TT)
- **Tunjangan Lama Kerja** (Default 25% dari TT)
- **Tunjangan Keluarga** (Default 15% dari TT)

**2. Simulation Format (Min/Mid/Max)**
- Setiap sub-level memiliki rentang: Min, Mid, Max.
- **Mid** dihitung menggunakan anchor jenjang + progression step.
- **Min** = Mid - step.
- **Max** = Mid + step.
- Menampilkan compliance check: `(Gapok + TT) / THP >= 75%`.

**3. Menu 5: Spread Table**
- Menampilkan persentase murni dari UMK untuk Gapok dan THP, mencerminkan CSV *Simulasi Spread THP dan Gapok*.

---

**Document Status:** APPROVED  
**Next Step:** Implementation completed by budi-arie
