/* =========================================================
   Patrikar Petroleum Point - Chart.js & Gauge Visualizers
   ========================================================= */

let salesDistributionChart = null;
let shiftSalesChart = null;

const ChartsManager = {
  renderSalesDistributionChart(fuelData) {
    const ctx = document.getElementById('chart-sales-distribution');
    if (!ctx) return;

    if (salesDistributionChart) {
      salesDistributionChart.destroy();
    }

    const labels = fuelData.map(item => item.fuel_type);
    const amounts = fuelData.map(item => item.amount);
    const backgroundColors = [
      '#002D62', // Petrol Navy
      '#F37021'  // Saffron
    ];

    salesDistributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length > 0 ? labels : ['Petrol (MS)', 'Diesel (HSD)'],
        datasets: [{
          data: amounts.length > 0 ? amounts : [74839, 125845],
          backgroundColor: backgroundColors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Inter', size: 12 },
              padding: 16
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ₹${context.raw.toLocaleString('en-IN')}`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  },

  renderShiftSalesChart(shiftReadings) {
    const ctx = document.getElementById('chart-shift-sales');
    if (!ctx) return;

    if (shiftSalesChart) {
      shiftSalesChart.destroy();
    }

    const labels = shiftReadings.map(r => r.nozzle_name);
    const litresData = shiftReadings.map(r => r.net_litres);
    const amountData = shiftReadings.map(r => r.total_amount);

    shiftSalesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['MS Nozzle 1', 'HSD Nozzle 1'],
        datasets: [
          {
            label: 'Net Litres Sold',
            data: litresData.length > 0 ? litresData : [645, 1245],
            backgroundColor: '#002D62',
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'Total Revenue (₹)',
            data: amountData.length > 0 ? amountData : [74839, 125845],
            backgroundColor: '#F37021',
            borderRadius: 6,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Litres' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Revenue (₹)' }
          }
        }
      }
    });
  }
};
