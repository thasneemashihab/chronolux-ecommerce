const orderId = window.location.pathname.split('/').pop();

async function loadOrderDetail() {
  const res = await fetch(`/api/users/orders/${orderId}`);
  if (!res.ok) {
    showToast('Order not found', 'error');
    setTimeout(() => window.location.href = '/orders', 1500);
    return;
  }
  const data = await res.json();
  renderOrderDetail(data.order);
}

const STATUS_STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'];
const STEP_LABELS = ['Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];

function renderOrderDetail(order) {
  document.getElementById('detailOrderId').textContent = `Order ${order.orderId}`;
  document.getElementById('detailOrderDate').textContent =
    `Placed on ${new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })}`;

  const statusEl = document.getElementById('detailStatus');
  statusEl.textContent = order.status;
  statusEl.className = `order-status-badge status-badge status-${order.status}`;

  // Timeline
  renderTimeline(order.status);

  // Items
  const itemsContainer = document.getElementById('detailItems');
  document.getElementById('itemsCount').textContent = `Order Items (${order.items.length})`;
  itemsContainer.innerHTML = '';

  order.items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'detail-item';
    div.innerHTML = `
      <img src="${item.image || '/images/default-product.jpg'}"
           class="detail-item-img" alt="${item.name}">
      <div class="flex-grow-1">
        <p class="detail-item-name">${item.name}</p>
        <p class="detail-item-sub">₹${item.price?.toLocaleString()} × ${item.quantity}</p>
        ${item.status !== 'Active' ? `<span class="status-badge status-Cancelled" style="font-size:11px;">${item.status}</span>` : ''}
      </div>
      <div class="text-end">
        <p class="fw-bold text-warning mb-0">₹${item.itemTotal?.toLocaleString()}</p>
        ${['Pending','Processing'].includes(order.status) && item.status === 'Active'
          ? `<button class="btn btn-link text-danger p-0 small cancel-item-btn"
               data-item-id="${item._id}">Cancel item</button>`
          : ''}
      </div>`;
    itemsContainer.appendChild(div);
  });

  // Cancel item buttons
  document.querySelectorAll('.cancel-item-btn').forEach(btn => {
    btn.addEventListener('click', () => openReasonModal('cancelItem', btn.dataset.itemId));
  });

  // Shipping address
  const addr = order.shippingAddress;
  document.getElementById('detailAddress').innerHTML = `
    <p class="mb-1 text-white fw-bold">${addr?.fullName}</p>
    <p class="mb-1">${addr?.fullAddress}</p>
    <p class="mb-1">${addr?.city}, ${addr?.state} - ${addr?.pincode}</p>
    <p class="mb-0">+${addr?.phone}</p>`;

  // Payment info
  document.getElementById('detailPayment').innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <p class="fw-bold mb-1">${order.paymentMethod}</p>
        <p class="text-secondary small mb-0">
          ${order.paymentMethod === 'COD' ? 'Pay on delivery' : 'Paid online'}
        </p>
      </div>
      <span class="status-badge ${order.status === 'Delivered' ? 'status-Delivered' : 'status-Pending'}">
        ${order.status === 'Delivered' ? 'Paid' : 'Pending'}
      </span>
    </div>`;

  // Price details
  document.getElementById('detailPricing').innerHTML = `
    <div class="price-row">
      <span class="text-secondary">SubTotal (${order.items.length} items)</span>
      <span>₹${order.subtotal?.toLocaleString()}</span>
    </div>
    ${order.discount > 0 ? `
    <div class="price-row">
      <span class="text-secondary">Discount</span>
      <span class="text-success">-₹${order.discount?.toLocaleString()}</span>
    </div>` : ''}
    ${order.couponDiscount > 0 ? `
    <div class="price-row">
      <span class="text-secondary">Coupon (${order.couponCode})</span>
      <span class="text-success">-₹${order.couponDiscount?.toLocaleString()}</span>
    </div>` : ''}
    <div class="price-row">
      <span class="text-secondary">Shipping Charges</span>
      <span>${order.shippingCharge === 0 ? '<span class="text-success">Free</span>' : '₹' + order.shippingCharge}</span>
    </div>
    ${order.tax > 0 ? `
    <div class="price-row">
      <span class="text-secondary">Tax (5% GST)</span>
      <span>₹${order.tax?.toLocaleString()}</span>
    </div>` : ''}
    <div class="price-row total">
      <span>Total Amount</span>
      <span class="text-warning">₹${order.totalAmount?.toLocaleString()}</span>
    </div>`;

  // Action buttons
  renderActions(order);
}

function renderTimeline(status) {
  const container = document.getElementById('orderTimeline');
  const steps = ['Placed', 'Processing', 'Shipped', 'Delivered'];
  const labels = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];
  const currentIdx = STATUS_STEPS.indexOf(status);

  let html = '';
  steps.forEach((step, i) => {
    const isDone = i <= currentIdx;
    const isActive = i === currentIdx;
    html += `
      <div class="timeline-step">
        <div class="timeline-circle ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}">
          ${isDone ? '<i class="bi bi-check-lg"></i>' : (i + 1)}
        </div>
        <span class="timeline-label">${labels[i]}</span>
      </div>`;
    if (i < steps.length - 1) {
      html += `<div class="timeline-line ${i < currentIdx ? 'done' : ''}"></div>`;
    }
  });

  container.innerHTML = html;
}

function renderActions(order) {
  const container = document.getElementById('orderActions');
  container.innerHTML = '';

  // Buy Again — always shown
  const buyAgainBtn = document.createElement('a');
  buyAgainBtn.href = '/shop';
  buyAgainBtn.className = 'btn-order-action btn-buy-again';
  buyAgainBtn.innerHTML = '<i class="bi bi-bag-plus"></i> Buy Again';
  container.appendChild(buyAgainBtn);

  // Cancel Order — only for Pending/Processing
  if (['Pending', 'Processing'].includes(order.status)) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-order-action btn-cancel-order';
    cancelBtn.innerHTML = '<i class="bi bi-x-circle"></i> Cancel Order';
    cancelBtn.addEventListener('click', () => openReasonModal('cancelOrder'));
    container.appendChild(cancelBtn);
  }

  // Return Order — only for Delivered
  if (order.status === 'Delivered') {
    const returnBtn = document.createElement('button');
    returnBtn.className = 'btn-order-action btn-return-order';
    returnBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Return / Replace';
    returnBtn.addEventListener('click', () => openReasonModal('return'));
    container.appendChild(returnBtn);
  }

  // Need Help
  const helpBtn = document.createElement('a');
  helpBtn.href = '/contact';
  helpBtn.className = 'btn-order-action btn-need-help';
  helpBtn.innerHTML = '<i class="bi bi-headset"></i> Need Help?';
  container.appendChild(helpBtn);

  // Download Invoice
  document.getElementById('downloadInvoiceBtn').addEventListener('click', () => {
    generateInvoicePDF(window._currentOrder);
  });
  window._currentOrder = order;
}

// Reason Modal
let currentAction = null;
let currentItemId = null;

function openReasonModal(action, itemId = null) {
  currentAction = action;
  currentItemId = itemId;

  const titleEl = document.getElementById('reasonModalTitle');
  const subtitleEl = document.getElementById('reasonModalSubtitle');
  const requiredEl = document.getElementById('reasonRequired');

  if (action === 'return') {
    titleEl.textContent = 'Return / Replace Order';
    subtitleEl.textContent = 'Please tell us why you want to return this order';
    requiredEl.classList.remove('d-none');
  } else if (action === 'cancelItem') {
    titleEl.textContent = 'Cancel Item';
    subtitleEl.textContent = 'Tell us why you want to cancel this item (optional)';
    requiredEl.classList.add('d-none');
  } else {
    titleEl.textContent = 'Cancel Order';
    subtitleEl.textContent = 'Tell us why you want to cancel (optional)';
    requiredEl.classList.add('d-none');
  }

  document.getElementById('reasonSelect').value = '';
  document.getElementById('reasonText').value = '';
  document.getElementById('reasonError').classList.add('d-none');
  document.getElementById('reasonModalBackdrop').classList.remove('d-none');
}

//GenerateInvoicePDF
function generateInvoicePDF(order) {
  if (!order) { showToast('Order data not ready', 'error'); return; }

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.orderId}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #111; padding-bottom: 15px; }
        .brand { font-size: 22px; font-weight: bold; }
        .tagline { color: #888; font-size: 12px; }
        h2 { margin: 20px 0 10px; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 13px; border: 1px solid #ddd; }
        td { padding: 10px; font-size: 13px; border: 1px solid #ddd; }
        .total-row { font-weight: bold; background: #f9f9f9; }
        .amount { color: #d4a017; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">CHRONOLUX</div>
          <div class="tagline">— Timeless Elegance —</div>
        </div>
        <div style="text-align:right;">
          <div><strong>Invoice</strong></div>
          <div>Order: ${order.orderId}</div>
          <div>Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
          <div>Status: ${order.status}</div>
        </div>
      </div>

      <h2>Shipping Address</h2>
      <p>${order.shippingAddress?.fullName}<br>
         ${order.shippingAddress?.fullAddress}<br>
         ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}<br>
         Phone: ${order.shippingAddress?.phone}</p>

      <h2>Order Items</h2>
      <table>
        <tr>
          <th>Product</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
        ${order.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td>₹${item.price?.toLocaleString()}</td>
            <td>${item.quantity}</td>
            <td>₹${item.itemTotal?.toLocaleString()}</td>
          </tr>`).join('')}
      </table>

      <h2>Price Summary</h2>
      <table>
        <tr><td>Subtotal</td><td>₹${order.subtotal?.toLocaleString()}</td></tr>
        <tr><td>Discount</td><td>-₹${order.discount?.toLocaleString()}</td></tr>
        ${order.couponDiscount > 0 ? `<tr><td>Coupon (${order.couponCode})</td><td>-₹${order.couponDiscount?.toLocaleString()}</td></tr>` : ''}
        <tr><td>Shipping</td><td>${order.shippingCharge === 0 ? 'Free' : '₹' + order.shippingCharge}</td></tr>
        <tr><td>Tax (5% GST)</td><td>₹${order.tax?.toLocaleString()}</td></tr>
        <tr class="total-row">
          <td>Total Amount</td>
          <td class="amount">₹${order.totalAmount?.toLocaleString()}</td>
        </tr>
      </table>

      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>

      <div class="footer">
        Thank you for shopping with ChronoLux! &nbsp;|&nbsp; support@chronolux.com &nbsp;|&nbsp; www.chronolux.com<br>
        © 2026 ChronoLux. All rights reserved.
      </div>
    </body>
    </html>`);

  win.document.close();
  setTimeout(() => {
    win.print();
    win.close();
  }, 500);
}

//Event listeners for reason model
document.getElementById('closeReasonModal').addEventListener('click', () => {
  document.getElementById('reasonModalBackdrop').classList.add('d-none');
});
document.getElementById('cancelReasonBtn').addEventListener('click', () => {
  document.getElementById('reasonModalBackdrop').classList.add('d-none');
});

document.getElementById('confirmReasonBtn').addEventListener('click', async () => {
  const selectReason = document.getElementById('reasonSelect').value;
  const textReason = document.getElementById('reasonText').value.trim();
  const reason = selectReason + (textReason ? ` — ${textReason}` : '');
  const errorEl = document.getElementById('reasonError');

  errorEl.classList.add('d-none');

  if (currentAction === 'return' && !selectReason) {
    errorEl.textContent = 'Please select a reason for return';
    errorEl.classList.remove('d-none');
    return;
  }

  let url, body;
  if (currentAction === 'cancelOrder') {
    url = `/api/users/orders/${orderId}/cancel`;
    body = { reason };
  } else if (currentAction === 'cancelItem') {
    url = `/api/users/orders/${orderId}/cancel-item/${currentItemId}`;
    body = { reason };
  } else if (currentAction === 'return') {
    url = `/api/users/orders/${orderId}/return`;
    body = { reason };
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();

  document.getElementById('reasonModalBackdrop').classList.add('d-none');

  if (res.ok) {
    showToast(data.message);
    setTimeout(() => loadOrderDetail(), 1000);
  } else {
    showToast(data.message, 'error');
  }
});

loadOrderDetail();