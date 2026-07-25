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
  const canCancelItem = ['Pending', 'Processing'].includes(order.status) && item.status === 'Active';
  const canReturnItem = order.status === 'Delivered' && item.status === 'Active';

  const itemStatusBadge = item.status !== 'Active'
    ? `<span class="item-status-badge item-status-${item.status.replace(' ', '-')}">${item.status}</span>`
    : '';

  const itemReason = item.cancelReason && item.status === 'Cancelled'
    ? `<p class="text-secondary small mb-0 mt-1">Reason: ${item.cancelReason}</p>`
    : item.returnReason && item.status !== 'Active'
      ? `<p class="text-secondary small mb-0 mt-1">Return reason: ${item.returnReason}</p>`
      : '';

  const div = document.createElement('div');
  div.className = `detail-item ${item.status !== 'Active' ? 'detail-item-inactive' : ''}`;
  div.innerHTML = `
    <img src="${item.image || '/images/default-product.jpg'}"
         class="detail-item-img ${item.status !== 'Active' ? 'opacity-50' : ''}"
         alt="${item.name}">
    <div class="flex-grow-1">
      <p class="detail-item-name">${item.name}</p>
      <p class="detail-item-sub">₹${item.price?.toLocaleString()} × ${item.quantity}</p>
      ${itemStatusBadge}
      ${itemReason}
    </div>
    <div class="text-end d-flex flex-column align-items-end gap-2">
      <p class="fw-bold text-warning mb-0">₹${item.itemTotal?.toLocaleString()}</p>
      ${canCancelItem ? `
        <button class="btn btn-sm btn-outline-danger cancel-item-btn"
          data-item-id="${item._id}"
          data-item-name="${item.name}">
          <i class="bi bi-x-circle me-1"></i> Cancel Item
        </button>` : ''}
      ${canReturnItem ? `
        <button class="btn btn-sm btn-outline-warning return-item-btn"
          data-item-id="${item._id}"
          data-item-name="${item.name}">
          <i class="bi bi-arrow-counterclockwise me-1"></i> Return Item
        </button>` : ''}
    </div>`;

  itemsContainer.appendChild(div);
});

// Attach cancel item button listeners
document.querySelectorAll('.cancel-item-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    openItemReasonModal('cancelItem', btn.dataset.itemId, btn.dataset.itemName);
  });
});

// Attach return item button listeners
document.querySelectorAll('.return-item-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    openItemReasonModal('returnItem', btn.dataset.itemId, btn.dataset.itemName);
  });
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

  let currentAction = null;
let currentItemId = null;

function openItemReasonModal(action, itemId, itemName) {
  currentAction = action;
  currentItemId = itemId;

  const titleEl = document.getElementById('reasonModalTitle');
  const subtitleEl = document.getElementById('reasonModalSubtitle');
  const requiredEl = document.getElementById('reasonRequired');
  const errorEl = document.getElementById('reasonError');

  errorEl.classList.add('d-none');
  document.getElementById('reasonSelect').value = '';
  document.getElementById('reasonText').value = '';

  if (action === 'cancelItem') {
    titleEl.textContent = `Cancel Item`;
    subtitleEl.textContent = `"${itemName}" — Tell us why you want to cancel this item`;
    requiredEl.classList.add('d-none'); // optional for cancel

    // Set cancel-specific reasons
    document.getElementById('reasonSelect').innerHTML = `
      <option value="">Select a reason (optional)</option>
      <option value="Changed my mind">Changed my mind</option>
      <option value="Found better price elsewhere">Found better price elsewhere</option>
      <option value="Ordered by mistake">Ordered by mistake</option>
      <option value="Delivery time too long">Delivery time too long</option>
      <option value="Other">Other</option>`;

  } else if (action === 'returnItem') {
    titleEl.textContent = `Return Item`;
    subtitleEl.textContent = `"${itemName}" — Please tell us why you want to return this item`;
    requiredEl.classList.remove('d-none'); // mandatory for return

    // Set return-specific reasons
    document.getElementById('reasonSelect').innerHTML = `
      <option value="">Select a reason *</option>
      <option value="Product damaged">Product damaged or defective</option>
      <option value="Wrong item received">Wrong item received</option>
      <option value="Not as described">Not as described</option>
      <option value="Size/fit issue">Size or fit issue</option>
      <option value="Changed my mind">Changed my mind</option>
      <option value="Other">Other</option>`;
  }

  document.getElementById('reasonModalBackdrop').classList.remove('d-none');
}

// Update the confirm button handler
document.getElementById('confirmReasonBtn').addEventListener('click', async () => {
  const selectReason = document.getElementById('reasonSelect').value;
  const textReason = document.getElementById('reasonText').value.trim();
  const reason = selectReason
    ? `${selectReason}${textReason ? ` — ${textReason}` : ''}`
    : textReason;
  const errorEl = document.getElementById('reasonError');

  errorEl.classList.add('d-none');

  // Return requires mandatory reason
  if (currentAction === 'returnItem' && !selectReason) {
    errorEl.textContent = 'Please select a reason for the return request';
    errorEl.classList.remove('d-none');
    return;
  }

  let url, body;

  if (currentAction === 'cancelItem') {
    url = `/api/users/orders/${orderId}/cancel-item/${currentItemId}`;
    body = { reason };
  } else if (currentAction === 'returnItem') {
    url = `/api/users/orders/${orderId}/return-item/${currentItemId}`;
    body = { reason };
  } else if (currentAction === 'cancelOrder') {
    url = `/api/users/orders/${orderId}/cancel`;
    body = { reason };
  } else if (currentAction === 'return') {
    if (!selectReason) {
      errorEl.textContent = 'Please select a reason for the return request';
      errorEl.classList.remove('d-none');
      return;
    }
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
    setTimeout(() => loadOrderDetail(), 800);
  } else {
    showToast(data.message, 'error');
  }
});


//GenerateInvoicePDF
function generateInvoicePDF(order) {
  if (!order) { showToast('Order data not ready', 'error'); return; }

  // Only include non-cancelled items in the invoice
  const activeItems = order.items.filter(item =>
    item.status !== 'Cancelled'
  );

  // Recalculate totals based on active items only
  const activeSubtotal = activeItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const cancelledSubtotal = order.items
    .filter(item => item.status === 'Cancelled')
    .reduce((sum, item) => sum + item.itemTotal, 0);

  // Check if any items were cancelled or returned
  const hasCancellations = order.items.some(i => i.status === 'Cancelled');
  const hasReturns = order.items.some(i =>
    i.status === 'Return Requested' || i.status === 'Returned'
  );

  const invoiceNote = hasCancellations || hasReturns
    ? `<p style="color:#dc3545; font-size:12px; margin-top:5px;">
        Note: This invoice reflects adjustments due to ${hasCancellations ? 'cancellations' : ''}
        ${hasCancellations && hasReturns ? ' and ' : ''}
        ${hasReturns ? 'returns' : ''}.
       </p>`
    : '';

  // Recalculate discount proportionally for active items
  const discountRatio = order.subtotal > 0 ? (order.discount / order.subtotal) : 0;
  const activeDiscount = Math.round(activeSubtotal * discountRatio);
  const activeCoupon = order.couponDiscount > 0
    ? Math.round(order.couponDiscount * (activeSubtotal / order.subtotal))
    : 0;
  const activeTotal = Math.round(
    activeSubtotal - activeDiscount - activeCoupon + order.shippingCharge + order.tax
  );

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
        .cancelled-row { color: #999; text-decoration: line-through; }
        .status-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: bold; }
        .status-active { background: #d4edda; color: #155724; }
        .status-cancelled { background: #f8d7da; color: #721c24; }
        .status-return { background: #fff3cd; color: #856404; }
        .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; }
        .adjustment-note { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">CHRONOLUX</div>
          <div class="tagline">— Timeless Elegance —</div>
          <div style="margin-top:5px; font-size:12px; color:#888;">support@chronolux.com</div>
        </div>
        <div style="text-align:right;">
          <div><strong>INVOICE</strong></div>
          <div>Order: ${order.orderId}</div>
          <div>Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
          <div>Status: <strong>${order.status}</strong></div>
        </div>
      </div>

      ${hasCancellations || hasReturns ? `
      <div class="adjustment-note">
        ⚠️ This invoice has been updated to reflect
        ${hasCancellations ? 'item cancellations' : ''}
        ${hasCancellations && hasReturns ? ' and ' : ''}
        ${hasReturns ? 'return requests' : ''}.
        Crossed-out items are not charged.
      </div>` : ''}

      <h2>Shipping Address</h2>
      <p>
        ${order.shippingAddress?.fullName}<br>
        ${order.shippingAddress?.fullAddress}<br>
        ${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.pincode}<br>
        Phone: ${order.shippingAddress?.phone}
      </p>

      <h2>Order Items</h2>
      <table>
        <tr>
          <th>Product</th>
          <th>Status</th>
          <th>Price</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
        ${order.items.map(item => `
          <tr class="${item.status === 'Cancelled' ? 'cancelled-row' : ''}">
            <td>${item.name}</td>
            <td>
              <span class="status-badge ${
                item.status === 'Active' ? 'status-active' :
                item.status === 'Cancelled' ? 'status-cancelled' :
                'status-return'
              }">
                ${item.status}
              </span>
            </td>
            <td>₹${item.price?.toLocaleString()}</td>
            <td>${item.quantity}</td>
            <td>${item.status === 'Cancelled'
              ? '<span style="color:#999;">Not charged</span>'
              : '₹' + item.itemTotal?.toLocaleString()
            }</td>
          </tr>`).join('')}
      </table>

      <h2>Price Summary ${hasCancellations || hasReturns ? '(Adjusted)' : ''}</h2>
      <table>
        ${hasCancellations ? `
        <tr style="color:#999; font-size:12px;">
          <td>Original Subtotal</td>
          <td style="text-decoration:line-through;">₹${order.subtotal?.toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>Adjusted Subtotal (active items only)</strong></td>
          <td><strong>₹${activeSubtotal?.toLocaleString()}</strong></td>
        </tr>` : `
        <tr>
          <td>Subtotal (${activeItems.length} items)</td>
          <td>₹${activeSubtotal?.toLocaleString()}</td>
        </tr>`}

        ${activeDiscount > 0 ? `
        <tr>
          <td>Product Discount</td>
          <td style="color:green;">-₹${activeDiscount?.toLocaleString()}</td>
        </tr>` : ''}

        ${activeCoupon > 0 ? `
        <tr>
          <td>Coupon (${order.couponCode})</td>
          <td style="color:green;">-₹${activeCoupon?.toLocaleString()}</td>
        </tr>` : ''}

        <tr>
          <td>Shipping</td>
          <td>${order.shippingCharge === 0 ? '<span style="color:green;">Free</span>' : '₹' + order.shippingCharge}</td>
        </tr>

        ${order.tax > 0 ? `
        <tr>
          <td>Tax (5% GST)</td>
          <td>₹${order.tax?.toLocaleString()}</td>
        </tr>` : ''}

        <tr class="total-row">
          <td>Amount ${hasCancellations ? 'Payable' : 'Total'}</td>
          <td class="amount">₹${activeTotal?.toLocaleString()}</td>
        </tr>

        ${hasCancellations ? `
        <tr style="font-size:12px; color:#28a745;">
          <td>You save (cancellations)</td>
          <td>₹${cancelledSubtotal?.toLocaleString()}</td>
        </tr>` : ''}
      </table>

      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>

      <div class="footer">
        Thank you for shopping with ChronoLux!<br>
        © 2026 ChronoLux. All rights reserved. | support@chronolux.com
      </div>
    </body>
    </html>`);

  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 500);
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