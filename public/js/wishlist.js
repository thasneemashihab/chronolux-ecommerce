async function loadWishlist() {
  const res = await fetch('/api/users/wishlist');
  const data = await res.json();

  const grid = document.getElementById('wishlistGrid');
  const empty = document.getElementById('emptyWishlist');

  if (!data.products || data.products.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }

  empty.classList.add('d-none');
  grid.innerHTML = '';

  data.products.forEach(p => {
    const avgRating = p.reviews?.length > 0
      ? Math.round(p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length)
      : 0;

    const stars = Array.from({ length: 5 }, (_, i) =>
      `<i class="bi bi-star-fill ${i < avgRating ? 'star-filled' : 'star-empty'}"></i>`
    ).join('');

    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg-3';
    col.innerHTML = `
      <div class="wishlist-card">
        <div class="wishlist-img-wrapper">
          <img src="${p.images[0]}" alt="${p.name}"
               onclick="window.location.href='/product/${p._id}'">
          <button class="wishlist-heart-btn active remove-wishlist-btn" data-id="${p._id}">
            <i class="bi bi-heart-fill"></i>
          </button>
        </div>
        <div class="wishlist-card-body">
          <p class="wishlist-product-name">${p.name}</p>
          <p class="wishlist-product-price">₹${p.price.toLocaleString()}</p>
          <div class="mb-2">${stars}</div>
          <button class="btn btn-warning fw-bold w-100 mb-2 move-to-cart-btn" data-id="${p._id}">
            Move to Cart
          </button>
          <button class="btn btn-link text-danger p-0 remove-wishlist-btn" data-id="${p._id}">
            <i class="bi bi-trash me-1"></i> Remove
          </button>
        </div>
      </div>`;
    grid.appendChild(col);
  });

  // Attach listeners
  document.querySelectorAll('.move-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => moveToCart(btn.dataset.id));
  });
  document.querySelectorAll('.remove-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', () => removeFromWishlist(btn.dataset.id));
  });
}

async function moveToCart(productId) {
  const res = await fetch('/api/users/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity: 1 })
  });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) {
    updateCartCount();
     updateWishlistCount(); // ← add this
    loadWishlist();
  }
}

async function removeFromWishlist(productId) {
  const confirmed = await showConfirm('Remove this item from wishlist?');
  if (!confirmed) return;

  const res = await fetch(`/api/users/wishlist/${productId}`, { method: 'DELETE' });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) 
     updateWishlistCount(); // ← add this
    loadWishlist();
}

document.getElementById('moveAllToCartBtn').addEventListener('click', async () => {
  const confirmed = await showConfirm('Move all items to cart?');
  if (!confirmed) return;

  const res = await fetch('/api/users/wishlist/move-all-to-cart', { method: 'POST' });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) {
    updateCartCount();
    loadWishlist();
  }
});

document.getElementById('clearWishlistBtn').addEventListener('click', async () => {
  const confirmed = await showConfirm('Clear your entire wishlist?');
  if (!confirmed) return;

  const res = await fetch('/api/users/wishlist/clear', { method: 'DELETE' });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) 
     updateWishlistCount(); // ← add this
    loadWishlist();
});

loadWishlist();