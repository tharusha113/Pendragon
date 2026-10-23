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
    visible: 'Visible',
    hidden: 'Hidden',
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
  gallery: 'Furniture Design Gallery & Albums',
  products: 'Shop Products',
  'ws-products': 'Workshop Products',
  'add-product': 'Add Product',
  shops: 'Shops',
  sales: 'Shop Sales',
  messages: 'Customer Inquiries & Messages',
  settings: 'Website Settings'
};

const SYSTEM_KEY = 'woodcraft_admin_system';

let loginScreen, systemPicker, adminPanel, loginForm, loginError, logoutBtn, sidebarToggle, sidebar, panelTitle;
let currentSystem = '';
let lastSavedProductId = null;

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

  if (name === 'gallery') {
    renderAdminGallery();
  }

  if (name === 'add-product') {
    const stockGroup = document.getElementById('pageProdStockGroup');
    const visGroup = document.getElementById('pageProdVisibilityGroup');
    if (stockGroup) stockGroup.hidden = (currentSystem === 'website');
    if (visGroup) visGroup.hidden = (currentSystem === 'workshop');
  }
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

let currentDeleteCallback = null;

function showAdminToast(message, type = 'success') {
  let container = document.querySelector('.admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'admin-toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `admin-toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'danger' ? '🗑️' : '✓'}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px) scale(0.96)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function showConfirmDeleteModal({ title, message, onConfirm }) {
  const modal = document.getElementById('confirmDeleteModal');
  if (!modal) {
    if (confirm(message)) onConfirm();
    return;
  }
  const titleEl = document.getElementById('confirmDeleteTitle');
  const msgEl = document.getElementById('confirmDeleteMessage');
  if (titleEl) titleEl.innerHTML = `<span>🗑️</span> ${escapeHtml(title || 'Confirm Delete')}`;
  if (msgEl) msgEl.textContent = message || 'Are you sure you want to delete this item?';
  currentDeleteCallback = onConfirm;
  openModal('confirmDeleteModal');
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
  const messagesStat = document.getElementById('statMessages');
  if (messagesStat) {
    const unread = stats.unreadMessagesCount || 0;
    messagesStat.textContent = `${stats.totalMessagesCount || 0}${unread > 0 ? ` (${unread} new)` : ''}`;
  }

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

    const isRecentlyAdded = p.id === lastSavedProductId;

    return `
    <tr class="${isRecentlyAdded ? 'row-highlight-new' : ''}">
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const product = getWorkshopProducts().find(p => p.id === id);
      const name = product ? product.name : 'this product';
      showConfirmDeleteModal({
        title: 'Delete Workshop Product',
        message: `Are you sure you want to delete "${name}" from Workshop DB?`,
        onConfirm: () => {
          deleteWorkshopProduct(id);
          renderWsProducts();
          renderWorkshopDashboard();
          showAdminToast(`Product "${name}" deleted from Workshop DB`, 'danger');
        }
      });
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const shop = getShopById(id);
      const name = shop ? shop.name : 'this shop';
      showConfirmDeleteModal({
        title: 'Delete Shop',
        message: `Delete shop "${name}" from Website DB? Any shop stock allocated for this shop will be removed.`,
        onConfirm: () => {
          const result = deleteShop(id);
          if (result && result.ok === false) {
            alert(result.error);
            return;
          }
          refreshWorkshop();
          refreshWebsite();
        }
      });
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
  const shopId = document.getElementById('saleShop') ? document.getElementById('saleShop').value : '';
  const prodSelect = document.getElementById('saleProduct');
  const priceInput = document.getElementById('salePrice');
  if (!prodSelect) return;

  const products = getProducts();
  prodSelect.innerHTML = products.length
    ? products.map(p => {
        const stockInShop = shopId ? getProductShopStock(p, shopId) : 0;
        return `<option value="${p.id}" data-price="${p.price}" data-stock="${stockInShop}">${escapeHtml(p.name)} — ${formatPrice(p.price)}${shopId ? ` (Stock: ${stockInShop})` : ''}</option>`;
      }).join('')
    : '<option value="">No products in catalog</option>';

  updateSalePriceAndCalc();
}

function updateSalePriceAndCalc() {
  const prodSelect = document.getElementById('saleProduct');
  const priceInput = document.getElementById('salePrice');
  const qtyInput = document.getElementById('saleQty');
  const calcText = document.getElementById('saleCalcText');
  if (!prodSelect || !priceInput) return;

  const selectedOpt = prodSelect.options[prodSelect.selectedIndex];
  if (selectedOpt && (!priceInput.value || priceInput.dataset.manual !== 'true')) {
    priceInput.value = selectedOpt.dataset.price || 0;
  }

  const qty = Number(qtyInput ? qtyInput.value : 1) || 1;
  const unitPrice = Number(priceInput.value || 0);
  const total = qty * unitPrice;

  if (calcText) {
    calcText.textContent = `Total: ${formatPrice(total)} (${qty} item${qty > 1 ? 's' : ''} × ${formatPrice(unitPrice)})`;
  }
}

function refreshWorkshop() {
  renderWorkshopDashboard();
  renderWsProducts();
  renderShops();
}

function renderSales() {
  const table = document.querySelector('#salesTable tbody');
  if (!table) return;

  const allSales = getSales();

  // Calculate top KPI numbers from allSales
  const totalRevenue = allSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const totalCount = allSales.length;

  const deliveredOrders = allSales.filter(s => Boolean(s.orderId));
  const deliveredOrdersTotal = deliveredOrders.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const deliveredOrdersCount = deliveredOrders.length;

  const directSales = allSales.filter(s => !s.orderId);
  const directRevenue = directSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const directCount = directSales.length;

  const avgValue = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

  // Update KPI card elements
  const elTotalRevenue = document.getElementById('salesTotalRevenue');
  if (elTotalRevenue) elTotalRevenue.textContent = formatPrice(totalRevenue);

  const elRealizedCount = document.getElementById('salesRealizedCount');
  if (elRealizedCount) elRealizedCount.textContent = `${totalCount} completed sale${totalCount !== 1 ? 's' : ''}`;

  const elDeliveredTotal = document.getElementById('salesDeliveredOrdersTotal');
  if (elDeliveredTotal) elDeliveredTotal.textContent = formatPrice(deliveredOrdersTotal);

  const elDeliveredCount = document.getElementById('salesDeliveredOrdersCount');
  if (elDeliveredCount) elDeliveredCount.textContent = `${deliveredOrdersCount} customer order${deliveredOrdersCount !== 1 ? 's' : ''} delivered`;

  const elDirectRevenue = document.getElementById('salesDirectRevenue');
  if (elDirectRevenue) elDirectRevenue.textContent = formatPrice(directRevenue);

  const elDirectCount = document.getElementById('salesDirectCount');
  if (elDirectCount) elDirectCount.textContent = `${directCount} showroom direct sale${directCount !== 1 ? 's' : ''}`;

  const elAvgValue = document.getElementById('salesAvgValue');
  if (elAvgValue) elAvgValue.textContent = formatPrice(avgValue);

  // Channel revenue breakdown calculation
  const websiteSalesTotal = allSales.filter(s => s.channel === 'website').reduce((sum, s) => sum + Number(s.total || 0), 0);
  const whatsappSalesTotal = allSales.filter(s => s.channel === 'whatsapp').reduce((sum, s) => sum + Number(s.total || 0), 0);
  const showroomSalesTotal = allSales.filter(s => s.channel === 'showroom' || (!s.channel && !s.orderId)).reduce((sum, s) => sum + Number(s.total || 0), 0);

  const webPct = totalRevenue > 0 ? Math.round((websiteSalesTotal / totalRevenue) * 100) : 0;
  const waPct = totalRevenue > 0 ? Math.round((whatsappSalesTotal / totalRevenue) * 100) : 0;
  const showPct = totalRevenue > 0 ? Math.max(0, 100 - webPct - waPct) : 0;

  const segWeb = document.querySelector('#salesChannelProgress .seg-website');
  const segWa = document.querySelector('#salesChannelProgress .seg-whatsapp');
  const segShow = document.querySelector('#salesChannelProgress .seg-showroom');
  if (segWeb) segWeb.style.width = `${webPct}%`;
  if (segWa) segWa.style.width = `${waPct}%`;
  if (segShow) segShow.style.width = `${showPct}%`;

  const channelPillsEl = document.getElementById('salesChannelPills');
  if (channelPillsEl) {
    channelPillsEl.innerHTML = `
      <span class="breakdown-pill">
        <span class="breakdown-pill-dot" style="background:#3b82f6;"></span>
        🌐 Web Orders: <strong>${formatPrice(websiteSalesTotal)}</strong> (${webPct}%)
      </span>
      <span class="breakdown-pill">
        <span class="breakdown-pill-dot" style="background:#10b981;"></span>
        💬 WhatsApp: <strong>${formatPrice(whatsappSalesTotal)}</strong> (${waPct}%)
      </span>
      <span class="breakdown-pill">
        <span class="breakdown-pill-dot" style="background:#f59e0b;"></span>
        🏪 Showroom: <strong>${formatPrice(showroomSalesTotal)}</strong> (${showPct}%)
      </span>
    `;
  }

  // Filter & Search
  const searchEl = document.getElementById('salesSearchInput');
  const searchQuery = searchEl ? searchEl.value.trim().toLowerCase() : '';

  const sourceFilterEl = document.getElementById('salesSourceFilter');
  const selectedSource = sourceFilterEl ? sourceFilterEl.value : 'all';

  const periodFilterEl = document.getElementById('salesPeriodFilter');
  const selectedPeriod = periodFilterEl ? periodFilterEl.value : 'all';

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.slice(0, 7); // YYYY-MM
  const thisYearStr = todayStr.slice(0, 4);  // YYYY

  let filtered = allSales.slice();

  // Source filtering
  if (selectedSource === 'orders') {
    filtered = filtered.filter(s => Boolean(s.orderId));
  } else if (selectedSource === 'showroom') {
    filtered = filtered.filter(s => !s.orderId);
  }

  // Period filtering
  if (selectedPeriod === 'today') {
    filtered = filtered.filter(s => String(s.date || '').startsWith(todayStr));
  } else if (selectedPeriod === 'month') {
    filtered = filtered.filter(s => String(s.date || '').startsWith(thisMonthStr));
  } else if (selectedPeriod === 'year') {
    filtered = filtered.filter(s => String(s.date || '').startsWith(thisYearStr));
  }

  // Search query
  if (searchQuery) {
    filtered = filtered.filter(s => {
      const num = String(s.orderNumber || s.id || '').toLowerCase();
      const cust = String(s.customer || '').toLowerCase();
      const phone = String(s.customerPhone || s.phone || '').replace(/[^0-9]/g, '');
      const cleanQ = searchQuery.replace(/[^0-9]/g, '');
      const prod = String(s.productName || '').toLowerCase();
      return num.includes(searchQuery) ||
             cust.includes(searchQuery) ||
             prod.includes(searchQuery) ||
             (cleanQ && phone.includes(cleanQ));
    });
  }

  if (!filtered.length) {
    table.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 2.75rem 1rem; color: #64748b;">
          <div style="font-size:2.5rem; margin-bottom: 0.5rem;">📦</div>
          <strong style="font-size: 1.05rem; display:block; margin-bottom:0.35rem; color: var(--text);">No Sales Records Found</strong>
          <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted); max-width: 440px; margin: 0 auto;">
            ${allSales.length === 0
              ? 'When customer orders are marked as <strong>Delivered</strong>, they automatically appear here with their revenue and receipts.'
              : 'No sales match your current search or filter criteria.'}
          </p>
          <div style="margin-top: 1rem; display:flex; justify-content:center; gap: 0.75rem; flex-wrap:wrap;">
            <button type="button" class="btn btn-sm btn-outline sales-goto-orders-btn">📋 View Customer Orders</button>
            <button type="button" class="btn btn-sm btn-primary sales-empty-add-btn">+ Record Counter Sale</button>
          </div>
        </td>
      </tr>
    `;
    const gotoOrders = table.querySelector('.sales-goto-orders-btn');
    if (gotoOrders) gotoOrders.addEventListener('click', () => showPanel('orders'));
    const emptyAddBtn = table.querySelector('.sales-empty-add-btn');
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => document.getElementById('addSaleBtn').click());
    return;
  }

  table.innerHTML = filtered.map(s => {
    const isOrderDelivery = Boolean(s.orderId);
    const badgeType = isOrderDelivery
      ? '<span class="receipt-badge type-order">🚚 Delivered Order</span>'
      : '<span class="receipt-badge type-direct">🏪 Counter Sale</span>';

    const channelBadge = s.channel === 'whatsapp'
      ? '<span class="badge badge-whatsapp">💬 WhatsApp</span>'
      : (s.channel === 'website' ? '<span class="badge badge-website">🌐 Website</span>' : '<span class="badge" style="background:#fef3c7; color:#92400e;">🏪 Showroom</span>');

    const customerPhoneClean = (s.customerPhone || s.phone) ? (s.customerPhone || s.phone).replace(/[^0-9]/g, '') : '';
    const waChatMsg = `Hello ${s.customer}! This is Pendragon Furniture regarding your receipt ${s.orderNumber || ''}.`;
    const waChatUrl = customerPhoneClean ? getWhatsAppUrl(waChatMsg, s.customerPhone || s.phone) : '';

    const itemsSummary = (s.items && s.items.length)
      ? s.items.map(i => `<span class="sales-item-pill">• ${i.quantity || 1}x ${escapeHtml(i.name)}${i.designName ? ` <em style="color:var(--text-muted);">(${escapeHtml(i.designName)})</em>` : ''}</span>`).join('<br>')
      : `<span class="sales-item-pill">${escapeHtml(s.productName || 'Showroom Item')}</span>`;

    return `
      <tr>
        <td>
          <strong style="color: var(--text);">${escapeHtml(s.orderNumber || s.id)}</strong>
          <div class="image-count-text">${formatDate(s.date)}</div>
          ${badgeType}
        </td>
        <td>
          <strong>${escapeHtml(s.customer)}</strong>
          <div style="margin-top:0.25rem; display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
            <span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(s.customerPhone || s.phone || '-')}</span>
            ${customerPhoneClean ? `<a href="${waChatUrl}" target="_blank" class="btn-whatsapp-chat" style="padding:0.15rem 0.45rem; font-size:0.7rem;" title="Chat on WhatsApp">💬 Chat</a>` : ''}
          </div>
        </td>
        <td>
          <div style="max-width: 260px;">${itemsSummary}</div>
        </td>
        <td>
          <div>${channelBadge}</div>
          <span class="image-count-text" style="margin-top:0.2rem; display:inline-block;">${escapeHtml(s.shopName || 'Main Showroom')}</span>
        </td>
        <td>
          <span class="sales-amount-cell">${formatPrice(s.total || 0)}</span>
        </td>
        <td>
          <span class="order-delivered-badge" style="font-size:0.72rem; padding:0.2rem 0.5rem;">✓ ${escapeHtml(s.paymentMethod || 'Paid')}</span>
        </td>
        <td>
          <div class="action-btns">
            <button type="button" class="btn-icon view-sale-invoice-btn" data-id="${s.id}" title="View &amp; Print Official Invoice / Bill">📄</button>
            <button type="button" class="btn-icon danger delete-sale-btn" data-id="${s.id}" title="Delete / Void Sale">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  table.querySelectorAll('.view-sale-invoice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sale = allSales.find(s => s.id === btn.dataset.id);
      if (!sale) return;
      if (window.PendragonInvoice) {
        const orderFormat = {
          id: sale.orderId || sale.id,
          orderNumber: sale.orderNumber || ('#REC-' + String(sale.id).slice(-4)),
          customerName: sale.customer,
          phone: sale.customerPhone || sale.phone,
          items: (sale.items && sale.items.length) ? sale.items : [{ name: sale.productName, quantity: sale.quantity || 1, price: Number(sale.total) / (sale.quantity || 1) }],
          total: sale.total,
          date: sale.date,
          shopName: sale.shopName || 'Main Showroom',
          notes: sale.notes || (sale.orderId ? 'Delivered Website Order' : 'Showroom Counter Direct Sale'),
          status: 'completed'
        };
        PendragonInvoice.preview(orderFormat);
      }
    });
  });

  table.querySelectorAll('.delete-sale-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const sale = allSales.find(s => s.id === id);
      const label = sale ? `sale "${sale.orderNumber || sale.productName}" (${formatPrice(sale.total)})` : 'this sale record';
      showConfirmDeleteModal({
        title: 'Delete Sale Record',
        message: `Are you sure you want to delete ${label}? Revenue statistics will be updated automatically.`,
        onConfirm: () => {
          deleteSale(id);
          renderSales();
          renderWebsiteDashboard();
          showAdminToast('Sale record deleted successfully', 'danger');
        }
      });
    });
  });
}

function renderProducts() {
  const products = getProducts();
  document.querySelector('#productsTable tbody').innerHTML = products.length ? products.map(p => {
    const images = getProductImages(p);
    const designs = getProductDesigns(p);
    const minPrice = Math.min(...designs.map(d => d.price));
    const maxPrice = Math.max(...designs.map(d => d.price));
    const priceText = (designs.length > 1 && minPrice !== maxPrice)
      ? `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`
      : formatPrice(p.price);
    const isHidden = p.status === 'hidden';

    const isRecentlyAdded = p.id === lastSavedProductId;

    return `
    <tr class="${isRecentlyAdded ? 'row-highlight-new' : ''}">
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
        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          ${isHidden
            ? '<span class="badge badge-out-of-stock">🙈 Hidden</span>'
            : '<span class="badge badge-available">👁️ Visible</span>'}
          <button type="button" class="btn btn-xs ${isHidden ? 'btn-primary' : 'btn-outline'} toggle-visibility-btn" data-id="${p.id}" title="${isHidden ? 'Show on Website' : 'Hide from Website'}">
            ${isHidden ? 'Show' : 'Hide'}
          </button>
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit-product" data-id="${p.id}" title="Edit">✏️</button>
          <button class="btn-icon danger delete-product" data-id="${p.id}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `;
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:#64748b">No products found</td></tr>';

  document.querySelectorAll('#productsTable .toggle-visibility-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const product = getProducts().find(pr => pr.id === id);
      if (!product) return;
      const newStatus = product.status === 'hidden' ? 'available' : 'hidden';
      updateWebsiteProduct(id, { status: newStatus });
      renderProducts();
      renderWebsiteDashboard();
    });
  });

  document.querySelectorAll('#productsTable .edit-product').forEach(btn => {
    btn.addEventListener('click', () => editProductOnPage(btn.dataset.id));
  });
  document.querySelectorAll('#productsTable .delete-product').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const product = getProducts().find(pr => pr.id === id);
      const name = product ? product.name : 'this product';
      showConfirmDeleteModal({
        title: 'Delete Website Product',
        message: `Delete "${name}" from Website DB? This item will be permanently removed from the website catalog.`,
        onConfirm: () => {
          deleteWebsiteProduct(id);
          renderProducts();
          renderWebsiteDashboard();
          showAdminToast(`Product "${name}" deleted from Website DB`, 'danger');
        }
      });
    });
  });
}

function generateOrderWhatsAppMessage(order) {
  const isCustom = Boolean(order.isCustom || order.type === 'custom' || String(order.orderNumber || '').includes('CUST'));
  const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : '';
  const pathname = window.location.pathname ? window.location.pathname.replace(/admin\.html.*$/, 'shop.html') : 'shop.html';
  const trackingUrl = `${origin}${pathname}#track-order?ref=${encodeURIComponent(order.orderNumber || order.id)}`;

  if (isCustom) {
    return `*🌟 PENDRAGON FURNITURE - CUSTOM ORDER CONFIRMATION 🌟*

ආයුබෝවන් / Dear *${order.customerName}*,
ඔබ Pendragon Furniture වෙත ලබාදුන් Custom Furniture Order එකෙහි විස්තර පහත දැක්වේ:

📋 *Order Reference:* ${order.orderNumber}
🛋️ *Custom Item:* ${order.customItemName || 'Custom Furniture'}
🪵 *Wood Type:* ${order.woodType || 'Hardwood'}
📏 *Dimensions:* ${order.dimensions || 'Custom Specification'}
🎨 *Polish / Finish:* ${order.finish || 'Standard'}
${order.fabricCushion ? `🛋️ *Fabric/Cushions:* ${order.fabricCushion}\n` : ''}
💰 *Total Agreed Price:* ${formatPrice(order.agreedPrice || order.total || 0)}
✅ *Advance Paid:* ${formatPrice(order.advancePaid || 0)}
⏳ *Balance Due on Delivery:* ${formatPrice(order.balanceDue || 0)}
${order.estimatedDeliveryDate ? `📅 *Estimated Completion Date:* ${order.estimatedDeliveryDate}\n` : ''}
📊 *Current Status:* ${order.status.toUpperCase()}

🔍 *Track Live Crafting & Delivery Status Anytime:*
👉 ${trackingUrl}

ඔබගේ අවශ්‍යතා අනුව භාණ්ඩය උසස් ප්‍රමිතියෙන් නිර්මාණය කෙරේ. කිසියම් වෙනසක් ඇත්නම් මෙම WhatsApp අංකයට දන්වන්න.
Thank you for choosing Pendragon Furniture!
📍 45, Furniture Lane, Moratuwa | 📞 011 234 5678`;
  } else {
    const itemsList = (order.items && order.items.length)
      ? order.items.map(i => `• ${i.quantity}x ${i.name}`).join('\n')
      : '• Furniture Item';
    const hasAdv = Boolean(order.advancePaid != null && Number(order.advancePaid) > 0);
    const balDue = Number(order.balanceDue != null ? order.balanceDue : Math.max(0, (order.total || 0) - (order.advancePaid || 0)));
    return `*🌟 PENDRAGON FURNITURE - ORDER DETAILS 🌟*

ආයුබෝවන් / Dear *${order.customerName}*,
Thank you for your order with Pendragon Furniture:

📋 *Order Number:* ${order.orderNumber}
📦 *Items Ordered:*
${itemsList}

💰 *Total Amount:* ${formatPrice(order.total || 0)}
${hasAdv ? `✅ *Advance Paid:* ${formatPrice(order.advancePaid)}\n⏳ *Balance Due on Delivery:* ${formatPrice(balDue)}\n` : ''}📊 *Status:* ${order.status.toUpperCase()}

🔍 *Track Live Status & View Bill Online:*
👉 ${trackingUrl}

Thank you! Pendragon Furniture Moratuwa.`;
  }
}

function renderOrders() {
  const table = document.querySelector('#ordersTable tbody');
  if (!table) return;

  const filterEl = document.getElementById('ordersFilterStatus');
  const selectedStatus = filterEl ? filterEl.value : 'all';
  const searchEl = document.getElementById('ordersSearchInput');
  const searchQuery = searchEl ? searchEl.value.trim().toLowerCase() : '';
  let orders = getOrders();

  if (selectedStatus === 'custom') {
    orders = orders.filter(o => o.isCustom || o.type === 'custom' || String(o.orderNumber || '').includes('CUST'));
  } else if (selectedStatus === 'standard') {
    orders = orders.filter(o => !o.isCustom && o.type !== 'custom' && !String(o.orderNumber || '').includes('CUST'));
  } else if (selectedStatus !== 'all') {
    orders = orders.filter(o => o.status === selectedStatus || (o.customStage && o.customStage === selectedStatus));
  }

  if (searchQuery) {
    orders = orders.filter(o => {
      const num = String(o.orderNumber || o.id || '').toLowerCase();
      const name = String(o.customerName || '').toLowerCase();
      const phone = String(o.phone || '').replace(/[^0-9]/g, '');
      const wood = String(o.woodType || '').toLowerCase();
      const item = String(o.customItemName || '').toLowerCase();
      const cleanQ = searchQuery.replace(/[^0-9]/g, '');
      return num.includes(searchQuery) ||
             name.includes(searchQuery) ||
             wood.includes(searchQuery) ||
             item.includes(searchQuery) ||
             (cleanQ && phone.includes(cleanQ));
    });
  }

  if (!orders.length) {
    table.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:2rem;">No customer orders found matching your criteria.</td></tr>';
    return;
  }

  table.innerHTML = orders.map(o => {
    const isCustom = Boolean(o.isCustom || o.type === 'custom' || String(o.orderNumber || '').includes('CUST'));

    let orderBadge = `<strong>${escapeHtml(o.orderNumber || o.id)}</strong>`;
    if (isCustom) {
      orderBadge += `<div style="margin-top:0.25rem;"><span class="custom-order-badge">✨ Custom Order</span></div>`;
    }

    let itemsSummary = '';
    if (isCustom) {
      itemsSummary = `
        <div style="font-weight:700; color:var(--text); font-size:0.92rem;">✨ ${escapeHtml(o.customItemName || 'Custom Furniture')}</div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem; line-height:1.45;">
          ${o.woodType ? `<span>🪵 <strong>Wood:</strong> ${escapeHtml(o.woodType)}</span><br>` : ''}
          ${o.dimensions ? `<span>📏 <strong>Size:</strong> ${escapeHtml(o.dimensions)}</span><br>` : ''}
          ${o.finish ? `<span>🎨 <strong>Finish:</strong> ${escapeHtml(o.finish)}</span><br>` : ''}
          ${o.fabricCushion ? `<span>🛋️ <strong>Fabric:</strong> ${escapeHtml(o.fabricCushion)}</span><br>` : ''}
          ${o.estimatedDeliveryDate ? `<span style="color:#d97706;">📅 <strong>Est. Due:</strong> ${escapeHtml(o.estimatedDeliveryDate)}</span>` : ''}
        </div>
      `;
    } else {
      itemsSummary = (o.items && o.items.length)
        ? o.items.map(item => `• <strong>${item.quantity}x ${escapeHtml(item.name)}</strong>${item.designName ? ` <em style="font-size:0.8rem;color:var(--text-muted);">(${escapeHtml(item.designName)})</em>` : ''}`).join('<br>')
        : '<span style="color:#64748b;">No item details</span>';
    }

    let financialsDisplay = '';
    if (isCustom) {
      financialsDisplay = `
        <div><strong>${formatPrice(o.agreedPrice || o.total || 0)}</strong></div>
        <div style="font-size:0.78rem; color:#10b981; margin-top:0.15rem; font-weight:600;">✓ Paid: ${formatPrice(o.advancePaid || 0)}</div>
        <div style="font-size:0.78rem; color:${Number(o.balanceDue || 0) > 0 ? '#d97706' : '#10b981'}; font-weight:700;">
          ⏳ Due: ${formatPrice(o.balanceDue || 0)}
        </div>
        <div style="margin-top:0.35rem; display:flex; gap:0.3rem; flex-wrap:wrap;">
          <button type="button" class="btn-advance-tag edit-custom-order-btn" data-id="${o.id}" title="Edit Custom Furniture Order">✏️ Edit Order</button>
          <button type="button" class="btn-advance-tag set-advance-btn" data-id="${o.id}" title="Record / Update Advance Payment">💵 Advance</button>
        </div>
      `;
    } else {
      const hasAdvance = Boolean(o.advancePaid != null && Number(o.advancePaid) > 0);
      const balanceDue = Number(o.balanceDue != null ? o.balanceDue : Math.max(0, (o.total || 0) - (o.advancePaid || 0)));
      financialsDisplay = `
        <div><strong>${formatPrice(o.total || 0)}</strong></div>
        ${hasAdvance ? `
          <div style="font-size:0.78rem; color:#10b981; margin-top:0.15rem; font-weight:600;">✓ Paid: ${formatPrice(o.advancePaid)}</div>
          <div style="font-size:0.78rem; color:${balanceDue > 0 ? '#d97706' : '#10b981'}; font-weight:700;">
            ⏳ Due: ${formatPrice(balanceDue)}
          </div>
          <div style="margin-top:0.35rem;">
            <button type="button" class="btn-advance-tag set-advance-btn" data-id="${o.id}" title="Update Advance Payment">✏️ Edit Advance</button>
          </div>
        ` : `
          <div style="font-size:0.76rem; color:var(--text-muted); margin-top:0.15rem;">No advance set</div>
          <div style="margin-top:0.35rem;">
            <button type="button" class="btn-advance-tag set-advance-btn" data-id="${o.id}" title="Record Customer Advance Payment">+ Advance Paid</button>
          </div>
        `}
      `;
    }

    const channelBadge = isCustom
      ? '<span class="badge badge-website" style="background:rgba(217,119,6,0.15); color:#d97706; border-color:rgba(217,119,6,0.35);">✨ Custom Request</span>'
      : (o.channel === 'whatsapp'
          ? '<span class="badge badge-whatsapp">💬 WhatsApp</span>'
          : '<span class="badge badge-website">🌐 Website</span>');

    const customerPhoneClean = o.phone ? o.phone.replace(/[^0-9]/g, '') : '';
    const waShareMsg = generateOrderWhatsAppMessage(o);
    const waShareUrl = customerPhoneClean ? `https://wa.me/${customerPhoneClean}?text=${encodeURIComponent(waShareMsg)}` : '';

    return `
      <tr style="${isCustom ? 'background: rgba(217, 119, 6, 0.02);' : ''}">
        <td>
          ${orderBadge}
          <div class="image-count-text">${formatDate(o.date)}</div>
        </td>
        <td>
          <strong>${escapeHtml(o.customerName)}</strong>
          <div style="margin-top:0.25rem; display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
            <span>${escapeHtml(o.phone || '-')}</span>
            ${customerPhoneClean ? `<a href="${waShareUrl}" target="_blank" class="btn-whatsapp-table" title="Send Order Details &amp; Tracking Link via WhatsApp">💬 Send WA</a>` : ''}
          </div>
          ${o.notes || o.craftsmanNotes ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.25rem;">📝 ${escapeHtml(o.notes || o.craftsmanNotes)}</div>` : ''}
        </td>
        <td>
          <span class="image-count-text">${escapeHtml(o.shopName || 'Main Showroom')}</span>
        </td>
        <td style="max-width:280px;">${itemsSummary}</td>
        <td>${financialsDisplay}</td>
        <td>${channelBadge}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:0.4rem; min-width:145px;">
            <select class="status-select-sm order-status-select" data-id="${o.id}">
              <option value="pending" ${o.status === 'pending' || o.status === 'received' ? 'selected' : ''}>⏳ Received / Pending</option>
              <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>📐 Confirmed / Measured</option>
              <option value="crafting" ${o.status === 'crafting' || o.status === 'in-production' ? 'selected' : ''}>🪵 In Crafting (Workshop)</option>
              <option value="polishing" ${o.status === 'polishing' ? 'selected' : ''}>✨ Polishing &amp; Finishing</option>
              <option value="completed" ${o.status === 'completed' || o.status === 'ready' ? 'selected' : ''}>✅ Delivered (Completed)</option>
              <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
            </select>
            ${o.status === 'completed' || o.status === 'ready'
              ? `<span class="order-delivered-badge">✓ Delivered to Customer</span><a href="javascript:void(0)" class="goto-sales-link" data-goto="sales">View in Sales &amp; Revenue →</a>`
              : (o.status !== 'cancelled' ? `<button type="button" class="btn-deliver-order" data-id="${o.id}" title="Deliver to Customer &amp; Add to Sales">🚚 Deliver &amp; Add to Sales</button>` : '')}
          </div>
        </td>
        <td>
          <div class="action-btns">
            ${isCustom ? `<button class="btn-icon edit-custom-order-btn" data-id="${o.id}" title="Edit Custom Furniture Order" style="color:var(--gold,#d97706); font-weight:bold;">✏️</button>` : ''}
            <button class="btn-icon set-advance-btn" data-id="${o.id}" title="Record / Update Advance Payment" style="color:#10b981; font-weight:bold;">💵</button>
            <button class="btn-icon view-invoice-btn" data-id="${o.id}" title="View &amp; Download Bill / PDF Invoice">📄</button>
            ${customerPhoneClean ? `<a href="${waShareUrl}" target="_blank" class="btn-icon" title="Send Tracking Link via WhatsApp" style="color:#25d366; text-decoration:none;">📱</a>` : ''}
            <button class="btn-icon danger delete-order-btn" data-id="${o.id}" title="Delete Order">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  table.querySelectorAll('.edit-custom-order-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditCustomOrderModal(btn.dataset.id);
    });
  });

  table.querySelectorAll('.set-advance-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openOrderAdvanceModal(btn.dataset.id);
    });
  });

  table.querySelectorAll('.btn-deliver-order').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const order = getOrders().find(o => o.id === id);
      if (!order) return;
      updateOrderStatus(id, 'completed');
      renderOrders();
      renderSales();
      renderWebsiteDashboard();
      showAdminToast(`Order ${order.orderNumber || order.id} marked as Delivered & added to Sales!`, 'success');
    });
  });

  table.querySelectorAll('.goto-sales-link').forEach(link => {
    link.addEventListener('click', () => showPanel('sales'));
  });

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
      const order = getOrders().find(o => o.id === orderId);
      updateOrderStatus(orderId, newStatus);
      renderOrders();
      renderSales();
      renderWebsiteDashboard();
      if (newStatus === 'completed') {
        showAdminToast(`Order ${order ? (order.orderNumber || order.id) : ''} delivered to customer and added to Sales!`, 'success');
      } else {
        showAdminToast(`Order status updated to ${newStatus}`, 'success');
      }
    });
  });

  table.querySelectorAll('.delete-order-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const order = getOrders().find(o => o.id === id);
      const label = order ? `order ${order.orderNumber || order.id} (${order.customerName})` : 'this customer order';
      showConfirmDeleteModal({
        title: 'Delete Order',
        message: `Are you sure you want to delete ${label}?`,
        onConfirm: () => {
          deleteOrder(id);
          renderOrders();
          renderSales();
          renderWebsiteDashboard();
        }
      });
    });
  });
}

function renderMessages() {
  const table = document.querySelector('#messagesTable tbody');
  if (!table) return;

  const messages = typeof getContactMessages === 'function' ? getContactMessages() : [];
  const unreadCount = messages.filter(m => m.status === 'unread').length;

  const badge = document.getElementById('messagesCountBadge');
  if (badge) badge.textContent = `${messages.length} Message${messages.length !== 1 ? 's' : ''} (${unreadCount} unread)`;

  const sidebarBadge = document.getElementById('sidebarMsgBadge');
  if (sidebarBadge) {
    sidebarBadge.textContent = unreadCount;
    sidebarBadge.hidden = (unreadCount === 0);
  }

  table.innerHTML = messages.length ? messages.map(m => {
    const isUnread = m.status === 'unread';
    const cleanPhone = m.phone ? String(m.phone).replace(/[^0-9]/g, '') : '';
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hello ' + m.name + '! Regarding your message on Pendragon Furniture...')}` : '';
    const mailUrl = m.email ? `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent('Pendragon Furniture - Regarding your inquiry')}` : '';

    return `
    <tr style="${isUnread ? 'background: rgba(37, 211, 102, 0.04); font-weight: 500;' : ''}">
      <td style="white-space:nowrap;">
        <div>${formatDate(m.date)}</div>
        <small style="color:var(--text-muted);">${m.date}</small>
      </td>
      <td>
        <strong>${escapeHtml(m.name)}</strong>
      </td>
      <td>
        <div>${m.email ? `<a href="${mailUrl}" style="color:var(--primary); text-decoration:underline;">${escapeHtml(m.email)}</a>` : '-'}</div>
        <small>${escapeHtml(m.phone || '-')}</small>
      </td>
      <td style="max-width: 320px; line-height: 1.5;">
        ${escapeHtml(m.message)}
      </td>
      <td>
        <span class="badge ${isUnread ? 'badge-pending' : 'badge-completed'}">
          ${isUnread ? '✉️ New' : '✓ Read'}
        </span>
      </td>
      <td>
        <div class="action-btns" style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
          ${waUrl ? `<a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-xs btn-whatsapp" title="Reply on WhatsApp">💬 WhatsApp</a>` : ''}
          ${mailUrl ? `<a href="${mailUrl}" class="btn btn-xs btn-outline" title="Send Email">✉️ Email</a>` : ''}
          <button type="button" class="btn btn-xs btn-outline toggle-msg-status" data-id="${m.id}">
            ${isUnread ? 'Mark Read' : 'Mark Unread'}
          </button>
          <button type="button" class="btn-icon danger delete-msg" data-id="${m.id}" title="Delete Message">🗑️</button>
        </div>
      </td>
    </tr>
    `;
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem;">No customer messages yet</td></tr>';

  table.querySelectorAll('.toggle-msg-status').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const msg = getContactMessages().find(m => m.id === id);
      if (!msg) return;
      markMessageStatus(id, msg.status === 'unread' ? 'read' : 'unread');
      renderMessages();
      renderWebsiteDashboard();
    });
  });

  table.querySelectorAll('.delete-msg').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      showConfirmDeleteModal({
        title: 'Delete Message',
        message: 'Are you sure you want to delete this customer inquiry message?',
        onConfirm: () => {
          deleteContactMessage(id);
          renderMessages();
          renderWebsiteDashboard();
        }
      });
    });
  });
}

function loadSettingsForm() {
  const s = (typeof getSettings === 'function') ? (getSettings() || {}) : {};
  if (document.getElementById('setShopName')) {
    document.getElementById('setShopName').value = s.shopName || 'Pendragon Furniture';
  }
  if (document.getElementById('setPhone')) {
    document.getElementById('setPhone').value = s.phone || '+94 11 234 5678';
  }
  if (document.getElementById('setWhatsApp')) {
    document.getElementById('setWhatsApp').value = s.whatsapp || s.phone || '+94 77 234 5678';
  }
  if (document.getElementById('setEmail')) {
    document.getElementById('setEmail').value = s.email || 'info@woodcraft.lk';
  }
  if (document.getElementById('setAddress')) {
    document.getElementById('setAddress').value = s.address || '45, Furniture Lane, Moratuwa';
  }
  updateFirebaseUI();
}

function updateFirebaseUI() {
  const badge = document.getElementById('firebaseStatusBadge');
  const textarea = document.getElementById('fbQuickPaste');
  if (!badge) return;
  const isReady = typeof isFirebaseConfigured === 'function' && isFirebaseConfigured();
  if (isReady) {
    badge.className = 'badge badge-available';
    badge.textContent = '🟢 Connected to Cloud Firestore';
  } else {
    badge.className = 'badge badge-out-of-stock';
    badge.textContent = '🟡 Local Storage Mode';
  }

  if (textarea && typeof getActiveFirebaseConfig === 'function') {
    const cfg = getActiveFirebaseConfig();
    if (cfg && cfg.apiKey) {
      textarea.value = JSON.stringify(cfg, null, 2);
    }
  }
}

function parseFirebaseConfigInput(text) {
  text = String(text || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {}

  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const jsonStr = match[0]
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"');
      return JSON.parse(jsonStr);
    } catch (e) {}

    const extract = (key) => {
      const m = text.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
      return m ? m[1] : '';
    };
    const parsed = {
      apiKey: extract('apiKey'),
      authDomain: extract('authDomain'),
      projectId: extract('projectId'),
      storageBucket: extract('storageBucket'),
      messagingSenderId: extract('messagingSenderId'),
      appId: extract('appId')
    };
    if (parsed.apiKey && parsed.projectId) return parsed;
  }
  return null;
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
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error(`"${file.name}" is too large. Max 10 MB per image.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 800;
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to efficient JPEG (~40-70KB)
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressed);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
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
  const visSelect = document.getElementById('pageProdVisibility');
  if (visSelect) visSelect.value = 'available';

  const stockGroup = document.getElementById('pageProdStockGroup');
  const visGroup = document.getElementById('pageProdVisibilityGroup');
  if (stockGroup) stockGroup.hidden = (currentSystem === 'website');
  if (visGroup) visGroup.hidden = (currentSystem === 'workshop');

  document.getElementById('addProductPageTitle').textContent =
    currentSystem === 'workshop' ? 'Add Workshop Product' : 'Add Website Product';
  document.getElementById('pageProductSubmit').textContent = 'Save Product';
  pageProductImages = [];
  document.getElementById('pageProdImageFile').value = '';
  document.getElementById('pageProdImageUrl').value = '';
  renderPageProductImagesGallery();
  const cat = document.getElementById('pageProdCategory') ? document.getElementById('pageProdCategory').value : 'tables';
  renderDesignsEditor(getProductDesigns({ category: cat, price: 0 }));
  const success = document.getElementById('pageProductSuccess');
  if (success) success.hidden = true;
  const deleteBtn = document.getElementById('pageProductDeleteBtn');
  if (deleteBtn) deleteBtn.hidden = true;
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
    : (p.stock || 0);

  const stockGroup = document.getElementById('pageProdStockGroup');
  const visGroup = document.getElementById('pageProdVisibilityGroup');
  if (stockGroup) stockGroup.hidden = (currentSystem === 'website');
  if (visGroup) visGroup.hidden = (currentSystem === 'workshop');

  const visSelect = document.getElementById('pageProdVisibility');
  if (visSelect) {
    visSelect.value = (p.status === 'hidden') ? 'hidden' : 'available';
  }

  document.getElementById('pageProdDesc').value = p.description || '';
  pageProductImages = [...getProductImages(p)];
  renderPageProductImagesGallery();
  renderDesignsEditor(p.designs && p.designs.length ? p.designs : getProductDesigns(p));

  const deleteBtn = document.getElementById('pageProductDeleteBtn');
  if (deleteBtn) {
    deleteBtn.hidden = false;
    deleteBtn.onclick = () => {
      showConfirmDeleteModal({
        title: currentSystem === 'workshop' ? 'Delete Workshop Product' : 'Delete Website Product',
        message: `Delete "${p.name}"? This item will be permanently removed.`,
        onConfirm: () => {
          if (currentSystem === 'workshop') {
            deleteWorkshopProduct(p.id);
            refreshWorkshop();
            showPanel('ws-products');
          } else {
            deleteWebsiteProduct(p.id);
            refreshWebsite();
            showPanel('products');
          }
          showAdminToast(`Product "${p.name}" deleted successfully`, 'danger');
        }
      });
    };
  }
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
  renderMessages();
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
    const shopSelect = document.getElementById('saleShop');
    if (shopSelect) {
      shopSelect.innerHTML = shops.length
        ? shops.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')
        : '<option value="">Main Showroom</option>';
      if (shops[0]) shopSelect.value = shops[0].id;
    }
    const form = document.getElementById('saleForm');
    if (form) form.reset();
    const dateInput = document.getElementById('saleDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    const priceInput = document.getElementById('salePrice');
    if (priceInput) delete priceInput.dataset.manual;
    fillSaleProductOptions();
    openModal('saleModal');
  });

  document.getElementById('saleShop').addEventListener('change', fillSaleProductOptions);
  document.getElementById('saleProduct').addEventListener('change', () => {
    const priceInput = document.getElementById('salePrice');
    if (priceInput) delete priceInput.dataset.manual;
    updateSalePriceAndCalc();
  });
  document.getElementById('salePrice').addEventListener('input', () => {
    document.getElementById('salePrice').dataset.manual = 'true';
    updateSalePriceAndCalc();
  });
  document.getElementById('saleQty').addEventListener('input', updateSalePriceAndCalc);

  ['formModal', 'orderModal', 'saleModal', 'convertModal', 'sendShopModal', 'shopModal', 'confirmDeleteModal', 'customOrderModal', 'customOrderShareModal', 'orderAdvanceModal'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const backdrop = el.querySelector('.modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => closeModal(id));
  });

  // Custom Order Modals Close
  const custModalClose = document.getElementById('customOrderModalClose');
  if (custModalClose) custModalClose.addEventListener('click', () => closeModal('customOrderModal'));
  const custCancelBtn = document.getElementById('customOrderCancelBtn');
  if (custCancelBtn) custCancelBtn.addEventListener('click', () => closeModal('customOrderModal'));
  const custShareClose = document.getElementById('customOrderShareCloseBtn');
  if (custShareClose) custShareClose.addEventListener('click', () => closeModal('customOrderShareModal'));

  // Advance Payment Modal Close
  const advModalClose = document.getElementById('orderAdvanceModalClose');
  if (advModalClose) advModalClose.addEventListener('click', () => closeModal('orderAdvanceModal'));
  const advCancelBtn = document.getElementById('orderAdvanceCancelBtn');
  if (advCancelBtn) advCancelBtn.addEventListener('click', () => closeModal('orderAdvanceModal'));

  // Open Custom Order Modal Button (New Order Mode)
  const openCustomOrderBtn = document.getElementById('openCustomOrderModalBtn');
  if (openCustomOrderBtn) {
    openCustomOrderBtn.addEventListener('click', () => {
      const form = document.getElementById('customOrderForm');
      if (form) form.reset();
      const idEl = document.getElementById('custOrderId');
      if (idEl) idEl.value = '';
      const titleEl = document.getElementById('customOrderModalTitle');
      if (titleEl) titleEl.textContent = 'New Custom Furniture Order';
      const iconEl = document.getElementById('customOrderModalIcon');
      if (iconEl) iconEl.textContent = '✨';
      const submitBtn = document.getElementById('customOrderSubmitBtn');
      if (submitBtn) submitBtn.textContent = '✨ Save & Generate #CUST Number';

      const estDateInput = document.getElementById('custOrderEstDate');
      if (estDateInput) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        estDateInput.value = d.toISOString().split('T')[0];
      }
      const dateInput = document.getElementById('custOrderDate');
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
      const statusEl = document.getElementById('custOrderStatus');
      if (statusEl) statusEl.value = 'pending';

      updateCustomOrderCalc();
      openModal('customOrderModal');
    });
  }

  // Open Custom Order in EDIT Mode
  window.openEditCustomOrderModal = function(id) {
    const order = getOrders().find(o => o.id === id);
    if (!order) return;

    const form = document.getElementById('customOrderForm');
    if (form) form.reset();

    const idEl = document.getElementById('custOrderId');
    if (idEl) idEl.value = order.id;

    const titleEl = document.getElementById('customOrderModalTitle');
    if (titleEl) titleEl.textContent = `Edit Custom Furniture Order ${order.orderNumber || ''}`;
    const iconEl = document.getElementById('customOrderModalIcon');
    if (iconEl) iconEl.textContent = '✏️';
    const submitBtn = document.getElementById('customOrderSubmitBtn');
    if (submitBtn) submitBtn.textContent = `💾 Update Custom Order ${order.orderNumber || ''}`;

    const custNameEl = document.getElementById('custOrderCustomerName');
    if (custNameEl) custNameEl.value = order.customerName || '';
    const phoneEl = document.getElementById('custOrderPhone');
    if (phoneEl) phoneEl.value = order.phone || '';
    const emailEl = document.getElementById('custOrderEmail');
    if (emailEl) emailEl.value = order.email || '';

    // Extract delivery address from notes if present
    let rawNotes = order.notes || '';
    let address = '';
    if (rawNotes.includes(' | Delivery: ')) {
      const parts = rawNotes.split(' | Delivery: ');
      rawNotes = parts[0];
      address = parts[1] || '';
    } else if (rawNotes.startsWith('Delivery: ')) {
      address = rawNotes.replace('Delivery: ', '');
      rawNotes = '';
    }
    const addrEl = document.getElementById('custOrderAddress');
    if (addrEl) addrEl.value = address;
    const notesEl = document.getElementById('custOrderNotes');
    if (notesEl) notesEl.value = rawNotes;

    const itemEl = document.getElementById('custOrderItemName');
    if (itemEl) itemEl.value = order.customItemName || order.item || '';
    const woodEl = document.getElementById('custOrderWoodType');
    if (woodEl && order.woodType) woodEl.value = order.woodType;
    const dimEl = document.getElementById('custOrderDimensions');
    if (dimEl) dimEl.value = order.dimensions || '';
    const finishEl = document.getElementById('custOrderFinish');
    if (finishEl && order.finish) finishEl.value = order.finish;
    const fabricEl = document.getElementById('custOrderFabric');
    if (fabricEl) fabricEl.value = order.fabricCushion || '';

    const priceEl = document.getElementById('custOrderPrice');
    if (priceEl) priceEl.value = order.agreedPrice || order.total || 0;
    const advEl = document.getElementById('custOrderAdvance');
    if (advEl) advEl.value = order.advancePaid || 0;
    const pmEl = document.getElementById('custOrderPaymentMethod');
    if (pmEl && order.paymentMethod) pmEl.value = order.paymentMethod;
    const estEl = document.getElementById('custOrderEstDate');
    if (estEl && order.estimatedDeliveryDate) estEl.value = order.estimatedDeliveryDate;
    const statusEl = document.getElementById('custOrderStatus');
    if (statusEl) statusEl.value = order.status || 'pending';
    const dateEl = document.getElementById('custOrderDate');
    if (dateEl) dateEl.value = order.date || new Date().toISOString().split('T')[0];

    updateCustomOrderCalc();
    openModal('customOrderModal');
  };

  // Live calculation for Custom Order Modal
  function updateCustomOrderCalc() {
    const priceVal = parseFloat(document.getElementById('custOrderPrice')?.value || '0') || 0;
    const advanceVal = parseFloat(document.getElementById('custOrderAdvance')?.value || '0') || 0;
    const balanceVal = Math.max(0, priceVal - advanceVal);

    const totalEl = document.getElementById('custCalcTotalDisplay');
    const advanceEl = document.getElementById('custCalcAdvanceDisplay');
    const balanceEl = document.getElementById('custCalcBalanceDisplay');

    if (totalEl) totalEl.textContent = formatPrice(priceVal);
    if (advanceEl) advanceEl.textContent = '- ' + formatPrice(advanceVal);
    if (balanceEl) balanceEl.textContent = formatPrice(balanceVal);
  }

  const custPriceInput = document.getElementById('custOrderPrice');
  if (custPriceInput) custPriceInput.addEventListener('input', updateCustomOrderCalc);
  const custAdvanceInput = document.getElementById('custOrderAdvance');
  if (custAdvanceInput) custAdvanceInput.addEventListener('input', updateCustomOrderCalc);

  // Preset buttons for custom order modal
  document.querySelectorAll('.btn-cust-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const pct = parseFloat(btn.dataset.pct || '0');
      const priceVal = parseFloat(document.getElementById('custOrderPrice')?.value || '0') || 0;
      const computed = Math.round(priceVal * pct);
      const advInput = document.getElementById('custOrderAdvance');
      if (advInput) {
        advInput.value = computed > 0 ? computed : (pct === 0 ? 0 : '');
        updateCustomOrderCalc();
      }
    });
  });

  // Submit Handler for Custom Order Form (Both Create and Edit)
  const customOrderForm = document.getElementById('customOrderForm');
  if (customOrderForm) {
    customOrderForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const editId = document.getElementById('custOrderId')?.value;
      const customerName = document.getElementById('custOrderCustomerName').value.trim();
      const phone = document.getElementById('custOrderPhone').value.trim();
      const email = document.getElementById('custOrderEmail').value.trim();
      const address = document.getElementById('custOrderAddress').value.trim();
      const customItemName = document.getElementById('custOrderItemName').value.trim();
      const woodType = document.getElementById('custOrderWoodType').value;
      const dimensions = document.getElementById('custOrderDimensions').value.trim();
      const finish = document.getElementById('custOrderFinish').value;
      const fabricCushion = document.getElementById('custOrderFabric').value.trim();
      const notes = document.getElementById('custOrderNotes').value.trim();
      const agreedPrice = parseFloat(document.getElementById('custOrderPrice').value) || 0;
      const advancePaid = parseFloat(document.getElementById('custOrderAdvance').value) || 0;
      const paymentMethod = document.getElementById('custOrderPaymentMethod').value;
      const estimatedDeliveryDate = document.getElementById('custOrderEstDate').value;
      const statusVal = document.getElementById('custOrderStatus')?.value || 'pending';
      const orderDateVal = document.getElementById('custOrderDate')?.value || new Date().toISOString().split('T')[0];
      const balanceDue = Math.max(0, agreedPrice - advancePaid);

      if (!customerName || !phone || !customItemName || agreedPrice <= 0) {
        alert('Please fill in Customer Name, Phone, Custom Item Name, and Agreed Price.');
        return;
      }

      if (editId) {
        // EDIT MODE
        const updatedOrder = updateCustomOrder(editId, {
          customerName,
          phone,
          email,
          customItemName,
          woodType,
          dimensions,
          finish,
          fabricCushion,
          notes: notes + (address ? ` | Delivery: ${address}` : ''),
          agreedPrice,
          advancePaid,
          balanceDue,
          paymentMethod,
          estimatedDeliveryDate,
          total: agreedPrice,
          status: statusVal,
          customStage: statusVal,
          date: orderDateVal
        });

        closeModal('customOrderModal');
        renderOrders();
        renderWebsiteDashboard();
        renderSales();
        showAdminToast(`Custom Order ${updatedOrder ? (updatedOrder.orderNumber || '') : ''} updated successfully!`, 'success');
        return;
      }

      // CREATE MODE
      const newCustomOrder = addCustomOrder({
        customerName,
        phone,
        email,
        customItemName,
        woodType,
        dimensions,
        finish,
        fabricCushion,
        notes: notes + (address ? ` | Delivery: ${address}` : ''),
        agreedPrice,
        advancePaid,
        balanceDue,
        paymentMethod,
        estimatedDeliveryDate,
        total: agreedPrice,
        status: statusVal,
        customStage: statusVal,
        date: orderDateVal
      });

      closeModal('customOrderModal');
      renderOrders();
      renderWebsiteDashboard();

      // Configure Share Modal
      const shareNumber = document.getElementById('shareCustNumber');
      const shareItem = document.getElementById('shareCustItem');
      const shareCustomer = document.getElementById('shareCustCustomer');
      const shareTotal = document.getElementById('shareCustTotal');
      const shareAdvance = document.getElementById('shareCustAdvance');
      const shareBalance = document.getElementById('shareCustBalance');
      const shareWhatsAppBtn = document.getElementById('shareCustWhatsAppBtn');
      const copyDetailsBtn = document.getElementById('copyCustDetailsBtn');
      const previewBillBtn = document.getElementById('previewCustInvoiceBtn');

      if (shareNumber) shareNumber.textContent = newCustomOrder.orderNumber;
      if (shareItem) shareItem.textContent = `${newCustomOrder.customItemName} (${newCustomOrder.woodType})`;
      if (shareCustomer) shareCustomer.textContent = `Customer: ${newCustomOrder.customerName} (${newCustomOrder.phone})`;
      if (shareTotal) shareTotal.textContent = formatPrice(newCustomOrder.agreedPrice);
      if (shareAdvance) shareAdvance.textContent = formatPrice(newCustomOrder.advancePaid);
      if (shareBalance) shareBalance.textContent = formatPrice(newCustomOrder.balanceDue);

      const waMsg = generateOrderWhatsAppMessage(newCustomOrder);
      const cleanPhone = newCustomOrder.phone.replace(/[^0-9]/g, '');

      if (shareWhatsAppBtn) {
        shareWhatsAppBtn.onclick = () => {
          const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}` : getWhatsAppUrl(waMsg);
          window.open(url, '_blank');
        };
      }

      if (copyDetailsBtn) {
        copyDetailsBtn.onclick = () => {
          navigator.clipboard.writeText(waMsg).then(() => {
            showAdminToast('Order summary and live tracking link copied to clipboard!', 'success');
          }).catch(() => {
            alert('Failed to copy. Please copy manually.');
          });
        };
      }

      if (previewBillBtn) {
        previewBillBtn.onclick = () => {
          if (window.PendragonInvoice) {
            PendragonInvoice.preview(newCustomOrder);
          }
        };
      }

      openModal('customOrderShareModal');
      showAdminToast(`Custom order ${newCustomOrder.orderNumber} created successfully!`, 'success');
    });
  }

  // ===== Advance Payment Modal for Other Orders / Standard Orders =====
  window.openOrderAdvanceModal = function(id) {
    const order = getOrders().find(o => o.id === id);
    if (!order) return;

    const form = document.getElementById('orderAdvanceForm');
    if (form) form.reset();

    const idInput = document.getElementById('advanceOrderId');
    if (idInput) idInput.value = order.id;

    const numBadge = document.getElementById('advCardOrderNum');
    if (numBadge) numBadge.textContent = order.orderNumber || order.id;
    const channelEl = document.getElementById('advCardChannel');
    if (channelEl) {
      channelEl.textContent = order.isCustom ? '✨ Custom Workshop Order' : (order.channel === 'whatsapp' ? '💬 WhatsApp Order' : '🌐 Website Order');
    }
    const custEl = document.getElementById('advCardCustomer');
    if (custEl) custEl.textContent = `${order.customerName} (${order.phone || 'No phone'})`;
    const itemsEl = document.getElementById('advCardItems');
    if (itemsEl) {
      if (order.isCustom) {
        itemsEl.textContent = `✨ ${order.customItemName || 'Custom Furniture'} (${order.woodType || ''})`;
      } else {
        itemsEl.textContent = (order.items && order.items.length)
          ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
          : (order.item || 'Furniture Item');
      }
    }

    const total = Number(order.agreedPrice || order.total || 0);
    const currentAdvance = Number(order.advancePaid || 0);

    const totalInput = document.getElementById('advanceTotalDisplay');
    if (totalInput) totalInput.value = total;
    const advInput = document.getElementById('advancePaidInput');
    if (advInput) advInput.value = currentAdvance > 0 ? currentAdvance : '';

    if (order.paymentMethod) {
      const pmSelect = document.getElementById('advancePaymentMethod');
      if (pmSelect) pmSelect.value = order.paymentMethod;
    }

    const dateInput = document.getElementById('advancePaymentDate');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    updateAdvanceCalc();
    openModal('orderAdvanceModal');
  };

  function updateAdvanceCalc() {
    const total = parseFloat(document.getElementById('advanceTotalDisplay')?.value || '0') || 0;
    const advance = parseFloat(document.getElementById('advancePaidInput')?.value || '0') || 0;
    const balance = Math.max(0, total - advance);

    const totalEl = document.getElementById('advCalcTotalDisplay');
    const paidEl = document.getElementById('advCalcPaidDisplay');
    const balEl = document.getElementById('advCalcBalanceDisplay');

    if (totalEl) totalEl.textContent = formatPrice(total);
    if (paidEl) paidEl.textContent = '- ' + formatPrice(advance);
    if (balEl) {
      if (advance >= total && total > 0) {
        balEl.innerHTML = '<span style="color:#10b981; font-weight:700;">✓ Fully Paid (Rs. 0 Balance)</span>';
      } else {
        balEl.textContent = formatPrice(balance);
      }
    }
  }

  const advPaidField = document.getElementById('advancePaidInput');
  if (advPaidField) advPaidField.addEventListener('input', updateAdvanceCalc);

  // Preset buttons for standard order advance modal
  document.querySelectorAll('.btn-standard-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const pct = parseFloat(btn.dataset.pct || '0');
      const total = parseFloat(document.getElementById('advanceTotalDisplay')?.value || '0') || 0;
      const computed = Math.round(total * pct);
      const advInput = document.getElementById('advancePaidInput');
      if (advInput) {
        advInput.value = computed > 0 ? computed : (pct === 0 ? 0 : '');
        updateAdvanceCalc();
      }
    });
  });

  // Submit Handler for Advance Payment Form
  const orderAdvanceForm = document.getElementById('orderAdvanceForm');
  if (orderAdvanceForm) {
    orderAdvanceForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const orderId = document.getElementById('advanceOrderId').value;
      const advancePaid = parseFloat(document.getElementById('advancePaidInput').value) || 0;
      const paymentMethod = document.getElementById('advancePaymentMethod').value;
      const paymentRef = document.getElementById('advancePaymentRef').value.trim();

      const updated = updateOrderAdvance(orderId, advancePaid, paymentMethod, paymentRef);
      if (!updated) {
        alert('Order not found.');
        return;
      }

      closeModal('orderAdvanceModal');
      renderOrders();
      renderWebsiteDashboard();
      renderSales();
      showAdminToast(`Advance payment of ${formatPrice(advancePaid)} recorded for ${updated.orderNumber || ''}!`, 'success');
    });
  }

  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      closeModal('confirmDeleteModal');
      if (typeof currentDeleteCallback === 'function') {
        const cb = currentDeleteCallback;
        currentDeleteCallback = null;
        cb();
      }
    });
  }
  const confirmDeleteClose = document.getElementById('confirmDeleteClose');
  if (confirmDeleteClose) confirmDeleteClose.addEventListener('click', () => closeModal('confirmDeleteModal'));
  const confirmDeleteCancel = document.getElementById('confirmDeleteCancelBtn');
  if (confirmDeleteCancel) confirmDeleteCancel.addEventListener('click', () => closeModal('confirmDeleteModal'));

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
    const stockInput = document.getElementById('pageProdStock');
    const stock = stockInput ? Number(stockInput.value) || 0 : 0;
    const visInput = document.getElementById('pageProdVisibility');
    const visibility = visInput ? visInput.value : 'available';
    const collectedDesigns = collectDesignsFromEditor();

    const data = {
      name: document.getElementById('pageProdName').value,
      category: document.getElementById('pageProdCategory').value,
      images: pageProductImages.length ? [...pageProductImages] : ['🪑'],
      price: Number(document.getElementById('pageProdPrice').value),
      description: document.getElementById('pageProdDesc').value,
      status: currentSystem === 'workshop' ? (stock > 0 ? 'available' : 'out-of-stock') : visibility
    };

    if (collectedDesigns.length > 0) {
      data.designs = collectedDesigns;
    }

    let savedItem = null;
    if (currentSystem === 'workshop') {
      data.stock = stock;
      if (id) savedItem = updateWorkshopProduct(id, data);
      else savedItem = addWorkshopProduct(data);
      refreshWorkshop();
    } else {
      if (id) savedItem = updateWebsiteProduct(id, data);
      else savedItem = addWebsiteProduct({ ...data, shopStock: {} });
      refreshWebsite();
    }

    const savedId = (savedItem && savedItem.id) || id || null;
    lastSavedProductId = savedId;

    const success = document.getElementById('pageProductSuccess');
    const successDetails = document.getElementById('pageProductSuccessDetails');
    if (successDetails) {
      const dbLabel = currentSystem === 'workshop' ? 'Workshop DB' : 'Website DB';
      successDetails.textContent = `"${data.name}" (${formatPrice(data.price)}) was successfully saved in ${dbLabel}.`;
    }
    if (success) {
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  const btnSuccessView = document.getElementById('pageSuccessViewList');
  if (btnSuccessView) {
    btnSuccessView.addEventListener('click', () => {
      const success = document.getElementById('pageProductSuccess');
      if (success) success.hidden = true;
      resetAddProductPage();
      showPanel(currentSystem === 'workshop' ? 'ws-products' : 'products');
    });
  }

  const btnSuccessAddMore = document.getElementById('pageSuccessAddAnother');
  if (btnSuccessAddMore) {
    btnSuccessAddMore.addEventListener('click', () => {
      const success = document.getElementById('pageProductSuccess');
      if (success) success.hidden = true;
      resetAddProductPage();
      const nameInput = document.getElementById('pageProdName');
      if (nameInput) nameInput.focus();
    });
  }

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
    const qty = Number(document.getElementById('saleQty').value) || 1;
    const unitPrice = Number(document.getElementById('salePrice').value) || (product ? product.price : 0);
    const customer = document.getElementById('saleCustomer').value.trim() || 'Walk-in Customer';
    const phone = document.getElementById('salePhone') ? document.getElementById('salePhone').value.trim() : '';
    const paymentMethod = document.getElementById('salePaymentMethod') ? document.getElementById('salePaymentMethod').value : 'Cash';
    const date = document.getElementById('saleDate').value || new Date().toISOString().split('T')[0];

    const total = unitPrice * qty;

    const result = addSale({
      productId: product ? product.id : '',
      productName: product ? product.name : 'Showroom Item',
      shopId,
      quantity: qty,
      total,
      date,
      customer,
      phone,
      paymentMethod,
      channel: 'showroom'
    });

    if (!result.ok) {
      alert(result.error || 'Sale failed');
      return;
    }

    closeModal('saleModal');
    renderSales();
    renderWebsiteDashboard();
    showAdminToast(`Counter direct sale recorded: ${formatPrice(total)}`, 'success');
  });

  const salesSearchInput = document.getElementById('salesSearchInput');
  if (salesSearchInput) salesSearchInput.addEventListener('input', renderSales);

  const salesSourceFilter = document.getElementById('salesSourceFilter');
  if (salesSourceFilter) salesSourceFilter.addEventListener('change', renderSales);

  const salesPeriodFilter = document.getElementById('salesPeriodFilter');
  if (salesPeriodFilter) salesPeriodFilter.addEventListener('change', renderSales);

  const printSalesReportBtn = document.getElementById('printSalesReportBtn');
  if (printSalesReportBtn) {
    printSalesReportBtn.addEventListener('click', () => {
      window.print();
    });
  }

  const ordersFilter = document.getElementById('ordersFilterStatus');
  if (ordersFilter) {
    ordersFilter.addEventListener('change', renderOrders);
  }

  const ordersSearch = document.getElementById('ordersSearchInput');
  if (ordersSearch) {
    ordersSearch.addEventListener('input', renderOrders);
  }

  document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = updateSettings({
      shopName: document.getElementById('setShopName').value.trim(),
      phone: document.getElementById('setPhone').value.trim(),
      whatsapp: document.getElementById('setWhatsApp') ? document.getElementById('setWhatsApp').value.trim() : '+94 77 234 5678',
      email: document.getElementById('setEmail').value.trim(),
      address: document.getElementById('setAddress').value.trim()
    });
    const success = document.getElementById('settingsSuccess');
    if (success) {
      success.textContent = 'Settings saved and synchronized with website successfully!';
      success.hidden = false;
      setTimeout(() => { success.hidden = true; }, 3500);
    }
  });

  const fbForm = document.getElementById('firebaseConfigForm');
  if (fbForm) {
    fbForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawText = document.getElementById('fbQuickPaste').value;
      const parsed = parseFirebaseConfigInput(rawText);
      const successEl = document.getElementById('firebaseSuccess');

      if (!parsed || !parsed.apiKey || !parsed.projectId) {
        alert('Invalid Firebase configuration! Please paste a valid snippet containing apiKey and projectId.');
        return;
      }

      saveFirebaseConfig(parsed);
      updateFirebaseUI();

      if (typeof pushWebsiteDbToFirebase === 'function') {
        await pushWebsiteDbToFirebase(getWebsiteDb());
      }
      if (typeof pushWorkshopDbToFirebase === 'function') {
        await pushWorkshopDbToFirebase(getWorkshopDb());
      }

      if (successEl) {
        successEl.textContent = 'Firebase connected & database synchronized!';
        successEl.hidden = false;
        setTimeout(() => { successEl.hidden = true; }, 3500);
      }
    });
  }

  const clearFbBtn = document.getElementById('clearFirebaseBtn');
  if (clearFbBtn) {
    clearFbBtn.addEventListener('click', () => {
      if (confirm('Disconnect Firebase and switch back to Local Browser Storage?')) {
        localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
        const textarea = document.getElementById('fbQuickPaste');
        if (textarea) textarea.value = '';
        if (typeof initFirebase === 'function') initFirebase(true);
        updateFirebaseUI();
        alert('Switched back to Local Browser Storage mode.');
      }
    });
  }

/* ==========================================================================
   ADMIN DESIGN GALLERY & ALBUM MANAGER
   ========================================================================== */

let modalAlbumPhotos = [];

function renderAdminGallery() {
  const grid = document.getElementById('adminGalleryGrid');
  if (!grid || typeof getGalleryAlbums !== 'function') return;

  const albums = getGalleryAlbums();

  // Update Stats KPI
  const totalAlbumsEl = document.getElementById('adminStatTotalAlbums');
  const totalPhotosEl = document.getElementById('adminStatTotalPhotos');
  const timberTypesEl = document.getElementById('adminStatTimberTypes');

  const totalPhotos = albums.reduce((sum, a) => sum + ((a.photos || []).length), 0);
  const timberSet = new Set(albums.map(a => (a.woodType || '').trim()).filter(Boolean));

  if (totalAlbumsEl) totalAlbumsEl.textContent = albums.length;
  if (totalPhotosEl) totalPhotosEl.textContent = totalPhotos;
  if (timberTypesEl) timberTypesEl.textContent = `${Math.max(timberSet.size, 4)}+`;

  // Search and Category filtering
  const searchInput = document.getElementById('adminGallerySearchInput');
  const catFilter = document.getElementById('adminGalleryCategoryFilter');

  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const cat = catFilter ? catFilter.value : 'all';

  let filtered = albums;
  if (cat !== 'all') {
    filtered = filtered.filter(a => (a.category || '').toLowerCase() === cat.toLowerCase());
  }
  if (q) {
    filtered = filtered.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.woodType || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:3rem 1rem; color:var(--text-muted); background:var(--bg-card); border-radius:12px; border:1px dashed var(--border);">
        <div style="font-size:2.2rem; margin-bottom:0.5rem;">🖼️</div>
        <strong style="font-size:1.05rem; display:block; color:var(--text);">No Design Albums Found</strong>
        <p style="margin:0.25rem 0 0 0; font-size:0.88rem;">${albums.length === 0 ? 'Click "+ Add New Design Album" to create your first furniture design showcase album.' : 'No albums match your search/category filter.'}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(album => {
    const photos = album.photos || [];
    const coverUrl = album.coverImage || (photos[0] ? photos[0].url : 'images/logo.jpg');
    return `
      <div class="admin-alb-card" data-id="${album.id}">
        <div class="admin-alb-media">
          <img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(album.title)}" loading="lazy">
          <span class="admin-alb-badge">📷 ${photos.length} Photo${photos.length !== 1 ? 's' : ''}</span>
          <span class="admin-alb-cat">${escapeHtml(album.category || 'design')}</span>
        </div>
        <div class="admin-alb-body">
          <h4 class="admin-alb-title">${escapeHtml(album.title)}</h4>
          <div class="admin-alb-meta">🌿 ${escapeHtml(album.woodType || 'Solid Teak')}${album.finish ? ' • ' + escapeHtml(album.finish) : ''}</div>
          <p class="admin-alb-desc">${escapeHtml(album.description || 'No description added.')}</p>
          <div class="admin-alb-actions">
            <button type="button" class="btn btn-outline btn-sm admin-preview-alb-btn" data-id="${album.id}">
              <span>👁️</span> Zoom View
            </button>
            <button type="button" class="btn btn-outline btn-sm admin-edit-alb-btn" data-id="${album.id}">
              <span>✏️</span> Edit Album
            </button>
            <button type="button" class="btn btn-danger btn-sm admin-del-alb-btn" data-id="${album.id}" style="margin-left:auto;">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach button events
  grid.querySelectorAll('.admin-preview-alb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (window.PendragonGallery) {
        PendragonGallery.openLightbox(id, 0);
      }
    });
  });

  grid.querySelectorAll('.admin-edit-alb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openGalleryAlbumModal(btn.dataset.id);
    });
  });

  grid.querySelectorAll('.admin-del-alb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const album = getGalleryAlbumById(id);
      showConfirmDeleteModal({
        title: 'Delete Design Album',
        message: `Are you sure you want to delete album "${album ? album.title : ''}" and its photos from the website gallery?`,
        onConfirm: () => {
          deleteGalleryAlbum(id);
          renderAdminGallery();
          showAdminToast('Design album deleted successfully.', 'danger');
        }
      });
    });
  });
}

function renderModalPhotosGrid() {
  const container = document.getElementById('albModalPhotosGrid');
  const countBadge = document.getElementById('albModalPhotoCount');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${modalAlbumPhotos.length} Photo${modalAlbumPhotos.length !== 1 ? 's' : ''}`;
  }

  if (!modalAlbumPhotos.length) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
        No photos added yet. Enter a URL or choose an image file above, then click "+ Add Photo".
      </div>
    `;
    return;
  }

  container.innerHTML = modalAlbumPhotos.map((photo, i) => `
    <div class="alb-modal-photo-item" data-index="${i}">
      <img src="${escapeHtml(photo.url)}" alt="Photo ${i + 1}">
      ${i === 0 ? '<span class="alb-photo-cover-tag">Cover</span>' : ''}
      <button type="button" class="alb-photo-del-btn" data-index="${i}" title="Remove photo">&times;</button>
      ${i !== 0 ? `<button type="button" class="alb-photo-set-cover-btn" data-index="${i}">Set as Cover</button>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.alb-photo-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      modalAlbumPhotos.splice(idx, 1);
      renderModalPhotosGrid();
    });
  });

  container.querySelectorAll('.alb-photo-set-cover-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      const chosen = modalAlbumPhotos.splice(idx, 1)[0];
      modalAlbumPhotos.unshift(chosen);
      renderModalPhotosGrid();
    });
  });
}

function openGalleryAlbumModal(albumId = null) {
  const modal = document.getElementById('galleryAlbumModal');
  const form = document.getElementById('galleryAlbumForm');
  const titleEl = document.getElementById('galleryAlbumModalTitle');
  if (!modal || !form) return;

  form.reset();
  modalAlbumPhotos = [];

  const editIdInput = document.getElementById('albEditId');
  const albTitleInput = document.getElementById('albTitle');
  const albCatSelect = document.getElementById('albCategory');
  const albWoodInput = document.getElementById('albWoodType');
  const albFinishInput = document.getElementById('albFinish');
  const albDescInput = document.getElementById('albDesc');

  if (albumId) {
    const album = getGalleryAlbumById(albumId);
    if (!album) return;
    if (titleEl) titleEl.textContent = 'Edit Design Album';
    if (editIdInput) editIdInput.value = album.id;
    if (albTitleInput) albTitleInput.value = album.title || '';
    if (albCatSelect) albCatSelect.value = album.category || 'dining';
    if (albWoodInput) albWoodInput.value = album.woodType || '';
    if (albFinishInput) albFinishInput.value = album.finish || '';
    if (albDescInput) albDescInput.value = album.description || '';
    modalAlbumPhotos = (album.photos || []).map(p => ({ ...p }));
  } else {
    if (titleEl) titleEl.textContent = 'Add New Design Album';
    if (editIdInput) editIdInput.value = '';
    if (albWoodInput) albWoodInput.value = 'Seasoned Moratuwa Teak';
  }

  renderModalPhotosGrid();
  modal.hidden = false;
  modal.classList.add('is-open');
}

function closeGalleryAlbumModal() {
  const modal = document.getElementById('galleryAlbumModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.hidden = true;
  modalAlbumPhotos = [];
}

function initAdminGallery() {
  const openBtn = document.getElementById('openAddGalleryAlbumBtn');
  if (openBtn) {
    openBtn.addEventListener('click', () => openGalleryAlbumModal(null));
  }

  const closeBtn = document.getElementById('galleryAlbumCloseBtn');
  const cancelBtn = document.getElementById('galleryAlbumCancelBtn');
  const backdrop = document.getElementById('galleryAlbumBackdrop');

  if (closeBtn) closeBtn.addEventListener('click', closeGalleryAlbumModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeGalleryAlbumModal);
  if (backdrop) backdrop.addEventListener('click', closeGalleryAlbumModal);

  // Add Photo Button in Modal
  const addPhotoBtn = document.getElementById('albAddPhotoBtn');
  if (addPhotoBtn) {
    addPhotoBtn.addEventListener('click', async () => {
      const urlInput = document.getElementById('albNewPhotoUrl');
      const fileInput = document.getElementById('albNewPhotoFile');
      const captionInput = document.getElementById('albNewPhotoCaption');

      const urlVal = urlInput ? urlInput.value.trim() : '';
      const fileVal = (fileInput && fileInput.files && fileInput.files[0]) ? fileInput.files[0] : null;
      const captionVal = captionInput ? captionInput.value.trim() : '';

      if (fileVal) {
        addPhotoBtn.disabled = true;
        addPhotoBtn.textContent = 'Compressing...';
        try {
          const compressedDataUrl = await readImageFile(fileVal);
          if (compressedDataUrl) {
            modalAlbumPhotos.push({
              url: compressedDataUrl,
              caption: captionVal || `View ${modalAlbumPhotos.length + 1}`
            });
            fileInput.value = '';
            if (captionInput) captionInput.value = '';
            renderModalPhotosGrid();
          }
        } catch (err) {
          alert(err.message || 'Error uploading image.');
        } finally {
          addPhotoBtn.disabled = false;
          addPhotoBtn.innerHTML = '<span>➕</span> Add Photo';
        }
      } else if (urlVal) {
        modalAlbumPhotos.push({
          url: urlVal,
          caption: captionVal || `View ${modalAlbumPhotos.length + 1}`
        });
        urlInput.value = '';
        if (captionInput) captionInput.value = '';
        renderModalPhotosGrid();
      } else {
        alert('Please enter an image URL or choose an image file to add to this album.');
      }
    });
  }

  // Form submit
  const form = document.getElementById('galleryAlbumForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const editId = document.getElementById('albEditId').value;
      const title = document.getElementById('albTitle').value.trim();
      const category = document.getElementById('albCategory').value;
      const woodType = document.getElementById('albWoodType').value.trim();
      const finish = document.getElementById('albFinish').value.trim();
      const description = document.getElementById('albDesc').value.trim();

      if (!title) {
        alert('Please provide a title for this design album.');
        return;
      }

      if (!modalAlbumPhotos.length) {
        if (!confirm('You have not added any photos yet. Do you want to save this album with a default showcase photo?')) {
          return;
        }
        modalAlbumPhotos.push({
          url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200&q=85',
          caption: 'Design Overview'
        });
      }

      const albumData = {
        title: title,
        category: category,
        woodType: woodType,
        finish: finish,
        description: description,
        coverImage: modalAlbumPhotos[0].url,
        photos: modalAlbumPhotos
      };

      if (editId) {
        updateGalleryAlbum(editId, albumData);
        showAdminToast(`Design album "${title}" updated successfully!`, 'success');
      } else {
        addGalleryAlbum(albumData);
        showAdminToast(`New design album "${title}" added to gallery!`, 'success');
      }

      closeGalleryAlbumModal();
      renderAdminGallery();
    });
  }

  // Live filter and search in Admin
  const searchInput = document.getElementById('adminGallerySearchInput');
  const catFilter = document.getElementById('adminGalleryCategoryFilter');

  if (searchInput) searchInput.addEventListener('input', renderAdminGallery);
  if (catFilter) catFilter.addEventListener('change', renderAdminGallery);
}

  window.addEventListener('pendragon_data_updated', (e) => {
    if (typeof loadSettingsForm === 'function') loadSettingsForm();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof renderOrders === 'function') renderOrders();
    if (typeof renderAdminGallery === 'function') renderAdminGallery();
    if (typeof renderMessages === 'function') renderMessages();
    if (typeof renderWebsiteDashboard === 'function') renderWebsiteDashboard();
    if (typeof renderWorkshopDashboard === 'function') renderWorkshopDashboard();
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'woodcraft_website_db_v1') {
      if (typeof loadSettingsForm === 'function') loadSettingsForm();
      if (typeof renderProducts === 'function') renderProducts();
      if (typeof renderOrders === 'function') renderOrders();
      if (typeof renderAdminGallery === 'function') renderAdminGallery();
      if (typeof renderMessages === 'function') renderMessages();
      if (typeof renderWebsiteDashboard === 'function') renderWebsiteDashboard();
    }
  });

  initAdminGallery();

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
