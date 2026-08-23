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
        // SKEMA GAJI POKOK: Gapok seragam, Multiplier apply ke THP
        gapokMid = anchor;
        thpMid   = anchor * mult + loading;
    }

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
// gapokFixed: optional, override gapok value (for skema gaji pokok)
// anchorPct: optional, anchor percentage (for skema gaji pokok calculation)
function calcComponents(thp, params, gapokFixed, anchorPct) {
    const rk = v => Math.round(v / 1000) * 1000;

    let gapok;
    if (currentScheme === 'skema-gapok' && anchorPct !== undefined) {
        gapok = rk(anchorPct * params.composition.gapok / 100);  // Anchor × composition.gapok%
    } else {
        gapok = rk(thp * params.composition.gapok / 100);  // THP × composition.gapok% (skema lama)
    }

    const tt    = rk(thp * params.composition.tt    / 100);
    const ttt   = thp - gapok - tt;

    const struktural = rk(tt * params.ttSplit.struktural / 100);
    const lamaKerja  = rk(tt * params.ttSplit.lamaKerja  / 100);
    const keluarga   = tt - struktural - lamaKerja;

    return { gapok, tt, ttt, struktural, lamaKerja, keluarga, thp };
}

// ---- 75% Compliance Check (Gapok >= 75% of Gapok+TT, per UU) ----
function check75Rule(gapok, tt, _thp) {
    const base = gapok + tt;
    if (base === 0) return true;
    return gapok / base >= 0.75;
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

            ['Min', 'Mid', 'Max'].forEach(type => {
                const thpVal  = spread.values.thp[type.toLowerCase()];
                const gapokVal = spread.values.gapok[type.toLowerCase()];
                const comps   = calcComponents(thpVal, params, gapokVal, anchorPct);
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
            const thpMid  = spread.values.thp.mid;
            const anchorPct = params.anchors[j.code] || 50;
            const comps   = calcComponents(thpMid, params, undefined, anchorPct);
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
