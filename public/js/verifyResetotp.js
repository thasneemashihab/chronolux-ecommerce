const email = sessionStorage.getItem('resetEmail');
if (!email) window.location.href = '/forgot-password';

document.getElementById('emailDisplay').textContent = email;

const boxes = document.querySelectorAll('.otp-box');

boxes.forEach((box, idx) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/[^0-9]/g, '');
    if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
  });
});

function getOtpValue() {
  return Array.from(boxes).map(b => b.value).join('');
}

// Timer (same pattern as signup OTP page)
const timerEl = document.getElementById('timer');
const resendBtn = document.getElementById('resendBtn');
let seconds = 60;
let countdown;

function startTimer() {
  seconds = 60;
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

document.getElementById('resetOtpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const otp = getOtpValue();
  const errorEl = document.getElementById('otpError');
  errorEl.textContent = '';

  if (otp.length !== 6) {
    errorEl.textContent = 'Please enter all 6 digits';
    return;
  }

  const res = await fetch('/api/auth/verify-reset-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const data = await res.json();

  if (!res.ok) {
    errorEl.textContent = data.message;
    return;
  }

  // Save the reset token for the final reset-password step
  sessionStorage.setItem('resetToken', data.resetToken);
  sessionStorage.removeItem('resetEmail');
  window.location.href = '/reset-password';
});

resendBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!resendBtn.classList.contains('resend-active')) return;

  boxes.forEach(b => b.value = '');
  boxes[0].focus();

  await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  startTimer();
});