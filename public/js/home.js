async function loadFeaturedWatches() {
  const res = await fetch('/api/users/products?limit=4&sort=newest');
  if (!res.ok) return;
  const data = await res.json();

  const grid = document.getElementById('featuredWatchesGrid');
  grid.innerHTML = '';

  data.products.forEach(p => {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-3';
    col.innerHTML = `
      <div class="watch-card position-relative">
        <div style="cursor:pointer;" onclick="window.location.href='/product/${p._id}'">
          <img src="${p.images[0]}" alt="${p.name}">
        </div>
        <div class="watch-card-body">
          <h6>${p.name}</h6>
          <p class="price">
            ${p.offerDiscountAmount > 0
              ? `<span class="text-decoration-line-through text-secondary" style="font-size:12px;">₹${p.price.toLocaleString()}</span>
                 <span class="text-warning ms-1">₹${p.finalPrice.toLocaleString()}</span>`
              : `₹${p.price.toLocaleString()}`
            }
          </p>
          <div class="d-flex justify-content-center gap-2 mt-2">
            <button class="btn btn-sm btn-outline-light home-wishlist-btn" data-id="${p._id}" title="Add to Wishlist">
              <i class="bi bi-heart"></i>
            </button>
            <button class="btn btn-sm btn-warning home-addcart-btn" data-id="${p._id}" title="Add to Cart">
              <i class="bi bi-cart-plus"></i>
            </button>
          </div>
        </div>
      </div>`;
    grid.appendChild(col);
  });

  attachFeaturedListeners();
}

function attachFeaturedListeners() {
  document.querySelectorAll('.home-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await fetch('/api/users/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: btn.dataset.id })
      });
      const data = await res.json();
      showToast(data.message, res.ok ? 'success' : 'error');
    });
  });

  document.querySelectorAll('.home-addcart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await fetch('/api/users/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: btn.dataset.id, quantity: 1 })
      });
      const data = await res.json();
      showToast(data.message, res.ok ? 'success' : 'error');
    });
  });
}

loadFeaturedWatches();