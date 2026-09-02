// =====================================================
// DATA.JS — Constants, UMK Data, Default Scores
// Source: PRD v1.0 — LOCKED formulas
// =====================================================

// ---- 10 Watson Wyatt Factors (Indonesian) ----
const FACTORS = [
    { code: 'K', name: 'Pendidikan',              weight: 15 },
    { code: 'E', name: 'Pengalaman',              weight: 10 },
    { code: 'S', name: 'Ruang Lingkup',           weight: 12 },
    { code: 'D', name: 'Tingkat Keputusan',       weight: 15 },
    { code: 'C', name: 'Konsekuensi Kesalahan',   weight: 10 },
    { code: 'I', name: 'Kontak Internal',         weight: 8 },
    { code: 'X', name: 'Kontak Eksternal',        weight: 8 },
    { code: 'V', name: 'Pengawasan / Pengaruh',   weight: 8 },
    { code: 'N', name: 'Jml Karyawan Diawasi',    weight: 5 },
    { code: 'R', name: 'Riset & Pengembangan',    weight: 9 }
];

const SUB_LEVELS = ['A', 'B', 'C', 'D', 'E'];

// ---- 8 Jenjang ----
const JENJANG_LIST = [
    { code: 'D1',   name: 'D1 - Entry Level',         track: 'Functional',  loading: 10.0 },
    { code: 'D2',   name: 'D2 - Officer',             track: 'Functional',  loading: 24.2 },
    { code: 'D3-1', name: 'D3-1 - Principal',         track: 'Functional',  loading: 38.4, structuralGroup: 'A', type: 'fungsional' },
    { code: 'D4-1', name: 'D4-1 - Specialist',        track: 'Functional',  loading: 52.6, structuralGroup: 'B', type: 'fungsional' },
    { code: 'D3-2', name: 'D3-2 - Junior Management',    track: 'Managerial',  loading: 38.4, structuralGroup: 'A', type: 'manajerial' },
    { code: 'D4-2', name: 'D4-2 - Middle Management',    track: 'Managerial',  loading: 52.6, structuralGroup: 'B', type: 'manajerial' },
    { code: 'D5',   name: 'D5 - Senior Management',      track: 'Managerial',  loading: 66.8, structuralGroup: 'C', type: 'manajerial' },
    { code: 'D6',   name: 'D6 - Executive Management',   track: 'Managerial',  loading: 81.0, structuralGroup: 'C', type: 'manajerial' }
];

// ---- Watson-Driven Anchor Engine: default knobs ----
const DEFAULT_WATSON_CONFIG = {
    d1Pin: 50,
    ceilingMethod: 'rasio',
    rhoValue: 3.68,
    manualTargetPct: 140,
    epsilonAuto: true,
    manualEpsilon: 0.705,
    corridorMin: 5,
    corridorMax: 45,
    managerialPremium: 1.03,
    multTargetE: 1.29
};

// ---- Watson Sub-Level Deltas (Seed) ----
const DEFAULT_SUB_DELTAS = {};
JENJANG_LIST.forEach(j => {
    DEFAULT_SUB_DELTAS[j.code] = {
        B: { K: 1 },
        C: { K: 1, E: 1 },
        D: { K: 1, E: 1, S: 1 },
        E: { K: 1, E: 1, S: 1, D: 1 }
    };
});

// ---- Default Sub-Level Multipliers (B-E relative to A = 1.00) ----
const DEFAULT_SUB_LEVEL_MULTIPLIERS = {
    A: 1.01,
    B: 1.02,
    C: 1.03,
    D: 1.04,
    E: 1.05
};

// ---- Default Parameters ----
const DEFAULT_PARAMS = {
    // Knob mesin Watson (di-spread agar deep-merge localStorage lama aman)
    watsonConfig: { ...DEFAULT_WATSON_CONFIG },
    subLevelDeltas: JSON.parse(JSON.stringify(DEFAULT_SUB_DELTAS)),
    anchors: {
        D1: 50.0,
        D2: 75.0,
        'D3-1': 100.0,
        'D4-1': 110.0,
        'D3-2': 103.0,
        'D4-2': 113.3,
        D5: 125.0,
        D6: 140.0
    },
    subLevelMultipliers: {
        A: 1.00,
        B: 1.07,
        C: 1.15,
        D: 1.22,
        E: 1.29
    },
    step: 2,
    composition: {
        gapok: 50,
        tt: 15,
        ttt: 35
    },
    ttSplit: {
        struktural: 60,
        lamaKerja: 25,
        keluarga: 15
    },
    thpCap: 15000000,
    streamPositioning: 1.03,
    tunjangan: {
        strukturalBasis: 300000,
        lamaKerjaAwal: 50000,
        lamaKerjaKenaikan: 75000,
        lamaKerjaPlafon: 1500000,
        keluargaPasangan: 300000,
        keluargaAnak: 150000,
        keluargaPlafon: 600000
    },
    structuralAllowance: { A: 200000, B: 400000, C: 600000 },
    extraManajerialPct: 50,
    enableStrukturalD31: true,
    enableStrukturalD41: true
};

// ---- Default Job Evaluation Scores ----
const DEFAULT_SCORES = {
    'D1':   { K: 2, E: 1, S: 1, D: 1, C: 1, I: 1, X: 1, V: 1, N: 1, R: 1 },
    'D2':   { K: 3, E: 2, S: 2, D: 2, C: 2, I: 1, X: 1, V: 1, N: 1, R: 2 },
    'D3-1': { K: 3, E: 2, S: 2, D: 2, C: 2, I: 2, X: 1, V: 1, N: 1, R: 2 },
    'D3-2': { K: 3, E: 2, S: 2, D: 3, C: 2, I: 2, X: 2, V: 2, N: 2, R: 2 },
    'D4-1': { K: 4, E: 3, S: 3, D: 3, C: 3, I: 2, X: 2, V: 2, N: 1, R: 3 },
    'D4-2': { K: 4, E: 3, S: 3, D: 4, C: 3, I: 3, X: 3, V: 3, N: 2, R: 3 },
    'D5':   { K: 4, E: 4, S: 4, D: 4, C: 4, I: 4, X: 4, V: 4, N: 3, R: 4 },
    'D6':   { K: 5, E: 5, S: 5, D: 5, C: 5, I: 5, X: 5, V: 5, N: 4, R: 5 }
};

// ---- UMK Jawa Timur (39 locations) ----
const UMK_DATA = {
    'Kota Malang':           3736101,
    'Kabupaten Malang':      3802862,
    'Kota Pasuruan':         3555301,
    'Kota Batu':             3562484,
    'Kota Surabaya':         5288796,
    'Kabupaten Sidoarjo':    5191541,
    'Kota Probolinggo':      3045172,
    'Kabupaten Probolinggo': 3164526,
    'Kota Blitar':           2639518,
    'Kabupaten Blitar':      2567744,
    'Kabupaten Pasuruan':    5187681,
    'Kabupaten Gresik':      5195401,
    'Kabupaten Mojokerto':   5176101,
    'Kota Mojokerto':        3208556,
    'Kabupaten Jombang':     3320770,
    'Kabupaten Tuban':       3229092,
    'Kabupaten Lamongan':    3196328,
    'Kabupaten Jember':      3012197,
    'Kabupaten Banyuwangi':  2989145,
    'Kota Kediri':           2742806,
    'Kabupaten Kediri':      2651603,
    'Kabupaten Tulungagung': 2628190,
    'Kota Madiun':           2588794,
    'Kabupaten Lumajang':    2578320,
    'Kabupaten Nganjuk':     2564627,
    'Kabupaten Ngawi':       2556815,
    'Kabupaten Magetan':     2553866,
    'Kabupaten Sumenep':     2553688,
    'Kabupaten Madiun':      2553221,
    'Kabupaten Bangkalan':   2550274,
    'Kabupaten Ponorogo':    2549876,
    'Kabupaten Trenggalek':  2530313,
    'Kabupaten Bondowoso':   2496886,
    'Kabupaten Situbondo':   2483962,
    'Kabupaten Pamekasan':   2519148,
    'Kabupaten Pacitan':     2514706,
    'Kabupaten Sampang':     2511763,
    'Kabupaten Bojonegoro':  2685983,
    'UMP Jawa Timur':        2446880
};

const UMK_LOCATIONS = Object.keys(UMK_DATA).sort();

// ---- Scheme Toggle ----
const DEFAULT_SCHEME = 'skema-lama';

// ---- Pendekatan Baru: Grade Stacking Defaults ----
const DEFAULT_APPROACH_BARU = {
    plafon: 15000000,
    sigmaPct: 100,
    gapPct: 2,
    step: 2,
    modelType: 'squeeze', // 'squeeze' | 'additive'
    managerialPremium: 1.03,
    composition: { gapok: 75 },
    gapokAnchors: { D1: 80, D2: 78, 'D3-1': 75, 'D4-1': 75, 'D3-2': 75, 'D4-2': 75, D5: 75, D6: 75 },
    anchors: {},  // Dihitung otomatis dari Plafon/Sigma via calcAnchorsFromPlafon
    subLevelMultipliers: {
        A: 1.01,
        B: 1.02,
        C: 1.03,
        D: 1.04,
        E: 1.05
    },
    hasPasangan: 1,
    jumlahAnak: 2,
    tunjKeluargaPerAnak: 100000,
    maxMasaKerjaTahun: 5,
    tunjLamaKerjaPerTahun: 50000,
    structuralAllowance: { A: 200000, B: 400000, C: 600000 },
    extraManajerialPct: 50,
    enableStrukturalD31: true,
    enableStrukturalD41: true
};

// ---- 8 Grade untuk Pendekatan Baru ----
const GRADE_LABELS_BARU = ['D1', 'D2', 'D3-1', 'D4-1', 'D3-2', 'D4-2', 'D5', 'D6'];
const GRADE_NAMES_BARU = [
    'D1 - Entry Level',
    'D2 - Officer',
    'D3-1 - Principal',
    'D4-1 - Specialist',
    'D3-2 - Junior Management',
    'D4-2 - Middle Management',
    'D5 - Senior Management',
    'D6 - Executive Management'
];

const GRADE_MAPPING_BARU = [
    { code: 'D1', name: 'D1 - Entry Level', baseIdx: 0, premium: false },
    { code: 'D2', name: 'D2 - Officer', baseIdx: 1, premium: false },
    { code: 'D3-1', name: 'D3-1 - Principal', baseIdx: 2, premium: false },
    { code: 'D4-1', name: 'D4-1 - Specialist', baseIdx: 3, premium: false },
    { code: 'D3-2', name: 'D3-2 - Junior Management', baseIdx: 2, premium: true },
    { code: 'D4-2', name: 'D4-2 - Middle Management', baseIdx: 3, premium: true },
    { code: 'D5', name: 'D5 - Senior Management', baseIdx: 4, premium: false },
    { code: 'D6', name: 'D6 - Executive Management', baseIdx: 5, premium: false }
];
