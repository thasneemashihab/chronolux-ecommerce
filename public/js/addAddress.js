document.getElementById('addAddressForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(['fullName', 'phone', 'pincode', 'state', 'city', 'fullAddress', 'label']);

  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const pincode = document.getElementById('pincode').value.trim();
  const state = document.getElementById('state').value;
  const city = document.getElementById('city').value.trim();
  const fullAddress = document.getElementById('fullAddress').value.trim();
  const label = document.getElementById('label').value;
  const isDefault = document.getElementById('isDefault').checked;

  let valid = true;

  if (!fullName) {
    showFieldError('fullName', 'Full name is required');
    valid = false;
  } else if (!/^[A-Za-z\s]+$/.test(fullName)) {
    showFieldError('fullName', 'Name can only contain letters, no numbers');
    valid = false;
  }

  if (!phone) {
    showFieldError('phone', 'Phone number is required');
    valid = false;
  } else if (!/^\d{10}$/.test(phone)) {
    showFieldError('phone', 'Phone number must be exactly 10 digits');
    valid = false;
  }

  if (!pincode) {
    showFieldError('pincode', 'Pincode is required');
    valid = false;
  } else if (!/^\d{6}$/.test(pincode)) {
    showFieldError('pincode', 'Pincode must be exactly 6 digits');
    valid = false;
  }

  if (!state) {
    showFieldError('state', 'Please select a state');
    valid = false;
  }
  if (!city) {
    showFieldError('city', 'City is required');
    valid = false;
  }
  if (!fullAddress) {
    showFieldError('fullAddress', 'Full address is required');
    valid = false;
  }
  if (!label) {
    showFieldError('label', 'Please select an address type');
    valid = false;
  }

  if (!valid) return;

  const res = await fetch('/api/users/address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, phone, pincode, state, city, fullAddress, label, isDefault })
  });
  const data = await res.json();

  if (!res.ok) {
    if (data.errors) {
      Object.keys(data.errors).forEach(field => showFieldError(field, data.errors[field]));
    } else {
      showToast(data.message, 'error');
    }
    return;
  }

  window.location.href = '/address';
});

function showFieldError(field, message) {
  const errorEl = document.getElementById(field + 'Error');
  const input = document.getElementById(field);
  if (errorEl) errorEl.textContent = message;
  if (input) input.classList.add('is-invalid-input');
}

function clearFieldErrors(fields) {
  fields.forEach(field => {
    const errorEl = document.getElementById(field + 'Error');
    const input = document.getElementById(field);
    if (errorEl) errorEl.textContent = '';
    if (input) input.classList.remove('is-invalid-input');
  });
}