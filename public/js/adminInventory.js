let currentPage = 1;
let currentLimit = 10;
let searchTerm = '';
let stockFilter = '';
let debounceTimer;

async function loadInventory() {
  const url = `/api/admin/products/inventory?search=${encodeURIComponent(searchTerm)}&stock=${stockFilter}&page=${currentPage}&limit=${currentLimit}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    showToast(data.message || 'Failed to load inventory', 'error');
    return;
  }

  renderInventory(data.products);
  renderPagination(data.totalPages, data.currentPage);
  document.getElementById('inventoryLabel').textContent = `${data.totalProducts} products found`;

  // Update summary cards
  document.getElementById('outOfStockCount').textContent = data.summary.outOfStock;
  document.getElementById('lowStockCount').textContent = data.summary.lowStock;
  document.getElementById('inStockCount').textContent = data.summary.inStock;
}

function getStockBadge(stock) {
  if (stock === 0) return `<span class="stock-badge-danger">Out of Stock</span>`;
  if (stock <= 10) return `<span class="stock-badge-warning">Low Stock</span>`;
  return `<span class="stock-badge-success">In Stock</span>`;
}

function renderInventory(products) {
  const tbody = document.getElementById('inventoryTableBody');
  tbody.innerHTML = '';

  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-4">No products found</td></tr>';
    return;
  }

  products.forEach(p => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${p.images?.[0] || '/images/default.jpg'}"
               style="width:45px;height:45px;object-fit:cover;border-radius:6px;"
               alt="${p.name}">
          <span class="text-white fw-bold">${p.name}</span>
        </div>
      </td>
      <td class="text-secondary">${p.brand?.name || '—'}</td>
      <td class="text-secondary">${p.category?.name || '—'}</td>
      <td>${getStockBadge(p.stock)}</td>
      <td>
        <span class="fw-bold ${p.stock === 0 ? 'text-danger' : p.stock <= 10 ? 'text-warning' : 'text-white'}">
          ${p.stock}
        </span>
      </td>
      <td>
        <div class="stock-update-wrapper">
          <input type="number" class="stock-input" id="stockInput_${p._id}"
            value="${p.stock}" min="0" max="9999">
          <button class="btn-update-stock" onclick="updateStock('${p._id}')">
            Update
          </button>
        </div>
      </td>`;
    tbody.appendChild(row);
  });
}

async function updateStock(productId) {
  const input = document.getElementById(`stockInput_${productId}`);
  const newStock = parseInt(input.value);

  if (isNaN(newStock) || newStock < 0) {
    showToast('Please enter a valid stock quantity', 'error');
    return;
  }

  const confirmed = await showConfirm(`Update stock to ${newStock}?`);
  if (!confirmed) return;

  const res = await fetch(`/api/admin/products/inventory/${productId}/stock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock: newStock })
  });
  const data = await res.json();

  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) loadInventory();
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('inventoryPagination');
  pagination.innerHTML = '';
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === current ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => { e.preventDefault(); currentPage = i; loadInventory(); });
    pagination.appendChild(li);
  }
}

// Search
const searchInput = document.getElementById('inventorySearch');
const clearBtn = document.getElementById('clearSearch');

searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  clearBtn.classList.toggle('d-none', searchInput.value === '');
  debounceTimer = setTimeout(() => {
    searchTerm = e.target.value.trim();
    currentPage = 1;
    loadInventory();
  }, 400);
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.classList.add('d-none');
  searchTerm = '';
  currentPage = 1;
  loadInventory();
});

// Stock filter buttons
document.querySelectorAll('.stock-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.stock-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    stockFilter = btn.dataset.filter;
    currentPage = 1;
    loadInventory();
  });
});

// Logout
document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadInventory();