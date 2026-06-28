document.querySelectorAll('.toggle-eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('bi-eye-slash-fill', 'bi-eye-fill');
    } else {
      input.type = 'password';
      icon.classList.replace('bi-eye-fill', 'bi-eye-slash-fill');
    }
  });
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const referralCode = document.getElementById('referralCode').value.trim();

  let valid = true;
  if (!name) { showError('name', 'Name is required'); valid = false; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { showError('email', 'Enter a valid email'); valid = false; }
  if (password.length < 6) { showError('password', 'Password must be at least 6 characters'); valid = false; }
  if (password !== confirmPassword) { showError('confirmPassword', 'Passwords do not match'); valid = false; }
  if (!valid) return;

  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, referralCode })
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.errors) data.errors.forEach(err => showError(err.path, err.msg));
      else showToast(data.message);
      return;
    }

      sessionStorage.setItem('otpEmail', email);
    showToast('OTP sent! Check your email.');
    setTimeout(() => window.location.href = '/otp', 1000);
  } catch (err) {
    showToast('Something went wrong. Try again.', 'error');
  }
});

function showError(field, message) {
  const input = document.getElementById(field);
  const errorEl = document.getElementById(field + 'Error');
  if (input) input.classList.add('is-invalid-input');
  if (errorEl) errorEl.textContent = message;
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('input').forEach(el => el.classList.remove('is-invalid-input'));
  //document.getElementById('formAlert').classList.add('d-none');
}

/*function showAlert(message) {
  const alertEl = document.getElementById('formAlert');
  alertEl.textContent = message;
  alertEl.classList.remove('d-none');
}*/

document.getElementById('googleSignup').addEventListener('click', () => {
  window.location.href = '/api/auth/google'; // not wired up yet
});