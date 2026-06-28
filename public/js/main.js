const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('newsletterEmail').value;
    showToast(`Thanks for subscribing, ${email}!`);
    document.getElementById('newsletterEmail').value = '';
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  });
}

function showToast(message, type = 'success') {
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
    const backdrop = document.getElementById('confirmModalBackdrop');
    const text = document.getElementById('confirmModalText');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    text.textContent = message;
    backdrop.classList.remove('d-none');

    function cleanup(result) {
      backdrop.classList.add('d-none');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }

    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}