async function loadCart() {
  const res = await fetch('/api/users/cart');
  const data = await res.json();

  if (!res.ok) {
    showToast('Failed to load cart', 'error');
    return;
  }

  if (data.items.length === 0) {
    document.getElementById('cartContent').classList.add('d-none');
    document.getElementById('emptyCart').classList.remove('d-none');
    return;
  }

  document.getElementById('cartContent').classList.remove('d-none');
  document.getElementById('emptyCart').classList.add('d-none');

  renderCartItems(data.items);
  renderSummary(data);
}

function renderCartItems(items) {
  const container = document.getElementById('cartItems');
  container.innerHTML = '';

  items.forEach(item => {
    const p = item.product;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <img src="${p.images[0]}" class="cart-item-img" alt="${p.name}">
      <div class="flex-grow-1">
        <p class="cart-item-name">${p.name}</p>
        <p class="cart-item-price">₹${item.price.toLocaleString()}</p>
      </div>
      <div class="cart-item-actions">
        <div class="qty-control">
          <button class="qty-minus" data-id="${p._id}" data-qty="${item.quantity}">-</button>
          <span>${item.quantity}</span>
          <button class="qty-plus" data-id="${p._id}" data-qty="${item.quantity}" data-stock="${p.stock}">+</button>
        </div>
        <button class="remove-btn" data-id="${p._id}">
          <i class="bi bi-trash-fill"></i>
        </button>
      </div>
    `;
    container.appendChild(div);
  });

  // Attach listeners after rendering
  document.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', () => handleQuantityChange(btn.dataset.id, parseInt(btn.dataset.qty) - 1));
  });

  document.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const newQty = parseInt(btn.dataset.qty) + 1;
      const stock = parseInt(btn.dataset.stock);
      if (newQty > stock) {
        showToast(`Only ${stock} items available`, 'error');
        return;
      }
      if (newQty > 5) {
        showToast('Maximum 5 items per product', 'error');
        return;
      }
      handleQuantityChange(btn.dataset.id, newQty);
    });
  });

  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
  });
}

function renderSummary(data) {
  const itemWord = data.itemCount === 1 ? 'item' : 'items';
  document.getElementById('subtotalLabel').textContent = `Subtotal (${data.itemCount} ${itemWord})`;
  document.getElementById('subtotalAmount').textContent = `₹${data.subtotal.toLocaleString()}`;
  document.getElementById('discountAmount').textContent = `-₹${data.discount.toLocaleString()}`;
  document.getElementById('totalAmount').textContent = `₹${data.total.toLocaleString()}`;

  if (data.discount > 0) {
    document.getElementById('savedAmount').textContent = `You saved ₹${data.discount.toLocaleString()} on this order`;
  }

  // Disable checkout if cart is empty (requirement vii)
  document.getElementById('proceedToCheckoutBtn').disabled = data.itemCount === 0;
  document.getElementById('buyNowBtn').disabled = data.itemCount === 0;
}

async function handleQuantityChange(productId, newQuantity) {
  // If quantity goes to 0, remove the item
  if (newQuantity < 1) {
    removeFromCart(productId);
    return;
  }

  const res = await fetch(`/api/users/cart/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: newQuantity })
  });
  const data = await res.json();

  if (!res.ok) {
    showToast(data.message, 'error');
    return;
  }

  loadCart(); // reload to reflect updated totals
}

async function removeFromCart(productId) {
  const confirmed = await showConfirm('Remove this item from cart?');
  if (!confirmed) return;

  const res = await fetch(`/api/users/cart/${productId}`, { method: 'DELETE' });
  const data = await res.json();

  if (res.ok) {
    showToast(data.message);
    loadCart();
  } else {
    showToast(data.message, 'error');
  }
}

// Checkout buttons
document.getElementById('proceedToCheckoutBtn').addEventListener('click', () => {
  window.location.href = '/checkout/address';
});

document.getElementById('buyNowBtn').addEventListener('click', () => {
  window.location.href = '/shop';
});

loadCart();