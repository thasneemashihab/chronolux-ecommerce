let currentPage = 1;
let currentLimit = 5;
let searchTerm = '';
let statusFilter = '';
let debounceTimer;

async function loadOrders() {
  const url = `/api/users/orders?page=${currentPage}&limit=${currentLimit}&status=${statusFilter}&search=${encodeURIComponent(searchTerm)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    showToast(data.message || 'Failed to load orders', 'error');
    return;
  }

  renderOrders(data.orders);
  renderPagination(data.totalPages, data.currentPage);
}

function renderOrders(orders) {
  const container = document.getElementById('ordersList');
  container.innerHTML = '';

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-bag-x" style="font-size:50px; color:#444;"></i>
        <h5 class="mt-3 text-secondary">No orders found</h5>
        <a href="/shop" class="btn btn-warning fw-bold mt-3">Start Shopping</a>
      </div>`;
    return;
  }

  orders.forEach(order => {
    const firstItem = order.items[0];
    const statusClass = `status-${order.status}`;

    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <img src="${firstItem?.image || '/images/default-product.jpg'}"
           class="order-card-img" alt="${firstItem?.name || 'Product'}">

      <div class="order-card-info">
        <p class="order-card-id">Order ID: ${order.orderId}</p>
        <p class="order-card-date">${new Date(order.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}</p>
      </div>

      <div class="order-card-meta">
        <p class="text-secondary small mb-1">Total Amount</p>
        <p class="order-card-amount">₹${order.totalAmount?.toLocaleString()}</p>
        <p class="text-secondary small mb-0">Payment Method</p>
        <p class="order-card-payment">${order.paymentMethod}</p>
      </div>

      <div class="d-flex flex-column gap-2 align-items-end">
        <span class="status-badge ${statusClass}">${order.status}</span>
        <a href="/orders/${order._id}" class="btn btn-sm btn-secondary">
          <i class="bi bi-eye me-1"></i> View Details
        </a>
      </div>`;

    container.appendChild(card);
  });
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('ordersPagination');
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  const prev = document.createElement('li');
  prev.className = `page-item ${current === 1 ? 'disabled' : ''}`;
  prev.innerHTML = `<a class="page-link" href="#">‹</a>`;
  prev.addEventListener('click', (e) => {
    e.preventDefault();
    if (current > 1) { currentPage--; loadOrders(); }
  });
  pagination.appendChild(prev);

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

  const next = document.createElement('li');
  next.className = `page-item ${current === totalPages ? 'disabled' : ''}`;
  next.innerHTML = `<a class="page-link" href="#">›</a>`;
  next.addEventListener('click', (e) => {
    e.preventDefault();
    if (current < totalPages) { currentPage++; loadOrders(); }
  });
  pagination.appendChild(next);
}

// Search
document.getElementById('orderSearch').addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchTerm = e.target.value.trim();
    currentPage = 1;
    loadOrders();
  }, 400);
});

// Status filter
document.getElementById('statusFilter').addEventListener('change', (e) => {
  statusFilter = e.target.value;
  currentPage = 1;
  loadOrders();
});

// Limit
document.getElementById('limitSelect').addEventListener('change', (e) => {
  currentLimit = parseInt(e.target.value);
  currentPage = 1;
  loadOrders();
});

loadOrders();