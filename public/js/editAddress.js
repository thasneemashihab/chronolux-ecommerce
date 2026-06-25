document.getElementById('editAddressForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const addressId = e.target.dataset.addressId;

  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const pincode = document.getElementById('pincode').value.trim();
  const state = document.getElementById('state').value;
  const city = document.getElementById('city').value.trim();
  const fullAddress = document.getElementById('fullAddress').value.trim();
  const label = document.getElementById('label').value;
  const isDefault = document.getElementById('isDefault').checked;
  const alertBox = document.getElementById('addressFormAlert');

  alertBox.classList.add('d-none');

  if (!fullName || !phone || !pincode || !state || !city || !fullAddress || !label) {
    alertBox.textContent = 'Please fill all required fields';
    alertBox.classList.remove('d-none');
    return;
  }

  const res = await fetch(`/api/users/address/${addressId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, phone, pincode, state, city, fullAddress, label, isDefault })
  });

  const data = await res.json();

  if (!res.ok) {
    alertBox.textContent = data.message;
    alertBox.classList.remove('d-none');
    return;
  }

  window.location.href = '/address';
});