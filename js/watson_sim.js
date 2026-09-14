// =====================================================
// WATSON_SIM.JS — Simulasi Watson Wyatt Skala 1-5 & Point System
// Pendekatan Baru (Self-contained & Fully Flexible)
// =====================================================

const WATSON_PARAM_KEYS = [
    { id: 'knowledge',    name: 'Pendidikan & Pengetahuan', code: '1. Knowledge' },
    { id: 'experience',   name: 'Pengalaman Kerja',          code: '2. Experience' },
    { id: 'consequence',  name: 'Konsekuensi Kesalahan',     code: '3. Consequence of Error' },
    { id: 'scope',        name: 'Ruang Lingkup Kegiatan',    code: '4. Scope of Activities' },
    { id: 'decision',     name: 'Tanggung Jawab Keputusan',  code: '5. Responsibility for Decision' },
    { id: 'intContact',   name: 'Kontak Bisnis Internal',    code: '6. Internal Business Contact' },
    { id: 'extContact',   name: 'Kontak Bisnis Eksternal',   code: '7. External Business Contact' },
    { id: 'research',     name: 'Riset dan Analisis',        code: '8. Research and Analysis' },
    { id: 'supervision',  name: 'Kompleksitas Pengawasan',   code: '9. Complexity of Supervision' },
    { id: 'headcount',    name: 'Jumlah Karyawan Diawasi',   code: '10. Number Supervised' }
];

// Base Meta Defaults with Tier Statuses (Primary, Secondary, Optional)
const WATSON_GRADE_META = {
    'D1': {
        name: 'D1 - Entry Level', track: 'Fungsional',
        defaultActive: ['knowledge', 'experience', 'consequence', 'scope'],
        defaultTiers: { knowledge: 'Primary', experience: 'Primary', consequence: 'Primary', scope: 'Secondary' },
        defaultWeights: { knowledge: 30, experience: 25, consequence: 25, scope: 20 },
        jvMin: 100, jvMax: 154,
        rawMin: 45, rawMax: 69
    },
    'D2': {
        name: 'D2 - Officer', track: 'Fungsional',
        defaultActive: ['knowledge', 'experience', 'consequence', 'scope', 'decision', 'intContact'],
        defaultTiers: { knowledge: 'Primary', experience: 'Primary', consequence: 'Primary', scope: 'Secondary', decision: 'Secondary', intContact: 'Secondary' },
        defaultWeights: { knowledge: 25, experience: 20, consequence: 20, scope: 15, decision: 10, intContact: 10 },
        jvMin: 155, jvMax: 214,
        rawMin: 103, rawMax: 159
    },
    'D3-1': {
        name: 'D3-1 - Principal', track: 'Fungsional',
        defaultActive: ['knowledge', 'experience', 'consequence', 'scope', 'decision', 'intContact', 'research'],
        defaultTiers: { knowledge: 'Primary', experience: 'Primary', consequence: 'Secondary', scope: 'Secondary', decision: 'Secondary', intContact: 'Secondary', research: 'Optional' },
        defaultWeights: { knowledge: 20, experience: 20, consequence: 15, scope: 15, decision: 15, intContact: 10, research: 5 },
        jvMin: 215, jvMax: 279,
        rawMin: 184, rawMax: 290
    },
    'D3-2': {
        name: 'D3-2 - Junior Manager', track: 'Manajerial',
        defaultActive: ['knowledge', 'experience', 'consequence', 'scope', 'decision', 'intContact', 'supervision', 'headcount'],
        defaultTiers: { knowledge: 'Secondary', experience: 'Secondary', consequence: 'Secondary', scope: 'Secondary', decision: 'Primary', intContact: 'Secondary', supervision: 'Optional', headcount: 'Optional' },
        defaultWeights: { knowledge: 15, experience: 15, consequence: 15, scope: 10, decision: 15, intContact: 10, supervision: 10, headcount: 10 },
        jvMin: 215, jvMax: 279,
        rawMin: 201, rawMax: 308
    },
    'D4-1': {
        name: 'D4-1 - Specialist', track: 'Fungsional',
        defaultActive: ['knowledge', 'experience', 'consequence', 'scope', 'decision', 'intContact', 'extContact', 'research'],
        defaultTiers: { knowledge: 'Secondary', experience: 'Secondary', consequence: 'Primary', scope: 'Secondary', decision: 'Primary', intContact: 'Secondary', extContact: 'Secondary', research: 'Optional' },
        defaultWeights: { knowledge: 15, experience: 15, consequence: 15, scope: 10, decision: 15, intContact: 10, extContact: 10, research: 10 },
        jvMin: 280, jvMax: 354,
        rawMin: 322, rawMax: 512
    },
    'D4-2': {
        name: 'D4-2 - Middle Manager', track: 'Manajerial',
        defaultActive: ['knowledge', 'experience', 'consequence', 'scope', 'decision', 'intContact', 'extContact', 'supervision', 'headcount'],
        defaultTiers: { knowledge: 'Secondary', experience: 'Secondary', consequence: 'Primary', scope: 'Secondary', decision: 'Primary', intContact: 'Secondary', extContact: 'Secondary', supervision: 'Optional', headcount: 'Optional' },
        defaultWeights: { knowledge: 15, experience: 15, consequence: 15, scope: 10, decision: 15, intContact: 10, extContact: 10, supervision: 5, headcount: 5 },
        jvMin: 280, jvMax: 354,
        rawMin: 340, rawMax: 530
    },
    'D5': {
        name: 'D5 - Senior Manager', track: 'Manajerial',
        defaultActive: ['knowledge', 'experience', 'consequence', 'decision', 'intContact', 'extContact', 'supervision', 'headcount'],
        defaultTiers: { knowledge: 'Secondary', experience: 'Secondary', consequence: 'Primary', decision: 'Primary', intContact: 'Secondary', extContact: 'Secondary', supervision: 'Optional', headcount: 'Optional' },
        defaultWeights: { knowledge: 15, experience: 15, consequence: 20, decision: 20, intContact: 10, extContact: 10, supervision: 5, headcount: 5 },
        jvMin: 355, jvMax: 424,
        rawMin: 484, rawMax: 750
    },
    'D6': {
        name: 'D6 - Executive', track: 'Manajerial',
        defaultActive: ['knowledge', 'experience', 'consequence', 'decision', 'intContact', 'extContact', 'supervision', 'headcount'],
        defaultTiers: { knowledge: 'Secondary', experience: 'Secondary', consequence: 'Primary', decision: 'Primary', intContact: 'Secondary', extContact: 'Secondary', supervision: 'Optional', headcount: 'Optional' },
        defaultWeights: { knowledge: 10, experience: 10, consequence: 20, decision: 20, intContact: 10, extContact: 10, supervision: 10, headcount: 10 },
        jvMin: 425, jvMax: 500,
        rawMin: 750, rawMax: 820
    }
};

// Rating Scale Labels (1 - 5)
const WATSON_RATING_LABELS = {
    1: '1 - Sangat Kurang (Jauh di bawah standar)',
    2: '2 - Kurang (Perlu banyak bimbingan)',
    3: '3 - Sesuai Ekspektasi / Standard (100%)',
    4: '4 - Melebihi Ekspektasi (Sangat Mahir)',
    5: '5 - Sangat Istimewa (Role Model / Pakar)'
};

// Watson Wyatt Raw Level Definitions (Level Murni 1-6 / 1-7 / 1-8 / 1-5 berdasar Watson Wyatt.md)
const WATSON_RAW_LEVELS = {
    knowledge: {
        maxLevel: 6,
        points: { 1: 9, 2: 14, 3: 23, 4: 36, 5: 57, 6: 90 },
        labels: {
            1: 'Level 1 (9 pt): SMA/SMK Sederajat (Metode & Rutinitas Awal)',
            2: 'Level 2 (14 pt): SMA + Pelatihan Khusus / Sertifikasi Teknis',
            3: 'Level 3 (23 pt): Diploma / D3 Akademi (Prosedur Spesifik)',
            4: 'Level 4 (36 pt): Sarjana S1 / Business School (Spesialisasi Teknis)',
            5: 'Level 5 (57 pt): Post-Graduate / S2 / MBA / Akuntan Teruji',
            6: 'Level 6 (90 pt): Pakar / Spesialis Tingkat Tinggi'
        }
    },
    experience: {
        maxLevel: 7,
        points: { 1: 13, 2: 19, 3: 28, 4: 41, 5: 60, 6: 89, 7: 130 },
        labels: {
            1: 'Level 1 (13 pt): Pemula / Fresh Graduate (< 1 Tahun)',
            2: 'Level 2 (19 pt): 1 – 2 Tahun Pengalaman Prosedur Rutin',
            3: 'Level 3 (28 pt): 2 – 4 Tahun Pengalaman Operasional Mandiri',
            4: 'Level 4 (41 pt): 4 – 7 Tahun Pengalaman Praktis Mendalam',
            5: 'Level 5 (60 pt): 7 – 11 Tahun Pengalaman Intensif Spesialis/Mgr',
            6: 'Level 6 (89 pt): 11 – 15 Tahun Pengalaman Spesialis/Struktur',
            7: 'Level 7 (130 pt): > 15 Tahun Pengalaman Spesialis Senior (>15 Thn)'
        }
    },
    scope: {
        maxLevel: 7,
        points: { 1: 10, 2: 15, 3: 22, 4: 32, 5: 46, 6: 68, 7: 100 },
        labels: {
            1: 'Level 1 (10 pt): Pekerjaan Rutin Berulang (Satu Tugas Rutin)',
            2: 'Level 2 (15 pt): Fungsi Khusus dengan Opsi Tindakan Terbatas',
            3: 'Level 3 (22 pt): Pekerjaan Agak Berbeda, Koordinasi Lintas Unit',
            4: 'Level 4 (32 pt): Variasi Pekerjaan Luas Lintas Divisi',
            5: 'Level 5 (46 pt): Integrasi Konseptual & Operasional Multi-Divisi',
            6: 'Level 6 (68 pt): Area Bisnis Berbeda, Integrasi Strategi Perusahaan',
            7: 'Level 7 (100 pt): Pengawasan Fungsi Bisnis Sangat Berbeda Lintas Lokasi'
        }
    },
    decision: {
        maxLevel: 6,
        points: { 1: 16, 2: 26, 3: 40, 4: 64, 5: 101, 6: 160 },
        labels: {
            1: 'Level 1 (16 pt): Keputusan Rutin Berdasar Standar (Ragu → Atasan)',
            2: 'Level 2 (26 pt): Keputusan Operasional Normal (Prosedur Teruji)',
            3: 'Level 3 (40 pt): Keputusan Teknis Penting Sesuai SOP Unit',
            4: 'Level 4 (64 pt): Keputusan Manajerial Umum Berdampak Unit',
            5: 'Level 5 (101 pt): Keputusan Kebijakan Strategis Lintas Divisi (BOD)',
            6: 'Level 6 (160 pt): Keputusan Strategis Penentu Masa Depan Perusahaan'
        }
    },
    consequence: {
        maxLevel: 6,
        points: { 1: 13, 2: 21, 3: 33, 4: 52, 5: 85, 6: 130 },
        labels: {
            1: 'Level 1 (13 pt): Akibat Kecil Kecerobohan, Diperbaiki Langsung',
            2: 'Level 2 (21 pt): Minor Delay / Ketidakseimbangan Biaya Unit',
            3: 'Level 3 (33 pt): Keterlambatan Departemen & Biaya Tambahan',
            4: 'Level 4 (52 pt): Kerugian Operasional & Biaya Multi-Departemen',
            5: 'Level 5 (85 pt): Kerugian Profit & Loss (P&L) & Reputasi Bisnis',
            6: 'Level 6 (130 pt): Risiko Puncak Merusak Keuangan & Reputasi Jangka Panjang'
        }
    },
    intContact: {
        maxLevel: 6,
        points: { 1: 5, 2: 8, 3: 13, 4: 20, 5: 32, 6: 50 },
        labels: {
            1: 'Level 1 (5 pt): Kontak Rutin Singkat (Informasi Dasar)',
            2: 'Level 2 (8 pt): Pertukaran Informasi Tugas Tersebut',
            3: 'Level 3 (13 pt): Diskusi & Saran Masalah Kesulitan Moderat',
            4: 'Level 4 (20 pt): Konsultasi Mendalam Permasalahan Tinggi',
            5: 'Level 5 (32 pt): Kerjasama Manajerial Mempengaruhi Kebijakan',
            6: 'Level 6 (50 pt): Penanganan Taktis Masalah Internal Kompleks'
        }
    },
    extContact: {
        maxLevel: 6,
        points: { 1: 8, 2: 12, 3: 21, 4: 32, 5: 51, 6: 80 },
        labels: {
            1: 'Level 1 (8 pt): Minimal / Tanpa Kontak Eksternal',
            2: 'Level 2 (12 pt): Layanan & Informasi Rekanan / Pelanggan',
            3: 'Level 3 (21 pt): Relasi Berulang Menjaga Layanan & Brand',
            4: 'Level 4 (32 pt): Negosiasi Kompleks Berdampak Pendapatan',
            5: 'Level 5 (51 pt): Situasi Komplit Berdampak Langsung Laba/Rugi',
            6: 'Level 6 (80 pt): Negosiasi Tingkat Tinggi Penentu Aktivitas Bisnis'
        }
    },
    supervision: {
        maxLevel: 6,
        points: { 1: 12, 2: 19, 3: 30, 4: 47, 5: 76, 6: 120 },
        labels: {
            1: 'Level 1 (12 pt): Bertanggung Jawab Pekerjaan Sendiri / Bantu Rekan',
            2: 'Level 2 (19 pt): Alokasi Tugas, Aliran Kerja & Pelatihan Dasar',
            3: 'Level 3 (30 pt): Mengelola Tim, Kinerja, & Rekomendasi Upah',
            4: 'Level 4 (47 pt): Mengelola Tim Melalui Supervisor Pertama',
            5: 'Level 5 (76 pt): Mengelola Divisi Utama & Policy Jangka Panjang',
            6: 'Level 6 (120 pt): Tanggung Jawab Mutlak Admin Umum & Executive'
        }
    },
    headcount: {
        maxLevel: 8,
        points: { 1: 6, 2: 8, 3: 12, 4: 16, 5: 22, 6: 31, 7: 43, 8: 60 },
        labels: {
            1: 'Level 1 (6 pt): 0 Orang (Tidak Mengawasi Bawahan)',
            2: 'Level 2 (8 pt): 1 – 4 Orang Bawahan',
            3: 'Level 3 (12 pt): 5 – 10 Orang Bawahan',
            4: 'Level 4 (16 pt): 11 – 30 Orang Bawahan',
            5: 'Level 5 (22 pt): 31 – 50 Orang Bawahan',
            6: 'Level 6 (31 pt): 51 – 100 Orang Bawahan',
            7: 'Level 7 (43 pt): 101 – 500 Orang Bawahan',
            8: 'Level 8 (60 pt): Lebih dari 500 Orang Bawahan'
        }
    },
    research: {
        maxLevel: 5,
        points: { 1: 8, 2: 14, 3: 25, 4: 45, 5: 80 },
        labels: {
            1: 'Level 1 (8 pt): Pengumpulan Data Rutin Standar',
            2: 'Level 2 (14 pt): Investigasi Data & Identifikasi Metode Bidang Khusus',
            3: 'Level 3 (25 pt): Menyempurnakan Metode & Analisis Data Kompleks',
            4: 'Level 4 (45 pt): Mengembangkan Pendekatan Analitik Baru',
            5: 'Level 5 (80 pt): Membuat Metode dari Nol & Evaluasi Hipotesis Jangka Panjang'
        }
    }
};

// Runtime State for Watson Simulation
let watsonSimState = {
    selectedGrade: 'D4-2',
    isManagerialFirst: false, // Toggle Opsi A: Jalur Manajerial Rangkap Peran
    calcMode: 'rating',      // 'rating' (Likert 1-5), 'raw' (Watson Wyatt native level 1-N), or 'hybrid' (Hibrida 2D Seat Value x LMS)
    labelMode: 'watson',     // 'watson' (Watson Wyatt descriptors) or 'likert' (Likert 1-5)
    ratings: {},             // { knowledge: 3, experience: 3, ... }
    rawLevelsMap: {},        // { D4-2: { knowledge: 4, experience: 4, ... } }
    
    // Hybrid PT Dasaria v1.0 State
    subTab: 'master-data',    // 'master-data', 'seat-eval', 'person-maturity', 'standard-matrix'
    hybridState: {
        rumpun: 'M',           // 'O' (Operasional), 'F' (Fungsional), 'M' (Manajerial)
        lCore: 3,             // 1-5
        lFunct: 3,            // 1-5
        lMgt: 3,              // 1-5
        lP10Manual: 1,        // 1-8 (Jumlah Karyawan Diawasi)
        isExecutive: false,   // boolean
        ksaoK: 3.00,          // Knowledge (25%)
        ksaoS: 3.00,          // Skills (30%)
        ksaoA: 3.00,          // Abilities (25%)
        ksaoO: 3.00           // Other Characteristics (20%)
    }
};

// =====================================================
// HYBRID SYSTEM PT DASARIA v1.0 MASTER DATA & LOGIC
// =====================================================
const HYBRID_MASTER_WW = {
    P1:  [9, 14, 23, 36, 57, 90, 0, 0],
    P2:  [13, 19, 28, 41, 60, 89, 130, 0],
    P3:  [10, 15, 22, 32, 46, 68, 100, 0],
    P4:  [16, 26, 40, 64, 101, 160, 0, 0],
    P5:  [13, 21, 33, 52, 85, 130, 0, 0],
    P6:  [5, 8, 13, 20, 32, 50, 0, 0],
    P7:  [8, 12, 21, 32, 51, 80, 0, 0],
    P8:  [8, 14, 25, 45, 80, 0, 0, 0],
    P9:  [12, 19, 30, 47, 76, 120, 0, 0],
    P10: [6, 8, 12, 16, 22, 31, 43, 60]
};

const HYBRID_ZERO_GAP_BOUNDS = [
    { grade: 'D1', name: 'D1 (Entry Level)', rawMin: 45, rawMax: 86, jvMin: 100, jvMax: 154 },
    { grade: 'D2', name: 'D2 (Officer)', rawMin: 87, rawMax: 171, jvMin: 155, jvMax: 214 },
    { grade: 'D3', name: 'D3 (Principal/Jr.Mgr)', rawMin: 172, rawMax: 315, jvMin: 215, jvMax: 279 },
    { grade: 'D4', name: 'D4 (Specialist/Mid.Mgr)', rawMin: 316, rawMax: 507, jvMin: 280, jvMax: 354 },
    { grade: 'D5', name: 'D5 (Snr. Manager)', rawMin: 508, rawMax: 749, jvMin: 355, jvMax: 424 },
    { grade: 'D6', name: 'D6 (Executive)', rawMin: 750, rawMax: 1100, jvMin: 425, jvMax: 500 }
];

const HYBRID_LMS_SUB_LEVELS = [
    { min: 1.00, max: 1.80, sub: 'A', desc: 'Trainee', adjustment: -0.15 },
    { min: 1.81, max: 2.60, sub: 'B', desc: 'Developing', adjustment: -0.075 },
    { min: 2.61, max: 3.40, sub: 'C', desc: 'Fully Competent (Ekuilibrium)', adjustment: 0 },
    { min: 3.41, max: 4.20, sub: 'D', desc: 'Advanced', adjustment: 0.075 },
    { min: 4.21, max: 5.00, sub: 'E', desc: 'Mastery', adjustment: 0.15 }
];

function calcHybridSimResult() {
    const h = watsonSimState.hybridState || {};
    const rumpun = h.rumpun || 'M';
    const lCore = Number(h.lCore) || 3;
    const lFunct = Number(h.lFunct) || 3;
    const lMgt = Number(h.lMgt) || 3;
    const lP10Manual = Number(h.lP10Manual) || 1;
    const isExec = !!h.isExecutive;

    // Detailed KSAO Assessment Dimensions
    const ksaoK = h.ksaoK !== undefined ? Number(h.ksaoK) : 3.00;
    const ksaoS = h.ksaoS !== undefined ? Number(h.ksaoS) : 3.00;
    const ksaoA = h.ksaoA !== undefined ? Number(h.ksaoA) : 3.00;
    const ksaoO = h.ksaoO !== undefined ? Number(h.ksaoO) : 3.00;

    // Weighted KSAO Score = (K * 0.25) + (S * 0.30) + (A * 0.25) + (O * 0.20)
    const skorKSAO = (ksaoK * 0.25) + (ksaoS * 0.30) + (ksaoA * 0.25) + (ksaoO * 0.20);

    const pLevels = {
        P1: lFunct,
        P2: lFunct,
        P3: rumpun === 'M' ? lMgt : lFunct,
        P4: rumpun === 'M' ? lMgt : lFunct,
        P5: lCore,
        P6: rumpun === 'M' ? lMgt : lCore,
        P7: rumpun === 'O' ? 0 : (rumpun === 'F' ? lFunct : lMgt),
        P8: rumpun === 'O' ? 0 : lFunct,
        P9: rumpun === 'M' ? lMgt : 0,
        P10: rumpun === 'M' ? lP10Manual : 0
    };

    let isScaleCompressionActive = false;
    if (lMgt === 5 && isExec) {
        isScaleCompressionActive = true;
        pLevels.P3 = 6;
        pLevels.P4 = 6;
        pLevels.P5 = 6;
        pLevels.P6 = 6;
        if (pLevels.P7 > 0) pLevels.P7 = 6;
        if (pLevels.P9 > 0) pLevels.P9 = 6;
    }

    const pPoints = {};
    const pWeights = {};
    const pWeightedPoints = {};
    let totalRawPoints = 0;
    let totalWeightedRawPoints = 0;

    // Temporary Grade Determination based on raw points to fetch active grade weights
    let tempBound = HYBRID_ZERO_GAP_BOUNDS.find(b => {
        let tempSum = 0;
        Object.keys(pLevels).forEach(p => {
            const lvl = pLevels[p];
            tempSum += (lvl > 0 && HYBRID_MASTER_WW[p]) ? (HYBRID_MASTER_WW[p][lvl - 1] || 0) : 0;
        });
        return tempSum <= b.rawMax;
    }) || HYBRID_ZERO_GAP_BOUNDS[HYBRID_ZERO_GAP_BOUNDS.length - 1];

    const tempGradeCode = (tempBound.grade === 'D3') ? (rumpun === 'M' ? 'D3-2' : 'D3-1') : (tempBound.grade === 'D4') ? (rumpun === 'M' ? 'D4-2' : 'D4-1') : tempBound.grade;
    const gradeMeta = getDynamicGradeMeta(tempGradeCode);
    const pKeyMap = { P1: 'knowledge', P2: 'experience', P3: 'scope', P4: 'decision', P5: 'consequence', P6: 'intContact', P7: 'extContact', P8: 'research', P9: 'supervision', P10: 'headcount' };

    Object.keys(pLevels).forEach(p => {
        const lvl = pLevels[p];
        const pt = (lvl > 0 && HYBRID_MASTER_WW[p]) ? (HYBRID_MASTER_WW[p][lvl - 1] || 0) : 0;
        const pKey = pKeyMap[p];
        const isParamActive = lvl > 0 && gradeMeta.activeParams.includes(pKey);
        const wPct = isParamActive ? (gradeMeta.weights[pKey] || 0) : 0;
        const ptW = pt * (wPct / 100);

        pPoints[p] = pt;
        pWeights[p] = wPct;
        pWeightedPoints[p] = ptW;
        totalRawPoints += pt;
        totalWeightedRawPoints += ptW;
    });

    let bound = HYBRID_ZERO_GAP_BOUNDS.find(b => totalRawPoints <= b.rawMax) || HYBRID_ZERO_GAP_BOUNDS[HYBRID_ZERO_GAP_BOUNDS.length - 1];
    const actualGradeCode = (bound.grade === 'D3') ? (rumpun === 'M' ? 'D3-2' : 'D3-1') : (bound.grade === 'D4') ? (rumpun === 'M' ? 'D4-2' : 'D4-1') : bound.grade;
    const actualGradeName = WATSON_GRADE_META[actualGradeCode] ? WATSON_GRADE_META[actualGradeCode].name : bound.name;

    const rawSpan = Math.max(1, bound.rawMax - bound.rawMin);
    const jvSpan = bound.jvMax - bound.jvMin;
    
    // Skenario 2: Mode Asesmen Rating Terbobot (Pre-Weighted Likert Mapping)
    // Base JV uses totalWeightedRawPoints * 4 (scaled to full raw range) or directly mapped to rawSpan
    // Since totalWeightedRawPoints is SUM(Poin * Bobot%), scaling it to raw range:
    const effectiveWeightedPoints = totalWeightedRawPoints > 0 ? (totalWeightedRawPoints * (totalRawPoints / (totalWeightedRawPoints || 1))) : totalRawPoints;
    const baseJV = bound.jvMin + Math.min(1, Math.max(0, (effectiveWeightedPoints - bound.rawMin) / rawSpan)) * jvSpan;

    let subItem = HYBRID_LMS_SUB_LEVELS.find(s => skorKSAO >= s.min && skorKSAO <= s.max) || HYBRID_LMS_SUB_LEVELS[2];

    let rawFinalJV = baseJV + (baseJV * subItem.adjustment);
    if (rawFinalJV < bound.jvMin) rawFinalJV = bound.jvMin;
    if (rawFinalJV > bound.jvMax) rawFinalJV = bound.jvMax;

    const finalJV = Math.round(rawFinalJV);

    // Payroll Calculation (Connected to Active UMK & Head Office Engine)
    const umkVal = (typeof getActiveUmk === 'function') ? getActiveUmk() : 3000000;
    const rk = v => Math.round(v / 1000) * 1000;

    const C = (typeof approachBaruParams !== 'undefined' && approachBaruParams.plafon) ? approachBaruParams.plafon : 15000000;
    const sp = (typeof approachBaruParams !== 'undefined' && approachBaruParams.sigmaPct) ? approachBaruParams.sigmaPct : 85;
    const gp = (typeof approachBaruParams !== 'undefined' && approachBaruParams.gapPct) ? approachBaruParams.gapPct : 2;
    const modelType = (typeof approachBaruParams !== 'undefined' && approachBaruParams.modelType) ? approachBaruParams.modelType : 'squeeze';

    let dStack = (typeof deriveGradeStack === 'function') ? deriveGradeStack(umkVal, C, sp, gp) : null;

    const subIdxMap = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    const curSubIdx = subIdxMap[subItem.sub] !== undefined ? subIdxMap[subItem.sub] : 2;

    let targetSubRp = rk((finalJV / 100) * umkVal);
    if (dStack && dStack.grades) {
        const foundGrade = dStack.grades.find(g => g.label === actualGradeCode);
        if (foundGrade && foundGrade.subs && foundGrade.subs[curSubIdx]) {
            targetSubRp = foundGrade.subs[curSubIdx].rp;
        }
    }

    const comps = (typeof calcBaruCellComponents === 'function')
        ? calcBaruCellComponents(targetSubRp, curSubIdx, modelType, approachBaruParams, subItem.sub, actualGradeCode)
        : { thp: rk((finalJV / 100) * umkVal), gapok: rk((finalJV / 100) * umkVal * 0.75), tt: rk((finalJV / 100) * umkVal * 0.15), ttt: rk((finalJV / 100) * umkVal * 0.10) };

    const thpPaket = comps.thp;
    const gapok = comps.gapok;
    const tt = comps.tt;
    const ttt = comps.ttt;

    // Sub-Level Salary Matrix for Current Grade with Min-Max Ranges
    const subSalaryMatrix = HYBRID_LMS_SUB_LEVELS.map((s, idx) => {
        let rawSubJV = baseJV + (baseJV * s.adjustment);
        if (rawSubJV < bound.jvMin) rawSubJV = bound.jvMin;
        if (rawSubJV > bound.jvMax) rawSubJV = bound.jvMax;
        const subJV = Math.round(rawSubJV);

        let subRp = rk((subJV / 100) * umkVal);
        let nextSubRp = subRp;
        if (dStack && dStack.grades) {
            const foundGrade = dStack.grades.find(g => g.label === actualGradeCode);
            if (foundGrade && foundGrade.subs && foundGrade.subs[idx]) {
                subRp = foundGrade.subs[idx].rp;
                if (idx < 4 && foundGrade.subs[idx + 1]) {
                    nextSubRp = foundGrade.subs[idx + 1].rp;
                } else {
                    nextSubRp = rk(foundGrade.max);
                }
            }
        }

        const subComps = (typeof calcBaruCellComponents === 'function')
            ? calcBaruCellComponents(subRp, idx, modelType, approachBaruParams, s.sub, actualGradeCode)
            : { thp: subRp, gapok: rk(subRp * 0.75), tt: rk(subRp * 0.15), ttt: rk(subRp * 0.10) };

        const nextSubComps = (typeof calcBaruCellComponents === 'function')
            ? calcBaruCellComponents(nextSubRp, Math.min(4, idx + 1), modelType, approachBaruParams, s.sub, actualGradeCode)
            : { thp: nextSubRp };

        const subTHPMin = subComps.thp;
        const subTHPMax = Math.max(subTHPMin, nextSubComps.thp);

        return {
            sub: s.sub,
            desc: s.desc,
            subJV,
            subTHPMin,
            subTHPMax,
            subTHP: subComps.thp,
            subGapok: subComps.gapok,
            subTT: subComps.tt,
            subTTT: subComps.ttt,
            isCurrent: s.sub === subItem.sub
        };
    });

    return {
        rumpun, lCore, lFunct, lMgt, lP10Manual, isExec,
        ksaoK, ksaoS, ksaoA, ksaoO, skorKSAO,
        pLevels, pPoints, pWeights, pWeightedPoints, totalRawPoints, totalWeightedRawPoints,
        gradeCode: actualGradeCode, gradeName: actualGradeName,
        rawMin: bound.rawMin, rawMax: bound.rawMax,
        jvMin: bound.jvMin, jvMax: bound.jvMax,
        baseJV: Math.round(baseJV),
        subLevel: subItem.sub, subDesc: subItem.desc, adjustmentPct: subItem.adjustment * 100,
        finalJV, isScaleCompressionActive,
        umkVal, thpPaket, gapok, tt, ttt, subSalaryMatrix
    };
}

function initWatsonSimState(gradeCode) {
    const code = gradeCode || watsonSimState.selectedGrade || 'D4-2';
    watsonSimState.selectedGrade = code;
    const meta = WATSON_GRADE_META[code] || WATSON_GRADE_META['D4-2'];

    if (!watsonSimState.activeParamsMap) watsonSimState.activeParamsMap = {};
    if (!watsonSimState.paramTiersMap) watsonSimState.paramTiersMap = {};
    if (!watsonSimState.customWeightsMap) watsonSimState.customWeightsMap = {};
    if (!watsonSimState.ratings) watsonSimState.ratings = {};

    if (!watsonSimState.activeParamsMap[code]) {
        watsonSimState.activeParamsMap[code] = [...meta.defaultActive];
    }
    if (!watsonSimState.paramTiersMap[code]) {
        watsonSimState.paramTiersMap[code] = { ...(meta.defaultTiers || {}) };
    }
    if (!watsonSimState.customWeightsMap[code]) {
        watsonSimState.customWeightsMap[code] = { ...(meta.defaultWeights || {}) };
    }
    if (!watsonSimState.ratings[code]) {
        const defaultRatings = {};
        WATSON_PARAM_KEYS.forEach(p => { defaultRatings[p.id] = 3; });
        watsonSimState.ratings[code] = defaultRatings;
    }
    if (!watsonSimState.rawLevelsMap) watsonSimState.rawLevelsMap = {};
    if (!watsonSimState.rawLevelsMap[code]) {
        const defaultRaw = {};
        WATSON_PARAM_KEYS.forEach(p => {
            const maxL = WATSON_RAW_LEVELS[p.id]?.maxLevel || 5;
            defaultRaw[p.id] = Math.min(3, maxL);
        });
        watsonSimState.rawLevelsMap[code] = defaultRaw;
    }
}

// Compute effective weights dynamically: respect user explicit custom weight, normalize total to 100%
function rebalanceWeightsOnToggle(code, paramId, isChecked) {
    initWatsonSimState(code);
    const meta = WATSON_GRADE_META[code];
    let activeList = watsonSimState.activeParamsMap[code] || [...(meta?.defaultActive || [])];

    if (isChecked) {
        if (!activeList.includes(paramId)) activeList.push(paramId);
    } else {
        activeList = activeList.filter(p => p !== paramId);
    }
    watsonSimState.activeParamsMap[code] = activeList;

    if (activeList.length === 0) return;

    if (isChecked) {
        const targetNewW = Math.min(20, Math.max(5, Math.round(100 / activeList.length)));
        const otherActive = activeList.filter(p => p !== paramId);
        
        if (otherActive.length === 0) {
            watsonSimState.customWeightsMap[code][paramId] = 100;
        } else {
            let otherSum = 0;
            otherActive.forEach(p => {
                otherSum += watsonSimState.customWeightsMap[code][p] !== undefined ? watsonSimState.customWeightsMap[code][p] : (meta.defaultWeights[p] || 10);
            });
            const remainingTarget = 100 - targetNewW;
            const scaleRatio = remainingTarget / (otherSum || 1);
            
            let sumSoFar = 0;
            otherActive.forEach((p, idx) => {
                const oldW = watsonSimState.customWeightsMap[code][p] !== undefined ? watsonSimState.customWeightsMap[code][p] : (meta.defaultWeights[p] || 10);
                let newW = Math.round(oldW * scaleRatio);
                if (idx === otherActive.length - 1) {
                    newW = Math.max(0, remainingTarget - sumSoFar);
                }
                watsonSimState.customWeightsMap[code][p] = newW;
                sumSoFar += newW;
            });
            watsonSimState.customWeightsMap[code][paramId] = targetNewW;
        }
    } else {
        let activeSum = 0;
        activeList.forEach(p => {
            activeSum += watsonSimState.customWeightsMap[code][p] !== undefined ? watsonSimState.customWeightsMap[code][p] : (meta.defaultWeights[p] || 10);
        });
        let sumSoFar = 0;
        activeList.forEach((p, idx) => {
            const oldW = watsonSimState.customWeightsMap[code][p] !== undefined ? watsonSimState.customWeightsMap[code][p] : (meta.defaultWeights[p] || 10);
            let newW = Math.round((oldW / (activeSum || 1)) * 100);
            if (idx === activeList.length - 1) {
                newW = Math.max(0, 100 - sumSoFar);
            }
            watsonSimState.customWeightsMap[code][p] = newW;
            sumSoFar += newW;
        });
    }
}

function rebalanceWeightsOnChange(code, changedParamId, newWeightVal) {
    initWatsonSimState(code);
    const meta = WATSON_GRADE_META[code];
    const activeList = watsonSimState.activeParamsMap[code] || [];
    if (!activeList.includes(changedParamId)) return;

    let targetW = Math.max(0, Math.min(100, Math.round(Number(newWeightVal) || 0)));
    watsonSimState.customWeightsMap[code][changedParamId] = targetW;

    const otherActive = activeList.filter(p => p !== changedParamId);
    if (otherActive.length === 0) {
        watsonSimState.customWeightsMap[code][changedParamId] = 100;
        return;
    }

    const remainingTarget = 100 - targetW;
    let oldOtherSum = 0;
    otherActive.forEach(p => {
        oldOtherSum += watsonSimState.customWeightsMap[code][p] !== undefined ? watsonSimState.customWeightsMap[code][p] : (meta.defaultWeights[p] || 10);
    });

    let sumSoFar = 0;
    otherActive.forEach((p, idx) => {
        const oldW = watsonSimState.customWeightsMap[code][p] !== undefined ? watsonSimState.customWeightsMap[code][p] : (meta.defaultWeights[p] || 10);
        let newW = 0;
        if (oldOtherSum > 0) {
            newW = Math.round((oldW / oldOtherSum) * remainingTarget);
        } else {
            newW = Math.round(remainingTarget / otherActive.length);
        }

        if (idx === otherActive.length - 1) {
            newW = Math.max(0, remainingTarget - sumSoFar);
        }
        watsonSimState.customWeightsMap[code][p] = newW;
        sumSoFar += newW;
    });
}

function getDynamicGradeMeta(gradeCode) {
    let code = gradeCode || watsonSimState.selectedGrade || 'D4-2';
    if (code === 'D3') code = (watsonSimState.hybridState?.rumpun === 'M') ? 'D3-2' : 'D3-1';
    if (code === 'D4') code = (watsonSimState.hybridState?.rumpun === 'M') ? 'D4-2' : 'D4-1';

    initWatsonSimState(code);
    const meta = WATSON_GRADE_META[code] || WATSON_GRADE_META['D4-2'];
    
    // Ensure activeParams are strictly constrained by Rumpun Jabatan in Hybrid Mode
    let activeParams = (watsonSimState.activeParamsMap && watsonSimState.activeParamsMap[code]) || meta.defaultActive;
    const rumpun = watsonSimState.hybridState?.rumpun;
    if (rumpun === 'O') {
        const allowedO = ['knowledge', 'experience', 'consequence', 'scope'];
        activeParams = activeParams.filter(p => allowedO.includes(p));
        if (activeParams.length === 0) activeParams = [...allowedO];
    } else if (rumpun === 'F') {
        const allowedF = ['knowledge', 'experience', 'consequence', 'scope', 'decision', 'intContact', 'extContact', 'research'];
        activeParams = activeParams.filter(p => allowedF.includes(p));
        if (activeParams.length === 0) activeParams = [...allowedF];
    }

    const customWeights = (watsonSimState.customWeightsMap && watsonSimState.customWeightsMap[code]) || {};
    const paramTiers = (watsonSimState.paramTiersMap && watsonSimState.paramTiersMap[code]) || meta.defaultTiers || {};

    let weights = {};
    if (activeParams.length === 0) {
        weights = {};
    } else {
        let sumRaw = 0;
        activeParams.forEach(p => {
            let baseW = customWeights[p] !== undefined ? Number(customWeights[p]) : (meta.defaultWeights[p] || 10);
            sumRaw += baseW;
        });

        let sumNormalized = 0;
        activeParams.forEach((p, idx) => {
            let baseW = customWeights[p] !== undefined ? Number(customWeights[p]) : (meta.defaultWeights[p] || 10);

            if (idx === activeParams.length - 1) {
                weights[p] = Math.max(0, 100 - sumNormalized);
            } else {
                const norm = Math.round((baseW / (sumRaw || 1)) * 100);
                weights[p] = norm;
                sumNormalized += norm;
            }
        });
    }

    return {
        ...meta,
        activeParams,
        paramTiers,
        customWeights,
        weights
    };
}

// Calculate JV from Ratings 1-5 OR Raw Watson Points Level
function calcWatsonSimJVFromRating(gradeCode) {
    const meta = getDynamicGradeMeta(gradeCode);
    const isRawMode = watsonSimState.calcMode === 'raw';

    let totalWeightedScore = 0;
    let totalRawPointsSum = 0;

    if (meta.activeParams.length > 0) {
        if (!isRawMode) {
            // Mode 1: Skala Likert 1-5 (Pre-weighted)
            const ratings = watsonSimState.ratings[gradeCode] || {};
            meta.activeParams.forEach(p => {
                const rating = ratings[p] !== undefined ? Number(ratings[p]) : 3;
                const weight = (meta.weights[p] || 0) / 100;
                totalWeightedScore += rating * weight;
            });
        } else {
            // Mode 2: Watson Wyatt Raw Level (1-6 / 1-7 / 1-8 / 1-5)
            const rawLevels = watsonSimState.rawLevelsMap?.[gradeCode] || {};
            meta.activeParams.forEach(p => {
                const maxL = WATSON_RAW_LEVELS[p]?.maxLevel || 5;
                const level = rawLevels[p] !== undefined ? Number(rawLevels[p]) : Math.min(3, maxL);
                const pts = WATSON_RAW_LEVELS[p]?.points[level] || 10;
                totalRawPointsSum += pts;
            });
        }
    } else {
        totalWeightedScore = 1;
        totalRawPointsSum = meta.rawMin;
    }

    let normalizedRatio = 0;
    let rawJV = meta.jvMin;

    if (!isRawMode) {
        normalizedRatio = Math.max(0, Math.min(1, (totalWeightedScore - 1) / 4));
        rawJV = meta.jvMin + (normalizedRatio * (meta.jvMax - meta.jvMin));
    } else {
        const spanRaw = Math.max(1, meta.rawMax - meta.rawMin);
        normalizedRatio = Math.max(0, Math.min(1, (totalRawPointsSum - meta.rawMin) / spanRaw));
        rawJV = meta.jvMin + (normalizedRatio * (meta.jvMax - meta.jvMin));
    }

    const targetJV = Math.round(rawJV);
    const step = (meta.jvMax - meta.jvMin) / 4;
    let sublevel = 'C';
    if (rawJV <= meta.jvMin + step * 0.5) sublevel = 'A';
    else if (rawJV <= meta.jvMin + step * 1.5) sublevel = 'B';
    else if (rawJV <= meta.jvMin + step * 2.5) sublevel = 'C';
    else if (rawJV <= meta.jvMin + step * 3.5) sublevel = 'D';
    else sublevel = 'E';

    return {
        gradeCode,
        isRawMode,
        totalWeightedScore,
        totalRawPointsSum,
        normalizedRatio,
        targetJV,
        sublevel,
        jvMin: meta.jvMin,
        jvMax: meta.jvMax,
        jvMid: Math.round((meta.jvMin + meta.jvMax) / 2),
        rawMin: meta.rawMin,
        rawMax: meta.rawMax
    };
}

function setWatsonSubTab(tabName) {
    watsonSimState.subTab = tabName;
    renderMenu10();
}

function onHybridParamChange(key, value) {
    if (!watsonSimState.hybridState) watsonSimState.hybridState = {};
    if (key === 'isExecutive') {
        watsonSimState.hybridState.isExecutive = !!value;
    } else if (key === 'rumpun') {
        watsonSimState.hybridState.rumpun = value;
        const code = watsonSimState.selectedGrade || 'D4-2';
        initWatsonSimState(code);
        const meta = WATSON_GRADE_META[code] || WATSON_GRADE_META['D4-2'];
        let allowed = [...meta.defaultActive];
        if (value === 'O') {
            allowed = ['knowledge', 'experience', 'consequence', 'scope'];
        } else if (value === 'F') {
            allowed = ['knowledge', 'experience', 'consequence', 'scope', 'decision', 'intContact', 'extContact', 'research'];
        } else if (value === 'M') {
            allowed = ['knowledge', 'experience', 'consequence', 'scope', 'decision', 'intContact', 'extContact', 'supervision', 'headcount'];
        }
        watsonSimState.activeParamsMap[code] = allowed;
        rebalanceWeightsOnToggle(code, 'knowledge', true);
    } else {
        watsonSimState.hybridState[key] = Number(value);
    }
    renderMenu10();
}

function renderMenu10Hybrid() {
    const container = document.getElementById('menu10-container');
    if (!container) return;

    const res = calcHybridSimResult();

    const paramNames = {
        P1: 'P1. Pendidikan',
        P2: 'P2. Pengalaman',
        P3: 'P3. Ruang Lingkup',
        P4: 'P4. Keputusan',
        P5: 'P5. Konsekuensi',
        P6: 'P6. Kontak Internal',
        P7: 'P7. Kontak Eksternal',
        P8: 'P8. Riset & Analisis',
        P9: 'P9. Pengawasan',
        P10: 'P10. Jml Diawasi'
    };

    const routingRows = Object.keys(res.pLevels).map(p => {
        const lvl = res.pLevels[p];
        const pts = res.pPoints[p];
        const isOff = lvl === 0;
        return `
            <tr class="${isOff ? 'bg-slate-50 text-slate-400' : 'hover:bg-blue-50/50'} border-b border-slate-200 text-xs">
                <td class="py-2 px-3 border border-slate-200 font-bold text-slate-800">${paramNames[p]}</td>
                <td class="py-2 px-3 border border-slate-200 text-center font-bold">${isOff ? '<span class="text-slate-400 font-normal">OFF (0)</span>' : `Level ${lvl}`}</td>
                <td class="py-2 px-3 border border-slate-200 text-right font-mono font-extrabold ${isOff ? 'text-slate-400' : 'text-emerald-700'}">${pts} pt</td>
            </tr>
        `;
    }).join('');

    // Master 1 Table Rows
    const master1Rows = Object.keys(HYBRID_MASTER_WW).map(p => {
        const points = HYBRID_MASTER_WW[p];
        const currentLvl = res.pLevels[p];
        return `
            <tr class="border-b border-slate-200 text-xs text-center">
                <td class="py-2 px-2 border border-slate-200 font-bold text-left text-slate-800">${paramNames[p]}</td>
                ${points.map((pt, idx) => {
                    const lvlNum = idx + 1;
                    const isSelected = currentLvl === lvlNum;
                    if (pt === 0) return `<td class="py-2 px-1 border border-slate-200 text-slate-300">-</td>`;
                    return `<td class="py-2 px-1 border border-slate-200 font-mono ${isSelected ? 'bg-emerald-500 text-white font-extrabold shadow-sm' : 'text-slate-700'}">${pt}</td>`;
                }).join('')}
            </tr>
        `;
    }).join('');

    // Master 2 Table Rows
    const master2Rows = HYBRID_ZERO_GAP_BOUNDS.map(b => {
        const isCurrent = b.grade === res.gradeCode;
        return `
            <tr class="border-b border-slate-200 text-xs text-center ${isCurrent ? 'bg-purple-100 font-bold text-purple-950' : 'hover:bg-slate-50'}">
                <td class="py-2 px-3 border border-slate-200 font-extrabold text-left">${b.name}</td>
                <td class="py-2 px-3 border border-slate-200 font-mono">${b.rawMin} – ${b.rawMax} pt</td>
                <td class="py-2 px-3 border border-slate-200 font-mono text-purple-700 font-extrabold">${b.jvMin} – ${b.jvMax} Poin</td>
            </tr>
        `;
    }).join('');

    // Master 3 Table Rows
    const master3Rows = HYBRID_LMS_SUB_LEVELS.map(s => {
        const isCurrent = s.sub === res.subLevel;
        const adjFmt = s.adjustment > 0 ? `+${s.adjustment * 100}%` : s.adjustment < 0 ? `${s.adjustment * 100}%` : '0% (Ekuilibrium)';
        return `
            <tr class="border-b border-slate-200 text-xs text-center ${isCurrent ? 'bg-amber-100 font-bold text-amber-950' : 'hover:bg-slate-50'}">
                <td class="py-2 px-3 border border-slate-200 font-mono font-bold">${s.min.toFixed(2)} – ${s.max.toFixed(2)}</td>
                <td class="py-2 px-3 border border-slate-200 font-extrabold text-amber-800">Sub-Level ${s.sub}</td>
                <td class="py-2 px-3 border border-slate-200 text-left font-semibold text-slate-700">${s.desc}</td>
                <td class="py-2 px-3 border border-slate-200 font-mono font-bold ${s.adjustment > 0 ? 'text-emerald-700' : s.adjustment < 0 ? 'text-rose-700' : 'text-blue-700'}">${adjFmt}</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <!-- MODE SELECTOR HEADER -->
        <div class="card mb-6">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div class="card-title text-base m-0">🏛️ Simulasi Kompensasi Hibrida PT Dasaria v1.0</div>
                    <div class="card-desc text-xs text-slate-500 m-0 mt-0.5">Watson Wyatt (Seat Value Sumbu X) × LMS KSAO (Person Maturity Sumbu Y)</div>
                </div>
                <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-300">
                    <button type="button" onclick="setWatsonCalcMode('rating')" 
                        class="px-2.5 py-1 text-xs font-bold rounded-md transition-all ${watsonSimState.calcMode === 'rating' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                        📊 Likert (1-5)
                    </button>
                    <button type="button" onclick="setWatsonCalcMode('raw')" 
                        class="px-2.5 py-1 text-xs font-bold rounded-md transition-all ${watsonSimState.calcMode === 'raw' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                        🎯 Level Murni (1-N)
                    </button>
                    <button type="button" onclick="setWatsonCalcMode('hybrid')" 
                        class="px-2.5 py-1 text-xs font-bold rounded-md transition-all ${watsonSimState.calcMode === 'hybrid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                        🏛️ Hibrida PT Dasaria v1.0
                    </button>
                </div>
            </div>
        </div>

        <!-- 4 KNOB ROUTING CONTROLLER & LMS SLIDER -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- SUMBU X: SEAT VALUE CONTROLLER -->
            <div class="card border-blue-200 bg-blue-50/20">
                <div class="card-title text-sm text-blue-900 mb-1">🪑 Sumbu X: Evaluasi Kursi (Seat Value WW)</div>
                <div class="card-desc text-xs text-slate-500 mb-4">Input 4 Knob & Rumpun Jabatan untuk auto-routing P1–P10.</div>

                <div class="space-y-4 text-xs">
                    <!-- Rumpun Jabatan -->
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Rumpun Jabatan (Deskripsi Pekerjaan):</label>
                        <div class="grid grid-cols-3 gap-2">
                            <label class="flex items-center gap-2 p-2 rounded border cursor-pointer ${res.rumpun === 'O' ? 'bg-blue-600 text-white font-bold border-blue-700' : 'bg-white text-slate-700 border-slate-300'}">
                                <input type="radio" name="hybrid-rumpun" value="O" ${res.rumpun === 'O' ? 'checked' : ''} onchange="onHybridParamChange('rumpun', this.value)" class="sr-only">
                                <span>🛠️ Operasional (O)</span>
                            </label>
                            <label class="flex items-center gap-2 p-2 rounded border cursor-pointer ${res.rumpun === 'F' ? 'bg-blue-600 text-white font-bold border-blue-700' : 'bg-white text-slate-700 border-slate-300'}">
                                <input type="radio" name="hybrid-rumpun" value="F" ${res.rumpun === 'F' ? 'checked' : ''} onchange="onHybridParamChange('rumpun', this.value)" class="sr-only">
                                <span>📐 Fungsional (F)</span>
                            </label>
                            <label class="flex items-center gap-2 p-2 rounded border cursor-pointer ${res.rumpun === 'M' ? 'bg-blue-600 text-white font-bold border-blue-700' : 'bg-white text-slate-700 border-slate-300'}">
                                <input type="radio" name="hybrid-rumpun" value="M" ${res.rumpun === 'M' ? 'checked' : ''} onchange="onHybridParamChange('rumpun', this.value)" class="sr-only">
                                <span>👔 Manajerial (M)</span>
                            </label>
                        </div>
                    </div>

                    <!-- 3 Level Knobs -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="bg-white p-2.5 rounded border border-slate-200">
                            <label class="block font-bold text-slate-700 mb-1">Level Core (P5, P6):</label>
                            <div class="flex items-center gap-2">
                                <input type="range" min="1" max="5" value="${res.lCore}" oninput="onHybridParamChange('lCore', this.value)" class="w-full h-2 bg-blue-200 rounded accent-blue-600">
                                <span class="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">L${res.lCore}</span>
                            </div>
                        </div>
                        <div class="bg-white p-2.5 rounded border border-slate-200">
                            <label class="block font-bold text-slate-700 mb-1">Level Functional (P1, P2, P7, P8):</label>
                            <div class="flex items-center gap-2">
                                <input type="range" min="1" max="5" value="${res.lFunct}" oninput="onHybridParamChange('lFunct', this.value)" class="w-full h-2 bg-blue-200 rounded accent-blue-600">
                                <span class="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">L${res.lFunct}</span>
                            </div>
                        </div>
                        <div class="bg-white p-2.5 rounded border border-slate-200">
                            <label class="block font-bold text-slate-700 mb-1">Level Managerial (P3, P4, P9):</label>
                            <div class="flex items-center gap-2">
                                <input type="range" min="1" max="5" value="${res.lMgt}" oninput="onHybridParamChange('lMgt', this.value)" class="w-full h-2 bg-blue-200 rounded accent-blue-600">
                                <span class="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">L${res.lMgt}</span>
                            </div>
                        </div>
                    </div>

                    <!-- P10 Manual & Executive Checkbox -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div class="bg-white p-2.5 rounded border border-slate-200">
                            <label class="block font-bold text-slate-700 mb-1">P10: Jumlah Diawasi (Manajerial):</label>
                            <select onchange="onHybridParamChange('lP10Manual', this.value)" class="select-field text-xs font-bold text-slate-800 w-full" ${res.rumpun === 'M' ? '' : 'disabled'}>
                                <option value="1" ${res.lP10Manual === 1 ? 'selected' : ''}>Level 1: 0 Orang (6 pt)</option>
                                <option value="2" ${res.lP10Manual === 2 ? 'selected' : ''}>Level 2: 1-4 Orang (8 pt)</option>
                                <option value="3" ${res.lP10Manual === 3 ? 'selected' : ''}>Level 3: 5-10 Orang (12 pt)</option>
                                <option value="4" ${res.lP10Manual === 4 ? 'selected' : ''}>Level 4: 11-30 Orang (16 pt)</option>
                                <option value="5" ${res.lP10Manual === 5 ? 'selected' : ''}>Level 5: 31-50 Orang (22 pt)</option>
                                <option value="6" ${res.lP10Manual === 6 ? 'selected' : ''}>Level 6: 51-100 Orang (31 pt)</option>
                                <option value="7" ${res.lP10Manual === 7 ? 'selected' : ''}>Level 7: 101-500 Orang (43 pt)</option>
                                <option value="8" ${res.lP10Manual === 8 ? 'selected' : ''}>Level 8: >500 Orang (60 pt)</option>
                            </select>
                        </div>
                        <div class="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between">
                            <div>
                                <span class="block font-bold text-slate-800">Executive / D6 Flag:</span>
                                <span class="text-[10px] text-slate-500 block">Scale Compression ke Level 6 WW</span>
                            </div>
                            <input type="checkbox" ${res.isExec ? 'checked' : ''} onchange="onHybridParamChange('isExecutive', this.checked)" class="w-4 h-4 text-purple-600 rounded">
                        </div>
                    </div>
                </div>
            </div>

            <!-- SUMBU Y: PERSON MATURITY LMS KSAO SLIDER -->
            <div class="card border-amber-200 bg-amber-50/20">
                <div class="card-title text-sm text-amber-900 mb-1">👤 Sumbu Y: Kapasitas Karyawan (Person Maturity LMS)</div>
                <div class="card-desc text-xs text-slate-500 mb-4">Input Skor Asesmen LMS KSAO untuk menentukan Sub-Level (A–E) & Penyesuaian Final JV.</div>

                <div class="space-y-4 text-xs">
                    <div class="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                        <div class="flex justify-between items-center mb-2">
                            <span class="font-bold text-slate-800">Skor Asesmen LMS KSAO:</span>
                            <span class="text-base font-extrabold text-amber-800 bg-amber-100 px-3 py-1 rounded-lg border border-amber-300">${res.skorKSAO.toFixed(2)} / 5.00</span>
                        </div>
                        <input type="range" min="1.00" max="5.00" step="0.05" value="${res.skorKSAO}" oninput="onHybridParamChange('skorKSAO', this.value)" class="w-full h-3 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600">
                        <div class="flex justify-between text-[10px] font-bold text-slate-400 mt-1">
                            <span>1.00 (Trainee / Sub A)</span>
                            <span>3.00 (Fully Competent / Sub C)</span>
                            <span>5.00 (Mastery / Sub E)</span>
                        </div>
                    </div>

                    <div class="p-3 bg-white rounded-xl border border-amber-200 space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-600">Sub-Level Terpilih:</span>
                            <span class="px-2.5 py-1 text-xs font-extrabold rounded bg-amber-500 text-white">Sub-Level ${res.subLevel}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-600">Definisi Operasional:</span>
                            <span class="font-semibold text-slate-800">${res.subDesc}</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="font-bold text-slate-600">Penyesuaian Nilai Kursi:</span>
                            <span class="font-mono font-bold ${res.adjustmentPct > 0 ? 'text-emerald-700' : res.adjustmentPct < 0 ? 'text-rose-700' : 'text-blue-700'}">${res.adjustmentPct > 0 ? `+${res.adjustmentPct}%` : `${res.adjustmentPct}%`}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- STATS & RESULT CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="card border-blue-200 bg-blue-50/40">
                <div class="stat-value text-blue-800">${res.totalRawPoints} <span class="text-xs font-semibold text-blue-600">pt</span></div>
                <div class="stat-label">Total Poin Mentah WW</div>
                <div class="text-[10px] text-slate-500 mt-1">Sum(P1..P10 Poin)</div>
            </div>
            <div class="card border-purple-200 bg-purple-50/40">
                <div class="stat-value text-purple-900">${res.gradeCode}</div>
                <div class="stat-label">Grade Kursi (Seat Grade)</div>
                <div class="text-[10px] text-slate-500 mt-1">Poin: ${res.rawMin}–${res.rawMax} pt</div>
            </div>
            <div class="card border-amber-200 bg-amber-50/40">
                <div class="stat-value text-amber-800">${res.baseJV} <span class="text-xs font-semibold text-amber-600">Poin</span></div>
                <div class="stat-label">Base JV (Hak Kursi / Sub-C)</div>
                <div class="text-[10px] text-slate-500 mt-1">Linear Interpolation Kursi</div>
            </div>
            <div class="card border-emerald-200 bg-emerald-50/40">
                <div class="stat-value text-emerald-800">${res.finalJV} <span class="text-xs font-semibold text-emerald-600">Poin</span></div>
                <div class="stat-label">Final Job Value (Karyawan)</div>
                <div class="text-[10px] text-slate-500 mt-1">Base JV + Adjustment LMS</div>
            </div>
        </div>

        <!-- ROUTING LIVE TABLE & MASTER DATABASE REFERENCES -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- ROUTING LIVE TABLE -->
            <div class="card lg:col-span-1">
                <div class="card-title text-sm mb-2">📋 Live Routing Level & Poin (P1–P10)</div>
                <div class="sim-table-wrap border border-slate-200 max-h-[350px]">
                    <table class="w-full border-collapse text-xs text-left">
                        <thead>
                            <tr class="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                                <th class="py-2 px-3 border border-slate-200">Parameter</th>
                                <th class="py-2 px-3 border border-slate-200 text-center">Level</th>
                                <th class="py-2 px-3 border border-slate-200 text-right">Poin</th>
                            </tr>
                        </thead>
                        <tbody>${routingRows}</tbody>
                    </table>
                </div>
            </div>

            <!-- MASTER DATA 1: KAMUS POIN WW -->
            <div class="card lg:col-span-2">
                <div class="card-title text-sm mb-2">📚 Master Database 1: Kamus Poin Watson Wyatt</div>
                <div class="sim-table-wrap border border-slate-200 max-h-[350px]">
                    <table class="w-full border-collapse text-xs text-center">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold text-[10px]">
                                <th class="py-2 px-2 border border-slate-700 text-left bg-slate-900">Parameter WW</th>
                                <th class="py-2 px-1 border border-slate-700">L1</th>
                                <th class="py-2 px-1 border border-slate-700">L2</th>
                                <th class="py-2 px-1 border border-slate-700">L3</th>
                                <th class="py-2 px-1 border border-slate-700">L4</th>
                                <th class="py-2 px-1 border border-slate-700">L5</th>
                                <th class="py-2 px-1 border border-slate-700">L6</th>
                                <th class="py-2 px-1 border border-slate-700">L7</th>
                                <th class="py-2 px-1 border border-slate-700">L8</th>
                            </tr>
                        </thead>
                        <tbody>${master1Rows}</tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- MASTER DATA 2: ZERO GAP BOUNDS -->
            <div class="card">
                <div class="card-title text-sm mb-2">📐 Master Database 2: Zero Gap Bounds (Grade & Rentang JV)</div>
                <div class="sim-table-wrap border border-slate-200">
                    <table class="w-full border-collapse text-xs text-center">
                        <thead>
                            <tr class="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                                <th class="py-2 px-3 border border-slate-200 text-left">Grade Jabatan</th>
                                <th class="py-2 px-3 border border-slate-200">Poin Mentah WW</th>
                                <th class="py-2 px-3 border border-slate-200">Target Rentang JV</th>
                            </tr>
                        </thead>
                        <tbody>${master2Rows}</tbody>
                    </table>
                </div>
            </div>

            <!-- MASTER DATA 3: SUB-LEVEL LMS KSAO -->
            <div class="card">
                <div class="card-title text-sm mb-2">⭐ Master Database 3: Sub-Level Kematangan LMS (Sumbu Y)</div>
                <div class="sim-table-wrap border border-slate-200">
                    <table class="w-full border-collapse text-xs text-center">
                        <thead>
                            <tr class="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                                <th class="py-2 px-3 border border-slate-200">Skor LMS</th>
                                <th class="py-2 px-3 border border-slate-200">Sub-Level</th>
                                <th class="py-2 px-3 border border-slate-200 text-left">Definisi HR</th>
                                <th class="py-2 px-3 border border-slate-200">Penyesuaian JV</th>
                            </tr>
                        </thead>
                        <tbody>${master3Rows}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function renderMenu10() {
    const container = document.getElementById('menu10-container');
    if (!container) return;

    const subTab = watsonSimState.subTab || 'master-data';
    const res = calcHybridSimResult();

    const paramNames = {
        P1: 'P1. Pendidikan',
        P2: 'P2. Pengalaman',
        P3: 'P3. Ruang Lingkup',
        P4: 'P4. Keputusan',
        P5: 'P5. Konsekuensi',
        P6: 'P6. Kontak Internal',
        P7: 'P7. Kontak Eksternal',
        P8: 'P8. Riset & Analisis',
        P9: 'P9. Pengawasan',
        P10: 'P10. Jml Diawasi'
    };

    const routingRows = Object.keys(res.pLevels).map(p => {
        const lvl = res.pLevels[p];
        const pts = res.pPoints[p];
        const isOff = lvl === 0;
        return `
            <tr class="${isOff ? 'bg-slate-50 text-slate-400' : 'hover:bg-blue-50/50'} border-b border-slate-200 text-xs">
                <td class="py-2 px-3 border border-slate-200 font-bold text-slate-800">${paramNames[p]}</td>
                <td class="py-2 px-3 border border-slate-200 text-center font-bold">${isOff ? '<span class="text-slate-400 font-normal">OFF (0)</span>' : `Level ${lvl}`}</td>
                <td class="py-2 px-3 border border-slate-200 text-right font-mono font-extrabold ${isOff ? 'text-slate-400' : 'text-emerald-700'}">${pts} pt</td>
            </tr>
        `;
    }).join('');

    // Master 1 Table Rows
    const master1Rows = Object.keys(HYBRID_MASTER_WW).map(p => {
        const points = HYBRID_MASTER_WW[p];
        const currentLvl = res.pLevels[p];
        return `
            <tr class="border-b border-slate-200 text-xs text-center">
                <td class="py-2 px-2 border border-slate-200 font-bold text-left text-slate-800">${paramNames[p]}</td>
                ${points.map((pt, idx) => {
                    const lvlNum = idx + 1;
                    const isSelected = currentLvl === lvlNum;
                    if (pt === 0) return `<td class="py-2 px-1 border border-slate-200 text-slate-300">-</td>`;
                    return `<td class="py-2 px-1 border border-slate-200 font-mono ${isSelected ? 'bg-emerald-500 text-white font-extrabold shadow-sm' : 'text-slate-700'}">${pt}</td>`;
                }).join('')}
            </tr>
        `;
    }).join('');

    // Master 2 Table Rows
    const master2Rows = HYBRID_ZERO_GAP_BOUNDS.map(b => {
        const isCurrent = b.grade === res.gradeCode;
        return `
            <tr class="border-b border-slate-200 text-xs text-center ${isCurrent ? 'bg-purple-100 font-bold text-purple-950' : 'hover:bg-slate-50'}">
                <td class="py-2 px-3 border border-slate-200 font-extrabold text-left">${b.name}</td>
                <td class="py-2 px-3 border border-slate-200 font-mono">${b.rawMin} – ${b.rawMax} pt</td>
                <td class="py-2 px-3 border border-slate-200 font-mono text-purple-700 font-extrabold">${b.jvMin} – ${b.jvMax} Poin</td>
            </tr>
        `;
    }).join('');

    // Master 3 Table Rows
    const master3Rows = HYBRID_LMS_SUB_LEVELS.map(s => {
        const isCurrent = s.sub === res.subLevel;
        const adjFmt = s.adjustment > 0 ? `+${s.adjustment * 100}%` : s.adjustment < 0 ? `${s.adjustment * 100}%` : '0% (Ekuilibrium)';
        return `
            <tr class="border-b border-slate-200 text-xs text-center ${isCurrent ? 'bg-amber-100 font-bold text-amber-950' : 'hover:bg-slate-50'}">
                <td class="py-2 px-3 border border-slate-200 font-mono font-bold">${s.min.toFixed(2)} – ${s.max.toFixed(2)}</td>
                <td class="py-2 px-3 border border-slate-200 font-extrabold text-amber-800">Sub-Level ${s.sub}</td>
                <td class="py-2 px-3 border border-slate-200 text-left font-semibold text-slate-700">${s.desc}</td>
                <td class="py-2 px-3 border border-slate-200 font-mono font-bold ${s.adjustment > 0 ? 'text-emerald-700' : s.adjustment < 0 ? 'text-rose-700' : 'text-blue-700'}">${adjFmt}</td>
            </tr>
        `;
    }).join('');

    // Sub-Tab Navigation Header HTML
    const subNavHTML = `
        <div class="card mb-6">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div>
                    <div class="card-title text-base m-0">🏛️ Simulasi Kompensasi Hibrida Watson Wyatt PT Dasaria v1.0</div>
                    <div class="card-desc text-xs text-slate-500 m-0 mt-0.5">Framework 2D: Seat Value (Sumbu X WW Penentuan Grade) × Person Maturity (Sumbu Y LMS Penentuan Sub-Level & Gaji)</div>
                </div>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                <button type="button" onclick="setWatsonSubTab('master-data')" 
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${subTab === 'master-data' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                    📚 1. Master Data, Rumus & Alur Flow
                </button>
                <button type="button" onclick="setWatsonSubTab('seat-eval')" 
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${subTab === 'seat-eval' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                    🪑 2. Evaluasi Kursi (Penentuan Grade D1–D6)
                </button>
                <button type="button" onclick="setWatsonSubTab('person-maturity')" 
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${subTab === 'person-maturity' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                    👤 3. Asesmen Karyawan (Penentuan Sub-Level A–E & Gaji)
                </button>
                <button type="button" onclick="setWatsonSubTab('standard-matrix')" 
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${subTab === 'standard-matrix' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                    📊 4. Matriks Standar Hibrida (Sumbu X × Sumbu Y)
                </button>
            </div>
        </div>
    `;

    // 1. SUB-TAB: EVALUASI KURSI HIBRIDA (SUMBU X - 4 KNOB ROUTING & BOBOT SETUP)
    if (subTab === 'seat-eval') {
        const gradeMeta = getDynamicGradeMeta(res.gradeCode);

        let totalActiveWeight = 0;
        let lockedWeightSum = 0;
        WATSON_PARAM_KEYS.forEach(p => {
            if (gradeMeta.activeParams.includes(p.id)) {
                const w = gradeMeta.customWeights[p.id] !== undefined ? Number(gradeMeta.customWeights[p.id]) : (gradeMeta.defaultWeights[p.id] || 10);
                totalActiveWeight += w;
                const isLocked = !!(watsonSimState.lockedParamsMap?.[res.gradeCode]?.[p.id]);
                if (isLocked) lockedWeightSum += w;
            }
        });
        const unlockedWeightSum = totalActiveWeight - lockedWeightSum;

        let statusBadgeHTML = totalActiveWeight === 100 
            ? `<span class="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5"><span>✔️ Total Bobot: 100%</span> <span class="font-normal text-[10px] text-emerald-700">(Ideal / Pas)</span></span>`
            : `<span class="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5"><span>⚠️ Total Bobot: ${totalActiveWeight}%</span> <span class="font-bold text-[10px] text-amber-800">(Sisa Slot: +${100 - totalActiveWeight}%)</span></span>`;

        let paramCardsSetupHTML = '';
        WATSON_PARAM_KEYS.forEach(p => {
            const isLocked = !!(watsonSimState.lockedParamsMap?.[res.gradeCode]?.[p.id]);
            const isParamActive = gradeMeta.activeParams.includes(p.id);
            const customWeight = gradeMeta.customWeights[p.id] !== undefined ? gradeMeta.customWeights[p.id] : (gradeMeta.defaultWeights[p.id] || (isParamActive ? 10 : 5));
            const tier = gradeMeta.paramTiers[p.id] || (isParamActive ? 'Secondary' : 'Optional');

            const tierBadgeClass = tier === 'Primary' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                   tier === 'Secondary' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                   'bg-purple-100 text-purple-800 border-purple-300';

            const pCodeMap = { knowledge: 'P1', experience: 'P2', scope: 'P3', decision: 'P4', consequence: 'P5', intContact: 'P6', extContact: 'P7', research: 'P8', supervision: 'P9', headcount: 'P10' };
            const pCode = pCodeMap[p.id];
            const lvlVal = res.pLevels[pCode] || 0;
            const ptsVal = res.pPoints[pCode] || 0;

            paramCardsSetupHTML += `
                <div class="p-3 border rounded-xl space-y-2 transition-all ${isParamActive ? 'border-blue-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-100/50 opacity-60'}">
                    <div class="flex flex-wrap justify-between items-center gap-2">
                        <div class="flex items-center gap-2">
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" ${isParamActive ? 'checked' : ''} 
                                    onchange="onWatsonParamToggle('${p.id}', this.checked)"
                                    class="sr-only peer">
                                <div class="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            <span class="text-xs font-bold ${isParamActive ? 'text-slate-800' : 'text-slate-500 line-through'}">${p.name} <span class="text-[10px] font-semibold text-blue-600">(${pCode})</span></span>
                        </div>

                        <!-- TIER SELECTOR, LOCK TOGGLE & EDITABLE WEIGHT -->
                        <div class="flex items-center gap-1.5">
                            <select class="select-field text-[10px] font-bold py-0.5 px-1.5 rounded border ${tierBadgeClass}" 
                                onchange="onWatsonTierChange('${p.id}', this.value)" ${isParamActive ? '' : 'disabled'}>
                                <option value="Primary" ${tier === 'Primary' ? 'selected' : ''}>Primary (Utama)</option>
                                <option value="Secondary" ${tier === 'Secondary' ? 'selected' : ''}>Secondary (Pendukung)</option>
                                <option value="Optional" ${tier === 'Optional' ? 'selected' : ''}>Optional (Opsional)</option>
                            </select>

                            <button type="button"
                                onclick="onWatsonLockToggle('${p.id}')"
                                title="${isLocked ? 'Parameter terkunci (🔒). Bobot tidak akan berubah otomatis.' : 'Parameter terbuka (🔓). Klik untuk mengunci bobot.'}"
                                class="px-1.5 py-0.5 text-xs font-bold rounded border transition-all ${isLocked ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'}"
                                ${isParamActive ? '' : 'disabled'}>
                                ${isLocked ? '🔒' : '🔓'}
                            </button>

                            <div class="flex items-center gap-1 bg-white border border-blue-300 rounded px-1.5 py-0.5">
                                <span class="text-[10px] font-bold text-slate-400">Bobot:</span>
                                <input type="number" min="0" max="100" step="1" value="${customWeight}"
                                    data-weight-param="${p.id}"
                                    class="w-10 text-xs font-extrabold text-blue-900 text-center border-none p-0 focus:outline-none"
                                    ${isParamActive ? '' : 'disabled'}
                                    oninput="onWatsonWeightChange('${p.id}', this.value, this)">
                                <span class="text-[10px] font-bold text-slate-500">%</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                        <span class="text-[11px] font-semibold text-slate-600">Level Ter-routing: <strong class="text-blue-900">${lvlVal > 0 ? 'Level ' + lvlVal : 'OFF (0)'}</strong></span>
                        <span class="text-xs font-extrabold text-emerald-700 font-mono">${ptsVal} pt</span>
                    </div>
                </div>
            `;
        });

        const paramCategories = {
            P1: { group: '📐 Fungsional', key: 'knowledge' },
            P2: { group: '📐 Fungsional', key: 'experience' },
            P3: { group: '👔 Manajerial', key: 'scope' },
            P4: { group: '👔 Manajerial', key: 'decision' },
            P5: { group: '🛡️ Core Mandatory', key: 'consequence' },
            P6: { group: '🛡️ Core Mandatory', key: 'intContact' },
            P7: { group: '📐 Fungsional', key: 'extContact' },
            P8: { group: '📐 Fungsional', key: 'research' },
            P9: { group: '👔 Manajerial', key: 'supervision' },
            P10: { group: '👔 Manajerial', key: 'headcount' }
        };

        const detailedRoutingRows = Object.keys(res.pLevels).map(p => {
            const lvl = res.pLevels[p];
            const pts = res.pPoints[p];
            const isOff = lvl === 0;
            const catInfo = paramCategories[p];
            const paramKey = catInfo.key;

            const isParamActive = gradeMeta.activeParams.includes(paramKey);
            const w = isParamActive ? (gradeMeta.weights[paramKey] || 0) : 0;
            const ptW = res.pWeightedPoints[p] || 0;
            const tier = gradeMeta.paramTiers[paramKey] || (isParamActive ? 'Secondary' : 'Optional');

            const tierBadgeClass = tier === 'Primary' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                   tier === 'Secondary' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                   'bg-purple-100 text-purple-800 border-purple-300';

            return `
                <tr class="${isOff ? 'bg-slate-50 text-slate-400' : 'hover:bg-blue-50/50'} border-b border-slate-200 text-xs">
                    <td class="py-2 px-3 border border-slate-200 font-bold text-slate-800">${paramNames[p]}</td>
                    <td class="py-2 px-2 border border-slate-200 font-semibold text-slate-600">${catInfo.group}</td>
                    <td class="py-2 px-2 border border-slate-200 text-center font-bold">${isOff ? '<span class="text-slate-400 font-normal">OFF (0)</span>' : `Level ${lvl}`}</td>
                    <td class="py-2 px-2 border border-slate-200 text-right font-mono font-bold ${isOff ? 'text-slate-400' : 'text-slate-700'}">${pts} pt</td>
                    <td class="py-2 px-2 border border-slate-200 text-center"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold border ${tierBadgeClass}">${tier}</span></td>
                    <td class="py-2 px-2 border border-slate-200 text-center font-mono font-bold text-blue-800">${w}%</td>
                    <td class="py-2 px-2 border border-slate-200 text-right font-mono font-extrabold ${isOff ? 'text-slate-400' : 'text-emerald-700'}">${ptW.toFixed(2)} pt</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            ${subNavHTML}

            <!-- SUMBU X: CONTROLLER & SETUP BOBOT -->
            <div class="card mb-6 border-blue-200 bg-blue-50/20">
                <div class="card-title text-sm text-blue-900 mb-1">🪑 Sumbu X: Evaluasi Kursi (Seat Value WW)</div>
                <div class="card-desc text-xs text-slate-500 mb-4">Input 4 Knob & Rumpun Jabatan untuk auto-routing P1–P10. Pilih Rumpun untuk mengunci parameter agar tidak ambigu/overlap.</div>

                <div class="space-y-4 text-xs mb-4">
                    <!-- Rumpun Jabatan -->
                    <div>
                        <label class="block font-bold text-slate-700 mb-1">Rumpun Jabatan (Deskripsi Wewenang Pekerjaan - DWP):</label>
                        <div class="grid grid-cols-3 gap-2">
                            <label class="flex items-center justify-center gap-2 p-2 rounded border cursor-pointer text-center ${res.rumpun === 'O' ? 'bg-blue-600 text-white font-bold border-blue-700' : 'bg-white text-slate-700 border-slate-300'}">
                                <input type="radio" name="hybrid-rumpun" value="O" ${res.rumpun === 'O' ? 'checked' : ''} onchange="onHybridParamChange('rumpun', this.value)" class="sr-only">
                                <span>🛠️ Operasional (O)</span>
                            </label>
                            <label class="flex items-center justify-center gap-2 p-2 rounded border cursor-pointer text-center ${res.rumpun === 'F' ? 'bg-blue-600 text-white font-bold border-blue-700' : 'bg-white text-slate-700 border-slate-300'}">
                                <input type="radio" name="hybrid-rumpun" value="F" ${res.rumpun === 'F' ? 'checked' : ''} onchange="onHybridParamChange('rumpun', this.value)" class="sr-only">
                                <span>📐 Fungsional (F)</span>
                            </label>
                            <label class="flex items-center justify-center gap-2 p-2 rounded border cursor-pointer text-center ${res.rumpun === 'M' ? 'bg-blue-600 text-white font-bold border-blue-700' : 'bg-white text-slate-700 border-slate-300'}">
                                <input type="radio" name="hybrid-rumpun" value="M" ${res.rumpun === 'M' ? 'checked' : ''} onchange="onHybridParamChange('rumpun', this.value)" class="sr-only">
                                <span>👔 Manajerial (M)</span>
                            </label>
                        </div>
                    </div>

                    <!-- 3 Level Knobs -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="bg-white p-2.5 rounded border border-slate-200">
                            <label class="block font-bold text-slate-700 mb-1">Level Core (P5, P6):</label>
                            <div class="flex items-center gap-2">
                                <input type="range" min="1" max="5" value="${res.lCore}" oninput="onHybridParamChange('lCore', this.value)" class="w-full h-2 bg-blue-200 rounded accent-blue-600">
                                <span class="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">L${res.lCore}</span>
                            </div>
                        </div>
                        <div class="bg-white p-2.5 rounded border border-slate-200">
                            <label class="block font-bold text-slate-700 mb-1">Level Functional (P1, P2, P7, P8):</label>
                            <div class="flex items-center gap-2">
                                <input type="range" min="1" max="5" value="${res.lFunct}" oninput="onHybridParamChange('lFunct', this.value)" class="w-full h-2 bg-blue-200 rounded accent-blue-600">
                                <span class="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">L${res.lFunct}</span>
                            </div>
                        </div>
                        <div class="bg-white p-2.5 rounded border border-slate-200">
                            <label class="block font-bold text-slate-700 mb-1">Level Managerial (P3, P4, P9):</label>
                            <div class="flex items-center gap-2">
                                <input type="range" min="1" max="5" value="${res.lMgt}" oninput="onHybridParamChange('lMgt', this.value)" class="w-full h-2 bg-blue-200 rounded accent-blue-600">
                                <span class="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded text-xs">L${res.lMgt}</span>
                            </div>
                        </div>
                    </div>

                    <!-- P10 Manual & Executive Checkbox -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div class="bg-white p-2.5 rounded border border-slate-200">
                            <label class="block font-bold text-slate-700 mb-1">P10: Jumlah Diawasi (Manajerial):</label>
                            <select onchange="onHybridParamChange('lP10Manual', this.value)" class="select-field text-xs font-bold text-slate-800 w-full" ${res.rumpun === 'M' ? '' : 'disabled'}>
                                <option value="1" ${res.lP10Manual === 1 ? 'selected' : ''}>Level 1: 0 Orang (6 pt)</option>
                                <option value="2" ${res.lP10Manual === 2 ? 'selected' : ''}>Level 2: 1-4 Orang (8 pt)</option>
                                <option value="3" ${res.lP10Manual === 3 ? 'selected' : ''}>Level 3: 5-10 Orang (12 pt)</option>
                                <option value="4" ${res.lP10Manual === 4 ? 'selected' : ''}>Level 4: 11-30 Orang (16 pt)</option>
                                <option value="5" ${res.lP10Manual === 5 ? 'selected' : ''}>Level 5: 31-50 Orang (22 pt)</option>
                                <option value="6" ${res.lP10Manual === 6 ? 'selected' : ''}>Level 6: 51-100 Orang (31 pt)</option>
                                <option value="7" ${res.lP10Manual === 7 ? 'selected' : ''}>Level 7: 101-500 Orang (43 pt)</option>
                                <option value="8" ${res.lP10Manual === 8 ? 'selected' : ''}>Level 8: >500 Orang (60 pt)</option>
                            </select>
                        </div>
                        <div class="bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between">
                            <div>
                                <span class="block font-bold text-slate-800">Executive / D6 Flag:</span>
                                <span class="text-[10px] text-slate-500 block">Scale Compression ke Level 6 WW</span>
                            </div>
                            <input type="checkbox" ${res.isExec ? 'checked' : ''} onchange="onHybridParamChange('isExecutive', this.checked)" class="w-4 h-4 text-purple-600 rounded">
                        </div>
                    </div>
                </div>
            </div>

            <!-- SETUP TIER & BOBOT ASESMEN PER PARAMETER -->
            <div class="card mb-6">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div class="flex flex-wrap items-center gap-3">
                        <span class="card-title text-sm m-0">⚙️ Setup Tier (Primary/Secondary/Optional) & Bobot (%) Kursi ${res.gradeName}</span>
                        ${statusBadgeHTML}
                    </div>
                    <span class="text-[11px] font-semibold text-slate-500">🔒 Terkunci: ${lockedWeightSum}% &bull; 🔓 Terbuka: ${unlockedWeightSum}%</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    ${paramCardsSetupHTML}
                </div>
            </div>

            <!-- RESULT STAT CARDS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="card border-blue-200 bg-blue-50/40">
                    <div class="stat-value text-blue-800">${res.totalRawPoints} <span class="text-xs font-semibold text-blue-600">pt</span></div>
                    <div class="stat-label">Total Poin Mentah Watson Wyatt</div>
                    <div class="text-[10px] text-slate-500 mt-1">Sum(P1..P10 Poin Inherent)</div>
                </div>
                <div class="card border-purple-200 bg-purple-50/40">
                    <div class="stat-value text-purple-900">${res.gradeCode}</div>
                    <div class="stat-label">Grade Kursi Jabatan (Seat Grade)</div>
                    <div class="text-[10px] text-slate-500 mt-1">Zero Gap Bounds: ${res.rawMin}–${res.rawMax} pt</div>
                </div>
                <div class="card border-emerald-200 bg-emerald-50/40">
                    <div class="stat-value text-emerald-800">${res.baseJV} <span class="text-xs font-semibold text-emerald-600">Poin</span></div>
                    <div class="stat-label">Base JV Kursi (Sub-C Equilibrium)</div>
                    <div class="text-[10px] text-slate-500 mt-1">Linear Interpolation Kursi (${res.jvMin}–${res.jvMax} Poin)</div>
                </div>
            </div>

            <!-- DETAILED ROUTING & BOBOT TABLE -->
            <div class="card mb-6">
                <div class="card-title text-sm mb-2">📋 Matriks Skenario 2: Asesmen Rating Terbobot (Pre-Weighted Likert Mapping)</div>
                <div class="card-desc text-xs text-slate-500 mb-3">Tabel rincian evaluasi 10 parameter Watson Wyatt yang mengalikan Poin Mentah Level dengan Persentase Bobot (%) (Poin Terbobot = Poin × Bobot %).</div>
                <div class="sim-table-wrap border border-slate-200 max-h-[400px]">
                    <table class="w-full border-collapse text-xs text-left">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold text-[10px] text-center">
                                <th class="py-2.5 px-3 border border-slate-700 text-left bg-slate-900">Parameter WW</th>
                                <th class="py-2.5 px-2 border border-slate-700 text-left">Kelompok / Core</th>
                                <th class="py-2.5 px-2 border border-slate-700">Level Terpilih</th>
                                <th class="py-2.5 px-2 border border-slate-700 text-right">Poin Mentah WW</th>
                                <th class="py-2.5 px-2 border border-slate-700">Tier Prioritas</th>
                                <th class="py-2.5 px-2 border border-slate-700">Bobot (%)</th>
                                <th class="py-2.5 px-2 border border-slate-700 text-right bg-emerald-900">Poin Terbobot WW</th>
                            </tr>
                        </thead>
                        <tbody>${detailedRoutingRows}</tbody>
                    </table>
                </div>
            </div>
        `;
        return;
    }

    // 2. SUB-TAB: ASESMEN KARYAWAN (SUMBU Y - LMS KSAO & PAYROLL CONNECTION)
    if (subTab === 'person-maturity') {
        const salaryMatrixRows = res.subSalaryMatrix.map(sm => `
            <tr class="border-b border-slate-200 text-xs text-center ${sm.isCurrent ? 'bg-amber-100 font-extrabold text-amber-950 ring-2 ring-amber-400' : 'hover:bg-slate-50'}">
                <td class="py-2.5 px-3 border border-slate-200 font-extrabold text-amber-800">Sub-Level ${sm.sub} ${sm.isCurrent ? '👈 (Aktif)' : ''}</td>
                <td class="py-2.5 px-3 border border-slate-200 text-left text-slate-700">${sm.desc}</td>
                <td class="py-2.5 px-3 border border-slate-200 font-mono font-bold text-purple-800">${sm.subJV} Poin</td>
                <td class="py-2.5 px-3 border border-slate-200 font-mono font-bold text-blue-700 bg-blue-50/50">${formatCurrency(sm.subTHPMin)} – ${formatCurrency(sm.subTHPMax)}</td>
                <td class="py-2.5 px-3 border border-slate-200 font-mono font-semibold text-emerald-800">${formatCurrency(sm.subGapok)}</td>
                <td class="py-2.5 px-3 border border-slate-200 font-mono text-slate-700">${formatCurrency(sm.subTT)}</td>
                <td class="py-2.5 px-3 border border-slate-200 font-mono text-amber-800">${formatCurrency(sm.subTTT)}</td>
            </tr>
        `).join('');

        container.innerHTML = `
            ${subNavHTML}

            <!-- 4 DIMENSI INSTRUMEN ASESMEN KSAO BY ASESOR / HR -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- INSTRUMEN UJI KSAO 4 DIMENSI -->
                <div class="card border-amber-200 bg-amber-50/20">
                    <div class="card-title text-sm text-amber-900 mb-1">📝 Instrumen Uji KSAO Karyawan (Sumbu Y - Asesor / HR)</div>
                    <div class="card-desc text-xs text-slate-500 mb-4">Pengujian 4 Dimensi Kompetensi Individu (Knowledge 25%, Skills 30%, Abilities 25%, Other Characteristics 20%).</div>

                    <div class="space-y-4 text-xs">
                        <!-- K - Knowledge -->
                        <div class="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1.5">
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-slate-800">1. Knowledge (Pengetahuan Teknis & SOP): <span class="text-[10px] text-amber-700">(Bobot 25%)</span></span>
                                <span class="font-mono font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">${res.ksaoK.toFixed(2)}</span>
                            </div>
                            <input type="range" min="1.00" max="5.00" step="0.05" value="${res.ksaoK}" oninput="onHybridParamChange('ksaoK', this.value)" class="w-full h-2 bg-amber-200 rounded appearance-none cursor-pointer accent-amber-600">
                            <div class="text-[10px] text-slate-500">Keahlian teoretis, sertifikasi teknis, & pemahaman SOP operasional.</div>
                        </div>

                        <!-- S - Skills -->
                        <div class="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1.5">
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-slate-800">2. Skills (Keterampilan Praktis & Eksekusi): <span class="text-[10px] text-amber-700">(Bobot 30%)</span></span>
                                <span class="font-mono font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">${res.ksaoS.toFixed(2)}</span>
                            </div>
                            <input type="range" min="1.00" max="5.00" step="0.05" value="${res.ksaoS}" oninput="onHybridParamChange('ksaoS', this.value)" class="w-full h-2 bg-amber-200 rounded appearance-none cursor-pointer accent-amber-600">
                            <div class="text-[10px] text-slate-500">Kecepatan kerja, akurasi hasil, & efisiensi penggunaan instrumen/tools.</div>
                        </div>

                        <!-- A - Abilities -->
                        <div class="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1.5">
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-slate-800">3. Abilities (Kemampuan Analisis & Problem Solving): <span class="text-[10px] text-amber-700">(Bobot 25%)</span></span>
                                <span class="font-mono font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">${res.ksaoA.toFixed(2)}</span>
                            </div>
                            <input type="range" min="1.00" max="5.00" step="0.05" value="${res.ksaoA}" oninput="onHybridParamChange('ksaoA', this.value)" class="w-full h-2 bg-amber-200 rounded appearance-none cursor-pointer accent-amber-600">
                            <div class="text-[10px] text-slate-500">Daya nalar, pemecahan masalah kendala kerja, & komunikasi efektif.</div>
                        </div>

                        <!-- O - Other Characteristics -->
                        <div class="bg-white p-3.5 rounded-xl border border-amber-200 space-y-1.5">
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-slate-800">4. Other Characteristics (Sikap & Adaptabilitas): <span class="text-[10px] text-amber-700">(Bobot 20%)</span></span>
                                <span class="font-mono font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">${res.ksaoO.toFixed(2)}</span>
                            </div>
                            <input type="range" min="1.00" max="5.00" step="0.05" value="${res.ksaoO}" oninput="onHybridParamChange('ksaoO', this.value)" class="w-full h-2 bg-amber-200 rounded appearance-none cursor-pointer accent-amber-600">
                            <div class="text-[10px] text-slate-500">Kedisiplinan, kerja sama tim, integritas, & ketahanan kerja di bawah tekanan.</div>
                        </div>
                    </div>
                </div>

                <!-- SCORE KSAO SUMMARY & PAYROLL IMPACT -->
                <div class="space-y-4">
                    <!-- KSAO SUMMARY CARD -->
                    <div class="card border-amber-300 bg-amber-50/40">
                        <div class="card-title text-sm text-amber-900 mb-2">⭐ Hasil Skor KSAO Terbobot & Sub-Level</div>
                        <div class="flex justify-between items-center my-2 p-3 bg-white rounded-xl border border-amber-200">
                            <div>
                                <span class="text-xs text-slate-500 font-bold uppercase tracking-wider block">Skor KSAO Terbobot</span>
                                <span class="text-2xl font-extrabold text-amber-800 font-mono">${res.skorKSAO.toFixed(2)} / 5.00</span>
                            </div>
                            <div class="text-right">
                                <span class="px-3 py-1 text-sm font-extrabold rounded-lg bg-amber-500 text-white shadow">Sub-Level ${res.subLevel}</span>
                                <span class="text-[10px] text-slate-600 block mt-1 font-semibold">${res.subDesc}</span>
                            </div>
                        </div>
                        <div class="p-2.5 bg-amber-100/50 rounded-lg text-xs text-amber-900 font-mono">
                            Penyesuaian Nilai Kursi Base JV (${res.baseJV} pt): <strong class="${res.adjustmentPct > 0 ? 'text-emerald-700' : res.adjustmentPct < 0 ? 'text-rose-700' : 'text-blue-700'}">${res.adjustmentPct > 0 ? '+' : ''}${res.adjustmentPct}%</strong> → Final JV: <strong>${res.finalJV} Poin</strong>.
                        </div>
                    </div>

                    <!-- PAYROLL IMPACT CARD -->
                    <div class="card border-emerald-300 bg-emerald-50/40">
                        <div class="card-title text-sm text-emerald-900 mb-2">💵 Koneksi ke Penggajian Karyawan (${selectedUMK}: ${formatCurrency(res.umkVal)})</div>
                        <div class="grid grid-cols-2 gap-3 my-2">
                            <div class="p-3 bg-white rounded-xl border border-emerald-200">
                                <span class="text-[10px] font-bold text-slate-500 uppercase block">Paket THP Karyawan</span>
                                <span class="text-lg font-extrabold text-blue-700 font-mono">${formatCurrency(res.thpPaket)}</span>
                            </div>
                            <div class="p-3 bg-white rounded-xl border border-emerald-200">
                                <span class="text-[10px] font-bold text-slate-500 uppercase block">Gaji Pokok (75% Paket)</span>
                                <span class="text-lg font-extrabold text-emerald-800 font-mono">${formatCurrency(res.gapok)}</span>
                            </div>
                            <div class="p-3 bg-white rounded-xl border border-emerald-200">
                                <span class="text-[10px] font-bold text-slate-500 uppercase block">Tunjangan Tetap (TT)</span>
                                <span class="text-base font-extrabold text-slate-700 font-mono">${formatCurrency(res.tt)}</span>
                            </div>
                            <div class="p-3 bg-white rounded-xl border border-emerald-200">
                                <span class="text-[10px] font-bold text-slate-500 uppercase block">Tunj. Tidak Tetap (TTT)</span>
                                <span class="text-base font-extrabold text-amber-800 font-mono">${formatCurrency(res.ttt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PROGRESI SUB-LEVEL & RINCIAN GAJI PADA GRADE TERPILIH -->
            <div class="card">
                <div class="card-title text-sm mb-2">📊 Matriks Progresi Sub-Level (A–E) & Gaji pada ${res.gradeName}</div>
                <div class="card-desc text-xs text-slate-500 mb-3">Tabel proyeksi rentang nominal gaji (Min – Max) untuk 5 Sub-Level pada Grade ${res.gradeCode} berdasarkan UMK ${selectedUMK} (${formatCurrency(res.umkVal)}).</div>
                <div class="sim-table-wrap border border-slate-200">
                    <table class="w-full border-collapse text-xs text-center">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold text-[10px]">
                                <th class="py-2.5 px-3 border border-slate-700">Sub-Level</th>
                                <th class="py-2.5 px-3 border border-slate-700 text-left">Definisi Operasional HR</th>
                                <th class="py-2.5 px-3 border border-slate-700">Target JV</th>
                                <th class="py-2.5 px-3 border border-slate-700 bg-blue-900">Rentang THP Paket (Min – Max)</th>
                                <th class="py-2.5 px-3 border border-slate-700">Gaji Pokok (Rp)</th>
                                <th class="py-2.5 px-3 border border-slate-700">T. Tetap (Rp)</th>
                                <th class="py-2.5 px-3 border border-slate-700">T. Tidak Tetap (Rp)</th>
                            </tr>
                        </thead>
                        <tbody>${salaryMatrixRows}</tbody>
                    </table>
                </div>
            </div>
        `;
        return;
    }

    // 4. SUB-TAB: MATRIKS STANDAR HIBRIDA (SUMBU X x SUMBU Y - TABEL GABUNGAN)
    if (subTab === 'standard-matrix') {
        const umkVal = (typeof getActiveUmk === 'function') ? getActiveUmk() : 3000000;
        const rk = v => Math.round(v / 1000) * 1000;

        const subKeys = ['A', 'B', 'C', 'D', 'E'];
        const C = (typeof approachBaruParams !== 'undefined' && approachBaruParams.plafon) ? approachBaruParams.plafon : 15000000;
        const sp = (typeof approachBaruParams !== 'undefined' && approachBaruParams.sigmaPct) ? approachBaruParams.sigmaPct : 85;
        const gp = (typeof approachBaruParams !== 'undefined' && approachBaruParams.gapPct) ? approachBaruParams.gapPct : 2;
        const modelType = (typeof approachBaruParams !== 'undefined' && approachBaruParams.modelType) ? approachBaruParams.modelType : 'squeeze';

        let dStack = (typeof deriveGradeStack === 'function') ? deriveGradeStack(umkVal, C, sp, gp) : null;

        const fullMatrixRows = (dStack && dStack.grades) ? dStack.grades.map(gr => {
            const isCurrentGrade = gr.label === res.gradeCode;
            const boundCode = gr.label.split('-')[0];
            const boundItem = HYBRID_ZERO_GAP_BOUNDS.find(b => b.grade === boundCode) || HYBRID_ZERO_GAP_BOUNDS[0];

            const jvStep = (boundItem.jvMax - boundItem.jvMin) / 5;

            const cells = gr.subs.map((sub, k) => {
                const subCode = subKeys[k];
                const minComps = (typeof calcBaruCellComponents === 'function')
                    ? calcBaruCellComponents(sub.rp, k, modelType, approachBaruParams, subCode, gr.label)
                    : { thp: sub.rp };

                const nextRp = (k < 4 && gr.subs[k + 1]) ? gr.subs[k + 1].rp : rk(gr.max);
                const maxComps = (typeof calcBaruCellComponents === 'function')
                    ? calcBaruCellComponents(nextRp, Math.min(4, k + 1), modelType, approachBaruParams, subKeys[Math.min(4, k + 1)], gr.label)
                    : { thp: nextRp };

                const minThpVal = minComps.thp;
                const maxThpVal = Math.max(minThpVal, maxComps.thp);

                const subJvMin = Math.round(boundItem.jvMin + k * jvStep);
                const subJvMax = (k === 4) ? boundItem.jvMax : Math.round(boundItem.jvMin + (k + 1) * jvStep);

                const isCurrentActiveCell = isCurrentGrade && subCode === res.subLevel;

                return `
                    <td class="py-2.5 px-3 border border-slate-200 ${isCurrentActiveCell ? 'bg-amber-300 font-extrabold text-amber-950 ring-2 ring-amber-500 shadow-md' : isCurrentGrade ? 'bg-blue-50/70 font-bold' : ''}">
                        <div class="font-bold text-xs ${isCurrentActiveCell ? 'text-amber-950 text-sm' : 'text-slate-900'}">${formatCurrency(minThpVal)} – ${formatCurrency(maxThpVal)}</div>
                        <div class="text-[10px] ${isCurrentActiveCell ? 'text-amber-900 font-extrabold' : 'text-purple-700 font-semibold'}">${subJvMin}–${subJvMax} pt</div>
                    </td>
                `;
            }).join('');

            return `
                <tr class="border-b border-slate-200 text-xs text-center ${isCurrentGrade ? 'bg-blue-50/30' : 'hover:bg-slate-50'}">
                    <td class="py-2.5 px-3 border border-slate-200 font-extrabold text-slate-900 text-left bg-slate-50 whitespace-nowrap">${gr.name}</td>
                    <td class="py-2.5 px-2 border border-slate-200 font-mono font-bold text-purple-800 bg-purple-50/30">${formatCurrency(gr.subs[2].rp)}</td>
                    ${cells}
                </tr>
            `;
        }).join('') : '';

        container.innerHTML = `
            ${subNavHTML}

            <!-- RINGKASAN POSISI KARYAWAN AKTIF -->
            <div class="card border-emerald-300 bg-emerald-50/30 mb-6">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div class="card-title text-sm text-emerald-900 m-0">🎯 Posisi Karyawan & Hasil Uji Gabungan (Sumbu X × Sumbu Y)</div>
                        <div class="text-xs text-slate-600 mt-1">
                            Evaluasi Kursi (Sumbu X): <strong class="text-purple-800">${res.gradeName} (${res.totalRawPoints} pt WW)</strong> &bull; 
                            Asesmen LMS (Sumbu Y): <strong class="text-amber-800">Sub-Level ${res.subLevel} (${res.subDesc})</strong>
                        </div>
                    </div>
                    <div class="text-right bg-white p-3 rounded-xl border border-emerald-300 shadow-sm">
                        <span class="text-[10px] font-bold text-slate-500 uppercase block">Total Paket THP Karyawan</span>
                        <span class="text-xl font-extrabold text-blue-700 font-mono">${formatCurrency(res.thpPaket)}</span>
                        <span class="text-[10px] font-bold text-slate-500 block">UMK ${selectedUMK}: ${formatCurrency(res.umkVal)}</span>
                    </div>
                </div>
            </div>

            <!-- TABEL STANDAR MATRIKS GABUNGAN 6 GRADE x 5 SUB-LEVEL -->
            <div class="card mb-6">
                <div class="card-title text-sm mb-2">📊 Tabel Standar Matriks Kompensasi Hibrida (6 Grade × 5 Sub-Level)</div>
                <div class="card-desc text-xs text-slate-500 mb-3">Tabel acuan resmi gabungan Sumbu X (Kursi Grade D1–D6) dan Sumbu Y (Karyawan Sub-Level A–E). Setiap sel menampilkan THP Paket (Rp) dan Target Job Value (Poin). Posisi karyawan aktif ditandai highlight emas.</div>
                
                <div class="sim-table-wrap border border-slate-300 overflow-x-auto">
                    <table class="w-full border-collapse border border-slate-300 text-center text-xs">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold text-[10px]">
                                <th class="py-3 px-3 border border-slate-700 text-left bg-slate-900">Grade Jabatan (Sumbu X)</th>
                                <th class="py-3 px-2 border border-slate-700 bg-purple-900">Base JV (Sub-C)</th>
                                <th class="py-3 px-3 border border-slate-700">Sub A (Trainee -15%)</th>
                                <th class="py-3 px-3 border border-slate-700">Sub B (Developing -7.5%)</th>
                                <th class="py-3 px-3 border border-slate-700 bg-blue-900">Sub C (Equilibrium 0%)</th>
                                <th class="py-3 px-3 border border-slate-700">Sub D (Advanced +7.5%)</th>
                                <th class="py-3 px-3 border border-slate-700 bg-emerald-900">Sub E (Mastery +15%)</th>
                            </tr>
                        </thead>
                        <tbody>${fullMatrixRows}</tbody>
                    </table>
                </div>
            </div>
        `;
        return;
    }

    // 4. SUB-TAB: MASTER DATA, RUMUS & ALUR FLOW (TAB REFERENSI)
    if (subTab === 'master-data') {
        container.innerHTML = `
            ${subNavHTML}

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <!-- MASTER DATA 1: KAMUS POIN WW -->
                <div class="card lg:col-span-2">
                    <div class="card-title text-sm mb-2">📚 Master Database 1: Kamus Poin Watson Wyatt</div>
                    <div class="card-desc text-xs text-slate-500 mb-3">Tabel referensi poin inherent P1–P10 untuk Level 1–8 di instrumen Watson Wyatt.</div>
                    <div class="sim-table-wrap border border-slate-200 max-h-[400px]">
                        <table class="w-full border-collapse text-xs text-center">
                            <thead>
                                <tr class="bg-slate-800 text-white font-bold text-[10px]">
                                    <th class="py-2 px-2 border border-slate-700 text-left bg-slate-900">Parameter WW</th>
                                    <th class="py-2 px-1 border border-slate-700">L1</th>
                                    <th class="py-2 px-1 border border-slate-700">L2</th>
                                    <th class="py-2 px-1 border border-slate-700">L3</th>
                                    <th class="py-2 px-1 border border-slate-700">L4</th>
                                    <th class="py-2 px-1 border border-slate-700">L5</th>
                                    <th class="py-2 px-1 border border-slate-700">L6</th>
                                    <th class="py-2 px-1 border border-slate-700">L7</th>
                                    <th class="py-2 px-1 border border-slate-700">L8</th>
                                </tr>
                            </thead>
                            <tbody>${master1Rows}</tbody>
                        </table>
                    </div>
                </div>

                <div class="space-y-6 lg:col-span-1">
                    <!-- MASTER DATA 2: ZERO GAP BOUNDS -->
                    <div class="card">
                        <div class="card-title text-sm mb-2">📐 Master Database 2: Zero Gap Bounds</div>
                        <div class="sim-table-wrap border border-slate-200">
                            <table class="w-full border-collapse text-xs text-center">
                                <thead>
                                    <tr class="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                                        <th class="py-2 px-3 border border-slate-200 text-left">Grade</th>
                                        <th class="py-2 px-3 border border-slate-200">Poin Mentah WW</th>
                                        <th class="py-2 px-3 border border-slate-200">Rentang JV</th>
                                    </tr>
                                </thead>
                                <tbody>${master2Rows}</tbody>
                            </table>
                        </div>
                    </div>

                    <!-- MASTER DATA 3: SUB-LEVEL LMS KSAO -->
                    <div class="card">
                        <div class="card-title text-sm mb-2">⭐ Master Database 3: Sub-Level Kematangan LMS</div>
                        <div class="sim-table-wrap border border-slate-200">
                            <table class="w-full border-collapse text-xs text-center">
                                <thead>
                                    <tr class="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                                        <th class="py-2 px-3 border border-slate-200">Skor LMS</th>
                                        <th class="py-2 px-3 border border-slate-200">Sub</th>
                                        <th class="py-2 px-3 border border-slate-200 text-left">Definisi HR</th>
                                        <th class="py-2 px-3 border border-slate-200">Penyesuaian</th>
                                    </tr>
                                </thead>
                                <tbody>${master3Rows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- KUMPULAN RUMUS & FORMULASI PERHITUNGAN -->
            <div class="card mb-6 border-blue-200 bg-blue-50/20">
                <div class="card-title text-sm text-blue-900 mb-2">💡 Kumpulan Rumus & Formulasi Backend Hibrida PT Dasaria v1.0</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div class="p-3.5 bg-white rounded-xl border border-blue-200 space-y-1.5">
                        <span class="font-bold text-blue-800 uppercase block font-sans">1. Formulasi Sumbu X (Seat Value WW)</span>
                        <div class="text-slate-800 font-bold">Total Poin Mentah WW = &Sigma;(Poin Level P1 s.d. P10)</div>
                        <div class="text-slate-600">Base JV (Sub-C) = JV_Min + [((Total Poin - Raw_Min)/(Raw_Max - Raw_Min)) &times; (JV_Max - JV_Min)]</div>
                    </div>
                    <div class="p-3.5 bg-white rounded-xl border border-amber-200 space-y-1.5">
                        <span class="font-bold text-amber-800 uppercase block font-sans">2. Formulasi Sumbu Y (Person Maturity LMS KSAO)</span>
                        <div class="text-slate-800 font-bold">Skor KSAO = (K &times; 25%) + (S &times; 30%) + (A &times; 25%) + (O &times; 20%)</div>
                        <div class="text-slate-600">Final JV = clamp(JV_Min, Base_JV + [Base_JV &times; Penyesuaian_SubLevel%], JV_Max)</div>
                    </div>
                    <div class="p-3.5 bg-white rounded-xl border border-emerald-200 space-y-1.5 md:col-span-2">
                        <span class="font-bold text-emerald-800 uppercase block font-sans">3. Formulasi Koneksi Penggajian (Payroll Connection)</span>
                        <div class="text-slate-800 font-bold">THP Paket (Rp) = round1000((Final JV / 100) &times; UMK Aktif)</div>
                        <div class="text-slate-600">Gaji Pokok = THP Paket &times; 75% | Tunjangan Tetap (TT) = THP Paket &times; 15% | TTT = THP - Gapok - TT</div>
                    </div>
                </div>
            </div>

            <!-- DIAGRAM ALUR FLOW PERHITUNGAN HULU KE HILIR -->
            <div class="card mb-6">
                <div class="card-title text-sm mb-2">🔄 Diagram Alur Perhitungan dari Hulu ke Hilir (Flowchart Step-by-Step)</div>
                <div class="card-desc text-xs text-slate-500 mb-4">Langkah-langkah operasional bagaimana data diproses dari input awal DWP & Asesmen KSAO hingga menghasilkan paket penggajian final.</div>
                
                <div class="flex flex-col items-center gap-0 text-xs my-4">
                    <div class="flow-box flow-input w-full max-w-xl text-center">
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">STEP 1 • INPUT DWP (SUMBU X)</div>
                        <div class="font-bold text-slate-900">Input Rumpun Jabatan (O/F/M) & 4 Level Knob</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Auto-routing P1–P10 ke Master Poin Watson Wyatt (Level 1–8)</div>
                    </div>
                    <div class="flow-arrow">&#11015;</div>
                    
                    <div class="flow-box flow-calc w-full max-w-xl text-center">
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">STEP 2 • SEAT EVALUATION (KURSI)</div>
                        <div class="font-bold text-blue-900">Hitung Total Poin Mentah WW & Base JV (Sub-C)</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Lookup Zero Gap Bounds (Grade D1–D6) & Linear Interpolation Kursi Murni</div>
                    </div>
                    <div class="flow-arrow">&#11015;</div>
                    
                    <div class="flow-box flow-process w-full max-w-xl text-center">
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">STEP 3 • ASESMEN LMS KSAO (SUMBU Y)</div>
                        <div class="font-bold text-amber-900">Uji 4 Dimensi KSAO Karyawan oleh Asesor / HR</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Knowledge (25%), Skills (30%), Abilities (25%), Other (20%) → Auto-assign Sub-Level A–E</div>
                    </div>
                    <div class="flow-arrow">&#11015;</div>
                    
                    <div class="flow-box flow-output w-full max-w-xl text-center">
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">STEP 4 • FINAL JOB VALUE (KARYAWAN)</div>
                        <div class="font-bold text-purple-900">Hitung Final JV = Base JV + Adjustment Sub-Level</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Sub-A (-15%), Sub-B (-7.5%), Sub-C (0%), Sub-D (+7.5%), Sub-E (+15%)</div>
                    </div>
                    <div class="flow-arrow">&#11015;</div>
                    
                    <div class="flow-box flow-output w-full max-w-xl text-center bg-emerald-50 border-emerald-300">
                        <div class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">STEP 5 • HASIL AKHIR PENGGAJIAN (PAYROLL)</div>
                        <div class="font-extrabold text-emerald-900 text-sm">Paket THP Rupiah = (Final JV / 100) × UMK Aktif</div>
                        <div class="text-[11px] text-emerald-700 mt-0.5 font-bold">Pecahan: Gaji Pokok (75%) + Tunjangan Tetap (15%) + Tunjangan Tidak Tetap</div>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    let totalActiveWeight = 0;
    let lockedWeightSum = 0;
    WATSON_PARAM_KEYS.forEach(p => {
        if (meta.activeParams.includes(p.id)) {
            const w = meta.customWeights[p.id] !== undefined ? Number(meta.customWeights[p.id]) : (meta.defaultWeights[p.id] || 10);
            totalActiveWeight += w;
            const isLocked = !!(watsonSimState.lockedParamsMap?.[watsonSimState.selectedGrade]?.[p.id]);
            if (isLocked) {
                lockedWeightSum += w;
            }
        }
    });
    const unlockedWeightSum = totalActiveWeight - lockedWeightSum;
    const slotDelta = 100 - totalActiveWeight;

    let statusBadgeHTML = '';
    if (totalActiveWeight === 100) {
        statusBadgeHTML = `<span class="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5"><span>✔️ Total Bobot: 100%</span> <span class="font-bold text-[11px] text-emerald-900">(${totalActiveWeight}% / 100%)</span> <span class="font-normal text-[10px] text-emerald-700">(Ideal / Pas)</span></span>`;
    } else if (totalActiveWeight < 100) {
        statusBadgeHTML = `<span class="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5"><span>⚠️ Total Bobot: ${totalActiveWeight}%</span> <span class="font-bold text-[11px] text-amber-900">(${totalActiveWeight}% / 100%)</span> <span class="font-bold text-[10px] text-amber-800">(Sisa Slot: +${100 - totalActiveWeight}%)</span></span>`;
    } else {
        statusBadgeHTML = `<span class="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5"><span>🚨 Total Bobot: ${totalActiveWeight}%</span> <span class="font-bold text-[11px] text-rose-900">(${totalActiveWeight}% / 100%)</span> <span class="font-bold text-[10px] text-rose-800">(Over: -${totalActiveWeight - 100}%)</span></span>`;
    }

    let paramCardsHTML = '';
    const isRawMode = watsonSimState.calcMode === 'raw';
    const activeRawLevels = watsonSimState.rawLevelsMap?.[watsonSimState.selectedGrade] || {};

    WATSON_PARAM_KEYS.forEach(p => {
        const isLocked = !!(watsonSimState.lockedParamsMap?.[watsonSimState.selectedGrade]?.[p.id]);
        const isActive = meta.activeParams.includes(p.id);
        const weight = isActive ? meta.weights[p.id] : 0;
        const customWeight = meta.customWeights[p.id] !== undefined ? meta.customWeights[p.id] : (meta.defaultWeights[p.id] || (isActive ? 10 : 5));
        const tier = meta.paramTiers[p.id] || (isActive ? 'Secondary' : 'Optional');

        const tierBadgeClass = tier === 'Primary' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                               tier === 'Secondary' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                               'bg-purple-100 text-purple-800 border-purple-300';

        const maxL = WATSON_RAW_LEVELS[p.id]?.maxLevel || 5;
        const rawVal = activeRawLevels[p.id] !== undefined ? activeRawLevels[p.id] : Math.min(3, maxL);
        const rawPts = WATSON_RAW_LEVELS[p.id]?.points[rawVal] || 10;
        const rawLabel = WATSON_RAW_LEVELS[p.id]?.labels[rawVal] || '';

        const rating = activeRatings[p.id] !== undefined ? activeRatings[p.id] : 3;

        paramCardsHTML += `
            <div class="p-3 border rounded-xl space-y-2.5 transition-all ${isActive ? (isRawMode ? 'border-purple-300 bg-purple-50/20' : 'border-blue-200 bg-blue-50/30') : 'border-slate-200 bg-slate-100/40 opacity-70'}">
                <div class="flex flex-wrap justify-between items-center gap-2">
                    <div class="flex items-center gap-2">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" ${isActive ? 'checked' : ''} 
                                onchange="onWatsonParamToggle('${p.id}', this.checked)"
                                class="sr-only peer">
                            <div class="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                        <span class="text-xs font-bold ${isActive ? 'text-slate-800' : 'text-slate-500 line-through'}">${p.name} <span class="text-[10px] font-normal text-slate-400">(${p.code})</span></span>
                    </div>

                    <!-- TIER SELECTOR, LOCK TOGGLE & EDITABLE WEIGHT -->
                    <div class="flex items-center gap-1.5">
                        <select class="select-field text-[10px] font-bold py-0.5 px-1.5 rounded border ${tierBadgeClass}" 
                            onchange="onWatsonTierChange('${p.id}', this.value)">
                            <option value="Primary" ${tier === 'Primary' ? 'selected' : ''}>Primary (Utama)</option>
                            <option value="Secondary" ${tier === 'Secondary' ? 'selected' : ''}>Secondary (Pendukung)</option>
                            <option value="Optional" ${tier === 'Optional' ? 'selected' : ''}>Optional (Opsional)</option>
                        </select>

                        <button type="button"
                            onclick="onWatsonLockToggle('${p.id}')"
                            title="${isLocked ? 'Parameter terkunci (🔒). Bobot tidak akan berubah otomatis.' : 'Parameter terbuka (🔓). Klik untuk mengunci bobot.'}"
                            class="px-1.5 py-0.5 text-xs font-bold rounded border transition-all ${isLocked ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'}"
                            ${isActive ? '' : 'disabled'}>
                            ${isLocked ? '🔒' : '🔓'}
                        </button>

                        <div class="flex items-center gap-1 bg-white border border-blue-300 rounded px-1.5 py-0.5">
                            <span class="text-[10px] font-bold text-slate-400">Bobot:</span>
                            <input type="number" min="0" max="100" step="1" value="${customWeight}"
                                data-weight-param="${p.id}"
                                class="w-10 text-xs font-extrabold text-blue-900 text-center border-none p-0 focus:outline-none"
                                ${isActive ? '' : 'disabled'}
                                oninput="onWatsonWeightChange('${p.id}', this.value, this)">
                            <span class="text-[10px] font-bold text-slate-500">%</span>
                        </div>
                    </div>
                </div>

                ${isActive ? (isRawMode ? `
                    <div class="flex items-center gap-3 pt-1">
                        <input type="range" min="1" max="${maxL}" step="1" value="${rawVal}" 
                            class="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                            oninput="onWatsonRawLevelChange('${p.id}', this.value)">
                        <span class="text-xs font-extrabold text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300 whitespace-nowrap">Level ${rawVal} (${rawPts} pt)</span>
                    </div>
                    <div class="text-[10px] font-bold text-purple-900 bg-purple-50 p-2 rounded border border-purple-200 leading-snug">
                        ${rawLabel}
                    </div>
                ` : `
                    <div class="flex items-center gap-3 pt-1">
                        <input type="range" min="1" max="5" step="1" value="${rating}" 
                            class="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            oninput="onWatsonRatingChange('${p.id}', this.value)">
                        <span class="text-sm font-extrabold text-blue-900 w-6 text-center">${rating}</span>
                    </div>
                    <div class="text-[10px] font-bold ${watsonSimState.labelMode === 'watson' ? 'text-purple-800 bg-purple-50 p-1.5 rounded border border-purple-200' : 'text-slate-600 italic'}">
                        ${watsonSimState.labelMode === 'watson' ? (WATSON_RAW_LEVELS[p.id]?.labels[rating] || WATSON_RATING_LABELS[rating]) : WATSON_RATING_LABELS[rating]}
                    </div>
                `) : `
                    <div class="text-[10px] text-slate-400 italic pt-1">Parameter ini dinonaktifkan (0%). Aktifkan toggle di atas jika ingin menguji.</div>
                `}
            </div>
        `;
    });

    // Render Master Table Task 1 dynamically reflecting active weights per grade
    let masterRowsHTML = '';
    Object.keys(WATSON_GRADE_META).forEach(code => {
        const gradeMeta = getDynamicGradeMeta(code);
        const isCurrent = code === watsonSimState.selectedGrade;

        masterRowsHTML += `
            <tr class="${isCurrent ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'}">
                <td class="py-2 px-2 text-left font-sans font-bold border border-slate-200">${gradeMeta.name}</td>
                ${WATSON_PARAM_KEYS.map(p => {
                    const active = gradeMeta.activeParams.includes(p.id);
                    const w = active ? gradeMeta.weights[p.id] : 0;
                    const tier = gradeMeta.paramTiers[p.id] || (active ? 'Secondary' : 'Optional');
                    const tierBadgeColor = tier === 'Primary' ? 'text-amber-700 font-extrabold' : tier === 'Secondary' ? 'text-blue-700 font-bold' : 'text-purple-700 font-semibold';
                    
                    return active 
                        ? `<td class="py-1.5 px-1 border border-slate-200 text-[10px] leading-tight"><span class="${tierBadgeColor}">${tier}</span><br><span class="font-mono text-emerald-700 font-bold">${w}%</span></td>`
                        : `<td class="py-1.5 px-1 border border-slate-200 text-slate-300">❌ 0%</td>`;
                }).join('')}
                <td class="py-2 px-2 font-bold text-purple-900 border border-slate-200 whitespace-nowrap">${gradeMeta.jvMin} – ${gradeMeta.jvMax}</td>
            </tr>
        `;
    });

    container.innerHTML = `
        <!-- TABEL INFORMASI TASK 1 (PEMETAAN MATRIKS & BOBOT ASESMEN) -->
        <div class="card mb-6 border-slate-200">
            <div class="flex justify-between items-center mb-2">
                <div class="card-title text-sm text-slate-800 m-0">📊 Informasi Matriks Bobot Asesmen (Rev - Task 1)</div>
                <button onclick="resetWatsonGradeParams('${watsonSimState.selectedGrade}')" class="text-xs font-semibold text-blue-600 hover:text-blue-800 underline">Reset Parameter ${watsonSimState.selectedGrade} ke Default</button>
            </div>
            <p class="text-xs text-slate-500 mb-3 leading-relaxed">
                Tabel master prioritas tier (Primary, Secondary, Optional) dan alokasi persentase bobot ter-rebalance (✔️ 100%) per jenjang (D1 s.d. D6) berdasarkan dokumen <code>Rev - TASK 1 - Pemetaan Matrix yang Disederhanakan</code>.
            </p>
            
            <div class="overflow-x-auto">
                <table class="min-w-full border-collapse border border-slate-200 text-xs">
                    <thead>
                        <tr class="bg-slate-800 text-white text-[10px] uppercase font-bold text-center">
                            <th class="py-2.5 px-2 border border-slate-700 text-left bg-slate-900">Jenjang / Grade</th>
                            <th class="py-2.5 px-1 border border-slate-700">Pendidikan</th>
                            <th class="py-2.5 px-1 border border-slate-700">Pengalaman</th>
                            <th class="py-2.5 px-1 border border-slate-700">Konsekuensi</th>
                            <th class="py-2.5 px-1 border border-slate-700">Ruang Lingkup</th>
                            <th class="py-2.5 px-1 border border-slate-700">Keputusan</th>
                            <th class="py-2.5 px-1 border border-slate-700">Kontak Int.</th>
                            <th class="py-2.5 px-1 border border-slate-700">Kontak Eks.</th>
                            <th class="py-2.5 px-1 border border-slate-700">Riset</th>
                            <th class="py-2.5 px-1 border border-slate-700">Pengawasan</th>
                            <th class="py-2.5 px-1 border border-slate-700">Jumlah Diawasi</th>
                            <th class="py-2.5 px-2 border border-slate-700 bg-slate-900">Target Rentang JV</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 text-center font-mono">
                        ${masterRowsHTML}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- FORM ASESMEN & PARAMETER GRID -->
        <div class="card mb-6">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div class="flex flex-wrap items-center gap-3">
                    <span class="card-title text-sm m-0">📋 Form Asesmen 10 Parameter (${meta.name})</span>
                    ${statusBadgeHTML}
                    <span class="text-[11px] font-semibold text-slate-500">🔒 Terkunci: ${lockedWeightSum}% &bull; 🔓 Terbuka: ${unlockedWeightSum}%</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <!-- MODE CALCULATION TOGGLE (LIKERT 1-5 vs RAW LEVEL WATSON WYATT vs HYBRID DASARIA v1.0) -->
                    <div class="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                        <button type="button" onclick="setWatsonCalcMode('rating')" 
                            class="px-2 py-1 text-xs font-bold rounded-md transition-all ${watsonSimState.calcMode === 'rating' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                            📊 Likert (1-5)
                        </button>
                        <button type="button" onclick="setWatsonCalcMode('raw')" 
                            class="px-2 py-1 text-xs font-bold rounded-md transition-all ${watsonSimState.calcMode === 'raw' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                            🎯 Level Murni (1-N)
                        </button>
                        <button type="button" onclick="setWatsonCalcMode('hybrid')" 
                            class="px-2 py-1 text-xs font-bold rounded-md transition-all ${watsonSimState.calcMode === 'hybrid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                            🏛️ Hibrida PT Dasaria v1.0
                        </button>
                    </div>

                    ${watsonSimState.calcMode === 'rating' ? `
                        <button type="button" onclick="toggleWatsonLabelMode()" 
                            class="px-2 py-1 text-xs font-extrabold rounded-lg border transition-all ${watsonSimState.labelMode === 'watson' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}">
                            ${watsonSimState.labelMode === 'watson' ? '🏷️ Label: Real Kualifikasi' : '📊 Label: Standard Likert'}
                        </button>
                    ` : ''}

                    <span class="text-xs font-bold text-slate-600">Jenjang:</span>
                    <select class="select-field text-xs font-bold text-blue-900 border-blue-300 py-1" onchange="onWatsonGradeChange(this.value)">
                        ${Object.keys(WATSON_GRADE_META).map(k => `
                            <option value="${k}" ${k === watsonSimState.selectedGrade ? 'selected' : ''}>${WATSON_GRADE_META[k].name} (${WATSON_GRADE_META[k].track})</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${paramCardsHTML}
            </div>
        </div>

        <!-- SCORE SUMMARY CARDS -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="card ${res.isRawMode ? 'border-purple-200 bg-purple-50/40' : 'border-blue-200 bg-blue-50/40'}">
                <div class="stat-value ${res.isRawMode ? 'text-purple-800' : 'text-blue-800'}">
                    ${res.isRawMode ? `${res.totalRawPointsSum} <span class="text-xs font-semibold text-purple-600">pt</span>` : `${res.totalWeightedScore.toFixed(2)} / 5.00`}
                </div>
                <div class="stat-label">${res.isRawMode ? 'Total Poin Mentah Watson Wyatt' : 'Total Skor Terbobot'}</div>
                <div class="text-[10px] text-slate-500 mt-1 font-sans">
                    ${res.isRawMode ? `Target Rentang Grade: ${res.rawMin} – ${res.rawMax} pt` : 'SUM(Rating × Bobot %)'}
                </div>
            </div>
            <div class="card border-emerald-200 bg-emerald-50/40">
                <div class="stat-value text-emerald-800">${(res.normalizedRatio * 100).toFixed(1)}%</div>
                <div class="stat-label">Rasio Pencapaian Grade</div>
                <div class="text-[10px] text-slate-500 mt-1 font-sans">
                    ${res.isRawMode ? '(TotalPoin - RawMin) / (RawMax - RawMin)' : '(Skor - 1) / 4'}
                </div>
            </div>
            <div class="card border-purple-200 bg-purple-50/40">
                <div class="stat-value text-purple-900">${res.targetJV} <span class="text-xs font-semibold text-purple-600">Poin</span></div>
                <div class="stat-label">Hasil Target Job Value (JV)</div>
                <div class="text-[10px] text-slate-500 mt-1 font-sans">Rentang Grade: ${res.jvMin} – ${res.jvMax}</div>
            </div>
            <div class="card border-amber-200 bg-amber-50/40">
                <div class="stat-value text-amber-800">Sub-Level ${res.sublevel}</div>
                <div class="stat-label">Posisi Sub-Level Kategori</div>
                <div class="text-[10px] text-slate-500 mt-1 font-sans">Sub A=Min, C=Mid (${res.jvMid}), E=Max</div>
            </div>
        </div>

        <!-- LANDASAN LOGIS & FORMULA INFO -->
        <div class="card bg-slate-900 text-white p-5">
            <h3 class="font-bold text-sm text-blue-300 mb-2">💡 Algoritma Konversi Backend (${res.isRawMode ? 'Skala Murni Level Watson Wyatt 1-N' : 'Skala Likert 1-5 Pre-Weighted'})</h3>
            <div class="text-xs text-slate-300 space-y-1 font-mono">
                ${res.isRawMode ? `
                    <div>Total Poin Mentah = &Sigma; (Poin Level Watson Wyatt per Parameter Aktif)</div>
                    <div>Target JV = JV Min + [((Total Poin Mentah - Raw Min) / (Raw Max - Raw Min)) &times; (JV Max - JV Min)]</div>
                ` : `
                    <div>Total Skor Terbobot = &Sigma; (Rating Asesmen Parameter &times; Bobot Parameter %)</div>
                    <div>Target JV = JV Min + [((Total Skor Terbobot - 1) / 4) &times; (JV Max - JV Min)]</div>
                `}
            </div>
        </div>
    `;
}

// Event Handlers
function onWatsonGradeChange(gradeCode) {
    watsonSimState.selectedGrade = gradeCode;
    initWatsonSimState(gradeCode);
    renderMenu10();
}

function onWatsonRatingChange(paramId, value) {
    const code = watsonSimState.selectedGrade;
    if (!watsonSimState.ratings[code]) {
        watsonSimState.ratings[code] = {};
    }
    watsonSimState.ratings[code][paramId] = Number(value);
    renderMenu10();
}

function onWatsonParamToggle(paramId, checked) {
    const code = watsonSimState.selectedGrade;
    rebalanceWeightsOnToggle(code, paramId, checked);
    renderMenu10();
}

function onWatsonLockToggle(paramId) {
    const code = watsonSimState.selectedGrade;
    initWatsonSimState(code);
    if (!watsonSimState.lockedParamsMap) watsonSimState.lockedParamsMap = {};
    if (!watsonSimState.lockedParamsMap[code]) watsonSimState.lockedParamsMap[code] = {};
    watsonSimState.lockedParamsMap[code][paramId] = !watsonSimState.lockedParamsMap[code][paramId];
    renderMenu10();
}

function onWatsonTierChange(paramId, tierValue) {
    const code = watsonSimState.selectedGrade;
    if (!watsonSimState.paramTiersMap[code]) watsonSimState.paramTiersMap[code] = {};
    watsonSimState.paramTiersMap[code][paramId] = tierValue;
    renderMenu10();
}

function onWatsonWeightChange(paramId, weightValue, inputEl) {
    const code = watsonSimState.selectedGrade;
    initWatsonSimState(code);
    const pos = inputEl ? inputEl.selectionStart : null;
    if (!watsonSimState.customWeightsMap[code]) {
        watsonSimState.customWeightsMap[code] = {};
    }
    watsonSimState.customWeightsMap[code][paramId] = Number(weightValue);
    renderMenu10();

    if (paramId) {
        const el = document.querySelector(`input[data-weight-param="${paramId}"]`);
        if (el) {
            el.focus();
            if (pos !== null) {
                try { el.setSelectionRange(pos, pos); } catch (e) {}
            }
        }
    }
}

function setWatsonCalcMode(mode) {
    watsonSimState.calcMode = mode;
    renderMenu10();
}

function onWatsonRawLevelChange(paramId, value) {
    const code = watsonSimState.selectedGrade;
    if (!watsonSimState.rawLevelsMap) watsonSimState.rawLevelsMap = {};
    if (!watsonSimState.rawLevelsMap[code]) watsonSimState.rawLevelsMap[code] = {};
    watsonSimState.rawLevelsMap[code][paramId] = Number(value);
    renderMenu10();
}

function toggleWatsonLabelMode() {
    watsonSimState.labelMode = watsonSimState.labelMode === 'watson' ? 'likert' : 'watson';
    renderMenu10();
}

function resetWatsonGradeParams(gradeCode) {
    const code = gradeCode || watsonSimState.selectedGrade;
    const meta = WATSON_GRADE_META[code];
    if (meta) {
        watsonSimState.activeParamsMap[code] = [...meta.defaultActive];
        watsonSimState.paramTiersMap[code] = { ...(meta.defaultTiers || {}) };
        watsonSimState.customWeightsMap[code] = { ...(meta.defaultWeights || {}) };
        WATSON_PARAM_KEYS.forEach(p => {
            if (!watsonSimState.ratings[code]) watsonSimState.ratings[code] = {};
            watsonSimState.ratings[code][p.id] = 3;
        });
    }
    renderMenu10();
}

// Expose handlers globally
window.renderMenu10 = renderMenu10;
window.setWatsonSubTab = setWatsonSubTab;
window.setWatsonCalcMode = setWatsonCalcMode;
window.onHybridParamChange = onHybridParamChange;
window.onWatsonRawLevelChange = onWatsonRawLevelChange;
window.toggleWatsonLabelMode = toggleWatsonLabelMode;
window.toggleWatsonLabelMode = toggleWatsonLabelMode;
window.onWatsonGradeChange = onWatsonGradeChange;
window.onWatsonRatingChange = onWatsonRatingChange;
window.onWatsonParamToggle = onWatsonParamToggle;
window.onWatsonTierChange = onWatsonTierChange;
window.onWatsonWeightChange = onWatsonWeightChange;
window.resetWatsonGradeParams = resetWatsonGradeParams;
