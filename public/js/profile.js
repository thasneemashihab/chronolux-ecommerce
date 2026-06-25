// ----- Save profile changes -----
document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const gender = document.querySelector('input[name="gender"]:checked').value;
  const successBox = document.getElementById('profileSuccess');

  const res = await fetch('/api/users/profile/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, gender })
  });
  const data = await res.json();

  successBox.textContent = data.message;
  successBox.classList.remove('d-none');
  setTimeout(() => successBox.classList.add('d-none'), 3000);
});

// ----- Change password -----
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  const errorBox = document.getElementById('passwordError');
  const successBox = document.getElementById('passwordSuccess');

  errorBox.classList.add('d-none');
  successBox.classList.add('d-none');

  if (newPassword !== confirmNewPassword) {
    errorBox.textContent = 'Passwords do not match';
    errorBox.classList.remove('d-none');
    return;
  }

  const res = await fetch('/api/users/profile/change-password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  const data = await res.json();

  if (!res.ok) {
    errorBox.textContent = data.message;
    errorBox.classList.remove('d-none');
    return;
  }

  successBox.textContent = data.message;
  successBox.classList.remove('d-none');
  document.getElementById('passwordForm').reset();
});

// ----- Email change modal -----
const emailModalBackdrop = document.getElementById('emailModalBackdrop');
const emailStep1 = document.getElementById('emailStep1');
const emailStep2 = document.getElementById('emailStep2');
let newEmailValue = '';

document.getElementById('changeEmailBtn').addEventListener('click', () => {
  emailModalBackdrop.classList.remove('d-none');
  emailStep1.classList.remove('d-none');
  emailStep2.classList.add('d-none');
});

document.getElementById('closeEmailModal').addEventListener('click', () => {
  emailModalBackdrop.classList.add('d-none');
});
document.getElementById('cancelEmailChange').addEventListener('click', () => {
  emailModalBackdrop.classList.add('d-none');
});

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
});

document.getElementById('verifyEmailOtpBtn').addEventListener('click', async () => {
  const boxes = document.querySelectorAll('.email-otp-box');
  const otp = Array.from(boxes).map(b => b.value).join('');
  const errorEl = document.getElementById('emailOtpError');

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
  emailModalBackdrop.classList.add('d-none');
  alert('Email updated successfully!');
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