let currentPage = 1;
let searchTerm = '';
let selectedFile = null;

async function loadCategories() {
  const res = await fetch(`/api/admin/categories?search=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=10`);
  const data = await res.json();
  renderCategories(data.categories);
  renderPagination(data.totalPages, data.currentPage);
  document.getElementById('totalCategoriesLabel').textContent = `${data.totalCategories} categories found`;
}

function renderCategories(categories) {
  const tbody = document.getElementById('categoryTableBody');
  tbody.innerHTML = '';

  if (categories.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-4">No categories found</td></tr>';
    return;
  }

  categories.forEach(cat => {
    const statusBadge = cat.isListed
      ? '<span class="badge bg-success">Listed</span>'
      : '<span class="badge bg-danger">Unlisted</span>';

    const eyeIcon = cat.isListed
      ? `<button class="btn btn-sm btn-secondary toggle-list-btn" data-id="${cat._id}" title="Unlist"><i class="bi bi-eye-slash"></i></button>`
      : `<button class="btn btn-sm btn-dark toggle-list-btn" data-id="${cat._id}" title="List"><i class="bi bi-eye"></i></button>`;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${cat.name}</td>
      <td><img src="${cat.image}" width="50" height="50" style="object-fit:cover; border-radius:6px;"></td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-sm btn-secondary edit-category-btn"
          data-id="${cat._id}" data-name="${cat.name}" data-slug="${cat.slug}"
          data-parent="${cat.parentCategory ? cat.parentCategory._id : ''}" data-image="${cat.image}">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-category-btn" data-id="${cat._id}">
          <i class="bi bi-trash"></i>
        </button>
        ${eyeIcon}
      </td>
    `;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.edit-category-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset));
  });
  document.querySelectorAll('.delete-category-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
  });
  document.querySelectorAll('.toggle-list-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleList(btn.dataset.id));
  });
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('categoryPagination');
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === current ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = i;
      loadCategories();
    });
    pagination.appendChild(li);
  }
}

// ----- Load parent category dropdown options -----
async function loadParentDropdown(selectedId = '') {
  const res = await fetch('/api/admin/categories/dropdown');
  const data = await res.json();
  const select = document.getElementById('parentCategorySelect');
  select.innerHTML = '<option value="">Select parent category</option>';
  data.categories.forEach(cat => {
    const selected = cat._id === selectedId ? 'selected' : '';
    select.innerHTML += `<option value="${cat._id}" ${selected}>${cat.name}</option>`;
  });
}

// ----- Modal open/close -----
const categoryModalBackdrop = document.getElementById('categoryModalBackdrop');
const uploadBox = document.getElementById('uploadBox');
const imagePreviewWrapper = document.getElementById('imagePreviewWrapper');
const imagePreview = document.getElementById('imagePreview');
const fileInput = document.getElementById('categoryImage');

document.getElementById('openAddCategoryBtn').addEventListener('click', async () => {
  document.getElementById('categoryModalTitle').textContent = 'Add Category';
  document.getElementById('saveCategoryBtn').textContent = 'Add Category';
  document.getElementById('categoryForm').reset();
  document.getElementById('categoryId').value = '';
  selectedFile = null;
  uploadBox.classList.remove('d-none');
  imagePreviewWrapper.classList.add('d-none');
  await loadParentDropdown();
  categoryModalBackdrop.classList.remove('d-none');
});

document.getElementById('closeCategoryModal').addEventListener('click', () => {
  categoryModalBackdrop.classList.add('d-none');
});
document.getElementById('cancelCategoryBtn').addEventListener('click', () => {
  categoryModalBackdrop.classList.add('d-none');
});

async function openEditModal(dataset) {
  document.getElementById('categoryModalTitle').textContent = 'Edit Category';
  document.getElementById('saveCategoryBtn').textContent = 'Update Category';
  document.getElementById('categoryId').value = dataset.id;
  document.getElementById('categoryName').value = dataset.name;
  document.getElementById('categorySlug').value = dataset.slug;

  selectedFile = null;
  uploadBox.classList.add('d-none');
  imagePreviewWrapper.classList.remove('d-none');
  imagePreview.src = dataset.image;

  await loadParentDropdown(dataset.parent);
  categoryModalBackdrop.classList.remove('d-none');
}

// Preview the chosen image immediately (before upload)
fileInput.addEventListener('change', (e) => {
  selectedFile = e.target.files[0];
  if (selectedFile) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      imagePreview.src = ev.target.result;
      uploadBox.classList.add('d-none');
      imagePreviewWrapper.classList.remove('d-none');
    };
    reader.readAsDataURL(selectedFile);
  }
});

// ----- Save (Add or Edit) -----
document.getElementById('categoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('categoryId').value;
  const name = document.getElementById('categoryName').value.trim();
  const slug = document.getElementById('categorySlug').value.trim();
  const parentCategory = document.getElementById('parentCategorySelect').value;

  if (!name || !slug) {
    showToast('Category name and slug are required', 'error');
    return;
  }
  if (!id && !selectedFile) {
    showToast('Please upload an image', 'error');
    return;
  }

  // FormData is required when sending files, instead of JSON
  const formData = new FormData();
  formData.append('name', name);
  formData.append('slug', slug);
  formData.append('parentCategory', parentCategory);
  if (selectedFile) formData.append('image', selectedFile);

  const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, { method, body: formData });
  const data = await res.json();

  if (!res.ok) {
    showToast(data.message, 'error');
    return;
  }

  showToast(data.message);
  categoryModalBackdrop.classList.add('d-none');
  loadCategories();
});

async function deleteCategory(id) {
  const confirmed = await showConfirm('Are you sure you want to delete this category?');
  if (!confirmed) return;

  const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
  const data = await res.json();

  if (res.ok) {
    showToast(data.message);
    loadCategories();
  } else {
    showToast(data.message, 'error');
  }
}

async function toggleList(id) {
  const res = await fetch(`/api/admin/categories/${id}/toggle-list`, { method: 'PUT' });
  const data = await res.json();

  if (res.ok) {
    showToast(data.message);
    loadCategories();
  } else {
    showToast(data.message, 'error');
  }
}

// ----- Search -----
const searchInput = document.getElementById('categorySearch');
const clearBtn = document.getElementById('clearCategorySearch');
let debounceTimer;

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  clearBtn.classList.toggle('d-none', searchInput.value === '');
  debounceTimer = setTimeout(() => {
    searchTerm = searchInput.value.trim();
    currentPage = 1;
    loadCategories();
  }, 400);
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.classList.add('d-none');
  searchTerm = '';
  currentPage = 1;
  loadCategories();
});

document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadCategories();