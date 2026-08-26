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
    tunjLamaKerjaPerTahun: 50000
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

    container.innerHTML = `
        <!-- Section W: Mesin Anchor Watson (hanya mode Watson-Driven) -->
        ${isWatson ? buildWatsonPanelHTML() : ''}

        <!-- Section A: Anchor % per Jenjang -->
        <div class="card">
            <div class="card-title"><span>🔑</span> ${currentScheme === 'skema-gapok' ? 'Anchor % THP per Jenjang' : 'Anchor % Gapok per Jenjang'}</div>
            <div class="card-desc">
                ${currentScheme === 'skema-gapok'
                    ? 'Atur persentase dasar THP pada setiap jenjang kepangkatan. Gapok = THP × Composition%.'
                    : 'Atur persentase dasar Gaji Pokok untuk Sub-Level A pada setiap jenjang kepangkatan.'}
                ${isWatson ? '<br><span class="text-blue-600 font-semibold">Mode Watson-Driven: input di bawah adalah rancangan manual Anda (terkunci). Anchor aktif dihitung mesin di panel atas.</span>' : ''}
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${['D1','D2','D3-1','D3-2','D4-1','D4-2','D5','D6'].map(k => {
                    const jName = JENJANG_LIST.find(j => j.code === k)?.name || k;
                    // Input anchor selalu membaca/menulis snapshot manual (isolasi dari hasil Watson)
                    const manVal = (params.manualAnchors && params.manualAnchors[k] !== undefined)
                        ? params.manualAnchors[k] : params.anchors[k];
                    return `
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">${jName}${isWatson ? ' <span class="watson-badge">diatur mesin Watson</span>' : ''}</label>
                        <input type="number" id="p-anchor-${k}" class="input-field ${isWatson ? 'bg-slate-100' : ''}" value="${manVal}" step="1" ${isWatson ? 'disabled title="Mode Watson-Driven: anchor diatur mesin"' : ''}>
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
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Step Spread (% UMK)</label>
                    <input type="number" id="p-step" class="input-field" value="${params.step}" min="0" step="0.5">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">THP Cap Limit (Rp)</label>
                    <input type="number" id="p-thp-cap" class="input-field" value="${params.thpCap}" min="0" step="100000">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Stream Positioning (Managerial)</label>
                    <input type="number" id="p-stream" class="input-field" value="${params.streamPositioning}" min="1" step="0.01">
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4 border-slate-100">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Pilih Lokasi UMK</label>
                    <select id="p-umk" class="select-field">
                        ${UMK_LOCATIONS.map(loc => `<option value="${loc}" ${loc === selectedUMK ? 'selected' : ''}>${loc} — ${formatCurrency(UMK_DATA[loc])}</option>`).join('')}
                    </select>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="p-umk-value">${formatCurrency(UMK_DATA[selectedUMK])}</div>
                    <div class="stat-label">UMK Aktif</div>
                </div>
            </div>
        </div>

        <!-- Section D: Composition Matrix -->
        <div class="card">
            <div class="card-title"><span>💵</span> Composition Matrix</div>
            <div class="card-desc">
                ${currentScheme === 'skema-gapok'
                    ? 'Proporsi TT & TTT dari NonGapok. TT dimultiplier per sub-level. Gapok dari Anchor (lihat di atas).'
                    : 'Tentukan proporsi internal THP. Total harus = 100%.'}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">
                        Gaji Pokok (%)
                        ${currentScheme === 'skema-gapok' ? '<span class="text-blue-500">(anchor-based)</span>' : ''}
                    </label>
                    <input type="number" id="p-gapok" class="input-field ${currentScheme === 'skema-gapok' ? 'bg-slate-100' : ''}" 
                           value="${params.composition.gapok}" min="0" max="100" step="1"
                           ${currentScheme === 'skema-gapok' ? 'readonly title="Skema Gaji Pokok: Gapok dari Anchor, tidak dari Composition"' : ''}>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Tunjangan Tetap (%)</label>
                    <input type="number" id="p-tt" class="input-field" value="${params.composition.tt}" min="0" max="100" step="1">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">
                        Tunjangan Tidak Tetap (%)
                        ${currentScheme === 'skema-gapok' ? '<span class="text-blue-500">(auto)</span>' : ''}
                    </label>
                    <input type="number" id="p-ttt" class="input-field ${currentScheme === 'skema-gapok' ? 'bg-slate-100' : ''}" 
                           value="${params.composition.ttt}" min="0" max="100" step="1"
                           ${currentScheme === 'skema-gapok' ? 'readonly' : ''}>
                </div>
            </div>
            <div id="comp-validation" class="mt-3"></div>
        </div>

        <!-- Section E: Tunjangan Tetap Components -->
        <div class="card">
            <div class="card-title"><span>💰</span> Detail Komponen Tunjangan Tetap</div>
            <div class="card-desc">
                Pecahan proporsi dari Tunjangan Tetap (TT) menjadi sub-komponen. Total persentase harus = 100%.
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Struktural Split (%)</label>
                    <input type="number" id="p-tt-struktural" class="input-field" value="${params.ttSplit.struktural}" min="0" max="100" step="1">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Lama Kerja Split (%)</label>
                    <input type="number" id="p-tt-lamakerja" class="input-field" value="${params.ttSplit.lamaKerja}" min="0" max="100" step="1">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Keluarga Split (%)</label>
                    <input type="number" id="p-tt-keluarga" class="input-field" value="${params.ttSplit.keluarga}" min="0" max="100" step="1">
                </div>
            </div>

            <!-- Tunjangan Details requested by User -->
            <div class="space-y-6">
                <!-- Tunjangan Struktural -->
                <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-1">
                        <span>🛡️</span> Tunjangan Struktural
                    </div>
                    <p class="text-xs text-slate-500 mb-3 leading-relaxed">
                        Tunjangan tetap untuk jabatan struktural/manajerial. Kegunaannya menaikkan komponen tunjangan tetap pada band struktural, lalu ikut menaikkan batas bawah THP karena sistem menjaga THP minimal = 75% UMK + tunjangan tetap. Cara hitung: D3/D33 = 1x basis, D4/D43 = 2x, D5 = 3x, D6 = 4x.
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Basis Struktural (Structural Base)</label>
                            <input type="number" id="t-struct-basis" class="input-field" value="${params.tunjangan.strukturalBasis}" step="50000" oninput="updateStructPreview()">
                        </div>
                        <div class="text-xs text-slate-600 bg-white p-3 rounded border border-slate-200">
                            <span class="font-bold text-slate-700 block mb-1">Nominal Output Progresif:</span>
                            <ul class="space-y-0.5" id="struct-preview-list">
                                <!-- Dynamic Preview -->
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Tunjangan Lama Kerja -->
                <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-1">
                        <span>⏳</span> Tunjangan Lama Kerja
                    </div>
                    <p class="text-xs text-slate-500 mb-3 leading-relaxed">
                        Tunjangan tetap berbasis masa kerja. Kegunaannya menambah tunjangan sesuai lama bekerja pada profil simulasi karyawan. Cara hitung: jika masa kerja minimal 1 tahun, tunjangan = tahun pertama + (masa kerja - 1) x kenaikan tahunan, lalu dibatasi plafon. Masa kerja 20 tahun atau lebih langsung mencapai plafon.
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Tahun Pertama (Start Amount)</label>
                            <input type="number" id="t-tenure-start" class="input-field" value="${params.tunjangan.lamaKerjaAwal}" step="10000">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Kenaikan per Tahun (Increment)</label>
                            <input type="number" id="t-tenure-inc" class="input-field" value="${params.tunjangan.lamaKerjaKenaikan}" step="5000">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Plafon Maksimal (Tenure Cap)</label>
                            <input type="number" id="t-tenure-cap" class="input-field" value="${params.tunjangan.lamaKerjaPlafon}" step="100000">
                        </div>
                    </div>
                </div>

                <!-- Tunjangan Keluarga -->
                <div class="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-slate-800 flex items-center gap-1.5 mb-1">
                        <span>👨‍👩‍👧‍👦</span> Tunjangan Keluarga
                    </div>
                    <p class="text-xs text-slate-500 mb-3 leading-relaxed">
                        Tunjangan tetap berdasarkan status keluarga. Kegunaannya menambah tunjangan ketika profil simulasi berstatus menikah dan/atau memiliki anak eligible. Cara hitung: pasangan sah + (jumlah anak maksimal 2 x tunjangan per anak), lalu dibatasi Family Cap.
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Tunjangan Pasangan Sah</label>
                            <input type="number" id="t-fam-spouse" class="input-field" value="${params.tunjangan.keluargaPasangan}" step="50000">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Tunjangan per Anak (Maks 2)</label>
                            <input type="number" id="t-fam-child" class="input-field" value="${params.tunjangan.keluargaAnak}" step="25000">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Plafon Maksimal (Family Cap)</label>
                            <input type="number" id="t-fam-cap" class="input-field" value="${params.tunjangan.keluargaPlafon}" step="100000">
                        </div>
                    </div>
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
        selectedUMK = e.target.value;
        document.getElementById('p-umk-value').textContent = formatCurrency(UMK_DATA[selectedUMK]);
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
    console.log('[UMK DEBUG] renderMenu2Baru: U =', U, ', customUmkValue =', customUmkValue);
    const d  = deriveGradeStack(U, C, sp, gp);
    const rk = v => Math.round(v / 1000) * 1000;

    // live label helpers
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
    const anchors = {
        D1: 75,
        D2: 78,
        'D3-1': 90,
        'D3-2': 90,
        'D4-1': 106,
        'D4-2': 106,
        D5: 110,
        D6: 120,
        ...(approachBaruParams.anchors || {})
    };

    // Baseline THPs for D1-A (which has midpoint sub.rp = UMK)
    const baseMinTHP = rk(U * (100 - stepVal) / 100);
    const baseMaxTHP = rk(U * (100 + stepVal) / 100);

    const gapokMin = rk(baseMinTHP * compG / 100);
    const gapokMax = rk(baseMaxTHP * compG / 100);

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

        <!-- 3. Composition Matrix (User-Adjustable) -->
        <div class="card">
            <div class="card-title">Komposisi Gaji Pokok</div>
            <div class="card-desc">
                Gaji Pokok dihitung berdasarkan persentase Paket (THP).
                Tunjangan Tetap (TT) dihitung riil berdasarkan status keluarga dan masa kerja.
                Sisa Paket otomatis dialokasikan ke Tunjangan Profesional (TTT).
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Gaji Pokok (%)</label>
                    <input type="number" id="ab-comp-gapok" class="input-field" value="${approachBaruParams.composition?.gapok || 75}" min="10" max="95" step="1"
                        onchange="onApproachBaruParamChange('compGapok', this.value)">
                </div>
                <div class="stat-card">
                    <div class="stat-value text-emerald-600 font-bold" id="ab-comp-gapok-display">${approachBaruParams.composition?.gapok || 75}%</div>
                    <div class="stat-label">Porsi Gaji Pokok dari Paket</div>
                </div>
            </div>
        </div>

        <!-- 4. Anchor Gaji Pokok (Sub-Level A) -->
        <div class="card">
            <div class="card-title">Anchor Gaji Pokok (Sub-Level A)</div>
            <div class="card-desc">Persentase dasar Gaji Pokok terhadap UMK untuk Sub-Level A pada setiap jenjang.</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">D1 - Entry Level</label>
                    <input type="number" id="ab-anchor-D1" class="input-field" value="${anchors.D1}" min="10" max="150" step="1"
                        onchange="onApproachBaruAnchorChange('D1', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">D2 - Officer</label>
                    <input type="number" id="ab-anchor-D2" class="input-field" value="${anchors.D2}" min="10" max="150" step="1"
                        onchange="onApproachBaruAnchorChange('D2', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">D3-1 - Principal</label>
                    <input type="number" id="ab-anchor-D3-1" class="input-field" value="${anchors['D3-1']}" min="10" max="150" step="1"
                        onchange="onApproachBaruAnchorChange('D3-1', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">D4-1 - Specialist</label>
                    <input type="number" id="ab-anchor-D4-1" class="input-field" value="${anchors['D4-1']}" min="10" max="150" step="1"
                        onchange="onApproachBaruAnchorChange('D4-1', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">D3-2 - Junior Management</label>
                    <input type="number" id="ab-anchor-D3-2" class="input-field" value="${anchors['D3-2'] || 90}" min="10" max="150" step="1"
                        onchange="onApproachBaruAnchorChange('D3-2', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">D4-2 - Middle Management</label>
                    <input type="number" id="ab-anchor-D4-2" class="input-field" value="${anchors['D4-2'] || 106}" min="10" max="150" step="1"
                        onchange="onApproachBaruAnchorChange('D4-2', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">D5 - Senior Management</label>
                    <input type="number" id="ab-anchor-D5" class="input-field" value="${anchors.D5}" min="10" max="200" step="1"
                        onchange="onApproachBaruAnchorChange('D5', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">D6 - Executive Management</label>
                    <input type="number" id="ab-anchor-D6" class="input-field" value="${anchors.D6}" min="10" max="250" step="1"
                        onchange="onApproachBaruAnchorChange('D6', this.value)">
                </div>
            </div>
            <div class="mt-3 text-[10px] text-slate-400">D3-2 dan D4-2 otomatis dikalikan Premium Managerial (1.03x) dari nilai yang Anda masukkan.</div>
        </div>

        <!-- 4b. Sub-Level Multipliers (A-E) -->
        <div class="card">
            <div class="card-title">Sub-Level Multipliers (A-E)</div>
            <div class="card-desc">Multiplier Sub-Level A-E. A = dasar (Anchor × UMK / CompG%), B-E = A × multiplier.</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub A (Dasar)</label>
                    <input type="number" id="ab-mult-A" class="input-field" value="${approachBaruParams.subLevelMultipliers?.A || 1.00}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('A', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub B</label>
                    <input type="number" id="ab-mult-B" class="input-field" value="${approachBaruParams.subLevelMultipliers?.B || 0.94}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('B', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub C</label>
                    <input type="number" id="ab-mult-C" class="input-field" value="${approachBaruParams.subLevelMultipliers?.C || 0.88}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('C', this.value)">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub D</label>
                    <input type="number" id="ab-mult-D" class="input-field" value="${approachBaruParams.subLevelMultipliers?.D || 0.82}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('D', this.value)">
                </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Sub E</label>
                    <input type="number" id="ab-mult-E" class="input-field" value="${approachBaruParams.subLevelMultipliers?.E || 0.76}" min="0.50" max="1.50" step="0.01"
                        onchange="onApproachBaruMultiplierChange('E', this.value)">
                </div>
                <div class="col-span-3 text-[10px] text-slate-400 self-end mb-1">
                    <div>A = Dasar (default 1.00). B-E adalahkelipatan dari A.</div>
                    <div class="mt-1 font-semibold text-slate-500">Default: A=1.00, B=0.94, C=0.88, D=0.82, E=0.76</div>
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

        <!-- Model Perhitungan Tunjangan -->
        <div class="card">
            <div class="card-title">Model Perhitungan Tunjangan</div>
            <div class="card-desc">Pilih bagaimana tunjangan keluarga dan lama kerja memengaruhi total take home pay (THP).</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="ab-model-type" value="squeeze" ${approachBaruParams.modelType === 'squeeze' ? 'checked' : ''}
                            onchange="onApproachBaruParamChange('modelType', this.value)">
                        <span class="font-bold text-sm text-slate-800">Model A: Potong Tunj. Profesional (Squeeze)</span>
                    </label>
                    <div class="text-xs text-slate-500 pl-5">Total THP tetap sesuai tabel Paket. Tunjangan keluarga & lama kerja mengurangi porsi Tunjangan Profesional (TTT). Menjaga kepastian anggaran.</div>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="ab-model-type" value="additive" ${approachBaruParams.modelType === 'additive' ? 'checked' : ''}
                            onchange="onApproachBaruParamChange('modelType', this.value)">
                        <span class="font-bold text-sm text-slate-800">Model B: Tambah ke THP (Additive)</span>
                    </label>
                    <div class="text-xs text-slate-500 pl-5">Gapok & Tunjangan Profesional (TTT) dikunci pada persentase tetap. Tunjangan keluarga & lama kerja ditambahkan di atasnya, menaikkan total THP.</div>
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

        <!-- 6. Lokasi UMK -->
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

        <!-- 7. Panel Pembanding Sigma -->
        <div class="card">
            <div class="card-title">Panel Pembanding Sigma</div>
            <div class="card-desc">Perbandingan struktur untuk berbagai nilai sigma (dengan gap aktif g = ${gp}%). Klik baris untuk menerapkan.</div>
            <div class="overflow-x-auto">
                <table class="w-full text-center border-collapse border border-slate-300">
                    <thead><tr class="bg-slate-100 border-b-2 border-slate-300 text-xs font-semibold uppercase tracking-wider">
                        <th class="py-2 px-3 border border-slate-300">Sigma</th>
                        <th class="py-2 px-3 border border-slate-300">sigmaC (Rp)</th>
                        <th class="py-2 px-3 border border-slate-300">T</th>
                        <th class="py-2 px-3 border border-slate-300">s (spread)</th>
                        <th class="py-2 px-3 border border-slate-300">Gap D1-D2 (Rp)</th>
                    </tr></thead>
                    <tbody>
                        ${[80, 85, 90, 95].map(sig => {
                            const dr = deriveGradeStack(U, C, sig, gp);
                            const isActive = sig === sp;
                            const gapRp = dr.grades.length >= 2 ? formatCurrency(rk(dr.grades[1].min - dr.grades[0].max)) : '-';
                            return '<tr class="border-b border-slate-200 ' + (isActive ? 'bg-blue-50 font-bold' : 'hover:bg-slate-50 cursor-pointer') + '"'
                                + (isActive ? '' : ' onclick="onApproachBaruParamChange(\'sigmaPct\', ' + sig + ')"') + '>'
                                + '<td class="py-2 px-3 border border-slate-300">' + sig + '%</td>'
                                + '<td class="py-2 px-3 border border-slate-300">' + formatCurrency(dr.sigmaC) + '</td>'
                                + '<td class="py-2 px-3 border border-slate-300">' + dr.T.toFixed(4) + 'x</td>'
                                + '<td class="py-2 px-3 border border-slate-300">' + (dr.s > 0 ? formatPercent(dr.s * 100) : '-') + '</td>'
                                + '<td class="py-2 px-3 border border-slate-300">' + gapRp + '</td></tr>';
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 8. Panel Pembanding Gap -->
        <div class="card">
            <div class="card-title">Panel Pembanding Gap</div>
            <div class="card-desc">Perbandingan struktur untuk berbagai nilai gap (dengan sigma aktif = ${sp}%). Klik baris untuk menerapkan.</div>
            <div class="overflow-x-auto">
                <table class="w-full text-center border-collapse border border-slate-300">
                    <thead><tr class="bg-slate-100 border-b-2 border-slate-300 text-xs font-semibold uppercase tracking-wider">
                        <th class="py-2 px-3 border border-slate-300">Gap g</th>
                        <th class="py-2 px-3 border border-slate-300">s (spread)</th>
                        <th class="py-2 px-3 border border-slate-300">Step D1 (Rp)</th>
                        <th class="py-2 px-3 border border-slate-300">Gap D1-D2 (Rp)</th>
                    </tr></thead>
                    <tbody>
                        ${[0, 1, 2, 3, 5].map(gv => {
                            const dr = deriveGradeStack(U, C, sp, gv);
                            const isActive = gv === gp;
                            const stepD1Rp = dr.grades.length >= 1 ? formatCurrency(rk(dr.grades[0].step)) : '-';
                            const gapRp = dr.grades.length >= 2 ? formatCurrency(rk(dr.grades[1].min - dr.grades[0].max)) : '-';
                            return '<tr class="border-b border-slate-200 ' + (isActive ? 'bg-purple-50 font-bold' : 'hover:bg-slate-50 cursor-pointer') + '"'
                                + (isActive ? '' : ' onclick="onApproachBaruParamChange(\'gapPct\', ' + gv + ')"') + '>'
                                + '<td class="py-2 px-3 border border-slate-300">' + gv + '%</td>'
                                + '<td class="py-2 px-3 border border-slate-300">' + (dr.s > 0 ? formatPercent(dr.s * 100) : '-') + '</td>'
                                + '<td class="py-2 px-3 border border-slate-300">' + stepD1Rp + '</td>'
                                + '<td class="py-2 px-3 border border-slate-300">' + gapRp + '</td></tr>';
                        }).join('')}
                    </tbody>
                </table>
            </div>
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
        const cur = approachBaruParams.composition || { gapok: 75, tt: 25 };
        approachBaruParams.composition = { gapok: Math.min(85, Math.max(50, Math.round(numVal))), tt: cur.tt };
    } else if (key === 'compTT') {
        const cur = approachBaruParams.composition || { gapok: 75, tt: 25 };
        approachBaruParams.composition = { gapok: cur.gapok, tt: Math.min(40, Math.max(5, Math.round(numVal))) };
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
    const compTTSlider = document.getElementById('ab-comp-tt');
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
    if (compTTSlider && key === 'compTT') compTTSlider.value = approachBaruParams.composition.tt;

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
    approachBaruParams.subLevelMultipliers[key] = Math.min(1.50, Math.max(0.50, Math.round(numVal * 100) / 100));
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
        approachBaruParams.composition = approachBaruParams.composition || { gapok: 75, tt: 25 };
        approachBaruParams.composition.gapok = Number(compGapokEl.value) || 75;
    }

    // Sync anchors dari form
    approachBaruParams.anchors = approachBaruParams.anchors || { ...DEFAULT_APPROACH_BARU.anchors };
    ['D1', 'D2', 'D3-1', 'D3-2', 'D4-1', 'D4-2', 'D5', 'D6'].forEach(key => {
        const el = document.getElementById('ab-anchor-' + key);
        if (el) approachBaruParams.anchors[key] = Number(el.value) || DEFAULT_APPROACH_BARU.anchors[key];
    });

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

    saveToStorage();
    alert('Parameter Pendekatan Baru berhasil disimpan!');
}

function resetApproachBaruParams() {
    if (!confirm('Reset parameter Pendekatan Baru ke default?')) return;
    approachBaruParams = { 
        ...DEFAULT_APPROACH_BARU, 
        composition: { ...DEFAULT_APPROACH_BARU.composition },
        anchors: { ...DEFAULT_APPROACH_BARU.anchors },
        subLevelMultipliers: { ...DEFAULT_SUB_LEVEL_MULTIPLIERS }
    };
    selectedUMK = 'Kota Surabaya';
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

    const umkValue = UMK_DATA[selectedUMK] || 3000000;
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
                        <tr class="bg-slate-100 border-b-2 border-slate-300 text-slate-600 font-semibold uppercase tracking-wider text-center">
                            <th class="py-2 px-2 border border-slate-300 text-center">Jenjang</th>
                            <th class="py-2 px-2 border border-slate-300 text-center">Sub</th>
                            <th class="py-2 px-2 border border-slate-300 text-center">Pos</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-blue-50/50">THP (Total)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-emerald-50/50">Gapok</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-amber-50/50">Tunj. Tetap</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-orange-50/50">Tunj. Tidak Tetap</th>
                            <th class="py-2 px-2 border border-slate-300 text-center">Check 75%</th>
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
                                    <td class="py-1.5 px-2 border border-slate-300 text-center text-xs text-amber-800 bg-amber-50/30 font-bold">${formatCurrency(r.tt)}</td>
                                    <td class="py-1.5 px-2 border border-slate-300 text-center text-xs text-orange-800 bg-orange-50/30">${formatCurrency(r.ttt)}</td>
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
    const umkValue = UMK_DATA[selectedUMK] || 3000000;
    const tableData = generateSpreadTableData(umkValue, params, jvScores);
    const headers = ['Jenjang', 'Sub-Level', 'Pos', 'Track', 'THP', 'Gapok', 'Tunj. Tetap', 'Tunj. Tidak Tetap', 'Check75%'];
    const rows = tableData.map(r => [
        r.jenjangName, r.subLevel, r.type, r.track,
        r.thp, r.gapok, r.tt, r.ttt,
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
        allData[loc] = generateFullTable(UMK_DATA[loc], params, jvScores);
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
        allData[loc] = generateFullTable(UMK_DATA[loc], params, jvScores);
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
            const comps = calcBaruCellComponents(sub.rp, k, modelType, approachBaruParams, 'flat');
            const thpPct = (comps.thp / U) * 100;
            return '<td class="py-2 px-3 border border-slate-300 text-center">'
                + '<div class="font-bold text-xs text-slate-900">' + formatCurrency(comps.thp) + '</div>'
                + '<div class="text-[10px] text-slate-500">' + formatPercent(thpPct) + '</div></td>';
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
        const comps = calcBaruCellComponents(exSub.rp, 2, modelType, approachBaruParams, 'flat');
        exampleHTML = `
        <div class="card">
            <div class="card-title">Rincian Komposisi -- Contoh D3-C</div>
            <div class="card-desc">Contoh komposisi untuk grade D3 sub-level C (midpoint). Model: ${modelType === 'squeeze' ? 'Model A (Squeeze)' : 'Model B (Additive)'}. Gapok=${compG}%, TT=Keluarga (Istri/Suami: ${hasPasangan ? '1' : '0'}, Anak: ${jumlahAnak}) + Lama Kerja (${(maxMasaKerjaTahun/2).toFixed(1)} thn).</div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="stat-card"><div class="stat-value text-blue-700">${formatCurrency(comps.thp)}</div><div class="stat-label">Total THP = ${formatPercent((comps.thp/U)*100)} UMK</div></div>
                <div class="stat-card"><div class="stat-value text-emerald-700">${formatCurrency(comps.gapok)}</div><div class="stat-label">Gapok (${compG}%)</div></div>
                <div class="stat-card"><div class="stat-value text-amber-700">${formatCurrency(comps.tt)}</div><div class="stat-label">Tunj. Tetap (Keluarga + Lama Kerja)</div></div>
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
        const comps = calcBaruCellComponents(sub.rp, k, modelType, approachBaruParams, 'flat');
        return '<tr class="hover:bg-slate-50 border-b border-slate-200 font-mono text-xs text-center">'
            + '<td class="py-1.5 px-3 border border-slate-300 font-sans font-bold text-slate-900 whitespace-nowrap text-center">' + gr.name + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center font-sans font-semibold">' + subLabels[k] + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center font-bold text-slate-900">' + formatCurrency(comps.thp) + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center text-slate-500 font-sans">' + formatPercent((comps.thp/U)*100) + '</td>'
            + '<td class="py-1.5 px-3 border border-slate-300 text-center text-emerald-700 font-semibold">' + formatCurrency(comps.gapok) + '</td>'
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
                            <th class="py-2 px-2 border border-slate-300 bg-slate-50" colspan="2">Tunjangan Tetap (TT)</th>
                            <th class="py-2 px-2 border border-slate-300 bg-orange-50 text-orange-850" rowspan="2">Tunj. Profesional (TTT)</th>
                        </tr>
                        <tr class="bg-slate-50 border-b border-slate-300 text-slate-500 font-semibold uppercase tracking-wider text-[9px] text-center">
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
    const umkValue = UMK_DATA[selectedUMK] || 3000000;
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

    const thpPct = anchor * mult + loading;
    const thpVal = rk(umkValue * thpPct / 100);
    const gapokL = rk(thpVal * cg / 100);
    const ttL    = rk(thpVal * ct / 100);
    const tttL   = thpVal - gapokL - ttL;
    const ttStruk  = rk(ttL * tsS / 100);
    const ttLKerja = rk(ttL * tsL / 100);
    const ttKel    = ttL - ttStruk - ttLKerja;
    const thpA    = rk((anchor + loading) * umkValue / 100);
    const gapokG  = rk(thpA * cg / 100);
    const ngG     = thpVal - gapokG;
    const ttNumG  = ct * mult;
    const ttG     = rk(ngG * ttNumG / (ttNumG + cttt));
    const tttG    = ngG - ttG;
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
            stepCard('STEP 9 � HITUNG', 'NonGapok & TT proporsional', `<div class="flex flex-col gap-0.5 mt-1 text-xs font-bold"><span class="text-slate-600">NonGapok = THP - Gapok = ${formatCurrency(ngG)}</span><span class="text-amber-600">TT = NG � (${ct}�${mult.toFixed(2)}) / ((${ct}�${mult.toFixed(2)})+${cttt}) = ${formatCurrency(ttG)}</span></div>`, 'Berbeda per sub-level (karena Multiplier)', 'nongapok-tt', 'process'),
            stepCard('STEP 10 � HASIL', 'Tunjangan Tidak Tetap', `<div class="text-lg font-extrabold text-orange-700">${formatCurrency(tttG)}</div>`, '= THP - Gapok - TT � rincian TT = slot anggaran', 'ttt-residual', 'output'),
            stepCard('STEP 11 � VALIDASI', 'Cek Aturan 75%', `<div class="text-lg font-extrabold ${ratioG >= 75 ? 'text-emerald-600' : 'text-red-600'}">${ratioG.toFixed(1)}%</div>`, 'Gapok � (Gapok + TT) harus = 75%', 'check75', 'output')
        ].join(arrow);
    }
    const rumusSections = [
        { title: 'Rumus Dasar � berlaku kedua skema', rows: [['jv', 'Job Value', 'JV = K�15 + E�10 + S�12 + D�15 + C�10 + I�8 + X�8 + V�8 + N�5 + R�9'], ['mult', 'Multiplier Sub-Level', 'A=1.00 � B=1.07 � C=1.15 � D=1.22 � E=1.29'], ['loading', 'Loading per Jenjang (LOCKED)', 'D1=10% � D2=24.2% � D3=38.4% � D4=52.6% � D5=66.8% � D6=81%'], ['spread', 'Spread Min / Mid / Max', 'Min = Mid - Step � Max = Mid + Step'], ['rounding', 'Pembulatan Rupiah', 'Semua nilai Rp dibulatkan ke kelipatan 1.000']]},
        { title: 'Skema Lama', scheme: 'lama', rows: [['thp-pct', 'THP Mid %', 'THP% = Anchor � Mult + Loading'], ['thp-rp', 'THP Rupiah', 'THP(Rp) = round1000( THP% � UMK � 100 )'], ['comp-lama', 'Komposisi Komponen', 'Gapok = THP�cG% � TT = THP�cT% � TTT = THP - Gapok - TT'], ['tt-detail-lama', 'Rincian Tunjangan Tetap', 'Struktural = TT�s% � Lama Kerja = TT�l% � Keluarga = sisa']]},
        { title: 'Skema Gaji Pokok', scheme: 'gp', rows: [['thp-a', 'THP Terendah (Sub A)', 'THP_A = round1000( (Anchor + Loading) � UMK � 100 )'], ['gapok-fixed', 'Gapok Seragam per Jenjang', 'Gapok = round1000( THP_A � comp.gapok% )'], ['nongapok-tt', 'Tunjangan Tetap Proporsional', 'TT = NonGapok � (cT�M) � ( (cT�M) + cTTT )'], ['ttt-residual', 'Tunjangan Tidak Tetap', 'TTT = THP - Gapok - TT']]},
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
    const comps   = calcBaruCellComponents(exPaket, 2, modelType, approachBaruParams, 'flat');

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
            + '<span class="text-amber-600">Sub A = Anchor / (compG%) x Premium</span>'
            + '<span class="text-purple-600">' + multLabels + '</span></div>',
            'B-E = A x Multiplier', 's-derive', 'calc'),
        stepCard('STEP 5 - BANGUN', 'Bangun 8 Grade (A-E)',
            '<div class="overflow-x-auto mt-1"><table class="w-full text-left border-collapse">'
            + '<thead><tr class="border-b border-slate-200"><th class="py-1 px-2 text-[10px]">Grade</th><th class="py-1 px-2 text-[10px] text-right">Min(A)</th><th class="py-1 px-2 text-[10px] text-right">Max(E)</th></tr></thead>'
            + '<tbody>' + miniTableRows + '</tbody></table></div>',
            'Sub A = Anchor, B-E = A x mult', 'build', 'process'),
        stepCard('STEP 6 - PECAH', 'Gapok / TunjTetap / TunjProf',
            '<div class="flex flex-col gap-0.5 mt-1 text-xs font-bold">'
            + '<span class="text-emerald-600">Gapok = ' + compG + '% x THP = ' + formatCurrency(comps.gapok) + '</span>'
            + '<span class="text-amber-600">TunjTetap = Keluarga + Lama Kerja = ' + formatCurrency(comps.tt) + '</span>'
            + '<span class="text-orange-600">TunjProf = ' + (modelType === 'squeeze' ? 'Sisa THP' : 'Tunj. Prof Tetap') + ' = ' + formatCurrency(comps.ttt) + '</span></div>',
            'Contoh D3-C (' + formatCurrency(comps.thp) + ')', 'pecah', 'output')
    ].join(arrow);

    // Flow details cache
    flowDetailsCache = {
        'baru-umk': { kind: 'GRADE STACKING', title: 'UMK Lokasi', purpose: 'Upah Minimum Kab/Kota menjadi dasar untuk Sub-Level A pada setiap grade.', notes: ['Pilih dari 39 lokasi Jawa Timur di Menu 2.'] },
        'baru-plafon-sigma': { kind: 'GRADE STACKING', title: 'Plafon & Sigma', purpose: 'Plafon = batas atas THP. Sigma = persentase plafon yang menjadi puncak tetap.', notes: ['sigmaC = Plafon x sigma%.'] },
        'baru-t-calc': { kind: 'GRADE STACKING', title: 'T = sigmaC / UMK', purpose: 'T adalah rasio puncak terhadap UMK. Menentukan seberapa lebar total struktur.', notes: ['T < 1.05 = terlalu sempit.'] },
        'baru-s-derive': { kind: 'GRADE STACKING', title: 'Anchor + Multiplier', purpose: 'Sub-Level A ditentukan oleh Anchor%. B-E ditentukan oleh Multiplier relatif terhadap A.', notes: ['A = Anchor% x UMK / CompG% x Premium (jika managerial).', 'B-E = A x Multiplier. Default: B=0.94, C=0.88, D=0.82, E=0.76.'] },
        'baru-build': { kind: 'GRADE STACKING', title: 'Bangun Grade', purpose: '8 grade dibangun dari anchor + multiplier. Sub A = dasar, B-E = A x multiplier.', notes: ['D3-2 dan D4-2 menggunakan Premium Managerial dari D3-1 dan D4-1.'] },
        'baru-pecah': { kind: 'GRADE STACKING', title: 'Pecahan Komponen', purpose: 'Gapok = ' + compG + '% x THP, Tunj Tetap = Keluarga + Lama Kerja (Riil), Tunj Prof = sisa THP (Model A) atau porsi tetap (Model B).', notes: ['Aturan hukum: Gapok/(Gapok+TT) minimal 75%.'] }
    };

    // Formula rows
    const rumusRows = [
        ['T', 'T = sigma x Plafon / UMK'],
        ['Sub A', 'Sub A = Anchor% x UMK / CompG% x Premium'],
        ['Sub B-E', 'Sub X = Sub A x Multiplier_X'],
        ['Multipliers', 'A=' + mults.A + ', B=' + mults.B + ', C=' + mults.C + ', D=' + mults.D + ', E=' + mults.E],
        ['Gapok', 'Gapok = ' + compG + '% x THP (aturan hukum minimal 75% dari Gapok+TT)'],
        ['Tunj Tetap', 'Tunj Tetap = Tunj Keluarga + Tunj Lama Kerja (Riil)'],
        ['Tunj Prof', 'Tunj Prof = sisa THP (Model A) atau porsi tetap (Model B)']
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
        { name: 'T', desc: d.T.toFixed(4) + 'x UMK. Rasio puncak terhadap UMK.' },
        { name: 'Anchor', desc: 'Persentase dasar Sub A terhadap UMK per grade. D1=' + anchors.D1 + '%, D6=' + anchors.D6 + '%.' },
        { name: 'Multipliers', desc: 'A=' + mults.A + ', B=' + mults.B + ', C=' + mults.C + ', D=' + mults.D + ', E=' + mults.E + '. Sub-level multipliers.' },
        { name: 'Gapok', desc: compG + '% x THP. Gaji pokok tetap (aturan hukum minimal 75% dari Gapok+TT).' },
        { name: 'Tunj Tetap', desc: 'Tunjangan Keluarga + Tunjangan Lama Kerja (Dihitung dari profil).' },
        { name: 'Tunj Prof', desc: 'Sisa dari Paket setelah dikurangi Gaji Pokok dan Tunjangan Tetap (Model A) atau Porsi Tetap (Model B).' }
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

function calcBaruCellComponents(base_THP, subIdx, modelType, params, rowType) {
    const compG = params.composition?.gapok || 75;
    const U = getActiveUmk();
    const rk = v => Math.round(v / 1000) * 1000;

    // Years of service
    let years = 0;
    if (rowType === 'Min') {
        years = 0;
    } else if (rowType === 'Mid') {
        years = (params.maxMasaKerjaTahun ?? 5) / 2;
    } else if (rowType === 'Max') {
        years = params.maxMasaKerjaTahun ?? 5;
    } else {
        // Flat sub-level progression in Menu 5
        years = (subIdx / 4) * (params.maxMasaKerjaTahun ?? 5);
    }

    const hasPas = params.hasPasangan ?? 1;
    const anak = params.jumlahAnak ?? 2;
    const tt_kel = rk((Number(hasPas) + Number(anak)) * (params.tunjKeluargaPerAnak ?? 100000));
    const tt_lk = rk(years * (params.tunjLamaKerjaPerTahun ?? 50000));
    const tt = tt_kel + tt_lk;

    let thp, gapok, ttt;
    if (modelType === 'squeeze') {
        thp = base_THP;
        gapok = rk(base_THP * compG / 100);
        ttt = Math.max(0, thp - gapok - tt);
    } else {
        // Additive model
        gapok = rk(base_THP * compG / 100);
        ttt = rk(base_THP * (100 - compG) / 100);
        thp = Math.min(params.plafon || 15000000, gapok + ttt + tt);
    }

    return { thp, gapok, tt, ttt, tt_kel, tt_lk };
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
            
            // Calculate Min, Mid, Max based on Step parameter (in UMK %)
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
                const comps = calcBaruCellComponents(baseTHP, subIdx, modelType, approachBaruParams, type);

                const thpPct = (comps.thp / U) * 100;
                const gapokPct = (comps.gapok / U) * 100;

                const ratio = calc75Ratio(comps.gapok, comps.tt);
                const ratioText = ratio.toFixed(1) + '%';
                const passRule = ratio >= 75;

                const badgeClass = type === 'Min' ? 'bg-red-100 text-red-700' : type === 'Max' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700';

                rowsHTML += `
                    <tr class="hover:bg-slate-50 border-b border-slate-200 font-mono text-xs text-center">
                        <td class="py-1.5 px-2 border border-slate-300 font-sans font-bold text-slate-900 text-center whitespace-nowrap">${gr.name}</td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-sans">
                            <span class="font-bold">${subLabel}</span>
                        </td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-sans">
                            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeClass}">${type}</span>
                        </td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-bold text-slate-900 bg-blue-50/30">${formatCurrency(comps.thp)}<br><span class="text-[10px] font-sans text-slate-500 font-normal">${formatPercent(thpPct)} UMK</span></td>
                        <td class="py-1.5 px-2 border border-slate-300 text-center font-semibold text-emerald-800 bg-emerald-50/30">${formatCurrency(comps.gapok)}<br><span class="text-[10px] font-sans text-slate-500 font-normal">${formatPercent(gapokPct)} UMK</span></td>
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
                            <th class="py-2 px-2 border border-slate-300 text-center bg-slate-50" colspan="2">Tunjangan Tetap (TT)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center bg-orange-50/50" rowspan="2">Tunj. Profesional (TTT)</th>
                            <th class="py-2 px-2 border border-slate-300 text-center" rowspan="2">Rasio Pokok/Tetap (Min 75%)</th>
                        </tr>
                        <tr class="bg-slate-50 border-b border-slate-300 text-slate-500 font-semibold uppercase tracking-wider text-[10px] text-center">
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
        const U = UMK_DATA[loc] || 3000000;
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
                const comps = calcBaruCellComponents(sub.rp, slIdx, modelType, approachBaruParams, 'flat');
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

    const headers = ['Grade', 'Sub-Level', 'Pos', 'THP', 'Gapok', 'Tunj. Keluarga', 'Tunj. Lama Kerja', 'Tunj. Profesional', 'Ratio75%'];
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
                const comps = calcBaruCellComponents(baseTHP, subIdx, modelType, approachBaruParams, type);

                const ratio = calc75Ratio(comps.gapok, comps.tt);
                const ratioText = ratio.toFixed(1) + '%';
                rows.push([
                    gr.name, subLabels[subIdx], type, comps.thp, comps.gapok, comps.tt_kel, comps.tt_lk, comps.ttt, ratioText
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
        const U = UMK_DATA[loc] || 3000000;
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
                    const comps = calcBaruCellComponents(sub.rp, slIdx, modelType, approachBaruParams, 'flat');
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

