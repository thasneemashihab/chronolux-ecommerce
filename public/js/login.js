// Show/hide password when eye icon is clicked
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

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); // stop the form from refreshing the page

 const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  const errorBox = document.getElementById('loginError');

  // Hide any previous error before trying again
  errorBox.classList.add('d-none');

  // Step 1: Send email and password to the backend
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  // Step 2: If backend says login failed, show the error message
  if (!res.ok) {
    errorBox.textContent = data.message;
    errorBox.classList.remove('d-none');
    return;
  }

// Check if redirected here because session expired
  const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('sessionExpired')) {
  showToast('Your session expired. Please log in again.', 'error');
}
if (urlParams.get('blocked')) {
  showToast('Your account has been blocked by admin.', 'error');
}

  // Step 3: Login succeeded — go to home page
  window.location.href = '/';
});

// Placeholder for Google login (built later with Passport.js)
document.getElementById('googleLogin').addEventListener('click', () => {
  window.location.href = '/api/auth/google';
});