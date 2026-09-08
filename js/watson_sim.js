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
    calcMode: 'rating',      // 'rating' (Likert 1-5) or 'raw' (Watson Wyatt native level 1-N)
    labelMode: 'watson',     // 'watson' (Watson Wyatt descriptors) or 'likert' (Likert 1-5)
    ratings: {},             // { knowledge: 3, experience: 3, ... }
    rawLevelsMap: {}         // { D4-2: { knowledge: 4, experience: 4, ... } }
};

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
    const meta = WATSON_GRADE_META[gradeCode] || WATSON_GRADE_META['D4-2'];
    const activeParams = watsonSimState.activeParamsMap[gradeCode] || meta.defaultActive;
    const customWeights = watsonSimState.customWeightsMap[gradeCode] || {};
    const paramTiers = watsonSimState.paramTiersMap[gradeCode] || meta.defaultTiers || {};

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

// Render Menu 10
function renderMenu10() {
    const container = document.getElementById('menu10-container');
    if (!container) return;

    initWatsonSimState(watsonSimState.selectedGrade);
    const meta = getDynamicGradeMeta(watsonSimState.selectedGrade);
    const res = calcWatsonSimJVFromRating(watsonSimState.selectedGrade);
    const activeRatings = watsonSimState.ratings[watsonSimState.selectedGrade] || {};

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
                    <!-- MODE CALCULATION TOGGLE (LIKERT 1-5 vs RAW LEVEL WATSON WYATT) -->
                    <div class="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-300">
                        <button type="button" onclick="setWatsonCalcMode('rating')" 
                            class="px-2 py-1 text-xs font-bold rounded-md transition-all ${watsonSimState.calcMode === 'rating' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                            📊 Skala Likert (1-5)
                        </button>
                        <button type="button" onclick="setWatsonCalcMode('raw')" 
                            class="px-2 py-1 text-xs font-bold rounded-md transition-all ${watsonSimState.calcMode === 'raw' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                            🎯 Level Murni (1–6/1–7/1–8)
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
window.setWatsonCalcMode = setWatsonCalcMode;
window.onWatsonRawLevelChange = onWatsonRawLevelChange;
window.toggleWatsonLabelMode = toggleWatsonLabelMode;
window.toggleWatsonLabelMode = toggleWatsonLabelMode;
window.onWatsonGradeChange = onWatsonGradeChange;
window.onWatsonRatingChange = onWatsonRatingChange;
window.onWatsonParamToggle = onWatsonParamToggle;
window.onWatsonTierChange = onWatsonTierChange;
window.onWatsonWeightChange = onWatsonWeightChange;
window.resetWatsonGradeParams = resetWatsonGradeParams;
