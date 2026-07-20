let currentPage = 1;
let currentLimit = 10;
let statusFilter = '';
let paymentFilter = '';
let searchTerm = '';
let startDate = '';
let endDate = '';
let debounceTimer;

async function loadOrders() {
  const url = `/api/admin/orders?page=${currentPage}&limit=${currentLimit}&status=${statusFilter}&payment=${paymentFilter}&search=${encodeURIComponent(searchTerm)}&startDate=${startDate}&endDate=${endDate}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    showToast(data.message || 'Failed to load orders', 'error');
    return;
  }

  renderOrders(data.orders);
  renderPagination(data.totalPages, data.currentPage);
  document.getElementById('totalOrdersLabel').textContent = `${data.totalOrders} orders found`;
}

const STATUS_COLORS = {
  Pending: '#ffc107',
  Processing: '#6ea8fe',
  Shipped: '#0dcaf0',
  'Out for Delivery': '#ffa500',
  Delivered: '#75b798',
  Cancelled: '#ea868f'
};

function renderOrders(orders) {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '';

  if (!orders || orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">No orders found</td></tr>';
    return;
  }

  orders.forEach(order => {
    const color = STATUS_COLORS[order.status] || '#888';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="text-warning fw-bold">${order.orderId}</td>
      <td>
        <div>${order.user?.name || 'Unknown'}</div>
        <div class="text-secondary small">${order.user?.email || ''}</div>
      </td>
      <td>₹${order.totalAmount?.toLocaleString()}</td>
      <td>${order.paymentMethod}</td>
      <td>
        <select class="form-select form-select-sm status-inline-select"
          data-id="${order._id}"
          style="background:#2a2a2a; color:${color}; border-color:${color}; width:160px; font-weight:600;">
          ${['Pending','Processing','Shipped','Out for Delivery','Delivered','Cancelled'].map(s =>
            `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td class="text-secondary small">${new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
      <td>
        <a href="/admin/orders/${order._id}" class="btn btn-sm btn-secondary">
          <i class="bi bi-eye"></i>
        </a>
      </td>`;
    tbody.appendChild(row);
  });

  // Attach status change listeners to inline dropdowns
  document.querySelectorAll('.status-inline-select').forEach(select => {
    select.addEventListener('change', async () => {
      const confirmed = await showConfirm(`Change order status to "${select.value}"?`);
      if (!confirmed) {
        loadOrders();
        return;
      }
      await changeStatus(select.dataset.id, select.value);
    });
  });
}

async function changeStatus(orderId, status) {
  const res = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) loadOrders();
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('ordersPagination');
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
      const li = document.createElement('li');
      li.className = `page-item ${i === current ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', (e) => { e.preventDefault(); currentPage = i; loadOrders(); });
      pagination.appendChild(li);
    } else if (Math.abs(i - current) === 2) {
      const li = document.createElement('li');
      li.className = 'page-item disabled';
      li.innerHTML = `<a class="page-link" href="#">...</a>`;
      pagination.appendChild(li);
    }
  }
}

// Filters
document.getElementById('statusFilter').addEventListener('change', (e) => {
  statusFilter = e.target.value; currentPage = 1; loadOrders();
});
document.getElementById('paymentFilter').addEventListener('change', (e) => {
  paymentFilter = e.target.value; currentPage = 1; loadOrders();
});
document.getElementById('startDate').addEventListener('change', (e) => {
  startDate = e.target.value; currentPage = 1; loadOrders();
});
document.getElementById('endDate').addEventListener('change', (e) => {
  endDate = e.target.value; currentPage = 1; loadOrders();
});
document.getElementById('limitSelect').addEventListener('change', (e) => {
  currentLimit = parseInt(e.target.value); currentPage = 1; loadOrders();
});

// Search
const searchInput = document.getElementById('orderSearch');
const clearBtn = document.getElementById('clearSearch');

searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  clearBtn.classList.toggle('d-none', searchInput.value === '');
  debounceTimer = setTimeout(() => {
    searchTerm = e.target.value.trim();
    currentPage = 1;
    loadOrders();
  }, 400);
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.classList.add('d-none');
  searchTerm = '';
  currentPage = 1;
  loadOrders();
});

// Clear all filters
document.getElementById('clearFiltersBtn').addEventListener('click', () => {
  // Reset all state variables
  statusFilter = '';
  paymentFilter = '';
  searchTerm = '';
  startDate = '';
  endDate = '';
  currentPage = 1;

  // Reset all UI elements
  document.getElementById('statusFilter').value = '';
  document.getElementById('paymentFilter').value = '';
  document.getElementById('orderSearch').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('clearSearch').classList.add('d-none');

  // Reload with clean state
  loadOrders();
  showToast('Filters cleared');
});

// Logout
document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// Export (simple CSV)
document.getElementById('exportBtn').addEventListener('click', () => {
  window.open(`/api/admin/orders/export?status=${statusFilter}&payment=${paymentFilter}&search=${searchTerm}&startDate=${startDate}&endDate=${endDate}`, '_blank');
});

loadOrders();