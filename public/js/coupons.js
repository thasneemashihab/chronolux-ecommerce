async function loadCoupons() {
  const res = await fetch('/api/users/coupons');
  const container = document.getElementById('couponsList');

  if (!res.ok) {
    container.innerHTML = `<p class="text-secondary">Failed to load coupons.</p>`;
    return;
  }

  const data = await res.json();

  if (!data.coupons || data.coupons.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-ticket-perforated" style="font-size:50px; color:#444;"></i>
        <h5 class="mt-3 text-secondary">No Coupons Available</h5>
        <p class="text-secondary small">Check back later for exciting offers!</p>
      </div>`;
    return;
  }

  container.innerHTML = data.coupons.map(c => `
    <div class="order-card mb-3">
      <div class="flex-grow-1">
        <p class="fw-bold text-warning mb-1">${c.code}</p>
        <p class="mb-1">
          ${c.discountType === 'percentage' ? c.discountValue + '% OFF' : '₹' + c.discountValue + ' OFF'}
          on orders above ₹${c.minOrderAmount.toLocaleString()}
        </p>
        ${c.maxDiscount ? `<p class="text-secondary small mb-1">Max discount: ₹${c.maxDiscount.toLocaleString()}</p>` : ''}
        <p class="text-secondary small mb-0">Valid till ${new Date(c.validTill).toLocaleDateString('en-IN')}</p>
      </div>
      <button class="btn btn-sm btn-warning fw-bold copy-coupon-btn" data-code="${c.code}">Copy Code</button>
    </div>
  `).join('');

  document.querySelectorAll('.copy-coupon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.code);
      showToast(`Coupon code "${btn.dataset.code}" copied!`);
    });
  });
}

loadCoupons();