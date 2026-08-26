function buildDashQuery() {
  const params = new URLSearchParams();
  const start = document.getElementById('dashStartDate').value;
  const end = document.getElementById('dashEndDate').value;
  if (start) params.append('startDate', start);
  if (end) params.append('endDate', end);
  return params.toString();
}

let revenueChartInstance = null;
let statusChartInstance = null;

function renderRevenueChart(revenueByMonth) {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const labels = revenueByMonth.map(r => `${monthNames[r._id.month - 1]} ${r._id.year}`);
  const data = revenueByMonth.map(r => r.revenue);

  const ctx = document.getElementById('revenueChart').getContext('2d');

  // Destroy old chart before redrawing (important when filters change)
  if (revenueChartInstance) revenueChartInstance.destroy();

  revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (₹)',
        data,
        borderColor: '#f5b800',
        backgroundColor: 'rgba(245,184,0,0.15)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
       maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#fff' } } },
      scales: {
        x: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
        y: { ticks: { color: '#aaa' }, grid: { color: '#333' } }
      }
    }
  });
}

function renderStatusChart(statusBreakdown) {
  const labels = statusBreakdown.map(s => s._id);
  const data = statusBreakdown.map(s => s.count);
  const colors = ['#ffc107','#6ea8fe','#0dcaf0','#75b798','#ea868f','#adb5bd'];

  const ctx = document.getElementById('statusChart').getContext('2d');

  if (statusChartInstance) statusChartInstance.destroy();

  statusChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors
      }]
    },
    options: {
      responsive: true,
       maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#fff' } } }
    }
  });
}

async function loadDashboard() {
  const res = await fetch(`/api/admin/dashboard?${buildDashQuery()}`);
  const data = await res.json();

  document.getElementById('statRevenue').textContent = data.totalRevenue.toLocaleString();
  document.getElementById('statOrders').textContent = data.totalOrders.toLocaleString();
  document.getElementById('statUsers').textContent = data.totalUsers.toLocaleString();
  document.getElementById('statProducts').textContent = data.totalProducts.toLocaleString();

  renderTop10('bestProductsList', data.bestProducts);
  renderTop10('bestCategoriesList', data.bestCategories);
  renderTop10('bestBrandsList', data.bestBrands);

   renderRevenueChart(data.revenueByMonth);
  renderStatusChart(data.statusBreakdown);
}

function renderTop10(containerId, items) {
  const container = document.getElementById(containerId);
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="text-secondary small">No sales data yet</p>';
    return;
  }
  container.innerHTML = items.map((item, i) => `
    <div class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:#2a2a2a !important;">
      <span>#${i + 1} ${item.name}</span>
      <span class="text-warning fw-bold">${item.totalSold} sold</span>
    </div>`).join('');
}

document.getElementById('dashApplyFilterBtn').addEventListener('click', loadDashboard);
document.getElementById('dashResetFilterBtn').addEventListener('click', () => {
  document.getElementById('dashStartDate').value = '';
  document.getElementById('dashEndDate').value = '';
  loadDashboard();
});

document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadDashboard();