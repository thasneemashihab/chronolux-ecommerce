const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletterEmail').value;
    showToast(`Thanks for subscribing, ${email}!`);
    document.getElementById('newsletterEmail').value = '';
  });
}

// Sidebar logout — covers ALL user pages
const sidebarLogout = document.getElementById('sidebarLogout');
if (sidebarLogout) {
  sidebarLogout.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  });
}

// Navbar logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  });
}

function showToast(message, type = 'success') {
  // Remove any existing toasts before showing new one
  document.querySelectorAll('.toastify').forEach(t => t.remove());

  Toastify({
    text: message,
    duration: 3000,
    gravity: 'top',
    position: 'center',
    style: {
      background: type === 'error' ? '#3a3a3a' : '#4b5263',
      color: '#fff',
      border: type === 'error' ? '1px solid #dc3545' : '1px solid #f5b800',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500'
    }
  }).showToast();
}

// Custom confirm modal — returns a Promise that resolves true/false
function showConfirm(message) {
  return new Promise((resolve) => {
    // Remove any existing confirm
    const old = document.getElementById('jsConfirmOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'jsConfirmOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #1a1a1a;
      padding: 28px 32px;
      border-radius: 12px;
      width: 90%;
      max-width: 380px;
      text-align: center;
      box-shadow: 0 15px 50px rgba(0,0,0,0.6);
      color: white;
    `;

    box.innerHTML = `
      <div style="font-size: 28px; margin-bottom: 12px;">⚠️</div>
      <div style="font-size: 16px; font-weight: 500; margin-bottom: 24px; line-height: 1.5;">
        ${message}
      </div>
      <div style="display: flex; gap: 12px;">
        <button id="jsConfirmCancel" style="
          flex: 1; padding: 11px; border: none; border-radius: 8px;
          background: #4b5563; color: white; font-weight: 600; cursor: pointer;
        ">Cancel</button>
        <button id="jsConfirmOk" style="
          flex: 1; padding: 11px; border: none; border-radius: 8px;
          background: #fbbf24; color: black; font-weight: 600; cursor: pointer;
        ">Yes, Continue</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    document.getElementById('jsConfirmOk').onclick = () => close(true);
    document.getElementById('jsConfirmCancel').onclick = () => close(false);
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };
  });
}

async function updateWishlistCount() {
  const badge = document.getElementById('wishlistCountBadge');
  if (!badge) return;

  try {
    const res = await fetch('/api/users/wishlist');
    if (!res.ok) return;
    const data = await res.json();
    const count = data.products?.length || 0;

    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  } catch (err) {
    // not logged in — hide badge silently
  }
}

// Call on every page load
updateWishlistCount();


// Load cart count on every page that has the navbar
async function updateCartCount() {
  const badge = document.getElementById('cartCountBadge');
  if (!badge) return; // not on a page with the cart badge

  try {
    const res = await fetch('/api/users/cart');
    if (!res.ok) return;
    const data = await res.json();
    if (data.itemCount > 0) {
      badge.textContent = data.itemCount;
      badge.classList.remove('d-none');
    } else {
      badge.classList.add('d-none');
    }
  } catch (err) {
    // user not logged in — hide badge silently
  }
}

async function updateCartCountBadge() {
  await updateCartCount();   // just delegate to the correct, working function
  const res = await fetch('/api/users/cart');
  if (!res.ok) return;
  const data = await res.json();
  const badge = document.querySelector('.cart-count-badge'); // adjust selector to match your navbar
  if (badge) {
    badge.textContent = data.itemCount;
    badge.classList.toggle('d-none', data.itemCount === 0);
  }
}

// Add to public/js/main.js
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
updateCartCountBadge();
updateCartCount();

