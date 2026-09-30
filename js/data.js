/* =========================================================
   TWO SEPARATE DATABASES (not merged)
   1) Website DB  -> public site + Website Management
   2) Workshop DB -> Workshop Management only
   Bridge: sendProductToShop() copies stock Workshop -> Website shop
   ========================================================= */

const WEBSITE_DB_KEY = 'woodcraft_website_db_v1';
const WORKSHOP_DB_KEY = 'woodcraft_workshop_db_v1';
const AUTH_KEY = 'woodcraft_auth';
const ADMIN_SALT = 'pendragon_furniture_2026_salt_';
// SHA-256 hash of (ADMIN_SALT + 'admin123')
const ADMIN_HASH = '5f3c0dd47e745129779bcba7dc2b8b15d328c477c0cba22852fa5fce7741bfe9';
const LEGACY_KEYS = ['woodcraft_data_v5', 'woodcraft_data_v4'];

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DEFAULT_WEBSITE_DB = {
  shops: [
    {
      id: 'sh1',
      name: 'Moratuwa Showroom',
      phone: '+94 11 234 5678',
      email: 'moratuwa@woodcraft.lk',
      address: '45, Furniture Lane, Moratuwa, Sri Lanka',
      status: 'active'
    },
    {
      id: 'sh2',
      name: 'Colombo Branch',
      phone: '+94 11 555 0199',
      email: 'colombo@woodcraft.lk',
      address: '12, Galle Road, Colombo 03, Sri Lanka',
      status: 'active'
    }
  ],
  products: [
    {
      id: '1',
      name: 'Teak Dining Table',
      category: 'tables',
      price: 85000,
      shopStock: { sh1: 2, sh2: 1 },
      description: 'Beautiful 6-seater dining table crafted from premium teak wood',
      images: ['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600&q=80', 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&q=80'],
      designs: [
        { name: 'Standard Smooth Teak', price: 85000 },
        { name: 'Royal Carved Crest Border', price: 98000 },
        { name: 'Imperial Glass Top & Beveled Edges', price: 112000 }
      ],
      status: 'available',
      sourceWorkshopId: null
    },
    {
      id: '2',
      name: 'Office Chair',
      category: 'chairs',
      price: 22000,
      shopStock: { sh1: 3, sh2: 3 },
      description: 'Comfortable ergonomic office chair with padded seat',
      images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80'],
      designs: [
        { name: 'Classic Breathable Mesh', price: 22000 },
        { name: 'Executive Padded Leatherette', price: 28500 },
        { name: 'Royal Velvet & Carved Armrests', price: 34000 }
      ],
      status: 'available',
      sourceWorkshopId: null
    },
    {
      id: '3',
      name: 'King Size Bed',
      category: 'beds',
      price: 120000,
      shopStock: { sh1: 1, sh2: 1 },
      description: 'King size bed with headboard — complete set',
      images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80'],
      designs: [
        { name: 'Modern Minimalist Teak', price: 120000 },
        { name: 'Royal Headboard Hand-Carved', price: 145000 },
        { name: 'Imperial Dragon Crest with Storage Drawers', price: 168000 }
      ],
      status: 'available',
      sourceWorkshopId: null
    },
    {
      id: '4',
      name: 'Wardrobe Cabinet',
      category: 'cabinets',
      price: 95000,
      shopStock: { sh1: 2, sh2: 1 },
      description: '3-door wardrobe with spacious hanging and shelf storage',
      images: ['https://images.unsplash.com/photo-1555041469-a586c12e8f2a?w=600&q=80'],
      designs: [
        { name: 'Standard 3-Door Solid Wood', price: 95000 },
        { name: 'Mirrored Door & Antique Brass Handles', price: 110000 },
        { name: 'Royal Fluted Glass & Walnut Polish', price: 125000 }
      ],
      status: 'available',
      sourceWorkshopId: null
    }
  ],
  sales: [
    { id: 's1', productId: '3', productName: 'King Size Bed', shopId: 'sh1', shopName: 'Moratuwa Showroom', quantity: 1, total: 120000, date: '2026-06-10', customer: 'Sunil Ranasinghe' },
    { id: 's2', productId: '1', productName: 'Teak Dining Table', shopId: 'sh2', shopName: 'Colombo Branch', quantity: 1, total: 85000, date: '2026-06-18', customer: 'Malini Fernando' }
  ],
  orders: [
    {
      id: 'ord_1',
      orderNumber: '#PF-1001',
      customerName: 'Saman Kumara',
      phone: '+94 77 123 4567',
      email: 'saman@example.com',
      shopId: 'sh1',
      shopName: 'Moratuwa Showroom',
      type: 'single',
      items: [
        { name: 'Teak Dining Table', designName: 'Royal Carved Crest Border', quantity: 1, price: 98000 }
      ],
      total: 98000,
      notes: 'Please call before delivery to confirm time.',
      channel: 'whatsapp',
      status: 'pending',
      date: '2026-09-24'
    }
  ],
  settings: {
    shopName: 'Pendragon Furniture',
    phone: '+94 11 234 5678',
    whatsapp: '+94 77 234 5678',
    email: 'info@woodcraft.lk',
    address: '45, Furniture Lane, Moratuwa, Sri Lanka'
  }
};

const DEFAULT_WORKSHOP_DB = {
  products: [
    { id: 'wp1', name: 'Teak Dining Table', category: 'tables', price: 85000, stock: 4, description: 'Beautiful 6-seater dining table crafted from premium teak wood', images: ['https://images.unsplash.com/photo-1615066390971-03e4e9c5d2ed?w=600&q=80'], status: 'available' },
    { id: 'wp2', name: 'Office Chair', category: 'chairs', price: 22000, stock: 6, description: 'Comfortable ergonomic office chair with padded seat', images: ['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80'], status: 'available' },
    { id: 'wp3', name: 'King Size Bed', category: 'beds', price: 120000, stock: 2, description: 'King size bed with headboard — complete set', images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80'], status: 'available' },
    { id: 'wp4', name: 'Custom Bookshelf', category: 'cabinets', price: 28000, stock: 3, description: '5-tier wooden bookshelf for home or office', images: ['https://images.unsplash.com/photo-1594620302202-9a785afd1981?w=600&q=80'], status: 'available' }
  ],
  settings: {
    workshopName: 'WoodCraft Workshop',
    phone: '+94 11 234 5678',
    address: '45, Furniture Lane, Moratuwa, Sri Lanka'
  }
};

function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function normalizeShop(shop) {
  return {
    id: shop.id || generateId('sh'),
    name: shop.name || 'Shop',
    phone: shop.phone || '',
    email: shop.email || '',
    address: shop.address || '',
    status: shop.status === 'inactive' ? 'inactive' : 'active'
  };
}

function getProductDesigns(product) {
  if (product && Array.isArray(product.designs) && product.designs.length > 0) {
    return product.designs.map(d => ({
      name: String(d.name || 'Standard Edition').trim(),
      price: Number(d.price != null ? d.price : product.price) || Number(product.price || 0)
    }));
  }

  const base = Number(product ? product.price : 0) || 10000;
  const cat = (product && product.category) ? product.category : 'all';

  if (cat === 'chairs') {
    return [
      { name: 'Standard Classic Finish', price: base },
      { name: 'Executive Padded Leatherette', price: Math.round(base * 1.25) },
      { name: 'Royal Velvet & Carved Wood', price: Math.round(base * 1.5) }
    ];
  } else if (cat === 'tables') {
    return [
      { name: 'Standard Smooth Finish', price: base },
      { name: 'Royal Carved Crest Border', price: Math.round(base * 1.15) },
      { name: 'Imperial Beveled Glass & Walnut', price: Math.round(base * 1.3) }
    ];
  } else if (cat === 'beds') {
    return [
      { name: 'Modern Minimalist Teak', price: base },
      { name: 'Royal Headboard Hand-Carved', price: Math.round(base * 1.2) },
      { name: 'Imperial Crest with Storage Drawers', price: Math.round(base * 1.38) }
    ];
  } else if (cat === 'cabinets') {
    return [
      { name: 'Standard Classic Panel', price: base },
      { name: 'Fluted Glass & Brass Handles', price: Math.round(base * 1.16) },
      { name: 'Royal Carved Walnut Polish', price: Math.round(base * 1.32) }
    ];
  }

  return [
    { name: 'Standard Edition', price: base },
    { name: 'Royal Hand-Carved Edition', price: Math.round(base * 1.18) },
    { name: 'Imperial Luxury Polish', price: Math.round(base * 1.35) }
  ];
}

function normalizeWebsiteProduct(product, shops = []) {
  if (!product.images || !Array.isArray(product.images)) {
    product.images = product.image ? [product.image] : [];
  }
  if (product.image) delete product.image;
  if (!product.shopStock || typeof product.shopStock !== 'object') product.shopStock = {};
  shops.forEach((shop) => {
    if (product.shopStock[shop.id] == null) product.shopStock[shop.id] = 0;
  });
  // Website products do not keep workshop warehouse stock
  product.status = product.status === 'hidden' ? 'hidden' : 'available';

  if (product.designs && Array.isArray(product.designs) && product.designs.length > 0) {
    product.designs = product.designs.map(d => ({
      name: String(d.name || '').trim(),
      price: Number(d.price != null ? d.price : product.price) || Number(product.price)
    })).filter(d => d.name);
  } else {
    product.designs = getProductDesigns(product);
  }

  return product;
}

function normalizeWorkshopProduct(product) {
  if (!product.images || !Array.isArray(product.images)) {
    product.images = product.image ? [product.image] : [];
  }
  if (product.image) delete product.image;
  product.stock = Number(product.stock || 0);
  delete product.shopStock;
  product.status = product.stock > 0 ? 'available' : 'out-of-stock';

  if (product.designs && Array.isArray(product.designs) && product.designs.length > 0) {
    product.designs = product.designs.map(d => ({
      name: String(d.name || '').trim(),
      price: Number(d.price != null ? d.price : product.price) || Number(product.price)
    })).filter(d => d.name);
  } else {
    product.designs = getProductDesigns(product);
  }

  return product;
}

function normalizeSale(sale) {
  if (!sale.shopId) sale.shopId = '';
  if (!sale.shopName) sale.shopName = '';
  return sale;
}

function normalizeOrder(order) {
  return {
    id: order.id || generateId('ord_'),
    orderNumber: order.orderNumber || ('#PF-' + (order.id ? String(order.id).slice(-4) : Math.floor(1000 + Math.random() * 9000))),
    customerName: order.customerName || 'Customer',
    phone: order.phone || '',
    email: order.email || '',
    shopId: order.shopId || '',
    shopName: order.shopName || '',
    type: order.type || 'single',
    items: Array.isArray(order.items) ? order.items : [],
    total: Number(order.total || 0),
    notes: order.notes || '',
    channel: order.channel || 'website',
    status: order.status || 'pending',
    date: order.date || new Date().toISOString().split('T')[0]
  };
}

function normalizeWebsiteDb(data) {
  data.shops = (data.shops || []).map(normalizeShop);
  if (!data.shops.length) data.shops = DEFAULT_WEBSITE_DB.shops.map((s) => ({ ...s }));
  data.products = (data.products || []).map((p) => normalizeWebsiteProduct(p, data.shops));
  data.sales = (data.sales || []).map(normalizeSale);
  data.orders = (data.orders || (DEFAULT_WEBSITE_DB.orders ? DEFAULT_WEBSITE_DB.orders.map(s => ({ ...s })) : [])).map(normalizeOrder);
  if (!data.settings) data.settings = { ...DEFAULT_WEBSITE_DB.settings };
  if (!data.settings.whatsapp) data.settings.whatsapp = '+94 77 234 5678';
  if (data.settings.shopName === 'WoodCraft Lanka') {
    data.settings.shopName = 'Pendragon Furniture';
  }
  return data;
}

function normalizeWorkshopDb(data) {
  data.products = (data.products || []).map(normalizeWorkshopProduct);
  if (!data.settings) data.settings = { ...DEFAULT_WORKSHOP_DB.settings };
  return data;
}

function migrateFromLegacy() {
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const legacy = JSON.parse(raw);
      const settings = legacy.settings || DEFAULT_WEBSITE_DB.settings;
      const shops = (legacy.shops && legacy.shops.length)
        ? legacy.shops.map(normalizeShop)
        : [{
          id: 'sh1',
          name: settings.shopName || 'Main Shop',
          phone: settings.phone || '',
          email: settings.email || '',
          address: settings.address || '',
          status: 'active'
        }];

      const websiteProducts = [];
      const workshopProducts = [];

      (legacy.products || []).forEach((p) => {
        const images = p.images || (p.image ? [p.image] : ['🪑']);
        const workshopStock = Number(p.stock || 0);
        let shopStock = p.shopStock && typeof p.shopStock === 'object' ? { ...p.shopStock } : null;
        if (!shopStock) {
          shopStock = {};
          shops.forEach((s, i) => { shopStock[s.id] = i === 0 ? workshopStock : 0; });
        }

        const wpId = generateId('wp');
        workshopProducts.push(normalizeWorkshopProduct({
          id: wpId,
          name: p.name,
          category: p.category,
          price: p.price,
          stock: workshopStock,
          description: p.description,
          images: [...images]
        }));

        websiteProducts.push(normalizeWebsiteProduct({
          id: p.id || generateId('p'),
          name: p.name,
          category: p.category,
          price: p.price,
          description: p.description,
          images: [...images],
          shopStock,
          sourceWorkshopId: wpId
        }, shops));
      });

      const websiteDb = normalizeWebsiteDb({
        shops,
        products: websiteProducts,
        sales: (legacy.sales || []).map((s) => normalizeSale({
          ...s,
          shopId: s.shopId || shops[0].id,
          shopName: s.shopName || shops[0].name
        })),
        settings
      });

      const workshopDb = normalizeWorkshopDb({
        products: workshopProducts,
        settings: {
          workshopName: 'WoodCraft Workshop',
          phone: settings.phone || '',
          address: settings.address || ''
        }
      });

      localStorage.setItem(WEBSITE_DB_KEY, JSON.stringify(websiteDb));
      localStorage.setItem(WORKSHOP_DB_KEY, JSON.stringify(workshopDb));
      return true;
    } catch (e) {}
  }
  return false;
}

function getWebsiteDb() {
  const stored = localStorage.getItem(WEBSITE_DB_KEY);
  if (stored) return normalizeWebsiteDb(JSON.parse(stored));
  if (migrateFromLegacy()) return getWebsiteDb();
  const data = normalizeWebsiteDb(JSON.parse(JSON.stringify(DEFAULT_WEBSITE_DB)));
  localStorage.setItem(WEBSITE_DB_KEY, JSON.stringify(data));
  return data;
}

function saveWebsiteDb(data) {
  const normalized = normalizeWebsiteDb(data);
  localStorage.setItem(WEBSITE_DB_KEY, JSON.stringify(normalized));
  if (typeof pushWebsiteDbToFirebase === 'function' && typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
    pushWebsiteDbToFirebase(normalized);
  }
}

function getWorkshopDb() {
  const stored = localStorage.getItem(WORKSHOP_DB_KEY);
  if (stored) return normalizeWorkshopDb(JSON.parse(stored));
  if (!localStorage.getItem(WEBSITE_DB_KEY)) migrateFromLegacy();
  const again = localStorage.getItem(WORKSHOP_DB_KEY);
  if (again) return normalizeWorkshopDb(JSON.parse(again));
  const data = normalizeWorkshopDb(JSON.parse(JSON.stringify(DEFAULT_WORKSHOP_DB)));
  localStorage.setItem(WORKSHOP_DB_KEY, JSON.stringify(data));
  return data;
}

function saveWorkshopDb(data) {
  const normalized = normalizeWorkshopDb(data);
  localStorage.setItem(WORKSHOP_DB_KEY, JSON.stringify(normalized));
  if (typeof pushWorkshopDbToFirebase === 'function' && typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
    pushWorkshopDbToFirebase(normalized);
  }
}

let isCloudSyncInitialized = false;
function initCloudSync() {
  if (isCloudSyncInitialized) return;
  if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured() && typeof setupFirebaseRealtimeSync === 'function') {
    isCloudSyncInitialized = true;
    setupFirebaseRealtimeSync(
      (remoteWebData) => {
        if (remoteWebData) {
          localStorage.setItem(WEBSITE_DB_KEY, JSON.stringify(normalizeWebsiteDb(remoteWebData)));
          window.dispatchEvent(new CustomEvent('pendragon_data_updated', { detail: { type: 'website' } }));
        }
      },
      (remoteWsData) => {
        if (remoteWsData) {
          localStorage.setItem(WORKSHOP_DB_KEY, JSON.stringify(normalizeWorkshopDb(remoteWsData)));
          window.dispatchEvent(new CustomEvent('pendragon_data_updated', { detail: { type: 'workshop' } }));
        }
      }
    );
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initCloudSync();
  });
}

/* ---------- Website DB APIs (public site + Website Management) ---------- */

function getShops() {
  return getWebsiteDb().shops;
}

function getActiveShops() {
  return getShops().filter((s) => s.status === 'active');
}

function getShopById(id) {
  return getShops().find((s) => s.id === id) || null;
}

function addShop(shop) {
  const data = getWebsiteDb();
  const created = normalizeShop({ ...shop, id: generateId('sh') });
  data.shops.push(created);
  data.products.forEach((p) => {
    p.shopStock = p.shopStock || {};
    p.shopStock[created.id] = Number(p.shopStock[created.id] || 0);
  });
  saveWebsiteDb(data);
  return created;
}

function updateShop(id, updates) {
  const data = getWebsiteDb();
  const idx = data.shops.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  data.shops[idx] = normalizeShop({ ...data.shops[idx], ...updates, id });
  saveWebsiteDb(data);
  return data.shops[idx];
}

function deleteShop(id) {
  const data = getWebsiteDb();
  if (data.shops.length <= 1) return { ok: false, error: 'At least one shop is required' };
  data.shops = data.shops.filter((s) => s.id !== id);
  data.products.forEach((p) => {
    if (p.shopStock && p.shopStock[id] != null) delete p.shopStock[id];
  });
  saveWebsiteDb(data);
  return { ok: true };
}

function getRetailStockTotal(product) {
  if (!product || !product.shopStock) return 0;
  return Object.values(product.shopStock).reduce((sum, n) => sum + Number(n || 0), 0);
}

function getProductShopStock(product, shopId) {
  if (!product || !shopId) return 0;
  return Number((product.shopStock && product.shopStock[shopId]) || 0);
}

function getProducts() {
  return getWebsiteDb().products;
}

function getAvailableProducts(shopId = null) {
  return getProducts().filter((p) => {
    if (p.status === 'hidden' || p.visible === false) return false;
    return true;
  });
}

function addWebsiteProduct(product) {
  const data = getWebsiteDb();
  product.id = generateId('p');
  product.shopStock = product.shopStock || {};
  data.shops.forEach((shop) => {
    if (product.shopStock[shop.id] == null) product.shopStock[shop.id] = 0;
  });
  data.products.push(normalizeWebsiteProduct(product, data.shops));
  saveWebsiteDb(data);
  return product;
}

function updateWebsiteProduct(id, updates) {
  const data = getWebsiteDb();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  data.products[idx] = normalizeWebsiteProduct({ ...data.products[idx], ...updates }, data.shops);
  saveWebsiteDb(data);
  return data.products[idx];
}

function deleteWebsiteProduct(id) {
  const data = getWebsiteDb();
  data.products = data.products.filter((p) => p.id !== id);
  saveWebsiteDb(data);
}

function findWebsiteProductByName(name) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  return getProducts().find((p) => String(p.name).trim().toLowerCase() === needle) || null;
}

function getSales() {
  return getWebsiteDb().sales;
}

function addSale(sale) {
  const data = getWebsiteDb();
  const qty = Number(sale.quantity || 0);
  const product = data.products.find((p) => p.id === sale.productId);
  if (!product) return { ok: false, error: 'Product not found in Website DB' };
  const shopId = sale.shopId;
  if (!shopId) return { ok: false, error: 'Select a shop' };
  const available = getProductShopStock(product, shopId);
  if (available < qty) {
    return { ok: false, error: `Not enough stock at this shop. Available: ${available}` };
  }
  const shop = data.shops.find((s) => s.id === shopId);
  product.shopStock[shopId] = available - qty;
  normalizeWebsiteProduct(product, data.shops);
  const record = normalizeSale({
    ...sale,
    id: generateId('s'),
    productName: product.name,
    shopName: shop ? shop.name : sale.shopName || '',
    total: sale.total != null ? sale.total : product.price * qty
  });
  data.sales.push(record);
  saveWebsiteDb(data);
  return { ok: true, sale: record, product };
}

function getSettings() {
  return getWebsiteDb().settings;
}

function updateSettings(updates) {
  const data = getWebsiteDb();
  data.settings = { ...data.settings, ...updates };
  saveWebsiteDb(data);
  return data.settings;
}

/* ---------- Customer Orders & WhatsApp Integration ---------- */

function getOrders() {
  return getWebsiteDb().orders || [];
}

function getOrderById(id) {
  if (!id) return null;
  const orders = getOrders();
  return orders.find(o => o.id === id || o.orderNumber === id) || null;
}

function addOrder(orderData) {
  const db = getWebsiteDb();
  db.orders = db.orders || [];
  const normalized = normalizeOrder({
    ...orderData,
    id: generateId('ord_'),
    orderNumber: '#PF-' + (1000 + db.orders.length + 1),
    date: orderData.date || new Date().toISOString().split('T')[0]
  });
  db.orders.unshift(normalized);
  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('order-placed', { detail: { order: normalized } }));
  return normalized;
}

function updateOrderStatus(id, status) {
  const db = getWebsiteDb();
  db.orders = db.orders || [];
  const order = db.orders.find(o => o.id === id);
  if (!order) return null;
  order.status = status;
  saveWebsiteDb(db);
  return order;
}

function deleteOrder(id) {
  const db = getWebsiteDb();
  db.orders = (db.orders || []).filter(o => o.id !== id);
  saveWebsiteDb(db);
  return true;
}

function formatWhatsAppNumber(phone) {
  if (!phone) return '94772345678';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.slice(1);
  }
  return cleaned || '94772345678';
}

function getWhatsAppUrl(message = '', phone = '') {
  let targetPhone = phone;
  if (!targetPhone) {
    const s = (typeof getSettings === 'function') ? getSettings() : null;
    targetPhone = (s && s.whatsapp) ? s.whatsapp : ((s && s.phone) ? s.phone : '94772345678');
  }
  const num = formatWhatsAppNumber(targetPhone);
  const textParam = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${num}${textParam}`;
}

function getWebsiteDashboardStats() {
  const data = getWebsiteDb();
  return {
    totalProducts: data.products.length,
    inStock: data.products.filter((p) => p.status !== 'hidden').length,
    lowStock: data.products.filter((p) => p.status === 'hidden').length,
    totalShops: data.shops.length,
    activeShops: data.shops.filter((s) => s.status === 'active').length,
    totalSales: data.sales.reduce((sum, s) => sum + Number(s.total || 0), 0),
    salesCount: data.sales.length,
    pendingOrdersCount: (data.orders || []).filter(o => o.status === 'pending').length,
    retailStockQty: data.products.reduce((sum, p) => sum + getRetailStockTotal(p), 0)
  };
}

/* ---------- Workshop DB APIs (Workshop Management only) ---------- */

function getWorkshopProducts() {
  return getWorkshopDb().products;
}

function addWorkshopProduct(product) {
  const data = getWorkshopDb();
  product.id = generateId('wp');
  data.products.push(normalizeWorkshopProduct(product));
  saveWorkshopDb(data);
  return product;
}

function updateWorkshopProduct(id, updates) {
  const data = getWorkshopDb();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  data.products[idx] = normalizeWorkshopProduct({ ...data.products[idx], ...updates });
  saveWorkshopDb(data);
  return data.products[idx];
}

function deleteWorkshopProduct(id) {
  const data = getWorkshopDb();
  data.products = data.products.filter((p) => p.id !== id);
  saveWorkshopDb(data);
}

function addWorkshopStock(id, quantity, price) {
  const data = getWorkshopDb();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const product = data.products[idx];
  product.stock = Number(product.stock || 0) + Number(quantity || 0);
  if (price != null && price !== '') product.price = Number(price);
  data.products[idx] = normalizeWorkshopProduct(product);
  saveWorkshopDb(data);
  return data.products[idx];
}

function findWorkshopProductByName(name) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  return getWorkshopProducts().find((p) => String(p.name).trim().toLowerCase() === needle) || null;
}

function getWorkshopSettings() {
  return getWorkshopDb().settings;
}

function getWorkshopDashboardStats() {
  const products = getWorkshopProducts();
  return {
    totalProducts: products.length,
    workshopStockQty: products.reduce((sum, p) => sum + Number(p.stock || 0), 0),
    inStock: products.filter((p) => Number(p.stock || 0) > 0).length,
    lowStock: products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock) <= 2).length,
    totalShops: getShops().length,
    retailStockQty: getProducts().reduce((sum, p) => sum + getRetailStockTotal(p), 0)
  };
}

/* Bridge: Workshop DB -> Website DB (does NOT merge databases) */
function sendProductToShop(workshopProductId, shopId, quantity) {
  const qty = Math.max(1, Number(quantity || 0));
  const workshopDb = getWorkshopDb();
  const websiteDb = getWebsiteDb();

  const wsProduct = workshopDb.products.find((p) => p.id === workshopProductId);
  const shop = websiteDb.shops.find((s) => s.id === shopId);
  if (!wsProduct) return { ok: false, error: 'Product not found in Workshop DB' };
  if (!shop) return { ok: false, error: 'Shop not found in Website DB' };
  if (Number(wsProduct.stock || 0) < qty) {
    return { ok: false, error: `Workshop stock insufficient. Available: ${wsProduct.stock}` };
  }

  wsProduct.stock = Number(wsProduct.stock || 0) - qty;
  normalizeWorkshopProduct(wsProduct);
  saveWorkshopDb(workshopDb);

  let webProduct = websiteDb.products.find((p) =>
    p.sourceWorkshopId === workshopProductId ||
    String(p.name).trim().toLowerCase() === String(wsProduct.name).trim().toLowerCase()
  );

  if (!webProduct) {
    webProduct = normalizeWebsiteProduct({
      id: generateId('p'),
      name: wsProduct.name,
      category: wsProduct.category,
      price: wsProduct.price,
      description: wsProduct.description,
      images: [...(wsProduct.images || [])],
      shopStock: {},
      sourceWorkshopId: workshopProductId
    }, websiteDb.shops);
    websiteDb.products.push(webProduct);
  }

  webProduct.shopStock = webProduct.shopStock || {};
  webProduct.shopStock[shopId] = Number(webProduct.shopStock[shopId] || 0) + qty;
  webProduct.price = wsProduct.price;
  webProduct.sourceWorkshopId = workshopProductId;
  normalizeWebsiteProduct(webProduct, websiteDb.shops);
  saveWebsiteDb(websiteDb);

  return {
    ok: true,
    quantity: qty,
    shop,
    workshopProduct: wsProduct,
    product: webProduct
  };
}

/* Compatibility aliases used by admin forms */
function addProduct(product) {
  // Workshop Add Product page uses this while in workshop system
  return addWorkshopProduct(product);
}

function updateProduct(id, updates) {
  if (getWorkshopProducts().some((p) => p.id === id)) {
    return updateWorkshopProduct(id, updates);
  }
  return updateWebsiteProduct(id, updates);
}

function deleteProduct(id) {
  if (getWorkshopProducts().some((p) => p.id === id)) {
    deleteWorkshopProduct(id);
    return;
  }
  deleteWebsiteProduct(id);
}

function addStockToProduct(id, quantity, price) {
  return addWorkshopStock(id, quantity, price);
}

function findProductByName(name) {
  return findWorkshopProductByName(name);
}

function getDashboardStats(system = 'website') {
  if (system === 'workshop') return getWorkshopDashboardStats();
  return getWebsiteDashboardStats();
}

// ===== Security: Cryptographic Hashing, Brute-Force Rate Limiting & Session Management =====
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds
const ATTEMPTS_KEY = 'pendragon_login_attempts';
const LOCKOUT_KEY = 'pendragon_lockout_until';
const SESSION_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

function sha256Fallback(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';
  var words = [];
  var asciiBitLength = ascii[lengthProperty] * 8;
  var hash = [];
  var k = [];
  var primeCounter = 0;
  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength);
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16);
    var oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      var a = hash[0], e = hash[4];
      var temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
      var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

async function hashPassword(plainText) {
  const salted = ADMIN_SALT + String(plainText || '');
  if (typeof window !== 'undefined' && window.crypto && crypto.subtle && crypto.subtle.digest) {
    try {
      const data = new TextEncoder().encode(salted);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {}
  }
  return sha256Fallback(salted);
}

function getLockoutRemainingSeconds() {
  try {
    const until = Number(sessionStorage.getItem(LOCKOUT_KEY) || 0);
    const now = Date.now();
    if (until > now) {
      return Math.ceil((until - now) / 1000);
    }
    if (until > 0) {
      sessionStorage.removeItem(LOCKOUT_KEY);
      sessionStorage.removeItem(ATTEMPTS_KEY);
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

function recordFailedLoginAttempt() {
  try {
    const attempts = Number(sessionStorage.getItem(ATTEMPTS_KEY) || 0) + 1;
    sessionStorage.setItem(ATTEMPTS_KEY, String(attempts));
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      sessionStorage.setItem(LOCKOUT_KEY, String(Date.now() + LOCKOUT_DURATION_MS));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function resetLoginAttempts() {
  try {
    sessionStorage.removeItem(ATTEMPTS_KEY);
    sessionStorage.removeItem(LOCKOUT_KEY);
  } catch (e) {}
}

function generateSecureToken() {
  if (typeof window !== 'undefined' && window.crypto && crypto.getRandomValues) {
    const buf = new Uint8Array(24);
    crypto.getRandomValues(buf);
    return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function createSession() {
  try {
    const session = {
      token: generateSecureToken(),
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRY_MS
    };
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  } catch (e) {
    sessionStorage.setItem(AUTH_KEY, 'true');
  }
}

async function authenticateAdmin(password) {
  const remaining = getLockoutRemainingSeconds();
  if (remaining > 0) {
    return {
      success: false,
      locked: true,
      seconds: remaining,
      message: `Too many failed attempts. Try again in ${remaining}s.`
    };
  }

  const clean = String(password || '').trim();
  const hash = await hashPassword(clean);

  if (hash === ADMIN_HASH) {
    resetLoginAttempts();
    createSession();
    return { success: true };
  } else {
    const isLocked = recordFailedLoginAttempt();
    const attempts = Number(sessionStorage.getItem(ATTEMPTS_KEY) || 0);
    const left = Math.max(0, MAX_LOGIN_ATTEMPTS - attempts);
    const lockRemaining = getLockoutRemainingSeconds();

    return {
      success: false,
      locked: isLocked,
      seconds: lockRemaining,
      remainingAttempts: left,
      message: isLocked
        ? `Too many failed attempts. Locked out for ${lockRemaining}s.`
        : `Incorrect password! (${left} attempt${left === 1 ? '' : 's'} remaining)`
    };
  }
}

function isLoggedIn() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    if (raw === 'true') return true;
    const session = JSON.parse(raw);
    if (session && session.token && session.expiresAt) {
      if (Date.now() < session.expiresAt) {
        return true;
      }
    }
    logout();
    return false;
  } catch (e) {
    return false;
  }
}

function logout() {
  try {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(SYSTEM_KEY);
  } catch (e) {}
}

const CATEGORIES = {
  all: 'All',
  chairs: 'Chairs',
  tables: 'Tables',
  beds: 'Beds',
  cabinets: 'Cabinets'
};

function isImageSource(value) {
  if (!value) return false;
  return value.startsWith('http') || value.startsWith('data:') || value.startsWith('images/') || value.startsWith('./');
}

function getProductImages(product) {
  if (!product) return [];
  if (product.images && product.images.length) return product.images;
  if (product.image) return [product.image];
  return [];
}

function getPrimaryImage(product) {
  const images = getProductImages(product);
  return images[0] || '🪑';
}

function getProductImageHtml(image, className = 'product-img') {
  if (isImageSource(image)) {
    return `<img src="${image}" alt="Product" class="${className}" loading="lazy" onerror="this.onerror=null; this.src='images/logo-icon.png'; this.style.padding='1rem'; this.style.objectFit='contain';">`;
  }
  return `<span class="product-emoji">${image || '🪑'}</span>`;
}

function getProductThumbHtml(image) {
  if (isImageSource(image)) {
    return `<img src="${image}" alt="" class="table-thumb" loading="lazy" onerror="this.onerror=null; this.src='images/logo-icon.png'; this.style.padding='0.15rem'; this.style.objectFit='contain';">`;
  }
  return `<span class="table-emoji">${image || '🪑'}</span>`;
}

function getProductCardImageHtml(product) {
  const images = getProductImages(product);
  const primary = images[0] || '🪑';
  const extra = images.length > 1 ? `<span class="image-count">+${images.length - 1}</span>` : '';
  return `${getProductImageHtml(primary)}${extra}`;
}

function getProductGalleryHtml(images) {
  if (!images.length) {
    return `<div class="product-gallery"><div class="gallery-main">${getProductImageHtml('🪑', 'gallery-main-img')}<span class="gallery-zoom-hint">Click to zoom</span></div></div>`;
  }
  if (images.length === 1) {
    return `<div class="product-gallery"><div class="gallery-main" data-zoom-index="0">${getProductImageHtml(images[0], 'gallery-main-img')}<span class="gallery-zoom-hint">Click to zoom</span></div></div>`;
  }
  return `
    <div class="product-gallery">
      <div class="gallery-main" data-zoom-index="0">${getProductImageHtml(images[0], 'gallery-main-img')}<span class="gallery-zoom-hint">Click to zoom</span></div>
      <div class="gallery-thumbs">
        ${images.map((img, i) => `
          <button type="button" class="gallery-thumb${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="View image ${i + 1}">
            ${isImageSource(img) ? `<img src="${img}" alt="" onerror="this.onerror=null; this.src='images/logo-icon.png'; this.style.padding='0.2rem'; this.style.objectFit='contain';">` : `<span>${img}</span>`}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function formatShopStockSummary(product) {
  const shops = getShops();
  return shops.map((s) => `${s.name}: ${getProductShopStock(product, s.id)}`).join(' · ');
}

/* Legacy stubs (orders removed from UI) */
function getWorkshopOrders() { return []; }
function addWorkshopOrder() { return null; }
function updateWorkshopOrder() { return null; }
function deleteWorkshopOrder() {}

/* =========================================================
   SHOPPING CART SYSTEM
   Persists in localStorage across pages
   Supports individual design / finish variants
   ========================================================= */

const CART_STORAGE_KEY = 'pendragon_cart_v1';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading cart:', err);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (err) {
    console.error('Error saving cart:', err);
  }
  window.dispatchEvent(new CustomEvent('cart-updated', { detail: { cart } }));
}

function addToCart(productId, designName = '', quantity = 1) {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const product = getProducts().find(p => p.id === productId);
  if (!product) return null;

  const designs = getProductDesigns(product);
  let selectedDesign = designs[0] || { name: 'Standard Edition', price: product.price };
  if (designName) {
    const found = designs.find(d => d.name.toLowerCase() === designName.toLowerCase());
    if (found) selectedDesign = found;
  }

  const primaryImage = getPrimaryImage(product);
  const cart = getCart();

  const existingIndex = cart.findIndex(item =>
    item.productId === productId && item.designName === selectedDesign.name
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += qty;
  } else {
    cart.push({
      id: generateId('cart_'),
      productId: product.id,
      name: product.name,
      category: product.category,
      designName: selectedDesign.name,
      price: Number(selectedDesign.price) || Number(product.price),
      quantity: qty,
      image: primaryImage
    });
  }

  saveCart(cart);
  return cart;
}

function updateCartItemQty(cartItemId, quantity) {
  const cart = getCart();
  const qty = parseInt(quantity, 10);
  const index = cart.findIndex(i => i.id === cartItemId);
  if (index === -1) return cart;

  if (qty <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = qty;
  }

  saveCart(cart);
  return cart;
}

function removeFromCart(cartItemId) {
  const cart = getCart().filter(i => i.id !== cartItemId);
  saveCart(cart);
  return cart;
}

function clearCart() {
  saveCart([]);
  return [];
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
}

function getCartItemCount() {
  const cart = getCart();
  return cart.reduce((count, item) => count + (Number(item.quantity) || 1), 0);
}
