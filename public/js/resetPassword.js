const resetToken = sessionStorage.getItem('resetToken');
if (!resetToken) window.location.href = '/forgot-password';

document.querySelectorAll('.toggle-eye').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.replace('bi-eye-fill', 'bi-eye-slash-fill');
    } else {
      input.type = 'password';
      icon.classList.replace('bi-eye-slash-fill', 'bi-eye-fill');
    }
  });
});

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const formAlert = document.getElementById('formAlert');
  formAlert.classList.add('d-none');

  if (newPassword.length < 6) {
    formAlert.textContent = 'Password must be at least 6 characters';
    formAlert.classList.remove('d-none');
    return;
  }
  if (newPassword !== confirmPassword) {
    formAlert.textContent = 'Passwords do not match';
    formAlert.classList.remove('d-none');
    return;
  }

  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, newPassword })
  });

  const data = await res.json();

  if (!res.ok) {
    formAlert.textContent = data.message;
    formAlert.classList.remove('d-none');
    return;
  }

  sessionStorage.removeItem('resetToken');
  alert('Password reset successful! Please login.');
  window.location.href = '/login';
});