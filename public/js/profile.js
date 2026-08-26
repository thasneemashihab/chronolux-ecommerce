document.querySelectorAll('.toggle-eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector('i');

    if (input.type === 'password') {
      // Password is about to become VISIBLE → show the OPEN eye icon
      input.type = 'text';
      icon.classList.remove('bi-eye-slash-fill');
      icon.classList.add('bi-eye-fill');
    } else {
      // Password is about to become HIDDEN again → show the SLASHED eye icon
      input.type = 'password';
      icon.classList.remove('bi-eye-fill');
      icon.classList.add('bi-eye-slash-fill');
    }
  });
});

// ----- Save profile changes -----
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const gender = document.querySelector('input[name="gender"]:checked').value;

  if (!name) {
    showToast('Name is required', 'error');
    return;
  }
  if (name.length < 2) {
    showToast('Name must be at least 2 characters', 'error');
    return;
  }
  if (phone && !/^\d{10}$/.test(phone)) {
    showToast('Phone number must be exactly 10 digits', 'error');
    return;
  }

  const res = await fetch('/api/users/profile/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, gender })
  });
  const data = await res.json();

  showToast(data.message, res.ok ? 'success' : 'error');
});

// ----- Change password -----
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  if (!currentPassword) {
    showToast('Current password is required', 'error');
    return;
  }
  if (newPassword.length < 6) {
    showToast('New password must be at least 6 characters', 'error');
    return;
  }
  if (newPassword !== confirmNewPassword) {
    showToast('Passwords do not match', 'error');
    return;
  }

  const res = await fetch('/api/users/profile/change-password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await res.json();

  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) document.getElementById('passwordForm').reset();
});

// ----- Email change modal (3-step: password → new email → OTP) -----
const emailModalBackdrop = document.getElementById('emailModalBackdrop');
const emailStep0 = document.getElementById('emailStep0');
const emailStep1 = document.getElementById('emailStep1');
const emailStep2 = document.getElementById('emailStep2');
let newEmailValue = '';

document.getElementById('changeEmailBtn').addEventListener('click', () => {
  emailModalBackdrop.classList.remove('d-none');
  emailStep0.classList.remove('d-none');
  emailStep1.classList.add('d-none');
  emailStep2.classList.add('d-none');
  document.getElementById('emailChangePassword').value = '';
  document.getElementById('emailChangePasswordError').textContent = '';
});

document.getElementById('closeEmailModal').addEventListener('click', closeEmailModal);
document.getElementById('cancelEmailChange').addEventListener('click', closeEmailModal);
function closeEmailModal() {
  emailModalBackdrop.classList.add('d-none');
}

// STEP 0 → STEP 1: verify password first
document.getElementById('confirmPasswordBtn').addEventListener('click', async () => {
  const password = document.getElementById('emailChangePassword').value;
  const errorEl = document.getElementById('emailChangePasswordError');
  errorEl.textContent = '';

  if (!password) {
    errorEl.textContent = 'Password is required';
    return;
  }

  const res = await fetch('/api/users/profile/verify-password-for-email-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.errors?.emailChangePassword || data.message;
    return;
  }

  emailStep0.classList.add('d-none');
  emailStep1.classList.remove('d-none');
});

// STEP 1 → STEP 2: send OTP to new email
document.getElementById('sendEmailOtpBtn').addEventListener('click', async () => {
  const newEmail = document.getElementById('newEmailInput').value.trim();
  const errorEl = document.getElementById('newEmailError');
  errorEl.textContent = '';

  if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
    errorEl.textContent = 'Enter a valid email';
    return;
  }

  const res = await fetch('/api/users/profile/request-email-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newEmail })
  });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.message;
    return;
  }

  newEmailValue = newEmail;
  document.getElementById('pendingEmailDisplay').textContent = newEmail;
  emailStep1.classList.add('d-none');
  emailStep2.classList.remove('d-none');
  showToast('OTP sent to your new email');
});

// STEP 2: verify OTP and finalize
document.getElementById('verifyEmailOtpBtn').addEventListener('click', async () => {
  const boxes = document.querySelectorAll('.email-otp-box');
  const otp = Array.from(boxes).map(b => b.value).join('');
  const errorEl = document.getElementById('emailOtpError');
  errorEl.textContent = '';

  if (otp.length !== 6) {
    errorEl.textContent = 'Please enter the complete 6-digit OTP';
    return;
  }

  const res = await fetch('/api/users/profile/verify-email-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otp })
  });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.message;
    return;
  }

  document.getElementById('email').value = data.email;
  closeEmailModal();
  showToast('Email updated successfully!');
});

// Auto-advance email OTP boxes
document.querySelectorAll('.email-otp-box').forEach((box, idx, all) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/[^0-9]/g, '');
    if (box.value && idx < all.length - 1) all[idx + 1].focus();
  });
});


// ----- Sidebar logout -----
document.getElementById('sidebarLogout').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
});