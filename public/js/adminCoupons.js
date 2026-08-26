let editingCouponId = null;
let allCoupons = [];

async function loadCoupons() {
  const res = await fetch('/api/admin/coupons');
  const data = await res.json();
  allCoupons = data.coupons;
  applyFiltersAndRender();
}

function applyFiltersAndRender() {
  const search = document.getElementById('couponSearch').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const type = document.getElementById('typeFilter').value;

  let filtered = allCoupons;
  if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search));
  if (status) filtered = filtered.filter(c => String(c.isActive) === status);
  if (type) filtered = filtered.filter(c => c.discountType === type);

  renderCoupons(filtered);
}

function renderCoupons(coupons) {
  const tbody = document.getElementById('couponsTableBody');
  tbody.innerHTML = '';

  if (coupons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-4">No coupons found</td></tr>';
    return;
  }

  coupons.forEach(c => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="fw-bold">${c.name}</td>
      <td class="text-warning fw-bold">${c.code}</td>
      <td>${c.discountType === 'percentage' ? 'Percentage' : 'Fixed'}</td>
      <td>₹${c.minOrderAmount.toLocaleString()}</td>
      <td>${c.maxDiscount ? '₹' + c.maxDiscount.toLocaleString() : '—'}</td>
      <td>${c.discountType === 'percentage' ? c.discountValue + '%' : '₹' + c.discountValue}</td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input toggle-coupon-btn" type="checkbox" data-id="${c._id}" ${c.isActive ? 'checked' : ''}>
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-secondary edit-coupon-btn" data-id="${c._id}"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger delete-coupon-btn" data-id="${c._id}"><i class="bi bi-trash"></i></button>
      </td>`;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.toggle-coupon-btn').forEach(btn => {
    btn.addEventListener('change', async () => {
      await fetch(`/api/admin/coupons/${btn.dataset.id}/toggle-status`, { method: 'PUT' });
      loadCoupons();
    });
  });

  document.querySelectorAll('.delete-coupon-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Delete this coupon? This cannot be undone.');
      if (!confirmed) return;
      const res = await fetch(`/api/admin/coupons/${btn.dataset.id}`, { method: 'DELETE' });
      const data = await res.json();
      showToast(data.message, res.ok ? 'success' : 'error');
      if (res.ok) loadCoupons();
    });
  });

  document.querySelectorAll('.edit-coupon-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditCoupon(allCoupons.find(c => c._id === btn.dataset.id)));
  });
}

document.getElementById('openAddCouponBtn').addEventListener('click', () => {
  editingCouponId = null;
  document.getElementById('couponModalTitle').textContent = 'Add Coupon';
  document.getElementById('saveCouponBtn').textContent = 'Add Coupon';
  document.getElementById('couponForm').reset();
  document.getElementById('couponFormError').classList.add('d-none');
  document.getElementById('couponModalBackdrop').classList.remove('d-none');
});

function openEditCoupon(coupon) {
  editingCouponId = coupon._id;
  document.getElementById('couponModalTitle').textContent = 'Edit Coupon';
  document.getElementById('saveCouponBtn').textContent = 'Update Coupon';
  document.getElementById('couponFormError').classList.add('d-none');

  document.getElementById('couponName').value = coupon.name;
  document.getElementById('couponCode').value = coupon.code;
  document.getElementById('couponType').value = coupon.discountType;
  document.getElementById('couponValue').value = coupon.discountValue;
  document.getElementById('couponMaxDiscount').value = coupon.maxDiscount || '';
  document.getElementById('couponMinOrder').value = coupon.minOrderAmount;
  document.getElementById('couponStartDate').value = coupon.validFrom ? coupon.validFrom.split('T')[0] : '';
  document.getElementById('couponValidTill').value = coupon.validTill.split('T')[0];
  document.getElementById('couponStatus').checked = coupon.isActive;

  document.getElementById('couponModalBackdrop').classList.remove('d-none');
}

document.getElementById('closeCouponModal').addEventListener('click', closeCouponModal);
document.getElementById('cancelCouponBtn').addEventListener('click', closeCouponModal);
function closeCouponModal() {
  document.getElementById('couponModalBackdrop').classList.add('d-none');
}

document.getElementById('couponForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(['couponName', 'couponCode', 'couponType', 'couponValue', 'couponMinOrder', 'couponValidTill']);
  document.getElementById('couponFormError').classList.add('d-none');

  const name = document.getElementById('couponName').value.trim();
  const code = document.getElementById('couponCode').value.trim();
  const discountType = document.getElementById('couponType').value;
  const discountValue = document.getElementById('couponValue').value;
  const maxDiscount = document.getElementById('couponMaxDiscount').value;
  const minOrderAmount = document.getElementById('couponMinOrder').value;
  const validFrom = document.getElementById('couponStartDate').value;
  const validTill = document.getElementById('couponValidTill').value;
  const isActive = document.getElementById('couponStatus').checked;

  let valid = true;

  if (!name) { showFieldError('couponName', 'Coupon name is required'); valid = false; }
  if (!code) { showFieldError('couponCode', 'Coupon code is required'); valid = false; }
  else if (!/^[A-Za-z0-9]+$/.test(code)) { showFieldError('couponCode', 'Code can only contain letters and numbers'); valid = false; }
  if (!discountType) { showFieldError('couponType', 'Please select a discount type'); valid = false; }
  if (!discountValue || isNaN(discountValue) || Number(discountValue) <= 0) {
    showFieldError('couponValue', 'Please enter a valid discount value'); valid = false;
  } else if (discountType === 'percentage' && Number(discountValue) > 100) {
    showFieldError('couponValue', 'Percentage cannot exceed 100'); valid = false;
  }
  if (!minOrderAmount || isNaN(minOrderAmount) || Number(minOrderAmount) < 0) {
    showFieldError('couponMinOrder', 'Please enter a valid minimum purchase amount'); valid = false;
  }
  if (!validFrom) { showFieldError('couponStartDate', 'Start date is required'); valid = false; }
  if (!validTill) { showFieldError('couponValidTill', 'End date is required'); valid = false; }

  if (!valid) return;

  const body = { name, code, discountType, discountValue, maxDiscount, minOrderAmount, validFrom, validTill, isActive };
  const url = editingCouponId ? `/api/admin/coupons/${editingCouponId}` : '/api/admin/coupons';
  const method = editingCouponId ? 'PUT' : 'POST';

  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();

  if (!res.ok) {
    if (data.errors) {
      Object.keys(data.errors).forEach(field => showFieldError(field, data.errors[field]));
    } else {
      document.getElementById('couponFormError').textContent = data.message;
      document.getElementById('couponFormError').classList.remove('d-none');
    }
    return;
  }

  showToast(data.message);
  closeCouponModal();
  loadCoupons();
});

document.getElementById('couponSearch').addEventListener('input', applyFiltersAndRender);
document.getElementById('statusFilter').addEventListener('change', applyFiltersAndRender);
document.getElementById('typeFilter').addEventListener('change', applyFiltersAndRender);
document.getElementById('resetFiltersBtn').addEventListener('click', () => {
  document.getElementById('couponSearch').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('typeFilter').value = '';
  applyFiltersAndRender();
});

document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadCoupons();