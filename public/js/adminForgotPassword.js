
const form = document.getElementById('adminForgotForm');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const formAlert = document.getElementById('formAlert');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();

  // Clear previous errors
  emailError.textContent = '';
  formAlert.classList.add('d-none');
  formAlert.textContent = '';

  // Validate email
  if (!email) {
    emailError.textContent = 'Please enter your email address';
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    emailError.textContent = 'Please enter a valid email address';
    return;
  }

  try {
    const response = await fetch('/api/admin/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      formAlert.textContent = data.message || 'Failed to send OTP';
      formAlert.classList.remove('d-none');
      return;
    }

    // Store email for the next page
    sessionStorage.setItem('adminResetEmail', data.email);

    // Go to admin OTP verification page
    window.location.href = '/admin/verify-reset-otp';

  } catch (error) {
    console.error(error);

    formAlert.textContent =
      'Something went wrong. Please try again.';

    formAlert.classList.remove('d-none');
  }
});
