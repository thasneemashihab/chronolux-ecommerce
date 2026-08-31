const pathParts = window.location.pathname.split('/').filter(p => p !== '');
const productId = pathParts[pathParts.length - 1];

let quantity = 1;
let maxStock = 0;
let selectedRating = 0;
let availabilityCheckInterval;

async function loadProductDetails() {
  try {
    const res = await fetch(`/api/users/products/${productId}`);
    if (!res.ok) { showUnavailableMessage(); return; }
    const data = await res.json();
    if (!data || !data.product) { showUnavailableMessage(); return; }
    renderProduct(data.product);
    renderRelated(data.relatedProducts || []);
    startAvailabilityCheck();
    if (document.getElementById('wishlistBtn')) checkWishlistStatus();
  } catch (err) {
    console.error('loadProductDetails error:', err);
    showUnavailableMessage();
  }
}

function showUnavailableMessage() {
  const productSection = document.getElementById('productSection');
  if (productSection) productSection.classList.add('d-none');
  const strip = document.getElementById('thumbnailStrip');
  if (strip) strip.classList.add('d-none');
  const container = document.querySelector('.container');
  if (!container) return;
  if (container.querySelector('.unavailable-product-msg')) return;
  const msg = document.createElement('div');
  msg.className = 'unavailable-product-msg text-center py-5';
  msg.innerHTML = `
    <div class="unavailable-icon"><i class="bi bi-exclamation-circle"></i></div>
    <h3 class="fw-bold mt-4 mb-2">Product Unavailable</h3>
    <p class="text-secondary mb-1">This product is currently unavailable or has been removed.</p>
    <p class="text-secondary mb-4">It may have been blocked, deleted, or gone out of stock.</p>
    <div class="d-flex gap-3 justify-content-center flex-wrap">
      <a href="/shop" class="btn btn-warning fw-bold px-4"><i class="bi bi-bag me-2"></i>Browse Shop</a>
      <button onclick="history.back()" class="btn btn-secondary px-4"><i class="bi bi-arrow-left me-2"></i>Go Back</button>
    </div>`;
  const breadcrumb = container.querySelector('nav');
  if (breadcrumb) breadcrumb.insertAdjacentElement('afterend', msg);
  else container.prepend(msg);
  const breadcrumbName = document.getElementById('breadcrumbProductName');
  if (breadcrumbName) breadcrumbName.textContent = 'Product Unavailable';
  document.title = 'Product Unavailable - ChronoLux';
}

function startAvailabilityCheck() {
  availabilityCheckInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/users/products/${productId}`);
      if (!res.ok) {
        clearInterval(availabilityCheckInterval);
        showToast('This product is no longer available', 'error');
        setTimeout(() => showUnavailableMessage(), 1500);
      }
    } catch (err) { /* ignore */ }
  }, 30000);
}

function loadImagesToStrip(images) {
  const mainImg = document.getElementById('mainImage');
  const strip = document.getElementById('thumbnailStrip');
  if (!strip || !mainImg || !images || images.length === 0) return;
  strip.innerHTML = '';
  strip.classList.remove('d-none');
  images.forEach((img, idx) => {
    if (!img) return;
    const thumb = document.createElement('img');
    thumb.src = img;
    thumb.className = `thumbnail-img ${idx === 0 ? 'active' : ''}`;
    thumb.addEventListener('click', () => {
      mainImg.src = img;
      document.querySelectorAll('.thumbnail-img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
    strip.appendChild(thumb);
  });
}

function renderProduct(p) {
  try {
    document.title = `${p.name || 'Product'} - ChronoLux`;

    const breadcrumbName = document.getElementById('breadcrumbProductName');
    if (breadcrumbName) breadcrumbName.textContent = p.name || '';

    const nameEl = document.getElementById('productName');
    if (nameEl) nameEl.textContent = p.name || '';

    const brandEl = document.getElementById('brandDisplay');
    if (brandEl) brandEl.textContent = `Brand: ${p.brand?.name || ''}`;

    const descEl = document.getElementById('productDescription');
    if (descEl) descEl.textContent = p.description || '';

    const specEl = document.getElementById('productSpecifications');
    if (specEl) specEl.textContent = p.specifications || 'No specifications available.';

    // Price
    const priceEl = document.getElementById('productPrice');
    if (priceEl) priceEl.textContent = `₹${(p.price || 0).toLocaleString()}`;

    if (p.discount > 0 && p.originalPrice > p.price) {
      const origEl = document.getElementById('originalPrice');
      const discEl = document.getElementById('discountPercent');
      const badgeEl = document.getElementById('discountBadge');
      if (origEl) { origEl.textContent = `₹${p.originalPrice.toLocaleString()}`; origEl.classList.remove('d-none'); }
      if (discEl) { discEl.textContent = `${p.discount}% off`; discEl.classList.remove('d-none'); }
      if (badgeEl) { badgeEl.textContent = `${p.discount}% off`; badgeEl.classList.remove('d-none'); }
    }

    // Images
    const mainImg = document.getElementById('mainImage');
    const strip = document.getElementById('thumbnailStrip');

    // Step 1: Load base images
    if (mainImg && p.images && p.images.length > 0 && p.images[0]) {
      mainImg.src = p.images[0];
      loadImagesToStrip(p.images);
    }

    // Step 2: Override with first valid color images
    const firstValidColor = p.colorImages?.find(c => c.images && c.images.length > 0 && c.images[0]);
    if (firstValidColor && mainImg) {
      mainImg.src = firstValidColor.images[0];
      loadImagesToStrip(firstValidColor.images);
    }

    // Rating
    const reviews = p.reviews || [];
    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

    const starsEl = document.getElementById('starsDisplay');
    if (starsEl) starsEl.innerHTML = getStarsHTML(avgRating);

    const reviewCountEl = document.getElementById('reviewCount');
    if (reviewCountEl) reviewCountEl.textContent = `${reviews.length} reviews`;

    // Set initial maxStock
    if (p.colorVariants && p.colorVariants.length > 0) {
      maxStock = p.colorVariants[0].stock || 0;
    } else {
      maxStock = p.stock || 0;
    }

    // Colors
    const colorsSection = document.getElementById('colorsSection');
    const colorContainer = document.getElementById('colorOptions');
    if (colorsSection && colorContainer && p.colors && p.colors.length > 0) {
      colorsSection.classList.remove('d-none');
      colorContainer.innerHTML = '';

      p.colors.forEach((color, colorIndex) => {
        const swatch = document.createElement('div');
        swatch.className = `color-swatch ${colorIndex === 0 ? 'active' : ''}`;
        swatch.style.background = color;
        swatch.title = color;

        // Get stock for this color
        const colorVariant = p.colorVariants?.find(cv => cv.color === color);
        const colorStock = colorVariant ? colorVariant.stock : p.stock;

        swatch.addEventListener('click', () => {
          document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');

          // Update maxStock for this color
          maxStock = colorStock || 0;
          quantity = 1;
          const qtyDisplay = document.getElementById('qtyDisplay');
          if (qtyDisplay) qtyDisplay.textContent = 1;

          // Update stock display
          const stockEl = document.getElementById('stockStatus');
          const lowStockEl = document.getElementById('lowStockWarning');
          const cartBtn = document.getElementById('addToCartBtn');

          if (stockEl) {
            if (colorStock <= 0) {
              stockEl.innerHTML = '<span class="text-danger fw-bold">Out of Stock</span>';
              if (cartBtn) cartBtn.disabled = true;
            } else {
              stockEl.innerHTML = '<span class="text-success fw-bold">In Stock</span>';
              if (cartBtn) cartBtn.disabled = false;
              if (colorStock <= 5 && lowStockEl) {
                lowStockEl.textContent = `Only ${colorStock} left in ${color}`;
                lowStockEl.classList.remove('d-none');
              } else if (lowStockEl) {
                lowStockEl.classList.add('d-none');
              }
            }
          }

          // Switch images
          const colorData = p.colorImages?.find(c => c.color === color);
          if (colorData && colorData.images?.length > 0 && colorData.images[0] && mainImg) {
            mainImg.src = colorData.images[0];
            loadImagesToStrip(colorData.images);
          } else if (p.images[colorIndex] && mainImg) {
            mainImg.src = p.images[colorIndex];
          }
        });

        colorContainer.appendChild(swatch);
      });
    }

    // Variants
    const variantsSection = document.getElementById('variantsSection');
    const variantContainer = document.getElementById('variantOptions');
    if (variantsSection && variantContainer && p.variants && p.variants.length > 0) {
      variantsSection.classList.remove('d-none');
      variantContainer.innerHTML = '';

      p.variants.forEach((variant, variantIndex) => {
        const btn = document.createElement('button');
        btn.className = `variant-btn ${variantIndex === 0 ? 'active' : ''}`;
        btn.textContent = variant;

        btn.addEventListener('click', () => {
          document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const variantData = p.variantImages?.find(v => v.variant === variant);
          if (variantData && variantData.image && mainImg) {
            mainImg.src = variantData.image;
            if (strip) strip.classList.add('d-none');
          }
        });

        variantContainer.appendChild(btn);
      });
    }

    // Stock status (initial)
    const stockEl = document.getElementById('stockStatus');
    const lowStock = document.getElementById('lowStockWarning');

    if (stockEl) {
      if (maxStock <= 0) {
        stockEl.innerHTML = '<span class="text-danger fw-bold">Out of Stock</span>';
        const cartBtn = document.getElementById('addToCartBtn');
        const nowBtn = document.getElementById('buyNowBtn');
        if (cartBtn) cartBtn.disabled = true;
        if (nowBtn) nowBtn.disabled = true;
      } else {
        stockEl.innerHTML = '<span class="text-success fw-bold">In Stock</span>';
        if (maxStock <= 5 && lowStock) {
          lowStock.textContent = `Only ${maxStock} left in stock`;
          lowStock.classList.remove('d-none');
        }
      }
    }

    renderReviews(reviews);

  } catch (err) {
    console.error('renderProduct error:', err);
  }
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
  if (!list) return;
  if (!reviews || reviews.length === 0) {
    list.innerHTML = '<p class="text-secondary">No reviews yet. Be the first to review!</p>';
    return;
  }
  list.innerHTML = reviews.map(r => `
    <div class="border-bottom border-secondary py-3">
      <strong>${r.name || 'Anonymous'}</strong>
      <span class="ms-2">${getStarsHTML(r.rating || 0)}</span>
      <p class="text-secondary small mt-1 mb-0">${r.comment || ''}</p>
    </div>`).join('');
}

function renderRelated(products) {
  const container = document.getElementById('relatedProducts');
  if (!container) return;
  if (!products || products.length === 0) {
    container.innerHTML = '<p class="text-secondary col-12">No related products found.</p>';
    return;
  }
  container.innerHTML = products.map(p => `
    <div class="col-6 col-md-3">
      <div class="product-card" onclick="window.location.href='/product/${p._id}'">
        <div class="position-relative">
          <img src="${p.images?.[0] || ''}" class="product-card-img" alt="${p.name || ''}">
          <span class="product-card-brand">${p.brand?.name || ''}</span>
        </div>
        <div class="product-card-body">
          <p class="product-card-name">${p.name || ''}</p>
          <p class="product-card-price">₹${(p.price || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>`).join('');
}

// Quantity controls
const qtyMinus = document.getElementById('qtyMinus');
const qtyPlus = document.getElementById('qtyPlus');
const qtyDisplay = document.getElementById('qtyDisplay');

if (qtyMinus) {
  qtyMinus.addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      if (qtyDisplay) qtyDisplay.textContent = quantity;
    }
  });
}

if (qtyPlus) {
  qtyPlus.addEventListener('click', () => {
    if (quantity < maxStock && quantity < 5) {
      quantity++;
      if (qtyDisplay) qtyDisplay.textContent = quantity;
    } else if (quantity >= 5) {
      showToast('Maximum 5 items per order', 'error');
    } else {
      showToast('Not enough stock available', 'error');
    }
  });
}

// Add to cart
const addToCartBtn = document.getElementById('addToCartBtn');
if (addToCartBtn) {
  addToCartBtn.addEventListener('click', async () => {
    const activeColorSwatch = document.querySelector('.color-swatch.active');
    const selectedColor = activeColorSwatch?.title || '';

    const res = await fetch('/api/users/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity, selectedColor })
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401) {
        showToast('Please login to add items to cart', 'error');
        setTimeout(() => window.location.href = '/login', 1500);
      } else {
        showToast(data.message, 'error');
      }
      return;
    }
    showToast('Added to cart successfully!');
    updateCartCountBadge();
    updateCartCount();
  });
}

// Buy now
const buyNowBtn = document.getElementById('buyNowBtn');
if (buyNowBtn) {
  buyNowBtn.addEventListener('click', () => {
    window.location.href = '/checkout/address';
  });
}

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
const submitReviewBtn = document.getElementById('submitReviewBtn');
if (submitReviewBtn) {
  submitReviewBtn.addEventListener('click', async () => {
    const comment = document.getElementById('reviewComment')?.value.trim();
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

// Wishlist
async function checkWishlistStatus() {
  try {
    const res = await fetch('/api/users/wishlist');
    if (!res.ok) return;
    const data = await res.json();
    const isWishlisted = data.products?.some(p => p._id === productId);
    const btn = document.getElementById('wishlistBtn');
    if (btn && isWishlisted) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="bi bi-heart-fill"></i>';
    }
  } catch (err) { /* not logged in */ }
}

const wishlistBtn = document.getElementById('wishlistBtn');
if (wishlistBtn) {
  wishlistBtn.addEventListener('click', async () => {
    const isActive = wishlistBtn.classList.contains('active');
    const method = isActive ? 'DELETE' : 'POST';
    const res = await fetch(`/api/users/wishlist/${productId}`, { method });
    const data = await res.json();
    showToast(data.message, res.ok ? 'success' : 'error');
    if (res.ok) {
      wishlistBtn.classList.toggle('active', !isActive);
      wishlistBtn.innerHTML = isActive
        ? '<i class="bi bi-heart"></i>'
        : '<i class="bi bi-heart-fill"></i>';
      updateWishlistCount();
    }
  });
}

window.addEventListener('beforeunload', () => {
  if (availabilityCheckInterval) clearInterval(availabilityCheckInterval);
});

loadProductDetails();
updateCartCount();