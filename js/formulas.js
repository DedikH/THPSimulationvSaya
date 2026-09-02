// =====================================================
// FORMULAS.JS — Core Formulas + Helpers
// Formula 1 (JV), Formula 2 (Multiplier), Formula 3 (Loading) LOCKED
// =====================================================

// ---- Formula 1: Job Value ----
function calcJV(scores) {
    let jv = 0;
    FACTORS.forEach(f => {
        const s = Math.min(Math.max(Number(scores[f.code]) || 0, 1), 5);
        jv += s * f.weight;
    });
    return jv;
}

// ---- Formula 2: Sub-Level Multiplier (from params, adjustable) ----
function getMultiplier(subLevel, params) {
    if (params && params.subLevelMultipliers && params.subLevelMultipliers[subLevel] !== undefined) {
        return params.subLevelMultipliers[subLevel];
    }
    // fallback to Watson Wyatt default
    const idx = SUB_LEVELS.indexOf(subLevel);
    return 1.0 + idx * (29 / 4 / 100);
}

// ---- Formula 3: Loading per Jenjang (LOCKED) ----
function getLoading(jenjangCode) {
    const j = JENJANG_LIST.find(j => j.code === jenjangCode);
    return j ? j.loading : 0; // return as percent (e.g. 10.0 for 10%)
}

// ---- Spread Calculation ----
// Gapok Mid% = Anchor% × Multiplier (per Pak Dika)
// THP  Mid% = Gapok Mid% + Loading%  (from Formula 3)
// Min  = Mid - step,  Max = Mid + step
function calcSpread(umkValue, jenjangCode, subLevel, params, plafonAnchors, plafonVal) {
    const anchor = plafonAnchors ? (plafonAnchors[jenjangCode] || 75) : (params.anchors[jenjangCode] || 50);
    const rk = v => Math.round(v / 1000) * 1000;
    const thp = rk((plafonVal || 15000000) * anchor / 100);
    const gapok = rk(umkValue * 75 / 100);

    return {
        percents: { gapok: 75, thp: anchor },
        values: { gapok, thp }
    };
}

// ---- Split THP into components via composition matrix ----
// gapokRupiah: pre-calculated gapok in Rupiah (from calcSpread, for skema gaji pokok)
// mult: sub-level multiplier (A=1.00, B=1.07, etc.)
// anchor: anchor percentage for the jenjang
// loading: loading percentage for the jenjang
// umkValue: UMK value for the location
function calcComponents(thp, params, gapokRupiah, mult, anchor, loading, umkValue, gradeCode, rowType, subIdx) {
    const rk = v => Math.round(v / 1000) * 1000;
    const abParams = (typeof approachBaruParams !== 'undefined') ? approachBaruParams : params;

    const gapokAnchors = abParams.gapokAnchors || {};
    const gapokPct = gradeCode && gapokAnchors[gradeCode] !== undefined ? gapokAnchors[gradeCode] : (abParams.composition?.gapok || 75);
    const gapok = rk(umkValue * gapokPct / 100);

    const ttRiil = thp - gapok;

    // 1. Tunjangan Keluarga
    const hasPas = abParams.hasPasangan ?? 1;
    const anak = abParams.jumlahAnak ?? 2;
    const keluarga = rk((Number(hasPas) + Number(anak)) * (abParams.tunjKeluargaPerAnak ?? 100000));

    // 2. Tunjangan Lama Kerja (varies by sub-level A-E)
    let years = 0;
    if (subIdx !== undefined) {
        years = (subIdx / 4) * (abParams.maxMasaKerjaTahun ?? 5);
    } else {
        years = (abParams.maxMasaKerjaTahun ?? 5) / 2;
    }
    const lamaKerja = rk(years * (abParams.tunjLamaKerjaPerTahun ?? 50000));

    // 3. Tunjangan Struktural
    let struktural = 0;
    if (gradeCode) {
        const jInfo = JENJANG_LIST.find(j => j.code === gradeCode);
        if (jInfo && jInfo.structuralGroup) {
            const group = jInfo.structuralGroup;
            let nominal = (abParams.structuralAllowance && abParams.structuralAllowance[group]) || 0;
            if (gradeCode === 'D3-1' && abParams.enableStrukturalD31 === false) {
                nominal = 0;
            } else if (gradeCode === 'D4-1' && abParams.enableStrukturalD41 === false) {
                nominal = 0;
            } else if (jInfo.type === 'manajerial' && abParams.extraManajerialPct > 0) {
                nominal = nominal * (1 + abParams.extraManajerialPct / 100);
            }
            struktural = rk(nominal);
        }
    }

    const tt = keluarga + lamaKerja + struktural;
    const ttt = Math.max(0, ttRiil - tt);
    const finalThp = gapok + tt + ttt;

    return { gapok, tt, ttt, struktural, lamaKerja, keluarga, thp: finalThp };
}

// ---- 75% Compliance Check (Gapok >= 75% of Gapok+TT, per UU) ----
function check75Rule(gapok, tt, _thp) {
    const base = gapok + tt;
    if (base === 0) return true;
    return gapok / base >= 0.75;
}

// ---- Calculate 75% Rule ratio (Gapok / (Gapok + TT)) ----
function calc75Ratio(gapok, tt) {
    const base = gapok + tt;
    if (base === 0) return 0;
    return (gapok / base) * 100;
}

// =====================================================
// WATSON-DRIVEN ANCHOR ENGINE (murni, tanpa DOM)
// Menghitung anchor D1-D6 dari Job Value via rantai growth
// ber-koridor: eps dikalibrasi agar D6 mendarat di target,
// lalu growth per langkah dipangkas masuk koridor min/max.
// =====================================================
function calcWatsonAnchors(jvScores, cfg) {
    const round01 = v => Math.round(v * 10) / 10;
    const warnings = [];
    const steps = [];

    // Rantai jenjang utama (urut level; D3-2/D4-2 diturunkan terpisah via premium)
    const CHAIN = ['D1', 'D2', 'D3-1', 'D4-1', 'D5', 'D6'];

    // JV tiap kode: skor user jika ada, fallback skor default
    const jvOf = (kode) => calcJV(
        (jvScores && jvScores[kode]) ? jvScores[kode] : (DEFAULT_SCORES[kode] || {})
    );

    const jvD1   = jvOf('D1');
    const jvD6   = jvOf('D6');
    const d1Pin  = Number(cfg.d1Pin);

    // Target plafon D6 (%)
    let target;
    if (cfg.ceilingMethod === 'rasio') {
        // ρ × THP% entry (pin + loading D1) − loading D6
        target = Number(cfg.rhoValue) * (d1Pin + getLoading('D1')) - getLoading('D6');
    } else {
        target = Number(cfg.manualTargetPct);
    }

    // Guard: rasio JV / target tidak valid → jangan sentuh anchor
    if (!(jvD6 > jvD1) || !(target > 0)) {
        warnings.push(
            `Konfigurasi tidak valid: JV D6 (${jvD6}) harus > JV D1 (${jvD1}) dan target (${round01(target)}%) harus > 0. Anchor tidak diubah.`
        );
        return { anchors: null, steps, warnings, landedD6: null, epsilon: null };
    }

    // Epsilon: auto-kalibrasi log-logistik, atau manual
    let eps;
    if (cfg.epsilonAuto) {
        eps = Math.log(target / d1Pin) / Math.log(jvD6 / jvD1);
    } else {
        eps = Number(cfg.manualEpsilon);
    }

    // Validasi koridor: 0 ≤ min ≤ max
    const cMin = Number(cfg.corridorMin);
    const cMax = Number(cfg.corridorMax);
    if (!(cMin >= 0) || !(cMax >= cMin)) {
        warnings.push(`Konfigurasi koridor tidak wajar (min=${cfg.corridorMin}, max=${cfg.corridorMax}) — disarankan 0 ≤ min ≤ max.`);
    }

    // Chain: growth tiap transisi dipangkas masuk koridor [min, max]
    let a = d1Pin;
    const chain = [a];
    for (let i = 0; i < CHAIN.length - 1; i++) {
        const from = CHAIN[i];
        const to   = CHAIN[i + 1];
        const jvFrom = jvOf(from);
        const jvTo   = jvOf(to);

        const rawGrowth     = Math.pow(jvTo / jvFrom, eps);
        const growthPct     = (rawGrowth - 1) * 100;
        const clippedGrowth = Math.min(Math.max(growthPct, Number(cfg.corridorMin)), Number(cfg.corridorMax));
        if (clippedGrowth !== growthPct) {
            warnings.push(`Langkah ${from}→${to} terpangkas dari ${growthPct.toFixed(1)}% menjadi ${clippedGrowth.toFixed(1)}%`);
        }

        a = a * (1 + clippedGrowth / 100);
        chain.push(a);
        steps.push({
            from, to,
            jvFrom, jvTo,
            rawPct: growthPct,
            usedPct: clippedGrowth,
            result: round01(a)
        });
    }

    // Anchors utama dibulatkan 0.1
    const anchors = {};
    CHAIN.forEach((kode, idx) => { anchors[kode] = round01(chain[idx]); });

    // Varian manajerial mengikuti premium di atas pasangan fungsionalnya
    anchors['D3-2'] = round01(anchors['D3-1'] * Number(cfg.managerialPremium));
    anchors['D4-2'] = round01(anchors['D4-1'] * Number(cfg.managerialPremium));

    // Warning band tipis D2|D3-1
    const jvD2  = jvOf('D2');
    const jvD31 = jvOf('D3-1');
    if (Math.abs(jvD2 - jvD31) < 15) {
        warnings.push(`Band tipis D2|D3-1 (selisih JV hanya ${Math.abs(jvD2 - jvD31)} poin) — pertimbangkan review scoring`);
    }
    // Catatan wajib
    warnings.push('JV D5/D6 belum divalidasi scoring formal');

    return { anchors, steps, warnings, landedD6: anchors['D6'], epsilon: eps };
}

// ---- Generate spread table (Min/Mid/Max rows per jenjang/sublevel) ----
function generateSpreadTableData(umkValue, params, jvScores) {
    const table = [];
    const plafonVal = approachBaruParams?.plafon || 15000000;
    const sigmaPct = approachBaruParams?.sigmaPct || 85;
    const gapPct = approachBaruParams?.gapPct || 2;
    const plafonAnchors = calcAnchorsFromPlafon(plafonVal, sigmaPct, gapPct, umkValue).anchors;
    const gapokAnchors = approachBaruParams?.gapokAnchors || {};
    const subMults = approachBaruParams?.subLevelMultipliers || { A: 1.01, B: 1.02, C: 1.03, D: 1.04, E: 1.05 };

    JENJANG_LIST.forEach(j => {
        const anchorPct = plafonAnchors[j.code] || 75;
        const gapokPct = gapokAnchors[j.code] !== undefined ? gapokAnchors[j.code] : (approachBaruParams?.composition?.gapok || 75);
        const loading = getLoading(j.code);
        const scores = jvScores[j.code] || {};
        const jv = calcJV(scores);
        const thpBase = Math.round(plafonVal * anchorPct / 100000) * 1000;
        const gapok = Math.round(umkValue * gapokPct / 1000) * 1000;

        const subKeys = ['A', 'B', 'C', 'D', 'E'];
        const minMaxMap = [
            { subIdx: 0, type: 'Min', subLabel: 'A' },
            { subIdx: 2, type: 'Mid', subLabel: 'C' },
            { subIdx: 4, type: 'Max', subLabel: 'E' }
        ];

        minMaxMap.forEach(({ subIdx, type, subLabel }) => {
            const mult = subMults[subLabel] || 1;
            const thp = Math.round(thpBase * mult / 1000) * 1000;
            const comps = calcComponents(thp, params, gapok, mult, anchorPct, loading, umkValue, j.code, type);
            table.push({
                jenjangCode: j.code,
                jenjangName: j.name,
                subLevel: subLabel,
                track: j.track,
                jv,
                type,
                gapokPercent: gapokPct,
                thpPercent: anchorPct,
                ...comps
            });
        });
    });
    return table;
}

// ---- Legacy full table (used by Comparison menu) ----
function generateFullTable(umkValue, params, jvScores) {
    const table = [];
    const plafonVal = approachBaruParams?.plafon || 15000000;
    const sigmaPct = approachBaruParams?.sigmaPct || 85;
    const gapPct = approachBaruParams?.gapPct || 2;
    const plafonAnchors = calcAnchorsFromPlafon(plafonVal, sigmaPct, gapPct, umkValue).anchors;
    const gapokAnchors = approachBaruParams?.gapokAnchors || {};

    JENJANG_LIST.forEach(j => {
        const anchorPct = plafonAnchors[j.code] || 75;
        const gapokPct = gapokAnchors[j.code] !== undefined ? gapokAnchors[j.code] : (approachBaruParams?.composition?.gapok || 75);
        const loading = getLoading(j.code);
        const scores = jvScores[j.code] || {};
        const jv = calcJV(scores);
        const thp = Math.round(plafonVal * anchorPct / 100000) * 1000;
        const gapok = Math.round(umkValue * gapokPct / 1000) * 1000;

        const mult = 1;
        const comps = calcComponents(thp, params, gapok, mult, anchorPct, loading, umkValue, j.code, 'Mid');
        table.push({
            jenjangCode: j.code,
            jenjangName: j.name,
            subLevel: 'C',
            track: j.track,
            jv,
            thp: thp,
            ...comps
        });
    });
    return table;
}

// ---- Formatting ----
function formatCurrency(val) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR',
        minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(Math.round(val));
}

function formatNumber(val) {
    return new Intl.NumberFormat('id-ID').format(Math.round(val));
}

function formatPercent(val, decimals = 1) {
    return val.toFixed(decimals) + '%';
}

// =====================================================
// ANCHOR CALCULATION FROM PLAFON/SIGMA
// Anchor % = THP / Plafon × 100
// D6 = σ%, D1 = 75% UMK floor, D2-D5 geometric interpolation
// =====================================================
function calcAnchorsFromPlafon(plafon, sigmaPct, gapPct, umkValue) {
    const rk01 = v => Math.round(v * 100) / 100;
    const plafonVal = plafon || 15000000;
    const sigma = sigmaPct || 85;
    const gap = gapPct || 2;
    const U = umkValue || 3000000;

    const sigmaC = plafonVal * sigma / 100;
    const d6Anchor = sigma;

    const d1MinTHP = U * 0.75;
    let d1Anchor = (d1MinTHP / plafonVal) * 100;
    if (d1Anchor < 1) d1Anchor = 1;
    if (d1Anchor >= d6Anchor) d1Anchor = d6Anchor * 0.5;

    const growth = Math.pow(d6Anchor / d1Anchor, 1 / 5);

    const anchors = {
        D1:  rk01(d1Anchor),
        D2:  rk01(d1Anchor * growth),
        'D3-1': rk01(d1Anchor * Math.pow(growth, 2)),
        'D3-2': rk01(d1Anchor * Math.pow(growth, 2)),
        'D4-1': rk01(d1Anchor * Math.pow(growth, 3)),
        'D4-2': rk01(d1Anchor * Math.pow(growth, 3)),
        D5:  rk01(d1Anchor * Math.pow(growth, 4)),
        D6:  rk01(d6Anchor)
    };

    return {
        anchors,
        sigmaC: Math.round(sigmaC / 1000) * 1000,
        d1Anchor: rk01(d1Anchor),
        d6Anchor: rk01(d6Anchor),
        growth: rk01(growth),
        d1THP: Math.round(d1MinTHP / 1000) * 1000,
        d6THP: Math.round(sigmaC / 1000) * 1000,
        d1Check75: d1MinTHP >= U * 0.75
    };
}

// =====================================================
// PENDEKATAN BARU: Grade Stacking (No-Overlap by Construction)
// 8 grade (D1..D6, D3-2, D4-2). Dalam satu grade: sub-levels
// ditentukan oleh multiplier eksplisit (B-E relatif terhadap A = 1.00).
// =====================================================

/**
 * deriveGradeStack — Bangun seluruh struktur grade dari parameter dasar.
 * @param {number} U         UMK lokasi (Rp)
 * @param {number} C         Plafon THP (Rp)
 * @param {number} sigmaPct  Persentase plafon efektif (70-100%)
 * @param {number} gapPct    (unused, kept for compatibility)
 * @returns {{T, sigmaC, s, grades: Array, warning: string|null}}
 */
function deriveGradeStack(U, C, sigmaPct, gapPct) {
    const params = (typeof approachBaruParams !== 'undefined') ? approachBaruParams : DEFAULT_APPROACH_BARU;
    const U_val = U || 3000000;
    const C_val = C || 15000000;
    const sigmaPctVal = sigmaPct || 85;
    const gapPctVal = gapPct || 2;
    let warning = null;

    const plafonResult = calcAnchorsFromPlafon(C_val, sigmaPctVal, gapPctVal, U_val);
    const sigmaC = plafonResult.sigmaC;
    const calculatedAnchors = plafonResult.anchors;

    const anchors = { ...calculatedAnchors };

    const overrides = params.anchorOverrides || params.anchorsManual;
    if (overrides) {
        Object.keys(overrides).forEach(k => {
            if (overrides[k] !== undefined && overrides[k] !== null) {
                anchors[k] = overrides[k];
            }
        });
    }

    const rk = v => Math.round(v / 1000) * 1000;
    const gapokAnchors = params.gapokAnchors || {};
    const subMults = params.subLevelMultipliers || { A: 1.01, B: 1.02, C: 1.03, D: 1.04, E: 1.05 };

    const grades = [];
    GRADE_MAPPING_BARU.forEach(m => {
        const anchorPct = anchors[m.code] || 75;
        const thpBase = rk(C_val * anchorPct / 100);

        const subKeys = ['A', 'B', 'C', 'D', 'E'];
        const multE = subMults['E'] !== undefined ? subMults['E'] : 1;
        const subs = subKeys.map(key => {
            const mult = subMults[key] !== undefined ? subMults[key] : 1;
            const raw = (thpBase / multE) * mult;
            return {
                raw,
                rp: rk(raw),
                pct: (raw / U_val) * 100
            };
        });

        const minVal = subs[0].raw;
        const maxVal = subs[4].raw;

        grades.push({
            label: m.code,
            name: m.name,
            min: minVal,
            max: maxVal,
            mid: (minVal + maxVal) / 2,
            step: (maxVal - minVal) / 4,
            subs,
            isManagerial: m.premium
        });
    });

    if (grades[0] && grades[0].min < U_val) {
        warning = 'THP terendah D1-A di bawah UMK regional! Periksa Anchor D1 atau turunkan persentase Gaji Pokok.';
    }

    const T = sigmaC / U_val;
    const s = grades.length > 0 ? (grades[grades.length - 1].max - grades[0].min) / (grades.length * 4) : 0;

    return { T, sigmaC, s, grades, warning, plafonResult };
}
