const orderId = window.location.pathname.split('/').pop();

async function loadOrderDetail() {
  const res = await fetch(`/api/admin/orders/${orderId}`);
  if (!res.ok) {
    showToast('Order not found', 'error');
    setTimeout(() => window.location.href = '/admin/orders', 1500);
    return;
  }
  const data = await res.json();
  renderDetail(data.order);
}

function renderDetail(order) {
  document.getElementById('detailOrderId').textContent = order.orderId;
  document.getElementById('detailDate').textContent =
    new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  document.getElementById('detailCustomer').textContent =
    `${order.user?.name || 'Unknown'} (${order.user?.email || ''})`;

  // Items
  const itemsContainer = document.getElementById('detailItems');
  itemsContainer.innerHTML = '';
  order.items.forEach(item => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; gap:12px; padding:10px 0; border-bottom:1px solid #2a2a2a; align-items:center;';
    div.innerHTML = `
      <img src="${item.image}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" alt="${item.name}">
      <div style="flex:1;">
        <p style="font-weight:600;margin-bottom:3px;">${item.name}</p>
        <p style="color:#888;font-size:13px;margin-bottom:0;">
          Qty: ${item.quantity} &nbsp;|&nbsp; ₹${item.price?.toLocaleString()} each
        </p>
        ${item.status !== 'Active' ? `<span style="font-size:11px;color:#ea868f;">${item.status}</span>` : ''}
      </div>
      <div style="text-align:right;">
        <p style="color:#f5b800;font-weight:700;margin-bottom:0;">₹${item.itemTotal?.toLocaleString()}</p>
      </div>`;
    itemsContainer.appendChild(div);
  });

  // Status buttons — highlight current status
  document.querySelectorAll('.status-change-btn').forEach(btn => {
    btn.classList.toggle('active-status', btn.dataset.status === order.status);
    btn.addEventListener('click', () => handleStatusChange(order._id, btn.dataset.status));
  });

  // Address
  const addr = order.shippingAddress;
  document.getElementById('detailAddress').innerHTML = `
    <p style="color:#fff;font-weight:600;margin-bottom:4px;">${addr?.fullName}</p>
    <p style="margin-bottom:2px;">${addr?.fullAddress}</p>
    <p style="margin-bottom:2px;">${addr?.city}, ${addr?.state} - ${addr?.pincode}</p>
    <p style="margin-bottom:0;">+${addr?.phone}</p>`;

  // Payment
  document.getElementById('detailPayment').innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="color:#888;">Payment Method</span>
      <span>${order.paymentMethod}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="color:#888;">Subtotal</span>
      <span>₹${order.subtotal?.toLocaleString()}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="color:#888;">Discount</span>
      <span style="color:#28a745;">-₹${order.discount?.toLocaleString()}</span>
    </div>
    ${order.couponDiscount > 0 ? `
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="color:#888;">Coupon</span>
      <span style="color:#28a745;">-₹${order.couponDiscount?.toLocaleString()}</span>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
      <span style="color:#888;">Shipping</span>
      <span>${order.shippingCharge === 0 ? '<span style="color:#28a745;">Free</span>' : '₹' + order.shippingCharge}</span>
    </div>
    <div style="display:flex;justify-content:space-between;border-top:1px solid #333;padding-top:10px;font-weight:800;">
      <span>Total</span>
      <span style="color:#f5b800;">₹${order.totalAmount?.toLocaleString()}</span>
    </div>`;

  // Action buttons
  const actions = document.getElementById('adminOrderActions');
  actions.innerHTML = '';

  // Cancel order button
  if (!['Cancelled', 'Delivered'].includes(order.status)) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary px-4';
    cancelBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i> Cancel Order';
    cancelBtn.addEventListener('click', () => handleStatusChange(order._id, 'Cancelled'));
    actions.appendChild(cancelBtn);
  }

  // Approve return button
  const hasReturnRequest = order.items.some(i => i.status === 'Return Requested');
  if (hasReturnRequest) {
    const returnBtn = document.createElement('button');
    returnBtn.className = 'btn btn-warning fw-bold px-4';
    returnBtn.innerHTML = '<i class="bi bi-arrow-counterclockwise me-1"></i> Approve Return';
    returnBtn.addEventListener('click', () => approveReturn(order._id));
    actions.appendChild(returnBtn);
  }
}

async function handleStatusChange(id, status) {
  const confirmed = await showConfirm(`Change order status to "${status}"?`);
  if (!confirmed) return;

  const res = await fetch(`/api/admin/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) loadOrderDetail();
}

async function approveReturn(id) {
  const confirmed = await showConfirm('Approve return request for this order?');
  if (!confirmed) return;

  const res = await fetch(`/api/admin/orders/${id}/approve-return`, { method: 'PUT' });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) loadOrderDetail();
}

document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadOrderDetail();