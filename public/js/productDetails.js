const pathParts = window.location.pathname.split('/').filter(p => p !== '');
const productId = pathParts[pathParts.length - 1];

let quantity = 1;
let maxStock = 0;
let selectedRating = 0;

async function loadProductDetails() {
  try {
    const res = await fetch(`/api/users/products/${productId}`);

    if (!res.ok) {
      // Non-existent or unavailable product → show 404 page
      window.location.href = '/not-found';
      return;
    }

    const data = await res.json();

    if (!data || !data.product) {
      window.location.href = '/not-found';
      return;
    }

    renderProduct(data.product);
    renderRelated(data.relatedProducts || []);

    // Only check wishlist if user is logged in (button exists on page)
    if (document.getElementById('wishlistBtn')) {
      checkWishlistStatus();
    }

  } catch (err) {
    console.error('loadProductDetails error:', err);
    window.location.href = '/not-found';
  }
}

function renderProduct(p) {
  try {
    // Breadcrumb
    const breadcrumb = document.getElementById('breadcrumbProductName');
    if (breadcrumb) breadcrumb.textContent = p.name || '';

    // Title
    document.title = `${p.name || 'Product'} - ChronoLux`;
    const nameEl = document.getElementById('productName');
    if (nameEl) nameEl.textContent = p.name || '';

    // Brand
    const brandEl = document.getElementById('brandDisplay');
    if (brandEl) brandEl.textContent = `Brand: ${p.brand?.name || ''}`;

    // Description
    const descEl = document.getElementById('productDescription');
    if (descEl) descEl.textContent = p.description || '';

    // Specifications
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
    maxStock = p.stock || 0;
    const mainImg = document.getElementById('mainImage');
    const strip = document.getElementById('thumbnailStrip');

    if (mainImg && strip && p.images && p.images.length > 0) {
      mainImg.src = p.images[0];
      strip.innerHTML = '';

      p.images.forEach((img, i) => {
        const thumb = document.createElement('img');
        thumb.src = img;
        thumb.className = `thumbnail-img ${i === 0 ? 'active' : ''}`;
        thumb.addEventListener('click', () => {
          mainImg.src = img;
          document.querySelectorAll('.thumbnail-img').forEach((t, idx) => {
            t.classList.toggle('active', idx === i);
          });
        });
        strip.appendChild(thumb);
      });
    }

    // Rating
    const reviews = p.reviews || [];
    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

    const starsEl = document.getElementById('starsDisplay');
    if (starsEl) starsEl.innerHTML = getStarsHTML(avgRating);

    const reviewCountEl = document.getElementById('reviewCount');
    if (reviewCountEl) reviewCountEl.textContent = `${reviews.length} reviews`;

     // Colors — clicking changes the main image
const colorsSection = document.getElementById('colorsSection');
const colorContainer = document.getElementById('colorOptions');

// Colors — clicking shows that color's 3 images in thumbnail strip
if (colorsSection && colorContainer && p.colors && p.colors.length > 0) {
  colorsSection.classList.remove('d-none');
  colorContainer.innerHTML = '';
  
  //when color is clicked- show strip again
  p.colors.forEach((color, i) => {
    const swatch = document.createElement('div');
    swatch.className = `color-swatch ${i === 0 ? 'active' : ''}`;
    swatch.style.background = color;
    swatch.title = color;

    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
    

    // Show thumbnail strip again when color is selected
    if (strip) strip.classList.remove('d-none'); 

      //Load color images into strip and Find this color's 3 images
      const colorData = p.colorImages?.find(c => c.color === color);

      if (colorData && colorData.images && colorData.images.length > 0) {
        // Show first image as main
        if (mainImg) mainImg.src = colorData.images[0];

        // Replace thumbnail strip with this color's images
          strip.innerHTML = '';
          strip.classList.remove('d-none');
          colorData.images.forEach((img, idx) => {
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
      });

    colorContainer.appendChild(swatch);
  });

  // Auto-load first color's images on page load
  const firstColorData = p.colorImages?.[0];
  if (firstColorData && firstColorData.images && firstColorData.images.length > 0) {
    if (mainImg) mainImg.src = firstColorData.images[0];
    if (strip) {
      strip.innerHTML = '';
      firstColorData.images.forEach((img, idx) => {
        const thumb = document.createElement('img');
        thumb.src = img;
        thumb.className = `thumbnail-img ${idx === 0 ? 'active' : ''}`;
        thumb.addEventListener('click', () => {
          if (mainImg) mainImg.src = img;
          document.querySelectorAll('.thumbnail-img').forEach(t => t.classList.remove('active'));
          thumb.classList.add('active');
        });
        strip.appendChild(thumb);
      });
    }
  }
}

// Variants — clicking changes the main image
const variantsSection = document.getElementById('variantsSection');
const variantContainer = document.getElementById('variantOptions');


// Variants — clicking shows ONLY that variant's image as main
// Thumbnail strip stays as current color's images
if (variantsSection && variantContainer && p.variants && p.variants.length > 0) {
  variantsSection.classList.remove('d-none');
  variantContainer.innerHTML = '';

  p.variants.forEach((variant, i) => {
    const btn = document.createElement('button');
    btn.className = `variant-btn ${i === 0 ? 'active' : ''}`;
    btn.textContent = variant;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Find this variant's single image
      const variantData = p.variantImages?.find(v => v.variant === variant);
      if (variantData && variantData.image) {
        // Change main image only — thumbnails stay as current color
        if (mainImg) mainImg.src = variantData.image;
        
        // Hide thumbnail strip — style has only 1 image, no thumbnails needed
      if (strip) strip.classList.add('d-none');

        // Deselect all thumbnails since we're showing a variant image
        //document.querySelectorAll('.thumbnail-img').forEach(t => t.classList.remove('active'));
      }
    });

    variantContainer.appendChild(btn);
  });
}


    // Stock status
    const stockEl = document.getElementById('stockStatus');
    const lowStock = document.getElementById('lowStockWarning');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');

    if (stockEl) {
      if (p.stock <= 0) {
        stockEl.innerHTML = '<span class="text-danger fw-bold">Out of Stock</span>';
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
      } else {
        stockEl.innerHTML = '<span class="text-success fw-bold">In Stock</span>';
        if (p.stock <= 5 && lowStock) {
          lowStock.textContent = `Only ${p.stock} left in stock`;
          lowStock.classList.remove('d-none');
        }
      }
    }

    // Reviews
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
      <span class="ms-2">${getStarsHTML(r.rating)}</span>
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
    const res = await fetch('/api/users/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, quantity })
    });
    const data = await res.json();
    showToast(data.message, res.ok ? 'success' : 'error');
    if (res.ok) updateCartCount();
  });
}

// Buy now
const buyNowBtn = document.getElementById('buyNowBtn');
if (buyNowBtn) {
  buyNowBtn.addEventListener('click', () => {
    showToast('Checkout coming soon!');
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
  } catch (err) {
    // Not logged in — ignore silently
  }
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
    }
  });
}

// Start
loadProductDetails();
updateCartCount();