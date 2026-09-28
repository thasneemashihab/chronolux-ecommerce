const email = sessionStorage.getItem('adminResetEmail');
if (!email) window.location.href = '/admin/forgot-password';
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

const timerEl = document.getElementById('timer');
const resendBtn = document.getElementById('resendBtn');
let seconds = 60;
let countdown;

function startTimer() {
  clearInterval(countdown);   // prevents stacked timers on resend
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
  timerEl.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
startTimer();

document.getElementById('adminOtpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const otp = Array.from(boxes).map(b => b.value).join('');
  const errorEl = document.getElementById('otpError');
  errorEl.textContent = '';
  if (otp.length !== 6) { errorEl.textContent = 'Please enter all 6 digits'; return; }

  const res = await fetch('/api/admin/verify-reset-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const data = await res.json();
  if (!res.ok) { errorEl.textContent = data.message; return; }

  sessionStorage.setItem('adminResetToken', data.resetToken);
  sessionStorage.removeItem('adminResetEmail');
  window.location.href = '/admin/reset-password';
});

resendBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!resendBtn.classList.contains('resend-active')) return;
  boxes.forEach(b => b.value = '');
  boxes[0].focus();
  await fetch('/api/admin/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  showToast('OTP resent');
  startTimer();
});