let currentPage = 1;
let searchTerm = '';
let selectedCategory = '';
let selectedBrand = '';
let maxPrice = 500000;
let sortBy = 'newest';
let debounceTimer;

// At the very top of shop.js, before loadProducts()
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('unavailable')) {
  showToast('This product is no longer available', 'error');
  // Clean the URL so the toast doesn't show again on refresh
  window.history.replaceState({}, '', '/shop');
}

async function loadProducts() {
  const url = `/api/users/products?search=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=8&sort=${sortBy}&category=${selectedCategory}&brand=${selectedBrand}&maxPrice=${maxPrice}`;
  const res = await fetch(url);
  const data = await res.json();

  renderProducts(data.products);
  renderPagination(data.totalPages, data.currentPage);
  renderFilters(data.categories, data.brands);
  document.getElementById('productsFoundLabel').textContent = `${data.totalProducts} Products Found`;
  document.getElementById('totalCount').textContent = data.totalProducts;
}

function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = '<div class="col-12 text-center text-secondary py-5"><h5>No products found</h5></div>';
    return;
  }

  products.forEach(p => {
    const avgRating = p.reviews?.length > 0
      ? (p.reviews.reduce((sum, r) => sum + r.rating, 0) / p.reviews.length).toFixed(1)
      : 0;
    const stars = getStarsHTML(avgRating);
    const discountBadge = p.discount > 0
      ? `<span class="product-card-discount">${p.discount}% off</span>` : '';

    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="product-card">
        <div class="position-relative" onclick="window.location.href='/product/${p._id}'">
          <img src="${p.images[0]}" class="product-card-img" alt="${p.name}">
          <span class="product-card-brand">${p.brand?.name || ''}</span>
          ${discountBadge}
        </div>
        <div class="product-card-body">
          <p class="product-card-name">${p.name}</p>
          <p class="product-card-price">₹${p.price.toLocaleString()}</p>
          <div class="d-flex justify-content-between align-items-center">
            <div>${stars}</div>
            <button class="card-wishlist-btn" data-id="${p._id}" title="Add to Wishlist">
              <i class="bi bi-heart"></i>
            </button>
          </div>
        </div>
      </div>`;
    grid.appendChild(col);
  });

  // Attach wishlist listeners
  document.querySelectorAll('.card-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent navigating to product page
      toggleWishlistFromCard(btn, btn.dataset.id);
    });
  });

  // Check which products are already wishlisted
  checkWishlistStatus();
}

let wishlistedIds = new Set();

async function checkWishlistStatus() {
  try {
    const res = await fetch('/api/users/wishlist');
    if (!res.ok) return; // not logged in
    const data = await res.json();

    wishlistedIds = new Set(data.products?.map(p => p._id) || []);

    // Update all heart buttons to reflect wishlist status
    document.querySelectorAll('.card-wishlist-btn').forEach(btn => {
      const isWishlisted = wishlistedIds.has(btn.dataset.id);
      btn.innerHTML = isWishlisted
        ? '<i class="bi bi-heart-fill text-danger"></i>'
        : '<i class="bi bi-heart"></i>';
    });
  } catch (err) {
    // Not logged in — hearts stay empty, clicking prompts login
  }
}

async function toggleWishlistFromCard(btn, productId) {
  const isWishlisted = wishlistedIds.has(productId);

  if (!isWishlisted) {
    // Check if user is logged in first
    const res = await fetch(`/api/users/wishlist/${productId}`, { method: 'POST' });
    if (res.status === 401) {
      showToast('Please login to add to wishlist', 'error');
      setTimeout(() => window.location.href = '/login', 1500);
      return;
    }
    const data = await res.json();
    if (res.ok) {
      wishlistedIds.add(productId);
      btn.innerHTML = '<i class="bi bi-heart-fill text-danger"></i>';
      showToast('Added to wishlist');
    } else {
      showToast(data.message, 'error');
    }
  } else {
    const res = await fetch(`/api/users/wishlist/${productId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      wishlistedIds.delete(productId);
      btn.innerHTML = '<i class="bi bi-heart"></i>';
      showToast('Removed from wishlist');
    } else {
      showToast(data.message, 'error');
    }
  }
}

function getStarsHTML(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<i class="bi bi-star-fill ${i <= Math.round(rating) ? 'star-filled' : 'star-empty'}"></i>`;
  }
  return html;
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('shopPagination');
  pagination.innerHTML = '';

  if (totalPages <= 1) return;

  const prev = document.createElement('li');
  prev.className = `page-item ${current === 1 ? 'disabled' : ''}`;
  prev.innerHTML = `<a class="page-link" href="#">‹</a>`;
  prev.addEventListener('click', (e) => { e.preventDefault(); if (current > 1) { currentPage--; loadProducts(); } });
  pagination.appendChild(prev);

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - 1 && i <= current + 1)) {
      const li = document.createElement('li');
      li.className = `page-item ${i === current ? 'active' : ''}`;
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', (e) => { e.preventDefault(); currentPage = i; loadProducts(); });
      pagination.appendChild(li);
    } else if (i === current - 2 || i === current + 2) {
      const li = document.createElement('li');
      li.className = 'page-item disabled';
      li.innerHTML = `<a class="page-link" href="#">...</a>`;
      pagination.appendChild(li);
    }
  }

  const next = document.createElement('li');
  next.className = `page-item ${current === totalPages ? 'disabled' : ''}`;
  next.innerHTML = `<a class="page-link" href="#">›</a>`;
  next.addEventListener('click', (e) => { e.preventDefault(); if (current < totalPages) { currentPage++; loadProducts(); } });
  pagination.appendChild(next);
}

function renderFilters(categories, brands) {
  const catContainer = document.getElementById('categoryFilters');
  const existingRadios = catContainer.querySelectorAll('label:not(:first-child)');
  existingRadios.forEach(el => el.remove());

  categories.forEach(cat => {
    const label = document.createElement('label');
    label.className = 'filter-option';
    label.innerHTML = `
      <input type="radio" name="category" value="${cat._id}" ${selectedCategory === cat._id ? 'checked' : ''}>
      <span>${cat.name}</span>`;
    catContainer.appendChild(label);

    label.querySelector('input').addEventListener('change', (e) => {
      selectedCategory = e.target.value;
    });
  });

  const brandContainer = document.getElementById('brandFilters');
  const existingBrandRadios = brandContainer.querySelectorAll('label:not(:first-child)');
  existingBrandRadios.forEach(el => el.remove());

  brands.forEach(brand => {
    const label = document.createElement('label');
    label.className = 'filter-option';
    label.innerHTML = `
      <input type="radio" name="brand" value="${brand._id}" ${selectedBrand === brand._id ? 'checked' : ''}>
      <span>${brand.name}</span>`;
    brandContainer.appendChild(label);

    label.querySelector('input').addEventListener('change', (e) => {
      selectedBrand = e.target.value;
    });
  });

  document.querySelectorAll('input[name="category"]')[0].addEventListener('change', () => {
    selectedCategory = '';
  });
  document.querySelectorAll('input[name="brand"]')[0].addEventListener('change', () => {
    selectedBrand = '';
  });
}

// Apply filters
document.getElementById('applyFiltersBtn').addEventListener('click', () => {
  currentPage = 1;
  loadProducts();
});

// Clear all filters
document.getElementById('clearAllFilters').addEventListener('click', (e) => {
  e.preventDefault();
  selectedCategory = '';
  selectedBrand = '';
  maxPrice = 500000;
  searchTerm = '';
  sortBy = 'newest';
  currentPage = 1;
  document.getElementById('productSearch').value = '';
  document.getElementById('sortSelect').value = 'newest';
  document.getElementById('maxPriceRange').value = 500000;
  document.getElementById('priceDisplay').textContent = '₹500,000';
  document.querySelectorAll('input[name="category"]')[0].checked = true;
  document.querySelectorAll('input[name="brand"]')[0].checked = true;
  loadProducts();
});

// Price range
document.getElementById('maxPriceRange').addEventListener('input', (e) => {
  maxPrice = e.target.value;
  document.getElementById('priceDisplay').textContent = '₹' + Number(maxPrice).toLocaleString();
});

// Search with debounce
document.getElementById('productSearch').addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchTerm = e.target.value.trim();
    currentPage = 1;
    loadProducts();
  }, 400);
});

// Sort
document.getElementById('sortSelect').addEventListener('change', (e) => {
  sortBy = e.target.value;
  currentPage = 1;
  loadProducts();
});

loadProducts();