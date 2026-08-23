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
            if (saved.params) {
                for (const key in saved.params) {
                    if (typeof saved.params[key] === 'object' && saved.params[key] !== null && !Array.isArray(saved.params[key])) {
                        params[key] = { ...(params[key] || {}), ...saved.params[key] };
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

    // Show default menu
    showMenu('menu1');
});
