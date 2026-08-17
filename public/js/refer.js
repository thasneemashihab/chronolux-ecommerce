async function loadReferralInfo() {
  const res = await fetch('/api/users/coupons/referral');
  if (!res.ok) return;
  const data = await res.json();

  document.getElementById('referralLinkInput').value = data.referralUrl;
  document.getElementById('statTotal').textContent = data.totalReferrals;
  document.getElementById('statSuccessful').textContent = data.successfulReferrals;
  document.getElementById('statPending').textContent = data.pendingReferrals;
  document.getElementById('statEarnings').textContent = data.totalEarnings.toLocaleString();
}

document.getElementById('copyLinkBtn').addEventListener('click', () => {
  const input = document.getElementById('referralLinkInput');
  navigator.clipboard.writeText(input.value);
  showToast('Referral link copied!');
});

loadReferralInfo();