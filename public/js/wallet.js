async function loadWallet() {
  const res = await fetch('/api/users/wallet');
  const data = await res.json();

  document.getElementById('walletBalance').textContent = data.balance.toLocaleString();
  document.getElementById('totalCredit').textContent = data.totalCredit.toLocaleString();
  document.getElementById('totalDebit').textContent = data.totalDebit.toLocaleString();

  const container = document.getElementById('transactionsList');

  if (!data.transactions || data.transactions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-5">
        <i class="bi bi-wallet2" style="font-size:50px; color:#444;"></i>
        <h5 class="mt-3 text-secondary">No transactions yet</h5>
      </div>`;
    return;
  }

  container.innerHTML = data.transactions.map(t => `
    <div class="d-flex justify-content-between align-items-center py-2 border-bottom" style="border-color:#2a2a2a !important;">
      <div>
        <p class="mb-0">${t.description}</p>
        <p class="text-secondary small mb-0">${new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>
      <div class="text-end">
        <span class="badge ${t.type === 'credit' ? 'bg-success' : 'bg-danger'}">${t.type}</span>
        <p class="mb-0 fw-bold ${t.type === 'credit' ? 'text-success' : 'text-danger'}">
          ${t.type === 'credit' ? '+' : '-'}₹${t.amount.toLocaleString()}
        </p>
        <p class="text-secondary small mb-0">Balance: ₹${t.balanceAfter.toLocaleString()}</p>
      </div>
    </div>
  `).join('');
}

loadWallet();