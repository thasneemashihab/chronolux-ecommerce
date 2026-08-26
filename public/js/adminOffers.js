let editingOfferId = null;

async function loadOffers() {
  const search = document.getElementById('offerSearch').value;
  const type = document.getElementById('typeFilter').value;
  const status = document.getElementById('statusFilter').value;

  const res = await fetch('/api/admin/offers');
  const data = await res.json();

  let offers = data.offers;

  if (search) offers = offers.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  if (type) offers = offers.filter(o => o.discountType === type);
  if (status) offers = offers.filter(o => String(o.isActive) === status);

  renderOffers(offers);
}

function renderOffers(offers) {
  const tbody = document.getElementById('offersTableBody');
  tbody.innerHTML = '';

  if (offers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-4">No offers found</td></tr>';
    return;
  }

  offers.forEach(o => {
    const targetName = o.applyTo === 'Product' ? (o.product?.name || '—') : (o.category?.name || '—');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="fw-bold">${o.name}</td>
      <td><span class="badge ${o.applyTo === 'Category' ? 'bg-purple' : 'bg-success'}" style="background:${o.applyTo === 'Category' ? '#8b5cf6' : '#22c55e'};">${o.applyTo}</span><br><small class="text-secondary">${targetName}</small></td>
      <td>${o.discountType}</td>
      <td>${o.discountType === 'Percentage' ? o.discountValue + '%' : '₹' + o.discountValue}</td>
      <td>${new Date(o.startDate).toLocaleDateString('en-IN')}</td>
      <td>${new Date(o.endDate).toLocaleDateString('en-IN')}</td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input toggle-offer-btn" type="checkbox" data-id="${o._id}" ${o.isActive ? 'checked' : ''}>
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-secondary edit-offer-btn" data-id="${o._id}"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger delete-offer-btn" data-id="${o._id}"><i class="bi bi-trash"></i></button>
      </td>`;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.toggle-offer-btn').forEach(btn => {
    btn.addEventListener('change', async () => {
      await fetch(`/api/admin/offers/${btn.dataset.id}/toggle-status`, { method: 'PUT' });
      loadOffers();
    });
  });
  document.querySelectorAll('.delete-offer-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Delete this offer?');
      if (!confirmed) return;
      await fetch(`/api/admin/offers/${btn.dataset.id}`, { method: 'DELETE' });
      loadOffers();
    });
  });
  document.querySelectorAll('.edit-offer-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditOffer(offers.find(o => o._id === btn.dataset.id)));
  });
}

// Load products/categories into dropdowns
async function loadDropdownOptions() {
  const res = await fetch('/api/admin/products/dropdowns');
  const data = await res.json();

  const catSelect = document.getElementById('offerCategory');
  catSelect.innerHTML = '<option value="">Select category</option>' +
    data.categories.map(c => `<option value="${c._id}">${c.name}</option>`).join('');

  const prodRes = await fetch('/api/admin/products?limit=1000');
  const prodData = await prodRes.json();
  const prodSelect = document.getElementById('offerProduct');
  prodSelect.innerHTML = '<option value="">Select product</option>' +
    prodData.products.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
}

// Toggle Product vs Category fields
document.getElementById('offerApplyTo').addEventListener('change', (e) => {
  document.getElementById('productSelectWrapper').style.display = e.target.value === 'Product' ? 'block' : 'none';
  document.getElementById('categorySelectWrapper').style.display = e.target.value === 'Category' ? 'block' : 'none';
});

document.getElementById('openAddOfferBtn').addEventListener('click', async () => {
  editingOfferId = null;
  document.getElementById('offerModalTitle').textContent = 'Add Offer';
  document.getElementById('saveOfferBtn').textContent = 'Add Offer';
  document.getElementById('offerForm').reset();
  document.getElementById('productSelectWrapper').style.display = 'none';
  document.getElementById('categorySelectWrapper').style.display = 'none';
  await loadDropdownOptions();
  document.getElementById('offerModalBackdrop').classList.remove('d-none');
});

async function openEditOffer(offer) {
  editingOfferId = offer._id;
  document.getElementById('offerModalTitle').textContent = 'Edit Offer';
  document.getElementById('saveOfferBtn').textContent = 'Update Offer';
  await loadDropdownOptions();

  document.getElementById('offerName').value = offer.name;
  document.getElementById('offerApplyTo').value = offer.applyTo;
  document.getElementById('offerType').value = offer.discountType;
  document.getElementById('offerDiscount').value = offer.discountValue;
  document.getElementById('offerStartDate').value = offer.startDate.split('T')[0];
  document.getElementById('offerEndDate').value = offer.endDate.split('T')[0];
  document.getElementById('offerStatus').checked = offer.isActive;

  if (offer.applyTo === 'Product') {
    document.getElementById('productSelectWrapper').style.display = 'block';
    document.getElementById('categorySelectWrapper').style.display = 'none';
    document.getElementById('offerProduct').value = offer.product?._id || '';
  } else {
    document.getElementById('categorySelectWrapper').style.display = 'block';
    document.getElementById('productSelectWrapper').style.display = 'none';
    document.getElementById('offerCategory').value = offer.category?._id || '';
  }

  document.getElementById('offerModalBackdrop').classList.remove('d-none');
}

document.getElementById('closeOfferModal').addEventListener('click', () => {
  document.getElementById('offerModalBackdrop').classList.add('d-none');
});

document.getElementById('offerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(['offerName', 'offerApplyTo', 'offerType', 'offerDiscount', 'offerProduct', 'offerCategory', 'offerStartDate', 'offerEndDate']);

  const name = document.getElementById('offerName').value.trim();
  const applyTo = document.getElementById('offerApplyTo').value;
  const discountType = document.getElementById('offerType').value;
  const discountValue = document.getElementById('offerDiscount').value;
  const product = document.getElementById('offerProduct').value;
  const category = document.getElementById('offerCategory').value;
  const startDate = document.getElementById('offerStartDate').value;
  const endDate = document.getElementById('offerEndDate').value;
  const isActive = document.getElementById('offerStatus').checked;

  let valid = true;

  if (!name) { showFieldError('offerName', 'Offer name is required'); valid = false; }
  if (!applyTo) { showFieldError('offerApplyTo', 'Please select Product or Category'); valid = false; }
  if (!discountType) { showFieldError('offerType', 'Please select a discount type'); valid = false; }
  if (!discountValue || isNaN(discountValue) || Number(discountValue) <= 0) {
    showFieldError('offerDiscount', 'Please enter a valid discount value'); valid = false;
  } else if (discountType === 'Percentage' && Number(discountValue) > 100) {
    showFieldError('offerDiscount', 'Percentage cannot exceed 100'); valid = false;
  }
  if (applyTo === 'Product' && !product) { showFieldError('offerProduct', 'Please select a product'); valid = false; }
  if (applyTo === 'Category' && !category) { showFieldError('offerCategory', 'Please select a category'); valid = false; }
  if (!startDate) { showFieldError('offerStartDate', 'Start date is required'); valid = false; }
  if (!endDate) { showFieldError('offerEndDate', 'End date is required'); valid = false; }
  else if (startDate && new Date(endDate) < new Date(startDate)) {
    showFieldError('offerEndDate', 'End date cannot be before start date'); valid = false;
  }

  if (!valid) return;

  const body = { name, applyTo, product, category, discountType, discountValue, startDate, endDate, isActive };
  const url = editingOfferId ? `/api/admin/offers/${editingOfferId}` : '/api/admin/offers';
  const method = editingOfferId ? 'PUT' : 'POST';

  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();

  if (!res.ok) {
    if (data.errors) {
      Object.keys(data.errors).forEach(field => showFieldError(field, data.errors[field]));
    } else {
      showToast(data.message, 'error');
    }
    return;
  }

  showToast(data.message);
  document.getElementById('offerModalBackdrop').classList.add('d-none');
  loadOffers();
});

document.getElementById('offerSearch').addEventListener('input', loadOffers);
document.getElementById('typeFilter').addEventListener('change', loadOffers);
document.getElementById('statusFilter').addEventListener('change', loadOffers);
document.getElementById('resetFiltersBtn').addEventListener('click', () => {
  document.getElementById('offerSearch').value = '';
  document.getElementById('typeFilter').value = '';
  document.getElementById('statusFilter').value = '';
  loadOffers();
});

document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadOffers();