// Delete address with confirmation
document.querySelectorAll('.delete-address-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const addressId = btn.dataset.id;
    const confirmed = confirm('Are you sure you want to delete this address?');
    if (!confirmed) return;

    const res = await fetch(`/api/users/address/${addressId}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      // Remove the row from the table without reloading the page
      btn.closest('tr').remove();
    } else {
      alert(data.message);
    }
  });
});

// Simple client-side search filter
const searchInput = document.getElementById('addressSearch');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase();
    document.querySelectorAll('#addressTableBody tr').forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? '' : 'none';
    });
  });
}