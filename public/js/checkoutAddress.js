let selectedAddressId = null;

// Load user's addresses
async function loadAddresses() {
  const res = await fetch('/api/users/cart');
  // Check if cart has items first
  if (res.ok) {
    const cartData = await res.json();
    if (cartData.items.length === 0) {
      showToast('Your cart is empty', 'error');
      setTimeout(() => window.location.href = '/cart', 1500);
      return;
    }
  }

  // Load addresses from profile
  const addrRes = await fetch('/api/users/profile/me');
  if (!addrRes.ok) return;
  const data = await addrRes.json();
  renderAddresses(data.user.addresses || []);
}

function renderAddresses(addresses) {
  const container = document.getElementById('addressList');
  container.innerHTML = '';

  if (addresses.length === 0) {
    container.innerHTML = '<p class="text-secondary">No saved addresses. Add one on the right.</p>';
    document.getElementById('addAddressPanel').classList.remove('d-none');
    return;
  }

  addresses.forEach(addr => {
    const div = document.createElement('div');
    div.className = `address-card ${addr.isDefault ? 'selected' : ''}`;

    if (addr.isDefault && !selectedAddressId) {
      selectedAddressId = addr._id;
      document.getElementById('continueToPaymentBtn').disabled = false;
    }

    div.innerHTML = `
      <div class="d-flex align-items-start gap-3">
        <div class="address-radio ${addr.isDefault ? 'selected' : ''}" data-id="${addr._id}"></div>
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <strong>${addr.fullName}</strong>
            <span class="address-type-badge">${addr.label || 'Home'}</span>
            ${addr.isDefault ? '<span class="default-badge">Default</span>' : ''}
          </div>
          <p class="text-secondary small mb-1">${addr.fullAddress}</p>
          <p class="text-secondary small mb-1">${addr.city}, ${addr.state} - ${addr.pincode}</p>
          <p class="text-secondary small mb-0">Phone: ${addr.phone}</p>
        </div>
        <a href="/address/edit/${addr._id}" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-pencil me-1"></i> Edit
        </a>
      </div>`;

    div.addEventListener('click', () => {
      document.querySelectorAll('.address-card').forEach(c => c.classList.remove('selected'));
      document.querySelectorAll('.address-radio').forEach(r => r.classList.remove('selected'));
      div.classList.add('selected');
      div.querySelector('.address-radio').classList.add('selected');
      selectedAddressId = addr._id;
      document.getElementById('continueToPaymentBtn').disabled = false;
    });

    container.appendChild(div);
  });
}

// Toggle add address form visibility
document.getElementById('addAddressForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(['addrFullName', 'addrPhone', 'addrLine1', 'addrCity', 'addrPincode', 'addrState']);

  const fullName = document.getElementById('addrFullName').value.trim();
  const phone = document.getElementById('addrPhone').value.trim();
  const line1 = document.getElementById('addrLine1').value.trim();
  const line2 = document.getElementById('addrLine2').value.trim();
  const city = document.getElementById('addrCity').value.trim();
  const pincode = document.getElementById('addrPincode').value.trim();
  const state = document.getElementById('addrState').value;
  const label = document.getElementById('addrLabel').value;
  const isDefault = document.getElementById('addrDefault').checked;

  let valid = true;

  if (!fullName) {
    showFieldError('addrFullName', 'Full name is required');
    valid = false;
  } else if (!/^[A-Za-z\s]+$/.test(fullName)) {
    showFieldError('addrFullName', 'Name can only contain letters');
    valid = false;
  }

  if (!phone) {
    showFieldError('addrPhone', 'Phone number is required');
    valid = false;
  } else if (!/^\d{10}$/.test(phone)) {
    showFieldError('addrPhone', 'Phone number must be exactly 10 digits');
    valid = false;
  }

  if (!line1) {   // ✅ fixed — checking the actual input value, not the not-yet-built fullAddress
    showFieldError('addrLine1', 'Address Line 1 is required');
    valid = false;
  }

  if (!city) {
    showFieldError('addrCity', 'City is required');
    valid = false;
  }

  if (!pincode) {
    showFieldError('addrPincode', 'Pincode is required');
    valid = false;
  } else if (!/^\d{6}$/.test(pincode)) {
    showFieldError('addrPincode', 'Pincode must be exactly 6 digits');
    valid = false;
  }

  if (!state) {
    showFieldError('addrState', 'Please select a state');
    valid = false;
  }

  if (!valid) return;

  const fullAddress = line2 ? `${line1}, ${line2}` : line1;   // built AFTER validation, correctly

  const res = await fetch('/api/users/address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, phone, pincode, state, city, fullAddress, label, isDefault })
  });
  const data = await res.json();

  if (!res.ok) {
    if (data.errors) {
      Object.keys(data.errors).forEach(field => {
        showFieldError(field === 'fullAddress' ? 'addrLine1' : field, data.errors[field]);
      });
    } else {
      document.getElementById('addAddrError').textContent = data.message;
      document.getElementById('addAddrError').classList.remove('d-none');
    }
    return;
  }

  showToast('Address saved successfully');
  document.getElementById('addAddressForm').reset();
  loadAddresses();
});

// Continue to payment
document.getElementById('continueToPaymentBtn').addEventListener('click', () => {
  if (!selectedAddressId) {
    showToast('Please select a delivery address', 'error');
    return;
  }
  // Store selected address in sessionStorage
  sessionStorage.setItem('selectedAddressId', selectedAddressId);
  window.location.href = '/checkout/payment';
});

loadAddresses();