let currentPage = 1;
let searchTerm = '';
let croppedImages = [];   // holds the final cropped image Blobs ready for upload
let cropper = null;
let pendingFiles = [];

async function loadProducts() {
  const res = await fetch(`/api/admin/products?search=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=10`);
  const data = await res.json();
  renderProducts(data.products);
  renderPagination(data.totalPages, data.currentPage);
  document.getElementById('totalProductsLabel').textContent = `${data.totalProducts} products found`;
}

function renderProducts(products) {
  const tbody = document.getElementById('productTableBody');
  tbody.innerHTML = '';

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">No products found</td></tr>';
    return;
  }

  products.forEach(p => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${p.name}</td>
      <td>${p.brand ? p.brand.name : '—'}</td>
      <td>${p.category ? p.category.name : '—'}</td>
      <td>$${p.price}</td>
      <td>${p.stock}</td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input toggle-status-btn" type="checkbox" data-id="${p._id}" ${p.isActive ? 'checked' : ''}>
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-secondary edit-product-btn" data-product='${JSON.stringify(p)}'><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger delete-product-btn" data-id="${p._id}"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('change', () => toggleStatus(btn.dataset.id));
  });
  document.querySelectorAll('.delete-product-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
  document.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(JSON.parse(btn.dataset.product)));
  });
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('productPagination');
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === current ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage = i;
      loadProducts();
    });
    pagination.appendChild(li);
  }
}

async function loadDropdowns(selectedBrand = '', selectedCategory = '') {
  const res = await fetch('/api/admin/products/dropdowns');
  const data = await res.json();

  const brandSelect = document.getElementById('productBrand');
  brandSelect.innerHTML = '<option value="">Select brand</option>';
  data.brands.forEach(b => {
    const sel = b._id === selectedBrand ? 'selected' : '';
    brandSelect.innerHTML += `<option value="${b._id}" ${sel}>${b.name}</option>`;
  });

  const catSelect = document.getElementById('productCategory');
  catSelect.innerHTML = '<option value="">Select category</option>';
  data.categories.forEach(c => {
    const sel = c._id === selectedCategory ? 'selected' : '';
    catSelect.innerHTML += `<option value="${c._id}" ${sel}>${c.name}</option>`;
  });
}

// ----- Modal open/close -----
const productModalBackdrop = document.getElementById('productModalBackdrop');
const imageThumbnails = document.getElementById('imageThumbnails');
const fileInput = document.getElementById('productImages');

document.getElementById('openAddProductBtn').addEventListener('click', async () => {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('saveProductBtn').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  croppedImages = [];
  imageThumbnails.innerHTML = '';
  await loadDropdowns();
  productModalBackdrop.classList.remove('d-none');
});

document.getElementById('closeProductModal').addEventListener('click', () => productModalBackdrop.classList.add('d-none'));
document.getElementById('cancelProductBtn').addEventListener('click', () => productModalBackdrop.classList.add('d-none'));

async function openEditModal(product) {
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('saveProductBtn').textContent = 'Update Product';
  document.getElementById('productId').value = product._id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productStock').value = product.stock;
  document.getElementById('productDescription').value = product.description;

  croppedImages = [];
  imageThumbnails.innerHTML = '';
  // Show existing images as thumbnails (won't be re-uploaded unless replaced)
  product.images.forEach(imgPath => {
    const thumb = document.createElement('div');
    thumb.className = 'image-thumb';
    thumb.innerHTML = `<img src="${imgPath}">`;
    imageThumbnails.appendChild(thumb);
  });

  await loadDropdowns(product.brand?._id, product.category?._id);
  productModalBackdrop.classList.remove('d-none');
}

// ----- Multiple image selection → crop one at a time -----
fileInput.addEventListener('change', (e) => {
  pendingFiles = Array.from(e.target.files);
  processNextFile();
});

function processNextFile() {
  if (pendingFiles.length === 0) return;
  const file = pendingFiles.shift();
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('cropImage').src = ev.target.result;
    document.getElementById('cropModalBackdrop').classList.remove('d-none');

    if (cropper) cropper.destroy();
    cropper = new Cropper(document.getElementById('cropImage'), {
      aspectRatio: 1,        // square crop, since product thumbnails are square
      viewMode: 1
    });
  };
  reader.readAsDataURL(file);
}

document.getElementById('cancelCropBtn').addEventListener('click', () => {
  document.getElementById('cropModalBackdrop').classList.add('d-none');
  if (cropper) cropper.destroy();
  processNextFile(); // move to next pending file, skip this one
});

document.getElementById('confirmCropBtn').addEventListener('click', () => {
  // getCroppedCanvas resizes/crops the image based on what the user framed
  const canvas = cropper.getCroppedCanvas({ width: 800, height: 800 });

  canvas.toBlob((blob) => {
    croppedImages.push(blob);

    // Show a thumbnail preview
    const thumb = document.createElement('div');
    thumb.className = 'image-thumb';
    const url = URL.createObjectURL(blob);
    thumb.innerHTML = `<img src="${url}"><span class="remove-thumb">&times;</span>`;
    imageThumbnails.appendChild(thumb);

    thumb.querySelector('.remove-thumb').addEventListener('click', () => {
      const index = Array.from(imageThumbnails.children).indexOf(thumb);
      croppedImages.splice(index, 1);
      thumb.remove();
    });

    document.getElementById('cropModalBackdrop').classList.add('d-none');
    cropper.destroy();
    processNextFile(); // crop the next selected file, if any
  }, 'image/jpeg', 0.9);
});

// ----- Save (Add or Edit) -----
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const brand = document.getElementById('productBrand').value;
  const category = document.getElementById('productCategory').value;
  const price = document.getElementById('productPrice').value;
  const stock = document.getElementById('productStock').value;
  const description = document.getElementById('productDescription').value.trim();

  if (!name || !brand || !category || !price || !stock || !description) {
    showToast('Please fill all required fields', 'error');
    return;
  }
  if (!id && croppedImages.length < 3) {
    showToast('Please upload and crop at least 3 images', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('name', name);
  formData.append('brand', brand);
  formData.append('category', category);
  formData.append('price', price);
  formData.append('stock', stock);
  formData.append('description', description);

  croppedImages.forEach((blob, i) => {
    formData.append('images', blob, `image-${i}.jpg`);
  });

  const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, { method, body: formData });
  const data = await res.json();

  if (!res.ok) {
    showToast(data.message, 'error');
    return;
  }

  showToast(data.message);
  productModalBackdrop.classList.add('d-none');
  loadProducts();
});

async function toggleStatus(id) {
  const res = await fetch(`/api/admin/products/${id}/toggle-status`, { method: 'PUT' });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  loadProducts();
}

async function deleteProduct(id) {
  const confirmed = await showConfirm('Are you sure you want to delete this product?');
  if (!confirmed) return;

  const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) loadProducts();
}

// ----- Search -----
const searchInput = document.getElementById('productSearch');
const clearBtn = document.getElementById('clearProductSearch');
let debounceTimer;

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  clearBtn.classList.toggle('d-none', searchInput.value === '');
  debounceTimer = setTimeout(() => {
    searchTerm = searchInput.value.trim();
    currentPage = 1;
    loadProducts();
  }, 400);
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.classList.add('d-none');
  searchTerm = '';
  currentPage = 1;
  loadProducts();
});

document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadProducts();