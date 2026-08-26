let currentPage = 1;
let currentQuery = '';

const STATUS_COLORS = {
  Pending: '#ffc107', Processing: '#6ea8fe', Shipped: '#0dcaf0',
  Delivered: '#75b798', Cancelled: '#ea868f', Returned: '#ea868f'
};

function buildQuery(page = 1) {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const status = document.getElementById('statusFilter').value;
  const paymentMethod = document.getElementById('paymentFilter').value;

  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (status) params.append('status', status);
  if (paymentMethod) params.append('paymentMethod', paymentMethod);
  params.append('page', page);
  params.append('limit', 10);

  return params.toString();
}

async function loadReport(page = 1) {
  currentPage = page;
  currentQuery = buildQuery(page);

  const res = await fetch(`/api/admin/sales-report?${currentQuery}`);
  const data = await res.json();

  document.getElementById('statTotalOrders').textContent = data.summary.totalOrders.toLocaleString();
  document.getElementById('statTotalRevenue').textContent = data.summary.totalRevenue.toLocaleString();
  document.getElementById('statAvgOrder').textContent = data.summary.averageOrderValue.toLocaleString();
  document.getElementById('statTotalDiscounts').textContent = data.summary.totalDiscounts.toLocaleString();
  document.getElementById('statNetRevenue').textContent = data.summary.netRevenue.toLocaleString();
  document.getElementById('statCancelledReturned').textContent = data.summary.cancelledReturnedCount.toLocaleString();

  renderTable(data.orders);
  renderPagination(data.totalPages, data.currentPage);
}

function renderTable(orders) {
  const tbody = document.getElementById('reportTableBody');
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center text-secondary py-4">No orders found for this filter</td></tr>';
    return;
  }

  orders.forEach(o => {
    const color = STATUS_COLORS[o.status] || '#888';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-warning fw-bold">${o.orderId}</td>
      <td>${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
      <td>${o.user?.name || 'Unknown'}</td>
      <td>${o.paymentMethod}</td>
      <td>${o.items.length}</td>
      <td>₹${o.subtotal.toLocaleString()}</td>
      <td>₹${(o.discount + o.couponDiscount).toLocaleString()}</td>
      <td>${o.shippingCharge === 0 ? 'Free' : '₹' + o.shippingCharge}</td>
      <td>₹${o.tax.toLocaleString()}</td>
      <td class="fw-bold">₹${o.totalAmount.toLocaleString()}</td>
      <td><span class="badge" style="background:${color}22; color:${color}; border:1px solid ${color};">${o.status}</span></td>
      <td><a href="/admin/orders/${o._id}" class="btn btn-sm btn-secondary"><i class="bi bi-eye"></i></a></td>`;
    tbody.appendChild(row);
  });
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('reportPagination');
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
      const li = document.createElement('li');
      li.className = `page-item ${i === current ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', (e) => { e.preventDefault(); loadReport(i); });
      pagination.appendChild(li);
    }
  }
}

document.getElementById('applyFilterBtn').addEventListener('click', () => loadReport(1));
document.getElementById('resetFilterBtn').addEventListener('click', () => {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('paymentFilter').value = '';
  loadReport(1);
});

document.getElementById('exportPdfBtn').addEventListener('click', () => {
  window.open(`/api/admin/sales-report/export-pdf?${buildQuery()}`, '_blank');
});
document.getElementById('exportExcelBtn').addEventListener('click', () => {
  window.location.href = `/api/admin/sales-report/export-excel?${buildQuery()}`;
});

document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadReport();