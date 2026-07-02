const productId = window.location.pathname.split('/').pop();
let selectedRating = 0;
let quantity = 1;
let maxStock = 0;

async function loadProductDetails() {
  const res = await fetch(`/api/users/products/${productId}`);

  // If product not found or unavailable, redirect to shop
  if (!res.ok) {
    showToast('Product not available', 'error');
    setTimeout(() => window.location.href = '/shop', 1500);
    return;
  }

  const data = await res.json();
  renderProduct(data.product);
  renderRelated(data.relatedProducts);
}

function renderProduct(p) {
  document.title = `${p.name} - ChronoLux`;
  document.getElementById('breadcrumbProductName').textContent = p.name;
  document.getElementById('productName').textContent = p.name;
  document.getElementById('brandDisplay').textContent = `Brand: ${p.brand?.name || ''}`;
  document.getElementById('productDescription').textContent = p.description;
  document.getElementById('productSpecifications').textContent = p.specifications || 'No specifications available.';

  // Price
  document.getElementById('productPrice').textContent = `₹${p.price.toLocaleString()}`;
  if (p.discount > 0) {
    document.getElementById('originalPrice').textContent = `₹${p.originalPrice.toLocaleString()}`;
    document.getElementById('originalPrice').classList.remove('d-none');
    document.getElementById('discountPercent').textContent = `${p.discount}% off`;
    document.getElementById('discountPercent').classList.remove('d-none');
    document.getElementById('discountBadge').textContent = `${p.discount}% off`;
    document.getElementById('discountBadge').classList.remove('d-none');
  }

  // Images
  maxStock = p.stock;
  const mainImg = document.getElementById('mainImage');
  if (p.images.length > 0) mainImg.src = p.images[0];

  const strip = document.getElementById('thumbnailStrip');
  p.images.forEach((img, i) => {
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.className = `thumbnail-img ${i === 0 ? 'active' : ''}`;
    thumb.addEventListener('click', () => {
      mainImg.src = img;
      document.querySelectorAll('.thumbnail-img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
    strip.appendChild(thumb);
  });

  // Rating
  const avgRating = p.reviews?.length > 0
    ? (p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length).toFixed(1) : 0;
  document.getElementById('starsDisplay').innerHTML = getStarsHTML(avgRating);
  document.getElementById('reviewCount').textContent = `${p.reviews?.length || 0} reviews`;

  // Colors
  if (p.colors && p.colors.length > 0) {
    document.getElementById('colorsSection').classList.remove('d-none');
    const colorContainer = document.getElementById('colorOptions');
    p.colors.forEach((color, i) => {
      const swatch = document.createElement('div');
      swatch.className = `color-swatch ${i === 0 ? 'active' : ''}`;
      swatch.style.background = color;
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
      colorContainer.appendChild(swatch);
    });
  }

  // Variants
  if (p.variants && p.variants.length > 0) {
    document.getElementById('variantsSection').classList.remove('d-none');
    const variantContainer = document.getElementById('variantOptions');
    p.variants.forEach((variant, i) => {
      const btn = document.createElement('button');
      btn.className = `variant-btn ${i === 0 ? 'active' : ''}`;
      btn.textContent = variant;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      variantContainer.appendChild(btn);
    });
  }

  // Stock status
  const stockEl = document.getElementById('stockStatus');
  const lowStock = document.getElementById('lowStockWarning');
  if (p.stock <= 0) {
    stockEl.innerHTML = '<span class="text-danger fw-bold">Out of Stock</span>';
    document.getElementById('addToCartBtn').disabled = true;
    document.getElementById('buyNowBtn').disabled = true;
  } else {
    stockEl.innerHTML = '<span class="text-success fw-bold">In Stock</span>';
    if (p.stock <= 5) {
      lowStock.textContent = `Only ${p.stock} left in stock`;
      lowStock.classList.remove('d-none');
    }
  }

  // Reviews
  renderReviews(p.reviews);
}

function getStarsHTML(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<i class="bi bi-star-fill ${i <= Math.round(rating) ? 'star-filled' : 'star-empty'} me-1"></i>`;
  }
  return html;
}

function renderReviews(reviews) {
  const list = document.getElementById('reviewsList');
  if (!reviews || reviews.length === 0) {
    list.innerHTML = '<p class="text-secondary">No reviews yet.</p>';
    return;
  }
  list.innerHTML = reviews.map(r => `
    <div class="border-bottom border-secondary py-3">
      <strong>${r.name}</strong>
      <span class="ms-2">${getStarsHTML(r.rating)}</span>
      <p class="text-secondary small mt-1">${r.comment}</p>
    </div>`).join('');
}

function renderRelated(products) {
  const container = document.getElementById('relatedProducts');
  if (!products || products.length === 0) {
    container.innerHTML = '<p class="text-secondary">No related products found.</p>';
    return;
  }
  container.innerHTML = products.map(p => `
    <div class="col-6 col-md-3">
      <div class="product-card" onclick="window.location.href='/product/${p._id}'">
        <div class="position-relative">
          <img src="${p.images[0]}" class="product-card-img" alt="${p.name}">
          <span class="product-card-brand">${p.brand?.name || ''}</span>
        </div>
        <div class="product-card-body">
          <p class="product-card-name">${p.name}</p>
          <p class="product-card-price">₹${p.price.toLocaleString()}</p>
          ${p.originalPrice > p.price
            ? `<small class="text-secondary text-decoration-line-through">₹${p.originalPrice.toLocaleString()}</small>`
            : ''}
          <div>${getStarsHTML(p.avgRating || 0)}</div>
        </div>
      </div>
    </div>`).join('');
}

// Quantity controls
document.getElementById('qtyMinus').addEventListener('click', () => {
  if (quantity > 1) {
    quantity--;
    document.getElementById('qtyDisplay').textContent = quantity;
  }
});

document.getElementById('qtyPlus').addEventListener('click', () => {
  if (quantity < maxStock && quantity < 5) {
    quantity++;
    document.getElementById('qtyDisplay').textContent = quantity;
  } else if (quantity >= 5) {
    showToast('Maximum 5 items per order', 'error');
  } else {
    showToast('Not enough stock', 'error');
  }
});

// Review stars
document.querySelectorAll('.review-star').forEach(star => {
  star.addEventListener('click', () => {
    selectedRating = parseInt(star.dataset.val);
    document.querySelectorAll('.review-star').forEach((s, i) => {
      s.classList.toggle('active', i < selectedRating);
    });
  });
});

// Submit review
const submitBtn = document.getElementById('submitReviewBtn');
if (submitBtn) {
  submitBtn.addEventListener('click', async () => {
    const comment = document.getElementById('reviewComment').value.trim();
    if (!selectedRating) { showToast('Please select a rating', 'error'); return; }
    if (!comment) { showToast('Please write a comment', 'error'); return; }

    const res = await fetch(`/api/users/products/${productId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: selectedRating, comment })
    });
    const data = await res.json();
    showToast(data.message, res.ok ? 'success' : 'error');
    if (res.ok) loadProductDetails();
  });
}

// Add to cart (placeholder — will wire up when cart is built)
document.getElementById('addToCartBtn').addEventListener('click', () => {
  showToast('Cart feature coming soon!');
});

loadProductDetails();