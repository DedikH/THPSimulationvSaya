// =====================================================
// APP.JS — Main Controller, Event Handlers, Init
// =====================================================

const STORAGE_KEY = 'payroll_sim_v2';

// ---- LocalStorage ----
function loadFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
            // Snapshot anchor manual: migrasi build lama memakai anchor tersimpan user,
            // build baru memakai anchor default (deep-safe)
            if (saved.params && saved.params.anchors && !saved.params.manualAnchors) {
                params.manualAnchors = { ...saved.params.anchors };
            } else {
                params.manualAnchors = { ...params.anchors };
            }
            if (saved.params) {
                for (const key in saved.params) {
                    // manualAnchors tidak ada di DEFAULT_PARAMS — merge langsung agar snapshot persisten antar sesi
                    if (key === 'manualAnchors' && typeof saved.params[key] === 'object' && saved.params[key] !== null) {
                        params.manualAnchors = { ...params.manualAnchors, ...saved.params[key] };
                        continue;
                    }
                    if (typeof saved.params[key] === 'object' && saved.params[key] !== null && !Array.isArray(saved.params[key])) {
                        // Only merge keys that exist in DEFAULT_PARAMS
                        const defaultKeys = DEFAULT_PARAMS[key] ? Object.keys(DEFAULT_PARAMS[key]) : [];
                        const filtered = {};
                        for (const k in saved.params[key]) {
                            if (defaultKeys.includes(k)) {
                                filtered[k] = saved.params[key][k];
                            }
                        }
                        params[key] = { ...(params[key] || {}), ...filtered };
                    } else {
                        params[key] = saved.params[key];
                    }
                }
            }
            jvScores = saved.jvScores || {};
            selectedUMK = saved.selectedUMK || 'Kota Surabaya';
            selectedJenjang = saved.selectedJenjang || 'D3-1';
            compLocations = saved.compLocations || ['Kota Surabaya', 'Kota Malang'];
            return;
        }
    } catch (e) {
        console.warn('Gagal load localStorage:', e);
    }
    // Defaults
    params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
    params.manualAnchors = { ...params.anchors };
    jvScores = {};
    Object.keys(DEFAULT_SCORES).forEach(k => { jvScores[k] = { ...DEFAULT_SCORES[k] }; });
    selectedUMK = 'Kota Surabaya';
    selectedJenjang = 'D3-1';
    compLocations = ['Kota Surabaya', 'Kota Malang'];
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            params,
            jvScores,
            selectedUMK,
            selectedJenjang,
            compLocations
        }));
    } catch (e) {
        console.warn('Gagal save localStorage:', e);
        alert('Penyimpanan penuh. Beberapa data mungkin tidak tersimpan.');
    }
}

function resetStorage() {
    if (!confirm('Reset semua pengaturan ke default?')) return;
    localStorage.removeItem(STORAGE_KEY);
    params = JSON.parse(JSON.stringify(DEFAULT_PARAMS));
    params.manualAnchors = { ...params.anchors };
    paramMode = 'manual';
    watsonResult = null;
    localStorage.setItem('payroll_sim_parammode', 'manual');
    const bM = document.getElementById('btn-param-manual');
    const bW = document.getElementById('btn-param-watson');
    if (bM && bW) {
        bM.classList.add('active');
        bW.classList.remove('active');
    }
    jvScores = {};
    Object.keys(DEFAULT_SCORES).forEach(k => { jvScores[k] = { ...DEFAULT_SCORES[k] }; });
    selectedUMK = 'Kota Surabaya';
    selectedJenjang = 'D3-1';
    compLocations = ['Kota Surabaya', 'Kota Malang'];
    showMenu(currentMenu);
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();

    // Sidebar click handlers
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.addEventListener('click', () => {
            showMenu(el.dataset.menu);
        });
    });

    // Reset button
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', resetStorage);

    // Composition validation live
    document.addEventListener('input', (e) => {
        if (['p-gapok', 'p-tt', 'p-ttt'].includes(e.target.id)) {
            validateComposition();
        }
    });

    // Auto-save on input change in Menu 2
    let _autoSaveTimer = null;
    document.addEventListener('input', (e) => {
        if (e.target.closest('#menu2-container')) {
            clearTimeout(_autoSaveTimer);
            _autoSaveTimer = setTimeout(() => saveParamsSilent(), 300);
        }
    });
    document.addEventListener('change', (e) => {
        if (e.target.closest('#menu2-container')) {
            saveParamsSilent();
        }
    });

    // Load scheme from localStorage
    const savedScheme = localStorage.getItem('payroll_sim_scheme');
    if (savedScheme === 'skema-lama' || savedScheme === 'skema-gapok') {
        currentScheme = savedScheme;
    }
    // Set initial toggle state
    const btnLama = document.getElementById('btn-skema-lama');
    const btnGapok = document.getElementById('btn-skema-gapok');
    if (btnLama && btnGapok) {
        btnLama.classList.toggle('active', currentScheme === 'skema-lama');
        btnGapok.classList.toggle('active', currentScheme === 'skema-gapok');
    }

    // ---- Param mode (Manual vs Watson-Driven) ----
    const savedParamMode = localStorage.getItem('payroll_sim_parammode');
    paramMode = savedParamMode === 'watson' ? 'watson' : 'manual';
    // Deep-safe: pastikan snapshot manual anchor selalu terbentuk
    if (!params.manualAnchors || typeof params.manualAnchors !== 'object' || Object.keys(params.manualAnchors).length === 0) {
        params.manualAnchors = { ...params.anchors };
    }
    // Pastikan anchor aktif konsisten dengan mode yang dipulihkan
    syncActiveSources();
    const btnParamManual = document.getElementById('btn-param-manual');
    const btnParamWatson = document.getElementById('btn-param-watson');
    if (btnParamManual && btnParamWatson) {
        btnParamManual.classList.toggle('active', paramMode === 'manual');
        btnParamWatson.classList.toggle('active', paramMode === 'watson');
    }

    // Show default menu
    showMenu('menu1');
});
