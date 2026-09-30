function formatPrice(price) {
  return 'Rs. ' + price.toLocaleString('en-LK');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-LK');
}

function statusBadge(status) {
  const labels = {
    available: 'Available',
    'out-of-stock': 'Out of Stock',
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed'
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

const PANEL_TITLES = {
  'web-dashboard': 'Website Dashboard',
  'ws-dashboard': 'Workshop Dashboard',
  orders: 'Customer Orders',
  products: 'Shop Products',
  'ws-products': 'Workshop Products',
  'add-product': 'Add Product',
  shops: 'Shops',
  sales: 'Shop Sales',
  settings: 'Website Settings'
};

const SYSTEM_KEY = 'woodcraft_admin_system';

let loginScreen, systemPicker, adminPanel, loginForm, loginError, logoutBtn, sidebarToggle, sidebar, panelTitle;
let currentSystem = '';

function getSavedSystem() {
  try {
    return sessionStorage.getItem(SYSTEM_KEY) || '';
  } catch (e) {
    return '';
  }
}

function saveSystem(name) {
  try {
    if (name) sessionStorage.setItem(SYSTEM_KEY, name);
    else sessionStorage.removeItem(SYSTEM_KEY);
  } catch (e) {}
}

function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  if (!panel) return;
  panel.classList.add('active');

  const navBtn = document.querySelector(`.sidebar-nav .nav-item[data-panel="${name}"]`);
  if (navBtn) navBtn.classList.add('active');

  panelTitle.textContent = PANEL_TITLES[name] || name;
  sidebar.classList.remove('open');
}

function openModal(id) {
  document.getElementById(id).hidden = false;
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
}

function showLogin() {
  loginScreen.hidden = false;
  systemPicker.hidden = true;
  adminPanel.hidden = true;
  saveSystem('');
}

function showSystemPicker() {
  loginScreen.hidden = true;
  systemPicker.hidden = false;
  adminPanel.hidden = true;
  saveSystem('');
}

function openSystem(system) {
  currentSystem = system;
  saveSystem(system);

  loginScreen.hidden = true;
  systemPicker.hidden = true;
  adminPanel.hidden = false;
  adminPanel.dataset.system = system;

  const navWebsite = document.getElementById('navWebsite');
  const navWorkshop = document.getElementById('navWorkshop');
  const label = document.getElementById('sidebarSystemLabel');
  const badge = document.getElementById('adminSystemBadge');

  if (system === 'website') {
    navWebsite.hidden = false;
    navWorkshop.hidden = true;
    label.textContent = 'Website System';
    badge.textContent = 'Website';
    refreshWebsite();
    showPanel('web-dashboard');
  } else {
    navWebsite.hidden = true;
    navWorkshop.hidden = false;
    label.textContent = 'Workshop System';
    badge.textContent = 'Workshop';
    refreshWorkshop();
    showPanel('ws-dashboard');
  }
}

let lockoutInterval = null;

async function handleLogin(e) {
  e.preventDefault();
  const passwordInput = document.getElementById('password');
  const password = passwordInput.value;
  const submitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';
  }

  const result = await authenticateAdmin(password);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }

  if (result.success) {
    if (lockoutInterval) clearInterval(lockoutInterval);
    loginError.hidden = true;
    passwordInput.value = '';
    showSystemPicker();
  } else {
    loginError.hidden = false;
    loginError.textContent = result.message || 'Incorrect password!';

    if (result.locked) {
      passwordInput.disabled = true;
      if (submitBtn) submitBtn.disabled = true;

      if (lockoutInterval) clearInterval(lockoutInterval);
      lockoutInterval = setInterval(() => {
        const rem = getLockoutRemainingSeconds();
        if (rem <= 0) {
          clearInterval(lockoutInterval);
          passwordInput.disabled = false;
          if (submitBtn) submitBtn.disabled = false;
          loginError.textContent = 'Lockout expired. You may try again.';
        } else {
          loginError.textContent = `Too many failed attempts. Locked out for ${rem}s.`;
        }
      }, 1000);
    }
  }
}

function renderWebsiteDashboard() {
  const stats = getDashboardStats('website');
  document.getElementById('statProducts').textContent = stats.totalProducts;
  document.getElementById('statInStock').textContent = stats.inStock;
  document.getElementById('statLowStock').textContent = stats.lowStock;
  document.getElementById('statSales').textContent = formatPrice(stats.totalSales);
  const ordersStat = document.getElementById('statOrders');
  if (ordersStat) ordersStat.textContent = stats.pendingOrdersCount || 0;

  const sales = getSales().slice(-5).reverse();
  document.querySelector('#recentSalesTable tbody').innerHTML = sales.length
    ? sales.map(s => `<tr><td>${formatDate(s.date)}</td><td>${escapeHtml(s.productName)}</td><td>${escapeHtml(s.customer)}</td><td>${formatPrice(s.total)}</td></tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#64748b">No sales yet</td></tr>';
}

function renderWorkshopDashboard() {
  const stats = getDashboardStats('workshop');
  document.getElementById('statWsProducts').textContent = stats.totalProducts;
  document.getElementById('statWsWorkshopQty').textContent = stats.workshopStockQty;
  document.getElementById('statWsShops').textContent = stats.totalShops;
  document.getElementById('statWsRetailQty').textContent = stats.retailStockQty;

  const products = getWorkshopProducts().slice(0, 6);
  document.querySelector('#wsRecentProductsTable tbody').innerHTML = products.length
    ? products.map(p => `<tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.stock || 0}</td>
        <td>${escapeHtml(CATEGORIES[p.category] || p.category)}</td>
        <td>${formatPrice(p.price)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:#64748b">No products yet</td></tr>';
}

function renderWsProducts() {
  const table = document.querySelector('#wsProductsTable tbody');
  if (!table) return;

  const products = getWorkshopProducts();
  table.innerHTML = products.map(p => {
    const designs = getProductDesigns(p);
    const minPrice = Math.min(...designs.map(d => d.price));
    const maxPrice = Math.max(...designs.map(d => d.price));
    const priceText = (designs.length > 1 && minPrice !== maxPrice)
      ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
      : formatPrice(p.price);

    return `
    <tr>
      <td>
        <div class="table-item">
          ${getProductThumbHtml(getPrimaryImage(p))}
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <span class="image-count-text">${escapeHtml(CATEGORIES[p.category] || p.category)} · Workshop DB</span>
          </div>
        </div>
      </td>
      <td><strong>${p.stock || 0}</strong></td>
      <td>
        <span class="image-count-text">Send to Website shops to sell</span>
      </td>
      <td>
        <div><strong>${priceText}</strong></div>
        <span class="table-designs-pill">✦ ${designs.length} variant${designs.length !== 1 ? 's' : ''}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-primary send-product-btn" data-id="${p.id}">To Shop</button>
          <button class="btn btn-sm btn-outline add-stock-product" data-id="${p.id}">+ Stock</button>
          <button class="btn-icon edit-ws-product" data-id="${p.id}" title="Edit">✏️</button>
          <button class="btn-icon danger delete-ws-product" data-id="${p.id}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `;
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:#64748b">No products in Workshop DB yet.</td></tr>';

  document.querySelectorAll('.send-product-btn').forEach(btn => {
    btn.addEventListener('click', () => openSendToShopModal(btn.dataset.id));
  });
  document.querySelectorAll('.add-stock-product').forEach(btn => {
    btn.addEventListener('click', () => openAddStockModal(btn.dataset.id));
  });
  document.querySelectorAll('.edit-ws-product').forEach(btn => {
    btn.addEventListener('click', () => editProductOnPage(btn.dataset.id));
  });
  document.querySelectorAll('.delete-ws-product').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this product from Workshop DB?')) {
        deleteWorkshopProduct(btn.dataset.id);
        refreshWorkshop();
      }
    });
  });
}

function renderShops() {
  const table = document.querySelector('#shopsTable tbody');
  if (!table) return;
  const shops = getShops();
  table.innerHTML = shops.map(s => `
    <tr>
      <td>
        <strong>${escapeHtml(s.name)}</strong>
        <div class="image-count-text">${escapeHtml(s.email || '')}</div>
      </td>
      <td>${escapeHtml(s.phone || '-')}</td>
      <td>${escapeHtml(s.address || '-')}</td>
      <td>${s.status === 'active' ? '<span class="badge badge-available">Active</span>' : '<span class="badge badge-out-of-stock">Inactive</span>'}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit-shop" data-id="${s.id}" title="Edit">✏️</button>
          <button class="btn-icon danger delete-shop" data-id="${s.id}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.edit-shop').forEach(btn => {
    btn.addEventListener('click', () => editShop(btn.dataset.id));
  });
  document.querySelectorAll('.delete-shop').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this shop from Website DB? Shop stock for this shop will be removed.')) return;
      const result = deleteShop(btn.dataset.id);
      if (result && result.ok === false) {
        alert(result.error);
        return;
      }
      refreshWorkshop();
      refreshWebsite();
    });
  });
}

let productImages = [];

function renderWorkshop() {
  // kept for compatibility — workshop now uses products
  renderWsProducts();
}

function openAddStockModal(productId = '') {
  const products = getWorkshopProducts();
  document.getElementById('convertOrderId').value = '';
  document.getElementById('convertSummary').textContent =
    'Workshop DB stock ekata quantity add karanna. Pasuwa Website shops walata Send to Shop kiyala yawanna.';

  document.getElementById('convertExistingProduct').innerHTML = products.length
    ? products.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name} (Workshop: ${p.stock || 0})</option>`).join('')
    : '<option value="">No products yet</option>';

  if (productId && products.some(p => p.id === productId)) {
    document.getElementById('convertMode').value = 'existing';
    document.getElementById('convertExistingWrap').hidden = false;
    document.getElementById('convertNameWrap').hidden = true;
    document.getElementById('convertName').required = false;
    const product = products.find(p => p.id === productId);
    document.getElementById('convertPrice').value = product.price;
    document.getElementById('convertCategory').value = product.category;
    document.getElementById('convertName').value = product.name;
    document.getElementById('convertDesc').value = product.description || '';
  } else {
    document.getElementById('convertMode').value = products.length ? 'existing' : 'new';
    const mode = document.getElementById('convertMode').value;
    document.getElementById('convertExistingWrap').hidden = mode !== 'existing';
    document.getElementById('convertNameWrap').hidden = mode === 'existing';
    document.getElementById('convertName').required = mode !== 'existing';
    document.getElementById('convertName').value = '';
    document.getElementById('convertPrice').value = '';
    document.getElementById('convertDesc').value = '';
    document.getElementById('convertCategory').value = 'tables';
  }

  document.getElementById('convertQty').value = '1';
  updateConvertCalc();
  openModal('convertModal');
}

function updateSendCalc() {
  const productId = document.getElementById('sendProduct').value;
  const shopId = document.getElementById('sendShop').value;
  const qty = Number(document.getElementById('sendQty').value) || 0;
  const product = getWorkshopProducts().find(p => p.id === productId);
  const shop = getShopById(shopId);
  const el = document.getElementById('sendCalcText');
  if (!product || !shop) {
    el.textContent = 'Select workshop product and website shop.';
    return;
  }
  el.textContent = `Workshop DB ${product.stock || 0} → send ${qty} to Website shop "${shop.name}"`;
}

function openSendToShopModal(productId = '') {
  const products = getWorkshopProducts().filter(p => Number(p.stock || 0) > 0);
  const shops = getActiveShops();

  document.getElementById('sendProduct').innerHTML = products.length
    ? products.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name} (Workshop: ${p.stock})</option>`).join('')
    : '<option value="">No workshop stock available</option>';

  document.getElementById('sendShop').innerHTML = shops.length
    ? shops.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
    : '<option value="">Add a shop in Website/Workshop Shops first</option>';

  document.getElementById('sendQty').value = '1';
  updateSendCalc();
  openModal('sendShopModal');
}

function openShopModal(shop = null) {
  document.getElementById('shopModalTitle').textContent = shop ? 'Edit Shop' : 'Add Shop';
  document.getElementById('shopId').value = shop ? shop.id : '';
  document.getElementById('shopNameInput').value = shop ? shop.name : '';
  document.getElementById('shopPhoneInput').value = shop ? shop.phone : '';
  document.getElementById('shopEmailInput').value = shop ? shop.email : '';
  document.getElementById('shopAddressInput').value = shop ? shop.address : '';
  document.getElementById('shopStatusInput').value = shop ? shop.status : 'active';
  openModal('shopModal');
}

function editShop(id) {
  const shop = getShopById(id);
  if (!shop) return;
  openShopModal(shop);
}

function fillSaleProductOptions() {
  const shopId = document.getElementById('saleShop').value;
  const hint = document.getElementById('saleStockHint');
  const products = shopId
    ? getProducts().filter(p => getProductShopStock(p, shopId) > 0)
    : [];

  document.getElementById('saleProduct').innerHTML = products.length
    ? products.map(p => `<option value="${p.id}" data-stock="${getProductShopStock(p, shopId)}" data-price="${p.price}">${p.name} (Stock: ${getProductShopStock(p, shopId)})</option>`).join('')
    : '<option value="">No stock in this shop</option>';

  hint.textContent = shopId
    ? (products.length ? `${products.length} products available in this shop.` : 'This shop has no product stock. Send stock from Workshop first.')
    : 'Select a shop to see available stock.';
}

function refreshWorkshop() {
  renderWorkshopDashboard();
  renderWsProducts();
  renderShops();
}

function renderSales() {
  const sales = getSales().slice().reverse();
  document.querySelector('#salesTable tbody').innerHTML = sales.length
    ? sales.map(s => `<tr>
        <td>${formatDate(s.date)}</td>
        <td>${escapeHtml(s.shopName || '-')}</td>
        <td>${escapeHtml(s.productName)}</td>
        <td>${s.quantity}</td>
        <td>${escapeHtml(s.customer)}</td>
        <td>${formatPrice(s.total)}</td>
      </tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:#64748b">No sales yet</td></tr>';
}

function renderProducts() {
  const products = getProducts();
  document.querySelector('#productsTable tbody').innerHTML = products.map(p => {
    const images = getProductImages(p);
    const retail = getRetailStockTotal(p);
    const designs = getProductDesigns(p);
    const minPrice = Math.min(...designs.map(d => d.price));
    const maxPrice = Math.max(...designs.map(d => d.price));
    const priceText = (designs.length > 1 && minPrice !== maxPrice)
      ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
      : formatPrice(p.price);

    return `
    <tr>
      <td>
        <div class="table-item">
          ${getProductThumbHtml(getPrimaryImage(p))}
          <div>
            <strong>${escapeHtml(p.name)}</strong>
            <span class="image-count-text">${images.length} image${images.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </td>
      <td>${escapeHtml(CATEGORIES[p.category] || p.category)}</td>
      <td>
        <div><strong>${priceText}</strong></div>
        <span class="table-designs-pill">✦ ${designs.length} variant${designs.length !== 1 ? 's' : ''}</span>
      </td>
      <td>
        <div>${retail} in shops</div>
        <span class="image-count-text">${formatShopStockSummary(p)}</span>
      </td>
      <td>${statusBadge(retail > 0 ? 'available' : 'out-of-stock')}</td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit-product" data-id="${p.id}" title="Edit">✏️</button>
          <button class="btn-icon danger delete-product" data-id="${p.id}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');

  document.querySelectorAll('.edit-product').forEach(btn => {
    btn.addEventListener('click', () => editProductOnPage(btn.dataset.id));
  });
  document.querySelectorAll('.delete-product').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this product from Website DB?')) {
        deleteWebsiteProduct(btn.dataset.id);
        refreshWebsite();
      }
    });
  });
}

function renderOrders() {
  const table = document.querySelector('#ordersTable tbody');
  if (!table) return;

  const filterEl = document.getElementById('ordersFilterStatus');
  const selectedStatus = filterEl ? filterEl.value : 'all';
  let orders = getOrders();

  if (selectedStatus !== 'all') {
    orders = orders.filter(o => o.status === selectedStatus);
  }

  if (!orders.length) {
    table.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:2rem;">No customer orders found.</td></tr>';
    return;
  }

  table.innerHTML = orders.map(o => {
    const channelBadge = o.channel === 'whatsapp'
      ? '<span class="badge badge-whatsapp">💬 WhatsApp</span>'
      : '<span class="badge badge-website">🌐 Website</span>';

    const itemsSummary = (o.items && o.items.length)
      ? o.items.map(item => `• <strong>${item.quantity}x ${escapeHtml(item.name)}</strong>${item.designName ? ` <em style="font-size:0.8rem;color:var(--text-muted);">(${escapeHtml(item.designName)})</em>` : ''}`).join('<br>')
      : '<span style="color:#64748b;">No item details</span>';

    const customerPhoneClean = o.phone ? o.phone.replace(/[^0-9]/g, '') : '';
    const waChatMsg = `Hello ${o.customerName}! This is Pendragon Furniture regarding your order ${o.orderNumber || ''}.`;
    const waChatUrl = customerPhoneClean ? getWhatsAppUrl(waChatMsg, o.phone) : '';

    return `
      <tr>
        <td>
          <strong>${escapeHtml(o.orderNumber || o.id)}</strong>
          <div class="image-count-text">${formatDate(o.date)}</div>
        </td>
        <td>
          <strong>${escapeHtml(o.customerName)}</strong>
          <div style="margin-top:0.25rem; display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
            <span>${escapeHtml(o.phone || '-')}</span>
            ${customerPhoneClean ? `<a href="${waChatUrl}" target="_blank" class="btn-whatsapp-chat" title="Chat on WhatsApp">💬 Chat</a>` : ''}
          </div>
          ${o.notes ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.2rem;">📝 ${escapeHtml(o.notes)}</div>` : ''}
        </td>
        <td>
          <span class="image-count-text">${escapeHtml(o.shopName || 'Main Showroom')}</span>
        </td>
        <td>${itemsSummary}</td>
        <td><strong>${formatPrice(o.total || 0)}</strong></td>
        <td>${channelBadge}</td>
        <td>
          <select class="status-select-sm order-status-select" data-id="${o.id}">
            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon view-invoice-btn" data-id="${o.id}" title="View &amp; Download Bill / PDF Invoice">📄</button>
            <button class="btn-icon danger delete-order-btn" data-id="${o.id}" title="Delete Order">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  table.querySelectorAll('.view-invoice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const order = getOrders().find(o => o.id === btn.dataset.id);
      if (order && window.PendragonInvoice) {
        PendragonInvoice.preview(order);
      }
    });
  });

  table.querySelectorAll('.order-status-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.value;
      updateOrderStatus(orderId, newStatus);
      renderOrders();
      renderWebsiteDashboard();
    });
  });

  table.querySelectorAll('.delete-order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this customer order?')) {
        deleteOrder(btn.dataset.id);
        renderOrders();
        renderWebsiteDashboard();
      }
    });
  });
}

function loadSettingsForm() {
  const s = getSettings();
  document.getElementById('setShopName').value = s.shopName;
  document.getElementById('setPhone').value = s.phone;
  if (document.getElementById('setWhatsApp')) {
    document.getElementById('setWhatsApp').value = s.whatsapp || '+94 77 234 5678';
  }
  document.getElementById('setEmail').value = s.email;
  document.getElementById('setAddress').value = s.address;
}

function renderProductImagesGallery() {
  const gallery = document.getElementById('imagesGallery');
  if (!productImages.length) {
    gallery.innerHTML = '<span class="preview-placeholder">No images added yet</span>';
    return;
  }
  gallery.innerHTML = productImages.map((src, i) => `
    <div class="gallery-item">
      ${isImageSource(src) ? `<img src="${src}" alt="Image ${i + 1}">` : `<span class="product-emoji">${src}</span>`}
      <button type="button" class="remove-image" data-index="${i}" title="Remove">&times;</button>
    </div>
  `).join('');

  gallery.querySelectorAll('.remove-image').forEach(btn => {
    btn.addEventListener('click', () => {
      productImages.splice(Number(btn.dataset.index), 1);
      renderProductImagesGallery();
    });
  });
}

function addProductImage(src) {
  if (!src) return;
  productImages.push(src);
  renderProductImagesGallery();
}

function resetProductImageFields() {
  productImages = [];
  document.getElementById('prodImageFile').value = '';
  document.getElementById('prodImageUrl').value = '';
  renderProductImagesGallery();
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 1024 * 1024) {
      reject(new Error(`"${file.name}" is too large. Max 1 MB per image.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

async function handleImageFiles(files) {
  for (const file of files) {
    try {
      const dataUrl = await readImageFile(file);
      if (dataUrl) addProductImage(dataUrl);
    } catch (err) {
      alert(err.message);
    }
  }
  document.getElementById('prodImageFile').value = '';
}

async function handlePageImageFiles(files) {
  for (const file of files) {
    try {
      const dataUrl = await readImageFile(file);
      if (dataUrl) {
        pageProductImages.push(dataUrl);
        renderPageProductImagesGallery();
      }
    } catch (err) {
      alert(err.message);
    }
  }
  document.getElementById('pageProdImageFile').value = '';
}

let pageProductImages = [];

function renderPageProductImagesGallery() {
  const gallery = document.getElementById('pageImagesGallery');
  if (!gallery) return;
  if (!pageProductImages.length) {
    gallery.innerHTML = '<span class="preview-placeholder">No images added yet</span>';
    return;
  }
  gallery.innerHTML = pageProductImages.map((src, i) => `
    <div class="gallery-item">
      ${isImageSource(src) ? `<img src="${src}" alt="Image ${i + 1}">` : `<span class="product-emoji">${src}</span>`}
      <button type="button" class="remove-image" data-index="${i}" title="Remove">&times;</button>
    </div>
  `).join('');

  gallery.querySelectorAll('.remove-image').forEach(btn => {
    btn.addEventListener('click', () => {
      pageProductImages.splice(Number(btn.dataset.index), 1);
      renderPageProductImagesGallery();
    });
  });
}

function collectDesignsFromEditor() {
  const container = document.getElementById('designsEditorRows');
  if (!container) return [];
  const rows = container.querySelectorAll('.design-editor-row');
  const list = [];
  rows.forEach(row => {
    const nameInput = row.querySelector('.design-name-input');
    const priceInput = row.querySelector('.design-price-input');
    const name = nameInput ? nameInput.value.trim() : '';
    const price = priceInput ? Number(priceInput.value) : 0;
    if (name) {
      list.push({ name, price: price >= 0 ? price : 0 });
    }
  });
  return list;
}

function renderDesignsEditor(designs = []) {
  const container = document.getElementById('designsEditorRows');
  if (!container) return;

  const basePrice = Number(document.getElementById('pageProdPrice').value) || 0;
  const list = (Array.isArray(designs) && designs.length > 0)
    ? designs
    : [{ name: 'Standard Edition', price: basePrice }];

  container.innerHTML = list.map((d, index) => `
    <div class="design-editor-row" data-index="${index}">
      <input type="text" class="design-name-input" placeholder="Design Name (e.g. Royal Crest Finish)" value="${escapeHtml(d.name)}" required>
      <input type="number" class="design-price-input" placeholder="Price (Rs.)" min="0" value="${d.price != null ? d.price : basePrice}" required>
      <button type="button" class="btn-remove-design" title="Remove Design variant">&times;</button>
    </div>
  `).join('');

  container.querySelectorAll('.btn-remove-design').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.target.closest('.design-editor-row');
      if (row) {
        if (container.querySelectorAll('.design-editor-row').length <= 1) {
          alert('A product must have at least one design variant.');
          return;
        }
        row.remove();
      }
    });
  });
}

function addDesignRow(name = '', price = null) {
  const container = document.getElementById('designsEditorRows');
  if (!container) return;
  const basePrice = Number(document.getElementById('pageProdPrice').value) || 0;
  const row = document.createElement('div');
  row.className = 'design-editor-row';
  row.innerHTML = `
    <input type="text" class="design-name-input" placeholder="Design Name (e.g. Royal Carved Crest)" value="${escapeHtml(name)}" required>
    <input type="number" class="design-price-input" placeholder="Price (Rs.)" min="0" value="${price != null ? price : basePrice}" required>
    <button type="button" class="btn-remove-design" title="Remove Design variant">&times;</button>
  `;
  row.querySelector('.btn-remove-design').addEventListener('click', () => {
    if (container.querySelectorAll('.design-editor-row').length <= 1) {
      alert('A product must have at least one design variant.');
      return;
    }
    row.remove();
  });
  container.appendChild(row);
  const nameInput = row.querySelector('.design-name-input');
  if (nameInput) nameInput.focus();
}

function resetAddProductPage() {
  const form = document.getElementById('addProductPageForm');
  if (!form) return;
  form.reset();
  document.getElementById('pageProductId').value = '';
  document.getElementById('pageProdStock').value = '1';
  document.getElementById('addProductPageTitle').textContent = 'Add Product';
  document.getElementById('pageProductSubmit').textContent = 'Save Product';
  pageProductImages = [];
  document.getElementById('pageProdImageFile').value = '';
  document.getElementById('pageProdImageUrl').value = '';
  renderPageProductImagesGallery();
  const cat = document.getElementById('pageProdCategory') ? document.getElementById('pageProdCategory').value : 'tables';
  renderDesignsEditor(getProductDesigns({ category: cat, price: 0 }));
  const success = document.getElementById('pageProductSuccess');
  if (success) success.hidden = true;
}

function editProductOnPage(id) {
  const p = currentSystem === 'workshop'
    ? getWorkshopProducts().find(pr => pr.id === id)
    : getProducts().find(pr => pr.id === id);
  if (!p) return;
  showPanel('add-product');
  document.getElementById('addProductPageTitle').textContent =
    currentSystem === 'workshop' ? 'Edit Workshop Product' : 'Edit Website Product';
  document.getElementById('pageProductSubmit').textContent = 'Update Product';
  document.getElementById('pageProductId').value = p.id;
  document.getElementById('pageProdName').value = p.name;
  document.getElementById('pageProdCategory').value = p.category;
  document.getElementById('pageProdPrice').value = p.price;
  document.getElementById('pageProdStock').value = currentSystem === 'workshop'
    ? (p.stock || 0)
    : getRetailStockTotal(p);
  document.getElementById('pageProdDesc').value = p.description || '';
  pageProductImages = [...getProductImages(p)];
  renderPageProductImagesGallery();
  renderDesignsEditor(p.designs && p.designs.length ? p.designs : getProductDesigns(p));
}

function updateConvertCalc() {
  const mode = document.getElementById('convertMode').value;
  const qty = Number(document.getElementById('convertQty').value) || 0;
  const calcText = document.getElementById('convertCalcText');
  if (mode === 'existing') {
    const productId = document.getElementById('convertExistingProduct').value;
    const product = getWorkshopProducts().find(p => p.id === productId);
    if (product) {
      const next = Number(product.stock || 0) + qty;
      calcText.textContent = `Workshop DB stock ${product.stock || 0} + ${qty} = ${next}. Then Send to Shop → Website DB.`;
    } else {
      calcText.textContent = `Selected quantity (${qty}) will be added to Workshop DB stock.`;
    }
  } else {
    calcText.textContent = `New product will be created in Workshop DB with stock = ${qty}.`;
  }
}

function openConvertModal(orderId) {
  const order = getWorkshopOrders().find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('convertOrderId').value = order.id;
  document.getElementById('convertSummary').textContent =
    `Workshop finished: "${order.item}" for ${order.customerName}. Calculate into shop products.`;
  document.getElementById('convertMode').value = 'new';
  document.getElementById('convertName').value = order.item;
  document.getElementById('convertCategory').value = order.category || 'tables';
  document.getElementById('convertQty').value = order.quantity || 1;
  document.getElementById('convertPrice').value = order.price;
  document.getElementById('convertDesc').value = order.description || '';

  const products = getWorkshopProducts();
  document.getElementById('convertExistingProduct').innerHTML = products.length
    ? products.map(p => `<option value="${p.id}">${p.name} (Workshop: ${p.stock})</option>`).join('')
    : '<option value="">No products yet</option>';

  document.getElementById('convertExistingWrap').hidden = true;
  document.getElementById('convertNameWrap').hidden = false;
  updateConvertCalc();
  openModal('convertModal');
}

function editOrder(id) {
  const o = getWorkshopOrders().find(ord => ord.id === id);
  if (!o) return;
  document.getElementById('orderModalTitle').textContent = 'Edit Order';
  document.getElementById('orderId').value = o.id;
  document.getElementById('orderCustomer').value = o.customerName;
  document.getElementById('orderPhone').value = o.phone;
  document.getElementById('orderItem').value = o.item;
  document.getElementById('orderQty').value = o.quantity || 1;
  document.getElementById('orderCategory').value = o.category || 'tables';
  document.getElementById('orderDesc').value = o.description;
  document.getElementById('orderPrice').value = o.price;
  document.getElementById('orderStatus').value = o.status;
  document.getElementById('orderStart').value = o.startDate;
  document.getElementById('orderDue').value = o.dueDate;
  openModal('orderModal');
}

function openAddOrderModal() {
  document.getElementById('orderModalTitle').textContent = 'Add Workshop Order';
  document.getElementById('orderForm').reset();
  document.getElementById('orderId').value = '';
  document.getElementById('orderQty').value = '1';
  document.getElementById('orderCategory').value = 'tables';
  document.getElementById('orderStart').value = new Date().toISOString().split('T')[0];
  openModal('orderModal');
}

function refreshWebsite() {
  renderWebsiteDashboard();
  renderOrders();
  renderProducts();
  renderSales();
  loadSettingsForm();
}

function setupAdmin() {
  loginScreen = document.getElementById('loginScreen');
  systemPicker = document.getElementById('systemPicker');
  adminPanel = document.getElementById('adminPanel');
  loginForm = document.getElementById('loginForm');
  loginError = document.getElementById('loginError');
  logoutBtn = document.getElementById('logoutBtn');
  sidebarToggle = document.getElementById('sidebarToggle');
  sidebar = document.getElementById('sidebar');
  panelTitle = document.getElementById('panelTitle');

  if (!loginForm || !adminPanel || !systemPicker) return;

  loginForm.addEventListener('submit', handleLogin);

  document.getElementById('openWebsiteSystem').addEventListener('click', () => openSystem('website'));
  document.getElementById('openWorkshopSystem').addEventListener('click', () => openSystem('workshop'));

  document.getElementById('pickerLogoutBtn').addEventListener('click', () => {
    logout();
    showLogin();
    loginForm.reset();
  });

  document.getElementById('switchSystemBtn').addEventListener('click', () => {
    showSystemPicker();
  });

  logoutBtn.addEventListener('click', () => {
    logout();
    showLogin();
    loginForm.reset();
  });

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  document.querySelectorAll('.sidebar-nav .nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.panel === 'add-product') {
        const editing = document.getElementById('pageProductId').value;
        if (!editing) resetAddProductPage();
      }
      showPanel(btn.dataset.panel);
    });
  });

  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.goto === 'add-product') resetAddProductPage();
      showPanel(btn.dataset.goto);
    });
  });

  document.getElementById('addStockBtn').addEventListener('click', () => openAddStockModal());
  document.getElementById('sendToShopBtn').addEventListener('click', () => openSendToShopModal());
  document.getElementById('quickSendToShopBtn').addEventListener('click', () => openSendToShopModal());
  document.getElementById('addShopBtn').addEventListener('click', () => openShopModal());

  document.getElementById('addSaleBtn').addEventListener('click', () => {
    const shops = getActiveShops();
    document.getElementById('saleShop').innerHTML = shops.length
      ? shops.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
      : '<option value="">Add a shop first</option>';
    document.getElementById('saleForm').reset();
    document.getElementById('saleDate').value = new Date().toISOString().split('T')[0];
    if (shops[0]) document.getElementById('saleShop').value = shops[0].id;
    fillSaleProductOptions();
    openModal('saleModal');
  });

  document.getElementById('saleShop').addEventListener('change', fillSaleProductOptions);

  ['formModal', 'orderModal', 'saleModal', 'convertModal', 'sendShopModal', 'shopModal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelector('.modal-backdrop').addEventListener('click', () => closeModal(id));
  });

  document.getElementById('formModalClose').addEventListener('click', () => closeModal('formModal'));
  document.getElementById('productCancel').addEventListener('click', () => closeModal('formModal'));
  document.getElementById('orderModalClose').addEventListener('click', () => closeModal('orderModal'));
  document.getElementById('orderCancel').addEventListener('click', () => closeModal('orderModal'));
  document.getElementById('saleModalClose').addEventListener('click', () => closeModal('saleModal'));
  document.getElementById('saleCancel').addEventListener('click', () => closeModal('saleModal'));
  document.getElementById('convertModalClose').addEventListener('click', () => closeModal('convertModal'));
  document.getElementById('convertCancel').addEventListener('click', () => closeModal('convertModal'));
  document.getElementById('sendShopModalClose').addEventListener('click', () => closeModal('sendShopModal'));
  document.getElementById('sendShopCancel').addEventListener('click', () => closeModal('sendShopModal'));
  document.getElementById('shopModalClose').addEventListener('click', () => closeModal('shopModal'));
  document.getElementById('shopCancel').addEventListener('click', () => closeModal('shopModal'));

  document.getElementById('sendProduct').addEventListener('change', updateSendCalc);
  document.getElementById('sendShop').addEventListener('change', updateSendCalc);
  document.getElementById('sendQty').addEventListener('input', updateSendCalc);

  document.getElementById('sendShopForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const result = sendProductToShop(
      document.getElementById('sendProduct').value,
      document.getElementById('sendShop').value,
      Number(document.getElementById('sendQty').value)
    );
    if (!result.ok) {
      alert(result.error);
      return;
    }
    closeModal('sendShopModal');
    refreshWorkshop();
    refreshWebsite();
    alert(`Sent to ${result.shop.name}!\n${result.product.name} x${result.quantity}`);
  });

  document.getElementById('shopForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('shopId').value;
    const payload = {
      name: document.getElementById('shopNameInput').value,
      phone: document.getElementById('shopPhoneInput').value,
      email: document.getElementById('shopEmailInput').value,
      address: document.getElementById('shopAddressInput').value,
      status: document.getElementById('shopStatusInput').value
    };
    if (id) updateShop(id, payload);
    else addShop(payload);
    closeModal('shopModal');
    refreshWorkshop();
  });

  document.getElementById('prodImageFile').addEventListener('change', (e) => {
    handleImageFiles([...e.target.files]);
  });

  document.getElementById('addImageUrlBtn').addEventListener('click', () => {
    const url = document.getElementById('prodImageUrl').value.trim();
    if (!url) return;
    addProductImage(url);
    document.getElementById('prodImageUrl').value = '';
  });

  document.getElementById('pageProdImageFile').addEventListener('change', (e) => {
    handlePageImageFiles([...e.target.files]);
  });

  document.getElementById('pageAddImageUrlBtn').addEventListener('click', () => {
    const url = document.getElementById('pageProdImageUrl').value.trim();
    if (!url) return;
    pageProductImages.push(url);
    renderPageProductImagesGallery();
    document.getElementById('pageProdImageUrl').value = '';
  });

  document.getElementById('addProductBackBtn').addEventListener('click', () => {
    showPanel(currentSystem === 'workshop' ? 'ws-products' : 'products');
  });

  document.getElementById('pageProductReset').addEventListener('click', resetAddProductPage);

  const addDesignBtn = document.getElementById('addDesignRowBtn');
  if (addDesignBtn) {
    addDesignBtn.addEventListener('click', () => addDesignRow());
  }

  const pageProdCat = document.getElementById('pageProdCategory');
  if (pageProdCat) {
    pageProdCat.addEventListener('change', () => {
      const id = document.getElementById('pageProductId').value;
      if (!id) {
        const base = Number(document.getElementById('pageProdPrice').value) || 0;
        renderDesignsEditor(getProductDesigns({ category: pageProdCat.value, price: base }));
      }
    });
  }

  document.getElementById('addProductPageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('pageProductId').value;
    const stock = Number(document.getElementById('pageProdStock').value);
    const collectedDesigns = collectDesignsFromEditor();

    const data = {
      name: document.getElementById('pageProdName').value,
      category: document.getElementById('pageProdCategory').value,
      images: pageProductImages.length ? [...pageProductImages] : ['🪑'],
      price: Number(document.getElementById('pageProdPrice').value),
      description: document.getElementById('pageProdDesc').value,
      status: stock > 0 ? 'available' : 'out-of-stock'
    };

    if (collectedDesigns.length > 0) {
      data.designs = collectedDesigns;
    }

    if (currentSystem === 'workshop') {
      data.stock = stock;
      if (id) updateWorkshopProduct(id, data);
      else addWorkshopProduct(data);
      refreshWorkshop();
    } else {
      // Website products keep stock per shop — edit updates details only
      if (id) updateWebsiteProduct(id, data);
      else addWebsiteProduct({ ...data, shopStock: {} });
      refreshWebsite();
    }

    const success = document.getElementById('pageProductSuccess');
    success.hidden = false;
    setTimeout(() => {
      success.hidden = true;
      resetAddProductPage();
      showPanel(currentSystem === 'workshop' ? 'ws-products' : 'products');
    }, 900);
  });

  document.getElementById('convertMode').addEventListener('change', () => {
    const mode = document.getElementById('convertMode').value;
    document.getElementById('convertExistingWrap').hidden = mode !== 'existing';
    document.getElementById('convertNameWrap').hidden = mode === 'existing';
    document.getElementById('convertName').required = mode !== 'existing';
    updateConvertCalc();
  });

  document.getElementById('convertQty').addEventListener('input', updateConvertCalc);
  document.getElementById('convertExistingProduct').addEventListener('change', updateConvertCalc);

  document.getElementById('convertForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = document.getElementById('convertMode').value;
    const quantity = Number(document.getElementById('convertQty').value) || 1;
    const price = Number(document.getElementById('convertPrice').value);
    const name = document.getElementById('convertName').value.trim();
    const category = document.getElementById('convertCategory').value;
    const description = document.getElementById('convertDesc').value;
    const existingId = document.getElementById('convertExistingProduct').value;

    let product = null;

    if (mode === 'existing') {
      if (!existingId) {
        alert('Select an existing product');
        return;
      }
      product = addStockToProduct(existingId, quantity, price);
    } else {
      if (!name) {
        alert('Enter a product name');
        return;
      }
      const match = findProductByName(name);
      if (match) {
        product = addStockToProduct(match.id, quantity, price);
      } else {
        product = addWorkshopProduct({
          name,
          category,
          price,
          stock: quantity,
          description,
          images: ['🪑'],
          status: 'available'
        });
      }
    }

    if (!product) {
      alert('Could not update products');
      return;
    }

    closeModal('convertModal');
    refreshWorkshop();
    alert(`Workshop DB stock updated!\n${product.name}\nNew stock: ${product.stock} (+${quantity})`);
  });

  document.getElementById('productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('productId').value;
    const data = {
      name: document.getElementById('prodName').value,
      category: document.getElementById('prodCategory').value,
      images: productImages.length ? [...productImages] : ['🪑'],
      price: Number(document.getElementById('prodPrice').value),
      description: document.getElementById('prodDesc').value
    };

    if (id) updateWebsiteProduct(id, data);
    else addWebsiteProduct({ ...data, shopStock: {} });

    closeModal('formModal');
    refreshWebsite();
  });

  document.getElementById('orderForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('orderId').value;
    const data = {
      customerName: document.getElementById('orderCustomer').value,
      phone: document.getElementById('orderPhone').value,
      item: document.getElementById('orderItem').value,
      quantity: Number(document.getElementById('orderQty').value) || 1,
      category: document.getElementById('orderCategory').value,
      description: document.getElementById('orderDesc').value,
      price: Number(document.getElementById('orderPrice').value),
      status: document.getElementById('orderStatus').value,
      startDate: document.getElementById('orderStart').value,
      dueDate: document.getElementById('orderDue').value,
      convertedToProduct: false
    };

    if (id) {
      const existing = getWorkshopOrders().find(o => o.id === id);
      data.convertedToProduct = existing ? !!existing.convertedToProduct : false;
      data.productId = existing ? existing.productId : undefined;
      updateWorkshopOrder(id, data);
    } else {
      addWorkshopOrder(data);
    }

    closeModal('orderModal');
    refreshWorkshop();
  });
  document.getElementById('saleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const productId = document.getElementById('saleProduct').value;
    const shopId = document.getElementById('saleShop').value;
    const product = getProducts().find(p => p.id === productId);
    const qty = Number(document.getElementById('saleQty').value);

    if (!product) {
      alert('Select a product');
      return;
    }

    const result = addSale({
      productId,
      shopId,
      quantity: qty,
      total: product.price * qty,
      date: document.getElementById('saleDate').value,
      customer: document.getElementById('saleCustomer').value
    });

    if (!result.ok) {
      alert(result.error || 'Sale failed');
      return;
    }

    closeModal('saleModal');
    refreshWebsite();
    refreshWorkshop();
  });

  const ordersFilter = document.getElementById('ordersFilterStatus');
  if (ordersFilter) {
    ordersFilter.addEventListener('change', renderOrders);
  }

  document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    updateSettings({
      shopName: document.getElementById('setShopName').value,
      phone: document.getElementById('setPhone').value,
      whatsapp: document.getElementById('setWhatsApp') ? document.getElementById('setWhatsApp').value : '+94 77 234 5678',
      email: document.getElementById('setEmail').value,
      address: document.getElementById('setAddress').value
    });
    const success = document.getElementById('settingsSuccess');
    success.hidden = false;
    setTimeout(() => { success.hidden = true; }, 3000);
  });

  if (isLoggedIn()) {
    const saved = getSavedSystem();
    if (saved === 'website' || saved === 'workshop') {
      openSystem(saved);
    } else {
      showSystemPicker();
    }
  } else {
    // Check if locked out on load
    const initialLock = getLockoutRemainingSeconds();
    if (initialLock > 0) {
      const passwordInput = document.getElementById('password');
      const submitBtn = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
      if (passwordInput) passwordInput.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
      if (loginError) {
        loginError.hidden = false;
        loginError.textContent = `Account locked. Please wait ${initialLock}s.`;
      }

      const timer = setInterval(() => {
        const rem = getLockoutRemainingSeconds();
        if (rem <= 0) {
          clearInterval(timer);
          if (passwordInput) passwordInput.disabled = false;
          if (submitBtn) submitBtn.disabled = false;
          if (loginError) loginError.textContent = 'You may try logging in now.';
        } else if (loginError) {
          loginError.textContent = `Account locked. Please wait ${rem}s.`;
        }
      }, 1000);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAdmin);
} else {
  setupAdmin();
}
