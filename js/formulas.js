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
function calcSpread(umkValue, jenjangCode, subLevel, params) {
    const anchor  = params.anchors[jenjangCode] || 50;
    const mult    = getMultiplier(subLevel, params);
    const loading = getLoading(jenjangCode);
    const step    = params.step || 2;

    let gapokMid, thpMid;

    if (currentScheme === 'skema-lama') {
        // SKEMA LAMA: Multiplier apply ke Gapok
        gapokMid = anchor * mult;
        thpMid   = gapokMid + loading;
    } else {
        // SKEMA GAJI POKOK: THP varies per sub-level, Gapok tetap per jenjang
        thpMid   = anchor * mult + loading;  // THP = Anchor × Multiplier + Loading
        gapokMid = anchor;                    // Gapok = Anchor (tetap, tanpa Multiplier)
    }

    // Spread: Skema Lama ada spread di Gapok & THP, Skema Gaji Pokok hanya di THP
    const gapokMin = currentScheme === 'skema-gapok' ? gapokMid : gapokMid - step;
    const gapokMax = currentScheme === 'skema-gapok' ? gapokMid : gapokMid + step;
    const thpMin   = thpMid - step;
    const thpMax   = thpMid + step;

    const rk = v => Math.round((umkValue * v / 100) / 1000) * 1000;

    return {
        percents: {
            gapok: { min: gapokMin, mid: gapokMid, max: gapokMax },
            thp:   { min: thpMin,   mid: thpMid,   max: thpMax   }
        },
        values: {
            gapok: { min: rk(gapokMin), mid: rk(gapokMid), max: rk(gapokMax) },
            thp:   { min: rk(thpMin),   mid: rk(thpMid),   max: rk(thpMax)   }
        }
    };
}

// ---- Split THP into components via composition matrix ----
// gapokRupiah: pre-calculated gapok in Rupiah (from calcSpread, for skema gaji pokok)
// mult: sub-level multiplier (A=1.00, B=1.07, etc.)
// anchor: anchor percentage for the jenjang
// loading: loading percentage for the jenjang
// umkValue: UMK value for the location
function calcComponents(thp, params, gapokRupiah, mult, anchor, loading, umkValue) {
    const rk = v => Math.round(v / 1000) * 1000;

    let gapok, tt, ttt;

    if (currentScheme === 'skema-lama') {
        // SKEMA LAMA: Semua proporsi dari THP × composition%
        gapok = rk(thp * params.composition.gapok / 100);
        tt    = rk(thp * params.composition.tt / 100);
        ttt   = thp - gapok - tt;
    } else {
        // SKEMA GAJI POKOK: Gapok = THP_A (THP terendah) × composition.gapok% — FIXED seragam
        const thpA = rk(((anchor || 0) + (loading || 0)) * (umkValue || 0) / 100);
        gapok = rk(thpA * params.composition.gapok / 100);
        const nonGapok = thp - gapok;
        const m = mult || 1;
        const ttNum = params.composition.tt * m;
        const ttDen = ttNum + params.composition.ttt;
        tt  = rk(nonGapok * ttNum / ttDen);
        ttt = thp - gapok - tt;
    }

    let struktural, lamaKerja, keluarga;
    if (currentScheme === 'skema-gapok') {
        // SKEMA GAJI POKOK: Detail TT belum dihitung, hanya slot anggaran
        struktural = 0;
        lamaKerja  = 0;
        keluarga   = 0;
    } else {
        // SKEMA LAMA: Detail TT dihitung normal
        struktural = rk(tt * params.ttSplit.struktural / 100);
        lamaKerja  = rk(tt * params.ttSplit.lamaKerja  / 100);
        keluarga   = tt - struktural - lamaKerja;
    }

    return { gapok, tt, ttt, struktural, lamaKerja, keluarga, thp };
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
    JENJANG_LIST.forEach(j => {
        SUB_LEVELS.forEach(sl => {
            const spread = calcSpread(umkValue, j.code, sl, params);
            const scores = jvScores[j.code] || {};
            const jv     = calcJV(scores);
            const anchorPct = params.anchors[j.code] || 50;

            const loading = getLoading(j.code);

            ['Min', 'Mid', 'Max'].forEach(type => {
                const thpVal  = spread.values.thp[type.toLowerCase()];
                const gapokVal = spread.values.gapok[type.toLowerCase()];
                const mult = getMultiplier(sl, params);
                const comps   = calcComponents(thpVal, params, gapokVal, mult, anchorPct, loading, umkValue);
                const gapokPc = spread.percents.gapok[type.toLowerCase()];
                const thpPc   = spread.percents.thp[type.toLowerCase()];
                table.push({
                    jenjangCode: j.code,
                    jenjangName: j.name,
                    subLevel: sl,
                    track: j.track,
                    jv,
                    type,
                    gapokPercent: gapokPc,
                    thpPercent:   thpPc,
                    ...comps
                });
            });
        });
    });
    return table;
}

// ---- Legacy full table (used by Comparison menu) ----
function generateFullTable(umkValue, params, jvScores) {
    const table = [];
    JENJANG_LIST.forEach(j => {
        SUB_LEVELS.forEach(sl => {
            const spread  = calcSpread(umkValue, j.code, sl, params);
            const scores  = jvScores[j.code] || {};
            const jv      = calcJV(scores);
            const anchorPct = params.anchors[j.code] || 50;
            const thpMid  = spread.values.thp.mid;
            const gapokMid = spread.values.gapok.mid;
            const mult = getMultiplier(sl, params);
            const loading = getLoading(j.code);
            const comps   = calcComponents(thpMid, params, gapokMid, mult, anchorPct, loading, umkValue);
            table.push({
                jenjangCode: j.code,
                jenjangName: j.name,
                subLevel: sl,
                track: j.track,
                jv,
                thp: thpMid,
                ...comps
            });
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
    const sigmaC = C * sigmaPct / 100;
    const U_val = U || 3000000;
    console.log('[UMK DEBUG] deriveGradeStack received U =', U, '→ U_val =', U_val);
    let warning = null;

    const compG = (params.composition && params.composition.gapok) || 75;
    const premium = params.managerialPremium || 1.03;

    // Get anchors (default if not defined)
    const anchors = {
        D1: 75,
        D2: 78,
        'D3-1': 90,
        'D3-2': 90,
        'D4-1': 106,
        'D4-2': 106,
        D5: 110,
        D6: 120,
        ...(params.anchors || {})
    };

    // Sub-level multipliers (B-E relative to A = 1.00)
    const mults = {
        A: 1.00,
        B: 0.94,
        C: 0.88,
        D: 0.82,
        E: 0.76,
        ...(params.subLevelMultipliers || {})
    };

    const rk = v => Math.round(v / 1000) * 1000;

    // We build the 8 grades directly from the mapping
    const grades = [];
    GRADE_MAPPING_BARU.forEach(m => {
        const anchorPct = anchors[m.code] || 75;
        const pmtMult = m.premium ? premium : 1;

        // A sub-level = anchor% * UMK / (compG/100), then apply premium if managerial
        const thpA = (anchorPct * U_val / 100) / (compG / 100) * pmtMult;

        // Sub-levels: apply explicit multipliers relative to A
        const subKeys = ['A', 'B', 'C', 'D', 'E'];
        const subs = subKeys.map(key => {
            const raw = thpA * (mults[key] || 1);
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

    // T is max THP / min UMK
    const T = sigmaC / U_val;

    return { T, sigmaC, s: 0, grades, warning };
}
