// =====================================================
// CHARTS.JS — Chart.js Configurations
// Radar Chart (Menu 1) + Stacked Bar Chart (Menu 3)
// =====================================================

let radarChart = null;
let barChart = null;

// ---- Radar Chart (Menu 1: Watson Job Evaluation) ----
function renderRadarChart(scores) {
    const ctx = document.getElementById('radar-chart');
    if (!ctx) return;

    const labels = FACTORS.map(f => f.code);
    const data = FACTORS.map(f => scores[f.code] || 0);

    if (radarChart) {
        radarChart.data.datasets[0].data = data;
        radarChart.update();
        return;
    }

    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Skor Faktor',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        font: { size: 10 },
                        backdropColor: 'transparent'
                    },
                    pointLabels: {
                        font: { size: 11, weight: 'bold' }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.raw} / 5`
                    }
                }
            }
        }
    });
}

// ---- Stacked Bar Chart (Menu 3: Simulation) ----
function renderBarChart(tableData) {
    const ctx = document.getElementById('bar-chart');
    if (!ctx) return;

    // Prepare data: group by jenjang, show avg THP components
    const labels = [];
    const gapokData = [];
    const ttData = [];
    const tttData = [];

    // Group by jenjang
    const grouped = {};
    tableData.forEach(row => {
        if (!grouped[row.jenjangCode]) {
            grouped[row.jenjangCode] = { gapok: 0, tt: 0, ttt: 0, count: 0 };
        }
        grouped[row.jenjangCode].gapok += row.gapok;
        grouped[row.jenjangCode].tt += row.tt;
        grouped[row.jenjangCode].ttt += row.ttt;
        grouped[row.jenjangCode].count++;
    });

    Object.keys(grouped).forEach(code => {
        const g = grouped[code];
        labels.push(code);
        gapokData.push(Math.round(g.gapok / g.count));
        ttData.push(Math.round(g.tt / g.count));
        tttData.push(Math.round(g.ttt / g.count));
    });

    if (barChart) barChart.destroy();

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gapok (Base Salary)',
                    data: gapokData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'TT (Tunjangan Tetap)',
                    data: ttData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'TTT (Tunjangan Tidak Tetap)',
                    data: tttData,
                    backgroundColor: 'rgba(245, 158, 11, 0.8)',
                    borderColor: '#f59e0b',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    stacked: true,
                    ticks: { font: { size: 11, weight: 'bold' } },
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        callback: (val) => 'Rp ' + (val / 1000000).toFixed(0) + 'jt',
                        font: { size: 10 }
                    },
                    grid: { color: '#f1f5f9' }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 11 }, usePointStyle: true }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ctx.dataset.label + ': ' + formatCurrency(ctx.raw)
                    }
                }
            }
        }
    });
}
