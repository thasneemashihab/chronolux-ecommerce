document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const emailError = document.getElementById('emailError');
  const formAlert = document.getElementById('formAlert');

  // Clear old errors
  emailError.textContent = '';
  formAlert.classList.add('d-none');

  // Basic check before sending
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    emailError.textContent = 'Enter a valid email';
    return;
  }

  // Send email to backend
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json();

  if (!res.ok) {
    formAlert.textContent = data.message;
    formAlert.classList.remove('d-none');
    return;
  }

  // Save email for the reset-password page, then redirect
  sessionStorage.setItem('resetEmail', email);
  window.location.href = '/verify-reset-otp';
});