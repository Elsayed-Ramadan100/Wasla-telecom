/**
 * Usage Logic with Chart.js
 */
document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('usageChart').getContext('2d');

    // Dummy Data for Logic
    const dataMap = {
        daily: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            data: [0.1, 0.05, 0.2, 0.8, 1.2, 0.5]
        },
        weekly: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            data: [1.2, 1.5, 0.8, 2.0, 3.5, 4.2, 2.8]
        },
        monthly: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            data: [10, 8, 12, 15]
        }
    };

    let currentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataMap.daily.labels,
            datasets: [{
                label: 'Data Usage (GB)',
                data: dataMap.daily.data,
                borderColor: '#6A0DAD',
                backgroundColor: 'rgba(106, 13, 173, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Toggles
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mode = btn.dataset.mode;
            const newData = dataMap[mode];

            currentChart.data.labels = newData.labels;
            currentChart.data.datasets[0].data = newData.data;
            currentChart.update();
        });
    });

    // Download Simulation
    document.getElementById('btn-download-pdf').addEventListener('click', () => {
        WaslaUtils.showToast('Generating PDF Report...', 'info');
        setTimeout(() => {
            // Use jsPDF if available or just mock the alert
            if (window.jspdf) {
                const doc = new window.jspdf.jsPDF();
                doc.text('Wasla Telecom Usage Report', 10, 10);
                doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 20);
                doc.text('Total Usage: 12.5 GB', 10, 30);
                doc.save('wasla-usage-report.pdf');
            }
            WaslaUtils.showToast('Report Downloaded', 'success');
        }, 1500);
    });
});
