// =====================================================
// UI.JS — DOM Rendering, Sidebar, Tables, All 5 Menus
// =====================================================

// ---- State ----
let currentMenu = 'menu1';
let selectedJenjang = 'D3-1';
let selectedUMK = 'Kota Surabaya';
let customUmkValue = null; // null = use location default; number = user override
let _umkDebounceTimer = null;
let jvScores = {};   // { 'D1': {K:2,E:1,...}, ... }
let params = {};
let compLocations = ['Kota Surabaya', 'Kota Malang'];
let currentScheme = 'skema-lama';
let paramMode = 'manual';        // 'manual' | 'watson' — sumber parameter anchor
let watsonResult = null;         // hasil terakhir calcWatsonAnchors (untuk panel Menu 2)
let _watsonRecalcTimer = null;   // debounce auto-recompute saat skor JV berubah
let approach = 'lama';           // 'lama' | 'baru' — pendekatan utama
let currentMenu7Tab = 'solver';
let selectedMenu7Cell = { gradeIdx: 2, subIdx: 2 };
let menu7SearchQuery = '';

// Helper: get active UMK value (custom override or location default)
function getActiveUmk() {
    console.log('[UMK DEBUG] getActiveUmk: customUmkValue =', customUmkValue, ', selectedUMK =', selectedUMK, ', UMK_DATA[selectedUMK] =', UMK_DATA[selectedUMK]);
    if (customUmkValue !== null && !isNaN(customUmkValue) && customUmkValue > 0) {
        return customUmkValue;
    }
    return UMK_DATA[selectedUMK] || 3000000;
}

let approachBaruParams = {
    plafon: 15000000,
    sigmaPct: 85,
    gapPct: 2,
    step: 2,
    modelType: 'squeeze', // 'squeeze' | 'additive'
    managerialPremium: 1.03,
    composition: { gapok: 75 },
    hasPasangan: 1,
    jumlahAnak: 2,
    tunjKeluargaPerAnak: 100000,
    maxMasaKerjaTahun: 5,
    tunjLamaKerjaPerTahun: 50000,
    structuralAllowance: { A: 200000, B: 400000, C: 600000 },
    extraManajerialPct: 50
};

// ---- Sidebar Navigation ----
function syncSchemeToggleWrapper() {
    const el = document.getElementById('scheme-toggle-wrapper');
    if (!el) return;
    // Gunakan style.display saja (bukan class Tailwind 'hidden')
    // agar satu mekanisme: approach baru sembunyikan, approach lama tampilkan
    el.style.display = approach === 'baru' ? 'none' : '';
}

// ---- Approach Toggle (Pendekatan Lama / Baru) ----
function toggleApproach(value) {
    approach = value;
    // Update button states
    const btnAL = document.getElementById('btn-approach-lama');
    const btnAB = document.getElementById('btn-approach-baru');
    if (btnAL) btnAL.classList.toggle('active', value === 'lama');
    if (btnAB) btnAB.classList.toggle('active', value === 'baru');
    // Update sidebar & scheme toggle visibility
    updateSidebarForApproach();
    // Persist
    saveToStorage();
    // Redirect if needed: menu1 tidak ada di pendekatan baru
    if (value === 'baru' && currentMenu === 'menu1') {
        showMenu('menu2');
    } else {
        showMenu(currentMenu);
    }
}

function updateSidebarForApproach() {
    // Menu 1 (Watson) hanya untuk pendekatan lama
    const menu1Item = document.querySelector('.sidebar-item[data-menu="menu1"]');
    if (menu1Item) {
        menu1Item.style.display = approach === 'baru' ? 'none' : '';
    }
    // Scheme toggle (skema-lama / skema-gapok) hanya untuk pendekatan lama
    const schemeWrapper = document.getElementById('scheme-toggle-wrapper');
    if (schemeWrapper) {
        schemeWrapper.style.display = approach === 'baru' ? 'none' : '';
    }
}

function showMenu(menuId) {
    // Pendekatan baru: menu1 (Watson) tidak tersedia, redirect ke menu2
    if (approach === 'baru' && menuId === 'menu1') {
        menuId = 'menu2';
    }
    currentMenu = menuId;
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
    const section = document.getElementById('section-' + menuId);
    if (section) section.classList.remove('hidden');

    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`.sidebar-item[data-menu="${menuId}"]`);
    if (active) active.classList.add('active');

    syncSchemeToggleWrapper();

    // Render the active menu
    switch (menuId) {
        case 'menu1': renderMenu1(); break;
        case 'menu2': renderMenu2(); break;
        case 'menu3': renderMenu3(); break;
        case 'menu4': renderMenu4(); break;
        case 'menu5': renderMenu5(); break;
        case 'menu6': renderMenu6(); break;
        case 'menu7': renderMenu7(); break;
    }
}

// =====================================================
// MENU 1: Watson Wyatt Job Evaluation
// =====================================================
function renderMenu1() {
    const container = document.getElementById('menu1-container');
    if (!container) return;

    // Ensure scores exist for all jenjang variants
    Object.keys(DEFAULT_SCORES).forEach(key => {
        if (!jvScores[key]) jvScores[key] = { ...DEFAULT_SCORES[key] };
    });

    const scores = jvScores[selectedJenjang] || {};
    const jv = calcJV(scores);

    container.innerHTML = `
        <div class="card">
            <div class="card-title"><span>📊</span> Watson Wyatt Job Evaluation — 10 Faktor</div>
            <div class="card-desc">
                Pilih jenjang jabatan, lalu atur skor 1-5 untuk setiap faktor. Job Value (JV) dihitung otomatis.
                <br><strong>Formula: JV = K×15 + E×10 + S×12 + D×15 + C×10 + I×8 + X×8 + V×8 + N×5 + R×9</strong>
            </div>
        </div>

        <div class="flex flex-wrap items-end gap-4 mb-4">
            <div class="flex-1 min-w-[200px]">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pilih Jenjang</label>
                <select id="m1-jenjang" class="select-field">
                    ${JENJANG_LIST.map(j => `<option value="${j.code}" ${j.code === selectedJenjang ? 'selected' : ''}>${j.name}</option>`).join('')}
                </select>
            </div>
            <button onclick="resetScores()" class="btn-secondary">Reset Skor</button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Factor Input Table -->
            <div class="lg:col-span-2 card">
                <div class="card-title"><span>📝</span> Faktor & Skor</div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="border-b-2 border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th class="py-2 px-2">Huruf</th>
                                <th class="py-2 px-2">Faktor</th>
                                <th class="py-2 px-2 text-center">Bobot</th>
                                <th class="py-2 px-2 text-center">Skor (1-5)</th>
                                <th class="py-2 px-2 text-right">Weighted Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${FACTORS.map(f => {
                                const s = scores[f.code] || 3;
                                const ws = s * f.weight;
                                return `
                                    <tr class="hover:bg-slate-50 border-b border-slate-100">
                                        <td class="py-2 px-2 font-bold text-blue-600 text-sm">${f.code}</td>
                                        <td class="py-2 px-2 text-sm text-slate-800">${f.name}</td>
                                        <td class="py-2 px-2 text-center">
                                            <span class="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded">${f.weight}%</span>
                                        </td>
                                        <td class="py-2 px-2 text-center">
                                            <input type="number" min="1" max="5" value="${s}"
                                                class="score-input"
                                                data-factor="${f.code}"
                                                oninput="onScoreChange('${f.code}', this.value)">
                                        </td>
                                        <td class="py-2 px-2 text-right text-sm font-semibold text-slate-700" id="ws-${f.code}">${ws}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="border-t-2 border-slate-300 font-bold text-slate-900">
                                <td colspan="2" class="py-2 px-2">TOTAL (JV)</td>
                                <td class="py-2 px-2 text-center">100%</td>
                                <td></td>
                                <td class="py-2 px-2 text-right text-lg" id="jv-total">${jv}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Right Panel: JV Display + Radar Chart -->
            <div class="space-y-6">
                <div class="jv-display">
                    <div class="jv-label">JOB VALUE (JV)</div>
                    <div class="jv-value" id="jv-display">${jv}</div>
                    <div class="text-xs text-slate-400 mt-1">
                        JV Ratio: <span id="jv-ratio" class="text-white font-semibold">${((jv / 500) * 100).toFixed(1)}%</span>
                    </div>
                    <div class="text-xs text-slate-400 mt-1">
                        Loading: <span id="loading-display" class="text-white font-semibold">${formatPercent(getLoading(selectedJenjang))}</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-title text-sm"><span>🎯</span> Radar Chart</div>
                    <div class="chart-container">
                        <canvas id="radar-chart"></canvas>
                    </div>
                    <div class="mt-3 text-[10px] text-slate-400 text-center">
                        ${FACTORS.map(f => `<span class="font-bold text-blue-600">${f.code}</span>=${f.name}`).join(' | ')}
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-4 flex justify-end">
            <button onclick="saveJV()" class="btn-primary">Simpan Skor JV</button>
        </div>
    `;

    // Bind jenjang selector
    document.getElementById('m1-jenjang').addEventListener('change', (e) => {
        selectedJenjang = e.target.value;
        renderMenu1();
    });

    // Render radar chart
    renderRadarChart(scores);
}

function onScoreChange(factorCode, value) {
    let val = parseInt(value) || 3;
    val = Math.min(5, Math.max(1, val));

    if (!jvScores[selectedJenjang]) jvScores[selectedJenjang] = { ...DEFAULT_SCORES[selectedJenjang] };
    jvScores[selectedJenjang][factorCode] = val;

    // Update weighted score display
    const ws = val * FACTORS.find(f => f.code === factorCode).weight;
    const wsEl = document.getElementById('ws-' + factorCode);
    if (wsEl) wsEl.textContent = ws;

    // Recalculate JV
    const jv = calcJV(jvScores[selectedJenjang]);
    document.getElementById('jv-total').textContent = jv;
    document.getElementById('jv-display').textContent = jv;
    document.getElementById('jv-ratio').textContent = ((jv / 500) * 100).toFixed(1) + '%';

    // Update radar chart
    renderRadarChart(jvScores[selectedJenjang]);

    // JV berubah → jika mode Watson-Driven, jadwalkan recompute anchor (debounce 300ms)
    scheduleWatsonRecalc();
}

function resetScores() {
    if (!confirm('Reset skor ke default?')) return;
    jvScores[selectedJenjang] = { ...DEFAULT_SCORES[selectedJenjang] };
    renderMenu1();
    scheduleWatsonRecalc();
}

function saveJV() {
    saveToStorage();
    alert('Skor JV berhasil disimpan!');
}

// =====================================================
// MENU 2: Adjustable Parameters
// =====================================================
function renderMenu2() {
    const container = document.getElementById('menu2-container');
    if (!container) return;

    // Pendekatan baru: render versi baru
    if (approach === 'baru') {
        renderMenu2Baru();
        return;
    }

    const isWatson = paramMode === 'watson';

    const umkVal = getActiveUmk();
    const plafonVal = approachBaruParams.plafon || 15000000;
    const sigmaPctVal = approachBaruParams.sigmaPct || 85;
    const gapPctVal = approachBaruParams.gapPct || 2;
    const plafonResult = calcAnchorsFromPlafon(plafonVal, sigmaPctVal, gapPctVal, umkVal);
    const calcAnchors = plafonResult.anchors;
    const sigmaC = plafonResult.sigmaC;
    const manualOverrides = approachBaruParams.anchorOverrides || {};
    const displayAnchors = { ...calcAnchors, ...manualOverrides };

    container.innerHTML = `
        <!-- Section W: Mesin Anchor Watson (hanya mode Watson-Driven) -->
        ${isWatson ? buildWatsonPanelHTML() : ''}

        <!-- Section A: Anchor % THP per Jenjang (Plafon-Based) -->
        <div class="card">
            <div class="card-title"><span>🔑</span> Anchor % THP per Jenjang (Plafon-Based)</div>
            <div class="card-desc">
                Anchor dihitung dari Plafon. D6 = σ% (default 85%), D1 = 75% UMK floor, D2-D5 interpolasi geometric.
                Anda bisa menyesuaikan manual per jenjang — klik "Reset ke Default" untuk kembali ke perhitungan otomatis.
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="stat-card">
                    <div class="stat-value text-purple-700">${formatCurrency(plafonResult.sigmaC)}</div>
                    <div class="stat-label">σC = Plafon × σ%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value text-blue-700">${plafonResult.d6Anchor.toFixed(2)}%</div>
                    <div class="stat-label">D6 Default = σ% → THP ${formatCurrency(plafonResult.d6THP)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value text-emerald-700">${plafonResult.d1Anchor.toFixed(2)}%</div>
                    <div class="stat-label">D1 Default (75% UMK floor) → THP ${formatCurrency(plafonResult.d1THP)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value text-amber-700">${plafonResult.growth.toFixed(4)}x</div>
                    <div class="stat-label">Growth Factor (D6/D1)^(1/5)</div>
                </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${['D1','D2','D3-1','D3-2','D4-1','D4-2','D5','D6'].map(k => {
                    const jName = JENJANG_LIST.find(j => j.code === k)?.name || k;
                    const anchorVal = displayAnchors[k] || 0;
                    const isOverridden = manualOverrides[k] !== undefined;
                    const thpVal = Math.round(anchorVal * plafonVal / 100000) * 1000;
                    const pctSigma = sigmaC > 0 ? (thpVal / sigmaC * 100).toFixed(1) : '0';
                    return `
                    <div class="p-2 rounded-lg border ${isOverridden ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}">
                        <div class="text-[10px] font-semibold text-slate-500">${jName}${isOverridden ? ' <span class="text-amber-600">custom</span>' : ''}</div>
                        <input type="number" class="w-full text-lg font-bold text-blue-800 bg-transparent border-b border-blue-200 focus:border-blue-500 focus:outline-none" value="${anchorVal.toFixed(2)}" step="0.5" min="1" max="200"
                            onchange="onAnchorManualChange('${k}', this.value)">
                        <div class="text-[10px] text-slate-500">THP ${formatCurrency(thpVal)} <span class="text-slate-400">(${pctSigma}% dari σ)</span></div>
                    </div>
                    `;
                }).join('')}
            </div>
            <div class="mt-3 p-2 rounded-lg ${plafonResult.d1Check75 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}">
                <span class="text-xs font-semibold ${plafonResult.d1Check75 ? 'text-emerald-700' : 'text-red-700'}">
                    ${plafonResult.d1Check75 ? '✓ D1 THP ≥ 75% UMK' : '✗ D1 THP < 75% UMK! Naikkan Plafon atau turunkan σ%.'}
                </span>
                <span class="text-[10px] text-slate-500 ml-2">
                    (D1 THP ${formatCurrency(plafonResult.d1THP)} vs 75% UMK ${formatCurrency(umkVal * 0.75)})
                </span>
            </div>
            <div class="mt-3 flex justify-end">
                <button onclick="resetAnchorOverrides()" class="btn-secondary text-xs">Reset ke Default</button>
            </div>
        </div>

        <!-- Section A2: Anchor % Gapok per Jenjang (UMK-Based) -->
        <div class="card">
            <div class="card-title"><span>💰</span> Anchor % Gapok per Jenjang (UMK-Based)</div>
            <div class="card-desc">
                Persentase Gaji Pokok dari UMK per jenjang. Rumus: <code>Gapok = AnchorGapok% × UMK</code>.
                D1/D2 lebih tinggi (butuh perlindungan basic salary), D3+ bisa lebih rendah.
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${['D1','D2','D3-1','D3-2','D4-1','D4-2','D5','D6'].map(k => {
                    const jName = JENJANG_LIST.find(j => j.code === k)?.name || k;
                    const gapokVal = (approachBaruParams.gapokAnchors && approachBaruParams.gapokAnchors[k]) ?? 75;
                    return `
                    <div class="p-2 rounded-lg border bg-slate-50 border-slate-200">
                        <div class="text-[10px] font-semibold text-slate-500">${jName}</div>
                        <input type="number" class="w-full text-lg font-bold text-emerald-800 bg-transparent border-b border-emerald-200 focus:border-emerald-500 focus:outline-none" value="${gapokVal}" step="1" min="50" max="100"
                            onchange="onGapokAnchorChange('${k}', this.value)">
                        <div class="text-[10px] text-slate-400">Gapok%</div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Section B: Sub-Level Multiplier -->
        <div class="card">
            <div class="card-title"><span>📈</span> Sub-Level Multipliers (A-E)</div>
            <div class="card-desc">
                Multiplier untuk progression dari sub-level A ke E. Rumus: <code>Gapok Mid% = Anchor% × Multiplier</code>.
            </div>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                ${Object.keys(params.subLevelMultipliers).map(k => `
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Sub-Level ${k}</label>
                        <input type="number" id="p-mult-${k}" class="input-field" value="${params.subLevelMultipliers[k]}" step="0.01">
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Section C: General Settings & Step -->
        <div class="card">
            <div class="card-title"><span>⚙️</span> General Settings & UMK</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Plafon THP (Rp)</label>
                    <input type="number" id="ab-plafon-lama" class="input-field font-bold text-blue-800" value="${approachBaruParams.plafon || 15000000}" step="500000" min="0"
                        oninput="onApproachBaruParamChange('plafon', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sigma -- Porsi Tetap di Puncak (%)</label>
                    <input type="number" id="ab-sigma-lama" class="input-field font-bold text-purple-800" value="${approachBaruParams.sigmaPct || 85}" min="70" max="100" step="1"
                        onchange="onApproachBaruParamChange('sigmaPct', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Step Spread (% UMK)</label>
                    <input type="number" id="p-step" class="input-field" value="${params.step}" min="0" step="0.5">
                </div>
            </div>

            <!-- Live Stat for Plafon & Sigma -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div class="stat-card">
                    <div class="stat-value text-purple-700">${formatCurrency((approachBaruParams.plafon || 15000000) * (approachBaruParams.sigmaPct || 85) / 100)}</div>
                    <div class="stat-label">sigmaC (Puncak THP Rp = Plafon x Sigma%)</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value text-blue-700">${(((approachBaruParams.plafon || 15000000) * (approachBaruParams.sigmaPct || 85) / 100) / getActiveUmk()).toFixed(4)}x</div>
                    <div class="stat-label">T (Rasio Puncak THP terhadap UMK)</div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4 border-slate-100">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Pilih Lokasi UMK</label>
                    <select id="p-umk" class="select-field" onchange="onApproachBaruUMKChange(this.value)">
                        ${UMK_LOCATIONS.map(loc => `<option value="${loc}" ${loc === selectedUMK ? 'selected' : ''}>${loc} — ${formatCurrency(UMK_DATA[loc])}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Nilai UMK (Rp) -- bisa diedit</label>
                    <input type="text" id="p-umk-value" inputmode="numeric" class="input-field font-bold text-blue-700" value="${getActiveUmk().toLocaleString('id-ID')}"
                        oninput="onApproachBaruUmkValueChange(this.value)">
                    <div class="text-[10px] text-slate-400 mt-1">Default dari lokasi: ${formatCurrency(UMK_DATA[selectedUMK])}. Boleh ketik pakai titik (mis. 3.736.101). Kosongkan untuk kembali ke default.</div>
                </div>
            </div>
        </div>

        <!-- Section E: Detail Tunjangan Tetap (Riil Profile) -->
        <!-- Tunjangan Keluarga -->
        <div class="card">
            <div class="card-title"><span>👨‍👩‍👧‍👦</span> Tunjangan Keluarga</div>
            <div class="card-desc">Konfigurasi tunjangan tetap keluarga berdasarkan status pasangan dan jumlah anak.</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Status Pasangan</label>
                    <select id="p-pasangan" class="select-field" onchange="onApproachBaruParamChange('hasPasangan', this.value)">
                        <option value="0" ${approachBaruParams.hasPasangan == 0 ? 'selected' : ''}>0 (Tidak ada)</option>
                        <option value="1" ${approachBaruParams.hasPasangan == 1 ? 'selected' : ''}>1 (Ada)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Jumlah Anak (Maks 2)</label>
                    <select id="p-anak" class="select-field" onchange="onApproachBaruParamChange('jumlahAnak', this.value)">
                        <option value="0" ${approachBaruParams.jumlahAnak == 0 ? 'selected' : ''}>0</option>
                        <option value="1" ${approachBaruParams.jumlahAnak == 1 ? 'selected' : ''}>1</option>
                        <option value="2" ${approachBaruParams.jumlahAnak == 2 ? 'selected' : ''}>2</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Tunj. Keluarga (Rp / orang)</label>
                    <input type="number" id="p-tunj-anak" class="input-field" value="${approachBaruParams.tunjKeluargaPerAnak ?? 100000}" step="10000"
                        onchange="onApproachBaruParamChange('tunjKeluargaPerAnak', this.value)">
                </div>
            </div>
        </div>

        <!-- Tunjangan Lama Kerja -->
        <div class="card">
            <div class="card-title"><span>⏳</span> Tunjangan Lama Kerja</div>
            <div class="card-desc">Konfigurasi tunjangan tetap lama kerja berdasarkan masa kerja pegawai.</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Masa Kerja Maks. (Tahun)</label>
                    <input type="number" id="p-max-lk" class="input-field" value="${approachBaruParams.maxMasaKerjaTahun ?? 5}" min="0" max="40" step="1"
                        onchange="onApproachBaruParamChange('maxMasaKerjaTahun', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Tunj. Lama Kerja / Tahun (Rp)</label>
                    <input type="number" id="p-tunj-lk" class="input-field" value="${approachBaruParams.tunjLamaKerjaPerTahun ?? 50000}" step="10000"
                        onchange="onApproachBaruParamChange('tunjLamaKerjaPerTahun', this.value)">
                </div>
            </div>
        </div>
        
        <!-- Tunjangan Struktural -->
        <div class="card">
            <div class="card-title"><span>🛡️</span> Tunjangan Struktural</div>
            <div class="card-desc">Konfigurasi tunjangan tetap struktural berdasarkan kelompok grade (A, B, C) serta tambahan untuk jalur manajerial.</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Grup A (Principal/Jr. Mgmt) (Rp)</label>
                    <input type="number" id="p-struct-A" class="input-field" value="${approachBaruParams.structuralAllowance?.A || 200000}" step="10000"
                        onchange="onApproachBaruStructuralAllowanceChange('A', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Grup B (Specialist/Mid. Mgmt) (Rp)</label>
                    <input type="number" id="p-struct-B" class="input-field" value="${approachBaruParams.structuralAllowance?.B || 400000}" step="10000"
                        onchange="onApproachBaruStructuralAllowanceChange('B', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Grup C (Senior/Exec. Mgmt) (Rp)</label>
                    <input type="number" id="p-struct-C" class="input-field" value="${approachBaruParams.structuralAllowance?.C || 600000}" step="10000"
                        onchange="onApproachBaruStructuralAllowanceChange('C', this.value)">
                </div>
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" id="p-extra-manajerial" ${approachBaruParams.extraManajerialPct > 0 ? 'checked' : ''}
                    onchange="onApproachBaruExtraManajerialToggle(this.checked)">
                <label for="p-extra-manajerial" class="text-xs font-semibold text-slate-700">Berikan Tambahan untuk Jalur Manajerial</label>
                <input type="number" id="p-extra-manajerial-pct" class="input-field w-20 ml-2" min="0" max="100" step="0.5"
                    value="${approachBaruParams.extraManajerialPct !== undefined ? approachBaruParams.extraManajerialPct : 50}" ${approachBaruParams.extraManajerialPct > 0 ? '' : 'disabled'}
                    onchange="onApproachBaruParamChange('extraManajerialPct', this.value)">
                <span class="text-xs text-slate-500">%</span>
            </div>
            <div class="flex items-center gap-6 mt-3 pt-3 border-t border-slate-100">
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="p-enable-str-d31" ${approachBaruParams.enableStrukturalD31 !== false ? 'checked' : ''}
                        onchange="onApproachBaruParamChange('enableStrukturalD31', this.checked)">
                    <label for="p-enable-str-d31" class="text-xs font-semibold text-slate-700">D3-1 Principal (Grup A) dapat Tunj. Struktural</label>
                </div>
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="p-enable-str-d41" ${approachBaruParams.enableStrukturalD41 !== false ? 'checked' : ''}
                        onchange="onApproachBaruParamChange('enableStrukturalD41', this.checked)">
                    <label for="p-enable-str-d41" class="text-xs font-semibold text-slate-700">D4-1 Specialist (Grup B) dapat Tunj. Struktural</label>
                </div>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3">
            <button onclick="resetParams()" class="btn-secondary">Reset Default</button>
            <button onclick="saveParams()" class="btn-primary">Simpan Semua Parameter</button>
        </div>
    `;

    // Bind composition live inputs
    document.getElementById('p-gapok').addEventListener('input', () => { validateComposition(); updateCompositionTTT(); });
    document.getElementById('p-tt').addEventListener('input', () => { validateComposition(); updateCompositionTTT(); });
    if (currentScheme !== 'skema-gapok') {
        document.getElementById('p-ttt').addEventListener('input', validateComposition);
    }

    // Bind UMK change
    document.getElementById('p-umk').addEventListener('change', (e) => {
        onApproachBaruUMKChange(e.target.value);
    });

    validateComposition();
    updateStructPreview();
}

function updateStructPreview() {
    const basisVal = Number(document.getElementById('t-struct-basis')?.value) || 0;
    const list = document.getElementById('struct-preview-list');
    if (!list) return;

    list.innerHTML = `
        <li>• D3-2 (Index 1): <span class="font-bold">${formatCurrency(basisVal)}</span></li>
        <li>• D4-2 (Index 2): <span class="font-bold">${formatCurrency(basisVal * 2)}</span></li>
        <li>• D5 (Index 3): <span class="font-bold">${formatCurrency(basisVal * 3)}</span></li>
        <li>• D6 (Index 4): <span class="font-bold">${formatCurrency(basisVal * 4)}</span></li>
    `;
}

function validateComposition() {
    const g = Number(document.getElementById('p-gapok')?.value) || 0;
    const t = Number(document.getElementById('p-tt')?.value) || 0;
    const ttt = Number(document.getElementById('p-ttt')?.value) || 0;
    const el = document.getElementById('comp-validation');
    if (!el) return;

    if (currentScheme === 'skema-gapok') {
        // Skema Gaji Pokok: Gapok dari anchor, komposisi hanya tt/ttt ratio
        if (t + ttt === 0) {
            el.innerHTML = '<span class="badge-fail">&#10007; TT + TTT harus > 0%</span>';
        } else {
            el.innerHTML = `<span class="badge-pass">&#10003; TT:TTT ratio = ${t}:${ttt} (dimultiplier per sub-level)</span>`;
        }
    } else {
        // Skema Lama: Total harus 100%
        const total = g + t + ttt;
        if (total === 100) {
            el.innerHTML = '<span class="badge-pass">&#10003; Total = 100% — Valid</span>';
        } else {
            el.innerHTML = `<span class="badge-fail">&#10007; Total = ${total}% — Harus 100%</span>`;
        }
    }
}

// Auto-update composition.ttt untuk skema gaji pokok
function updateCompositionTTT() {
    if (currentScheme !== 'skema-gapok') return;
    const gapok = Number(document.getElementById('p-gapok')?.value) || 50;
    const tt = Number(document.getElementById('p-tt')?.value) || 15;
    const ttt = Math.max(0, 100 - gapok - tt);
    const tttEl = document.getElementById('p-ttt');
    if (tttEl) tttEl.value = ttt;
}

// =====================================================
// PARAM MODE — Manual vs Watson-Driven
// Isolasi dua penyimpan anchor:
//   params.manualAnchors  → rancangan manual user (selalu terpelihara)
//   params.anchors        → anchor AKTIF yang dibaca pipeline perhitungan
// =====================================================
function switchParamMode(mode) {
    paramMode = mode === 'watson' ? 'watson' : 'manual';
    localStorage.setItem('payroll_sim_parammode', paramMode);
    syncActiveSources();
    syncSchemeToggleWrapper();
    const bM = document.getElementById('btn-param-manual');
    const bW = document.getElementById('btn-param-watson');
    if (bM) bM.classList.toggle('active', paramMode === 'manual');
    if (bW) bW.classList.toggle('active', paramMode === 'watson');
    saveToStorage();
    showMenu(currentMenu); // re-render section aktif agar konsisten
}

// Terapkan sumber anchor sesuai mode aktif ke params.anchors
function syncActiveSources() {
    if (!params || !params.anchors) return;
    if (paramMode === 'watson') {
        const res = calcWatsonAnchors(jvScores, params.watsonConfig);
        watsonResult = res;
        if (res.anchors) Object.assign(params.anchors, res.anchors);
    } else {
        watsonResult = null;
        if (params.manualAnchors) Object.assign(params.anchors, params.manualAnchors);
    }
}

// Knob panel Watson → update config → simpan → hitung ulang
function onWatsonKnobChange(key, value, kind) {
    if (!params.watsonConfig) return;
    if (kind === 'bool')      params.watsonConfig[key] = !!value;
    else if (kind === 'num')  params.watsonConfig[key] = Number(value) || 0;
    else                      params.watsonConfig[key] = value;
    saveParamsSilent();
    recalcWatson();
}

// Hitung ulang anchor dari mesin Watson dan refresh tampilan aktif.
// `force` dipertahankan untuk kompatibilitas tombol "Hitung Ulang Sekarang".
function recalcWatson(force) {
    if (paramMode !== 'watson') return;
    const res = calcWatsonAnchors(jvScores, params.watsonConfig);
    watsonResult = res;
    if (res.anchors) Object.assign(params.anchors, res.anchors);
    saveToStorage();
    if (currentMenu === 'menu2') showMenu('menu2');
}

// Debounce 300ms — dipanggil setiap skor JV di Menu 1 berubah
function scheduleWatsonRecalc() {
    clearTimeout(_watsonRecalcTimer);
    _watsonRecalcTimer = setTimeout(() => {
        if (paramMode === 'watson') recalcWatson();
    }, 300);
}

// Panel kontrol + tabel perbandingan Mesin Anchor Watson (Menu 2, mode watson)
function buildWatsonPanelHTML() {
    const wc = params.watsonConfig || { ...DEFAULT_WATSON_CONFIG };
    const res = watsonResult;
    const isRasio = wc.ceilingMethod === 'rasio';

    // Info line: target dihitung ulang lokal mengikuti metode plafon
    const targetPct = isRasio
        ? Number(wc.rhoValue) * (wc.d1Pin + getLoading('D1')) - getLoading('D6')
        : Number(wc.manualTargetPct);
    const epsTxt    = (res && res.epsilon != null && isFinite(res.epsilon)) ? res.epsilon.toFixed(3) : '—';
    const landedTxt = (res && res.landedD6 != null) ? Number(res.landedD6).toFixed(1) + '%' : '—';
    const targetTxt = isFinite(targetPct) ? targetPct.toFixed(1) + '%' : '—';

    // Tabel perbandingan Watson vs Manual + Δ berkode warna
    const rowCodes = ['D1', 'D2', 'D3-1', 'D3-2', 'D4-1', 'D4-2', 'D5', 'D6'];
    const rows = rowCodes.map(code => {
        const jName = JENJANG_LIST.find(j => j.code === code)?.name || code;
        const jv = calcJV(jvScores[code] || DEFAULT_SCORES[code] || {});
        const wa = (res && res.anchors) ? res.anchors[code] : null;
        const ma = params.manualAnchors ? params.manualAnchors[code] : null;

        let dHtml = '<span class="text-slate-400">-</span>';
        if (wa != null && ma != null) {
            let d = wa - Number(ma);
            if (Math.abs(d) < 0.05) d = 0;
            // hijau |Δ|<1 · kuning 1–5 · merah >5
            const cls = Math.abs(d) < 1 ? 'text-emerald-600'
                      : (Math.abs(d) <= 5 ? 'text-amber-600' : 'text-red-600');
            dHtml = `<span class="font-bold ${cls}">${d > 0 ? '+' : ''}${d.toFixed(1)}</span>`;
        }
        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="py-1.5 px-2 text-xs font-semibold text-slate-800">${jName}</td>
                <td class="py-1.5 px-2 text-xs text-center text-slate-600">${jv}</td>
                <td class="py-1.5 px-2 text-xs text-center font-bold text-blue-700">${wa != null ? wa.toFixed(1) : '-'}</td>
                <td class="py-1.5 px-2 text-xs text-center text-slate-600">${ma != null ? Number(ma).toFixed(1) : '-'}</td>
                <td class="py-1.5 px-2 text-xs text-center">${dHtml}</td>
            </tr>`;
    }).join('');

    const warnItems = (res && res.warnings && res.warnings.length)
        ? res.warnings.map(w => `<li>${w}</li>`).join('')
        : '<li>Tidak ada warning.</li>';

    return `
        <div class="card border-blue-300">
            <div class="card-title"><span>🧮</span> Mesin Anchor Watson</div>
            <div class="card-desc">
                Mode <strong>Watson-Driven</strong>: anchor D1&ndash;D6 dihitung otomatis dari Job Value (Menu 1)
                memakai rantai growth ber-koridor dengan epsilon terkalibrasi ke plafon D6.
                Sub-Level Multipliers &amp; parameter lain tetap manual.
            </div>

            <!-- Knobs -->
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end mb-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Pin D1 (%)</label>
                    <input type="number" id="w-pin" class="input-field" value="${wc.d1Pin}" step="1"
                        onchange="onWatsonKnobChange('d1Pin', this.value, 'num')">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Metode Plafon</label>
                    <select id="w-ceiling" class="select-field" onchange="onWatsonKnobChange('ceilingMethod', this.value, 'str')">
                        <option value="rasio" ${isRasio ? 'selected' : ''}>Rasio ke entry (&rho;)</option>
                        <option value="manual" ${isRasio ? '' : 'selected'}>Target manual (%)</option>
                    </select>
                </div>
                ${isRasio ? `
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">&rho; (Rasio ke entry)</label>
                    <input type="number" id="w-rho" class="input-field" value="${wc.rhoValue}" step="0.01"
                        onchange="onWatsonKnobChange('rhoValue', this.value, 'num')">
                </div>` : `
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Target D6 (%)</label>
                    <input type="number" id="w-targetpct" class="input-field" value="${wc.manualTargetPct}" step="1"
                        onchange="onWatsonKnobChange('manualTargetPct', this.value, 'num')">
                </div>`}
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Koridor Min (%)</label>
                    <input type="number" id="w-cmin" class="input-field" value="${wc.corridorMin}" step="1"
                        onchange="onWatsonKnobChange('corridorMin', this.value, 'num')">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Koridor Max (%)</label>
                    <input type="number" id="w-cmax" class="input-field" value="${wc.corridorMax}" step="1"
                        onchange="onWatsonKnobChange('corridorMax', this.value, 'num')">
                </div>
                <div class="flex items-center gap-2 pb-2">
                    <input type="checkbox" id="w-eps-auto" ${wc.epsilonAuto ? 'checked' : ''}
                        onchange="onWatsonKnobChange('epsilonAuto', this.checked, 'bool')">
                    <label for="w-eps-auto" class="text-xs font-semibold text-slate-500 cursor-pointer">&epsilon; auto</label>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">&epsilon; Manual</label>
                    <input type="number" id="w-eps" class="input-field ${wc.epsilonAuto ? 'bg-slate-100' : ''}"
                        value="${wc.manualEpsilon}" step="0.001" ${wc.epsilonAuto ? 'disabled' : ''}
                        onchange="onWatsonKnobChange('manualEpsilon', this.value, 'num')">
                </div>
            </div>

            <div class="mb-4">
                <button onclick="recalcWatson(true)" class="btn-secondary">Hitung Ulang Sekarang</button>
            </div>

            <!-- Info line -->
            <div class="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded p-2 mb-4">
                &epsilon; = ${epsTxt} &middot; Landed D6 = ${landedTxt} &middot; Target = ${targetTxt}
            </div>

            <!-- Tabel perbandingan -->
            <div class="overflow-x-auto mb-4">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="border-b-2 border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <th class="py-2 px-2">Jenjang</th>
                            <th class="py-2 px-2 text-center">JV</th>
                            <th class="py-2 px-2 text-center">Anchor Watson</th>
                            <th class="py-2 px-2 text-center">Anchor Manual</th>
                            <th class="py-2 px-2 text-center">&Delta; (Watson &minus; Manual)</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>

            <!-- Warnings -->
            <ul class="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-2 list-disc pl-5 space-y-0.5">
                ${warnItems}
            </ul>
        </div>`;
}

function saveParamsSilent() {
    console.log('[UMK DEBUG] saveParamsSilent called. customUmkValue BEFORE =', customUmkValue);
    // Read all anchor values → SELALU ke snapshot manual (tidak pernah menimpa hasil Watson)
    Object.keys(params.anchors).forEach(k => {
        const el = document.getElementById('p-anchor-' + k);
        if (el && params.manualAnchors) params.manualAnchors[k] = Number(el.value) || params.manualAnchors[k];
    });
    // Mode manual: anchor aktif disinkronkan dari snapshot manual
    if (paramMode === 'manual' && params.manualAnchors) {
        Object.assign(params.anchors, params.manualAnchors);
    }

    // Read all multiplier values
    Object.keys(params.subLevelMultipliers).forEach(k => {
        const el = document.getElementById('p-mult-' + k);
        if (el) params.subLevelMultipliers[k] = Number(el.value) || params.subLevelMultipliers[k];
    });

    params.step = Number(document.getElementById('p-step')?.value) || 2;
    params.thpCap = Number(document.getElementById('p-thp-cap')?.value) || 15000000;
    params.streamPositioning = Number(document.getElementById('p-stream')?.value) || 1.03;

    params.composition.gapok = Number(document.getElementById('p-gapok')?.value) || 50;
    params.composition.tt = Number(document.getElementById('p-tt')?.value) || 15;
    params.composition.ttt = Number(document.getElementById('p-ttt')?.value) || 35;

    params.ttSplit.struktural = Number(document.getElementById('p-tt-struktural')?.value) || 60;
    params.ttSplit.lamaKerja = Number(document.getElementById('p-tt-lamakerja')?.value) || 25;
    params.ttSplit.keluarga = Number(document.getElementById('p-tt-keluarga')?.value) || 15;

    // Tunjangan Values
    params.tunjangan.strukturalBasis = Number(document.getElementById('t-struct-basis')?.value) || 300000;
    params.tunjangan.lamaKerjaAwal = Number(document.getElementById('t-tenure-start')?.value) || 50000;
    params.tunjangan.lamaKerjaKenaikan = Number(document.getElementById('t-tenure-inc')?.value) || 75000;
    params.tunjangan.lamaKerjaPlafon = Number(document.getElementById('t-tenure-cap')?.value) || 1500000;
    params.tunjangan.keluargaPasangan = Number(document.getElementById('t-fam-spouse')?.value) || 300000;
    params.tunjangan.keluargaAnak = Number(document.getElementById('t-fam-child')?.value) || 150000;
    params.tunjangan.keluargaPlafon = Number(document.getElementById('t-fam-cap')?.value) || 600000;

    // Simpan approach baru params jika elemen ada (mode baru aktif)
    const abPlafon = document.getElementById('ab-plafon');
    const abSigma  = document.getElementById('ab-sigma');
    const abGap    = document.getElementById('ab-gap');
    if (abPlafon) approachBaruParams.plafon   = Number(abPlafon.value) || DEFAULT_APPROACH_BARU.plafon;
    if (abSigma)  approachBaruParams.sigmaPct = Number(abSigma.value)  || DEFAULT_APPROACH_BARU.sigmaPct;
    if (abGap)    approachBaruParams.gapPct   = Number(abGap.value)    || DEFAULT_APPROACH_BARU.gapPct;

    saveToStorage();
    console.log('[UMK DEBUG] saveParamsSilent done. customUmkValue AFTER =', customUmkValue);
}

function saveParams() {
    saveParamsSilent();
    alert('Parameter berhasil disimpan!');
}

function resetParams() {
    if (!confirm('Reset semua parameter ke default?')) return;
    params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
    params.manualAnchors = { ...params.anchors }; // snapshot manual ikut ke default
    paramMode = 'manual';
    watsonResult = null;
    localStorage.setItem('payroll_sim_parammode', 'manual');
    const bM = document.getElementById('btn-param-manual');
    const bW = document.getElementById('btn-param-watson');
    if (bM && bW) {
        bM.classList.add('active');
        bW.classList.remove('active');
    }
    selectedUMK = 'Kota Surabaya';
    renderMenu2();
    // Re-render menu3 if visible
    const menu3El = document.getElementById('menu3-container');
    if (menu3El && menu3El.offsetParent !== null) {
        renderMenu3();
    }
}

// =====================================================
// MENU 2 — PENDEKATAN BARU (Grade Stacking)
// =====================================================
function renderMenu2Baru() {
    const container = document.getElementById('menu2-container');
    if (!container) return;

    const C  = approachBaruParams.plafon;
    const sp = approachBaruParams.sigmaPct;
    const gp = approachBaruParams.gapPct;
    const U  = getActiveUmk();
    const d  = deriveGradeStack(U, C, sp, gp);
    const rk = v => Math.round(v / 1000) * 1000;

    const plafonResult = calcAnchorsFromPlafon(C || 15000000, sp || 85, gp || 2, U);
    const anchors = plafonResult.anchors;
    const manualOverrides = approachBaruParams.anchorOverrides || {};
    const displayAnchors = { ...anchors, ...manualOverrides };

    const sLabel = d.s > 0 ? formatPercent(d.s * 100) : '-';
    const gapD1D2Rp = d.grades.length >= 2 ? formatCurrency(rk(d.grades[1].min - d.grades[0].max)) : '-';

    const stepVal = approachBaruParams.step || 2;
    const compG   = approachBaruParams.composition?.gapok || 75;
    const hasPasangan = approachBaruParams.hasPasangan ?? 1;
    const anak    = approachBaruParams.jumlahAnak ?? 2;
    const tunjAnak = approachBaruParams.tunjKeluargaPerAnak ?? 100000;
    const maxLk   = approachBaruParams.maxMasaKerjaTahun ?? 5;
    const tunjLk  = approachBaruParams.tunjLamaKerjaPerTahun ?? 50000;
    const modelType = approachBaruParams.modelType || 'squeeze';

    // Baseline THPs for D1-A (which has midpoint sub.rp = UMK)
    const baseMinTHP = rk(U * (100 - stepVal) / 100);
    const baseMaxTHP = rk(U * (100 + stepVal) / 100);

    const gapokAnchors = approachBaruParams?.gapokAnchors || {};
    const gapokPctD1 = gapokAnchors.D1 !== undefined ? gapokAnchors.D1 : (approachBaruParams?.composition?.gapok || 75);
    const gapokMin = rk(U * gapokPctD1 / 100);
    const gapokMax = rk(U * gapokPctD1 / 100);

    let simMin = {}, simMax = {};
    if (modelType === 'squeeze') {
        // Model A: Squeeze
        simMin.thp = baseMinTHP;
        simMin.gapok = gapokMin;
        simMin.tt_kel = rk((hasPasangan + anak) * tunjAnak);
        simMin.ttt = rk(Math.max(0, baseMinTHP - gapokMin - simMin.tt_kel));

        simMax.thp = baseMaxTHP;
        simMax.gapok = gapokMax;
        simMax.tt_kel = rk((hasPasangan + anak) * tunjAnak);
        simMax.tt_lk = rk(maxLk * tunjLk);
        simMax.ttt = rk(Math.max(0, baseMaxTHP - gapokMax - simMax.tt_kel - simMax.tt_lk));
    } else {
        // Model B: Additive
        simMin.gapok = gapokMin;
        simMin.ttt = rk(baseMinTHP * (100 - compG) / 100);
        simMin.tt_kel = rk((hasPasangan + anak) * tunjAnak);
        simMin.thp = rk(Math.min(C, simMin.gapok + simMin.ttt + simMin.tt_kel));

        simMax.gapok = gapokMax;
        simMax.ttt = rk(baseMaxTHP * (100 - compG) / 100);
        simMax.tt_kel = rk((hasPasangan + anak) * tunjAnak);
        simMax.tt_lk = rk(maxLk * tunjLk);
        simMax.thp = rk(Math.min(C, simMax.gapok + simMax.ttt + simMax.tt_kel + simMax.tt_lk));
    }

    container.innerHTML = `
        <!-- Lokasi UMK -->
        <div class="card">
            <div class="card-title">Lokasi UMK</div>
            <div class="card-desc">Pilih lokasi UMK Jawa Timur. Nilai UMK menjadi basis perhitungan seluruh struktur (Min D1 = UMK). Bisa diedit untuk uji coba.</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Pilih Lokasi</label>
                    <select id="ab-umk" class="select-field" onchange="onApproachBaruUMKChange(this.value)">
                        ${UMK_LOCATIONS.map(loc => '<option value="' + loc + '" ' + (loc === selectedUMK ? 'selected' : '') + '>' + loc + ' -- ' + formatCurrency(UMK_DATA[loc]) + '</option>').join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Nilai UMK (Rp) -- bisa diedit</label>
                    <input type="text" id="ab-umk-value" inputmode="numeric" class="input-field font-bold text-blue-700" value="${getActiveUmk().toLocaleString('id-ID')}"
                        oninput="onApproachBaruUmkValueChange(this.value)">
                    <div class="text-[10px] text-slate-400 mt-1">Default dari lokasi: ${formatCurrency(UMK_DATA[selectedUMK])}. Boleh ketik pakai titik (mis. 4.500.000). Kosongkan untuk kembali ke default.</div>
                </div>
            </div>
        </div>

        <!-- 1. Plafon THP -->
        <div class="card">
            <div class="card-title">Plafon THP</div>
            <div class="card-desc">Batas atas Take Home Pay (THP) yang dicapai di grade tertinggi (D6) sub-level E.</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Plafon THP (Rp)</label>
                    <input type="number" id="ab-plafon" class="input-field" value="${C}" step="500000" min="0"
                        oninput="onApproachBaruParamChange('plafon', this.value)">
                </div>
                <div class="stat-card">
                    <div class="stat-value text-slate-800" id="ab-plafon-display">${formatCurrency(C)}</div>
                    <div class="stat-label">Plafon Aktif</div>
                </div>
            </div>
        </div>

        <!-- 2. Sigma -->
        <div class="card">
            <div class="card-title">Sigma -- Porsi Tetap di Puncak</div>
            <div class="card-desc">Persentase plafon yang menjadi batas atas struktur tetap (D6-E). Sisanya adalah ruang tunjangan profesi.</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sigma (%)</label>
                    <input type="number" id="ab-sigma" class="input-field" value="${sp}" min="70" max="100" step="1"
                        onchange="onApproachBaruParamChange('sigmaPct', this.value)">
                </div>
                <div class="stat-card">
                    <div class="stat-value text-blue-600 font-bold" id="ab-sigma-display">${formatCurrency(d.sigmaC)}</div>
                    <div class="stat-label">Struktur Tetap Puncak</div>
                </div>
            </div>
        </div>

        <!-- 3b. Anchor % Gapok per Jenjang (UMK-Based) -->
        <div class="card">
            <div class="card-title">Anchor % Gapok per Jenjang (UMK-Based)</div>
            <div class="card-desc">
                Persentase Gaji Pokok terhadap UMK per jenjang. Rumus: <code>Gapok = AnchorGapok% × UMK (${formatCurrency(U)})</code>.
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${['D1','D2','D3-1','D3-2','D4-1','D4-2','D5','D6'].map(k => {
                    const jName = JENJANG_LIST.find(j => j.code === k)?.name || k;
                    const gapokAnchorPct = (gapokAnchors && gapokAnchors[k] !== undefined) ? gapokAnchors[k] : (compG || 75);
                    const gapokRp = Math.round((U * gapokAnchorPct / 100) / 1000) * 1000;
                    return `
                    <div class="p-2 rounded-lg border bg-slate-50 border-slate-200">
                        <div class="text-[10px] font-semibold text-slate-500">${jName}</div>
                        <input type="number" id="ab-gapok-anchor-${k}" class="w-full text-lg font-bold text-emerald-800 bg-transparent border-b border-emerald-200 focus:border-emerald-500 focus:outline-none" value="${gapokAnchorPct}" step="1" min="50" max="100"
                            onchange="onGapokAnchorChange('${k}', this.value)">
                        <div class="text-[10px] text-slate-400">Gapok ${formatCurrency(gapokRp)}</div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- 4. Anchor % THP per Jenjang (Margin % di Atas Gapok) -->
        <div class="card">
            <div class="flex justify-between items-center mb-2">
                <div class="card-title">Kenaikan THP di Atas Gaji Pokok (%)</div>
                <div class="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded border border-blue-150 text-xs">
                    <input type="checkbox" id="ab-no-overlap" ${approachBaruParams.isNoOverlap ? 'checked' : ''} onchange="onSolverOverlapToggle(this.checked)">
                    <label for="ab-no-overlap" class="font-bold text-blue-800 cursor-pointer">Lock No-Overlap Stacking</label>
                </div>
            </div>
            <div class="card-desc">Persentase kenaikan/margin THP di atas Gaji Pokok untuk masing-masing jenjang. Rumus: <code>THP = Gapok + (Gapok × Margin%)</code>.</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${['D1','D2','D3-1','D3-2','D4-1','D4-2','D5','D6'].map(k => {
                    const jName = JENJANG_LIST.find(j => j.code === k)?.name || k;
                    const marginPct = manualOverrides[k] !== undefined ? manualOverrides[k] : 10;
                    const gapokPct = (gapokAnchors && gapokAnchors[k] !== undefined) ? gapokAnchors[k] : 75;
                    const gapokRp = Math.round((U * gapokPct / 100) / 1000) * 1000;
                    const marginRp = Math.round(gapokRp * marginPct / 100 / 1000) * 1000;
                    const thpVal = gapokRp + marginRp;
                    return `
                    <div class="p-2 rounded-lg border ${manualOverrides[k] !== undefined ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}">
                        <div class="text-[10px] font-semibold text-slate-500">${jName}${manualOverrides[k] !== undefined ? ' <span class="text-amber-600">custom</span>' : ''}</div>
                        <div class="flex items-center gap-1">
                            <span class="text-xs font-bold text-blue-600">+</span>
                            <input type="number" class="w-full text-lg font-bold text-blue-800 bg-transparent border-b border-blue-200 focus:border-blue-500 focus:outline-none" value="${marginPct.toFixed(1)}" step="0.5" min="0" max="200"
                                onchange="onAnchorManualChange('${k}', this.value)">
                            <span class="text-xs font-bold text-slate-500">%</span>
                        </div>
                        <div class="text-[10px] text-slate-500 font-medium mt-1">THP ${formatCurrency(thpVal)}</div>
                        <div class="text-[9px] text-slate-400">(Gapok ${formatCurrency(gapokRp)} + ${formatCurrency(marginRp)})</div>
                    </div>
                    `;
                }).join('')}
            </div>
            <div class="mt-3 flex justify-end">
                <button onclick="resetAnchorOverrides()" class="btn-secondary text-xs">Reset ke Default</button>
            </div>
        </div>

        <!-- 4b. Sub-Level Multipliers (A-E) -->
        <div class="card">
            <div class="card-title">Sub-Level Multipliers (A-E)</div>
            <div class="card-desc">Multiplier Sub-Level A-E. A = dasar, B-E = A × multiplier.</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub A (Dasar)</label>
                    <input type="number" id="ab-mult-A" class="input-field" value="${approachBaruParams.subLevelMultipliers?.A || 1.01}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('A', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub B</label>
                    <input type="number" id="ab-mult-B" class="input-field" value="${approachBaruParams.subLevelMultipliers?.B || 1.02}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('B', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub C</label>
                    <input type="number" id="ab-mult-C" class="input-field" value="${approachBaruParams.subLevelMultipliers?.C || 1.03}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('C', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub D</label>
                    <input type="number" id="ab-mult-D" class="input-field" value="${approachBaruParams.subLevelMultipliers?.D || 1.04}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('D', this.value)">
                </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub E</label>
                    <input type="number" id="ab-mult-E" class="input-field" value="${approachBaruParams.subLevelMultipliers?.E || 1.05}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('E', this.value)">
                </div>
                <div class="col-span-3 text-[10px] text-slate-400 self-end mb-1">
                    <div>A = Dasar (default 1.01). B-E adalah kelipatan dari A.</div>
                    <div class="mt-1 font-semibold text-slate-500">Default: A=1.01, B=1.02, C=1.03, D=1.04, E=1.05</div>
                </div>
            </div>
        </div>

        <!-- 5. Step Spread (% UMK) -->
        <div class="card">
            <div class="card-title">Step Spread (% UMK)</div>
            <div class="card-desc">Rentang deviasi Min dan Max dari Midpoint (Gapok/THP Min = Mid - Step, Max = Mid + Step).</div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">Step (%)</label>
                <input type="number" id="ab-step" class="input-field" value="${approachBaruParams.step || 2}" min="0" max="10" step="0.5"
                    onchange="onApproachBaruParamChange('step', this.value)">
            </div>
        </div>

        <!-- Managerial Premium -->
        <div class="card">
            <div class="card-title">Managerial Premium (D3-2 & D4-2)</div>
            <div class="card-desc">Faktor pengali untuk jalur managerial (D3-2 Junior Management dan D4-2 Middle Management).</div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1">Premium (x)</label>
                <input type="number" id="ab-premium" class="input-field" value="${approachBaruParams.managerialPremium || 1.03}" min="1" max="1.5" step="0.01"
                    onchange="onApproachBaruParamChange('managerialPremium', this.value)">
            </div>
        </div>

        <!-- Tunjangan Keluarga -->
        <div class="card">
            <div class="card-title">Tunjangan Keluarga</div>
            <div class="card-desc">Konfigurasi tunjangan tetap keluarga (suami/istri dan anak, maksimal 2 anak).</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Istri / Suami (0 atau 1)</label>
                    <select id="ab-pasangan" class="select-field" onchange="onApproachBaruParamChange('hasPasangan', this.value)">
                        <option value="0" ${approachBaruParams.hasPasangan == 0 ? 'selected' : ''}>0 (Tidak ada)</option>
                        <option value="1" ${approachBaruParams.hasPasangan == 1 ? 'selected' : ''}>1 (Ada)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Jumlah Anak (Maks 2)</label>
                    <select id="ab-anak" class="select-field" onchange="onApproachBaruParamChange('jumlahAnak', this.value)">
                        <option value="0" ${approachBaruParams.jumlahAnak == 0 ? 'selected' : ''}>0</option>
                        <option value="1" ${approachBaruParams.jumlahAnak == 1 ? 'selected' : ''}>1</option>
                        <option value="2" ${approachBaruParams.jumlahAnak == 2 ? 'selected' : ''}>2</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Tunj. Keluarga (Rp / orang)</label>
                    <input type="number" id="ab-tunj-anak" class="input-field" value="${approachBaruParams.tunjKeluargaPerAnak ?? 100000}" step="10000"
                        onchange="onApproachBaruParamChange('tunjKeluargaPerAnak', this.value)">
                </div>
            </div>
        </div>

        <!-- Tunjangan Lama Kerja -->
        <div class="card">
            <div class="card-title">Tunjangan Lama Kerja</div>
            <div class="card-desc">Konfigurasi tunjangan tetap lama kerja berdasarkan masa kerja pegawai.</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Masa Kerja Maks. (Tahun)</label>
                    <input type="number" id="ab-max-lk" class="input-field" value="${approachBaruParams.maxMasaKerjaTahun ?? 5}" min="0" max="40" step="1"
                        onchange="onApproachBaruParamChange('maxMasaKerjaTahun', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Tunj. Lama Kerja / Tahun (Rp)</label>
                    <input type="number" id="ab-tunj-lk" class="input-field" value="${approachBaruParams.tunjLamaKerjaPerTahun ?? 50000}" step="10000"
                        onchange="onApproachBaruParamChange('tunjLamaKerjaPerTahun', this.value)">
                </div>
            </div>
        </div>
        
        <!-- Tunjangan Struktural -->
        <div class="card">
            <div class="card-title">Tunjangan Struktural</div>
            <div class="card-desc">Konfigurasi tunjangan tetap struktural berdasarkan kelompok grade (A, B, C) serta tambahan untuk jalur manajerial.</div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Grup A (Principal/Jr. Mgmt) (Rp)</label>
                    <input type="number" id="ab-struct-A" class="input-field" value="${approachBaruParams.structuralAllowance?.A || 200000}" step="10000"
                        onchange="onApproachBaruStructuralAllowanceChange('A', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Grup B (Specialist/Mid. Mgmt) (Rp)</label>
                    <input type="number" id="ab-struct-B" class="input-field" value="${approachBaruParams.structuralAllowance?.B || 400000}" step="10000"
                        onchange="onApproachBaruStructuralAllowanceChange('B', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Grup C (Senior/Exec. Mgmt) (Rp)</label>
                    <input type="number" id="ab-struct-C" class="input-field" value="${approachBaruParams.structuralAllowance?.C || 600000}" step="10000"
                        onchange="onApproachBaruStructuralAllowanceChange('C', this.value)">
                </div>
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" id="ab-extra-manajerial" ${approachBaruParams.extraManajerialPct > 0 ? 'checked' : ''}
                    onchange="onApproachBaruExtraManajerialToggle(this.checked)">
                <label for="ab-extra-manajerial" class="text-xs font-semibold text-slate-700">Berikan Tambahan untuk Jalur Manajerial</label>
                <input type="number" id="ab-extra-manajerial-pct" class="input-field w-20 ml-2" min="0" max="100" step="0.5"
                    value="${approachBaruParams.extraManajerialPct !== undefined ? approachBaruParams.extraManajerialPct : 50}" ${approachBaruParams.extraManajerialPct > 0 ? '' : 'disabled'}
                    onchange="onApproachBaruParamChange('extraManajerialPct', this.value)">
                <span class="text-xs text-slate-500">%</span>
            </div>
            <div class="flex items-center gap-6 mt-3 pt-3 border-t border-slate-100">
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="ab-enable-str-d31" ${approachBaruParams.enableStrukturalD31 !== false ? 'checked' : ''}
                        onchange="onApproachBaruParamChange('enableStrukturalD31', this.checked)">
                    <label for="ab-enable-str-d31" class="text-xs font-semibold text-slate-700">D3-1 Principal (Grup A) dapat Tunj. Struktural</label>
                </div>
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="ab-enable-str-d41" ${approachBaruParams.enableStrukturalD41 !== false ? 'checked' : ''}
                        onchange="onApproachBaruParamChange('enableStrukturalD41', this.checked)">
                    <label for="ab-enable-str-d41" class="text-xs font-semibold text-slate-700">D4-1 Specialist (Grup B) dapat Tunj. Struktural</label>
                </div>
            </div>
        </div>

        <!-- Model Perhitungan Tunjangan -->
        <div class="card">
            <div class="card-title">Model Perhitungan Tunjangan</div>
            <div class="card-desc">Pilih bagaimana tunjangan keluarga, lama kerja, dan struktural memengaruhi total take home pay (THP).</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="ab-model-type" value="squeeze" ${approachBaruParams.modelType === 'squeeze' ? 'checked' : ''}
                            onchange="onApproachBaruParamChange('modelType', this.value)">
                        <span class="font-bold text-sm text-slate-800">Model A: Potong Tunj. Profesional (Squeeze)</span>
                    </label>
                    <div class="text-xs text-slate-500 pl-5">Total THP dikunci sesuai Paket. Adanya Tunjangan Tetap (Keluarga/Lama Kerja/Struktural) akan memotong porsi Tunjangan Profesional (TTT). Menjaga kepastian plafon anggaran.</div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="ab-model-type" value="additive" ${approachBaruParams.modelType === 'additive' ? 'checked' : ''}
                            onchange="onApproachBaruParamChange('modelType', this.value)">
                        <span class="font-bold text-sm text-slate-800">Model B: Tambah ke THP (Additive)</span>
                    </label>
                    <div class="text-xs text-slate-500 pl-5">Tunjangan Tetap (Keluarga/Lama Kerja/Struktural) ditambahkan di atas THP Dasar, sehingga menaikkan Total THP yang diterima karyawan.</div>
                </div>
            </div>
        </div>

        <!-- Kotak Simulasi Gaji (D1-A Min vs Max) -->
        <div class="card bg-slate-50 border border-slate-200">
            <div class="card-title">Kotak Simulasi Perbandingan (D1-A Min vs Max)</div>
            <div class="card-desc">Visualisasi perbandingan komponen gaji D1-A saat baru masuk (Min) vs setelah bekerja maksimal (Max) di bawah ${approachBaruParams.modelType === 'squeeze' ? 'Model A' : 'Model B'}.</div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <!-- Box Min (Baru Masuk) -->
                <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5 font-mono text-xs">
                    <div class="font-bold text-slate-800 border-b pb-1 mb-1">D1-A Min (Baru Masuk)</div>
                    <div class="flex justify-between"><span>Gaji Pokok (Gapok):</span><span class="font-semibold text-emerald-700">${formatCurrency(simMin.gapok)}</span></div>
                    <div class="flex justify-between"><span>Tunj. Keluarga:</span><span class="font-semibold text-slate-700">${formatCurrency(simMin.tt_kel)}</span></div>
                    <div class="flex justify-between"><span>Tunj. Lama Kerja (0 thn):</span><span class="font-semibold text-slate-500">${formatCurrency(0)}</span></div>
                    <div class="flex justify-between border-b pb-1"><span>Tunj. Profesional (TTT):</span><span class="font-semibold text-orange-700">${formatCurrency(simMin.ttt)}</span></div>
                    <div class="flex justify-between text-sm font-extrabold text-blue-800 pt-1"><span>Total THP:</span><span>${formatCurrency(simMin.thp)}</span></div>
                </div>

                <!-- Box Max (Senior) -->
                <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5 font-mono text-xs">
                    <div class="font-bold text-slate-800 border-b pb-1 mb-1">D1-A Max (Senior ${maxLk} thn)</div>
                    <div class="flex justify-between"><span>Gaji Pokok (Gapok):</span><span class="font-semibold text-emerald-700">${formatCurrency(simMax.gapok)}</span></div>
                    <div class="flex justify-between"><span>Tunj. Keluarga:</span><span class="font-semibold text-slate-700">${formatCurrency(simMax.tt_kel)}</span></div>
                    <div class="flex justify-between"><span>Tunj. Lama Kerja:</span><span class="font-semibold text-amber-700">${formatCurrency(simMax.tt_lk)}</span></div>
                    <div class="flex justify-between border-b pb-1"><span>Tunj. Profesional (TTT):</span><span class="font-semibold text-orange-700">${formatCurrency(simMax.ttt)}</span></div>
                    <div class="flex justify-between text-sm font-extrabold text-blue-800 pt-1"><span>Total THP:</span><span>${formatCurrency(simMax.thp)}</span></div>
                </div>
            </div>
        </div>

        <!-- 6. Hasil Derivasi Live -->
        <div class="card ${d.warning ? 'border-amber-300' : 'border-emerald-200'}">
            <div class="card-title">Hasil Derivasi Live</div>
            <div class="card-desc">Semua nilai dihitung otomatis dari parameter di atas.</div>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div class="stat-card"><div class="stat-value text-blue-700" id="ab-T">${d.T.toFixed(4)}x</div><div class="stat-label">T (x kali UMK)</div></div>
                <div class="stat-card"><div class="stat-value text-emerald-700" id="ab-sigmaC">${formatCurrency(d.sigmaC)}</div><div class="stat-label">sigmaC (Puncak Rp)</div></div>
                <div class="stat-card"><div class="stat-value text-amber-700" id="ab-s">${sLabel}</div><div class="stat-label">s (spread per grade)</div></div>
                <div class="stat-card"><div class="stat-value text-purple-700" id="ab-g">${formatPercent(gp)}</div><div class="stat-label">g (gap antar grade)</div></div>
                <div class="stat-card"><div class="stat-value text-slate-700">${formatCurrency(U)}</div><div class="stat-label">UMK aktif</div></div>
            </div>
            ${d.warning ? '<div class="mt-3 p-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded">' + d.warning + '</div>' : ''}
        </div>

        <!-- 9. Rumus Ringkas -->
        <div class="card">
            <div class="card-title">Kumpulan Rumus Grade Stacking</div>
            <div class="card-desc">Rumus-rumus yang dipakai dalam pendekatan Grade Stacking.</div>
            <div class="grid grid-cols-1 gap-1.5 mt-2">
                <div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">T</span><span class="text-slate-800">T = sigma x Plafon / UMK</span></div>
                <div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">Constraint</span><span class="text-slate-800">(1+s)^6 x (1+g)^5 = T</span></div>
                <div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">s</span><span class="text-slate-800">s = (T / (1+g)^5)^(1/6) - 1</span></div>
                <div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">Min(D1)</span><span class="text-slate-800">Min(D1) = UMK</span></div>
                <div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">Max</span><span class="text-slate-800">Max(j) = Min(j) x (1+s)</span></div>
                <div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">Min(j+1)</span><span class="text-slate-800">Min(j+1) = Max(j) x (1+g)</span></div>
                <div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">Sub-Level</span><span class="text-slate-800">A = Min, E = Max, B/C/D = linear di antaranya</span></div>
                <div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">Gapok</span><span class="text-slate-800">Gapok = ${approachBaruParams.composition?.gapok || 75}% x Paket (aturan hukum minimal 75% dari Gapok+TT)</span></div>
            </div>
        </div>

        <!-- Action -->
        <div class="flex justify-end gap-3">
            <button onclick="resetApproachBaruParams()" class="btn-secondary">Reset Default</button>
            <button onclick="saveApproachBaruParams()" class="btn-primary">Simpan Parameter</button>
        </div>
    `;
}

// ---- Approach Baru: Input Handlers ----
function onApproachBaruParamChange(key, value) {
    if (key === 'enableStrukturalD31') {
        approachBaruParams.enableStrukturalD31 = (value === true || value === 'true');
        saveToStorage();
        renderMenu2();
        if (currentMenu === 'menu3') renderMenu3();
        if (currentMenu === 'menu5') renderMenu5();
        return;
    }
    if (key === 'enableStrukturalD41') {
        approachBaruParams.enableStrukturalD41 = (value === true || value === 'true');
        saveToStorage();
        renderMenu2();
        if (currentMenu === 'menu3') renderMenu3();
        if (currentMenu === 'menu5') renderMenu5();
        return;
    }
    const numVal = Number(value);
    if (key !== 'modelType' && isNaN(numVal)) return;

    if (key === 'plafon') {
        approachBaruParams.plafon = Math.max(0, numVal);
    } else if (key === 'sigmaPct') {
        approachBaruParams.sigmaPct = Math.min(100, Math.max(70, Math.round(numVal)));
    } else if (key === 'gapPct') {
        approachBaruParams.gapPct = Math.min(5, Math.max(0, numVal));
    } else if (key === 'step') {
        approachBaruParams.step = Math.min(10, Math.max(0, numVal));
    } else if (key === 'hasPasangan') {
        approachBaruParams.hasPasangan = Math.min(1, Math.max(0, Math.round(numVal)));
    } else if (key === 'jumlahAnak') {
        approachBaruParams.jumlahAnak = Math.min(2, Math.max(0, Math.round(numVal)));
    } else if (key === 'tunjKeluargaPerAnak') {
        approachBaruParams.tunjKeluargaPerAnak = Math.max(0, numVal);
    } else if (key === 'tunjLamaKerjaPerTahun') {
        approachBaruParams.tunjLamaKerjaPerTahun = Math.max(0, numVal);
    } else if (key === 'maxMasaKerjaTahun') {
        approachBaruParams.maxMasaKerjaTahun = Math.max(0, numVal);
    } else if (key === 'modelType') {
        approachBaruParams.modelType = value;
    } else if (key === 'managerialPremium') {
        approachBaruParams.managerialPremium = Math.min(1.5, Math.max(1, numVal));
    } else if (key === 'compGapok') {
        approachBaruParams.composition = { gapok: Math.min(100, Math.max(10, Math.round(numVal))) };
    }

    // Sync inputs if set programmatically
    const sigmaSlider = document.getElementById('ab-sigma');
    const gapSlider   = document.getElementById('ab-gap');
    const stepEl      = document.getElementById('ab-step');
    const pasanganEl  = document.getElementById('ab-pasangan');
    const anakEl      = document.getElementById('ab-anak');
    const tunjAnakEl  = document.getElementById('ab-tunj-anak');
    const tunjLkEl    = document.getElementById('ab-tunj-lk');
    const maxLkEl     = document.getElementById('ab-max-lk');
    const premiumEl   = document.getElementById('ab-premium');
    const compGapokSlider = document.getElementById('ab-comp-gapok');
    if (sigmaSlider && key === 'sigmaPct') sigmaSlider.value = approachBaruParams.sigmaPct;
    if (gapSlider && key === 'gapPct')     gapSlider.value = approachBaruParams.gapPct;
    if (stepEl && key === 'step')          stepEl.value = approachBaruParams.step;
    if (pasanganEl && key === 'hasPasangan') pasanganEl.value = approachBaruParams.hasPasangan;
    if (anakEl && key === 'jumlahAnak')    anakEl.value = approachBaruParams.jumlahAnak;
    if (tunjAnakEl && key === 'tunjKeluargaPerAnak') tunjAnakEl.value = approachBaruParams.tunjKeluargaPerAnak;
    if (tunjLkEl && key === 'tunjLamaKerjaPerTahun') tunjLkEl.value = approachBaruParams.tunjLamaKerjaPerTahun;
    if (maxLkEl && key === 'maxMasaKerjaTahun') maxLkEl.value = approachBaruParams.maxMasaKerjaTahun;
    if (premiumEl && key === 'managerialPremium') premiumEl.value = approachBaruParams.managerialPremium;
    if (compGapokSlider && key === 'compGapok') compGapokSlider.value = approachBaruParams.composition.gapok;

    // Full re-render (comparison tables & derivasi need recalc)
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
    if (currentMenu === 'menu4') renderMenu4();
    if (currentMenu === 'menu5') renderMenu5();
}

function onApproachBaruAnchorChange(key, value) {
    const numVal = Number(value);
    if (isNaN(numVal)) return;
    approachBaruParams.anchors = approachBaruParams.anchors || { ...DEFAULT_APPROACH_BARU.anchors };
    approachBaruParams.anchors[key] = Math.min(250, Math.max(10, Math.round(numVal)));
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
    if (currentMenu === 'menu5') renderMenu5();
}

function onApproachBaruMultiplierChange(key, value) {
    const numVal = Number(value);
    if (isNaN(numVal)) return;
    approachBaruParams.subLevelMultipliers = approachBaruParams.subLevelMultipliers || { ...DEFAULT_SUB_LEVEL_MULTIPLIERS };
    approachBaruParams.subLevelMultipliers[key] = Math.min(5.00, Math.max(0.50, Math.round(numVal * 100) / 100));
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
    if (currentMenu === 'menu5') renderMenu5();
}

function onAnchorManualChange(gradeCode, value) {
    const numVal = Number(value);
    if (isNaN(numVal) || numVal < 0) return;
    approachBaruParams.anchorOverrides = approachBaruParams.anchorOverrides || {};
    approachBaruParams.anchorOverrides[gradeCode] = Math.round(numVal * 100) / 100;
    approachBaruParams.anchors = approachBaruParams.anchors || {};
    approachBaruParams.anchors[gradeCode] = approachBaruParams.anchorOverrides[gradeCode];
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
    if (currentMenu === 'menu5') renderMenu5();
}

function resetAnchorOverrides() {
    approachBaruParams.anchorOverrides = {
        D1: 10.0,
        D2: 30.0,
        'D3-1': 85.0,
        'D3-2': 90.0,
        'D4-1': 150.0,
        'D4-2': 155.0,
        D5: 235.0,
        D6: 415.0
    };
    approachBaruParams.anchors = { ...approachBaruParams.anchorOverrides };
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
    if (currentMenu === 'menu5') renderMenu5();
}

function onGapokAnchorChange(gradeCode, value) {
    const numVal = Number(value);
    if (isNaN(numVal) || numVal < 50 || numVal > 100) return;
    approachBaruParams.gapokAnchors = approachBaruParams.gapokAnchors || {};
    approachBaruParams.gapokAnchors[gradeCode] = Math.round(numVal);
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
}

function onApproachBaruStructuralAllowanceChange(group, value) {
    const numVal = Number(value);
    if (isNaN(numVal) || numVal < 0) return;
    approachBaruParams.structuralAllowance = approachBaruParams.structuralAllowance || { A: 200000, B: 400000, C: 600000 };
    approachBaruParams.structuralAllowance[group] = Math.round(numVal);
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
    if (currentMenu === 'menu5') renderMenu5();
}

function onApproachBaruExtraManajerialToggle(checked) {
    if (!checked) {
        approachBaruParams.extraManajerialPct = 0;
    } else {
        approachBaruParams.extraManajerialPct = 50.0;
    }
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
    if (currentMenu === 'menu5') renderMenu5();
}

function onApproachBaruUMKChange(loc) {
    selectedUMK = loc;
    customUmkValue = null; // reset custom value when location changes
    saveToStorage();
    renderMenu2();
    if (currentMenu === 'menu3') renderMenu3();
    if (currentMenu === 'menu4') renderMenu4();
    if (currentMenu === 'menu5') renderMenu5();
}

function onApproachBaruUmkValueChange(value) {
    const cleaned = String(value).replace(/[^\d]/g, '');
    const numVal = cleaned ? Number(cleaned) : NaN;
    console.log('[UMK DEBUG] onApproachBaruUmkValueChange raw:', value, '→ cleaned:', cleaned, '→ numVal:', numVal);
    // Field kosong = hapus override, kembali ke default lokasi
    if (String(value).trim() === '') {
        customUmkValue = null;
    } else {
        if (isNaN(numVal) || numVal <= 0) return;
        customUmkValue = numVal;
    }
    console.log('[UMK DEBUG] customUmkValue set to:', customUmkValue, 'getActiveUmk():', getActiveUmk());
    clearTimeout(_umkDebounceTimer);
    _umkDebounceTimer = setTimeout(() => {
        console.log('[UMK DEBUG] debounce fired, re-render. UMK aktif =', getActiveUmk());
        saveToStorage();
        renderMenu2();
        if (currentMenu === 'menu3') renderMenu3();
        if (currentMenu === 'menu4') renderMenu4();
        if (currentMenu === 'menu5') renderMenu5();
    }, 300);
}

function saveApproachBaruParams() {
    const plafonEl = document.getElementById('ab-plafon');
    const sigmaEl  = document.getElementById('ab-sigma');
    const gapEl    = document.getElementById('ab-gap');
    const stepEl   = document.getElementById('ab-step');
    const premiumEl = document.getElementById('ab-premium');
    const modelTypeEl = document.querySelector('input[name="ab-model-type"]:checked');
    if (plafonEl) approachBaruParams.plafon   = Number(plafonEl.value) || DEFAULT_APPROACH_BARU.plafon;
    if (sigmaEl)  approachBaruParams.sigmaPct = Number(sigmaEl.value)  || DEFAULT_APPROACH_BARU.sigmaPct;
    if (gapEl)    approachBaruParams.gapPct   = Number(gapEl.value)    || DEFAULT_APPROACH_BARU.gapPct;
    if (stepEl)   approachBaruParams.step     = Number(stepEl.value)   || DEFAULT_APPROACH_BARU.step;
    if (premiumEl) approachBaruParams.managerialPremium = Number(premiumEl.value) || 1.03;
    if (modelTypeEl) approachBaruParams.modelType = modelTypeEl.value;

    // Sync komposisi dari form
    const compGapokEl = document.getElementById('ab-comp-gapok');
    if (compGapokEl) {
        approachBaruParams.composition = approachBaruParams.composition || { gapok: 75 };
        approachBaruParams.composition.gapok = Number(compGapokEl.value) || 75;
    }

    // Sync gapokAnchors dari form
    approachBaruParams.gapokAnchors = approachBaruParams.gapokAnchors || { ...DEFAULT_APPROACH_BARU.gapokAnchors };
    ['D1','D2','D3-1','D3-2','D4-1','D4-2','D5','D6'].forEach(k => {
        const el = document.getElementById('ab-gapok-anchor-' + k);
        if (el) approachBaruParams.gapokAnchors[k] = Number(el.value) || DEFAULT_APPROACH_BARU.gapokAnchors[k] || 75;
    });

    // Sync anchors dari Plafon/Sigma (otomatis)
    const umkForAnchors = getActiveUmk();
    const plafonResult = calcAnchorsFromPlafon(
        approachBaruParams.plafon || 15000000,
        approachBaruParams.sigmaPct || 85,
        approachBaruParams.gapPct || 2,
        umkForAnchors
    );
    approachBaruParams.anchors = plafonResult.anchors;
    if (approachBaruParams.anchorOverrides) {
        Object.keys(approachBaruParams.anchorOverrides).forEach(k => {
            if (approachBaruParams.anchorOverrides[k] !== undefined) {
                approachBaruParams.anchors[k] = approachBaruParams.anchorOverrides[k];
            }
        });
    }

    // Sync sub-level multipliers dari form
    approachBaruParams.subLevelMultipliers = approachBaruParams.subLevelMultipliers || { ...DEFAULT_SUB_LEVEL_MULTIPLIERS };
    ['A', 'B', 'C', 'D', 'E'].forEach(key => {
        const el = document.getElementById('ab-mult-' + key);
        if (el) approachBaruParams.subLevelMultipliers[key] = Number(el.value) || DEFAULT_SUB_LEVEL_MULTIPLIERS[key];
    });

    // Sync profile tunjangan dari form
    const pasanganEl = document.getElementById('ab-pasangan');
    const anakEl = document.getElementById('ab-anak');
    const tunjAnakEl = document.getElementById('ab-tunj-anak');
    const tunjLkEl = document.getElementById('ab-tunj-lk');
    const maxLkEl = document.getElementById('ab-max-lk');
    if (pasanganEl) approachBaruParams.hasPasangan = Number(pasanganEl.value) ?? 1;
    if (anakEl) approachBaruParams.jumlahAnak = Number(anakEl.value) ?? 2;
    if (tunjAnakEl) approachBaruParams.tunjKeluargaPerAnak = Number(tunjAnakEl.value) ?? 100000;
    if (tunjLkEl) approachBaruParams.tunjLamaKerjaPerTahun = Number(tunjLkEl.value) ?? 50000;
    if (maxLkEl) approachBaruParams.maxMasaKerjaTahun = Number(maxLkEl.value) ?? 5;

    // Sync structural allowance
    approachBaruParams.structuralAllowance = approachBaruParams.structuralAllowance || { A: 200000, B: 400000, C: 600000 };
    ['A', 'B', 'C'].forEach(key => {
        const el = document.getElementById('ab-struct-' + key);
        if (el) approachBaruParams.structuralAllowance[key] = Number(el.value) || DEFAULT_APPROACH_BARU.structuralAllowance[key];
    });

    const extraCheckbox = document.getElementById('ab-extra-manajerial');
    const extraPctEl = document.getElementById('ab-extra-manajerial-pct');
    if (extraCheckbox) {
        approachBaruParams.extraManajerialPct = extraCheckbox.checked ? (Number(extraPctEl?.value) || 50.0) : 0;
    }

    saveToStorage();
    alert('Parameter Pendekatan Baru berhasil disimpan!');
}

function resetApproachBaruParams() {
    if (!confirm('Reset parameter Pendekatan Baru ke default?')) return;
    approachBaruParams = { 
        ...DEFAULT_APPROACH_BARU, 
        composition: { ...DEFAULT_APPROACH_BARU.composition },
        gapokAnchors: { ...DEFAULT_APPROACH_BARU.gapokAnchors },
        anchors: { ...DEFAULT_APPROACH_BARU.anchors },
        subLevelMultipliers: { ...DEFAULT_SUB_LEVEL_MULTIPLIERS },
        structuralAllowance: { ...DEFAULT_APPROACH_BARU.structuralAllowance }
    };
    selectedUMK = 'Kota Surabaya';
    customUmkValue = null;
    saveToStorage();
    renderMenu2();
}

// =====================================================
// MENU 3: Simulasi Penggajian
// =====================================================
function renderMenu3() {
    const container = document.getElementById('menu3-container');
    if (!container) return;

    if (approach === 'baru') {
        renderMenu3Baru();
        return;
    }

    const umkValue = getActiveUmk();
    const tableData = generateSpreadTableData(umkValue, params, jvScores);

    container.innerHTML = `
        ${approach === 'baru' ? '<div class="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded mb-4">Anda sedang melihat menu milik Pendekatan Lama (basis anchor & loading). Aktifkan Pendekatan Lama untuk mengubah parameternya.</div>' : ''}
        <!-- Filter Bar -->
        <div class="card">
            <div class="card-title"><span>🔍</span> Filter & Info Simulasi</div>
            <div class="flex flex-wrap items-end gap-4">
                <div class="flex-1 min-w-[200px]">
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lokasi UMK</label>
                    <div class="input-field bg-slate-100 font-bold">${selectedUMK} — ${formatCurrency(umkValue)}</div>
                </div>
                <div class="flex-1 min-w-[200px]">
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Filter Track</label>
                    <select id="m3-track" class="select-field" onchange="renderMenu3()">
                        <option value="all">Semua Track</option>
                        <option value="Functional">Functional</option>
                        <option value="Managerial">Managerial</option>
                    </select>
                </div>
                <button onclick="exportSimCSV()" class="btn-secondary">Export CSV</button>
            </div>
        </div>

        <!-- Simulation Table -->
        <div class="card">
            <div class="card-title"><span>📊</span> Tabel Simulasi Spread THP & Gaji Pokok</div>
            <div class="card-desc">
                Menampilkan sebaran rentang Min, Mid, Max berdasarkan UMK ${selectedUMK}. 
                Setiap row membagi Tunjangan Tetap (TT) secara otomatis ke komponen Struktural, Lama Kerja, dan Keluarga.
            </div>
            <div class="sim-table-wrap border border-slate-200">
                <table class="w-full text-center border-collapse border border-slate-300">
                    <thead>
                        <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-center text-xs">
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Grade</th>
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Sub</th>
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Pos</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-blue-50/50" rowspan="2">THP (Total)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-emerald-50/50" rowspan="2">Gapok</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-slate-50" colspan="3">Tunjangan Tetap (TT)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-orange-50/50" rowspan="2">Tunj. Profesional (TTT)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Check 75%</th>
                        </tr>
                        <tr class="bg-slate-50 border-b border-slate-300 text-slate-500 font-semibold uppercase tracking-wider text-[10px] text-center">
                            <th class="py-1 px-2 border border-slate-300 text-center bg-slate-50">Struktural</th>
                            <th class="py-1 px-2 border border-slate-300 text-center bg-slate-50">Keluarga</th>
                            <th class="py-1 px-2 border border-slate-300 text-center bg-amber-50/10">Lama Kerja</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableData
                            .filter(r => document.getElementById('m3-track')?.value === 'all' || r.track === document.getElementById('m3-track')?.value)
                            .map(r => `
                                <tr class="hover:bg-slate-50 border-b border-slate-200 ${r.track === 'Managerial' ? 'row-managerial' : 'row-fungsional'}">
                                    <td class="py-1.5 px-2 border border-slate-300 font-bold text-slate-900 text-center">${r.jenjangName}</td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center">
                                        <span class="font-bold">${r.subLevel}</span>
                                    </td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center">
                                        <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${r.type === 'Min' ? 'bg-red-100 text-red-700' : r.type === 'Max' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">${r.type}</span>
                                    </td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center text-xs font-bold text-slate-900 bg-blue-50/30">${formatCurrency(r.thp)}</td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center text-xs font-semibold text-emerald-800 bg-emerald-50/30">${formatCurrency(r.gapok)}</td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center text-xs text-slate-700 bg-slate-50 font-medium">${formatCurrency(r.struktural)}</td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center text-xs text-slate-700 bg-slate-50 font-medium">${formatCurrency(r.keluarga)}</td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center text-xs text-amber-800 bg-amber-50/10 font-bold">${formatCurrency(r.lamaKerja)}</td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center text-xs text-orange-850 bg-orange-50/30 font-semibold">${formatCurrency(r.ttt)}</td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center">
                                        ${(() => { const ratio = calc75Ratio(r.gapok, r.tt); return `<span class="font-bold ${ratio >= 75 ? 'text-emerald-600' : 'text-red-600'}">${ratio.toFixed(1)}%</span>`; })()}
                                    </td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function exportSimCSV() {
    if (approach === 'baru') {
        exportSimCSVBaru();
        return;
    }
    const umkValue = getActiveUmk();
    const tableData = generateSpreadTableData(umkValue, params, jvScores);
    const headers = ['Jenjang', 'Sub-Level', 'Pos', 'Track', 'THP', 'Gapok', 'TT Struktural', 'TT Keluarga', 'TT Lama Kerja', 'Tunj. Profesional', 'Check75%'];
    const rows = tableData.map(r => [
        r.jenjangName, r.subLevel, r.type, r.track,
        r.thp, r.gapok, r.struktural, r.keluarga, r.lamaKerja, r.ttt,
        calc75Ratio(r.gapok, r.tt).toFixed(1) + '%'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `simulasi_gaji_${selectedUMK.replace(/\s/g, '_')}_${Date.now()}.csv`);
}

// =====================================================
// MENU 4: Comparation Gaji
// =====================================================
function renderMenu4() {
    const container = document.getElementById('menu4-container');
    if (!container) return;

    if (approach === 'baru') {
        renderMenu4Baru();
        return;
    }

    container.innerHTML = `
        ${approach === 'baru' ? '<div class="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold rounded mb-4">Anda sedang melihat menu milik Pendekatan Lama (basis anchor & loading). Aktifkan Pendekatan Lama untuk mengubah parameternya.</div>' : ''}
        <div class="card">
            <div class="card-title"><span>🧭</span> Perbandingan THP antar Lokasi UMK</div>
            <div class="card-desc">
                Pilih 2 hingga 5 lokasi UMK Jawa Timur untuk membandingkan nominal **THP (Take Home Pay - Midpoint)** secara side-by-side.
            </div>
            <div id="comp-selectors" class="space-y-3"></div>
            <div class="flex gap-2 mt-4">
                <button onclick="addCompLocation()" class="btn-secondary">+ Tambah Lokasi</button>
                <button onclick="renderCompTable()" class="btn-primary">Bandingkan</button>
                <button onclick="exportCompCSV()" class="btn-secondary">Export CSV</button>
            </div>
        </div>

        <div class="card">
            <div class="card-title"><span>📊</span> Tabel Perbandingan Side-by-Side (THP Midpoint)</div>
            <div class="sim-table-wrap border border-slate-200">
                <table class="w-full text-left border-collapse border border-slate-200">
                    <thead id="comp-thead"></thead>
                    <tbody id="comp-tbody"></tbody>
                </table>
            </div>
        </div>
    `;

    renderCompSelectors();
}

function renderCompSelectors() {
    const div = document.getElementById('comp-selectors');
    if (!div) return;

    div.innerHTML = compLocations.map((loc, idx) => `
        <div class="flex items-center gap-2">
            <select class="select-field comp-loc" data-idx="${idx}" onchange="compLocations[${idx}]=this.value">
                ${UMK_LOCATIONS.map(u => `<option value="${u}" ${u === loc ? 'selected' : ''}>${u} — ${formatCurrency(UMK_DATA[u])}</option>`).join('')}
            </select>
            ${compLocations.length > 2 ? `<button class="text-red-400 hover:text-red-600 text-sm font-bold" onclick="removeCompLocation(${idx})">&#10005;</button>` : ''}
        </div>
    `).join('');
}

function addCompLocation() {
    if (compLocations.length >= 5) { alert('Maksimal 5 lokasi.'); return; }
    const avail = UMK_LOCATIONS.find(u => !compLocations.includes(u));
    if (avail) { compLocations.push(avail); renderCompSelectors(); }
}

function removeCompLocation(idx) {
    if (compLocations.length <= 2) return;
    compLocations.splice(idx, 1);
    renderCompSelectors();
}

function renderCompTable() {
    if (approach === 'baru') {
        renderCompTableBaru();
        return;
    }
    // Generate data for each location
    const allData = {};
    compLocations.forEach(loc => {
        allData[loc] = generateFullTable((loc === selectedUMK) ? getActiveUmk() : UMK_DATA[loc], params, jvScores);
    });

    // Render header
    const thead = document.getElementById('comp-thead');
    if (!thead) return;

    const locHeaders = compLocations.map(loc =>
        `<th class="py-2 px-2 text-right bg-blue-50/50 min-w-[130px] border border-slate-200">${loc}<br><span class="text-[10px] font-normal normal-case">${formatCurrency(UMK_DATA[loc])}</span></th>`
    ).join('');

    thead.innerHTML = `
        <tr class="bg-slate-100 border-b-2 border-slate-300 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <th class="py-2 px-2 border border-slate-200">Jenjang</th>
            <th class="py-2 px-2 border border-slate-200">Sub-Level</th>
            ${locHeaders}
        </tr>
    `;

    // Render body
    const tbody = document.getElementById('comp-tbody');
    if (!tbody) return;

    let rows = '';
    JENJANG_LIST.forEach(j => {
        SUB_LEVELS.forEach(sl => {
            const cells = compLocations.map(loc => {
                const row = allData[loc]?.find(r => r.jenjangCode === j.code && r.subLevel === sl);
                return `<td class="py-1.5 px-2 text-right text-xs font-semibold border border-slate-200">${row ? formatCurrency(row.thp) : '-'}</td>`;
            }).join('');

            rows += `
                <tr class="hover:bg-slate-50 border-b border-slate-100">
                    <td class="py-1.5 px-2 font-bold text-xs border border-slate-200">${j.name}</td>
                    <td class="py-1.5 px-2 text-center text-xs border border-slate-200">${sl}</td>
                    ${cells}
                </tr>
            `;
        });
    });
    tbody.innerHTML = rows;
}

function exportCompCSV() {
    if (approach === 'baru') {
        exportCompCSVBaru();
        return;
    }
    const allData = {};
    compLocations.forEach(loc => {
        allData[loc] = generateFullTable((loc === selectedUMK) ? getActiveUmk() : UMK_DATA[loc], params, jvScores);
    });

    const headers = ['Jenjang', 'Sub-Level', ...compLocations.map(l => `THP (${l})`)];
    const rows = [];
    JENJANG_LIST.forEach(j => {
        SUB_LEVELS.forEach(sl => {
            const row = [j.name, sl];
            compLocations.forEach(loc => {
                const data = allData[loc]?.find(r => r.jenjangCode === j.code && r.subLevel === sl);
                row.push(data ? data.thp : '');
            });
            rows.push(row);
        });
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `komparasi_gaji_${Date.now()}.csv`);
}

// ---- CSV Download Helper ----
function downloadCSV(content, filename) {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// =====================================================
// MENU 5: Spread Table
// =====================================================
function renderMenu5() {
    const container = document.getElementById('menu5-container');
    if (!container) return;

    // Pendekatan baru: render versi baru
    if (approach === 'baru') {
        renderMenu5Baru();
        return;
    }

    // Use a dummy UMK for percentage generation (it only uses percentages)
    const umkValue = 1000000;
    
    // We only need one row per jenjang/sublevel for the percentage table.
    // generateSpreadTableData creates Min/Mid/Max rows, but we want all in one row.
    const tableHTML = JENJANG_LIST.map(j => {
        return SUB_LEVELS.map(sl => {
            const spread = calcSpread(umkValue, j.code, sl, params);
            return `
                <tr class="hover:bg-slate-50 border border-slate-300">
                    <td class="py-1.5 px-2 font-bold text-slate-900 border border-slate-300 text-center">${j.name}</td>
                    <td class="py-1.5 px-2 text-center border border-slate-300"><span class="font-bold">${sl}</span></td>
                    <td class="py-1.5 px-2 text-center text-xs bg-emerald-50/20 border border-slate-300">${formatPercent(spread.percents.gapok.min, 1)}</td>
                    <td class="py-1.5 px-2 text-center text-xs bg-emerald-50/40 font-semibold border border-slate-300">${formatPercent(spread.percents.gapok.mid, 1)}</td>
                    <td class="py-1.5 px-2 text-center text-xs bg-emerald-50/20 border border-slate-300">${formatPercent(spread.percents.gapok.max, 1)}</td>
                    <td class="py-1.5 px-2 text-center text-xs bg-blue-50/20 border border-slate-300">${formatPercent(spread.percents.thp.min, 1)}</td>
                    <td class="py-1.5 px-2 text-center text-xs bg-blue-50/40 font-semibold border border-slate-300">${formatPercent(spread.percents.thp.mid, 1)}</td>
                    <td class="py-1.5 px-2 text-center text-xs bg-blue-50/20 border border-slate-300">${formatPercent(spread.percents.thp.max, 1)}</td>
                </tr>
            `;
        }).join('');
    }).join('');

    container.innerHTML = `
        <div class="card">
            <div class="card-title"><span>📈</span> Spread Persen Dari UMK</div>
            <div class="card-desc">
                Persentase Gapok dan THP terhadap UMK berdasarkan Anchor dan Step Progression.
            </div>
            <div class="sim-table-wrap border border-slate-300">
                <table class="w-full border-collapse border border-slate-300 text-center">
                    <thead>
                        <tr class="bg-slate-100 border-b border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-center">
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Jenjang</th>
                            <th class="py-2 px-2 text-center border border-slate-300" rowspan="2">Sub</th>
                            <th class="py-2 px-2 text-center bg-emerald-100/50 border border-slate-300" colspan="3">Gaji Pokok (%)</th>
                            <th class="py-2 px-2 text-center bg-blue-100/50 border border-slate-300" colspan="3">THP (%)</th>
                        </tr>
                        <tr class="bg-slate-50 border-b border-slate-300 text-slate-500 font-semibold uppercase tracking-wider text-[10px] text-center">
                            <th class="py-1 px-2 text-center bg-emerald-50/50 border border-slate-300">Min</th>
                            <th class="py-1 px-2 text-center bg-emerald-50/50 border border-slate-300">Mid</th>
                            <th class="py-1 px-2 text-center bg-emerald-50/50 border border-slate-300">Max</th>
                            <th class="py-1 px-2 text-center bg-blue-50/50 border border-slate-300">Min</th>
                            <th class="py-1 px-2 text-center bg-blue-50/50 border border-slate-300">Mid</th>
                            <th class="py-1 px-2 text-center bg-blue-50/50 border border-slate-300">Max</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableHTML}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// =====================================================
// MENU 5 — PENDEKATAN BARU: Spread Table (Grade Stacking)
// =====================================================
function renderMenu5Baru() {
    const container = document.getElementById('menu5-container');
    if (!container) return;

    const C  = approachBaruParams.plafon;
    const sp = approachBaruParams.sigmaPct;
    const gp = approachBaruParams.gapPct;
    const U  = getActiveUmk();
    const d  = deriveGradeStack(U, C, sp, gp);
    const rk = v => Math.round(v / 1000) * 1000;
    const subLabels = ['A', 'B', 'C', 'D', 'E'];
    const modelType = approachBaruParams.modelType || 'squeeze';
    const compG = approachBaruParams.composition?.gapok || 75;

    // Main table rows: 6 grades x 5 sub-levels
    const mainTableRows = d.grades.map(gr => {
        const cells = gr.subs.map((sub, k) => {
            const comps = calcBaruCellComponents(sub.rp, k, modelType, approachBaruParams, 'flat', gr.label);
            const pctSigma = d.sigmaC > 0 ? (comps.thp / d.sigmaC * 100).toFixed(1) : '0';
            return '<td class="py-2 px-3 border border-slate-300 text-center">'
                + '<div class="font-bold text-xs text-slate-900">' + formatCurrency(comps.thp) + '</div>'
                + '<div class="text-[10px] text-slate-500">' + pctSigma + '% dari σ</div></td>';
        }).join('');
        return '<tr class="hover:bg-slate-50 border-b border-slate-200">'
            + '<td class="py-2 px-3 border border-slate-300 font-bold text-xs text-slate-900 whitespace-nowrap">' + gr.name + '</td>'
            + cells + '</tr>';
    }).join('');

    // Gap row: selisih D(j).E → D(j+1).A (Hanya untuk jalur sequential fungsional)
    const gapCells = [];
    const baseGradesOnly = d.grades.filter(gr => !gr.isManagerial);
    for (let j = 0; j < baseGradesOnly.length - 1; j++) {
        const gapAmount = rk(baseGradesOnly[j + 1].min - baseGradesOnly[j].max);
        gapCells.push(baseGradesOnly[j].label + '-' + baseGradesOnly[j + 1].label + ': ' + formatCurrency(gapAmount));
    }

    // Example D3 (index 2), sub C (index 2 = midpoint)
    const hasPasangan = approachBaruParams.hasPasangan ?? 1;
    const jumlahAnak = approachBaruParams.jumlahAnak ?? 2;
    const tunjKeluargaPerAnak = approachBaruParams.tunjKeluargaPerAnak ?? 100000;
    const tunjLamaKerjaPerTahun = approachBaruParams.tunjLamaKerjaPerTahun ?? 50000;
    const maxMasaKerjaTahun = approachBaruParams.maxMasaKerjaTahun ?? 5;

    const exGrade = d.grades.length >= 3 ? d.grades[2] : null;
    let exampleHTML = '';
    if (exGrade) {
        const exSub = exGrade.subs[2]; // C = midpoint
        const comps = calcBaruCellComponents(exSub.rp, 2, modelType, approachBaruParams, 'flat', exGrade.label);
        exampleHTML = `
        <div class="card">
            <div class="card-title">Rincian Komposisi -- Contoh D3-C</div>
            <div class="card-desc">Contoh komposisi untuk grade D3 sub-level C (midpoint). Model: ${modelType === 'squeeze' ? 'Model A (Squeeze)' : 'Model B (Additive)'}. Gapok=${compG}%, TT=Struktural (${formatCurrency(comps.tt_struct)}) + Keluarga (Istri/Suami: ${hasPasangan ? '1' : '0'}, Anak: ${jumlahAnak}) + Lama Kerja (${(maxMasaKerjaTahun/2).toFixed(1)} thn).</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="stat-card"><div class="stat-value text-blue-700">${formatCurrency(comps.thp)}</div><div class="stat-label">Total THP = ${formatPercent((comps.thp/U)*100)} UMK</div></div>
                <div class="stat-card"><div class="stat-value text-emerald-700">${formatCurrency(comps.gapok)}</div><div class="stat-label">Gapok (${compG}%)</div></div>
                <div class="stat-card"><div class="stat-value text-amber-700">${formatCurrency(comps.tt)}</div><div class="stat-label">Tunj. Tetap (Struktural + Keluarga + Lama Kerja)</div></div>
                <div class="stat-card"><div class="stat-value text-orange-700">${formatCurrency(comps.ttt)}</div><div class="stat-label">Tunj. Profesional (Sisa)</div></div>
            </div>
        </div>`;
    }

    // Anchor % table (pct only) - kept as detailed reference
    const anchorRows = d.grades.map(gr => {
        const cells = gr.subs.map(sub =>
            '<td class="py-1.5 px-3 border border-slate-300 text-center text-xs">' + formatPercent(sub.pct) + '</td>'
        ).join('');
        return '<tr class="hover:bg-slate-50 border-b border-slate-200">'
            + '<td class="py-1.5 px-3 border border-slate-300 font-bold text-xs">' + gr.name + '</td>'
            + cells + '</tr>';
    }).join('');

    // Summary anchor table: 6 rows with Min/Mid/Max % UMK, Spread, Gap
    const spreadVal = d.s > 0 ? (d.s * 100).toFixed(1) : '-';
    const summaryRows = d.grades.map((gr, idx) => {
        const minPct = (gr.min / U * 100).toFixed(1);
        const midPct = (gr.mid / U * 100).toFixed(1);
        const maxPct = (gr.max / U * 100).toFixed(1);
        
        let gapUp = '-';
        let nextGrade = null;
        if (gr.label === 'D3-1') nextGrade = d.grades.find(g => g.label === 'D4-1');
        else if (gr.label === 'D3-2') nextGrade = d.grades.find(g => g.label === 'D4-2');
        else if (gr.label === 'D4-1' || gr.label === 'D4-2') nextGrade = d.grades.find(g => g.label === 'D5');
        else if (idx < d.grades.length - 1) nextGrade = d.grades[idx + 1];

        if (nextGrade) {
            const gapRp = rk(nextGrade.min - gr.max);
            if (gapRp >= 0) {
                gapUp = '+Rp' + Math.round(gapRp / 1000) + 'rb';
            } else {
                gapUp = '-Rp' + Math.round(Math.abs(gapRp) / 1000) + 'rb (Overlap)';
            }
        }
        
        return '<tr class="hover:bg-slate-50 border-b border-slate-200">'
            + '<td class="py-2 px-3 border border-slate-300 font-bold text-xs">' + gr.name + '</td>'
            + '<td class="py-2 px-3 border border-slate-300 text-center text-xs">' + minPct + '%</td>'
            + '<td class="py-2 px-3 border border-slate-300 text-center text-xs">' + midPct + '%</td>'
            + '<td class="py-2 px-3 border border-slate-300 text-center text-xs">' + maxPct + '%</td>'
            + '<td class="py-2 px-3 border border-slate-300 text-center text-xs">' + spreadVal + '%</td>'
            + '<td class="py-2 px-3 border border-slate-300 text-center text-xs">' + gapUp + '</td>'
            + '</tr>';
    }).join('');

    // Flat component breakdown table: Paket split per composition
    const componentRows = d.grades.map(gr => gr.subs.map((sub, k) => {
        const comps = calcBaruCellComponents(sub.rp, k, modelType, approachBaruParams, 'flat', gr.label);
        return '<tr class="hover:bg-slate-50 border-b border-slate-200 font-mono text-xs text-center">'
            + '<td class="py-1.5 px-3 border border-slate-300 font-sans font-bold text-slate-900 whitespace-nowrap text-center">' + gr.name + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center font-sans font-semibold">' + subLabels[k] + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center font-bold text-slate-900">' + formatCurrency(comps.thp) + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center text-slate-500 font-sans">' + formatPercent((comps.thp/U)*100) + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center text-emerald-700 font-semibold">' + formatCurrency(comps.gapok) + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center text-slate-700">' + formatCurrency(comps.tt_struct) + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center text-slate-700">' + formatCurrency(comps.tt_kel) + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center text-amber-800 font-semibold">' + formatCurrency(comps.tt_lk) + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center text-orange-700 font-semibold">' + formatCurrency(comps.ttt) + '</td>'
            + '</tr>';
    }).join('')).join('');

    container.innerHTML = `
        <div class="card">
            <div class="card-title">Tabel Spread Grade Stacking</div>
            <div class="card-desc">
                UMK: <strong>${selectedUMK} -- ${formatCurrency(U)}</strong> |
                Plafon: <strong>${formatCurrency(C)}</strong> |
                Sigma: <strong>${sp}%</strong> |
                Gap: <strong>${gp}%</strong> |
                T: <strong>${d.T.toFixed(4)}x</strong> |
                s: <strong>${d.s > 0 ? formatPercent(d.s * 100) : '-'}</strong>
            </div>
        </div>

        ${d.warning ? '<div class="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded mb-4">' + d.warning + '</div>' : ''}

        <!-- Main Table: 6 x 5 -->
        <div class="card">
            <div class="card-title">Struktur Paket per Grade x Sub-Level</div>
            <div class="card-desc">6 grade x 5 sub-level. Tiap sel: Paket THP (Rp) dan persentase terhadap UMK.</div>
            <div class="sim-table-wrap border border-slate-300">
                <table class="w-full border-collapse border border-slate-300 text-center">
                    <thead><tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-center">
                        <th class="py-2 px-3 border border-slate-300 text-center">Grade</th>
                        ${subLabels.map(sl => '<th class="py-2 px-3 border border-slate-300 text-center">' + sl + '</th>').join('')}
                    </tr></thead>
                    <tbody>${mainTableRows}</tbody>
                </table>
            </div>
            <div class="mt-3 text-xs text-slate-500">
                <strong>Gap antar grade:</strong> ${gapCells.join(' | ')}
            </div>
        </div>

        ${exampleHTML}

        <!-- Rincian Komponen per Grade & Sub-Level -->
        <div class="card">
            <div class="card-title">Rincian Komponen per Grade & Sub-Level</div>
            <div class="card-desc">Pemecahan Paket (THP) sesuai Gaji Pokok ${compG}% dan Tunjangan Tetap Keluarga/Masa Kerja (riil).</div>
            <div class="sim-table-wrap border border-slate-300">
                <table class="w-full border-collapse border border-slate-300 text-center font-mono">
                    <thead>
                        <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-[10px] text-center">
                            <th class="py-2 px-2 border border-slate-300" rowspan="2">Grade</th>
                            <th class="py-2 px-2 border border-slate-300" rowspan="2">Sub</th>
                            <th class="py-2 px-2 border border-slate-300" rowspan="2">THP (Total)</th>
                            <th class="py-2 px-2 border border-slate-300" rowspan="2">% UMK</th>
                            <th class="py-2 px-2 border border-slate-300 bg-emerald-50 text-emerald-800" rowspan="2">Gapok</th>
                            <th class="py-2 px-2 border border-slate-300 bg-slate-50" colspan="3">Tunjangan Tetap (TT)</th>
                            <th class="py-2 px-2 border border-slate-300 bg-orange-50 text-orange-850" rowspan="2">Tunj. Profesional (TTT)</th>
                        </tr>
                        <tr class="bg-slate-50 border-b border-slate-300 text-slate-500 font-semibold uppercase tracking-wider text-[9px] text-center">
                            <th class="py-1 px-2 border border-slate-300 text-center bg-slate-50">Struktural</th>
                            <th class="py-1 px-2 border border-slate-300 text-center bg-slate-50">Keluarga</th>
                            <th class="py-1 px-2 border border-slate-300 text-center bg-amber-50/10">Lama Kerja</th>
                        </tr>
                    </thead>
                    <tbody>${componentRows}</tbody>
                </table>
            </div>
        </div>

        <!-- Ringkasan Anchor % per Grade -->
        <div class="card">
            <div class="card-title">Ringkasan Anchor % per Grade</div>
            <div class="card-desc">Anchor % = posisi grade relatif terhadap UMK. Min% = titik masuk (sub-A), Max% = titik atas (sub-E).</div>
            <div class="sim-table-wrap border border-slate-300">
                <table class="w-full border-collapse border border-slate-300 text-center">
                    <thead><tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-center">
                        <th class="py-2 px-3 border border-slate-300 text-center">Grade</th>
                        <th class="py-2 px-3 border border-slate-300 text-center">Min % UMK</th>
                        <th class="py-2 px-3 border border-slate-300 text-center">Mid % UMK</th>
                        <th class="py-2 px-3 border border-slate-300 text-center">Max % UMK</th>
                        <th class="py-2 px-3 border border-slate-300 text-center">Spread (s)</th>
                        <th class="py-2 px-3 border border-slate-300 text-center">Gap ke atas</th>
                    </tr></thead>
                    <tbody>${summaryRows}</tbody>
                </table>
            </div>
        </div>

        <!-- Detail Anchor % Table (referensi) -->
        <div class="card">
            <div class="card-title">Detail Anchor % per Sub-Level</div>
            <div class="card-desc">Persentase setiap sel terhadap UMK aktif (referensi detail).</div>
            <div class="sim-table-wrap border border-slate-300">
                <table class="w-full border-collapse border border-slate-300 text-center">
                    <thead><tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-center">
                        <th class="py-2 px-3 border border-slate-300 text-center">Grade</th>
                        ${subLabels.map(sl => '<th class="py-2 px-3 border border-slate-300 text-center">' + sl + '</th>').join('')}
                    </tr></thead>
                    <tbody>${anchorRows}</tbody>
                </table>
            </div>
        </div>

        <div class="text-xs text-slate-500 mt-2 mb-4 px-1">
            D3 mencakup jalur D3-1 (mulai sub-level A) dan D3-2/manajerial (mulai sub-level C). Demikian pula D4.
        </div>
    `;
}

// =====================================================
// MENU 6: Alur Formula (Formula Flow)
// =====================================================
function renderMenu6() {
    const container = document.getElementById('menu6-container');
    if (!container) return;

    // Pendekatan baru: render versi baru
    if (approach === 'baru') {
        renderMenu6Baru();
        return;
    }

    if (paramMode === 'watson') {
        const wc = params.watsonConfig || { ...DEFAULT_WATSON_CONFIG };
        const res = watsonResult || calcWatsonAnchors(jvScores, wc);
        const targetPct = wc.ceilingMethod === 'rasio'
            ? Number(wc.rhoValue) * (wc.d1Pin + getLoading('D1')) - getLoading('D6')
            : Number(wc.manualTargetPct);
        const d1Pin = Number(wc.d1Pin) || 0;
        const epsilon = res && res.epsilon;
        const stepCards = [
            ['JV dari Menu 1', 'Job Value per jenjang dipakai sebagai input mesin Watson.', 'jv'],
            ['Pin D1', `Pin aktif: ${formatPercent(d1Pin)}.`, 'pin'],
            ['Tentukan plafon D6', wc.ceilingMethod === 'rasio' ? `Plafon dihitung dari rho ${formatNumber(wc.rhoValue)}.` : `Plafon manual: ${formatPercent(wc.manualTargetPct)}.`, 'plafon'],
            ['Hitung epsilon auto/manual', wc.epsilonAuto ? 'Epsilon auto dikejar sistem agar mendekati plafon.' : `Epsilon manual: ${formatNumber(wc.manualEpsilon)}.`, 'epsilon'],
            ['Hitung growth antarjenjang', 'Pertumbuhan diambil dari rasio JV antarjenjang lalu dipangkatkan epsilon.', 'growth'],
            ['Terapkan koridor min/max', `Koridor aktif: ${formatPercent(wc.corridorMin)} - ${formatPercent(wc.corridorMax)}.`, 'koridor'],
            ['Bentuk Anchor D1-D6', 'Anchor utama dibentuk bertahap dari D1 sampai D6.', 'anchor'],
            ['Turunkan D3-2/D4-2', `Managerial premium: ${formatPercent(wc.managerialPremium)}.`, 'premium'],
            ['Anchor masuk ke rumus THP', 'Anchor aktif dipakai untuk THP Mid %.', 'thp']
        ];
        const mainAnchors = ['D1','D2','D3-1','D4-1','D5','D6'];
        const anchorRows = mainAnchors.map(code => {
            const j = JENJANG_LIST.find(x => x.code === code);
            const a = res && res.anchors ? res.anchors[code] : null;
            const status = code === 'D1' || code === 'D6' ? 'utama' : 'turunan';
            return `<tr class="border-b border-slate-100"><td class="py-1.5 px-2 text-xs font-semibold">${j ? j.name : code}</td><td class="py-1.5 px-2 text-xs text-center">${calcJV(jvScores[code] || DEFAULT_SCORES[code] || {})}</td><td class="py-1.5 px-2 text-xs text-center font-bold text-blue-700">${a != null ? formatPercent(a) : '-'}</td><td class="py-1.5 px-2 text-xs text-center">${status}</td></tr>`;
        }).join('');
        const warningHTML = (res && res.warnings && res.warnings.length ? res.warnings : []).map(w => `<li>${w}</li>`).join('') || '<li>Tidak ada warning.</li>';
        flowDetailsCache = {
            'watson-jv': { kind: 'WATSON', title: 'JV dari Menu 1', purpose: 'Job Value masuk sebagai bahan utama mesin Watson.', notes: ['Ambil skor faktor dari Menu 1.'] },
            'watson-pin': { kind: 'WATSON', title: 'Pin D1', purpose: 'Pin D1 = titik awal yang dikunci.', notes: ['Dipakai sebagai basis anchor awal.'] },
            'watson-plafon': { kind: 'WATSON', title: 'Plafon D6', purpose: 'Plafon D6 = target titik paling atas.', notes: ['Bisa dari rho atau target manual.'] },
            'watson-epsilon': { kind: 'WATSON', title: 'Epsilon', purpose: 'Epsilon = kekuatan pengaruh JV terhadap pertumbuhan anchor.', notes: ['Auto mendekati plafon. Manual untuk eksperimen.'] },
            'watson-growth': { kind: 'WATSON', title: 'Growth Antarjenjang', purpose: 'Growth dihitung dari perbandingan JV lalu dipangkatkan epsilon.', notes: ['Lalu dipotong koridor min/max.'] },
            'watson-koridor': { kind: 'WATSON', title: 'Koridor Min/Max', purpose: 'Koridor min/max adalah batas minimum/maksimum kenaikan antarjenjang.', notes: ['Menjaga growth tetap wajar.'] },
            'watson-anchor': { kind: 'WATSON', title: 'Anchor Hasil', purpose: 'Anchor hasil adalah output akhir D1-D6.', notes: ['Dipakai ke rumus THP.'] },
            'watson-premium': { kind: 'WATSON', title: 'Managerial Premium', purpose: 'Premium 1.03 dipakai untuk D3-2 dan D4-2.', notes: ['Sub-level lain tidak diubah.'] },
            'watson-thp': { kind: 'WATSON', title: 'Anchor ke THP', purpose: 'Anchor masuk ke rumus THP sebagai penggerak nilai tengah.', notes: ['Pipeline manual tetap tidak disentuh.'] }
        };
        container.innerHTML = `
            <div class="card border-blue-300">
                <div class="card-title">Alur Formula Watson-Driven</div>
                <div class="card-desc">Mode Watson-Driven aktif. Menu 6 menampilkan hanya alur Watson, rumus Watson, dan variabel Watson yang relevan.</div>
            </div>
            <div class="card">
                <div class="card-title">Alur Watson</div>
                <div class="card-desc">Langkah singkat, urut, live dari parameter aktif.</div>
                <div class="flex flex-col items-center gap-0 my-6">${stepCards.map(([title, hint, id], idx) => `<div class="flow-box clickable flow-${idx < 2 ? 'input' : idx < 4 ? 'calc' : 'process'}" onclick="openFlowDetail('watson-${id}')"><div class="text-[10px] uppercase tracking-wider text-slate-400 mb-1">STEP ${idx + 1}</div><div class="font-bold text-sm">${title}</div><div class="text-xs text-slate-600 mt-1">${hint}</div><span class="flow-q-badge">?</span></div>`).join('<div class="flow-arrow">&#11015;</div>')}</div>
            </div>
            <div class="card">
                <div class="card-title">Kumpulan Rumus Watson</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    ${[
                        ['watson-jv', 'JV = Σ(score × weight)', 'Skor faktor dikali bobot lalu dijumlahkan.'],
                        ['watson-pin', 'Target D6 = ρ × (D1 Pin + Loading D1) - Loading D6', 'Plafon D6 diturunkan dari pin entry dan loading.'],
                        ['watson-epsilon', 'ε = ln(Target D6 / D1 Pin) / ln(JV D6 / JV D1)', 'Epsilon mengatur kekuatan respons anchor terhadap JV.'],
                        ['watson-growth', 'Growth = (JV berikut / JV sekarang)^ε - 1', 'Growth mentranslasi selisih JV ke kenaikan anchor.'],
                        ['watson-koridor', 'Growth final = clamp(Growth, Koridor Min, Koridor Max)', 'Hasil growth dipaksa tetap di koridor yang aman.'],
                        ['watson-premium', 'D3-2 = D3-1 × 1.03; D4-2 = D4-1 × 1.03', 'Sub-level manajerial diturunkan dengan premium tetap.'],
                        ['watson-thp', 'THP Mid% = Anchor% × Multiplier + Loading%', 'Anchor aktif masuk ke rumus THP sebagai nilai tengah.']
                    ].map(([id, rumus, tujuan]) => `<div class="formula-row" onclick="openFlowDetail('${id}')"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">${rumus}</span><span class="text-slate-800">${tujuan}</span></div>`).join('')}
                </div>
            </div>
            <div class="card">
                <div class="card-title">Penjelasan Variabel Watson</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">JV</div><div class="text-xs text-slate-600 mt-1">Skor evaluasi jabatan dari Menu 1. Tujuannya menjadi bahan dasar untuk menghitung anchor Watson.</div></div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">UMK</div><div class="text-xs text-slate-600 mt-1">Lokasi UMK aktif: ${selectedUMK}. Tujuannya menjadi pengali dari persentase ke rupiah.</div></div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">Pin D1</div><div class="text-xs text-slate-600 mt-1">${formatPercent(d1Pin)}. Tujuannya menjadi titik awal yang dikunci untuk memulai perhitungan anchor.</div></div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">Target D6</div><div class="text-xs text-slate-600 mt-1">${formatPercent(targetPct)}. Tujuannya menjadi titik plafon atas yang harus didekati mesin Watson.</div></div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">rho</div><div class="text-xs text-slate-600 mt-1">${formatNumber(wc.rhoValue)}. Tujuannya menetapkan rasio total posisi D6 terhadap entry ketika metode plafon memakai rasio.</div></div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">epsilon</div><div class="text-xs text-slate-600 mt-1">${epsilon != null ? formatNumber(epsilon) : '-'} . Tujuannya mengatur kekuatan pengaruh JV terhadap pertumbuhan anchor.</div></div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">Koridor</div><div class="text-xs text-slate-600 mt-1">${formatPercent(wc.corridorMin)} - ${formatPercent(wc.corridorMax)}. Tujuannya membatasi kenaikan antarjenjang agar tidak terlalu kecil atau terlalu besar.</div></div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">Loading</div><div class="text-xs text-slate-600 mt-1">D1 ${formatPercent(getLoading('D1'))}, D6 ${formatPercent(getLoading('D6'))}. Tujuannya menjadi tambahan tetap per jenjang sebelum masuk ke THP.</div></div>
                    <div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm">Managerial Premium</div><div class="text-xs text-slate-600 mt-1">${formatPercent(wc.managerialPremium)} untuk D3-2/D4-2. Tujuannya memberi perbedaan tipis terhadap pasangan fungsional.</div></div>
                </div>
            </div>
            <div class="card">
                <div class="card-title">Anchor Watson Live</div>
                <div class="sim-table-wrap border border-slate-200 mt-4">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead><tr class="bg-slate-100 border-b-2 border-slate-300"><th class="py-2 px-2">Jenjang</th><th class="py-2 px-2 text-center">JV</th><th class="py-2 px-2 text-center">Anchor %</th><th class="py-2 px-2 text-center">Status</th></tr></thead>
                        <tbody>${anchorRows}</tbody>
                    </table>
                </div>
                <ul class="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-2 list-disc pl-5 mt-3 space-y-0.5">${warningHTML}</ul>
            </div>`;
        return;
    }

    const isLama = currentScheme === 'skema-lama';
    const rk = v => Math.round(v / 1000) * 1000;
    const demoJenjang = JENJANG_LIST.find(j => j.code === selectedJenjang) ? selectedJenjang : 'D3-1';
    const demoJenjangObj = JENJANG_LIST.find(j => j.code === demoJenjang);
    const demoSub = 'B';
    const umkValue = getActiveUmk();
    const anchor   = params.anchors[demoJenjang] || 50;
    const mult     = getMultiplier(demoSub, params);
    const loading  = getLoading(demoJenjang);
    const step     = params.step || 2;
    const cg   = params.composition.gapok;
    const ct   = params.composition.tt;
    const cttt = params.composition.ttt;
    const tsS  = params.ttSplit.struktural;
    const tsL  = params.ttSplit.lamaKerja;
    const tsK  = params.ttSplit.keluarga != null ? params.ttSplit.keluarga : 100 - tsS - tsL;

    const thpPct = anchor * mult;
    const thpVal = rk(umkValue * thpPct / 100);
    const gapokL = rk(thpVal * cg / 100);
    const ttL    = rk(thpVal * ct / 100);
    const tttL   = thpVal - gapokL - ttL;
    const ttStruk  = rk(ttL * tsS / 100);
    const ttLKerja = rk(ttL * tsL / 100);
    const ttKel    = ttL - ttStruk - ttLKerja;
    const thpA    = rk(anchor * umkValue / 100);
    const gapokG  = thpA;
    const ttG     = 0;
    const tttG    = Math.max(0, thpVal - gapokG - ttG);
    const ratioL = (gapokL + ttL) > 0 ? gapokL / (gapokL + ttL) * 100 : 0;
    const ratioG = (gapokG + ttG) > 0 ? gapokG / (gapokG + ttG) * 100 : 0;
    const qBadge = '<span class="flow-q-badge">?</span>';
    const arrow  = '<div class="flow-arrow">&#11015;</div>';
    const stepCard = (badge, title, valueHtml, hint, id, cls) => `<div class="flow-box flow-${cls} clickable" onclick="openFlowDetail('${id}')"><div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">${badge}</div><div class="font-bold text-sm">${title}</div>${valueHtml}${hint ? `<div class="text-[10px] text-slate-500 mt-1">${hint}</div>` : ''}${qBadge}</div>`;
    const stepsInput = [
        stepCard('STEP 1 � INPUT', 'Cari UMK lokasi', `<div class="text-lg font-extrabold text-blue-600">${formatCurrency(umkValue)}</div>`, selectedUMK, 'umk', 'input'),
        stepCard('STEP 2 � INPUT', `Anchor % jenjang ${demoJenjang}`, `<div class="text-lg font-extrabold text-emerald-600">${anchor}%</div>`, 'Menu 2 ? Anchor % per Jenjang', 'anchor', 'input'),
        stepCard('STEP 3 � INPUT', `Multiplier sub-level ${demoSub}`, `<div class="text-lg font-extrabold text-purple-600">� ${mult.toFixed(2)}</div>`, 'Menu 2 ? Sub-Level Multipliers', 'mult', 'input'),
        stepCard('STEP 4 � INPUT', 'Loading jenjang (LOCKED)', `<div class="text-lg font-extrabold text-amber-600">+ ${loading}%</div>`, 'Nilai tetap, tidak bisa diubah', 'loading', 'input')
    ];
    let flowHTML;
    if (isLama) {
        flowHTML = [
            ...stepsInput,
            stepCard('STEP 5 � HITUNG', 'THP Mid %', `<div class="text-base font-extrabold text-blue-600">${anchor}% � ${mult.toFixed(2)} + ${loading}% = ${thpPct.toFixed(1)}%</div>`, '', 'thp-pct', 'calc'),
            stepCard('STEP 6 � HASIL', 'THP Rupiah (Mid)', `<div class="text-lg font-extrabold text-blue-700">${formatCurrency(thpVal)}</div>`, `Min / Max = Mid - / + ${step}%`, 'thp-rp', 'output'),
            stepCard('STEP 7 � HITUNG', 'Bagi komponen dari THP (Composition Matrix)', `<div class="flex flex-col gap-0.5 mt-1 text-xs font-bold"><span class="text-emerald-600">Gapok = THP � ${cg}% = ${formatCurrency(gapokL)}</span><span class="text-amber-600">TT = THP � ${ct}% = ${formatCurrency(ttL)}</span><span class="text-orange-600">TTT = THP - Gapok - TT = ${formatCurrency(tttL)}</span></div>`, '', 'comp-lama', 'process'),
            stepCard('STEP 8 � DETAIL', 'Rincian Tunjangan Tetap', `<div class="flex flex-col gap-0.5 mt-1 text-xs font-bold"><span class="text-amber-600">Struktural = TT � ${tsS}% = ${formatCurrency(ttStruk)}</span><span class="text-amber-600">Lama Kerja = TT � ${tsL}% = ${formatCurrency(ttLKerja)}</span><span class="text-amber-600">Keluarga = sisa = ${formatCurrency(ttKel)}</span></div>`, '', 'tt-detail-lama', 'process'),
            stepCard('STEP 9 � VALIDASI', 'Cek Aturan 75%', `<div class="text-lg font-extrabold ${ratioL >= 75 ? 'text-emerald-600' : 'text-red-600'}">${ratioL.toFixed(1)}%</div>`, 'Gapok � (Gapok + TT) harus = 75%', 'check75', 'output')
        ].join(arrow);
    } else {
        flowHTML = [
            ...stepsInput,
            stepCard('STEP 5 � HITUNG', 'THP Mid %', `<div class="text-base font-extrabold text-blue-600">${anchor}% � ${mult.toFixed(2)} + ${loading}% = ${thpPct.toFixed(1)}%</div>`, '', 'thp-pct', 'calc'),
            stepCard('STEP 6 � HASIL', 'THP Rupiah (Mid)', `<div class="text-lg font-extrabold text-blue-700">${formatCurrency(thpVal)}</div>`, `Min / Max = Mid - / + ${step}% � berbeda per sub-level`, 'thp-rp', 'output'),
            stepCard('STEP 7 � HITUNG', 'THP terendah � Sub-Level A', `<div class="text-base font-extrabold text-slate-700">(${anchor}% + ${loading}%) � UMK = ${formatCurrency(thpA)}</div>`, 'Setara Mult A = 1.00, tanpa pembagian spread', 'thp-a', 'calc'),
            stepCard('STEP 8 � HASIL', 'Gapok SERAGAM per jenjang', `<div class="text-lg font-extrabold text-emerald-700">${formatCurrency(gapokG)}</div>`, `= THP_A � comp.gapok% (${cg}%) � sama untuk A�E`, 'gapok-fixed', 'output'),
                        stepCard('STEP 9 • HITUNG', 'Tunjangan Tetap Riil (TT)', `<div class="text-lg font-extrabold text-amber-600">${formatCurrency(ttG)}</div>`, 'Hanya jika ada profil riil (keluarga/lama kerja/struktural)', 'nongapok-tt', 'process'),
            stepCard('STEP 10 • HASIL', 'Tunjangan Tidak Tetap (TTT)', `<div class="text-lg font-extrabold text-orange-700">${formatCurrency(tttG)}</div>`, '= THP - Gapok - TT • kenaikan multiplier dialokasikan ke TTT', 'ttt-residual', 'output'),
            stepCard('STEP 11 • VALIDASI', 'Cek Aturan 75%', `<div class="text-lg font-extrabold ${ratioG >= 75 ? 'text-emerald-600' : 'text-red-600'}">${ratioG >= 75 ? '100.0%' : ratioG.toFixed(1) + '%'}</div>`, 'Gapok / (Gapok + TT) harus >= 75%', 'check75', 'output')
        ].join(arrow);
    }
    const rumusSections = [
        { title: 'Rumus Dasar � berlaku kedua skema', rows: [['jv', 'Job Value', 'JV = K�15 + E�10 + S�12 + D�15 + C�10 + I�8 + X�8 + V�8 + N�5 + R�9'], ['mult', 'Multiplier Sub-Level', 'A=1.00 � B=1.07 � C=1.15 � D=1.22 � E=1.29'], ['loading', 'Loading per Jenjang (LOCKED)', 'D1=10% � D2=24.2% � D3=38.4% � D4=52.6% � D5=66.8% � D6=81%'], ['spread', 'Spread Min / Mid / Max', 'Min = Mid - Step � Max = Mid + Step'], ['rounding', 'Pembulatan Rupiah', 'Semua nilai Rp dibulatkan ke kelipatan 1.000']]},
        { title: 'Skema Lama', scheme: 'lama', rows: [['thp-pct', 'THP Mid %', 'THP% = Anchor � Mult + Loading'], ['thp-rp', 'THP Rupiah', 'THP(Rp) = round1000( THP% � UMK � 100 )'], ['comp-lama', 'Komposisi Komponen', 'Gapok = THP�cG% � TT = THP�cT% � TTT = THP - Gapok - TT'], ['tt-detail-lama', 'Rincian Tunjangan Tetap', 'Struktural = TT�s% � Lama Kerja = TT�l% � Keluarga = sisa']]},
        { title: 'Skema Gaji Pokok', scheme: 'gp', rows: [['thp-a', 'THP Terendah (Sub A)', 'THP_A = round1000( Anchor x UMK / 100 )'], ['gapok-fixed', 'Gapok Seragam per Jenjang', 'Gapok = round1000( THP_A � comp.gapok% )'], ['nongapok-tt', 'Tunjangan Tetap Riil (TT)', 'TT = Tunjangan Riil (Keluarga + Masa Kerja + Struktural)'], ['ttt-residual', 'Tunjangan Tidak Tetap', 'TTT = THP - Gapok - TT']]},
        { title: 'Validasi', rows: [['check75', 'Aturan 75%', 'Gapok � ( Gapok + TT ) = 75%']] }
    ];
    const rumusHTML = rumusSections.map(sec => `<div class="mt-3 first:mt-0"><div class="flex items-center gap-2 mb-1"><span class="text-xs font-extrabold uppercase tracking-wider text-slate-700">${sec.title}</span>${sec.scheme ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${(sec.scheme === 'lama') === isLama ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}">${(sec.scheme === 'lama') === isLama ? 'SKEMA AKTIF' : 'skema lain'}</span>` : ''}</div>${sec.rows.map(r => `<div class="formula-row" onclick="openFlowDetail('${r[0]}')"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">${r[1]}</span><span class="text-slate-800">${r[2]}</span></div>`).join('')}</div>`).join('');
    flowDetailsCache = { /* existing cache kept by flow modal */ };
    container.innerHTML = `
        <div class="card"><div class="card-title"><span>??</span> Alur Perhitungan Formula</div><div class="card-desc">Diagram alur lengkap menunjukkan dari mana setiap angka berasal dan bagaimana satu sama lain terhubung. Saat ini: <span class="font-bold text-blue-600">${isLama ? 'Skema Lama' : 'Skema Gaji Pokok'}</span>. <span class="font-semibold text-slate-700">Klik kartu mana pun</span> untuk penjelasan lengkapnya.</div></div>
        <div class="card"><div class="card-title"><span>${isLama ? '??' : '??'}</span> ${isLama ? 'Skema Lama' : 'Skema Gaji Pokok'} � Alur Hitung</div><div class="card-desc">Angka di bawah adalah <span class="font-bold">nilai live</span> mengikuti parameter Anda saat ini � Demo: <span class="font-semibold">${demoJenjangObj.name}</span>, Sub-Level <span class="font-semibold">${demoSub}</span>, UMK <span class="font-semibold">${selectedUMK}</span>.</div><div class="flex flex-col items-center gap-0 my-6">${flowHTML}</div></div>
        <div class="card"><div class="card-title"><span>??</span> Kumpulan Rumus</div><div class="card-desc">Semua rumus yang dipakai simulator. Klik baris mana pun untuk penjelasan lengkap beserta contoh hitung live.</div>${rumusHTML}</div>
        <div id="flow-modal" class="modal-overlay" style="display:none" onclick="closeFlowDetail()"><div class="modal-box" onclick="event.stopPropagation()"><button class="modal-close" onclick="closeFlowDetail()" aria-label="Tutup">&times;</button><div id="flow-modal-content"></div></div></div>
        <div class="card"><div class="card-title"><span>??</span> Daftar Variabel</div><div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-slate-800">UMK (Upah Minimum Kabupaten/Kota)</div><div class="text-xs text-slate-600 mt-1">Gaji minimum regional dari 39 lokasi Jawa Timur. Dipilih di Menu 2.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-emerald-700">Anchor %</div><div class="text-xs text-slate-600 mt-1">Persentase dasar Gapok per jenjang. Diinput di Menu 2. Contoh: D3-1 = 100%.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-purple-700">Multiplier (Sub-Level)</div><div class="text-xs text-slate-600 mt-1">Pengali progression A?E. A=1.00, B=1.07, C=1.15, D=1.22, E=1.29.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-amber-700">Loading (Jenjang)</div><div class="text-xs text-slate-600 mt-1">Tambahan THP per jenjang. D1=10%, D2=24.2%, D3=38.4%, D4=52.6%, D5=66.8%, D6=81%.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-slate-700">Step (Spread)</div><div class="text-xs text-slate-600 mt-1">Selisih Min/Max dari Mid. Default = 2%. Gapok Min = Mid - step, Max = Mid + step.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-blue-700">Composition Matrix</div><div class="text-xs text-slate-600 mt-1">Proporsi Gapok / TT / TTT dari THP. Default: 50% / 15% / 35%.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-green-700">Gapok (Gaji Pokok)</div><div class="text-xs text-slate-600 mt-1">Gaji tetap per bulan. Skema Lama: dari THP. Skema Gaji Pokok: dari Anchor � Composition.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-amber-700">TT (Tunjangan Tetap)</div><div class="text-xs text-slate-600 mt-1">Tunjangan tetap = THP � composition.tt%. Terdiri dari Struktural, Lama Kerja, Keluarga.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-orange-700">TTT (Tunjangan Tidak Tetap)</div><div class="text-xs text-slate-600 mt-1">Tunjangan tidak tetap = THP - Gapok - TT. Sisa dari THP setelah pengurangan.</div></div><div class="p-3 bg-slate-50 rounded-lg border border-slate-200"><div class="font-bold text-sm text-slate-700">JV (Job Value)</div><div class="text-xs text-slate-600 mt-1">Skor evaluasi jabatan Watson Wyatt. 10 faktor � bobot. Range: 100�500.</div></div></div></div>
        <div class="card"><div class="card-title"><span>??</span> Perbandingan 2 Skema</div><div class="sim-table-wrap border border-slate-200"><table class="w-full text-center border-collapse border border-slate-300 text-sm"><thead><tr class="bg-slate-100 border-b-2 border-slate-300"><th class="py-2 px-3 border border-slate-300">Aspek</th><th class="py-2 px-3 border border-slate-300 bg-blue-50">Skema Lama</th><th class="py-2 px-3 border border-slate-300 bg-emerald-50">Skema Gaji Pokok</th></tr></thead><tbody><tr class="border-b border-slate-200"><td class="py-2 px-3 border border-slate-300 font-semibold text-left">Gapok</td><td class="py-2 px-3 border border-slate-300">Anchor � Multiplier<br><span class="text-[10px] text-slate-500">(beragam per sub-level)</span></td><td class="py-2 px-3 border border-slate-300">Anchor � Composition%<br><span class="text-[10px] text-emerald-600 font-bold">(seragam per jenjang)</span></td></tr><tr class="border-b border-slate-200"><td class="py-2 px-3 border border-slate-300 font-semibold text-left">THP</td><td class="py-2 px-3 border border-slate-300">Gapok + Loading<br><span class="text-[10px] text-slate-500">(beragam per sub-level)</span></td><td class="py-2 px-3 border border-slate-300">Anchor � Mult + Loading<br><span class="text-[10px] text-blue-600">(beragam per sub-level)</span></td></tr><tr class="border-b border-slate-200"><td class="py-2 px-3 border border-slate-300 font-semibold text-left">Composition</td><td class="py-2 px-3 border border-slate-300">THP � %<br><span class="text-[10px] text-slate-500">(semua pakai THP)</span></td><td class="py-2 px-3 border border-slate-300">Gapok dari Anchor, TT/TTT dari THP<br><span class="text-[10px] text-slate-500">(Gapok tidak dari THP)</span></td></tr><tr class="border-b border-slate-200"><td class="py-2 px-3 border border-slate-300 font-semibold text-left">Spread Gapok</td><td class="py-2 px-3 border border-slate-300">Min / Mid / Max<br><span class="text-[10px] text-slate-500">(ada spread �step)</span></td><td class="py-2 px-3 border border-slate-300">Seragam<br><span class="text-[10px] text-emerald-600 font-bold">(Min = Mid = Max)</span></td></tr><tr><td class="py-2 px-3 border border-slate-300 font-semibold text-left">Sumber JV</td><td class="py-2 px-3 border border-slate-300" colspan="2">Menu 1 � Watson Wyatt 10 Faktor (display only)</td></tr></tbody></table></div></div>`;
}

// =====================================================
// MENU 6 — PENDEKATAN BARU: Alur Formula (Grade Stacking)
// =====================================================
function renderMenu6Baru() {
    const container = document.getElementById('menu6-container');
    if (!container) return;

    const C  = approachBaruParams.plafon;
    const sp = approachBaruParams.sigmaPct;
    const gp = approachBaruParams.gapPct;
    const U  = getActiveUmk();
    const d  = deriveGradeStack(U, C, sp, gp);
    const rk = v => Math.round(v / 1000) * 1000;
    const sLabel = d.s > 0 ? formatPercent(d.s * 100) : '-';
    const compG  = approachBaruParams.composition?.gapok || 75;
    const modelType = approachBaruParams.modelType || 'squeeze';

    // Demo: D3 (grade index 2), sub C (index 2)
    const exGrade = d.grades.length >= 3 ? d.grades[2] : null;
    const exSub   = exGrade ? exGrade.subs[2] : null;
    const exPaket = exSub ? exSub.rp : 0;
    const comps   = calcBaruCellComponents(exPaket, 2, modelType, approachBaruParams, 'flat', exGrade ? exGrade.label : null);

    // Mini table for step 5: Min/Max per grade
    const miniTableRows = d.grades.map(gr =>
        '<tr class="border-b border-slate-100">'
        + '<td class="py-1 px-2 text-xs font-semibold">' + gr.label + '</td>'
        + '<td class="py-1 px-2 text-xs text-right">' + formatCurrency(rk(gr.min)) + '</td>'
        + '<td class="py-1 px-2 text-xs text-right">' + formatCurrency(rk(gr.max)) + '</td></tr>'
    ).join('');

    const qBadge = '<span class="flow-q-badge">?</span>';
    const arrow  = '<div class="flow-arrow">&#11015;</div>';
    const stepCard = (badge, title, valueHtml, hint, id, cls) =>
        '<div class="flow-box flow-' + cls + ' clickable" onclick="openFlowDetail(\'baru-' + id + '\')">'
        + '<div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">' + badge + '</div>'
        + '<div class="font-bold text-sm">' + title + '</div>'
        + valueHtml
        + (hint ? '<div class="text-[10px] text-slate-500 mt-1">' + hint + '</div>' : '')
        + qBadge + '</div>';

    const mults = approachBaruParams.subLevelMultipliers || DEFAULT_SUB_LEVEL_MULTIPLIERS;
    const multLabels = 'A=' + mults.A + ', B=' + mults.B + ', C=' + mults.C + ', D=' + mults.D + ', E=' + mults.E;

    const flowHTML = [
        stepCard('STEP 1 - INPUT', 'UMK Lokasi',
            '<div class="text-lg font-extrabold text-blue-600">' + formatCurrency(U) + '</div>',
            selectedUMK, 'umk', 'input'),
        stepCard('STEP 2 - INPUT', 'Plafon & Sigma',
            '<div class="flex flex-col gap-0.5 mt-1 text-xs font-bold">'
            + '<span class="text-slate-700">Plafon = ' + formatCurrency(C) + '</span>'
            + '<span class="text-blue-600">sigmaC = ' + formatCurrency(d.sigmaC) + '</span></div>',
            'sigma = ' + sp + '%', 'plafon-sigma', 'input'),
        stepCard('STEP 3 - HITUNG', 'T = sigmaC / UMK',
            '<div class="text-lg font-extrabold text-blue-700">' + d.T.toFixed(4) + 'x</div>',
            formatCurrency(d.sigmaC) + ' / ' + formatCurrency(U), 't-calc', 'calc'),
        stepCard('STEP 4 - DERIVASI', 'Anchor + Multiplier',
            '<div class="flex flex-col gap-0.5 mt-1 text-xs font-bold">'
            + '<span class="text-amber-600">Sub A = Anchor% x UMK x Premium</span>'
            + '<span class="text-purple-600">' + multLabels + '</span></div>',
            'thp_base = thpA x Multiplier', 's-derive', 'calc'),
        stepCard('STEP 5 - BANGUN', 'Bangun 8 Grade (A-E)',
            '<div class="overflow-x-auto mt-1"><table class="w-full text-left border-collapse">'
            + '<thead><tr class="border-b border-slate-200"><th class="py-1 px-2 text-[10px]">Grade</th><th class="py-1 px-2 text-[10px] text-right">Min(A)</th><th class="py-1 px-2 text-[10px] text-right">Max(E)</th></tr></thead>'
            + '<tbody>' + miniTableRows + '</tbody></table></div>',
            'Sub A = dasar, B-E = A x mult', 'build', 'process'),
        stepCard('STEP 6 - PECAH', 'Gapok / TunjTetap / TunjProf',
            '<div class="flex flex-col gap-0.5 mt-1 text-xs font-bold">'
            + '<span class="text-emerald-600">Gapok = round(Anchor% x UMK) = ' + formatCurrency(comps.gapok) + '</span>'
            + '<span class="text-amber-600">TT = TT_kel + TT_lk + TT_struct = ' + formatCurrency(comps.tt) + '</span>'
            + '<span class="text-orange-600">TTT = max(0, (thp_base - gapok) - TT) = ' + formatCurrency(comps.ttt) + '</span>'
            + '<span class="text-blue-600">THP = Gapok + TT + TTT = ' + formatCurrency(comps.thp) + '</span></div>',
            'Contoh D3-C (' + formatCurrency(comps.thp) + ')', 'pecah', 'output')
    ].join(arrow);

    // Flow details cache
    flowDetailsCache = {
        'baru-umk': { kind: 'GRADE STACKING', title: 'UMK Lokasi', purpose: 'Upah Minimum Kab/Kota menjadi dasar untuk Sub-Level A pada setiap grade.', notes: ['Pilih dari 39 lokasi Jawa Timur di Menu 2.'] },
        'baru-plafon-sigma': { kind: 'GRADE STACKING', title: 'Plafon & Sigma', purpose: 'Plafon = batas atas THP. Sigma = persentase plafon yang menjadi puncak tetap.', notes: ['sigmaC = Plafon x sigma%.'] },
        'baru-t-calc': { kind: 'GRADE STACKING', title: 'T = sigmaC / UMK', purpose: 'T adalah rasio puncak terhadap UMK. Menentukan seberapa lebar total struktur.', notes: ['T < 1.05 = terlalu sempit.'] },
        'baru-s-derive': { kind: 'GRADE STACKING', title: 'Anchor + Multiplier', purpose: 'Sub-Level A ditentukan oleh Anchor%. B-E ditentukan oleh Multiplier relatif terhadap A.', notes: ['A = Anchor% x UMK x Premium (jika managerial).', 'thp_base = thpA x Multiplier.'] },
        'baru-build': { kind: 'GRADE STACKING', title: 'Bangun Grade', purpose: '8 grade dibangun dari anchor + multiplier. Sub A = dasar, B-E = A x multiplier.', notes: ['D3-2 dan D4-2 menggunakan Premium Managerial dari D3-1 dan D4-1.'] },
        'baru-pecah': { kind: 'GRADE STACKING', title: 'Pecahan Komponen', purpose: 'Gapok dikunci per grade: Gapok = round(Anchor% x UMK). Tunj Tetap (TT) Murni Riil = TT_kel + TT_lk + TT_struct. Sub-Level Multiplier menambah TTT_gross = max(0, thp_base - Gapok), TTT = max(0, TTT_gross - TT). THP = Gapok + TT + TTT (TT menyerap/squeezer TTT).', notes: ['Aturan hukum: Gapok/(Gapok+TT) minimal 75%.'] }
    };

    // Formula rows
    const rumusRows = [
        ['T', 'T = (sigmaPct% x Plafon) / UMK'],
        ['Sub A (THP)', 'thpA = Anchor% x UMK x Premium'],
        ['Sub-Level THP', 'thp_base = thpA x Multiplier_X'],
        ['Multipliers', 'A=' + mults.A + ', B=' + mults.B + ', C=' + mults.C + ', D=' + mults.D + ', E=' + mults.E],
        ['Gapok (Konstan)', 'Gapok = round(Anchor% x UMK x Premium) (dikunci per grade)'],
        ['Tunj Tetap (TT)', 'TT = TT_kel + TT_lk + TT_struct (Murni profil riil)'],
        ['Tunj Prof (TTT)', 'TTT_gross = max(0, thp_base - Gapok); TTT = max(0, TTT_gross - TT)'],
        ['Total THP', 'THP = Gapok + TT + TTT (TT menyerap/squeezer TTT)']
    ];
    const rumusHTML = rumusRows.map(r =>
        '<div class="formula-row"><span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">' + r[0] + '</span>'
        + '<span class="text-slate-800">' + r[1] + '</span></div>'
    ).join('');

    // Variable cards
    const varCards = [
        { name: 'UMK', desc: 'Upah Minimum Kab/Kota aktif: ' + selectedUMK + ' = ' + formatCurrency(U) + '. Dasar perhitungan.' },
        { name: 'Plafon (C)', desc: formatCurrency(C) + '. Batas atas THP.' },
        { name: 'Sigma', desc: sp + '% dari plafon. sigmaC = ' + formatCurrency(d.sigmaC) + '.' },
        { name: 'T', desc: Number(d.T.toFixed(4)) + 'x UMK. Rasio puncak terhadap UMK.' },
        { name: 'Anchor', desc: 'Persentase dasar Sub A terhadap UMK per grade. D1=' + anchors.D1 + '%, D6=' + anchors.D6 + '%.' },
        { name: 'Multipliers', desc: 'A=' + mults.A + ', B=' + mults.B + ', C=' + mults.C + ', D=' + mults.D + ', E=' + mults.E + '. Multiplier sub-level (menambah TTT).' },
        { name: 'Gapok', desc: 'Gaji Pokok dikunci konstan per grade = round(Anchor% x UMK x Premium).' },
        { name: 'Tunj Tetap (TT)', desc: 'Tunjangan Riil dari Profil: TT_kel + TT_lk + TT_struct.' },
        { name: 'Tunj Prof (TTT)', desc: 'Sisa TTT_gross setelah diserap oleh TT: TTT = max(0, TTT_gross - TT).' }
    ];
    const varCardsHTML = varCards.map(v =>
        '<div class="p-3 bg-slate-50 rounded-lg border border-slate-200">'
        + '<div class="font-bold text-sm text-slate-800">' + v.name + '</div>'
        + '<div class="text-xs text-slate-600 mt-1">' + v.desc + '</div></div>'
    ).join('');

    container.innerHTML = `
        <div class="card">
            <div class="card-title">Alur Pendekatan Baru (Grade Stacking)</div>
            <div class="card-desc">
                Diagram alur Grade Stacking. Angka di bawah adalah <span class="font-bold">nilai live</span> mengikuti parameter Anda saat ini.
                Demo: <span class="font-semibold">D3-C</span>,
                UMK <span class="font-semibold">${selectedUMK}</span>.
                <span class="font-semibold text-slate-700">Klik kartu mana pun</span> untuk penjelasan lengkapnya.
            </div>
        </div>
        <div class="card">
            <div class="card-title">Alur Hitung Grade Stacking</div>
            <div class="card-desc">Langkah-langkah perhitungan dari input sampai output, dengan nilai live.</div>
            <div class="flex flex-col items-center gap-0 my-6">${flowHTML}</div>
        </div>
        <div class="card">
            <div class="card-title">Kumpulan Rumus Grade Stacking</div>
            <div class="card-desc">Semua rumus pendekatan baru.</div>
            <div class="grid grid-cols-1 gap-1.5 mt-2">${rumusHTML}</div>
        </div>
        <div class="card">
            <div class="card-title">Daftar Variabel Pendekatan Baru</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">${varCardsHTML}</div>
        </div>
        <div id="flow-modal" class="modal-overlay" style="display:none" onclick="closeFlowDetail()">
            <div class="modal-box" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeFlowDetail()" aria-label="Tutup">&times;</button>
                <div id="flow-modal-content"></div>
            </div>
        </div>
    `;
}

// ---- Flow Detail Modal ----
let flowDetailsCache = {};

function openFlowDetail(id) {
    const d = flowDetailsCache[id];
    const contentEl = document.getElementById('flow-modal-content');
    const modalEl = document.getElementById('flow-modal');
    if (!d || !contentEl || !modalEl) return;
    contentEl.innerHTML = renderFlowDetailContent(d);
    modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', flowEscHandler);
}

function closeFlowDetail() {
    const modalEl = document.getElementById('flow-modal');
    if (modalEl) modalEl.style.display = 'none';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', flowEscHandler);
}

function flowEscHandler(e) {
    if (e.key === 'Escape') closeFlowDetail();
}

function renderFlowDetailContent(d) {
    return `
        <div class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mb-2">${d.kind}</div>
        <h3 class="text-lg font-extrabold text-slate-900 mb-2">${d.title}</h3>
        <p class="text-sm text-slate-600 mb-4">${d.purpose}</p>
        ${d.inputs && d.inputs.length ? `
        <div class="mb-4">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Input yang dibutuhkan</div>
            <div class="flex flex-col gap-1">
                ${d.inputs.map(i => `<div class="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200"><span>${i.name}</span><span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded whitespace-nowrap ${i.src === 'LOCKED' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}">${i.src}</span></div>`).join('')}
            </div>
        </div>` : ''}
        ${d.formulas && d.formulas.length ? `
        <div class="mb-4">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Rumus</div>
            <pre class="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto leading-relaxed font-mono">${d.formulas.join('\n')}</pre>
        </div>` : ''}
        ${d.example && d.example.length ? `
        <div class="mb-4">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Contoh hitung — parameter Anda saat ini</div>
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs font-mono leading-relaxed text-amber-900">${d.example.join('<br>')}</div>
        </div>` : ''}
        ${d.notes && d.notes.length ? `
        <div>
            <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Catatan</div>
            <ul class="list-disc pl-5 text-sm text-slate-600 space-y-1">${d.notes.map(n => `<li>${n}</li>`).join('')}</ul>
        </div>` : ''}
    `;
}

// ---- Scheme Toggle ----
function toggleScheme(scheme) {
    currentScheme = scheme;
    // Update button states
    document.getElementById('btn-skema-lama').classList.toggle('active', scheme === 'skema-lama');
    document.getElementById('btn-skema-gapok').classList.toggle('active', scheme === 'skema-gapok');
    // Save to localStorage
    localStorage.setItem('payroll_sim_scheme', scheme);
    // Re-render current menu
    showMenu(currentMenu);
}

function calcBaruCellComponents(base_THP, subIdx, modelType, params, rowType, gradeCode) {
    const rk = v => Math.round(v / 1000) * 1000;
    const umkVal = getActiveUmk();
    const gapokAnchors = approachBaruParams?.gapokAnchors || {};
    const gapokPct = gradeCode && gapokAnchors[gradeCode] !== undefined ? gapokAnchors[gradeCode] : (approachBaruParams?.composition?.gapok || 75);
    const gapok = rk(umkVal * gapokPct / 100);

    const plafonCap = params?.plafon || 15000000;

    // TT Riil components (varies by sub-level A-E)
    let years = (subIdx / 4) * (params?.maxMasaKerjaTahun ?? 5);

    const hasPas = params?.hasPasangan ?? 1;
    const anak = params?.jumlahAnak ?? 2;
    const tt_kel = rk((Number(hasPas) + Number(anak)) * (params?.tunjKeluargaPerAnak ?? 100000));
    const tt_lk = rk(years * (params?.tunjLamaKerjaPerTahun ?? 50000));

    let tt_struct = 0;
    if (gradeCode) {
        const jInfo = JENJANG_LIST.find(j => j.code === gradeCode);
        if (jInfo && jInfo.structuralGroup) {
            const group = jInfo.structuralGroup;
            let nominal = (params?.structuralAllowance && params?.structuralAllowance[group]) || 0;
            if (gradeCode === 'D3-1' && params?.enableStrukturalD31 === false) {
                nominal = 0;
            } else if (gradeCode === 'D4-1' && params?.enableStrukturalD41 === false) {
                nominal = 0;
            } else if (jInfo.type === 'manajerial' && params?.extraManajerialPct > 0) {
                nominal = nominal * (1 + params.extraManajerialPct / 100);
            }
            tt_struct = rk(nominal);
        }
    }

    const tt = tt_kel + tt_lk + tt_struct;

    let thp, ttt;
    const activeModel = modelType || approachBaruParams?.modelType || 'squeeze';
    if (activeModel === 'additive') {
        // Model B (Additive): Tunjangan Tetap (TT) ditambahkan di atas base_THP menaikkan Total THP
        ttt = Math.max(0, base_THP - gapok);
        thp = Math.min(plafonCap, base_THP + tt);
    } else {
        // Model A (Squeeze): Total THP dikunci di base_THP, TT memotong TTT
        const ttRiil = Math.max(0, base_THP - gapok);
        ttt = Math.max(0, ttRiil - tt);
        thp = Math.min(plafonCap, base_THP);
    }

    return { thp, gapok, tt, ttt, tt_kel, tt_lk, tt_struct };
}

// =====================================================
// MENU 3 — PENDEKATAN BARU: Simulasi Penggajian (Grade Stacking)
// =====================================================
function renderMenu3Baru() {
    const container = document.getElementById('menu3-container');
    if (!container) return;

    const C  = approachBaruParams.plafon;
    const sp = approachBaruParams.sigmaPct;
    const gp = approachBaruParams.gapPct;
    const stepVal = approachBaruParams.step || 2;
    const U  = getActiveUmk();
    const d  = deriveGradeStack(U, C, sp, gp);
    const compG = approachBaruParams.composition?.gapok || 75;
    const modelType = approachBaruParams.modelType || 'squeeze';
    const rk = v => Math.round(v / 1000) * 1000;
    const subLabels = ['A', 'B', 'C', 'D', 'E'];

    let rowsHTML = '';

    d.grades.forEach(gr => {
        gr.subs.forEach((sub, subIdx) => {
            const subLabel = subLabels[subIdx];
            const baseTHP = sub.rp;

                const comps = calcBaruCellComponents(baseTHP, subIdx, modelType, approachBaruParams, subLabel, gr.label);

                const gapokPct = (comps.gapok / U) * 100;
                const pctSigma = d.sigmaC > 0 ? (comps.thp / d.sigmaC * 100).toFixed(1) : '0';

                const ratio = calc75Ratio(comps.gapok, comps.tt);
                const ratioText = ratio.toFixed(1) + '%';
                const passRule = ratio >= 75;

                const badgeClass = subIdx === 0 ? 'bg-red-100 text-red-700' : subIdx === 4 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

                rowsHTML += `
                    <tr class="hover:bg-slate-50 border-b border-slate-200 font-mono text-xs text-center">
                        <td class="py-1.5 px-2 border border-slate-300 font-sans font-bold text-slate-900 text-center whitespace-nowrap">${gr.name}</td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-sans">
                            <span class="font-bold">${subLabel}</span>
                        </td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-sans">
                            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeClass}">${subLabel}</span>
                        </td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-900 bg-blue-50/30">${formatCurrency(comps.thp)}<br><span class="text-[10px] font-sans text-slate-500 font-normal">${pctSigma}% dari σ</span></td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-semibold text-emerald-800 bg-emerald-50/30">${formatCurrency(comps.gapok)}<br><span class="text-[10px] font-sans text-slate-500 font-normal">${formatPercent(gapokPct)} UMK</span></td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center text-slate-700 bg-slate-50 font-medium">${formatCurrency(comps.tt_struct)}</td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center text-slate-700 bg-slate-50 font-medium">${formatCurrency(comps.tt_kel)}</td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center text-amber-800 bg-amber-50/10 font-bold">${formatCurrency(comps.tt_lk)}</td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center text-orange-850 bg-orange-50/30 font-semibold">${formatCurrency(comps.ttt)}</td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-sans">
                            <span class="font-bold ${passRule ? 'text-emerald-600' : 'text-amber-600'}">${ratioText}</span>
                        </td>
                    </tr>
                `;
        });
    });

    container.innerHTML = `
        ${d.warning ? '<div class="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded mb-4">' + d.warning + '</div>' : ''}
        
        <!-- Filter Bar -->
        <div class="card">
            <div class="card-title">Filter & Info Simulasi</div>
            <div class="flex flex-wrap items-end gap-4">
                <div class="flex-grow min-w-[200px]">
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lokasi UMK</label>
                    <div class="input-field bg-slate-100 font-bold">${selectedUMK} — ${formatCurrency(U)}</div>
                </div>
                <div class="flex-grow min-w-[200px]">
                    <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Model & Komposisi Aktif</label>
                    <div class="input-field bg-slate-100 font-bold">${modelType === 'squeeze' ? 'Model A (Squeeze)' : 'Model B (Additive)'} | Gapok ${compG}% | TT Keluarga & Masa Kerja (Riil) | Step +/-${stepVal}% UMK</div>
                </div>
                <button onclick="exportSimCSV()" class="btn-secondary">Export CSV</button>
            </div>
        </div>

        <!-- Simulation Table -->
        <div class="card">
            <div class="card-title">Tabel Simulasi Spread THP & Gaji Pokok (Grade Stacking)</div>
            <div class="card-desc">
                Menampilkan sebaran Min, Mid, Max untuk 6 grade x 5 sub-level berdasarkan UMK ${selectedUMK}.
                Model kalkulasi: ${modelType === 'squeeze' ? 'Model A (Tunjangan memotong Tunjangan Profesional)' : 'Model B (Tunjangan ditambahkan di atas Paket)'}.
            </div>
            <div class="sim-table-wrap border border-slate-200">
                <table class="w-full text-center border-collapse border border-slate-300">
                    <thead>
                        <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-center text-xs">
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Grade</th>
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Sub</th>
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Pos</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-blue-50/50" rowspan="2">THP (Total)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-emerald-50/50" rowspan="2">Gapok</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-slate-50" colspan="3">Tunjangan Tetap (TT)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-orange-50/50" rowspan="2">Tunj. Profesional (TTT)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Rasio Pokok/Tetap (Min 75%)</th>
                        </tr>
                        <tr class="bg-slate-50 border-b border-slate-300 text-slate-500 font-semibold uppercase tracking-wider text-[10px] text-center">
                            <th class="py-1 px-2 border border-slate-300 text-center bg-slate-50">Struktural</th>
                            <th class="py-1 px-2 border border-slate-300 text-center bg-slate-50">Keluarga</th>
                            <th class="py-1 px-2 border border-slate-300 text-center bg-amber-50/10">Lama Kerja</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// =====================================================
// MENU 4 — PENDEKATAN BARU: Perbandingan Gaji (Grade Stacking)
// =====================================================
function renderMenu4Baru() {
    const container = document.getElementById('menu4-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card">
            <div class="card-title">Perbandingan THP antar Lokasi UMK (Grade Stacking)</div>
            <div class="card-desc">
                Pilih 2 hingga 5 lokasi UMK Jawa Timur untuk membandingkan nominal **THP (Paket)** secara side-by-side.
            </div>
            <div id="comp-selectors" class="space-y-3"></div>
            <div class="flex gap-2 mt-4">
                <button onclick="addCompLocation()" class="btn-secondary">+ Tambah Lokasi</button>
                <button onclick="renderCompTable()" class="btn-primary">Bandingkan</button>
                <button onclick="exportCompCSV()" class="btn-secondary">Export CSV</button>
            </div>
        </div>

        <div class="card">
            <div class="card-title">Tabel Perbandingan Side-by-Side (THP Paket)</div>
            <div class="sim-table-wrap border border-slate-200">
                <table class="w-full text-left border-collapse border border-slate-200">
                    <thead id="comp-thead"></thead>
                    <tbody id="comp-tbody"></tbody>
                </table>
            </div>
        </div>
    `;

    renderCompSelectors();
}

function renderCompTableBaru() {
    const C  = approachBaruParams.plafon;
    const sp = approachBaruParams.sigmaPct;
    const gp = approachBaruParams.gapPct;

    // Generate data for each location
    const allData = {};
    compLocations.forEach(loc => {
        const U = (loc === selectedUMK) ? getActiveUmk() : (UMK_DATA[loc] || 3000000);
        allData[loc] = deriveGradeStack(U, C, sp, gp);
    });

    // Render header
    const thead = document.getElementById('comp-thead');
    if (!thead) return;

    const locHeaders = compLocations.map(loc =>
        `<th class="py-2 px-2 text-right bg-blue-50/50 min-w-[130px] border border-slate-200">${loc}<br><span class="text-[10px] font-normal normal-case">${formatCurrency(UMK_DATA[loc])}</span></th>`
    ).join('');

    thead.innerHTML = `
        <tr class="bg-slate-100 border-b-2 border-slate-300 text-xs font-semibold uppercase tracking-wider text-slate-600">
            <th class="py-2 px-2 border border-slate-200">Grade</th>
            <th class="py-2 px-2 border border-slate-200">Sub-Level</th>
            ${locHeaders}
        </tr>
    `;

    // Render body
    const tbody = document.getElementById('comp-tbody');
    if (!tbody) return;

    const subLabels = ['A', 'B', 'C', 'D', 'E'];
    let rows = '';
    
    const modelType = approachBaruParams.modelType || 'squeeze';
    for (let j = 0; j < 8; j++) {
        subLabels.forEach((sl, slIdx) => {
            const cells = compLocations.map(loc => {
                const d = allData[loc];
                const gr = d?.grades[j];
                const sub = gr?.subs[slIdx];
                if (!sub) return `<td class="py-1.5 px-2 text-right text-xs font-semibold border border-slate-200">-</td>`;
                
                // Calculate actual THP based on UMK of this location
                const prevUMK = selectedUMK;
                selectedUMK = loc;
                const comps = calcBaruCellComponents(sub.rp, slIdx, modelType, approachBaruParams, 'flat', gr.label);
                selectedUMK = prevUMK; // restore
                
                return `<td class="py-1.5 px-2 text-right text-xs font-semibold border border-slate-200">${formatCurrency(comps.thp)}</td>`;
            }).join('');

            rows += `
                <tr class="hover:bg-slate-50 border-b border-slate-100 font-mono text-xs">
                    <td class="py-1.5 px-2 font-sans font-bold border border-slate-200 text-left whitespace-nowrap">${GRADE_NAMES_BARU[j]}</td>
                    <td class="py-1.5 px-2 text-center border border-slate-200 font-sans font-semibold">${sl}</td>
                    ${cells}
                </tr>
            `;
        });
    }
    tbody.innerHTML = rows;
}

function exportSimCSVBaru() {
    const C  = approachBaruParams.plafon;
    const sp = approachBaruParams.sigmaPct;
    const gp = approachBaruParams.gapPct;
    const stepVal = approachBaruParams.step || 2;
    const U  = getActiveUmk();
    const d  = deriveGradeStack(U, C, sp, gp);
    const compG = approachBaruParams.composition?.gapok || 75;
    const modelType = approachBaruParams.modelType || 'squeeze';
    const rk = v => Math.round(v / 1000) * 1000;
    const subLabels = ['A', 'B', 'C', 'D', 'E'];

    const headers = ['Grade', 'Sub-Level', 'Pos', 'THP', 'Gapok', 'Tunj. Struktural', 'Tunj. Keluarga', 'Tunj. Lama Kerja', 'Tunj. Profesional', 'Ratio75%'];
    const rows = [];
    d.grades.forEach(gr => {
        gr.subs.forEach((sub, subIdx) => {
            const thpMidPct = sub.pct;
            const thpMinPct = thpMidPct - stepVal;
            const thpMaxPct = thpMidPct + stepVal;

            const thpMid = sub.rp;
            const thpMin = rk(U * thpMinPct / 100);
            const thpMax = rk(U * thpMaxPct / 100);

            ['Min', 'Mid', 'Max'].forEach(type => {
                let baseTHP = thpMid;
                if (type === 'Min') baseTHP = thpMin;
                if (type === 'Max') baseTHP = thpMax;

                // Calculate components using unified helper
                const comps = calcBaruCellComponents(baseTHP, subIdx, modelType, approachBaruParams, type, gr.label);

                const ratio = calc75Ratio(comps.gapok, comps.tt);
                const ratioText = ratio.toFixed(1) + '%';
                rows.push([
                    gr.name, subLabels[subIdx], type, comps.thp, comps.gapok, comps.tt_struct, comps.tt_kel, comps.tt_lk, comps.ttt, ratioText
                ]);
            });
        });
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `simulasi_gaji_baru_${selectedUMK.replace(/\s/g, '_')}_${Date.now()}.csv`);
}

function exportCompCSVBaru() {
    const C  = approachBaruParams.plafon;
    const sp = approachBaruParams.sigmaPct;
    const gp = approachBaruParams.gapPct;

    const allData = {};
    compLocations.forEach(loc => {
        const U = (loc === selectedUMK) ? getActiveUmk() : (UMK_DATA[loc] || 3000000);
        allData[loc] = deriveGradeStack(U, C, sp, gp);
    });

    const headers = ['Grade', 'Sub-Level', ...compLocations.map(l => `THP (${l})`)];
    const rows = [];
    const subLabels = ['A', 'B', 'C', 'D', 'E'];
    const modelType = approachBaruParams.modelType || 'squeeze';

    for (let j = 0; j < 8; j++) {
        subLabels.forEach((sl, slIdx) => {
            const row = [GRADE_NAMES_BARU[j], sl];
            compLocations.forEach(loc => {
                const d = allData[loc];
                const gr = d?.grades[j];
                const sub = gr?.subs[slIdx];
                if (!sub) {
                    row.push('');
                } else {
                    const prevUMK = selectedUMK;
                    selectedUMK = loc;
                    const comps = calcBaruCellComponents(sub.rp, slIdx, modelType, approachBaruParams, 'flat', gr.label);
                    selectedUMK = prevUMK; // restore
                    row.push(comps.thp);
                }
            });
            rows.push(row);
        });
    }

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `komparasi_gaji_baru_${Date.now()}.csv`);
}

// =====================================================
// MENU 7: Simulasi Persentase & Solver (Pendekatan Baru)
// =====================================================
function renderMenu7() {
    const container = document.getElementById('menu7-container');
    if (!container) return;

    container.innerHTML = `
        <div class="card">
            <div class="card-title"><span>💸</span> Simulasi Persentase & Solver Stacking</div>
            <div class="card-desc">
                Analisis SSU Grade Stacking menggunakan solver matematika interaktif atau visualisasi parameter simulasi secara live.
            </div>
        </div>

        <!-- Tab Switcher -->
        <div class="flex justify-center mb-6">
            <div class="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button id="btn-tab-solver" class="scheme-btn ${currentMenu7Tab === 'solver' ? 'active' : ''}" onclick="switchMenu7Tab('solver')">
                    Tab 1: Solver & Guide
                </button>
                <button id="btn-tab-sim" class="scheme-btn ${currentMenu7Tab === 'simulation' ? 'active' : ''}" onclick="switchMenu7Tab('simulation')">
                    Tab 2: Simulasi Live
                </button>
            </div>
        </div>

        <div id="menu7-tab-content"></div>
    `;

    if (currentMenu7Tab === 'solver') {
        renderSolverTab();
    } else {
        renderSimulationTab();
    }
}

function switchMenu7Tab(tabName) {
    currentMenu7Tab = tabName;
    renderMenu7();
}

function renderSolverTab() {
    const contentDiv = document.getElementById('menu7-tab-content');
    if (!contentDiv) return;

    // Helper functions for math patterns
    function getAnchorData(pattern) {
        const grades = [
            { label: 'D1', name: 'D1 - Entry Level', premium: false },
            { label: 'D2', name: 'D2 - Officer', premium: false },
            { label: 'D3-1', name: 'D3-1 - Principal', premium: false },
            { label: 'D4-1', name: 'D4-1 - Specialist', premium: false },
            { label: 'D3-2', name: 'D3-2 - Junior Management', premium: true },
            { label: 'D4-2', name: 'D4-2 - Middle Management', premium: true },
            { label: 'D5', name: 'D5 - Senior Management', premium: false },
            { label: 'D6', name: 'D6 - Executive Management', premium: false }
        ];

        // Jika mode No-Overlap diaktifkan secara global, hitung manual pola dinamis stacking
        if (approachBaruParams.isNoOverlap === true) {
            const multE = (approachBaruParams.subLevelMultipliers && approachBaruParams.subLevelMultipliers.E) || 0.76;
            const gap = approachBaruParams.gapPct || 2;
            const calculatedVals = [];
            
            let currentAnchor = 75;
            calculatedVals.push(currentAnchor); // D1
            
            // D2 = D1 * multE * (1 + g)
            const d2 = Math.round(calculatedVals[0] * multE * (1 + gap / 100));
            calculatedVals.push(d2); // D2
            
            // D3-1
            const d31 = Math.round(d2 * multE * (1 + gap / 100));
            calculatedVals.push(d31); // D3-1
            
            // D4-1
            const d41 = Math.round(d31 * multE * (1 + gap / 100));
            calculatedVals.push(d41); // D4-1
            
            // D3-2 & D4-2 sejajar dengan D3-1 & D4-1
            calculatedVals.push(d31); // D3-2
            calculatedVals.push(d41); // D4-2
            
            // D5
            const d5 = Math.round(d41 * multE * (1 + gap / 100));
            calculatedVals.push(d5); // D5
            
            // D6
            const d6 = Math.round(d5 * multE * (1 + gap / 100));
            calculatedVals.push(d6); // D6

            return grades.map((g, idx) => {
                const mapIndices = [0, 1, 2, 3, 2, 3, 6, 7]; // map label array index to sequence
                const calculatedVal = calculatedVals[idx];
                return {
                    label: g.label,
                    name: g.name,
                    pct: calculatedVal,
                    isManagerial: g.premium,
                    explanation: idx === 0 ? 'Anchor D1 base = 75%' : `No-Overlap: a_{i} = a_{i-1} \\times m_E \\times (1 + g)`
                };
            });
        }

        return grades.map((g, idx) => {
            let pct = 75;
            let explanation = '';
            if (pattern === 'linear') {
                const vals = [75, 81, 88, 94, 101, 107, 114, 120];
                pct = vals[idx];
                explanation = idx === 0 ? 'Anchor D1 base = 75%' : 'Linear delta = 6.43 pp (dibulatkan)';
            } else if (pattern === 'geometrik') {
                const vals = [75, 80, 86, 92, 98, 105, 112, 120];
                pct = vals[idx];
                explanation = idx === 0 ? 'Anchor D1 base = 75%' : 'Geometrik r = 6.92% (dibulatkan)';
            } else { // staircase
                const vals = [75, 80, 87, 96, 107, 120, 120, 120];
                pct = vals[idx];
                const deltas = [0, 5, 7, 9, 11, 13, 0, 0];
                if (idx === 0) explanation = 'Anchor D1 base = 75%';
                else if (idx >= 6) explanation = 'Staircase capped at 120%';
                else explanation = `Staircase progresif (+${deltas[idx]} pp)`;
            }
            return {
                label: g.label,
                name: g.name,
                pct: pct,
                isManagerial: g.premium,
                explanation: explanation
            };
        });
    }

    // Penyesuaian agar Sub A adalah multiplier terkecil dan Sub E paling besar, 
    // dengan starting multiplier yang bisa diatur (dihubungkan ke slider global parameter).
    function getMultiplierData(pattern) {
        // Ambil starting/base multiplier dari slider Parameter global atau default 1.00
        const baseMult = (approachBaruParams.subLevelMultipliers && approachBaruParams.subLevelMultipliers.A) || 1.00;
        
        if (pattern === 'flat') {
            return { 
                A: baseMult, 
                B: baseMult + 0.06, 
                C: baseMult + 0.12, 
                D: baseMult + 0.18, 
                E: baseMult + 0.24, 
                label: 'Flat (kenaikan +0.06 / langkah)' 
            };
        } else if (pattern === 'step-naik') {
            return { 
                A: baseMult, 
                B: baseMult + 0.04, 
                C: baseMult + 0.09, 
                D: baseMult + 0.15, 
                E: baseMult + 0.22, 
                label: 'Step Naik (progresif progresif)' 
            };
        } else { // step-turun
            return { 
                A: baseMult, 
                B: baseMult + 0.08, 
                C: baseMult + 0.15, 
                D: baseMult + 0.21, 
                E: baseMult + 0.26, 
                label: 'Step Turun (regresif regresif)' 
            };
        }
    }

    // Initialize state parameters on approachBaruParams for persistence
    if (approachBaruParams.solverAnchorPattern === undefined) {
        approachBaruParams.solverAnchorPattern = 'linear';
    }
    if (approachBaruParams.solverMultiplierPattern === undefined) {
        approachBaruParams.solverMultiplierPattern = 'flat';
    }
    if (approachBaruParams.solverTargetPct === undefined) {
        approachBaruParams.solverTargetPct = 100;
    }
    if (approachBaruParams.solverIsManagerial === undefined) {
        approachBaruParams.solverIsManagerial = false;
    }

    const anchorPattern = approachBaruParams.solverAnchorPattern;
    const multiplierPattern = approachBaruParams.solverMultiplierPattern;
    const targetPct = approachBaruParams.solverTargetPct;
    const isManagerial = approachBaruParams.solverIsManagerial;

    const compG = approachBaruParams.composition?.gapok || 75;
    const premium = approachBaruParams.managerialPremium || 1.03;

    // Get active and alternative anchor configurations
    const activeGrades = getAnchorData(anchorPattern);
    const altPattern = anchorPattern === 'linear' ? 'geometrik' : 'linear';
    const altGrades = getAnchorData(altPattern);

    // Get active multiplier configurations
    const activeMults = getMultiplierData(multiplierPattern);
    const multKeys = ['A', 'B', 'C', 'D', 'E'];

    // Solve for the closest cell in the active configuration (pure SSU percentage)
    let bestDiff = Infinity;
    let bestCell = null;

    activeGrades.forEach((gr) => {
        const isGradeManagerial = gr.isManagerial;
        if (isGradeManagerial !== isManagerial) return;

        multKeys.forEach((mKey) => {
            const multVal = activeMults[mKey];
            const premiumMult = isGradeManagerial ? premium : 1.0;
            // THP % UMK = Anchor % * Multiplier * Premium
            const cellPct = gr.pct * multVal * premiumMult;
            const diff = Math.abs(cellPct - targetPct);

            if (diff < bestDiff) {
                bestDiff = diff;
                bestCell = {
                    gradeName: gr.name,
                    subLabel: mKey,
                    anchorPct: gr.pct,
                    multiplier: multVal,
                    actualPct: cellPct
                };
            }
        });
    });

    // Fallback if no matching track cells
    if (!bestCell) {
        activeGrades.forEach((gr) => {
            multKeys.forEach((mKey) => {
                const multVal = activeMults[mKey];
                const premiumMult = gr.isManagerial ? premium : 1.0;
                const cellPct = gr.pct * multVal * premiumMult;
                const diff = Math.abs(cellPct - targetPct);

                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestCell = {
                        gradeName: gr.name,
                        subLabel: mKey,
                        anchorPct: gr.pct,
                        multiplier: multVal,
                        actualPct: cellPct
                    };
                }
            });
        });
    }

    // Formulas and math documentation block for display
    let formulaText = '';
    if (anchorPattern === 'linear') {
        formulaText = 'a_i = 75\\% + 6.43\\% \\times (i-1)';
    } else if (anchorPattern === 'geometrik') {
        formulaText = 'a_i = 75\\% \\times (1.0692)^{i-1}';
    } else {
        formulaText = 'a_i = 75\\% + \\sum \\Delta_i';
    }

    let multiplierFormulaText = '';
    if (multiplierPattern === 'flat') {
        multiplierFormulaText = 'm_j = a + 0.06 \\times (j-1)';
    } else if (multiplierPattern === 'step-naik') {
        multiplierFormulaText = 'm_j = a + \\sum \\text{delta progresif}';
    } else {
        multiplierFormulaText = 'm_j = a + \\sum \\text{delta regresif}';
    }

    // Generate HTML
    contentDiv.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Kolom Input & Hasil Solver Persentase SSU -->
            <div class="lg:col-span-1 space-y-4">
                <!-- Solver Target Persentase ke Persentase SSU -->
                <div class="card bg-blue-50/50 border border-blue-200">
                    <div class="card-title text-sm">🎯 Target Gaji (% UMK) ke Persentase Sel SSU</div>
                    <div class="space-y-4 mt-3">
                        <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="block text-xs font-semibold text-slate-500">Target THP (% UMK)</label>
                                <span class="text-xs font-bold text-blue-700">${targetPct.toFixed(1)}% UMK</span>
                            </div>
                            <input type="range" id="solver-target-slider" class="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                                   min="30" max="300" step="5" value="${targetPct}" oninput="onSolverTargetSliderChange(this.value)">
                            <div class="mt-2">
                                <input type="number" id="solver-target-pct" class="input-field font-bold text-blue-700 text-center" 
                                       value="${targetPct}" min="30" max="300" step="5" oninput="onSolverTargetNumChange(this.value)">
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="solver-is-managerial" ${isManagerial ? 'checked' : ''} onchange="onSolverInputChange()">
                            <label for="solver-is-managerial" class="text-xs font-semibold text-slate-700 cursor-pointer">Jalur Manajerial (Premi ${premium}x)</label>
                        </div>
                    </div>
                </div>

        <!-- Opsi Pola & Rumus -->
                <div class="card bg-slate-50 border border-slate-200">
                    <div class="card-title text-sm">⚙️ Opsi Pola & Rumus Pendukung</div>
                    <div class="space-y-4 mt-3 text-xs">
                        <div class="flex items-center gap-2 mb-2 bg-blue-50 p-2 rounded border border-blue-100">
                            <input type="checkbox" id="solver-no-overlap" ${approachBaruParams.isNoOverlap ? 'checked' : ''} onchange="onSolverOverlapToggle(this.checked)">
                            <label for="solver-no-overlap" class="font-bold text-blue-800 cursor-pointer">Lock No-Overlap Stacking</label>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-500 mb-1">Pola Distribusi Anchor</label>
                            <select id="solver-anchor-pattern" class="select-field" ${approachBaruParams.isNoOverlap ? 'disabled title="No-Overlap Stacking Aktif: Anchor dihitung sekuensial"' : ''} onchange="onSolverInputChange()">
                                <option value="linear" ${anchorPattern === 'linear' ? 'selected' : ''}>Linear (delta = 6.43 pp)</option>
                                <option value="geometrik" ${anchorPattern === 'geometrik' ? 'selected' : ''}>Geometrik (r = 6.92%)</option>
                                <option value="staircase" ${anchorPattern === 'staircase' ? 'selected' : ''}>Staircase (Progresif)</option>
                            </select>
                            <div class="mt-2 font-mono bg-white p-2 rounded border text-center text-blue-700">
                                Formula: ${approachBaruParams.isNoOverlap ? 'a_{i+1} = a_i \\times m_E \\times (1 + g)' : formulaText}
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-500 mb-1">Pola Kenaikan Step Multiplier</label>
                            <select id="solver-multiplier-pattern" class="select-field" onchange="onSolverInputChange()">
                                <option value="flat" ${multiplierPattern === 'flat' ? 'selected' : ''}>Flat (+0.06 / langkah)</option>
                                <option value="step-naik" ${multiplierPattern === 'step-naik' ? 'selected' : ''}>Step Naik (Progresif)</option>
                                <option value="step-turun" ${multiplierPattern === 'step-turun' ? 'selected' : ''}>Step Turun (Regresif)</option>
                            </select>
                            <div class="mt-2 font-mono bg-white p-2 rounded border text-center text-blue-700">
                                Formula: ${multiplierFormulaText}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Hasil Sel SSU & Rincian Persentase Terdekat -->
                <div class="card bg-emerald-50/30 border border-emerald-200">
                    <div class="card-title text-sm text-emerald-800">📍 Hasil Persentase Sel SSU Terdekat</div>
                    ${bestCell ? `
                        <div class="mt-3 space-y-2">
                            <div class="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                <span class="text-xs text-slate-500">Grade & Sub-level:</span>
                                <span class="text-sm font-bold text-slate-800">${bestCell.gradeName} (Sub ${bestCell.subLabel})</span>
                            </div>
                            <div class="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                <span class="text-xs text-slate-500">Anchor Gaji Pokok (Sub-A):</span>
                                <span class="text-sm font-bold text-blue-800">${bestCell.anchorPct.toFixed(2)}% UMK</span>
                            </div>
                            <div class="flex justify-between items-center pb-2 border-b border-slate-200/60">
                                <span class="text-xs text-slate-500">Multiplier Sub-Level:</span>
                                <span class="text-sm font-bold text-blue-800">${bestCell.multiplier.toFixed(2)}x</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-xs text-slate-500">Rasio Hasil vs Target:</span>
                                <span class="text-sm font-bold text-purple-700">${bestCell.actualPct.toFixed(2)}% vs ${targetPct.toFixed(2)}%</span>
                            </div>
                        </div>
                    ` : `<div class="text-xs text-slate-400 mt-2">Tidak ditemukan sel terdekat.</div>`}
                </div>
            </div>

            <!-- Kolom Tabel Simulasi & Guide -->
            <div class="lg:col-span-2 space-y-4">
                <!-- Tabel Simulasi Hasil 1 (Pola Anchor Terpilih) -->
                <div class="card">
                    <div class="card-title text-sm">📋 Tabel Simulasi Pencarian 1 (Pola Anchor: ${anchorPattern.toUpperCase()})</div>
                    <div class="card-desc">Konfigurasi persentase SSU murni untuk pola Anchor terpilih dengan multiplier ${activeMults.label}:</div>
                    <div class="sim-table-wrap border border-slate-200 mt-2 overflow-x-auto">
                        <table class="w-full text-center border-collapse">
                            <thead>
                                <tr class="bg-slate-100 border-b border-slate-300 text-xs font-semibold text-slate-600 uppercase">
                                    <th class="py-2 px-3 border border-slate-200 text-left">Grade</th>
                                    <th class="py-2 px-3 border border-slate-200">Persentase Anchor Gaji Pokok (Sub-Level A)</th>
                                    <th class="py-2 px-3 border border-slate-200">Sub-Level Multiplier (A-E)</th>
                                    <th class="py-2 px-3 border border-slate-200 text-left">Penjelasan Matematis</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${activeGrades.map(gr => {
                                    const multStrs = multKeys.map(k => `${k}: ${activeMults[k].toFixed(2)}`).join(', ');
                                    return `
                                        <tr class="hover:bg-slate-50 border-b border-slate-100 font-mono text-xs">
                                            <td class="py-2 px-3 border border-slate-200 text-left font-sans font-bold text-slate-800 whitespace-nowrap">${gr.name}</td>
                                            <td class="py-2 px-3 border border-slate-200 font-bold text-blue-700">${gr.pct.toFixed(2)}%</td>
                                            <td class="py-2 px-3 border border-slate-200 text-slate-700 whitespace-nowrap">${multStrs}</td>
                                            <td class="py-2 px-3 border border-slate-200 text-left font-sans text-slate-500">${gr.explanation}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Tabel Simulasi Hasil 2 (Pola Anchor Alternatif) -->
                <div class="card">
                    <div class="card-title text-sm">📋 Tabel Simulasi Pencarian 2 (Pola Anchor Alternatif: ${altPattern.toUpperCase()})</div>
                    <div class="card-desc">Perbandingan persentase SSU murni untuk pola Anchor alternatif:</div>
                    <div class="sim-table-wrap border border-slate-200 mt-2 overflow-x-auto">
                        <table class="w-full text-center border-collapse">
                            <thead>
                                <tr class="bg-slate-100 border-b border-slate-300 text-xs font-semibold text-slate-600 uppercase">
                                    <th class="py-2 px-3 border border-slate-200 text-left">Grade</th>
                                    <th class="py-2 px-3 border border-slate-200">Persentase Anchor Gaji Pokok (Sub-Level A)</th>
                                    <th class="py-2 px-3 border border-slate-200">Sub-Level Multiplier (A-E)</th>
                                    <th class="py-2 px-3 border border-slate-200 text-left">Penjelasan Matematis</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${altGrades.map(gr => {
                                    const multStrs = multKeys.map(k => `${k}: ${activeMults[k].toFixed(2)}`).join(', ');
                                    return `
                                        <tr class="hover:bg-slate-50 border-b border-slate-100 font-mono text-xs">
                                            <td class="py-2 px-3 border border-slate-200 text-left font-sans font-bold text-slate-800 whitespace-nowrap">${gr.name}</td>
                                            <td class="py-2 px-3 border border-slate-200 font-bold text-purple-700">${gr.pct.toFixed(2)}%</td>
                                            <td class="py-2 px-3 border border-slate-200 text-slate-700 whitespace-nowrap">${multStrs}</td>
                                            <td class="py-2 px-3 border border-slate-200 text-left font-sans text-slate-500">${gr.explanation}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function onSolverTargetSliderChange(val) {
    const numInput = document.getElementById('solver-target-pct');
    if (numInput) {
        numInput.value = val;
    }
    approachBaruParams.solverTargetPct = Number(val) || 100;
    saveToStorage();
    renderSolverTab();
}

function onSolverTargetNumChange(val) {
    const slider = document.getElementById('solver-target-slider');
    if (slider) {
        slider.value = val;
    }
    approachBaruParams.solverTargetPct = Number(val) || 100;
    saveToStorage();
    renderSolverTab();
}

function onSolverInputChange() {
    const premiumCheck = document.getElementById('solver-is-managerial');
    const anchorSelect = document.getElementById('solver-anchor-pattern');
    const multiplierSelect = document.getElementById('solver-multiplier-pattern');

    if (premiumCheck) {
        approachBaruParams.solverIsManagerial = premiumCheck.checked;
    }
    if (anchorSelect) {
        approachBaruParams.solverAnchorPattern = anchorSelect.value;
    }
    if (multiplierSelect) {
        approachBaruParams.solverMultiplierPattern = multiplierSelect.value;
    }

    saveToStorage();
    renderSolverTab();
}

function onSolverOverlapToggle(checked) {
    approachBaruParams.isNoOverlap = !!checked;
    
    // Sinkronisasi status No-Overlap ke parameter utama simulasi Menu 3 agar tabel sinkron
    saveToStorage();
    renderSolverTab();
    
    // Jika Menu 3 (Simulasi) atau Menu 5 (Spread Table) sedang aktif di latar belakang, render ulang agar update
    const m3Container = document.getElementById('menu3-container');
    if (m3Container && m3Container.offsetParent !== null) {
        renderMenu3();
    }
    const m5Container = document.getElementById('menu5-container');
    if (m5Container && m5Container.offsetParent !== null) {
        renderMenu5();
    }
}

function onSolverFormulaChange() {
    // Deprecated in favor of interactive SSU percentage options
}

function renderSimulationTab() {
    const contentDiv = document.getElementById('menu7-tab-content');
    if (!contentDiv) return;

    // Ambil parameter aktif
    const U = getActiveUmk();
    const C = approachBaruParams.plafon;
    const sp = approachBaruParams.sigmaPct;
    const gp = approachBaruParams.gapPct;
    const stepVal = approachBaruParams.step || 2;
    const compG = approachBaruParams.composition?.gapok || 75;
    const modelType = approachBaruParams.modelType || 'squeeze';
    const premium = approachBaruParams.managerialPremium || 1.03;

    const d = deriveGradeStack(U, C, sp, gp);
    const subLabels = ['A', 'B', 'C', 'D', 'E'];

    // Render baris matriks 8x5
    const matrixRows = d.grades.map((gr, gradeIdx) => {
        const cells = gr.subs.map((sub, subIdx) => {
            const comps = calcBaruCellComponents(sub.rp, subIdx, modelType, approachBaruParams, 'flat', gr.label);
            const thpPct = (comps.thp / U) * 100;
            const compliance = check75Rule(comps.gapok, comps.tt);

            const isSelected = selectedMenu7Cell.gradeIdx === gradeIdx && selectedMenu7Cell.subIdx === subIdx;
            const selClasses = isSelected 
                ? 'border-4 border-blue-600 bg-blue-100/50 shadow-inner font-extrabold scale-102 transform transition-all duration-150' 
                : 'hover:bg-slate-100 cursor-pointer border border-slate-200 transition-colors duration-75';

            return `
                <td class="py-2 px-3 ${selClasses}" onclick="onMenu7CellClick(${gradeIdx}, ${subIdx})">
                    <div class="text-xs text-slate-800">${formatPercent(thpPct, 1)}</div>
                    <div class="text-[9px] text-slate-500 font-mono mt-0.5">${formatCurrency(comps.thp)}</div>
                    <div class="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1.5 mx-auto max-w-[50px]">
                        <div class="${compliance ? 'bg-blue-500' : 'bg-amber-500'} h-full" style="width: ${Math.min(100, thpPct)}%"></div>
                    </div>
                </td>
            `;
        }).join('');

        return `
            <tr class="border-b border-slate-200">
                <td class="py-2 px-3 border border-slate-200 font-sans font-bold text-xs text-slate-700 text-left whitespace-nowrap bg-slate-50/50">${gr.name}</td>
                ${cells}
            </tr>
        `;
    }).join('');

    // Detail komponen sel terpilih
    const selGrade = d.grades[selectedMenu7Cell.gradeIdx];
    const selSub = selGrade ? selGrade.subs[selectedMenu7Cell.subIdx] : null;
    let detailHTML = '';

    if (selGrade && selSub) {
        const thpMid = selSub.rp;
        const thpMin = rk(U * (selSub.pct - stepVal) / 100);
        const thpMax = rk(U * (selSub.pct + stepVal) / 100);

        const minComps = calcBaruCellComponents(thpMin, selectedMenu7Cell.subIdx, modelType, approachBaruParams, 'Min', selGrade.label);
        const midComps = calcBaruCellComponents(thpMid, selectedMenu7Cell.subIdx, modelType, approachBaruParams, 'Mid', selGrade.label);
        const maxComps = calcBaruCellComponents(thpMax, selectedMenu7Cell.subIdx, modelType, approachBaruParams, 'Max', selGrade.label);

        const minRatio = calc75Ratio(minComps.gapok, minComps.tt);
        const midRatio = calc75Ratio(midComps.gapok, midComps.tt);
        const maxRatio = calc75Ratio(maxComps.gapok, maxComps.tt);

        detailHTML = `
            <div class="card border border-blue-200 bg-blue-50/10">
                <div class="card-title text-sm">🔍 Detail Rincian Komponen: ${selGrade.name} (Sub ${subLabels[selectedMenu7Cell.subIdx]})</div>
                <div class="card-desc">Komposisi nominal gaji bersih untuk 3 profil masa kerja (Min = 0 thn, Mid = ${(approachBaruParams.maxMasaKerjaTahun ?? 5)/2} thn, Max = ${approachBaruParams.maxMasaKerjaTahun ?? 5} thn).</div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <!-- Kondisi Min -->
                    <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5 font-mono text-xs">
                        <div class="font-bold text-slate-800 border-b pb-1 mb-1 font-sans">1. Kondisi Min (Masa Kerja 0 thn)</div>
                        <div class="flex justify-between"><span>Gaji Pokok:</span><span class="font-semibold text-emerald-700">${formatCurrency(minComps.gapok)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Struktural:</span><span class="font-semibold text-slate-700">${formatCurrency(minComps.tt_struct)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Keluarga:</span><span class="font-semibold text-slate-700">${formatCurrency(minComps.tt_kel)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Lama Kerja:</span><span class="font-semibold text-slate-500">${formatCurrency(minComps.tt_lk)}</span></div>
                        <div class="flex justify-between border-b pb-1"><span>Tunj. Profesional:</span><span class="font-semibold text-orange-700">${formatCurrency(minComps.ttt)}</span></div>
                        <div class="flex justify-between font-sans text-xs pt-1 text-slate-600"><span>Compliance 75%:</span><span class="font-bold ${minRatio >= 75 ? 'text-emerald-600' : 'text-amber-600'}">${minRatio.toFixed(1)}%</span></div>
                        <div class="flex justify-between text-sm font-sans font-extrabold text-blue-800 border-t pt-1 mt-1"><span>Total THP:</span><span>${formatCurrency(minComps.thp)}</span></div>
                    </div>

                    <!-- Kondisi Mid -->
                    <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5 font-mono text-xs">
                        <div class="font-bold text-slate-800 border-b pb-1 mb-1 font-sans">2. Kondisi Mid (Masa Kerja Tengah)</div>
                        <div class="flex justify-between"><span>Gaji Pokok:</span><span class="font-semibold text-emerald-700">${formatCurrency(midComps.gapok)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Struktural:</span><span class="font-semibold text-slate-700">${formatCurrency(midComps.tt_struct)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Keluarga:</span><span class="font-semibold text-slate-700">${formatCurrency(midComps.tt_kel)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Lama Kerja:</span><span class="font-semibold text-amber-700">${formatCurrency(midComps.tt_lk)}</span></div>
                        <div class="flex justify-between border-b pb-1"><span>Tunj. Profesional:</span><span class="font-semibold text-orange-700">${formatCurrency(midComps.ttt)}</span></div>
                        <div class="flex justify-between font-sans text-xs pt-1 text-slate-600"><span>Compliance 75%:</span><span class="font-bold ${midRatio >= 75 ? 'text-emerald-600' : 'text-amber-600'}">${midRatio.toFixed(1)}%</span></div>
                        <div class="flex justify-between text-sm font-sans font-extrabold text-blue-800 border-t pt-1 mt-1"><span>Total THP:</span><span>${formatCurrency(midComps.thp)}</span></div>
                    </div>

                    <!-- Kondisi Max -->
                    <div class="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col gap-1.5 font-mono text-xs">
                        <div class="font-bold text-slate-800 border-b pb-1 mb-1 font-sans">3. Kondisi Max (Masa Kerja Penuh)</div>
                        <div class="flex justify-between"><span>Gaji Pokok:</span><span class="font-semibold text-emerald-700">${formatCurrency(maxComps.gapok)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Struktural:</span><span class="font-semibold text-slate-700">${formatCurrency(maxComps.tt_struct)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Keluarga:</span><span class="font-semibold text-slate-700">${formatCurrency(maxComps.tt_kel)}</span></div>
                        <div class="flex justify-between"><span>Tunj. Lama Kerja:</span><span class="font-semibold text-amber-700">${formatCurrency(maxComps.tt_lk)}</span></div>
                        <div class="flex justify-between border-b pb-1"><span>Tunj. Profesional:</span><span class="font-semibold text-orange-700">${formatCurrency(maxComps.ttt)}</span></div>
                        <div class="flex justify-between font-sans text-xs pt-1 text-slate-600"><span>Compliance 75%:</span><span class="font-bold ${maxRatio >= 75 ? 'text-emerald-600' : 'text-amber-600'}">${maxRatio.toFixed(1)}%</span></div>
                        <div class="flex justify-between text-sm font-sans font-extrabold text-blue-800 border-t pt-1 mt-1"><span>Total THP:</span><span>${formatCurrency(maxComps.thp)}</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    contentDiv.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- Panel Sliders Parameter -->
            <div class="lg:col-span-1 space-y-4">
                <div class="card">
                    <div class="card-title text-sm">🛠️ Panel Pengontrol SSU</div>
                    
                    <div class="space-y-4 mt-4">
                        <!-- UMK Slider -->
                        <div>
                            <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                <span>Nilai UMK</span>
                                <span class="font-bold text-blue-600">${formatCurrency(U)}</span>
                            </div>
                            <input type="range" min="2000000" max="10000000" step="50000" value="${U}" 
                                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                oninput="onMenu7SliderChange('umk', this.value)">
                        </div>

                        <!-- Plafon Slider -->
                        <div>
                            <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                <span>Plafon (C)</span>
                                <span class="font-bold text-blue-600">${formatCurrency(C)}</span>
                            </div>
                            <input type="range" min="5000000" max="30000000" step="500000" value="${C}" 
                                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                oninput="onMenu7SliderChange('plafon', this.value)">
                        </div>

                        <!-- Sigma Slider -->
                        <div>
                            <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                <span>Sigma Puncak</span>
                                <span class="font-bold text-blue-600">${sp}%</span>
                            </div>
                            <input type="range" min="70" max="100" step="1" value="${sp}" 
                                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                oninput="onMenu7SliderChange('sigmaPct', this.value)">
                        </div>

                        <!-- Step Slider -->
                        <div>
                            <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                <span>Step Spread</span>
                                <span class="font-bold text-blue-600">${stepVal}% UMK</span>
                            </div>
                            <input type="range" min="0" max="10" step="0.5" value="${stepVal}" 
                                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                oninput="onMenu7SliderChange('step', this.value)">
                        </div>

                        <!-- compG Slider -->
                        <div>
                            <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                <span>Gaji Pokok (compG)</span>
                                <span class="font-bold text-blue-600">${compG}%</span>
                            </div>
                            <input type="range" min="50" max="95" step="1" value="${compG}" 
                                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                oninput="onMenu7SliderChange('compGapok', this.value)">
                        </div>

                        <!-- Managerial Premium Slider -->
                        <div>
                            <div class="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                                <span>Managerial Premium</span>
                                <span class="font-bold text-blue-600">${premium}x</span>
                            </div>
                            <input type="range" min="1.00" max="1.20" step="0.01" value="${premium}" 
                                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                oninput="onMenu7SliderChange('managerialPremium', this.value)">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Matriks 8x5 Interaktif -->
            <div class="lg:col-span-3 space-y-4">
                <div class="card">
                    <div class="card-title text-sm">📊 Matriks Stacking Gaji (% UMK & Rupiah)</div>
                    <div class="card-desc">Matriks visual 8 grade x 5 sub-level. <span class="font-semibold text-blue-600">Klik salah satu sel</span> untuk menganalisis pemecahan komponen min, mid, dan max.</div>
                    
                    <div class="sim-table-wrap border border-slate-200 mt-3">
                        <table class="w-full text-center border-collapse border border-slate-200">
                            <thead>
                                <tr class="bg-slate-100 border-b-2 border-slate-300 text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    <th class="py-2 px-3 border border-slate-200 text-left">Grade</th>
                                    <th class="py-2 px-3 border border-slate-200">Sub A</th>
                                    <th class="py-2 px-3 border border-slate-200">Sub B</th>
                                    <th class="py-2 px-3 border border-slate-200">Sub C</th>
                                    <th class="py-2 px-3 border border-slate-200">Sub D</th>
                                    <th class="py-2 px-3 border border-slate-200">Sub E</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${matrixRows}
                            </tbody>
                        </table>
                    </div>
                </div>

                ${detailHTML}
            </div>
        </div>
    `;
}

function onMenu7SliderChange(key, value) {
    const numVal = Number(value);
    if (isNaN(numVal)) return;

    if (key === 'umk') {
        customUmkValue = numVal;
    } else if (key === 'plafon') {
        approachBaruParams.plafon = numVal;
    } else if (key === 'sigmaPct') {
        approachBaruParams.sigmaPct = Math.round(numVal);
    } else if (key === 'step') {
        approachBaruParams.step = numVal;
    } else if (key === 'compGapok') {
        approachBaruParams.composition = approachBaruParams.composition || { gapok: 75 };
        approachBaruParams.composition.gapok = Math.round(numVal);
    } else if (key === 'managerialPremium') {
        approachBaruParams.managerialPremium = numVal;
    }

    saveToStorage();
    renderSimulationTab();
}

function onMenu7CellClick(gradeIdx, subIdx) {
    selectedMenu7Cell = { gradeIdx, subIdx };
    renderSimulationTab();
}


