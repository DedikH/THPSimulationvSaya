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
let spreadStaircaseChart = null;

function renderSpreadStaircaseChart(d, approachBaruParams, U, sortOrder = 'asc') {
    const ctx = document.getElementById('spread-staircase-chart');
    if (!ctx) return;

    const subLabels = ['A', 'B', 'C', 'D', 'E'];
    const subDescMap = {
        'A': 'A - Foundation',
        'B': 'B - Developing',
        'C': 'C - Proficient',
        'D': 'D - Advanced',
        'E': 'E - Mastery'
    };
    const modelType = (approachBaruParams && approachBaruParams.modelType) || 'squeeze';
    
    const chartData = [];
    if (d && d.grades) {
        d.grades.forEach(gr => {
            gr.subs.forEach((sub, subIdx) => {
                const subCode = subLabels[subIdx];
                const subDesc = subDescMap[subCode] || subCode;
                const comps = (typeof calcBaruCellComponents === 'function') 
                    ? calcBaruCellComponents(sub.rp, subIdx, modelType, approachBaruParams, subCode, gr.label)
                    : { gapok: sub.rp * 0.75, thp: sub.rp };
                
                const track = gr.isManagerial ? 'Manajerial' : 'Fungsional';
                const fullLabel = `[${track}] ${gr.name} | ${subDesc}`;

                chartData.push({
                    label: fullLabel,
                    thp: comps.thp,
                    isManagerial: gr.isManagerial
                });
            });
        });
    }

    if (sortOrder === 'desc') {
        chartData.sort((a, b) => b.thp - a.thp);
    } else {
        chartData.sort((a, b) => a.thp - b.thp);
    }

    const labels = chartData.map(item => item.label);
    const thpBars = chartData.map(item => [0, item.thp]);
    const bgColors = chartData.map(item => item.isManagerial ? 'rgba(245, 158, 11, 0.85)' : 'rgba(16, 185, 129, 0.85)');
    const borderColors = chartData.map(item => item.isManagerial ? '#d97706' : '#059669');

    if (spreadStaircaseChart) {
        spreadStaircaseChart.destroy();
        spreadStaircaseChart = null;
    }

    spreadStaircaseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Take Home Pay (THP)',
                    data: thpBars,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 3,
                    barPercentage: 0.85,
                    categoryPercentage: 0.9
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: false,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 500000,
                        callback: (val) => 'Rp ' + (val / 1000000).toFixed(1).replace('.', ',') + 'jt',
                        font: { size: 10, weight: 'bold' }
                    },
                    grid: { color: '#f1f5f9' },
                    title: {
                        display: true,
                        text: 'Nominal THP (IDR)',
                        font: { size: 11, weight: 'bold' }
                    }
                },
                y: {
                    stacked: false,
                    ticks: {
                        font: { size: 10, weight: 'bold' }
                    },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { size: 11, weight: 'bold' },
                        generateLabels: (chart) => [
                            { text: 'Jalur Fungsional (THP)', fillStyle: 'rgba(16, 185, 129, 0.85)', strokeStyle: '#059669', lineWidth: 1 },
                            { text: 'Jalur Manajerial (THP)', fillStyle: 'rgba(245, 158, 11, 0.85)', strokeStyle: '#d97706', lineWidth: 1 }
                        ]
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const raw = context.raw;
                            const label = context.dataset.label || '';
                            if (Array.isArray(raw)) {
                                const thpFmt = (typeof formatCurrency === 'function') ? formatCurrency(raw[1]) : 'Rp ' + raw[1].toLocaleString('id-ID');
                                return `${label}: ${thpFmt}`;
                            }
                            return `${label}: ${raw}`;
                        }
                    }
                }
            }
        }
    });
}

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
