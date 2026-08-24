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
let paramMode = 'manual';        // 'manual' | 'watson' — sumber parameter anchor
let watsonResult = null;         // hasil terakhir calcWatsonAnchors (untuk panel Menu 2)
let _watsonRecalcTimer = null;   // debounce auto-recompute saat skor JV berubah

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
                ${Object.keys(params.anchors).map(k => {
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
    const rowCodes = ['D1', 'D2', 'D3-1', 'D4-1', 'D5', 'D6', 'D3-2', 'D4-2'];
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

    saveToStorage();
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
    const stepCard = (badge, title, valueHtml, hint, id, cls) => `
                <div class="flow-box flow-${cls} clickable" onclick="openFlowDetail('${id}')">
                    <div class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">${badge}</div>
                    <div class="font-bold text-sm">${title}</div>
                    ${valueHtml}
                    ${hint ? `<div class="text-[10px] text-slate-500 mt-1">${hint}</div>` : ''}
                    ${qBadge}
                </div>`;

    const stepsInput = [
        stepCard('STEP 1 &middot; INPUT', 'Cari UMK lokasi', `<div class="text-lg font-extrabold text-blue-600">${formatCurrency(umkValue)}</div>`, selectedUMK, 'umk', 'input'),
        stepCard('STEP 2 &middot; INPUT', `Anchor % jenjang ${demoJenjang}`, `<div class="text-lg font-extrabold text-emerald-600">${anchor}%</div>`, 'Menu 2 &rarr; Anchor % per Jenjang', 'anchor', 'input'),
        stepCard('STEP 3 &middot; INPUT', `Multiplier sub-level ${demoSub}`, `<div class="text-lg font-extrabold text-purple-600">&times; ${mult.toFixed(2)}</div>`, 'Menu 2 &rarr; Sub-Level Multipliers', 'mult', 'input'),
        stepCard('STEP 4 &middot; INPUT', 'Loading jenjang (LOCKED)', `<div class="text-lg font-extrabold text-amber-600">+ ${loading}%</div>`, 'Nilai tetap, tidak bisa diubah', 'loading', 'input')
    ];

    let flowHTML;
    if (isLama) {
        flowHTML = [
            ...stepsInput,
            stepCard('STEP 5 &middot; HITUNG', 'THP Mid %', `<div class="text-base font-extrabold text-blue-600">${anchor}% &times; ${mult.toFixed(2)} + ${loading}% = ${thpPct.toFixed(1)}%</div>`, '', 'thp-pct', 'calc'),
            stepCard('STEP 6 &middot; HASIL', 'THP Rupiah (Mid)', `<div class="text-lg font-extrabold text-blue-700">${formatCurrency(thpVal)}</div>`, `Min / Max = Mid &minus; / + ${step}%`, 'thp-rp', 'output'),
            stepCard('STEP 7 &middot; HITUNG', 'Bagi komponen dari THP (Composition Matrix)', `
                        <div class="flex flex-col gap-0.5 mt-1 text-xs font-bold">
                            <span class="text-emerald-600">Gapok = THP &times; ${cg}% = ${formatCurrency(gapokL)}</span>
                            <span class="text-amber-600">TT = THP &times; ${ct}% = ${formatCurrency(ttL)}</span>
                            <span class="text-orange-600">TTT = THP &minus; Gapok &minus; TT = ${formatCurrency(tttL)}</span>
                        </div>`, '', 'comp-lama', 'process'),
            stepCard('STEP 8 &middot; DETAIL', 'Rincian Tunjangan Tetap', `
                        <div class="flex flex-col gap-0.5 mt-1 text-xs font-bold">
                            <span class="text-amber-600">Struktural = TT &times; ${tsS}% = ${formatCurrency(ttStruk)}</span>
                            <span class="text-amber-600">Lama Kerja = TT &times; ${tsL}% = ${formatCurrency(ttLKerja)}</span>
                            <span class="text-amber-600">Keluarga = sisa = ${formatCurrency(ttKel)}</span>
                        </div>`, '', 'tt-detail-lama', 'process'),
            stepCard('STEP 9 &middot; VALIDASI', 'Cek Aturan 75%', `<div class="text-lg font-extrabold ${ratioL >= 75 ? 'text-emerald-600' : 'text-red-600'}">${ratioL.toFixed(1)}%</div>`, 'Gapok &divide; (Gapok + TT) harus &ge; 75%', 'check75', 'output')
        ].join(arrow);
    } else {
        flowHTML = [
            ...stepsInput,
            stepCard('STEP 5 &middot; HITUNG', 'THP Mid %', `<div class="text-base font-extrabold text-blue-600">${anchor}% &times; ${mult.toFixed(2)} + ${loading}% = ${thpPct.toFixed(1)}%</div>`, '', 'thp-pct', 'calc'),
            stepCard('STEP 6 &middot; HASIL', 'THP Rupiah (Mid)', `<div class="text-lg font-extrabold text-blue-700">${formatCurrency(thpVal)}</div>`, `Min / Max = Mid &minus; / + ${step}% &middot; berbeda per sub-level`, 'thp-rp', 'output'),
            stepCard('STEP 7 &middot; HITUNG', 'THP terendah — Sub-Level A', `<div class="text-base font-extrabold text-slate-700">(${anchor}% + ${loading}%) &times; UMK = ${formatCurrency(thpA)}</div>`, 'Setara Mult A = 1.00, tanpa pembagian spread', 'thp-a', 'calc'),
            stepCard('STEP 8 &middot; HASIL', 'Gapok SERAGAM per jenjang', `<div class="text-lg font-extrabold text-emerald-700">${formatCurrency(gapokG)}</div>`, `= THP_A &times; comp.gapok% (${cg}%) — sama untuk A&ndash;E`, 'gapok-fixed', 'output'),
            stepCard('STEP 9 &middot; HITUNG', 'NonGapok & TT proporsional', `
                        <div class="flex flex-col gap-0.5 mt-1 text-xs font-bold">
                            <span class="text-slate-600">NonGapok = THP &minus; Gapok = ${formatCurrency(ngG)}</span>
                            <span class="text-amber-600">TT = NG &times; (${ct}&times;${mult.toFixed(2)}) / ((${ct}&times;${mult.toFixed(2)})+${cttt}) = ${formatCurrency(ttG)}</span>
                        </div>`, 'Berbeda per sub-level (karena Multiplier)', 'nongapok-tt', 'process'),
            stepCard('STEP 10 &middot; HASIL', 'Tunjangan Tidak Tetap', `<div class="text-lg font-extrabold text-orange-700">${formatCurrency(tttG)}</div>`, '= THP &minus; Gapok &minus; TT &middot; rincian TT = slot anggaran', 'ttt-residual', 'output'),
            stepCard('STEP 11 &middot; VALIDASI', 'Cek Aturan 75%', `<div class="text-lg font-extrabold ${ratioG >= 75 ? 'text-emerald-600' : 'text-red-600'}">${ratioG.toFixed(1)}%</div>`, 'Gapok &divide; (Gapok + TT) harus &ge; 75%', 'check75', 'output')
        ].join(arrow);
    }

    const rumusSections = [
        { title: 'Rumus Dasar — berlaku kedua skema', rows: [
            ['jv', 'Job Value', 'JV = K&times;15 + E&times;10 + S&times;12 + D&times;15 + C&times;10 + I&times;8 + X&times;8 + V&times;8 + N&times;5 + R&times;9'],
            ['mult', 'Multiplier Sub-Level', 'A=1.00 &middot; B=1.07 &middot; C=1.15 &middot; D=1.22 &middot; E=1.29'],
            ['loading', 'Loading per Jenjang (LOCKED)', 'D1=10% &middot; D2=24.2% &middot; D3=38.4% &middot; D4=52.6% &middot; D5=66.8% &middot; D6=81%'],
            ['spread', 'Spread Min / Mid / Max', 'Min = Mid &minus; Step &nbsp;&middot;&nbsp; Max = Mid + Step'],
            ['rounding', 'Pembulatan Rupiah', 'Semua nilai Rp dibulatkan ke kelipatan 1.000']
        ]},
        { title: 'Skema Lama', scheme: 'lama', rows: [
            ['thp-pct', 'THP Mid %', 'THP% = Anchor &times; Mult + Loading'],
            ['thp-rp', 'THP Rupiah', 'THP(Rp) = round1000( THP% &times; UMK &divide; 100 )'],
            ['comp-lama', 'Komposisi Komponen', 'Gapok = THP&times;cG% &nbsp;&middot;&nbsp; TT = THP&times;cT% &nbsp;&middot;&nbsp; TTT = THP &minus; Gapok &minus; TT'],
            ['tt-detail-lama', 'Rincian Tunjangan Tetap', 'Struktural = TT&times;s% &nbsp;&middot;&nbsp; Lama Kerja = TT&times;l% &nbsp;&middot;&nbsp; Keluarga = sisa']
        ]},
        { title: 'Skema Gaji Pokok', scheme: 'gp', rows: [
            ['thp-a', 'THP Terendah (Sub A)', 'THP_A = round1000( (Anchor + Loading) &times; UMK &divide; 100 )'],
            ['gapok-fixed', 'Gapok Seragam per Jenjang', 'Gapok = round1000( THP_A &times; comp.gapok% )'],
            ['nongapok-tt', 'Tunjangan Tetap Proporsional', 'TT = NonGapok &times; (cT&times;M) &divide; ( (cT&times;M) + cTTT )'],
            ['ttt-residual', 'Tunjangan Tidak Tetap', 'TTT = THP &minus; Gapok &minus; TT']
        ]},
        { title: 'Validasi', rows: [
            ['check75', 'Aturan 75%', 'Gapok &divide; ( Gapok + TT ) &ge; 75%']
        ]}
    ];

    const rumusHTML = rumusSections.map(sec => `
                <div class="mt-3 first:mt-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-extrabold uppercase tracking-wider text-slate-700">${sec.title}</span>
                        ${sec.scheme ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${(sec.scheme === 'lama') === isLama ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}">${(sec.scheme === 'lama') === isLama ? 'SKEMA AKTIF' : 'skema lain'}</span>` : ''}
                    </div>
                    ${sec.rows.map(r => `
                    <div class="formula-row" onclick="openFlowDetail('${r[0]}')">
                        <span class="font-bold text-slate-600 text-[11px] uppercase tracking-wide">${r[1]}</span>
                        <span class="text-slate-800">${r[2]}</span>
                    </div>`).join('')}
                </div>`).join('');

    flowDetailsCache = {
        umk: {
            kind: 'INPUT', title: 'UMK Lokasi',
            purpose: 'Titik awal seluruh perhitungan: nilai upah minimum regional yang menjadi dasar konversi semua persentase ke Rupiah.',
            inputs: [{ name: `Pilihan lokasi UMK (${selectedUMK})`, src: 'MENU 2' }],
            formulas: ['Output akhir (Rp) = Persentase × UMK ÷ 100'],
            example: [`UMK ${selectedUMK} = ${formatCurrency(umkValue)}`, 'Angka ini dipakai sebagai pengali di seluruh langkah berikutnya.'],
            notes: ['39 lokasi Jawa Timur tersedia di dropdown Menu 2.', 'Mengganti lokasi langsung mengubah semua nominal Rupiah di simulasi.']
        },
        anchor: {
            kind: 'INPUT', title: `Anchor % — ${demoJenjangObj.name}`,
            purpose: 'Persentase dasar yang menentukan posisi relatif jenjang pada struktur gaji dibanding jenjang lain.',
            inputs: [{ name: `Anchor ${demoJenjang}`, src: 'MENU 2' }],
            formulas: [`Anchor(${demoJenjang}) = ${anchor}%`],
            example: [`Rentang antar jenjang: 50% (D1) s.d. 140% (D6).`, `Anchor ${demoJenjang} saat ini = ${anchor}%.`],
            notes: ['Diatur per jenjang di Menu 2.', 'Skema Gaji Pokok: anchor juga menentukan Gapok (via THP_A).']
        },
        mult: {
            kind: 'INPUT', title: 'Multiplier Sub-Level',
            purpose: 'Pengali progression di dalam satu jenjang untuk membedakan sub-level A sampai E.',
            inputs: [{ name: 'Sub-Level Multipliers A–E', src: 'MENU 2' }],
            formulas: [`Mult(${demoSub}) = ${mult.toFixed(2)}`, 'Default: A=1.00, B=1.07, C=1.15, D=1.22, E=1.29'],
            example: [`Demo memakai sub-level ${demoSub} dengan multiplier ${mult.toFixed(2)}.`],
            notes: ['Skema Lama: multiplier mempengaruhi Gapok.', 'Skema Gaji Pokok: multiplier mempengaruhi THP dan porsi TT.']
        },
        loading: {
            kind: 'INPUT', title: 'Loading Jenjang (LOCKED)',
            purpose: 'Tambahan persentase tetap pada THP per jenjang, di atas hasil Anchor × Multiplier.',
            inputs: [{ name: 'Loading per jenjang', src: 'LOCKED' }],
            formulas: ['D1=10% · D2=24.2% · D3=38.4%', 'D4=52.6% · D5=66.8% · D6=81%'],
            example: [`Loading ${demoJenjang} saat ini = ${loading}%.`],
            notes: ['Nilai terkunci (Formula 3) dan tidak dapat diubah dari UI — hard-coded di data.js.']
        },
        'thp-pct': {
            kind: isLama ? 'STEP 5 · HITUNG' : 'STEP 5 · HITUNG', title: 'THP Mid %',
            purpose: 'Menggabungkan tiga parameter (Anchor, Multiplier, Loading) menjadi satu persentase THP posisi tengah.',
            inputs: [
                { name: `Anchor ${demoJenjang} = ${anchor}%`, src: 'MENU 2' },
                { name: `Mult ${demoSub} = ${mult.toFixed(2)}`, src: 'MENU 2' },
                { name: `Loading = ${loading}%`, src: 'LOCKED' }
            ],
            formulas: ['THP% = Anchor × Mult + Loading'],
            example: [`${anchor}% × ${mult.toFixed(2)} + ${loading}% = ${thpPct.toFixed(1)}%`],
            notes: ['Inilah angka "Mid %" pada kolom THP tabel Spread.']
        },
        'thp-rp': {
            kind: 'HASIL', title: 'THP Rupiah',
            purpose: 'Mengonversi persentase THP menjadi nominal uang berdasarkan UMK lokasi.',
            inputs: [{ name: `Step (spread) = ${step}%`, src: 'MENU 2' }],
            formulas: ['THP(Rp)   = round1000( THP% × UMK ÷ 100 )', 'Min(Rp)   = round1000( (THP% − Step) × UMK ÷ 100 )', 'Max(Rp)   = round1000( (THP% + Step) × UMK ÷ 100 )'],
            example: [`THP Mid = ${thpPct.toFixed(1)}% × ${formatCurrency(umkValue)} ÷ 100 = ${formatCurrency(thpVal)}.`, `Spread ± ${step}% di sekitar Mid untuk Min/Max.`],
            notes: [isLama
                ? 'Skema Lama: spread berlaku juga pada Gapok (Min/Mid/Max).'
                : 'Skema Gaji Pokok: spread hanya pada THP; Gapok tidak ikut spread.',
                'Hasil inilah kolom THP di Menu 3 & Spread Table.']
        },
        'comp-lama': {
            kind: 'SKEMA LAMA · HITUNG', title: 'Composition Matrix — Bagi Komponen dari THP',
            purpose: 'Memecah THP menjadi tiga komponen gaji sesuai proporsi yang diatur user.',
            inputs: [
                { name: `comp.gapok = ${cg}%`, src: 'MENU 2' },
                { name: `comp.tt = ${ct}%`, src: 'MENU 2' },
                { name: `comp.ttt = ${cttt}%`, src: 'MENU 2' }
            ],
            formulas: ['Gapok = round1000( THP × cG% )', 'TT    = round1000( THP × cT% )', 'TTT   = THP − Gapok − TT'],
            example: [`Gapok = ${formatCurrency(gapokL)}`, `TT    = ${formatCurrency(ttL)}`, `TTT   = ${formatCurrency(tttL)}`],
            notes: ['Total cG + cT + cTTT harus 100%.', 'Mengubah komposisi tidak mengubah THP — hanya susunannya.']
        },
        'tt-detail-lama': {
            kind: 'SKEMA LAMA · DETAIL', title: 'Rincian Tunjangan Tetap',
            purpose: 'Membagi TT ke dalam tiga pos tunjangan sesuai TT Split Matrix.',
            inputs: [
                { name: `Struktural = ${tsS}%`, src: 'MENU 2' },
                { name: `Lama Kerja = ${tsL}%`, src: 'MENU 2' }
            ],
            formulas: ['Struktural = round1000( TT × s% )', 'Lama Kerja = round1000( TT × l% )', 'Keluarga   = TT − Struktural − LamaKerja'],
            example: [`Struktural = ${formatCurrency(ttStruk)}`, `Lama Kerja = ${formatCurrency(ttLKerja)}`, `Keluarga   = ${formatCurrency(ttKel)}`],
            notes: ['Pos Keluarga dihitung sebagai sisa agar total TT tepat setelah pembulatan.']
        },
        'thp-a': {
            kind: 'SKEMA GAJI POKOK · HITUNG', title: 'THP_A — THP Terendah',
            purpose: 'Menghitung THP sub-level A (multiplier 1.00) sebagai patokan Gapok seragam satu jenjang.',
            formulas: ['THP_A = round1000( (Anchor + Loading) × UMK ÷ 100 )', '(Setara THP sub-level A karena Mult A = 1.00)'],
            example: [`(${anchor}% + ${loading}%) × ${formatCurrency(umkValue)} ÷ 100 = ${formatCurrency(thpA)}`],
            notes: ['Disebut juga "THP Terendah" jenjang tersebut.']
        },
        'gapok-fixed': {
            kind: 'SKEMA GAJI POKOK · HASIL', title: 'Gapok Seragam per Jenjang',
            purpose: 'Menetapkan Gapok yang sama untuk seluruh sub-level A–E dalam satu jenjang.',
            inputs: [{ name: `comp.gapok = ${cg}%`, src: 'MENU 2' }],
            formulas: ['Gapok = round1000( THP_A × comp.gapok% )'],
            example: [`Gapok = ${formatCurrency(thpA)} × ${cg}% = ${formatCurrency(gapokG)}`],
            notes: ['MIN = MID = MAX — Gapok tidak mengikuti spread.', 'Keputusan BOD (Pak Andika): Gapok sama antar direktorat; diferensiasi antar direktorat lewat bonus/gaji ke-13, bukan gapok.']
        },
        'nongapok-tt': {
            kind: 'SKEMA GAJI POKOK · HITUNG', title: 'NonGapok & TT Proporsional',
            purpose: 'Menghitung sisa THP setelah Gapok, lalu membagi TT secara proporsional dengan pembobot Multiplier.',
            inputs: [
                { name: `comp.tt = ${ct}%`, src: 'MENU 2' },
                { name: `comp.ttt = ${cttt}%`, src: 'MENU 2' }
            ],
            formulas: ['NonGapok = THP − Gapok', 'TT = NonGapok × (cT × M) ÷ ( (cT × M) + cTTT )'],
            example: [`NonGapok = ${formatCurrency(thpVal)} − ${formatCurrency(gapokG)} = ${formatCurrency(ngG)}`, `TT = ${formatCurrency(ngG)} × (${ct}×${mult.toFixed(2)}) ÷ ((${ct}×${mult.toFixed(2)})+${cttt}) = ${formatCurrency(ttG)}`],
            notes: ['Sub-level lebih tinggi → porsi TT membesar karena pembobot Multiplier.']
        },
        'ttt-residual': {
            kind: 'SKEMA GAJI POKOK · HASIL', title: 'TTT Residual',
            purpose: 'Menutup pembagian komponen: TTT adalah sisa THP setelah Gapok dan TT.',
            formulas: ['TTT = THP − Gapok − TT'],
            example: [`TTT = ${formatCurrency(thpVal)} − ${formatCurrency(gapokG)} − ${formatCurrency(ttG)} = ${formatCurrency(tttG)}`],
            notes: ['Rincian TT (struktural/lama kerja/keluarga) bernilai 0 — hanya slot anggaran.']
        },
        check75: {
            kind: 'VALIDASI', title: 'Aturan 75%',
            purpose: 'Memastikan proporsi Gapok terhadap penghasilan tetap (Gapok + TT) memenuhi batas minimum perundangan.',
            formulas: ['Rasio = Gapok ÷ (Gapok + TT) × 100%', 'Lulus jika Rasio ≥ 75%'],
            example: [
                `Skema Lama (demo): ${formatCurrency(gapokL)} ÷ (${formatCurrency(gapokL)} + ${formatCurrency(ttL)}) = ${ratioL.toFixed(1)}%`,
                `Skema Gaji Pokok (demo): ${ratioG.toFixed(1)}%`
            ],
            notes: ['Ditampilkan sebagai angka di kolom Check 75% Menu 3: hijau ≥ 75%, merah < 75%.']
        },
        jv: {
            kind: 'RUMUS', title: 'Job Value (Watson Wyatt)',
            purpose: 'Skor evaluasi jabatan dari 10 faktor Watson Wyatt dengan bobot total 100.',
            formulas: ['JV = K×15 + E×10 + S×12 + D×15 + C×10 + I×8 + X×8 + V×8 + N×5 + R×9'],
            example: ['K=Pendidikan, E=Pengalaman, S=Ruang Lingkup, D=Tingkat Keputusan,', 'C=Konsekuensi Kesalahan, I/X=Kontak Int/Eksternal, V=Pengawasan,', 'N=Jml Karyawan Diawasi, R=Riset & Pengembangan.'],
            notes: ['Skor faktor 1–5 diisi di Menu 1; range JV 100–500.', 'Dalam prototipe ini JV bersifat display (tidak mengubah nominal).']
        },
        spread: {
            kind: 'RUMUS', title: 'Spread Min / Mid / Max',
            purpose: 'Membuat rentang bayaran di sekitar nilai tengah agar ada ruang negosiasi/progression.',
            inputs: [{ name: `Step = ${step}%`, src: 'MENU 2' }],
            formulas: ['Mid = nilai dasar', 'Min = Mid − Step', 'Max = Mid + Step'],
            example: [`Contoh: Mid ${thpPct.toFixed(1)}% → Min ${(thpPct - step).toFixed(1)}%, Max ${(thpPct + step).toFixed(1)}%.`],
            notes: [isLama
                ? 'Skema Lama: spread berlaku pada Gapok DAN THP.'
                : 'Skema Gaji Pokok: spread hanya pada THP (Gapok seragam).']
        },
        rounding: {
            kind: 'RUMUS', title: 'Pembulatan Rupiah',
            purpose: 'Menjaga angka simulasi rapi dengan membulatkan semua nominal ke ribuan.',
            formulas: ['round1000(x) = Math.round(x ÷ 1000) × 1000'],
            example: ['Contoh: 4.998.760 → 4.999.000; 4.998.200 → 4.998.000.'],
            notes: ['Diterapkan pada THP, Gapok, TT, dan TTT. Komponen residual (TTT/Keluarga) dihitung sebagai sisa agar totals tetap pas.']
        }
    };

    container.innerHTML = `
        <div class="card">
            <div class="card-title"><span>📖</span> Alur Perhitungan Formula</div>
            <div class="card-desc">
                Diagram alur lengkap menunjukkan dari mana setiap angka berasal dan bagaimana satu sama lain terhubung.
                Saat ini: <span class="font-bold text-blue-600">${isLama ? 'Skema Lama' : 'Skema Gaji Pokok'}</span>.
                <span class="font-semibold text-slate-700">Klik kartu mana pun</span> untuk penjelasan lengkapnya.
            </div>
        </div>

        <!-- SCHEMA FLOW -->
        <div class="card">
            <div class="card-title"><span>${isLama ? '📋' : '💰'}</span> ${isLama ? 'Skema Lama' : 'Skema Gaji Pokok'} — Alur Hitung</div>
            <div class="card-desc">
                Angka di bawah adalah <span class="font-bold">nilai live</span> mengikuti parameter Anda saat ini —
                Demo: <span class="font-semibold">${demoJenjangObj.name}</span>, Sub-Level <span class="font-semibold">${demoSub}</span>,
                UMK <span class="font-semibold">${selectedUMK}</span>.
            </div>

            <div class="flex flex-col items-center gap-0 my-6">
                ${flowHTML}
            </div>
        </div>

        <!-- FORMULA REFERENCE -->
        <div class="card">
            <div class="card-title"><span>📐</span> Kumpulan Rumus</div>
            <div class="card-desc">Semua rumus yang dipakai simulator. Klik baris mana pun untuk penjelasan lengkap beserta contoh hitung live.</div>
            ${rumusHTML}
        </div>

        <!-- DETAIL MODAL -->
        <div id="flow-modal" class="modal-overlay" style="display:none" onclick="closeFlowDetail()">
            <div class="modal-box" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="closeFlowDetail()" aria-label="Tutup">&times;</button>
                <div id="flow-modal-content"></div>
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
