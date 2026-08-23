// =====================================================
// UI.JS — DOM Rendering, Sidebar, Tables, All 5 Menus
// =====================================================

// ---- State ----
let currentMenu = 'menu1';
let selectedJenjang = 'D3-1';
let selectedUMK = 'Kota Surabaya';
let jvScores = {};   // { 'D1': {K:2,E:1,...}, ... }
let params = {};
let compLocations = ['Kota Surabaya', 'Kota Malang'];
let currentScheme = 'skema-lama';

// ---- Sidebar Navigation ----
function showMenu(menuId) {
    currentMenu = menuId;
    document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
    const section = document.getElementById('section-' + menuId);
    if (section) section.classList.remove('hidden');

    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    const active = document.querySelector(`.sidebar-item[data-menu="${menuId}"]`);
    if (active) active.classList.add('active');

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
}

function resetScores() {
    if (!confirm('Reset skor ke default?')) return;
    jvScores[selectedJenjang] = { ...DEFAULT_SCORES[selectedJenjang] };
    renderMenu1();
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

    container.innerHTML = `
        <!-- Section A: Anchor % Gapok per Jenjang -->
        <div class="card">
            <div class="card-title"><span>🔑</span> Anchor % Gapok per Jenjang</div>
            <div class="card-desc">
                Atur persentase dasar Gaji Pokok untuk Sub-Level A pada setiap jenjang kepangkatan.
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${Object.keys(params.anchors).map(k => {
                    const jName = JENJANG_LIST.find(j => j.code === k)?.name || k;
                    return `
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">${jName}</label>
                        <input type="number" id="p-anchor-${k}" class="input-field" value="${params.anchors[k]}" step="1">
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
                Tentukan proporsi internal THP. Total harus = 100%.
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Gaji Pokok (%)</label>
                    <input type="number" id="p-gapok" class="input-field" value="${params.composition.gapok}" min="0" max="100" step="1">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Tunjangan Tetap (%)</label>
                    <input type="number" id="p-tt" class="input-field" value="${params.composition.tt}" min="0" max="100" step="1">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-500 mb-1">Tunjangan Tidak Tetap (%)</label>
                    <input type="number" id="p-ttt" class="input-field" value="${params.composition.ttt}" min="0" max="100" step="1">
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
    document.getElementById('p-gapok').addEventListener('input', validateComposition);
    document.getElementById('p-tt').addEventListener('input', validateComposition);
    document.getElementById('p-ttt').addEventListener('input', validateComposition);

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
    const tt = Number(document.getElementById('p-tt')?.value) || 0;
    const ttt = Number(document.getElementById('p-ttt')?.value) || 0;
    const total = g + tt + ttt;
    const el = document.getElementById('comp-validation');
    if (!el) return;
    if (total === 100) {
        el.innerHTML = '<span class="badge-pass">&#10003; Total = 100% — Valid</span>';
    } else {
        el.innerHTML = `<span class="badge-fail">&#10007; Total = ${total}% — Harus 100%</span>`;
    }
}

function saveParamsSilent() {
    // Read all anchor values
    Object.keys(params.anchors).forEach(k => {
        const el = document.getElementById('p-anchor-' + k);
        if (el) params.anchors[k] = Number(el.value) || params.anchors[k];
    });

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

    saveToStorage();
}

function saveParams() {
    saveParamsSilent();
    alert('Parameter berhasil disimpan!');
}

function resetParams() {
    if (!confirm('Reset semua parameter ke default?')) return;
    params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
    selectedUMK = 'Kota Surabaya';
    renderMenu2();
    // Re-render menu3 if visible
    const menu3El = document.getElementById('menu3-container');
    if (menu3El && menu3El.offsetParent !== null) {
        renderMenu3();
    }
}

// =====================================================
// MENU 3: Simulasi Penggajian
// =====================================================
function renderMenu3() {
    const container = document.getElementById('menu3-container');
    if (!container) return;

    const umkValue = UMK_DATA[selectedUMK] || 3000000;
    const tableData = generateSpreadTableData(umkValue, params, jvScores);

    container.innerHTML = `
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
                                        ${check75Rule(r.gapok, r.tt, r.thp) ? '<span class="badge-pass">&#10003; PASS</span>' : '<span class="badge-fail">&#10007; FAIL</span>'}
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
    const umkValue = UMK_DATA[selectedUMK] || 3000000;
    const tableData = generateSpreadTableData(umkValue, params, jvScores);
    const headers = ['Jenjang', 'Sub-Level', 'Pos', 'Track', 'THP', 'Gapok', 'Tunj. Tetap', 'Tunj. Tidak Tetap', 'Check75'];
    const rows = tableData.map(r => [
        r.jenjangName, r.subLevel, r.type, r.track,
        r.thp, r.gapok, r.tt, r.ttt,
        check75Rule(r.gapok, r.tt, r.thp) ? 'PASS' : 'FAIL'
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

    container.innerHTML = `
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
// MENU 6: Alur Formula (Formula Flow)
// =====================================================
function renderMenu6() {
    const container = document.getElementById('menu6-container');
    if (!container) return;

    const isLama = currentScheme === 'skema-lama';

    // Example values for demonstration
    const exAnchor = 100;
    const exMult = 1.07;
    const exLoading = 38.4;
    const exStep = 2;
    const exCompGapok = 50;
    const exCompTT = 15;
    const exUMK = 5288796;

    let exGapokMid, exTHPMid, exGapokCalc;
    if (isLama) {
        exGapokMid = exAnchor * exMult;
        exTHPMid = exGapokMid + exLoading;
        exGapokCalc = `THP × ${exCompGapok}%`;
    } else {
        exGapokMid = exAnchor;
        exTHPMid = exAnchor * exMult + exLoading;
        exGapokCalc = `Anchor × ${exCompGapok}%`;
    }

    const exGapokVal = Math.round((exUMK * (isLama ? exGapokMid : exAnchor * exCompGapok / 100) / 100) / 1000) * 1000;
    const exTHPVal = Math.round((exUMK * exTHPMid / 100) / 1000) * 1000;
    const exTTVal = Math.round((exTHPVal * exCompTT / 100) / 1000) * 1000;
    const exTTTVal = exTHPVal - exGapokVal - exTTVal;

    container.innerHTML = `
        <div class="card">
            <div class="card-title"><span>📖</span> Alur Perhitungan Formula</div>
            <div class="card-desc">
                Diagram alur lengkap menunjukkan dari mana setiap angka berasal dan bagaimana satu sama lain terhubung.
                Saat ini: <span class="font-bold text-blue-600">${isLama ? 'Skema Lama' : 'Skema Gaji Pokok'}</span>
            </div>
        </div>

        <!-- SCHEMA FLOW -->
        <div class="card">
            <div class="card-title"><span>${isLama ? '📋' : '💰'}</span> ${isLama ? 'Skema Lama' : 'Skema Gaji Pokok'} — Alur Hitung</div>
            <div class="card-desc">
                ${isLama 
                    ? 'Gapok dihitung dari Anchor × Multiplier. THP = Gapok + Loading. Komposisi diambil dari THP.'
                    : 'Gapok seragam per jenjang = Anchor × Composition%. THP = Anchor × Multiplier + Loading. TT & TTT diambil dari THP.'}
            </div>

            <!-- Flowchart -->
            <div class="flex flex-col items-center gap-0 my-6">
                <!-- Input Block -->
                <div class="flow-box flow-input">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">INPUT</div>
                    <div class="font-bold text-sm">UMK Lokasi</div>
                    <div class="text-lg font-extrabold text-blue-600">${formatCurrency(exUMK)}</div>
                </div>
                <div class="flow-arrow">&#11015;</div>

                <!-- Anchor Block -->
                <div class="flow-box flow-process">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 1 — Anchor %</div>
                    <div class="font-bold text-sm">Persentase dasar Gapok per Jenjang</div>
                    <div class="text-lg font-extrabold text-emerald-600">${exAnchor}%</div>
                    <div class="text-[10px] text-slate-500 mt-1">Dari Menu 2 → Parameter</div>
                </div>
                <div class="flow-arrow">&#11015;</div>

                ${isLama ? `
                <!-- SKEMA LAMA PATH -->
                <div class="flex gap-4 items-start">
                    <div class="flex flex-col items-center">
                        <div class="flow-box flow-process">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 2 — Multiplier</div>
                            <div class="font-bold text-sm">Sub-Level ${selectedJenjang === 'D3-1' ? 'B' : 'A'}</div>
                            <div class="text-lg font-extrabold text-purple-600">× ${exMult}</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-calc">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 3 — Gapok Mid%</div>
                            <div class="font-bold text-sm">Anchor × Multiplier</div>
                            <div class="text-lg font-extrabold text-emerald-600">${exAnchor}% × ${exMult} = ${exGapokMid.toFixed(1)}%</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-output">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">GAPOK (Rp)</div>
                            <div class="font-bold text-sm">Gapok Mid% × UMK</div>
                            <div class="text-lg font-extrabold text-emerald-700">${formatCurrency(exGapokVal)}</div>
                        </div>
                    </div>

                    <div class="flex flex-col items-center">
                        <div class="flow-box flow-process">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 2 — Loading</div>
                            <div class="font-bold text-sm">Jenjang D3-1</div>
                            <div class="text-lg font-extrabold text-amber-600">+ ${exLoading}%</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-calc">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 3 — THP Mid%</div>
                            <div class="font-bold text-sm">Gapok + Loading</div>
                            <div class="text-lg font-extrabold text-blue-600">${exGapokMid.toFixed(1)}% + ${exLoading}% = ${exTHPMid.toFixed(1)}%</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-output">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">THP (Rp)</div>
                            <div class="font-bold text-sm">THP Mid% × UMK</div>
                            <div class="text-lg font-extrabold text-blue-700">${formatCurrency(exTHPVal)}</div>
                        </div>
                    </div>
                </div>

                <div class="flow-arrow mt-2">&#11015;</div>
                <div class="flow-box flow-process">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 4 — Composition Matrix</div>
                    <div class="font-bold text-sm">THP × Persentase</div>
                    <div class="flex gap-4 mt-2 text-sm">
                        <span class="text-emerald-600 font-bold">Gapok = THP × ${exCompGapok}%</span>
                        <span class="text-amber-600 font-bold">TT = THP × ${exCompTT}%</span>
                        <span class="text-orange-600 font-bold">TTT = THP − Gapok − TT</span>
                    </div>
                </div>

                ` : `
                <!-- SKEMA GAJI POKOK PATH -->
                <div class="flex gap-4 items-start">
                    <div class="flex flex-col items-center">
                        <div class="flow-box flow-process">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 2 — Composition</div>
                            <div class="font-bold text-sm">Persentase Gapok</div>
                            <div class="text-lg font-extrabold text-emerald-600">× ${exCompGapok}%</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-calc">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 3 — Gapok %</div>
                            <div class="font-bold text-sm">Anchor × Composition</div>
                            <div class="text-lg font-extrabold text-emerald-600">${exAnchor}% × ${exCompGapok}% = ${(exAnchor * exCompGapok / 100).toFixed(1)}%</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-output">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">GAPOK (Rp) — SERAGAM</div>
                            <div class="font-bold text-sm">Gapok% × UMK</div>
                            <div class="text-lg font-extrabold text-emerald-700">${formatCurrency(exGapokVal)}</div>
                            <div class="text-[10px] text-emerald-500 mt-1">Sama untuk A/B/C/D/E</div>
                        </div>
                    </div>

                    <div class="flex flex-col items-center">
                        <div class="flow-box flow-process">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 2 — Multiplier</div>
                            <div class="font-bold text-sm">Sub-Level B</div>
                            <div class="text-lg font-extrabold text-purple-600">× ${exMult}</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-process">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 2 — Loading</div>
                            <div class="font-bold text-sm">Jenjang D3-1</div>
                            <div class="text-lg font-extrabold text-amber-600">+ ${exLoading}%</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-calc">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 3 — THP Mid%</div>
                            <div class="font-bold text-sm">Anchor × Mult + Loading</div>
                            <div class="text-lg font-extrabold text-blue-600">${exAnchor}% × ${exMult} + ${exLoading}% = ${exTHPMid.toFixed(1)}%</div>
                        </div>
                        <div class="flow-arrow">&#11015;</div>
                        <div class="flow-box flow-output">
                            <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">THP (Rp) — VARIATIF</div>
                            <div class="font-bold text-sm">THP Mid% × UMK</div>
                            <div class="text-lg font-extrabold text-blue-700">${formatCurrency(exTHPVal)}</div>
                            <div class="text-[10px] text-blue-500 mt-1">Berbeda per sub-level</div>
                        </div>
                    </div>
                </div>

                <div class="flow-arrow mt-2">&#11015;</div>
                <div class="flow-box flow-process">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">STEP 4 — Komposisi dari THP</div>
                    <div class="font-bold text-sm">THP × Persentase</div>
                    <div class="flex gap-4 mt-2 text-sm">
                        <span class="text-amber-600 font-bold">TT = THP × ${exCompTT}%</span>
                        <span class="text-orange-600 font-bold">TTT = THP − Gapok − TT</span>
                    </div>
                </div>
                `}
            </div>
        </div>

        <!-- VARIABLE GLOSSARY -->
        <div class="card">
            <div class="card-title"><span>📝</span> Daftar Variabel</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-slate-800">UMK (Upah Minimum Kabupaten/Kota)</div>
                    <div class="text-xs text-slate-600 mt-1">Gaji minimum regional dari 39 lokasi Jawa Timur. Dipilih di Menu 2.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-emerald-700">Anchor %</div>
                    <div class="text-xs text-slate-600 mt-1">Persentase dasar Gapok per jenjang. Diinput di Menu 2. Contoh: D3-1 = 100%.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-purple-700">Multiplier (Sub-Level)</div>
                    <div class="text-xs text-slate-600 mt-1">Pengali progression A→E. A=1.00, B=1.07, C=1.15, D=1.22, E=1.29.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-amber-700">Loading (Jenjang)</div>
                    <div class="text-xs text-slate-600 mt-1">Tambahan THP per jenjang. D1=10%, D2=24.2%, D3=38.4%, D4=52.6%, D5=66.8%, D6=81%.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-slate-700">Step (Spread)</div>
                    <div class="text-xs text-slate-600 mt-1">Selisih Min/Max dari Mid. Default = 2%. Gapok Min = Mid − step, Max = Mid + step.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-blue-700">Composition Matrix</div>
                    <div class="text-xs text-slate-600 mt-1">Proporsi Gapok / TT / TTT dari THP. Default: 50% / 15% / 35%.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-green-700">Gapok (Gaji Pokok)</div>
                    <div class="text-xs text-slate-600 mt-1">Gaji tetap per bulan. Skema Lama: dari THP. Skema Gaji Pokok: dari Anchor × Composition.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-amber-700">TT (Tunjangan Tetap)</div>
                    <div class="text-xs text-slate-600 mt-1">Tunjangan tetap = THP × composition.tt%. Terdiri dari Struktural, Lama Kerja, Keluarga.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-orange-700">TTT (Tunjangan Tidak Tetap)</div>
                    <div class="text-xs text-slate-600 mt-1">Tunjangan tidak tetap = THP − Gapok − TT. Sisa dari THP setelah pengurangan.</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div class="font-bold text-sm text-slate-700">JV (Job Value)</div>
                    <div class="text-xs text-slate-600 mt-1">Skor evaluasi jabatan Watson Wyatt. 10 faktor × bobot. Range: 100–500.</div>
                </div>
            </div>
        </div>

        <!-- COMPARISON TABLE -->
        <div class="card">
            <div class="card-title"><span>⚖️</span> Perbandingan 2 Skema</div>
            <div class="sim-table-wrap border border-slate-200">
                <table class="w-full text-center border-collapse border border-slate-300 text-sm">
                    <thead>
                        <tr class="bg-slate-100 border-b-2 border-slate-300">
                            <th class="py-2 px-3 border border-slate-300">Aspek</th>
                            <th class="py-2 px-3 border border-slate-300 bg-blue-50">Skema Lama</th>
                            <th class="py-2 px-3 border border-slate-300 bg-emerald-50">Skema Gaji Pokok</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="border-b border-slate-200">
                            <td class="py-2 px-3 border border-slate-300 font-semibold text-left">Gapok</td>
                            <td class="py-2 px-3 border border-slate-300">Anchor × Multiplier<br><span class="text-[10px] text-slate-500">(beragam per sub-level)</span></td>
                            <td class="py-2 px-3 border border-slate-300">Anchor × Composition%<br><span class="text-[10px] text-emerald-600 font-bold">(seragam per jenjang)</span></td>
                        </tr>
                        <tr class="border-b border-slate-200">
                            <td class="py-2 px-3 border border-slate-300 font-semibold text-left">THP</td>
                            <td class="py-2 px-3 border border-slate-300">Gapok + Loading<br><span class="text-[10px] text-slate-500">(beragam per sub-level)</span></td>
                            <td class="py-2 px-3 border border-slate-300">Anchor × Mult + Loading<br><span class="text-[10px] text-blue-600">(beragam per sub-level)</span></td>
                        </tr>
                        <tr class="border-b border-slate-200">
                            <td class="py-2 px-3 border border-slate-300 font-semibold text-left">Composition</td>
                            <td class="py-2 px-3 border border-slate-300">THP × %<br><span class="text-[10px] text-slate-500">(semua pakai THP)</span></td>
                            <td class="py-2 px-3 border border-slate-300">Gapok dari Anchor, TT/TTT dari THP<br><span class="text-[10px] text-slate-500">(Gapok tidak dari THP)</span></td>
                        </tr>
                        <tr class="border-b border-slate-200">
                            <td class="py-2 px-3 border border-slate-300 font-semibold text-left">Spread Gapok</td>
                            <td class="py-2 px-3 border border-slate-300">Min / Mid / Max<br><span class="text-[10px] text-slate-500">(ada spread ±step)</span></td>
                            <td class="py-2 px-3 border border-slate-300">Seragam<br><span class="text-[10px] text-emerald-600 font-bold">(Min = Mid = Max)</span></td>
                        </tr>
                        <tr>
                            <td class="py-2 px-3 border border-slate-300 font-semibold text-left">Sumber JV</td>
                            <td class="py-2 px-3 border border-slate-300" colspan="2">Menu 1 — Watson Wyatt 10 Faktor (display only)</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
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
