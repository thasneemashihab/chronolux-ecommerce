let currentPage = 1;
let searchTerm = '';
let croppedImages = [];
let cropper = null;
let pendingFiles = [];
let isReplaceMode = false;
let replaceIndex = -1;
let replacementBlobs = {};  // { imageIndex: blob } for individual replacements
let existingImages = [];    // current product's image paths when editing
let colorCroppedImages = {};    // { "black": [blob1, blob2, blob3] }
let variantCroppedImages = {};  // { "oyster": blob }
let currentCropTarget = null;   // { type: 'color'/'variant', name, index }
let editingProduct = null; // stores current product in edit mode


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
      <td>${p.brand?.name || '—'}</td>
      <td>${p.category?.name || '—'}</td>
      <td>₹${p.price?.toLocaleString()}</td>
      <td>${p.stock}</td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input toggle-status-btn" type="checkbox"
            data-id="${p._id}" ${p.isActive ? 'checked' : ''}>
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-secondary edit-product-btn me-1"
          data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-product-btn" data-id="${p._id}">
          <i class="bi bi-trash"></i>
        </button>
      </td>`;
    tbody.appendChild(row);
  });

  document.querySelectorAll('.toggle-status-btn').forEach(btn => {
    btn.addEventListener('change', () => toggleStatus(btn.dataset.id));
  });
  document.querySelectorAll('.delete-product-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteProduct(btn.dataset.id));
  });
  document.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = JSON.parse(btn.dataset.product);
      openEditModal(product);
    });
  });
}

function renderPagination(totalPages, current) {
  const pagination = document.getElementById('productPagination');
  pagination.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === current ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => { e.preventDefault(); currentPage = i; loadProducts(); });
    pagination.appendChild(li);
  }
}

async function loadDropdowns(selectedBrand = '', selectedCategory = '') {
  const res = await fetch('/api/admin/products/dropdowns');
  const data = await res.json();

  const brandSelect = document.getElementById('productBrand');
  brandSelect.innerHTML = '<option value="">Select brand</option>';
  data.brands.forEach(b => {
    brandSelect.innerHTML += `<option value="${b._id}" ${b._id === selectedBrand ? 'selected' : ''}>${b.name}</option>`;
  });

  const catSelect = document.getElementById('productCategory');
  catSelect.innerHTML = '<option value="">Select category</option>';
  data.categories.forEach(c => {
    catSelect.innerHTML += `<option value="${c._id}" ${c._id === selectedCategory ? 'selected' : ''}>${c.name}</option>`;
  });
}

const productModalBackdrop = document.getElementById('productModalBackdrop');
const imageThumbnails = document.getElementById('imageThumbnails');
const fileInput = document.getElementById('productImages');
const existingImagesSection = document.getElementById('existingImagesSection');
const existingImagesGrid = document.getElementById('existingImagesGrid');
const productUploadBox = document.getElementById('productUploadBox');

// ----- Open Add Modal -----
document.getElementById('openAddProductBtn').addEventListener('click', async () => {
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('saveProductBtn').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  croppedImages = [];
  replacementBlobs = {};
  existingImages = [];
  imageThumbnails.innerHTML = '';
  existingImagesSection.classList.add('d-none');
  productUploadBox.classList.remove('d-none');
  await loadDropdowns();
  productModalBackdrop.classList.remove('d-none');
});

document.getElementById('closeProductModal').addEventListener('click', () => productModalBackdrop.classList.add('d-none'));
document.getElementById('cancelProductBtn').addEventListener('click', () => productModalBackdrop.classList.add('d-none'));

// ----- Open Edit Modal -----
async function openEditModal(product) {
  editingProduct = product; // store for generateColorVariantInputs to use
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('saveProductBtn').textContent = 'Update Product';
  document.getElementById('productId').value = product._id;
  document.getElementById('productName').value = product.name || '';
  document.getElementById('productPrice').value = product.price || '';
  document.getElementById('productOriginalPrice').value = product.originalPrice || '';
  document.getElementById('productDiscount').value = product.discount || '';
  document.getElementById('productStock').value = product.stock || '';
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productSpecifications').value = product.specifications || '';
  document.getElementById('productColors').value = product.colors?.join(', ') || '';
  document.getElementById('productVariants').value = product.variants?.join(', ') || '';
  document.getElementById('productStatus').value = product.isActive ? 'true' : 'false';

  croppedImages = [];
  replacementBlobs = {};
  existingImages = product.images || [];
  imageThumbnails.innerHTML = '';

  // Show existing images with replace buttons
  productUploadBox.classList.add('d-none');
  existingImagesSection.classList.remove('d-none');
  renderExistingImages();

  await loadDropdowns(product.brand?._id, product.category?._id);
  productModalBackdrop.classList.remove('d-none');
  generateColorVariantInputs(); // regenerate after setting editingProduct
}

// ----- Render existing images with replace button -----
function renderExistingImages() {
  existingImagesGrid.innerHTML = '';

  existingImages.forEach((imgPath, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'existing-img-wrapper';
    wrapper.dataset.index = index;

    // Show replacement preview if this image was replaced
    const displaySrc = replacementBlobs[index]
      ? URL.createObjectURL(replacementBlobs[index])
      : imgPath;

    wrapper.innerHTML = `
      <img src="${displaySrc}" class="existing-img-thumb" alt="Image ${index + 1}">
      <div class="existing-img-overlay">
        <label class="replace-img-btn" title="Replace image ${index + 1}">
          <i class="bi bi-arrow-repeat"></i>
          <input type="file" accept="image/*" class="d-none replace-file-input" data-index="${index}">
        </label>
        ${replacementBlobs[index] ? '<span class="replaced-badge">Replaced</span>' : ''}
      </div>
    `;

    existingImagesGrid.appendChild(wrapper);

    wrapper.querySelector('.replace-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      openCropModal(file, true, index);
    });
  });
}

// ----- File input for adding new images -----
fileInput.addEventListener('change', (e) => {
  pendingFiles = Array.from(e.target.files);
  if (pendingFiles.length > 0) {
    openCropModal(pendingFiles.shift(), false, -1);
  }
});

//upload boxes when admin types colos/variants.

function generateColorVariantInputs() {
  const colorsRaw = document.getElementById('productColors').value.trim();
  const variantsRaw = document.getElementById('productVariants').value.trim();
  const colors = colorsRaw ? colorsRaw.split(',').map(c => c.trim()).filter(c => c) : [];
  const variants = variantsRaw ? variantsRaw.split(',').map(v => v.trim()).filter(v => v) : [];

  const colorSection = document.getElementById('colorImagesSection');
  const variantSection = document.getElementById('variantImagesSection');
  const colorInputs = document.getElementById('colorImageInputs');
  const variantInputs = document.getElementById('variantImageInputs');

  colorInputs.innerHTML = '';
  variantInputs.innerHTML = '';

  if (colors.length > 0) {
    colorSection.classList.remove('d-none');

    colors.forEach((color, colorIdx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mb-4';

      // Check if this color already has images (edit mode)
      const existingColorData = editingProduct?.colorImages?.find(c => c.color === color);

      wrapper.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-2">
          <span class="color-dot-preview" style="background:${color}; width:16px; height:16px; border-radius:50%; display:inline-block;"></span>
          <strong class="text-capitalize">${color}</strong>
          <span class="text-secondary small">(upload 3 images: front, side, back)</span>
        </div>
        <div class="d-flex gap-3 flex-wrap" id="colorSlots_${color}">
          ${[0, 1, 2].map(i => {
            const existingImg = existingColorData?.images?.[i];
            return `
              <div class="color-img-slot-wrapper">
                <p class="text-secondary small mb-1">Image ${i + 1}</p>
                <div class="color-img-slot" id="colorSlot_${color}_${i}">
                  ${existingImg
                    ? `<div class="upload-slot-filled">
                         <img src="${existingImg}">
                         <span class="slot-remove" data-color="${color}" data-index="${i}">&times;</span>
                       </div>`
                    : `<div class="upload-slot-empty">
                         <label style="cursor:pointer;">
                           <i class="bi bi-plus-lg"></i>
                           <input type="file" accept="image/*" class="d-none color-img-input"
                             data-color="${color}" data-index="${i}">
                         </label>
                       </div>`
                  }
                </div>
              </div>`;
          }).join('')}
        </div>
      `;

      colorInputs.appendChild(wrapper);

      // Attach file listeners for this color's 3 slots
      wrapper.querySelectorAll('.color-img-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          currentCropTarget = {
            type: 'color',
            name: input.dataset.color,
            index: parseInt(input.dataset.index)
          };
          openCropModal(file, false, -1);
        });
      });

      // Remove button for existing images
      wrapper.querySelectorAll('.slot-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.dataset.color;
          const index = parseInt(btn.dataset.index);
          const slot = document.getElementById(`colorSlot_${color}_${index}`);
          if (!colorCroppedImages[color]) colorCroppedImages[color] = [];
          colorCroppedImages[color][index] = null;
          slot.innerHTML = `
            <div class="upload-slot-empty">
              <label style="cursor:pointer;">
                <i class="bi bi-plus-lg"></i>
                <input type="file" accept="image/*" class="d-none color-img-input"
                  data-color="${color}" data-index="${index}">
              </label>
            </div>`;
          // Re-attach listener
          slot.querySelector('.color-img-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            currentCropTarget = { type: 'color', name: color, index };
            openCropModal(file, false, -1);
          });
        });
      });
    });
  } else {
    colorSection.classList.add('d-none');
  }

  // Variants — only show NEW variant uploads
  // If variant already has an image in edit mode, show it but allow replacement
  if (variants.length > 0) {
    variantSection.classList.remove('d-none');

    variants.forEach(variant => {
      const existingVariantData = editingProduct?.variantImages?.find(v => v.variant === variant);

      const wrapper = document.createElement('div');
      wrapper.className = 'mb-3';
      wrapper.innerHTML = `
        <div class="d-flex align-items-center gap-2 mb-2">
          <strong class="text-capitalize">${variant}</strong>
          <span class="text-secondary small">(1 image for this style)</span>
          ${existingVariantData ? '<span class="badge bg-success">Has image</span>' : ''}
        </div>
        <div class="d-flex gap-2" id="variantSlots_${variant}">
          <div class="color-img-slot" id="variantSlot_${variant}">
            ${existingVariantData?.image
              ? `<div class="upload-slot-filled">
                   <img src="${existingVariantData.image}">
                   <span class="slot-remove-variant" data-variant="${variant}">&times;</span>
                 </div>`
              : `<div class="upload-slot-empty">
                   <label style="cursor:pointer;">
                     <i class="bi bi-plus-lg"></i>
                     <input type="file" accept="image/*" class="d-none variant-img-input"
                       data-variant="${variant}">
                   </label>
                 </div>`
            }
          </div>
        </div>
      `;

      variantInputs.appendChild(wrapper);

      const input = wrapper.querySelector('.variant-img-input');
      if (input) {
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          currentCropTarget = { type: 'variant', name: variant, index: 0 };
          openCropModal(file, false, -1);
        });
      }

      const removeBtn = wrapper.querySelector('.slot-remove-variant');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          const slot = document.getElementById(`variantSlot_${variant}`);
          variantCroppedImages[variant] = null;
          slot.innerHTML = `
            <div class="upload-slot-empty">
              <label style="cursor:pointer;">
                <i class="bi bi-plus-lg"></i>
                <input type="file" accept="image/*" class="d-none variant-img-input"
                  data-variant="${variant}">
              </label>
            </div>`;
          slot.querySelector('.variant-img-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            currentCropTarget = { type: 'variant', name: variant, index: 0 };
            openCropModal(file, false, -1);
          });
        });
      }
    });
  } else {
    variantSection.classList.add('d-none');
  }
}

// Trigger when colors/variants are typed
document.getElementById('productColors')?.addEventListener('input', generateColorVariantInputs);
document.getElementById('productVariants')?.addEventListener('input', generateColorVariantInputs);

// ----- Open crop modal -----
function openCropModal(file, isReplace, index) {
  isReplaceMode = isReplace;
  replaceIndex = index;

  const titleEl = document.getElementById('cropModalTitle');
  const subtitleEl = document.getElementById('cropModalSubtitle');

  if (isReplace) {
    titleEl.textContent = `Replace Image ${index + 1}`;
    subtitleEl.textContent = 'Crop the new image to replace the existing one';
  } else {
    titleEl.textContent = 'Crop Image';
    subtitleEl.textContent = `Adding image ${croppedImages.length + 1}`;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('cropImage').src = ev.target.result;
    document.getElementById('cropModalBackdrop').classList.remove('d-none');
    if (cropper) cropper.destroy();
    cropper = new Cropper(document.getElementById('cropImage'), {
      aspectRatio: 1,
      viewMode: 1
    });
  };
  reader.readAsDataURL(file);
}

// ----- Cancel crop -----
document.getElementById('cancelCropBtn').addEventListener('click', () => {
  document.getElementById('cropModalBackdrop').classList.add('d-none');
  if (cropper) { cropper.destroy(); cropper = null; }

  // If add mode, skip this file and process next
  if (!isReplaceMode && pendingFiles.length > 0) {
    openCropModal(pendingFiles.shift(), false, -1);
  }
});

// ----- Confirm crop -----

document.getElementById('confirmCropBtn').addEventListener('click', () => {
  const canvas = cropper.getCroppedCanvas({ width: 800, height: 800 });

  canvas.toBlob((blob) => {
    if (isReplaceMode) {
      replacementBlobs[replaceIndex] = blob;
      renderExistingImages();
      showToast(`Image ${replaceIndex + 1} ready to replace`);
    } else if (currentCropTarget) {
      const { type, name, index } = currentCropTarget;

      if (type === 'color') {
        if (!colorCroppedImages[name]) colorCroppedImages[name] = [];
        colorCroppedImages[name][index] = blob;

        // Show preview in the slot
        const slot = document.getElementById(`colorSlot_${name}_${index}`);
        if (slot) {
          const url = URL.createObjectURL(blob);
          slot.innerHTML = `
            <div class="upload-slot-filled">
              <img src="${url}">
              <span class="slot-remove" data-color="${name}" data-index="${index}">&times;</span>
            </div>`;
          slot.querySelector('.slot-remove').addEventListener('click', () => {
            colorCroppedImages[name][index] = null;
            slot.innerHTML = `<div class="upload-slot-empty"><label style="cursor:pointer;"><i class="bi bi-plus-lg"></i><input type="file" accept="image/*" class="d-none color-img-input" data-color="${name}" data-index="${index}"></label></div>`;
          });
        }
        showToast(`${name} image ${index + 1} added`);

      } else if (type === 'variant') {
        variantCroppedImages[name] = blob;

        const slot = document.getElementById(`variantSlot_${name}`);
        if (slot) {
          const url = URL.createObjectURL(blob);
          slot.innerHTML = `
            <div class="upload-slot-filled">
              <img src="${url}">
              <span class="slot-remove" data-variant="${name}">&times;</span>
            </div>`;
          slot.querySelector('.slot-remove').addEventListener('click', () => {
            variantCroppedImages[name] = null;
            slot.innerHTML = `<div class="upload-slot-empty"><label style="cursor:pointer;"><i class="bi bi-plus-lg"></i><input type="file" accept="image/*" class="d-none variant-img-input" data-variant="${name}"></label></div>`;
          });
        }
        showToast(`${name} image added`);
      } else {
        // Regular base image
        croppedImages.push(blob);
        const thumb = document.createElement('div');
        thumb.className = 'image-thumb';
        const url = URL.createObjectURL(blob);
        thumb.innerHTML = `<img src="${url}"><span class="remove-thumb">&times;</span>`;
        imageThumbnails.appendChild(thumb);
        thumb.querySelector('.remove-thumb').addEventListener('click', () => {
          const idx = Array.from(imageThumbnails.children).indexOf(thumb);
          croppedImages.splice(idx, 1);
          thumb.remove();
        });
        if (pendingFiles.length > 0) openCropModal(pendingFiles.shift(), false, -1);
      }

      currentCropTarget = null;
    } else {
      // Base product image (no color/variant target)
      croppedImages.push(blob);
      const thumb = document.createElement('div');
      thumb.className = 'image-thumb';
      const url = URL.createObjectURL(blob);
      thumb.innerHTML = `<img src="${url}"><span class="remove-thumb">&times;</span>`;
      imageThumbnails.appendChild(thumb);
      thumb.querySelector('.remove-thumb').addEventListener('click', () => {
        const idx = Array.from(imageThumbnails.children).indexOf(thumb);
        croppedImages.splice(idx, 1);
        thumb.remove();
      });
      if (pendingFiles.length > 0) openCropModal(pendingFiles.shift(), false, -1);
    }

    document.getElementById('cropModalBackdrop').classList.add('d-none');
    if (cropper) { cropper.destroy(); cropper = null; }
  }, 'image/jpeg', 0.9);
});

// ----- Form Submit (Add or Edit) -----
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('productId').value;
  const name = document.getElementById('productName').value.trim();
  const brand = document.getElementById('productBrand').value;
  const category = document.getElementById('productCategory').value;
  const price = document.getElementById('productPrice').value;
  const originalPrice = document.getElementById('productOriginalPrice').value;
  const discount = document.getElementById('productDiscount').value;
  const stock = document.getElementById('productStock').value;
  const description = document.getElementById('productDescription').value.trim();
  const specifications = document.getElementById('productSpecifications').value.trim();
  const colorsRaw = document.getElementById('productColors').value.trim();
  const variantsRaw = document.getElementById('productVariants').value.trim();
  const isActive = document.getElementById('productStatus').value;

  if (!name || !brand || !category || !price || !stock || !description) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  // Validate images
  if (!id && croppedImages.length < 3) {
    showToast('Please upload and crop at least 3 images', 'error');
    return;
  }

  const colors = colorsRaw ? colorsRaw.split(',').map(c => c.trim()).filter(c => c) : [];
  const variants = variantsRaw ? variantsRaw.split(',').map(v => v.trim()).filter(v => v) : [];

  const formData = new FormData();
  formData.append('name', name);
  formData.append('brand', brand);
  formData.append('category', category);
  formData.append('price', price);
  formData.append('originalPrice', originalPrice || price);
  formData.append('discount', discount || 0);
  formData.append('stock', stock);
  formData.append('description', description);
  formData.append('specifications', specifications);
  formData.append('isActive', isActive);
  formData.append('colors', JSON.stringify(colors));
  formData.append('variants', JSON.stringify(variants));
  
  // Send color images
  colors.forEach(color => {
  const imgs = colorCroppedImages[color] || [];
  imgs.forEach((blob, i) => {
    if (blob) {
      formData.append('colorImages', blob, `color-${color}-${i}.jpg`);
      formData.append('colorImageMeta', JSON.stringify({ color, index: i }));
    }
  });
});

// Send variant images
variants.forEach(variant => {
  const blob = variantCroppedImages[variant];
  if (blob) {
    formData.append('variantImages', blob, `variant-${variant}.jpg`);
    formData.append('variantImageMeta', JSON.stringify({ variant }));
  }
});


  if (!id) {
    // ADD mode: send all cropped images
    croppedImages.forEach((blob, i) => {
      formData.append('images', blob, `image-${i}.jpg`);
    });
  } else {
    // EDIT mode: send replacement blobs with their indexes
    const replacementEntries = Object.entries(replacementBlobs);
    if (replacementEntries.length > 0) {
      replacementEntries.forEach(([index, blob]) => {
        formData.append('replacementImages', blob, `replace-${index}.jpg`);
        formData.append('replacementIndexes', index);
      });
    }
  }

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

// ----- Toggle status -----
async function toggleStatus(id) {
  const res = await fetch(`/api/admin/products/${id}/toggle-status`, { method: 'PUT' });
  const data = await res.json();
  showToast(data.message, res.ok ? 'success' : 'error');
  if (res.ok) loadProducts();
}

// ----- Delete -----
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

// ----- Admin logout -----
document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

loadProducts();