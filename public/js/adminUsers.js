let currentPage = 1;
let searchTerm = '';

async function loadUsers() {
  const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=10`);
  const data = await res.json();
  renderUsers(data.users);
  renderPagination(data.totalPages, data.currentPage);
  document.getElementById('totalUsersLabel').textContent = `${data.totalUsers} users found`;
}

function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">No users found</td></tr>';
    return;
  }

  users.forEach(user => {
    const statusBadge = user.isBlocked
      ? '<span class="badge bg-danger">Blocked</span>'
      : '<span class="badge bg-success">Active</span>';

    const actionIcon = user.isBlocked
      ? `<button class="btn btn-sm btn-outline-success toggle-block-btn" data-id="${user._id}" title="Unblock"><i class="bi bi-check-circle"></i></button>`
      : `<button class="btn btn-sm btn-outline-danger toggle-block-btn" data-id="${user._id}" title="Block"><i class="bi bi-slash-circle"></i></button>`;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${statusBadge}</td>
      <td>${actionIcon}</td>
    `;
    tbody.appendChild(row);
  });

  // Attach block/unblock listeners after rendering
  document.querySelectorAll('.toggle-block-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleBlock(btn.dataset.id));
  });
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === current ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = i;
      loadUsers();
    });
    pagination.appendChild(li);
  }
}

async function toggleBlock(userId) {
  const confirmed = confirm('Are you sure you want to change this user\'s status?');
  if (!confirmed) return;

  const res = await fetch(`/api/admin/users/${userId}/toggle-block`, { method: 'PUT' });
  const data = await res.json();

  if (res.ok) {
    loadUsers(); // refresh the table to show updated status
  } else {
    alert(data.message);
  }
}

// Search with debounce + clear button
const searchInput = document.getElementById('userSearch');
const clearBtn = document.getElementById('clearSearch');
let debounceTimer;

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  clearBtn.classList.toggle('d-none', searchInput.value === '');

  debounceTimer = setTimeout(() => {
    searchTerm = searchInput.value.trim();
    currentPage = 1;
    loadUsers();
  }, 400);
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.classList.add('d-none');
  searchTerm = '';
  currentPage = 1;
  loadUsers();
});

// Admin logout
document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadUsers();