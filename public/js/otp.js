const email = sessionStorage.getItem('otpEmail');
if (!email) window.location.href = '/signup';

document.getElementById('emailDisplay').textContent = email;

// ---- OTP box behavior: auto-advance, backspace, paste ----
const boxes = document.querySelectorAll('.otp-box');

boxes.forEach((box, idx) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/[^0-9]/g, ''); // digits only
    if (box.value && idx < boxes.length - 1) {
      boxes[idx + 1].focus();
    }
  });

  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && idx > 0) {
      boxes[idx - 1].focus();
    }
  });

  box.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    pasted.split('').forEach((char, i) => {
      if (boxes[i]) boxes[i].value = char;
    });
    if (boxes[pasted.length]) boxes[pasted.length].focus();
  });
});

function getOtpValue() {
  return Array.from(boxes).map(b => b.value).join('');
}

// ---- Timer ----
const timerEl = document.getElementById('timer');
const resendBtn = document.getElementById('resendBtn');
let seconds = 120;
let countdown;

function startTimer() {
  seconds = 120;
  updateTimerDisplay();
  resendBtn.classList.remove('resend-active');
  resendBtn.classList.add('resend-disabled');

  countdown = setInterval(() => {
    seconds--;
    updateTimerDisplay();
    if (seconds <= 0) {
      clearInterval(countdown);
      resendBtn.classList.remove('resend-disabled');
      resendBtn.classList.add('resend-active');
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

startTimer();

// ---- Form submit ----
document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const otp = getOtpValue();
  const errorEl = document.getElementById('otpError');
  errorEl.textContent = '';
  boxes.forEach(b => b.classList.remove('is-invalid-input'));

  if (otp.length !== 6) {
    errorEl.textContent = 'Please enter all 6 digits';
    return;
  }

  const res = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const data = await res.json();

  if (!res.ok) {
    boxes.forEach(b => b.classList.add('is-invalid-input'));
    errorEl.textContent = data.message;
    return;
  }

  sessionStorage.removeItem('otpEmail');
  showToast('Account verified successfully!');
  setTimeout(() => window.location.href = '/', 1000);
});

// ---- Resend ----
resendBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!resendBtn.classList.contains('resend-active')) return;

  boxes.forEach(b => b.value = '');
  boxes[0].focus();

  await fetch('/api/auth/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  showToast('A new OTP has been sent to your email');
  startTimer();
});