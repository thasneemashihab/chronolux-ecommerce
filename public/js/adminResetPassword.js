const resetToken = sessionStorage.getItem('adminResetToken');
if (!resetToken) window.location.href = '/admin/forgot-password';

document.getElementById('adminResetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors(['newPassword', 'confirmPassword']);

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  let valid = true;

  if (!newPassword || newPassword.length < 6) { showFieldError('newPassword', 'Password must be at least 6 characters'); valid = false; }
  if (!confirmPassword) { showFieldError('confirmPassword', 'Please confirm your password'); valid = false; }
  else if (newPassword !== confirmPassword) { showFieldError('confirmPassword', 'Passwords do not match'); valid = false; }
  if (!valid) return;

  const res = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, newPassword })
  });
  const data = await res.json();
  if (!res.ok) { showToast(data.message, 'error'); return; }

  sessionStorage.removeItem('adminResetToken');
  showToast('Password reset successful! Please login.');
  setTimeout(() => window.location.href = '/admin/login', 1500);
});