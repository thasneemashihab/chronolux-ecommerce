const orderId = sessionStorage.getItem('lastOrderId');
const orderDbId = sessionStorage.getItem('lastOrderDbId');

// If no order ID — someone visited this page directly
if (!orderId) {
  window.location.href = '/shop';
}

// Show order ID
const orderIdEl = document.getElementById('successOrderId');
if (orderIdEl) orderIdEl.textContent = orderId || '—';

// Load and display order details
async function loadOrderDetails() {
  if (!orderDbId) return;

  try {
    const res = await fetch(`/api/users/orders/${orderDbId}`);
    if (!res.ok) return;
    const data = await res.json();
    const order = data.order;

    const grid = document.getElementById('successInfoGrid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="success-info-item">
        <p class="success-info-label">Total Amount</p>
        <p class="success-info-value text-warning">₹${order.totalAmount?.toLocaleString() || 0}</p>
      </div>
      <div class="success-info-item">
        <p class="success-info-label">Payment Method</p>
        <p class="success-info-value">Cash on Delivery</p>
      </div>
      <div class="success-info-item">
        <p class="success-info-label">Order Status</p>
        <p class="success-info-value text-success">${order.status || 'Pending'}</p>
      </div>
      <div class="success-info-item">
        <p class="success-info-label">Items Ordered</p>
        <p class="success-info-value">${order.items?.length || 0} item(s)</p>
      </div>`;

    // Clean session storage after displaying
    sessionStorage.removeItem('lastOrderId');
    sessionStorage.removeItem('lastOrderDbId');

  } catch (err) {
    console.error('Error loading order:', err);
  }
}

loadOrderDetails();