// =====================================================
// BRANCH.JS — Self-contained Branch simulator
// =====================================================

// ---- Branch Grade Definitions ----
const JENJANG_LIST_BRANCH = [
    { code: 'D1',   name: 'D1 - Entry Level',       track: 'Functional',  structuralGroup: null,   type: 'fungsional' },
    { code: 'D2',   name: 'D2 - Officer',           track: 'Functional',  structuralGroup: null,   type: 'fungsional' },
    { code: 'D3-1', name: 'D3-1 - Principal',       track: 'Functional',  structuralGroup: 'BL',   type: 'fungsional' },
    { code: 'D4-1', name: 'D4-1 - Specialist',      track: 'Functional',  structuralGroup: 'SPVR', type: 'fungsional' },
    { code: 'D33',  name: 'D33 - Branch Leader',     track: 'Managerial', structuralGroup: 'BL',   type: 'manajerial' },
    { code: 'D43',  name: 'D43 - Head of Regional',  track: 'Managerial', structuralGroup: 'SPVR', type: 'manajerial' },
    { code: 'D5',   name: 'D5 - General Regional',   track: 'Managerial', structuralGroup: 'GRM',  type: 'manajerial' }
];

const GRADE_MAPPING_BRANCH = [
    { code: 'D1',   name: 'D1 - Entry Level',       baseIdx: 0, premium: false },
    { code: 'D2',   name: 'D2 - Officer',           baseIdx: 1, premium: false },
    { code: 'D3-1', name: 'D3-1 - Principal',       baseIdx: 2, premium: false },
    { code: 'D4-1', name: 'D4-1 - Specialist',      baseIdx: 3, premium: false },
    { code: 'D33',  name: 'D33 - Branch Leader',     baseIdx: 2, premium: true },
    { code: 'D43',  name: 'D43 - Head of Regional',  baseIdx: 3, premium: true },
    { code: 'D5',   name: 'D5 - General Regional',   baseIdx: 4, premium: false }
];

// Runtime state (loaded/saved by app.js)
if (!branchParams || Object.keys(branchParams).length === 0) {
    branchParams = JSON.parse(JSON.stringify(DEFAULT_BRANCH_PARAMS));
}

// ---- Helpers (reuse master where available, fallback inline) ----
const _brRk = v => Math.round(v / 1000) * 1000;
const _brFmtCur = typeof formatCurrency === 'function' ? formatCurrency : v => 'Rp ' + Math.round(v).toLocaleString('id-ID');
const _brFmtPct = typeof formatPercent === 'function' ? formatPercent : v => v.toFixed(1) + '%';

// ---- Grade Stacking for Branch ----
function deriveGradeStackBranch(U, C, sigmaPct, gapPct) {
    const bp = branchParams || DEFAULT_BRANCH_PARAMS;
    const U_val = U || 3000000;
    const C_val = C || 10000000;
    const sigmaPctVal = sigmaPct || 100;
    let warning = null;

    const sigmaC = _brRk(C_val * sigmaPctVal / 100);

    // Default THP margins (same scheme as HO, capped at D5)
    const defaultMargins = {
        D1: 10.0, D2: 30.0, 'D3-1': 85.0, 'D33': 90.0,
        'D4-1': 150.0, 'D43': 155.0, D5: 235.0
    };

    const anchors = { ...defaultMargins };
    const overrides = bp.anchorOverrides || {};
    Object.keys(overrides).forEach(k => {
        if (overrides[k] !== undefined && overrides[k] !== null) anchors[k] = overrides[k];
    });

    const gapokAnchors = bp.gapokAnchors || {};
    const subMults = bp.subLevelMultipliers || { A: 1.01, B: 1.02, C: 1.03, D: 1.04, E: 1.05 };
    const multA = subMults['A'] || 1;
    const multE = subMults['E'] || 1;

    const grades = [];
    GRADE_MAPPING_BRANCH.forEach(m => {
        const gapokPct = gapokAnchors[m.code] !== undefined ? gapokAnchors[m.code] : 75;
        const gapokRp = _brRk(U_val * gapokPct / 100);
        const thpMarginPct = (anchors[m.code] !== undefined ? anchors[m.code] : 10) + (bp.addStreamRegionalPct || 0);
        const thpBase = Math.min(C_val, gapokRp + _brRk(gapokRp * thpMarginPct / 100));

        const maxSubE = Math.min(C_val, thpBase * (multE / multA));
        const subs = ['A','B','C','D','E'].map(key => {
            const mult = subMults[key] || 1;
            const raw = Math.min(C_val, maxSubE * (mult / multE));
            return { raw, rp: _brRk(raw), pct: (raw / U_val) * 100 };
        });

        grades.push({
            label: m.code, name: m.name,
            min: subs[0].raw, max: subs[4].raw,
            mid: (subs[0].raw + subs[4].raw) / 2,
            step: (subs[4].raw - subs[0].raw) / 4,
            subs, isManagerial: m.premium
        });
    });

    if (grades[0] && grades[0].min < U_val) {
        warning = 'THP terendah D1-A di bawah UMK regional!';
    }

    const T = sigmaC / U_val;
    const s = grades.length > 0 ? (grades[grades.length - 1].max - grades[0].min) / (grades.length * 4) : 0;
    return { T, sigmaC, s, grades, warning };
}

// ---- Cell Component Calculator (mirrors calcBaruCellComponents) ----
function calcBranchCellComponents(baseTHP, subIdx, gradeCode) {
    const bp = branchParams || DEFAULT_BRANCH_PARAMS;
    const U = getActiveUmk();
    const C_val = bp.plafon || 10000000;

    const gapokPct = bp.gapokAnchors?.[gradeCode] !== undefined ? bp.gapokAnchors[gradeCode] : 75;
    const gapok = _brRk(U * gapokPct / 100);

    const cappedBaseTHP = Math.min(C_val, baseTHP);

    // TT Keluarga
    const hasPas = bp.hasPasangan ?? 1;
    const anak = bp.jumlahAnak ?? 2;
    const tt_kel = _brRk((hasPas + anak) * (bp.tunjKeluargaPerAnak || 100000));

    // TT Lama Kerja (Formula: Dasar + (Tahun * Kenaikan)) - Pukul Rata
    const years = bp.maxMasaKerjaTahun || 0;
    const awal_lk = bp.tunjLamaKerjaAwal ?? 50000;
    const kenaikan_lk = bp.tunjLamaKerjaPerTahun ?? 75000;
    const tt_lk = years > 0 ? _brRk(awal_lk + (years * kenaikan_lk)) : 0;

    // TT Struktural (Murni mengambil nominal dari Parameter Branch tanpa perkalian di simulasi utama)
    let tt_struct = 0;
    const jInfo = JENJANG_LIST_BRANCH.find(j => j.code === gradeCode);
    if (jInfo && jInfo.structuralGroup) {
        const grp = jInfo.structuralGroup;
        let baseNominal = bp.structuralAllowance?.[grp] !== undefined ? bp.structuralAllowance[grp] :
                      grp === 'BL' ? (bp.structuralAllowance?.['A'] ?? 200000) :
                      grp === 'SPVR' ? (bp.structuralAllowance?.['B'] ?? 400000) :
                      grp === 'GRM' ? (bp.structuralAllowance?.['C'] ?? 600000) : 0;

        let nominal = baseNominal;

        if (gradeCode === 'D3-1' && bp.enableStrukturalD31 === false) nominal = 0;
        else if (gradeCode === 'D4-1' && bp.enableStrukturalD41 === false) nominal = 0;
        
        tt_struct = _brRk(nominal);
    }

    const tt = tt_kel + tt_lk + tt_struct;

    // Treatment modes
    let thp, ttt;
    const treatment = bp.structTreatment || 'hybrid';
    
    if (treatment === 'additive') {
        // Opsi B (Full Additive): Semua tunjangan menambah THP
        ttt = Math.max(0, cappedBaseTHP - gapok);
        thp = Math.min(C_val, cappedBaseTHP + tt);
    } else if (treatment === 'squeeze') {
        // Opsi C (Full Squeeze): Semua TT memotong TTT, THP keras terkunci pada paket
        ttt = Math.max(0, (cappedBaseTHP - gapok) - tt);
        thp = cappedBaseTHP;
    } else {
        // Opsi A (Hybrid - KESEPAKATAN): 
        // 1. Struktural masuk paket (memotong TTT)
        // 2. Keluarga & Lama Kerja menambah paket (menambah THP)
        const ttRiilPorsiPaket = Math.max(0, cappedBaseTHP - gapok);
        
        // TTT hanya dipotong oleh struktural
        ttt = Math.max(0, ttRiilPorsiPaket - tt_struct);
        
        // THP bertambah seiring adanya Keluarga & Lama Kerja
        thp = Math.min(C_val, cappedBaseTHP + tt_kel + tt_lk);
    }

    return { thp, gapok, tt, ttt, tt_kel, tt_lk, tt_struct };
}

// =====================================================
// MENU 8: Branch Parameter
// =====================================================
function renderMenu8() {
    const container = document.getElementById('menu8-container');
    if (!container) return;

    const bp = branchParams;
    const U = getActiveUmk();
    const d = deriveGradeStackBranch(U, bp.plafon, bp.sigmaPct, bp.gapPct);
    const rk = v => Math.round(v / 1000) * 1000;

    const sLabel = d.s > 0 ? (d.s * 100).toFixed(2) + '%' : '-';
    const gapRp = d.grades.length >= 2 ? _brFmtCur(rk(d.grades[1].min - d.grades[0].max)) : '-';

    // Anchor Gapok grid
    let gapokCards = '';
    GRADE_MAPPING_BRANCH.forEach(m => {
        const pct = bp.gapokAnchors?.[m.code] !== undefined ? bp.gapokAnchors[m.code] : 75;
        const rp = _brRk(U * pct / 100);
        gapokCards += `
            <div class="p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">${m.code}</label>
                <div class="flex items-center gap-2">
                    <input type="number" min="50" max="200" step="1" value="${pct}"
                        class="input-field py-1 px-2 text-xs font-bold w-16"
                        onchange="onBranchGapokChange('${m.code}', this.value)">
                    <span class="text-[10px] font-bold text-slate-400">%</span>
                </div>
                <div class="text-[10px] text-emerald-700 font-bold mt-1">${_brFmtCur(rp)}</div>
            </div>`;
    });

    // Anchor THP Margin grid
    const defaultMargins = { D1: 10, D2: 30, 'D3-1': 85, 'D33': 90, 'D4-1': 150, 'D43': 155, D5: 235 };
    let thpCards = '';
    GRADE_MAPPING_BRANCH.forEach(m => {
        const overrides = bp.anchorOverrides || {};
        const margin = overrides[m.code] !== undefined ? overrides[m.code] : (defaultMargins[m.code] || 10);
        const gapokPct = bp.gapokAnchors?.[m.code] !== undefined ? bp.gapokAnchors[m.code] : 75;
        const gapokRp = _brRk(U * gapokPct / 100);
        const thpRp = _brRk(gapokRp + gapokRp * margin / 100);
        thpCards += `
            <div class="p-2 border border-slate-200 rounded-lg bg-blue-50/30">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">${m.code}</label>
                <div class="flex items-center gap-2">
                    <input type="number" min="0" max="500" step="1" value="${margin}"
                        class="input-field py-1 px-2 text-xs font-bold w-16"
                        onchange="onBranchAnchorChange('${m.code}', this.value)">
                    <span class="text-[10px] font-bold text-slate-400">%</span>
                </div>
                <div class="text-[10px] text-blue-700 font-bold mt-1">${_brFmtCur(thpRp)}</div>
            </div>`;
    });

    container.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <div>
                <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">Parameter Regional (Branch)</h2>
                <p class="text-xs text-slate-500">Konfigurasi struktur gaji untuk kantor cabang (7 Jenjang).</p>
            </div>
        </div>

        <!-- 1. Lokasi & Plafon -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="card">
                <div class="card-title text-emerald-700">📍 Lokasi & Basis UMK</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Lokasi</label>
                        <select class="select-field font-bold text-sm" onchange="onBranchUMKChange(this.value)">
                            ${UMK_LOCATIONS.map(loc => `<option value="${loc}" ${loc === selectedUMK ? 'selected' : ''}>${loc}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nilai UMK (Editable)</label>
                        <input type="text" class="input-field font-extrabold text-sm text-emerald-700" value="${U.toLocaleString('id-ID')}"
                            onchange="onBranchUmkValueChange(this.value)">
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title text-blue-700">💰 Plafon THP Branch</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Plafon Maks (Rp)</label>
                        <input type="number" min="3000000" max="50000000" step="500000" value="${bp.plafon}"
                            class="input-field font-extrabold text-sm text-blue-700"
                            onchange="onBranchParamChange('plafon', this.value)">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sigma % (Puncak)</label>
                        <input type="number" min="50" max="150" step="1" value="${bp.sigmaPct}"
                            class="input-field font-bold text-sm"
                            onchange="onBranchParamChange('sigmaPct', this.value)">
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. Derivasi Stats -->
        <div class="card border-blue-100 bg-blue-50/20 mb-4">
            <div class="card-title text-xs">Hasil Derivasi Branch</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="stat-card"><div class="stat-value text-blue-700">${d.T.toFixed(3)}x</div><div class="stat-label">Ratio T (σ/U)</div></div>
                <div class="stat-card"><div class="stat-value text-emerald-700">${_brFmtCur(d.sigmaC)}</div><div class="stat-label">Puncak THP</div></div>
                <div class="stat-card"><div class="stat-value text-amber-700">${sLabel}</div><div class="stat-label">Spread Avg</div></div>
                <div class="stat-card"><div class="stat-value text-purple-700">${gapRp}</div><div class="stat-label">Gap D1-D2</div></div>
            </div>
        </div>

            <!-- 3. Gaji Pokok & THP Margin -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                <div class="card">
                    <div class="card-title">📉 Anchor Gaji Pokok (% UMK)</div>
                    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">${gapokCards}</div>
                </div>
                <div class="card">
                    <div class="mb-3">
                        <div class="card-title text-blue-700 m-0 mb-1">📈 Kenaikan THP di Atas Gapok (%)</div>
                        <div class="flex flex-wrap items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                            <span class="text-[10px] font-bold text-blue-800 uppercase">Add Stream Regional (%):</span>
                            <div class="flex items-center gap-3">
                                ${[
                                    { code: 'BL',   label: 'BL' },
                                    { code: 'SPVR', label: 'SPVR' },
                                    { code: 'GRM',  label: 'GRM' }
                                ].map(item => {
                                    const val = typeof bp.addStreamRegionalPct === 'object' && bp.addStreamRegionalPct !== null 
                                        ? (bp.addStreamRegionalPct[item.code] ?? 0) 
                                        : (Number(bp.addStreamRegionalPct) || 0);
                                    return `
                                        <div class="flex items-center gap-1">
                                            <span class="text-[10px] font-bold text-slate-600">${item.label}:</span>
                                            <input type="number" min="0" max="300" step="5" value="${val}" 
                                                class="input-field py-0.5 px-1 text-xs font-bold w-14 text-center border-blue-300"
                                                onchange="onBranchAddStreamChange('${item.code}', this.value)">
                                            <span class="text-[10px] font-bold text-blue-600">%</span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">${thpCards}</div>
                </div>
            </div>

        <!-- 4. Multipliers & Premium -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="card">
                <div class="card-title text-purple-700">⚖️ Sub-Level Multipliers (A–E)</div>
                <div class="flex flex-wrap gap-4">
                    ${['A','B','C','D','E'].map(k => `
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-500">${k}</span>
                            <input type="number" min="0.5" max="5.0" step="0.01" value="${(bp.subLevelMultipliers?.[k] ?? 1).toFixed(2)}"
                                class="input-field py-1 px-2 text-xs font-bold w-16"
                                onchange="onBranchMultiplierChange('${k}', this.value)">
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="card border-amber-200">
                <div class="card-title text-amber-700">⭐ Managerial Premium (D33 & D43)</div>
                <div class="flex items-center gap-3">
                    <input type="number" min="1.0" max="2.0" step="0.01" value="${(bp.managerialPremium || 1.03).toFixed(2)}"
                        class="input-field font-bold w-24"
                        onchange="onBranchParamChange('managerialPremium', this.value)">
                    <span class="text-xs text-slate-500 italic">Pengali THP untuk Branch Leader & Head of Regional.</span>
                </div>
            </div>
        </div>

        <!-- 5. Tunjangan-Tunjangan -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
            <!-- Keluarga -->
            <div class="card">
                <div class="card-title">👨‍👩‍👧 Tunj. Keluarga</div>
                <div class="space-y-3">
                    <div class="flex items-center justify-between gap-4">
                        <label class="text-xs font-semibold text-slate-600">Pasangan + Anak</label>
                        <div class="flex gap-2">
                            <input type="number" min="0" max="1" value="${bp.hasPasangan ?? 1}" class="input-field w-12 text-center" onchange="onBranchParamChange('hasPasangan', this.value)">
                            <input type="number" min="0" max="10" value="${bp.jumlahAnak ?? 2}" class="input-field w-12 text-center" onchange="onBranchParamChange('jumlahAnak', this.value)">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rp / Tanggungan</label>
                        <input type="number" step="10000" value="${bp.tunjKeluargaPerAnak || 100000}" class="input-field font-bold w-full" onchange="onBranchParamChange('tunjKeluargaPerAnak', this.value)">
                    </div>
                </div>
            </div>
            <!-- Masa Kerja -->
            <div class="card">
                <div class="card-title text-amber-700">⏳ Tunj. Masa Kerja (Pukul Rata)</div>
                <div class="space-y-3">
                    <div class="flex items-center justify-between gap-4">
                        <label class="text-xs font-semibold text-slate-600">Masa Kerja (Tahun)</label>
                        <input type="number" min="0" max="40" value="${bp.maxMasaKerjaTahun ?? 0}" class="input-field w-16 text-center font-bold text-amber-700" onchange="onBranchParamChange('maxMasaKerjaTahun', this.value)">
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Dasar (Rp)</label>
                            <input type="number" step="10000" value="${bp.tunjLamaKerjaAwal ?? 50000}" class="input-field text-xs font-bold" onchange="onBranchParamChange('tunjLamaKerjaAwal', this.value)">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kenaikan/Thn</label>
                            <input type="number" step="5000" value="${bp.tunjLamaKerjaPerTahun ?? 75000}" class="input-field text-xs font-bold" onchange="onBranchParamChange('tunjLamaKerjaPerTahun', this.value)">
                        </div>
                    </div>
                </div>
            </div>
            <!-- Struktural -->
            <div class="card">
                <div class="flex items-center justify-between mb-2">
                    <div class="card-title text-purple-700 m-0">🏢 Tunj. Struktural & Treatment</div>
                    <div class="flex items-center gap-1 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        <span class="text-[9px] font-bold text-purple-800">Multiplier (Komparasi Opsi 2B):</span>
                        📋
                        Perbandingan${[1, 2, 3, 4, 5].map(m => `
                            <button type="button" onclick="applyStructuralMultiplier(${m})" 
                                class="px-1.5 py-0.5 text-[9px] font-bold rounded ${ (bp.structMultiplier || 1) === m ? 'bg-purple-700 text-white' : 'bg-white text-purple-700 border border-purple-300 hover:bg-purple-100'}">x${m}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="grid grid-cols-3 gap-2">
                        ${[
                            { code: 'BL',   label: 'BL (Branch Leader)',  fallback: 'A', defaultVal: 200000 },
                            { code: 'SPVR', label: 'SPVR (Regional)',    fallback: 'B', defaultVal: 400000 },
                            { code: 'GRM',  label: 'GRM (General Reg)',   fallback: 'C', defaultVal: 600000 }
                        ].map(item => {
                            const val = bp.structuralAllowance?.[item.code] !== undefined 
                                ? bp.structuralAllowance[item.code] 
                                : (bp.structuralAllowance?.[item.fallback] !== undefined ? bp.structuralAllowance[item.fallback] : item.defaultVal);
                            return `
                                <div>
                                    <label class="block text-[9px] font-bold text-slate-500 text-center uppercase mb-1">${item.label}</label>
                                    <div class="text-[9px] text-slate-400 text-center mb-0.5">${_brFmtCur(item.defaultVal)}</div>
                                    <input type="number" step="50000" value="${val}" class="input-field py-1 px-1 text-[10px] font-bold text-center" onchange="onBranchStructuralChange('${item.code}', this.value)">
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                        <input type="checkbox" id="br-str-d31" ${bp.enableStrukturalD31 !== false ? 'checked' : ''} onchange="onBranchParamChange('enableStrukturalD31', this.checked)">
                        <label for="br-str-d31" class="text-[10px] font-bold text-slate-600">D3-1 Struktural ON</label>
                    </div>
                </div>
            </div>
        </div>

        <!-- 6. Perlakuan Tunjangan -->
        <div class="card border-blue-200 bg-blue-50/10 mb-4">
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 text-center">Perlakuan Tunjangan terhadap Paket THP</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <label class="flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer bg-blue-50 border-blue-300">
                    <input type="radio" name="br-struct-treatment" value="hybrid" checked class="mt-0.5" onchange="onBranchParamChange('structTreatment', this.value)">
                    <div>
                        <span class="text-xs font-bold text-slate-800 block">Opsi A (Hybrid - Kesepakatan)</span>
                        <span class="text-[10px] text-slate-500 block leading-tight">Struktural masuk Paket (potong TTT). Keluarga & Masa Kerja menambah THP.</span>
                    </div>
                </label>
                <!-- Opsi B & C disembunyikan -->
            </div>
        </div>

        <div class="card border-dashed border-slate-300 opacity-60 mb-6">
            <div class="card-title">⚠️ Overtime Teknisi (Coming Soon)</div>
            <div class="text-[10px] text-slate-500 italic py-2 text-center text-balance">Modul perhitungan lembur teknisi lapangan sedang dalam pengembangan.</div>
        </div>

        <!-- Action Buttons di Bawah -->
        <div class="flex justify-end gap-3 mt-6">
            <button onclick="resetBranchParams()" class="btn-secondary py-2 px-4 text-xs font-semibold">Reset Default</button>
            <button onclick="saveBranchParams()" class="btn-primary py-2 px-5 text-xs font-bold shadow-lg shadow-blue-200">Simpan Parameter</button>
        </div>
    `;
}

// =====================================================
// MENU 9: Branch Simulation & Comparison
// =====================================================
function applyStructuralMultiplier(m) {
    branchParams.structMultiplier = m;
    saveBranchParams();
    if (typeof currentMenu !== 'undefined') {
        if (currentMenu === 'menu8') renderMenu8();
        else if (currentMenu === 'menu9') renderMenu9();
    }
}

function renderMenu9() {
    const container = document.getElementById('menu9-container');
    if (!container) return;

    const bp = branchParams;
    const U = getActiveUmk();
    const C = bp.plafon;
    const d = deriveGradeStackBranch(U, C, bp.sigmaPct, bp.gapPct);
    const subLabels = ['A','B','C','D','E'];
    const treatmentLabel = bp.structTreatment === 'squeeze' ? 'Opsi C (Full Squeeze)' :
                           bp.structTreatment === 'additive' ? 'Opsi B (Full Additive)' : 'Opsi A (Hybrid)';

    // Active View Tab: 'detail' or 'comparison'
    const activeTab = window._branchSimTab || 'comparison';

    // Build Detailed Rows
    let rowsHTML = '';
    d.grades.forEach(gr => {
        gr.subs.forEach((sub, subIdx) => {
            const subLabel = subLabels[subIdx];
            const comps = calcBranchCellComponents(sub.rp, subIdx, gr.label);
            const gapokPct = (comps.gapok / U) * 100;
            const ratio = calc75Ratio(comps.gapok, comps.tt);
            const ratioText = ratio.toFixed(1) + '%';
            const passRule = ratio >= 75;
            const badgeClass = subIdx === 0 ? 'bg-red-100 text-red-700' : subIdx === 4 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

            const lkYears = bp.maxMasaKerjaTahun || 0;
            const lkLabel = `<br><span class="text-[9px] font-sans text-slate-400 font-normal">(${lkYears} thn)</span>`;

            rowsHTML += `
                <tr class="hover:bg-slate-50 border-b border-slate-200 font-mono text-xs text-center">
                    <td class="py-1.5 px-2 border border-slate-300 font-sans font-bold text-slate-900 text-center whitespace-nowrap">${gr.name}</td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center font-sans">
                        <span class="font-bold">${subLabel}</span>
                    </td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center font-sans">
                        <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeClass}">${subLabel}</span>
                    </td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-900 bg-blue-50/30">${_brFmtCur(comps.thp)}<br><span class="text-[10px] font-sans text-slate-500 font-normal">+${((comps.thp / comps.gapok - 1) * 100).toFixed(1)}% dari Gapok</span></td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center font-semibold text-emerald-800 bg-emerald-50/30">${_brFmtCur(comps.gapok)}<br><span class="text-[10px] font-sans text-slate-500 font-normal">${_brFmtPct(gapokPct)} UMK</span></td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center text-slate-700 bg-slate-50 font-medium">${_brFmtCur(comps.tt_struct)}</td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center text-slate-700 bg-slate-50 font-medium">${_brFmtCur(comps.tt_kel)}</td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center text-amber-800 bg-amber-50/10 font-bold">${_brFmtCur(comps.tt_lk)}${lkLabel}</td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center text-orange-850 bg-orange-50/30 font-semibold">${_brFmtCur(comps.ttt)}</td>
                    <td class="py-1.5 px-2 border border-slate-300 text-center font-sans">
                        <span class="font-bold ${passRule ? 'text-emerald-600' : 'text-amber-600'}">${ratioText}</span>
                    </td>
                </tr>`;
        });
    });

    // Build Executive Comparison Table (Opsi 1 vs Opsi 2A vs Opsi 2B)
    const keyGrades = ['D33', 'D43', 'D5'];
    let compRowsHTML = '';
    
    keyGrades.forEach(code => {
        const jInfo = JENJANG_LIST_BRANCH.find(j => j.code === code);
        const name = jInfo ? jInfo.name : code;
        
        // Base values dari Parameter Branch (Menu 8)
        const gapokPct = bp.gapokAnchors?.[code] ?? 75;
        const gapokRp = _brRk(U * gapokPct / 100);
        
        // Base Margin THP dari Parameter Branch (Menu 8)
        const defaultMargins = { D1: 10, D2: 30, 'D3-1': 85, 'D33': 90, 'D4-1': 150, 'D43': 155, D5: 235 };
        const overrides = bp.anchorOverrides || {};
        const marginBase = overrides[code] !== undefined ? overrides[code] : (defaultMargins[code] || 10);

        // TT Kel & Masa kerja
        const hasPas = bp.hasPasangan ?? 1;
        const anak = bp.jumlahAnak ?? 2;
        const tt_kel = _brRk((hasPas + anak) * (bp.tunjKeluargaPerAnak || 100000));
        const years = bp.maxMasaKerjaTahun || 0;
        const tt_lk = years > 0 ? _brRk((bp.tunjLamaKerjaAwal ?? 50000) + (years * (bp.tunjLamaKerjaPerTahun ?? 75000))) : 0;
        const baseTT_other = tt_kel + tt_lk;

        // Base Structural allowance dari Parameter Branch (Menu 8)
        const grp = jInfo?.structuralGroup || 'BL';
        const baseStructNominal = bp.structuralAllowance?.[grp] !== undefined 
            ? bp.structuralAllowance[grp] 
            : (grp === 'BL' ? (bp.structuralAllowance?.['A'] ?? 200000) :
               grp === 'SPVR' ? (bp.structuralAllowance?.['B'] ?? 400000) :
               grp === 'GRM' ? (bp.structuralAllowance?.['C'] ?? 600000) : 200000);

        // OPSI 1: Baseline Parameter Murni (No Add Stream, Struct Multiplier x1)
        const thpOp1 = Math.min(C, gapokRp + _brRk(gapokRp * marginBase / 100));
        const ttStructOp1 = baseStructNominal * 1;
        const ttTotalOp1 = baseTT_other + ttStructOp1;
        const tttOp1 = Math.max(0, thpOp1 - gapokRp - ttStructOp1);

        // OPSI 2A: Add Stream Regional % (Uncapped: Tambahan % khusus per jenjang BL, SPVR, GRM)
        const addPct = typeof bp.addStreamRegionalPct === 'object' && bp.addStreamRegionalPct !== null
            ? (bp.addStreamRegionalPct[grp] ?? 0)
            : (Number(bp.addStreamRegionalPct) || 0);
        const extraTHPOp2A = _brRk(thpOp1 * addPct / 100);
        const thpOp2A = thpOp1 + extraTHPOp2A; // Los tanpa pembatasan Plafon C
        const ttStructOp2A = baseStructNominal * 1;
        const ttTotalOp2A = baseTT_other + ttStructOp2A;
        const tttOp2A = Math.max(0, thpOp2A - gapokRp - ttStructOp2A);

        // OPSI 2B: Multiplier Tunjangan Struktural (Uncapped: THP Bertambah NAIK Murni seiring Multiplier x1, x2, x3)
        const multOp2B = bp.structMultiplier || 1;
        const ttStructOp2B = baseStructNominal * multOp2B;
        const ttTotalOp2B = baseTT_other + ttStructOp2B;
        const deltaStruct = ttStructOp2B - ttStructOp1;
        const thpOp2B = thpOp1 + deltaStruct; // Los tanpa pembatasan Plafon C
        const tttOp2B = tttOp1; // TTT tetap, THP bertambah murni seiring kenaikan Struktural

        // Gaps selisih THP dari Opsi 1
        const gapOp1_2A = thpOp2A - thpOp1;
        const gapOp1_2B = thpOp2B - thpOp1;

        compRowsHTML += `
            <tr class="hover:bg-slate-50 border-b border-slate-200 text-xs">
                <td class="py-2.5 px-3 font-bold text-slate-800 border border-slate-300 bg-slate-100 text-left">${name}</td>
                
                <!-- Opsi 1 (Abu-abu) -->
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-slate-700 bg-slate-50">${_brFmtCur(gapokRp)}</td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-slate-700 bg-slate-50">${_brFmtCur(ttTotalOp1)}</td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-slate-600 bg-slate-50">${_brFmtCur(tttOp1)}</td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono font-bold text-slate-900 bg-slate-200">${_brFmtCur(thpOp1)}</td>
                
                <!-- Opsi 2A (Biru) -->
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-blue-900 bg-blue-50/40">${_brFmtCur(gapokRp)}</td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-blue-900 bg-blue-50/40">${_brFmtCur(ttTotalOp2A)}</td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-blue-800 bg-blue-50/40 font-semibold">${_brFmtCur(tttOp2A)}</td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono font-bold text-blue-950 bg-blue-100/80">${_brFmtCur(thpOp2A)}<br><span class="text-[9px] text-blue-700 font-sans font-semibold">(+${_brFmtCur(gapOp1_2A)})</span></td>
                
                <!-- Opsi 2B (Ungu) -->
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-purple-950 bg-purple-50/40">${_brFmtCur(gapokRp)}</td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-purple-950 bg-purple-50/40 font-bold">${_brFmtCur(ttTotalOp2B)}<br><span class="text-[9px] text-purple-700 font-sans font-medium">(T. Struktural ${_brFmtCur(ttStructOp2B)})</span></td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono text-purple-900 bg-purple-50/40 font-bold">${_brFmtCur(tttOp2B)}</td>
                <td class="py-2.5 px-2 border border-slate-300 text-center font-mono font-extrabold text-purple-950 bg-purple-100/90">${_brFmtCur(thpOp2B)}<br><span class="text-[9px] text-purple-800 font-sans font-bold">(+${_brFmtCur(gapOp1_2B)})</span></td>
            </tr>
        `;
    });

    container.innerHTML = `
        ${d.warning ? '<div class="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded mb-4">' + d.warning + '</div>' : ''}
        
        <div class="flex items-center justify-between mb-6">
            <div>
                <h2 class="text-xl font-extrabold text-slate-800 tracking-tight">Simulasi & Analisis Komparatif Branch (Regional)</h2>
                <p class="text-xs text-slate-500 italic">Perbandingan 3 Opsi Formulasi Struktur Skala Upah Regional</p>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex bg-slate-200 p-1 rounded-lg">
                    <button onclick="window._branchSimTab='comparison'; renderMenu9();" 
                        class="px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'comparison' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">📊 Komparasi 3 Opsi</button>
                    <button onclick="window._branchSimTab='detail'; renderMenu9();" 
                        class="px-3 py-1 text-xs font-bold rounded-md transition-all ${activeTab === 'detail' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">📋 Table Detail Grid (A–E)</button>
                </div>
                <button onclick="exportBranchCSV()" class="btn-secondary py-1.5 px-4 text-xs font-bold">Export CSV</button>
            </div>
        </div>

        <!-- Filter Bar -->
        <div class="card mb-4 border-slate-200 shadow-sm">
            <div class="card-title text-xs">Filter & Info Simulasi Branch</div>
            <div class="flex flex-wrap items-end gap-4">
                <div class="flex-grow min-w-[200px]">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lokasi UMK Aktif</label>
                    <div class="input-field bg-slate-100 font-bold text-slate-700 border-none">${selectedUMK} — ${_brFmtCur(U)}</div>
                </div>
                <div class="flex-grow min-w-[200px]">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Model & Plafon Branch</label>
                    <div class="input-field bg-slate-100 font-bold text-slate-700 border-none text-balance">${treatmentLabel} | Plafon ${_brFmtCur(C)}</div>
                </div>
            </div>
        </div>

        ${activeTab === 'comparison' ? `
            <!-- COMPARISON VIEW -->
            <div class="card p-0 overflow-hidden border-slate-300 shadow-xl mb-6">
                <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-sm">Matriks Perbandingan 3 Opsi Strategis (Analisis Gap & Komponen)</h3>
                        <p class="text-[11px] text-slate-300 mt-0.5">Analisis dampak keuangan dan restrukturisasi THP untuk Jabatan Manajerial Regional (BL, SPVR, GRM)</p>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full border-collapse">
                        <thead>
                            <tr class="bg-slate-800 text-white text-[10px] uppercase tracking-widest font-bold text-center">
                                <th rowspan="2" class="py-3 px-3 border border-slate-700 text-left bg-slate-900">Jenjang</th>
                                <th colspan="4" class="py-2 px-2 border border-slate-700 bg-slate-700">Opsi 1: Disamakan Full HO</th>
                                <th colspan="4" class="py-2 px-2 border border-slate-700 bg-blue-900">Opsi 2A: Add Stream Regional (Per Jenjang)</th>
                                <th colspan="4" class="py-2 px-2 border border-slate-700 bg-purple-900">Opsi 2B: Multiplier Struktural (x${bp.structMultiplier || 1})</th>
                            </tr>
                            <tr class="bg-slate-700 text-white text-[9px] uppercase tracking-wider font-bold text-center">
                                <!-- Opsi 1 (Abu-abu) -->
                                <th class="py-2 px-2 border border-slate-600 bg-slate-700">Gapok</th>
                                <th class="py-2 px-2 border border-slate-600 bg-slate-700">T. Tetap (TT)</th>
                                <th class="py-2 px-2 border border-slate-600 bg-slate-700">TTT</th>
                                <th class="py-2 px-2 border border-slate-600 bg-slate-800 font-extrabold">THP Max</th>

                                <!-- Opsi 2A (Biru) -->
                                <th class="py-2 px-2 border border-slate-600 bg-blue-900/90">Gapok</th>
                                <th class="py-2 px-2 border border-slate-600 bg-blue-900/90">T. Tetap (TT)</th>
                                <th class="py-2 px-2 border border-slate-600 bg-blue-900/90">TTT</th>
                                <th class="py-2 px-2 border border-slate-600 bg-blue-950 font-extrabold">THP Max</th>

                                <!-- Opsi 2B (Ungu) -->
                                <th class="py-2 px-2 border border-slate-600 bg-purple-900/90">Gapok</th>
                                <th class="py-2 px-2 border border-slate-600 bg-purple-900/90">T. Tetap (TT)</th>
                                <th class="py-2 px-2 border border-slate-600 bg-purple-900/90">TTT (Variabel)</th>
                                <th class="py-2 px-2 border border-slate-600 bg-purple-950 font-extrabold">THP Max</th>
                            </tr>
                        </thead>
                        <tbody>${compRowsHTML}</tbody>
                    </table>
                </div>
            </div>

            <!-- EXECUTIVE ANALYSIS CARDS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="card border-slate-300 bg-slate-50">
                    <h4 class="font-bold text-xs text-slate-800 uppercase mb-2">📌 Opsi 1: Disamakan Full HO</h4>
                    <p class="text-xs text-slate-600 leading-relaxed mb-2">Gaji Pokok & THP disamakan persis dengan HO. Nominal SPVR D43 terkunci di Rp 8.500.000,-.</p>
                    <div class="text-[11px] font-semibold text-red-600 bg-red-50 p-2 rounded border border-red-200">⚠️ Risiko: SPVR eksisting Rp 13jt mengalami sengketa penurunan gaji rutin.</div>
                </div>
                <div class="card border-blue-200 bg-blue-50/30">
                    <h4 class="font-bold text-xs text-blue-800 uppercase mb-2">📈 Opsi 2A: Add Stream Regional</h4>
                    <p class="text-xs text-slate-600 leading-relaxed mb-2">Menaikkan persentase THP margin di atas standar HO untuk masing-masing jenjang (BL, SPVR, GRM).</p>
                    <div class="text-[11px] font-semibold text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">⚠️ Risiko: Beban biaya tetap (fixed cost) rutin membengkak walau cabang rugi.</div>
                </div>
                <div class="card border-purple-300 bg-purple-50/40">
                    <h4 class="font-bold text-xs text-purple-900 uppercase mb-2">📌 Opsi 2B: Multiplier Struktural x${bp.structMultiplier || 1}</h4>
                    <p class="text-xs text-slate-600 leading-relaxed mb-2">Tunjangan Tetap Struktural dikali x${bp.structMultiplier || 1} (Struct = ${_brFmtCur(1200000)}), selisih ke Rp 13jt dialihkan ke TTT Variabel.</p>
                    <div class="text-[11px] font-bold text-purple-900 bg-purple-100 p-2 rounded border border-purple-200">✅ Win-Win: Aman anggaran perusahaan & mendorong kinerja profit cabang.</div>
                </div>
            </div>
        ` : `
            <!-- SIMULATION TABLE VIEW (DETAIL A-E) -->
            <div class="card p-0 overflow-hidden border-slate-300 shadow-xl mb-6">
                <div class="overflow-x-auto">
                    <table class="min-w-full border-collapse">
                        <thead>
                            <tr class="bg-slate-800 text-white text-[10px] uppercase tracking-widest font-bold">
                                <th class="py-3 px-2 border border-slate-700">Jenjang Regional</th>
                                <th class="py-3 px-2 border border-slate-700">Sub</th>
                                <th class="py-3 px-2 border border-slate-700">Label</th>
                                <th class="py-3 px-2 border border-slate-700 bg-blue-900/50">Total THP</th>
                                <th class="py-3 px-2 border border-slate-700 bg-emerald-900/50">Gaji Pokok</th>
                                <th class="py-3 px-2 border border-slate-700">T. Struktural</th>
                                <th class="py-3 px-2 border border-slate-700">T. Keluarga</th>
                                <th class="py-3 px-2 border border-slate-700">T. Masa Kerja</th>
                                <th class="py-3 px-2 border border-slate-700 bg-orange-900/50 text-orange-200">T. Profesional (TTT)</th>
                                <th class="py-3 px-2 border border-slate-700">PP 36/21</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHTML}</tbody>
                    </table>
                </div>
            </div>
        `}

        <div class="mt-6 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 opacity-70">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-xl">⚠️</div>
                <div>
                    <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Overtime Teknisi</h4>
                    <p class="text-[10px] text-slate-500 italic leading-relaxed">Modul perhitungan lembur (Overtime) riil berdasarkan jam kerja teknisi lapangan sedang dalam tahap finalisasi konsep dan akan segera ditambahkan sebagai kolom Tunjangan Tidak Tetap tambahan.</p>
                </div>
            </div>
        </div>
    `;
}

// =====================================================
// Branch Event Handlers
// =====================================================
function onBranchParamChange(key, value) {
    const numKeys = ['plafon','sigmaPct','gapPct','step','managerialPremium',
                     'hasPasangan','jumlahAnak','tunjKeluargaPerAnak',
                     'maxMasaKerjaTahun','tunjLamaKerjaAwal','tunjLamaKerjaPerTahun','extraManajerialPct',
                     'addStreamRegionalPct','structMultiplier'];
    if (numKeys.includes(key)) {
        branchParams[key] = Number(value) || 0;
    } else if (key === 'enableStrukturalD31' || key === 'enableStrukturalD41') {
        branchParams[key] = !!value;
    } else {
        branchParams[key] = value;
    }
    saveBranchParams();
    const curMenu = typeof currentMenu !== 'undefined' ? currentMenu : (window.currentMenu || '');
    if (curMenu === 'menu8') renderMenu8();
    else if (curMenu === 'menu9') renderMenu9();
}

function onBranchAddStreamChange(groupCode, value) {
    if (typeof branchParams.addStreamRegionalPct !== 'object' || branchParams.addStreamRegionalPct === null) {
        const oldVal = Number(branchParams.addStreamRegionalPct) || 0;
        branchParams.addStreamRegionalPct = { BL: oldVal, SPVR: oldVal, GRM: oldVal };
    }
    const val = Number(value);
    branchParams.addStreamRegionalPct[groupCode] = isNaN(val) ? 0 : val;
    saveBranchParams();
    const curMenu = typeof currentMenu !== 'undefined' ? currentMenu : (window.currentMenu || '');
    if (curMenu === 'menu8') renderMenu8();
    else if (curMenu === 'menu9') renderMenu9();
}

function onBranchGapokChange(gradeCode, value) {
    if (!branchParams.gapokAnchors) branchParams.gapokAnchors = {};
    const val = Number(value);
    branchParams.gapokAnchors[gradeCode] = isNaN(val) ? 75 : val;
    saveBranchParams();
    const curMenu = typeof currentMenu !== 'undefined' ? currentMenu : (window.currentMenu || '');
    if (curMenu === 'menu8') renderMenu8();
    else if (curMenu === 'menu9') renderMenu9();
}

function onBranchAnchorChange(gradeCode, value) {
    if (!branchParams.anchorOverrides) branchParams.anchorOverrides = {};
    const val = Number(value);
    branchParams.anchorOverrides[gradeCode] = isNaN(val) ? 0 : val;
    saveBranchParams();
    const curMenu = typeof currentMenu !== 'undefined' ? currentMenu : (window.currentMenu || '');
    if (curMenu === 'menu8') renderMenu8();
    else if (curMenu === 'menu9') renderMenu9();
}

function onBranchMultiplierChange(subKey, value) {
    if (!branchParams.subLevelMultipliers) branchParams.subLevelMultipliers = {};
    const val = Number(value);
    branchParams.subLevelMultipliers[subKey] = isNaN(val) ? 1 : val;
    saveBranchParams();
    const curMenu = typeof currentMenu !== 'undefined' ? currentMenu : (window.currentMenu || '');
    if (curMenu === 'menu8') renderMenu8();
    else if (curMenu === 'menu9') renderMenu9();
}

function onBranchStructuralChange(group, value) {
    if (!branchParams.structuralAllowance) branchParams.structuralAllowance = {};
    const val = Number(value);
    branchParams.structuralAllowance[group] = isNaN(val) ? 0 : val;
    saveBranchParams();
    const curMenu = typeof currentMenu !== 'undefined' ? currentMenu : (window.currentMenu || '');
    if (curMenu === 'menu8') renderMenu8();
    else if (curMenu === 'menu9') renderMenu9();
}

function onBranchUMKChange(value) {
    selectedUMK = value;
    customUmkValue = null;
    saveBranchParams();
    if (currentMenu === 'menu8') renderMenu8();
    else if (currentMenu === 'menu9') renderMenu9();
}

function onBranchUmkValueChange(rawValue) {
    const cleaned = String(rawValue).replace(/[^\d]/g, '');
    const numVal = Number(cleaned);
    if (numVal > 0) {
        customUmkValue = numVal;
    }
    saveBranchParams();
    if (currentMenu === 'menu8') renderMenu8();
    else if (currentMenu === 'menu9') renderMenu9();
}

function saveBranchParams() {
    if (typeof saveToStorage === 'function') saveToStorage();
}

function resetBranchParams() {
    if (!confirm('Reset parameter Branch ke default?')) return;
    branchParams = JSON.parse(JSON.stringify(DEFAULT_BRANCH_PARAMS));
    saveBranchParams();
    if (currentMenu === 'menu8') renderMenu8();
    else if (currentMenu === 'menu9') renderMenu9();
}

// =====================================================
// Branch CSV Export
// =====================================================
function exportBranchCSV() {
    const bp = branchParams;
    const U = getActiveUmk();
    const d = deriveGradeStackBranch(U, bp.plafon, bp.sigmaPct, bp.gapPct);
    const subLabels = ['A','B','C','D','E'];

    const headers = ['Jenjang','Sub','THP','Gapok','T.Struktural','T.Keluarga','T.LamaKerja','T.Profesional','Rasio75'];
    const rows = [];

    d.grades.forEach(gr => {
        gr.subs.forEach((sub, subIdx) => {
            const comps = calcBranchCellComponents(sub.rp, subIdx, gr.label);
            const ratio = calc75Ratio(comps.gapok, comps.tt);
            rows.push([gr.name, subLabels[subIdx], comps.thp, comps.gapok, comps.tt_struct, comps.tt_kel, comps.tt_lk, comps.ttt, ratio.toFixed(1) + '%'].join(','));
        });
    });

    const csv = [headers.join(','), ...rows].join('\n');
    if (typeof downloadCSV === 'function') {
        downloadCSV(csv, 'simulasi_branch.csv');
    } else {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = 'simulasi_branch.csv';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
}

// Expose to global scope
window.renderMenu8 = renderMenu8;
window.renderMenu9 = renderMenu9;
window.onBranchParamChange = onBranchParamChange;
window.onBranchGapokChange = onBranchGapokChange;
window.onBranchAnchorChange = onBranchAnchorChange;
window.onBranchMultiplierChange = onBranchMultiplierChange;
window.onBranchStructuralChange = onBranchStructuralChange;
window.onBranchUMKChange = onBranchUMKChange;
window.onBranchUmkValueChange = onBranchUmkValueChange;
window.saveBranchParams = saveBranchParams;
window.resetBranchParams = resetBranchParams;
window.exportBranchCSV = exportBranchCSV;

console.log("Branch.js Loaded Successfully");
