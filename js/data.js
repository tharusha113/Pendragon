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

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return String(dateStr);
  }
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
  sales: [],
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
    },
    {
      id: 'cust_ord_1',
      orderNumber: '#CUST-1001',
      customerName: 'Nimalka Jayasuriya',
      phone: '+94 71 888 9922',
      email: 'nimalka.j@gmail.com',
      shopId: 'sh1',
      shopName: 'Moratuwa Showroom',
      type: 'custom',
      isCustom: true,
      customItemName: 'Custom Teak TV Showcase & Credenza',
      woodType: 'Teak (Ceylon Teak)',
      dimensions: '7ft (L) x 2ft (W) x 3ft (H)',
      finish: 'Dark Walnut Stain & Semi-Gloss',
      fabricCushion: 'Brass handles with fluted glass doors',
      agreedPrice: 145000,
      advancePaid: 50000,
      balanceDue: 95000,
      paymentMethod: 'Advance Paid (Bank Transfer)',
      estimatedDeliveryDate: '2026-10-30',
      craftsmanNotes: 'Seasoned Grade-A Moratuwa teak. Fluted glass shelves.',
      customStage: 'crafting',
      status: 'crafting',
      channel: 'custom',
      notes: 'Deliver to No 12, Flower Road, Colombo 07. Call before dispatch.',
      date: '2026-10-15'
    },
    {
      id: 'cust_ord_2',
      orderNumber: '#CUST-1002',
      customerName: 'Saman Kumara',
      phone: '+94 77 123 4567',
      email: 'saman@example.com',
      shopId: 'sh1',
      shopName: 'Moratuwa Showroom',
      type: 'custom',
      isCustom: true,
      customItemName: 'Custom Solid Teak King Bed & Floating Nightstands',
      woodType: 'Teak (Ceylon Teak)',
      dimensions: 'King Size (78" x 72") with 2 Bedside Drawers',
      finish: 'Natural Honey Teak Polish',
      fabricCushion: 'Padded Velvet Headboard (Beige)',
      agreedPrice: 215000,
      advancePaid: 75000,
      balanceDue: 140000,
      paymentMethod: 'Advance Paid (Showroom Cash / Slip)',
      estimatedDeliveryDate: '2026-11-12',
      craftsmanNotes: 'Seasoned Ceylon Teak with hand-carved minimalist headboard profile.',
      customStage: 'polishing',
      status: 'polishing',
      channel: 'custom',
      notes: 'Deliver to No 42, Galle Road, Dehiwala. Call before delivery.',
      date: '2026-10-18'
    }
  ],
  messages: [
    {
      id: 'msg_1',
      name: 'Kamal Perera',
      email: 'kamal@gmail.com',
      phone: '+94 77 123 4567',
      message: 'Can I get a custom size for the Teak Dining Table (8-seater)? Please let me know the cost and delivery time.',
      status: 'unread',
      date: '2026-09-28'
    }
  ],
  galleryAlbums: [
    {
      id: 'alb_1',
      title: 'Royal Carved Teak Dining Suite (8-Seater)',
      category: 'dining',
      woodType: 'Seasoned Moratuwa Teak',
      finish: 'Dark Walnut Polish & Brass Accents',
      description: 'Handcrafted 8-seater dining suite featuring intricate carved edge borders, solid tapered legs, and plush upholstered velvet dining chairs.',
      coverImage: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1000&q=85',
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1200&q=85',
          caption: 'Full 8-seater dining ensemble with matching chairs'
        },
        {
          url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=1200&q=85',
          caption: 'Carved table border and seasoned teak wood grain'
        },
        {
          url: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=1200&q=85',
          caption: 'Side perspective showing robust mortise-and-tenon joinery'
        },
        {
          url: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=1200&q=85',
          caption: 'Handcrafted chair backrest detailing & velvet seat cushion'
        }
      ],
      date: '2026-10-18',
      featured: true
    },
    {
      id: 'alb_2',
      title: 'Imperial King-Size Platform Bed & Floating Nightstands',
      category: 'bedroom',
      woodType: 'Grade-A Natural Teak',
      finish: 'Natural Matte Hardwax Oil & Smooth Satin',
      description: 'Architectural platform bed with solid teak slab headboard, integrated warm LED lighting channels, and floating cantilevered nightstands.',
      coverImage: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1000&q=85',
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&q=85',
          caption: 'Master bedroom full king platform bed setup'
        },
        {
          url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=85',
          caption: 'Solid teak headboard showing bookmatched wood grains'
        },
        {
          url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=85',
          caption: 'Floating cantilevered nightstand with hidden soft-close drawer'
        },
        {
          url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4570?w=1200&q=85',
          caption: 'Footboard corner joint & sturdy platform foundation'
        }
      ],
      date: '2026-10-12',
      featured: true
    },
    {
      id: 'alb_3',
      title: 'Custom Fluted Teak TV Console & Credenza',
      category: 'living',
      woodType: 'Kiln-Dried Moratuwa Teak',
      finish: 'Golden Honey Lacquer & Brushed Brass Handles',
      description: 'Bespoke entertainment credenza featuring tambour fluted sliding cabinet doors, cable management channels, and satin-brushed brass hardware.',
      coverImage: 'https://images.unsplash.com/photo-1594620302202-9a785afd1981?w=1000&q=85',
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1594620302202-9a785afd1981?w=1200&q=85',
          caption: 'Complete living room credenza unit front view'
        },
        {
          url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&q=85',
          caption: 'Handcrafted fluted timber door slats & brass hardware'
        },
        {
          url: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=1200&q=85',
          caption: 'Top teak slab finish and seamless beveled border'
        }
      ],
      date: '2026-10-05',
      featured: true
    },
    {
      id: 'alb_4',
      title: 'Colonial Handcrafted Armchair & Teak Coffee Table Set',
      category: 'living',
      woodType: 'Seasoned Mahogany & Teak Accents',
      finish: 'Deep Chestnut Wood Stain & Hand Polish',
      description: 'Colonial heritage style lounge chairs with woven cane detailing, curved ergonomic armrests, and a matching solid teak round coffee table.',
      coverImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1000&q=85',
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=85',
          caption: 'Lounge suite setting with sunlight highlighting timber sheen'
        },
        {
          url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&q=85',
          caption: 'Carved mahogany armrest and comfortable deep seat cushion'
        },
        {
          url: 'https://images.unsplash.com/photo-1555041469-a586c12e8f2a?w=1200&q=85',
          caption: 'Solid teak matching coffee table top and sturdy tripod base'
        }
      ],
      date: '2026-09-29',
      featured: false
    },
    {
      id: 'alb_5',
      title: 'Executive Teak Writing Desk & Custom Bookshelf Suite',
      category: 'office',
      woodType: 'Moratuwa First-Grade Teak',
      finish: 'Royal Walnut Satin Finish',
      description: 'High-end executive home office setup including a double-pedestal writing desk with dovetail drawers and a 5-tier open-back architectural bookshelf.',
      coverImage: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1000&q=85',
      photos: [
        {
          url: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1200&q=85',
          caption: 'Full executive home office suite in natural lighting'
        },
        {
          url: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=1200&q=85',
          caption: 'Handcrafted dovetail joints and brass lock mechanisms'
        },
        {
          url: 'https://images.unsplash.com/photo-1594620302202-9a785afd1981?w=1200&q=85',
          caption: 'Matching 5-tier open bookshelf displaying wood craftsmanship'
        }
      ],
      date: '2026-09-22',
      featured: false
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
  const items = Array.isArray(sale.items) ? sale.items : [];
  const prodName = sale.productName || (items.length ? items.map(i => `${i.quantity || 1}x ${i.name}`).join(', ') : 'Showroom Item');
  return {
    id: sale.id || generateId('sale_'),
    orderId: sale.orderId || '',
    orderNumber: sale.orderNumber || (sale.orderId ? ('#PF-' + String(sale.orderId).slice(-4)) : ('#REC-' + Math.floor(1000 + Math.random() * 9000))),
    customer: sale.customer || 'Walk-in Customer',
    customerPhone: sale.customerPhone || sale.phone || '',
    shopId: sale.shopId || '',
    shopName: sale.shopName || 'Main Showroom',
    productName: prodName,
    items: items,
    quantity: Number(sale.quantity || (items.length ? items.reduce((s, i) => s + Number(i.quantity || 1), 0) : 1)),
    total: Number(sale.total || 0),
    channel: sale.channel || (sale.orderId ? 'website' : 'showroom'),
    paymentMethod: sale.paymentMethod || 'Paid (Cash / Card)',
    date: sale.date || new Date().toISOString().split('T')[0],
    notes: sale.notes || ''
  };
}

function normalizeOrder(order) {
  const isCustom = Boolean(order.isCustom || order.type === 'custom' || order.orderType === 'custom');
  const items = Array.isArray(order.items) ? order.items : [];
  
  let orderNumber = order.orderNumber;
  if (!orderNumber) {
    if (isCustom) {
      orderNumber = '#CUST-' + (order.id ? String(order.id).slice(-4) : Math.floor(1000 + Math.random() * 9000));
    } else {
      orderNumber = '#PF-' + (order.id ? String(order.id).slice(-4) : Math.floor(1000 + Math.random() * 9000));
    }
  }

  const customItemName = order.customItemName || order.item || (items.length ? items[0].name : 'Custom Furniture');
  const agreedPrice = Number(order.agreedPrice != null ? order.agreedPrice : (order.total || 0));
  const advancePaid = Number(order.advancePaid || 0);
  const balanceDue = Number(order.balanceDue != null ? order.balanceDue : Math.max(0, agreedPrice - advancePaid));

  return {
    id: order.id || generateId(isCustom ? 'cust_ord_' : 'ord_'),
    orderNumber: orderNumber,
    customerName: order.customerName || 'Customer',
    phone: order.phone || '',
    email: order.email || '',
    shopId: order.shopId || '',
    shopName: order.shopName || '',
    type: isCustom ? 'custom' : (order.type || 'single'),
    isCustom: isCustom,
    // Custom Order Specifications
    customItemName: customItemName,
    woodType: order.woodType || (isCustom ? 'Teak (Ceylon Teak)' : ''),
    dimensions: order.dimensions || '',
    finish: order.finish || (isCustom ? 'Natural Matte Polish' : ''),
    fabricCushion: order.fabricCushion || '',
    agreedPrice: agreedPrice,
    advancePaid: advancePaid,
    balanceDue: balanceDue,
    paymentMethod: order.paymentMethod || 'Advance Paid (Cash/Bank)',
    estimatedDeliveryDate: order.estimatedDeliveryDate || '',
    craftsmanNotes: order.craftsmanNotes || '',
    referenceImageUrl: order.referenceImageUrl || '',
    customStage: order.customStage || order.status || 'received',
    // Items list (for invoice and tracking compatibility)
    items: (isCustom && (!items.length))
      ? [{ name: customItemName, designName: (order.woodType || 'Custom Wood') + (order.dimensions ? ` (${order.dimensions})` : ''), quantity: 1, price: agreedPrice }]
      : items,
    total: agreedPrice || Number(order.total || 0),
    notes: order.notes || '',
    channel: order.channel || (isCustom ? 'custom' : 'website'),
    status: order.status || (isCustom ? 'received' : 'pending'),
    date: order.date || new Date().toISOString().split('T')[0]
  };
}

function normalizeMessage(msg) {
  return {
    id: msg.id || generateId('msg_'),
    name: msg.name || 'Anonymous',
    email: msg.email || '',
    phone: msg.phone || '',
    message: msg.message || '',
    status: msg.status === 'read' ? 'read' : 'unread',
    date: msg.date || new Date().toISOString().split('T')[0]
  };
}

function normalizeGalleryPhoto(photo, index = 0) {
  if (typeof photo === 'string') {
    return {
      url: photo,
      caption: `View ${index + 1}`
    };
  }
  return {
    url: (photo && photo.url) ? photo.url : '',
    caption: (photo && photo.caption) ? photo.caption : `View ${index + 1}`
  };
}

function normalizeGalleryAlbum(album) {
  const rawPhotos = Array.isArray(album.photos) ? album.photos : (album.images || []);
  const photos = rawPhotos.map((p, i) => normalizeGalleryPhoto(p, i)).filter(p => p.url);
  const coverImage = album.coverImage || (photos.length ? photos[0].url : 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=1000&q=85');

  return {
    id: album.id || generateId('alb_'),
    title: album.title || 'Handcrafted Furniture Design',
    category: (album.category || 'dining').toLowerCase(),
    woodType: album.woodType || 'Seasoned Ceylon Teak',
    finish: album.finish || 'Natural Matte Polish',
    description: album.description || '',
    coverImage: coverImage,
    photos: photos.length ? photos : [{ url: coverImage, caption: 'Main Design View' }],
    date: album.date || new Date().toISOString().split('T')[0],
    featured: Boolean(album.featured)
  };
}

function normalizeWebsiteDb(data) {
  data.shops = (data.shops || []).map(normalizeShop);
  if (!data.shops.length) data.shops = DEFAULT_WEBSITE_DB.shops.map((s) => ({ ...s }));
  data.products = (data.products || []).map((p) => normalizeWebsiteProduct(p, data.shops));
  // Filter out any legacy dummy mock sales (s1, s2 with fake test customers)
  data.sales = (data.sales || [])
    .filter(s => s && s.id !== 's1' && s.id !== 's2' && !String(s.customer || '').includes('Sunil Ranasinghe') && !String(s.customer || '').includes('Malini Fernando'))
    .map(normalizeSale);
  if (!Array.isArray(data.orders)) {
    data.orders = (DEFAULT_WEBSITE_DB.orders || []).map(s => ({ ...s }));
  }
  if (!data.orders.some(o => o.isCustom || String(o.orderNumber || '').includes('CUST'))) {
    const custSample = DEFAULT_WEBSITE_DB.orders.find(o => o.isCustom);
    if (custSample) data.orders.push({ ...custSample });
  }
  if (!data.orders.some(o => o.orderNumber === '#CUST-1002')) {
    const cust2Sample = DEFAULT_WEBSITE_DB.orders.find(o => o.orderNumber === '#CUST-1002');
    if (cust2Sample) data.orders.push({ ...cust2Sample });
  }
  data.orders = data.orders.map(normalizeOrder);
  if (!Array.isArray(data.messages)) {
    data.messages = (DEFAULT_WEBSITE_DB.messages ? DEFAULT_WEBSITE_DB.messages.map(m => ({ ...m })) : []);
  }
  data.messages = data.messages.map(normalizeMessage);

  if (!Array.isArray(data.galleryAlbums) || data.galleryAlbums.length === 0) {
    data.galleryAlbums = (DEFAULT_WEBSITE_DB.galleryAlbums || []).map(a => ({
      ...a,
      photos: (a.photos || []).map(p => ({ ...p }))
    }));
  }
  data.galleryAlbums = data.galleryAlbums.map(normalizeGalleryAlbum);

  if (!data.settings) data.settings = { ...DEFAULT_WEBSITE_DB.settings };
  if (!data.settings.whatsapp) data.settings.whatsapp = '+94 77 234 5678';
  if (data.settings.shopName === 'WoodCraft Lanka') {
    data.settings.shopName = 'Pendragon Furniture';
  }
  // Keep single showroom record synchronized with website settings
  if (data.settings && data.shops && data.shops.length > 0) {
    if (data.settings.shopName) data.shops[0].name = data.settings.shopName;
    if (data.settings.phone) data.shops[0].phone = data.settings.phone;
    if (data.settings.email) data.shops[0].email = data.settings.email;
    if (data.settings.address) data.shops[0].address = data.settings.address;
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
  try {
    localStorage.setItem(WEBSITE_DB_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.error('LocalStorage save error (quota exceeded):', err);
  }
  if (typeof pushWebsiteDbToFirebase === 'function' && typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
    pushWebsiteDbToFirebase({
      ...normalized,
      deletedIds: Array.from(getDeletedEntityIds())
    });
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pendragon_data_updated', { detail: { type: 'website' } }));
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
  try {
    localStorage.setItem(WORKSHOP_DB_KEY, JSON.stringify(normalized));
  } catch (err) {
    console.error('LocalStorage save error (quota exceeded):', err);
  }
  if (typeof pushWorkshopDbToFirebase === 'function' && typeof isFirebaseConfigured === 'function' && isFirebaseConfigured()) {
    pushWorkshopDbToFirebase({
      ...normalized,
      deletedIds: Array.from(getDeletedEntityIds())
    });
  }
}

const DELETED_IDS_KEY = 'pendragon_deleted_entity_ids_v1';

function getDeletedEntityIds() {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function markEntityDeleted(id) {
  if (!id) return;
  const set = getDeletedEntityIds();
  set.add(String(id));
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...set]));
  } catch (e) {}
}

function unmarkEntityDeleted(id) {
  if (!id) return;
  const set = getDeletedEntityIds();
  set.delete(String(id));
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...set]));
  } catch (e) {}
}

function mergeWebsiteDbWithRemote(localDb, remoteDb) {
  if (!remoteDb) return localDb;
  if (!localDb) return normalizeWebsiteDb(remoteDb);

  if (Array.isArray(remoteDb.deletedIds)) {
    remoteDb.deletedIds.forEach(id => markEntityDeleted(id));
  }
  const deletedIds = getDeletedEntityIds();
  const normalizedRemote = normalizeWebsiteDb(remoteDb);

  normalizedRemote.products = (Array.isArray(normalizedRemote.products) ? normalizedRemote.products : [])
    .filter(p => p && p.id && !deletedIds.has(String(p.id)));
  normalizedRemote.orders = (Array.isArray(normalizedRemote.orders) ? normalizedRemote.orders : [])
    .filter(o => o && o.id && !deletedIds.has(String(o.id)));
  normalizedRemote.messages = (Array.isArray(normalizedRemote.messages) ? normalizedRemote.messages : [])
    .filter(m => m && m.id && !deletedIds.has(String(m.id)));
  normalizedRemote.galleryAlbums = (Array.isArray(normalizedRemote.galleryAlbums) ? normalizedRemote.galleryAlbums : [])
    .filter(a => a && a.id && !deletedIds.has(String(a.id)));

  if ((!normalizedRemote.galleryAlbums || normalizedRemote.galleryAlbums.length === 0) && localDb && Array.isArray(localDb.galleryAlbums) && localDb.galleryAlbums.length > 0) {
    normalizedRemote.galleryAlbums = localDb.galleryAlbums.filter(a => a && a.id && !deletedIds.has(String(a.id)));
  }

  // If localDb has offline-only draft products not in remote, preserve them if not deleted
  const remoteProductIds = new Set(normalizedRemote.products.map(p => p.id));
  if (Array.isArray(localDb.products)) {
    localDb.products.forEach(lp => {
      if (lp && lp.id && lp._isLocalDraft && !remoteProductIds.has(lp.id) && !deletedIds.has(String(lp.id))) {
        normalizedRemote.products.unshift(lp);
      }
    });
  }

  return normalizedRemote;
}

function mergeWorkshopDbWithRemote(localDb, remoteDb) {
  if (!remoteDb) return localDb;
  if (!localDb) return normalizeWorkshopDb(remoteDb);

  if (Array.isArray(remoteDb.deletedIds)) {
    remoteDb.deletedIds.forEach(id => markEntityDeleted(id));
  }
  const deletedIds = getDeletedEntityIds();
  const normalizedRemote = normalizeWorkshopDb(remoteDb);

  normalizedRemote.products = (Array.isArray(normalizedRemote.products) ? normalizedRemote.products : [])
    .filter(p => p && p.id && !deletedIds.has(String(p.id)));

  const remoteProductIds = new Set(normalizedRemote.products.map(p => p.id));
  if (Array.isArray(localDb.products)) {
    localDb.products.forEach(lp => {
      if (lp && lp.id && lp._isLocalDraft && !remoteProductIds.has(lp.id) && !deletedIds.has(String(lp.id))) {
        normalizedRemote.products.unshift(lp);
      }
    });
  }

  return normalizedRemote;
}

let isCloudSyncInitialized = false;
function initCloudSync() {
  if (isCloudSyncInitialized) return;
  if (typeof isFirebaseConfigured === 'function' && isFirebaseConfigured() && typeof setupFirebaseRealtimeSync === 'function') {
    isCloudSyncInitialized = true;
    setupFirebaseRealtimeSync(
      (remoteWebData) => {
        if (remoteWebData) {
          const currentLocal = getWebsiteDb();
          const merged = mergeWebsiteDbWithRemote(currentLocal, remoteWebData);
          localStorage.setItem(WEBSITE_DB_KEY, JSON.stringify(normalizeWebsiteDb(merged)));
          window.dispatchEvent(new CustomEvent('pendragon_data_updated', { detail: { type: 'website' } }));
        }
      },
      (remoteWsData) => {
        if (remoteWsData) {
          const currentLocal = getWorkshopDb();
          const merged = mergeWorkshopDbWithRemote(currentLocal, remoteWsData);
          localStorage.setItem(WORKSHOP_DB_KEY, JSON.stringify(normalizeWorkshopDb(merged)));
          window.dispatchEvent(new CustomEvent('pendragon_data_updated', { detail: { type: 'workshop' } }));
        }
      }
    );
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    syncCompletedOrdersToSales();
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
  const deletedIds = getDeletedEntityIds();
  const products = getWebsiteDb().products || [];
  return products.filter((p) => p && p.id && !deletedIds.has(String(p.id)));
}

function getAvailableProducts(shopId = null) {
  const deletedIds = getDeletedEntityIds();
  return getProducts().filter((p) => {
    if (!p || !p.id || deletedIds.has(String(p.id))) return false;
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
  data.products.unshift(normalizeWebsiteProduct(product, data.shops));
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
  markEntityDeleted(id);
  const data = getWebsiteDb();
  data.products = (data.products || []).filter((p) => p.id !== id);
  saveWebsiteDb(data);
}

function findWebsiteProductByName(name) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  return getProducts().find((p) => String(p.name).trim().toLowerCase() === needle) || null;
}

function getSales() {
  const deletedIds = getDeletedEntityIds();
  const sales = getWebsiteDb().sales || [];
  return sales.filter(s => s && s.id && !deletedIds.has(String(s.id)));
}

function addSale(sale) {
  const data = getWebsiteDb();
  const qty = Number(sale.quantity || 1);
  const product = sale.productId ? data.products.find((p) => p.id === sale.productId) : null;
  const shopId = sale.shopId || (data.shops[0] ? data.shops[0].id : '');
  const shop = data.shops.find((s) => s.id === shopId) || data.shops[0];

  if (product && product.shopStock && product.shopStock[shopId] != null) {
    product.shopStock[shopId] = Math.max(0, Number(product.shopStock[shopId] || 0) - qty);
    normalizeWebsiteProduct(product, data.shops);
  }

  const record = normalizeSale({
    ...sale,
    id: generateId('sale_'),
    orderId: '',
    orderNumber: '#REC-' + Math.floor(1000 + Math.random() * 9000),
    productName: product ? product.name : (sale.productName || 'Showroom Direct Sale'),
    items: sale.items || (product ? [{ name: product.name, quantity: qty, price: Number(sale.total || product.price * qty) / qty }] : []),
    shopId: shop ? shop.id : '',
    shopName: shop ? shop.name : (sale.shopName || 'Main Showroom'),
    quantity: qty,
    total: sale.total != null ? Number(sale.total) : (product ? product.price * qty : 0),
    channel: sale.channel || 'showroom',
    paymentMethod: sale.paymentMethod || 'Direct Sale (Cash/Card)',
    date: sale.date || new Date().toISOString().split('T')[0],
    customer: sale.customer || 'Walk-in Customer',
    customerPhone: sale.customerPhone || sale.phone || ''
  });

  data.sales = data.sales || [];
  data.sales.unshift(record);
  saveWebsiteDb(data);
  return { ok: true, sale: record, product };
}

function deleteSale(id) {
  markEntityDeleted(id);
  const data = getWebsiteDb();
  data.sales = (data.sales || []).filter((s) => s.id !== id);
  saveWebsiteDb(data);
  return true;
}

function getSettings() {
  return getWebsiteDb().settings;
}

function updateSettings(updates) {
  const data = getWebsiteDb();
  data.settings = { ...data.settings, ...updates };
  if (data.shops && data.shops.length > 0) {
    if (updates.shopName) data.shops[0].name = updates.shopName;
    if (updates.phone) data.shops[0].phone = updates.phone;
    if (updates.email) data.shops[0].email = updates.email;
    if (updates.address) data.shops[0].address = updates.address;
  }
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

function findAllOrdersForTracking(query) {
  if (!query) return [];
  const raw = String(query).trim();
  if (!raw) return [];
  const qDigits = raw.replace(/[^0-9]/g, '');
  const orders = getOrders();
  if (!orders.length) return [];

  const results = [];
  const seenIds = new Set();

  function addMatch(o) {
    if (o && !seenIds.has(o.id || o.orderNumber)) {
      seenIds.add(o.id || o.orderNumber);
      results.push(o);
    }
  }

  const matchesPhone = (o) => {
    if (!o.phone || !qDigits) return false;
    const pDigits = String(o.phone).replace(/[^0-9]/g, '');
    if (!pDigits) return false;
    if (pDigits === qDigits) return true;
    if (qDigits.length >= 7 && (pDigits.endsWith(qDigits) || qDigits.endsWith(pDigits))) return true;
    const last9Q = qDigits.length >= 9 ? qDigits.slice(-9) : (qDigits.length >= 7 ? qDigits : '');
    const last9P = pDigits.length >= 9 ? pDigits.slice(-9) : (pDigits.length >= 7 ? pDigits : '');
    return Boolean(last9Q && last9P && last9Q === last9P);
  };

  // Multiple order search is strictly for telephone queries (7+ digits)
  if (qDigits.length >= 7) {
    orders.forEach(o => {
      if (matchesPhone(o)) addMatch(o);
    });
  }

  // Sort orders descending by date (newest first)
  results.sort((a, b) => {
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    return db - da;
  });

  return results;
}

function findOrderForTracking(query) {
  if (!query) return null;
  const raw = String(query).trim();
  if (!raw) return null;
  const q = raw.toLowerCase().replace(/^#/, '');
  const qClean = q.replace(/[^a-z0-9]/g, '');
  const qDigits = raw.replace(/[^0-9]/g, '');
  const orders = getOrders();
  if (!orders.length) return null;

  // 1. Exact match on orderNumber or id (e.g. "#PF-1001", "#CUST-1001", "#CUST-1002")
  let match = orders.find(o => {
    const ordNum = (o.orderNumber || '').toLowerCase().replace(/^#/, '');
    const ordClean = ordNum.replace(/[^a-z0-9]/g, '');
    return ordNum === q || ordClean === qClean || (o.id && o.id.toLowerCase() === q);
  });
  if (match) return match;

  // 2. Custom order match with "cust" (e.g. "cust 1001", "cust1001", "cust-1001")
  if (q.includes('cust') || qClean.startsWith('cust')) {
    match = orders.find(o => {
      const ordClean = (o.orderNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return ordClean === qClean || ordClean.includes(qClean) || qClean.includes(ordClean);
    });
    if (match) return match;
  }

  // 3. PF order match with "pf" (e.g. "pf 1001", "pf1001", "pf-1001")
  if (q.includes('pf') || qClean.startsWith('pf')) {
    match = orders.find(o => {
      const ordClean = (o.orderNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return ordClean === qClean || ordClean.includes(qClean) || qClean.includes(ordClean);
    });
    if (match) return match;
  }

  // 4. Partial match on order number digits (e.g. "1002" matching "#CUST-1002", "1001" matching "#PF-1001")
  if (qDigits.length >= 3 && qDigits.length <= 6) {
    match = orders.find(o => {
      const ordNum = (o.orderNumber || '').toLowerCase();
      const digitsOnly = ordNum.replace(/[^0-9]/g, '');
      return digitsOnly.endsWith(qDigits);
    });
    if (match) return match;
  }

  // 5. Match by phone number if query contains phone digits
  if (qDigits.length >= 7) {
    match = orders.find(o => {
      const pClean = String(o.phone || '').replace(/[^0-9]/g, '');
      return pClean && (pClean.endsWith(qDigits.slice(-9)) || qDigits.endsWith(pClean.slice(-9)));
    });
    if (match) return match;
  }

  // 6. Match by customer name if query is letters
  if (q.length >= 3 && !qDigits) {
    match = orders.find(o => {
      const cName = (o.customerName || '').toLowerCase();
      return cName.includes(q);
    });
    if (match) return match;
  }

  return null;
}

function addOrder(orderData) {
  const db = getWebsiteDb();
  db.orders = db.orders || [];
  const isCustom = Boolean(orderData.isCustom || orderData.type === 'custom' || orderData.orderType === 'custom');

  let orderNumber = orderData.orderNumber;
  if (!orderNumber) {
    if (isCustom) {
      const customCount = db.orders.filter(o => o.isCustom || String(o.orderNumber || '').includes('CUST')).length;
      orderNumber = '#CUST-' + (1000 + customCount + 1);
    } else {
      orderNumber = '#PF-' + (1000 + db.orders.length + 1);
    }
  }

  const normalized = normalizeOrder({
    ...orderData,
    id: generateId(isCustom ? 'cust_ord_' : 'ord_'),
    orderNumber: orderNumber,
    isCustom: isCustom,
    date: orderData.date || new Date().toISOString().split('T')[0]
  });
  db.orders.unshift(normalized);
  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('order-placed', { detail: { order: normalized } }));
  return normalized;
}

function addCustomOrder(customData) {
  return addOrder({
    ...customData,
    isCustom: true,
    type: 'custom',
    channel: customData.channel || 'custom'
  });
}

function updateOrder(id, orderData) {
  const db = getWebsiteDb();
  db.orders = db.orders || [];
  const idx = db.orders.findIndex(o => o.id === id);
  if (idx === -1) return null;

  const currentOrder = db.orders[idx];
  const merged = {
    ...currentOrder,
    ...orderData,
    id: currentOrder.id,
    orderNumber: currentOrder.orderNumber
  };

  const isCustom = Boolean(merged.isCustom || merged.type === 'custom' || merged.orderType === 'custom');
  merged.isCustom = isCustom;
  if (isCustom) {
    merged.type = 'custom';
    if (orderData.status) merged.customStage = orderData.status;
  }

  const normalized = normalizeOrder(merged);
  db.orders[idx] = normalized;

  // If this order is completed and recorded in sales, update corresponding sale record
  if (normalized.status === 'completed') {
    db.sales = db.sales || [];
    const saleIdx = db.sales.findIndex(s => s.orderId === normalized.id);
    const saleRecord = normalizeSale({
      id: saleIdx >= 0 ? db.sales[saleIdx].id : generateId('sale_'),
      orderId: normalized.id,
      orderNumber: normalized.orderNumber,
      customer: normalized.customerName,
      customerPhone: normalized.phone,
      shopId: normalized.shopId,
      shopName: normalized.shopName,
      productName: normalized.isCustom
        ? `✨ Custom: ${normalized.customItemName || 'Handcrafted Furniture'} (${normalized.woodType || 'Custom Wood'})`
        : ((normalized.items && normalized.items.length)
          ? normalized.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
          : (normalized.item || 'Order Item')),
      items: normalized.items || [],
      quantity: 1,
      total: Number(normalized.agreedPrice || normalized.total || 0),
      channel: normalized.isCustom ? 'custom' : (normalized.channel || 'website'),
      date: normalized.date || new Date().toISOString().split('T')[0],
      paymentMethod: normalized.isCustom ? 'Custom Order Completed (Balance Cleared)' : 'Order Delivered (COD/Paid)',
      notes: normalized.notes || ''
    });
    if (saleIdx >= 0) {
      db.sales[saleIdx] = saleRecord;
    } else {
      db.sales.unshift(saleRecord);
    }
  }

  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('order-updated', { detail: { order: normalized } }));
  return normalized;
}

function updateCustomOrder(id, customData) {
  return updateOrder(id, {
    ...customData,
    isCustom: true,
    type: 'custom'
  });
}

function updateOrderAdvance(id, advancePaid, paymentMethod, paymentNote) {
  const db = getWebsiteDb();
  db.orders = db.orders || [];
  const order = db.orders.find(o => o.id === id);
  if (!order) return null;

  const total = Number(order.agreedPrice || order.total || 0);
  const advance = Math.max(0, Number(advancePaid || 0));
  const balance = Math.max(0, total - advance);

  let newNotes = order.notes || '';
  if (paymentNote && paymentNote.trim()) {
    const cleanNote = paymentNote.trim();
    if (!newNotes.includes(cleanNote)) {
      newNotes = newNotes ? `${newNotes} | Advance Ref: ${cleanNote}` : `Advance Ref: ${cleanNote}`;
    }
  }

  return updateOrder(id, {
    advancePaid: advance,
    balanceDue: balance,
    paymentMethod: paymentMethod || order.paymentMethod || (advance > 0 ? 'Cash Advance' : 'Pending Payment'),
    notes: newNotes
  });
}

if (typeof window !== 'undefined') {
  window.updateOrder = updateOrder;
  window.updateCustomOrder = updateCustomOrder;
  window.updateOrderAdvance = updateOrderAdvance;
}

function updateOrderStatus(id, status) {
  const db = getWebsiteDb();
  db.orders = db.orders || [];
  db.sales = db.sales || [];
  const order = db.orders.find(o => o.id === id);
  if (!order) return null;
  const previousStatus = order.status;
  order.status = status;
  if (order.isCustom) {
    order.customStage = status;
  }

  // When order is marked completed / delivered to customer, automatically add to Sales!
  if (status === 'completed') {
    const isCustom = Boolean(order.isCustom || order.type === 'custom');
    const existingSaleIdx = db.sales.findIndex(s => s.orderId === order.id);
    const saleRecord = normalizeSale({
      id: existingSaleIdx >= 0 ? db.sales[existingSaleIdx].id : generateId('sale_'),
      orderId: order.id,
      orderNumber: order.orderNumber || ('#PF-' + String(order.id).slice(-4)),
      customer: order.customerName,
      customerPhone: order.phone,
      shopId: order.shopId,
      shopName: order.shopName,
      productName: isCustom
        ? `✨ Custom: ${order.customItemName || 'Handcrafted Furniture'} (${order.woodType || 'Custom Wood'})`
        : ((order.items && order.items.length)
          ? order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
          : (order.item || 'Custom Furniture Order')),
      items: order.items || [],
      quantity: 1,
      total: Number(order.agreedPrice || order.total || 0),
      channel: isCustom ? 'custom' : (order.channel || 'website'),
      date: new Date().toISOString().split('T')[0],
      paymentMethod: isCustom ? 'Custom Order Completed (Balance Cleared)' : 'Order Delivered (COD/Paid)',
      notes: order.notes || (isCustom ? `Custom Specs: ${order.dimensions || ''} - ${order.woodType || ''}` : '')
    });

    if (existingSaleIdx >= 0) {
      db.sales[existingSaleIdx] = saleRecord;
    } else {
      db.sales.unshift(saleRecord);
    }
  } else if (previousStatus === 'completed' && status !== 'completed') {
    // If order was previously completed and is reverted, remove it from sales
    db.sales = db.sales.filter(s => s.orderId !== order.id);
  }

  saveWebsiteDb(db);
  return order;
}

function deleteOrder(id) {
  markEntityDeleted(id);
  const db = getWebsiteDb();
  db.orders = (db.orders || []).filter(o => o.id !== id);
  db.sales = (db.sales || []).filter(s => s.orderId !== id);
  saveWebsiteDb(db);
  return true;
}

function syncCompletedOrdersToSales() {
  const db = getWebsiteDb();
  db.orders = db.orders || [];
  db.sales = db.sales || [];
  let updated = false;

  // Purge any old dummy sales
  const prevLen = db.sales.length;
  db.sales = db.sales.filter(s => s && s.id !== 's1' && s.id !== 's2' && !String(s.customer || '').includes('Sunil Ranasinghe') && !String(s.customer || '').includes('Malini Fernando'));
  if (db.sales.length !== prevLen) updated = true;

  // Add any delivered orders that aren't recorded in sales yet
  db.orders.forEach(o => {
    if (o.status === 'completed' && !db.sales.some(s => s.orderId === o.id)) {
      db.sales.unshift(normalizeSale({
        id: generateId('sale_'),
        orderId: o.id,
        orderNumber: o.orderNumber,
        customer: o.customerName,
        customerPhone: o.phone,
        shopId: o.shopId,
        shopName: o.shopName,
        productName: (o.items && o.items.length) ? o.items.map(i => `${i.quantity}x ${i.name}`).join(', ') : 'Order Item',
        items: o.items || [],
        quantity: (o.items && o.items.length) ? o.items.reduce((sum, i) => sum + Number(i.quantity || 1), 0) : 1,
        total: Number(o.total || 0),
        channel: o.channel || 'website',
        date: o.date || new Date().toISOString().split('T')[0],
        paymentMethod: 'Order Delivered (COD/Paid)',
        notes: o.notes || ''
      }));
      updated = true;
    }
  });

  if (updated) saveWebsiteDb(db);
}

/* ---------- Customer Messages & Inquiries ---------- */

function getContactMessages() {
  return getWebsiteDb().messages || [];
}

function addContactMessage(msgData) {
  const db = getWebsiteDb();
  db.messages = db.messages || [];
  const normalized = normalizeMessage(msgData);
  db.messages.unshift(normalized);
  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('message-received', { detail: { message: normalized } }));
  return normalized;
}

function markMessageStatus(id, status = 'read') {
  const db = getWebsiteDb();
  db.messages = db.messages || [];
  const msg = db.messages.find(m => m.id === id);
  if (!msg) return null;
  msg.status = status;
  saveWebsiteDb(db);
  return msg;
}

function deleteContactMessage(id) {
  markEntityDeleted(id);
  const db = getWebsiteDb();
  db.messages = (db.messages || []).filter(m => m.id !== id);
  saveWebsiteDb(db);
  return true;
}

/* ---------- Furniture Design Gallery & Project Albums ---------- */

function getGalleryAlbums() {
  const db = getWebsiteDb();
  return (db.galleryAlbums || []).map(normalizeGalleryAlbum);
}

function getGalleryAlbumById(id) {
  if (!id) return null;
  const albums = getGalleryAlbums();
  return albums.find(a => a.id === id) || null;
}

function addGalleryAlbum(albumData) {
  const db = getWebsiteDb();
  db.galleryAlbums = db.galleryAlbums || [];
  const normalized = normalizeGalleryAlbum({
    ...albumData,
    id: generateId('alb_'),
    date: albumData.date || new Date().toISOString().split('T')[0]
  });
  db.galleryAlbums.unshift(normalized);
  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { action: 'add', album: normalized } }));
  return normalized;
}

function updateGalleryAlbum(id, albumData) {
  const db = getWebsiteDb();
  db.galleryAlbums = db.galleryAlbums || [];
  const idx = db.galleryAlbums.findIndex(a => a.id === id);
  if (idx === -1) return null;

  const current = db.galleryAlbums[idx];
  const merged = normalizeGalleryAlbum({
    ...current,
    ...albumData,
    id: current.id
  });
  db.galleryAlbums[idx] = merged;
  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { action: 'update', album: merged } }));
  return merged;
}

function deleteGalleryAlbum(id) {
  markEntityDeleted(id);
  const db = getWebsiteDb();
  db.galleryAlbums = (db.galleryAlbums || []).filter(a => a.id !== id);
  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { action: 'delete', id: id } }));
  return true;
}

function addPhotoToAlbum(albumId, photoData) {
  const db = getWebsiteDb();
  db.galleryAlbums = db.galleryAlbums || [];
  const album = db.galleryAlbums.find(a => a.id === albumId);
  if (!album) return null;

  album.photos = album.photos || [];
  const normalizedPhoto = normalizeGalleryPhoto(photoData, album.photos.length);
  album.photos.push(normalizedPhoto);
  if (!album.coverImage && normalizedPhoto.url) {
    album.coverImage = normalizedPhoto.url;
  }
  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { action: 'photo-added', albumId: albumId } }));
  return album;
}

function removePhotoFromAlbum(albumId, photoIndex) {
  const db = getWebsiteDb();
  db.galleryAlbums = db.galleryAlbums || [];
  const album = db.galleryAlbums.find(a => a.id === albumId);
  if (!album || !album.photos || !album.photos[photoIndex]) return null;

  album.photos.splice(photoIndex, 1);
  if (album.photos.length > 0) {
    if (!album.photos.some(p => p.url === album.coverImage)) {
      album.coverImage = album.photos[0].url;
    }
  }
  saveWebsiteDb(db);
  window.dispatchEvent(new CustomEvent('gallery-updated', { detail: { action: 'photo-removed', albumId: albumId } }));
  return album;
}

function formatWhatsAppNumber(phone) {
  if (!phone) return '94772345678';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.slice(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith('94')) {
    cleaned = '94' + cleaned;
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
    unreadMessagesCount: (data.messages || []).filter(m => m.status === 'unread').length,
    totalMessagesCount: (data.messages || []).length,
    retailStockQty: data.products.reduce((sum, p) => sum + getRetailStockTotal(p), 0),
    totalAlbums: (data.galleryAlbums || []).length
  };
}

/* ---------- Workshop DB APIs (Workshop Management only) ---------- */

function getWorkshopProducts() {
  const deletedIds = getDeletedEntityIds();
  const products = getWorkshopDb().products || [];
  return products.filter((p) => p && p.id && !deletedIds.has(String(p.id)));
}

function addWorkshopProduct(product) {
  const data = getWorkshopDb();
  product.id = generateId('wp');
  data.products.unshift(normalizeWorkshopProduct(product));
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
  markEntityDeleted(id);
  const data = getWorkshopDb();
  data.products = (data.products || []).filter((p) => p.id !== id);
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
