const header = document.getElementById('header');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');
const shopOrderForm = document.getElementById('shopOrderForm');
const shopOrderSuccess = document.getElementById('shopOrderSuccess');
const productsGrid = document.getElementById('productsGrid');
const filterBar = document.getElementById('filterBar');
const emptyProducts = document.getElementById('emptyProducts');
const productModal = document.getElementById('productModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const modalBackdrop = document.getElementById('modalBackdrop');
const orderProductSelect = document.getElementById('orderProduct');
const orderShopSelect = document.getElementById('orderShop');
const shopSelect = document.getElementById('shopSelect');

let currentCategory = 'all';
let currentShopId = '';
let revealObserver = null;
let filterTimer = null;

function formatPrice(price) {
  return 'Rs. ' + price.toLocaleString('en-LK');
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

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const valid = ['all', 'chairs', 'tables', 'beds', 'cabinets'];
  return valid.includes(category) ? category : 'all';
}

function loadSettings() {
  const settings = (typeof getSettings === 'function') ? getSettings() : null;
  if (!settings) return;

  const displayName = (settings.shopName && settings.shopName.trim()) || 'Pendragon Furniture';
  const displayAddress = (settings.address && settings.address.trim()) || '45, Furniture Lane, Moratuwa';
  const displayPhone = (settings.phone && settings.phone.trim()) || '+94 11 234 5678';
  const displayEmail = (settings.email && settings.email.trim()) || 'info@woodcraft.lk';
  const waNum = (settings.whatsapp && settings.whatsapp.trim()) || displayPhone;

  const shopNameEl = document.getElementById('shopName');
  const shopAddressEl = document.getElementById('shopAddress');
  const shopPhoneEl = document.getElementById('shopPhone');
  const shopEmailEl = document.getElementById('shopEmail');
  const shopWhatsAppEl = document.getElementById('shopWhatsApp');
  const shopWhatsAppLinkEl = document.getElementById('shopWhatsAppLink');
  const floatingWhatsAppBtnEl = document.getElementById('floatingWhatsAppBtn');

  if (shopNameEl) shopNameEl.textContent = displayName;
  if (shopAddressEl) shopAddressEl.textContent = displayAddress;
  if (shopPhoneEl) shopPhoneEl.textContent = displayPhone;
  if (shopEmailEl) shopEmailEl.textContent = displayEmail;
  if (shopWhatsAppEl) shopWhatsAppEl.textContent = waNum;

  if (shopWhatsAppLinkEl) {
    shopWhatsAppLinkEl.href = getWhatsAppUrl(`Hello ${displayName}! I would like to inquire about your furniture.`, waNum);
  }
  if (floatingWhatsAppBtnEl) {
    floatingWhatsAppBtnEl.href = getWhatsAppUrl(`Hello ${displayName}! I would like to inquire about your furniture designs.`, waNum);
  }

  // Footer Logo text and copyright update
  const footerLogos = document.querySelectorAll('.footer-brand .logo-text');
  footerLogos.forEach(el => { el.textContent = displayName; });

  const footerCopyrights = document.querySelectorAll('.footer-bottom p');
  footerCopyrights.forEach(el => {
    const year = new Date().getFullYear();
    el.innerHTML = `&copy; ${year} ${escapeHtml(displayName)}. All rights reserved.`;
  });

  // Dynamic document title update
  if (document.title) {
    if (document.title.includes('Shop') || document.title.includes('Catalog')) {
      document.title = `${displayName} | Handcrafted Wooden Furniture Catalog`;
    } else if (document.title.includes('Furniture')) {
      document.title = `${displayName} | Handcrafted Wooden Furniture Sri Lanka`;
    }
  }
}

function updateProductCount() {
  const productCountEl = document.getElementById('productCount');
  if (!productCountEl) return;

  const products = getAvailableProducts();
  productCountEl.dataset.count = String(products.length);
  if (productCountEl.dataset.counted === 'true') {
    productCountEl.textContent = products.length;
  }
}

function initShopSelect() {
  const shops = getActiveShops();
  const shop = shops[0] || null;
  currentShopId = shop ? shop.id : '';

  if (orderShopSelect) {
    orderShopSelect.value = currentShopId;
  }
  updateSelectedShopDetails();
}

function updateSelectedShopDetails() {
  // Always synchronize website settings as the single source of truth for the showroom
  loadSettings();
}

function fillOrderProductSelect(selectedId = '', selectedDesignName = '') {
  if (!orderProductSelect) return;
  const products = getAvailableProducts();
  orderProductSelect.innerHTML = '<option value="">Select a product</option>' +
    products.map((p) => {
      return `
      <option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>
        ${escapeHtml(p.name)} — Starting from ${formatPrice(p.price)}
      </option>`;
    }).join('');

  if (selectedId) {
    orderProductSelect.value = selectedId;
  }
  updateOrderDesignDropdown(orderProductSelect.value, selectedDesignName);
  updateOrderPricing();
}

function updateOrderDesignDropdown(productId, targetDesignName = '') {
  const orderDesignSelect = document.getElementById('orderDesign');
  if (!orderDesignSelect) return;

  if (!productId) {
    orderDesignSelect.innerHTML = '<option value="">Select a product first</option>';
    orderDesignSelect.disabled = true;
    return;
  }

  const product = getProducts().find(p => p.id === productId);
  if (!product) {
    orderDesignSelect.innerHTML = '<option value="">Select a design</option>';
    orderDesignSelect.disabled = true;
    return;
  }

  const designs = getProductDesigns(product);
  orderDesignSelect.disabled = false;
  orderDesignSelect.innerHTML = designs.map((d, i) => {
    const isSelected = targetDesignName ? (d.name === targetDesignName) : (i === 0);
    return `<option value="${escapeHtml(d.name)}" data-price="${d.price}" ${isSelected ? 'selected' : ''}>
      ${escapeHtml(d.name)} — ${formatPrice(d.price)}
    </option>`;
  }).join('');
}

let currentOrderMode = 'single';

function switchOrderMode(mode) {
  currentOrderMode = mode;
  const singleTab = document.getElementById('tabSingleOrder');
  const cartTab = document.getElementById('tabCartOrder');
  const singleFields = document.getElementById('singleItemOrderFields');
  const cartPreview = document.getElementById('cartOrderPreview');

  if (singleTab) singleTab.classList.toggle('active', mode === 'single');
  if (cartTab) cartTab.classList.toggle('active', mode === 'cart');
  if (singleFields) singleFields.hidden = (mode === 'cart');
  if (cartPreview) cartPreview.hidden = (mode !== 'cart');

  if (mode === 'cart') {
    renderOrderCartPreview();
  }
  updateOrderPricing();
}

function renderOrderCartPreview() {
  const listEl = document.getElementById('cartOrderPreviewList');
  if (!listEl) return;
  const cart = getCart();
  if (!cart.length) {
    listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem;margin:0;">Your shopping cart is empty. Add items from the shop or switch to Single Item mode.</p>';
    return;
  }

  listEl.innerHTML = cart.map(item => `
    <div class="cart-preview-item">
      <div class="cart-preview-info">
        <span class="cart-preview-title">${item.quantity}x ${escapeHtml(item.name)}</span>
        <span class="cart-preview-design">${escapeHtml(item.designName)}</span>
      </div>
      <span class="cart-preview-price">${formatPrice(item.price * item.quantity)}</span>
    </div>
  `).join('');
}

function updateOrderPricing() {
  const pricingCard = document.getElementById('orderPricingCard');
  if (!pricingCard) return;

  const unitPriceEl = document.getElementById('orderUnitPrice');
  const totalPriceEl = document.getElementById('orderTotalPrice');
  const pricingDesignEl = document.getElementById('orderPricingDesign');
  const unitPriceRow = unitPriceEl ? unitPriceEl.closest('.order-pricing-row') : null;

  if (currentOrderMode === 'cart') {
    const cart = getCart();
    const count = getCartItemCount();
    const total = getCartTotal();

    if (pricingDesignEl) pricingDesignEl.textContent = `${count} item${count !== 1 ? 's' : ''} in cart`;
    if (unitPriceRow) unitPriceRow.style.display = 'none';
    if (totalPriceEl) totalPriceEl.textContent = formatPrice(total);
    return;
  }

  if (unitPriceRow) unitPriceRow.style.display = '';

  const productSelect = document.getElementById('orderProduct');
  const designSelect = document.getElementById('orderDesign');
  const qtyInput = document.getElementById('orderQty');

  if (!productSelect || !productSelect.value) {
    if (unitPriceEl) unitPriceEl.textContent = 'Rs. 0';
    if (totalPriceEl) totalPriceEl.textContent = 'Rs. 0';
    if (pricingDesignEl) pricingDesignEl.textContent = '—';
    return;
  }

  const product = getProducts().find(p => p.id === productSelect.value);
  if (!product) return;

  const designs = getProductDesigns(product);
  let selectedDesign = designs[0];
  if (designSelect && designSelect.value) {
    const match = designs.find(d => d.name === designSelect.value);
    if (match) selectedDesign = match;
  }

  const qty = Math.max(1, parseInt(qtyInput ? qtyInput.value : '1', 10) || 1);
  const unitPrice = selectedDesign ? selectedDesign.price : product.price;
  const total = unitPrice * qty;

  if (pricingDesignEl) pricingDesignEl.textContent = selectedDesign ? selectedDesign.name : 'Standard';
  if (unitPriceEl) unitPriceEl.textContent = formatPrice(unitPrice);
  if (totalPriceEl) totalPriceEl.textContent = formatPrice(total);
}

function renderProducts(category = 'all', { animate = true } = {}) {
  if (!productsGrid || !emptyProducts) {
    updateProductCount();
    return;
  }

  const products = getAvailableProducts();
  const filtered = category === 'all' ? products : products.filter(p => p.category === category);
  updateProductCount();

  if (filtered.length === 0) {
    productsGrid.innerHTML = '';
    emptyProducts.hidden = false;
    return;
  }

  emptyProducts.hidden = true;
  productsGrid.innerHTML = filtered.map((p, i) => {
    return `
    <article class="product-card" style="--stagger: ${0.05 + (i % 6) * 0.07}s" data-id="${p.id}">
      <div class="product-image">${getProductCardImageHtml(p)}</div>
      <div class="product-info">
        <span class="product-category">${escapeHtml(CATEGORIES[p.category] || p.category)}</span>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="product-desc">${escapeHtml(p.description)}</p>
        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}</span>
        </div>
        <button class="btn btn-primary btn-full product-btn">View Details</button>
      </div>
    </article>
  `;
  }).join('');

  productsGrid.querySelectorAll('.product-card').forEach(card => {
    const productId = card.dataset.id;
    const product = getProducts().find(p => p.id === productId);
    const images = product ? getProductImages(product) : [];

    card.addEventListener('click', () => showProductModal(productId));

    const imageEl = card.querySelector('.product-image');
    if (imageEl && images.some(isImageSource)) {
      imageEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openImageZoom(images, 0);
      });
    }
  });

  const cards = productsGrid.querySelectorAll('.product-card');
  if (!animate || prefersReducedMotion()) {
    cards.forEach((card) => card.classList.add('is-visible'));
    return;
  }

  requestAnimationFrame(() => {
    cards.forEach((card) => card.classList.add('anim-in'));
  });
}

function initProductGallery(galleryEl, images) {
  const main = galleryEl.querySelector('.gallery-main');
  const thumbs = galleryEl.querySelectorAll('.gallery-thumb');
  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = Number(thumb.dataset.index);
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      main.dataset.zoomIndex = String(index);
      main.innerHTML = getProductImageHtml(images[index], 'gallery-main-img') +
        '<span class="gallery-zoom-hint">Click to zoom</span>';
      bindGalleryZoom(main, images);
    });
  });
  bindGalleryZoom(main, images);
}

const imageZoom = document.getElementById('imageZoom');
const imageZoomImg = document.getElementById('imageZoomImg');
const imageZoomStage = document.getElementById('imageZoomStage');
const imageZoomPrev = document.getElementById('imageZoomPrev');
const imageZoomNext = document.getElementById('imageZoomNext');

let zoomImages = [];
let zoomIndex = 0;
let zoomScale = 1;
let zoomX = 0;
let zoomY = 0;
let zoomDragging = false;
let zoomStartX = 0;
let zoomStartY = 0;
let zoomOriginX = 0;
let zoomOriginY = 0;

function applyZoomTransform() {
  if (!imageZoomImg) return;
  imageZoomImg.style.transform = `translate(calc(-50% + ${zoomX}px), calc(-50% + ${zoomY}px)) scale(${zoomScale})`;
}

function setZoomImage() {
  if (!imageZoomImg || !zoomImages.length) return;
  const src = zoomImages[zoomIndex];
  if (!isImageSource(src)) {
    imageZoomImg.removeAttribute('src');
    imageZoomImg.alt = src;
    imageZoomImg.style.fontSize = '6rem';
    imageZoomImg.style.width = 'auto';
    imageZoomImg.style.height = 'auto';
    return;
  }
  imageZoomImg.style.fontSize = '';
  imageZoomImg.onload = () => {
    const stageW = imageZoomStage.clientWidth;
    const stageH = imageZoomStage.clientHeight;
    const ratio = Math.min(stageW / imageZoomImg.naturalWidth, stageH / imageZoomImg.naturalHeight, 1);
    imageZoomImg.style.width = `${imageZoomImg.naturalWidth * ratio}px`;
    imageZoomImg.style.height = `${imageZoomImg.naturalHeight * ratio}px`;
    zoomScale = 1;
    zoomX = 0;
    zoomY = 0;
    applyZoomTransform();
  };
  imageZoomImg.src = src;
  imageZoomImg.alt = 'Product image zoom';
}

function openImageZoom(images, startIndex = 0) {
  if (!imageZoom || !images || !images.length) return;
  const usable = images.filter((img) => isImageSource(img) || (img && img.length < 4));
  if (!usable.length) return;

  zoomImages = images.filter((img) => isImageSource(img));
  if (!zoomImages.length) return;

  zoomIndex = Math.max(0, Math.min(startIndex, zoomImages.length - 1));
  // Map start index if emoji filtered out - find closest real image
  if (!isImageSource(images[startIndex])) {
    zoomIndex = 0;
  } else {
    zoomIndex = zoomImages.indexOf(images[startIndex]);
    if (zoomIndex < 0) zoomIndex = 0;
  }

  const multi = zoomImages.length > 1;
  if (imageZoomPrev) imageZoomPrev.hidden = !multi;
  if (imageZoomNext) imageZoomNext.hidden = !multi;

  imageZoom.hidden = false;
  document.body.style.overflow = 'hidden';
  setZoomImage();
}

function closeImageZoom() {
  if (!imageZoom) return;
  imageZoom.hidden = true;
  zoomScale = 1;
  zoomX = 0;
  zoomY = 0;
  if (!productModal || productModal.hidden) {
    document.body.style.overflow = '';
  }
}

function changeZoomImage(delta) {
  if (zoomImages.length < 2) return;
  zoomIndex = (zoomIndex + delta + zoomImages.length) % zoomImages.length;
  setZoomImage();
}

function bindGalleryZoom(mainEl, images) {
  if (!mainEl) return;
  mainEl.onclick = (e) => {
    e.stopPropagation();
    const index = Number(mainEl.dataset.zoomIndex || 0);
    openImageZoom(images, index);
  };
}

function showProductModal(id) {
  if (!productModal || !modalBody) return;

  const product = getProducts().find(p => p.id === id);
  if (!product) return;

  const images = getProductImages(product);
  const designs = getProductDesigns(product);
  let selectedDesignIndex = 0;
  const initialDesign = designs[0] || { name: 'Standard Edition', price: product.price };

  const shop = getShopById(currentShopId) || getActiveShops()[0];

  modalBody.innerHTML = `
    <div class="modal-product">
      <div class="modal-product-image">${getProductGalleryHtml(images)}</div>
      <div class="modal-product-info">
        <span class="product-category">${escapeHtml(CATEGORIES[product.category] || product.category)}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <div class="modal-price-wrap">
          <span class="modal-price" id="modalProductPrice">${formatPrice(initialDesign.price)}</span>
          <span class="modal-design-badge" id="modalDesignBadge">${escapeHtml(initialDesign.name)}</span>
        </div>
        <p class="modal-desc">${escapeHtml(product.description)}</p>

        <div class="modal-variants-section">
          <div class="variants-header">
            <span class="variants-title">Select Design / Finish</span>
            <span class="variants-subtitle">Price adjusts according to selected design</span>
          </div>
          <div class="design-chips-list" id="modalDesignChips">
            ${designs.map((d, index) => {
              const isSelected = index === 0;
              const priceDiff = d.price - product.price;
              let diffLabel = '';
              if (index === 0 || priceDiff === 0) {
                diffLabel = 'Standard';
              } else if (priceDiff > 0) {
                diffLabel = `+${formatPrice(priceDiff)}`;
              } else {
                diffLabel = `-${formatPrice(Math.abs(priceDiff))}`;
              }
              return `
                <button type="button" class="design-chip ${isSelected ? 'active' : ''}" data-index="${index}" aria-pressed="${isSelected}">
                  <span class="chip-indicator"></span>
                  <div class="chip-info">
                    <span class="chip-name">${escapeHtml(d.name)}</span>
                    <span class="chip-price">${formatPrice(d.price)}</span>
                  </div>
                  <span class="chip-badge ${priceDiff === 0 ? 'base' : 'extra'}">${escapeHtml(diffLabel)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="modal-meta">
          ${shop ? `<span>📍 ${escapeHtml(shop.name)}</span>` : ''}
          <span>🖼️ ${images.length} photo${images.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="modal-actions-row">
          <button type="button" class="btn btn-add-cart btn-lg" id="modalAddToCartBtn">
            <span>🛍️</span> Add to Cart
          </button>
          <button type="button" class="btn btn-whatsapp btn-lg" id="modalWhatsAppBtn">
            <svg class="whatsapp-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.34C9.33 7.34 9 7.42 8.73 7.71C8.45 8.01 7.68 8.74 7.68 10.21C7.68 11.69 8.75 13.11 8.9 13.31C9.05 13.51 11.02 16.55 14.04 17.85C14.76 18.16 15.32 18.35 15.76 18.49C16.48 18.72 17.14 18.69 17.65 18.61C18.23 18.52 19.42 17.89 19.67 17.19C19.92 16.49 19.92 15.89 19.84 15.76C19.77 15.63 19.57 15.56 19.27 15.41C18.98 15.26 17.51 14.54 17.24 14.44C16.96 14.34 16.77 14.29 16.57 14.59C16.37 14.88 15.81 15.56 15.63 15.76C15.46 15.96 15.29 15.98 14.99 15.83C14.7 15.68 13.74 15.37 12.61 14.36C11.73 13.57 11.13 12.6 10.96 12.3C10.79 12.01 10.94 11.85 11.09 11.7C11.22 11.57 11.38 11.36 11.53 11.18C11.68 11.01 11.73 10.88 11.83 10.69C11.93 10.49 11.88 10.32 11.8 10.17C11.73 10.02 11.13 8.56 10.88 7.96C10.64 7.37 10.4 7.45 10.22 7.44C10.04 7.44 9.84 7.44 9.53 7.34Z"/>
            </svg>
            Order via WhatsApp
          </button>
          <a href="#order" class="btn btn-outline btn-lg" id="orderBtn">Direct Order</a>
        </div>
      </div>
    </div>
  `;

  const gallery = modalBody.querySelector('.product-gallery');
  if (gallery) {
    initProductGallery(gallery, images);
  }

  const chipButtons = modalBody.querySelectorAll('.design-chip');
  const priceEl = document.getElementById('modalProductPrice');
  const badgeEl = document.getElementById('modalDesignBadge');

  chipButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      if (isNaN(idx) || !designs[idx]) return;

      selectedDesignIndex = idx;
      chipButtons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      const chosen = designs[idx];

      if (priceEl) {
        priceEl.textContent = formatPrice(chosen.price);
        priceEl.classList.remove('price-pulse');
        void priceEl.offsetWidth; // force DOM reflow
        priceEl.classList.add('price-pulse');
      }

      if (badgeEl) {
        badgeEl.textContent = chosen.name;
        badgeEl.classList.remove('badge-flash');
        void badgeEl.offsetWidth;
        badgeEl.classList.add('badge-flash');
      }
    });
  });

  const addToCartBtn = document.getElementById('modalAddToCartBtn');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const chosenDesign = designs[selectedDesignIndex] || designs[0];
      addToCart(product.id, chosenDesign ? chosenDesign.name : '', 1);
      addToCartBtn.classList.add('added-success');
      addToCartBtn.innerHTML = '<span>✓</span> Added to Cart!';
      setTimeout(() => {
        addToCartBtn.classList.remove('added-success');
        addToCartBtn.innerHTML = '<span>🛍️</span> Add to Cart';
        closeModal();
        openCart();
      }, 400);
    });
  }

  const modalWhatsAppBtn = document.getElementById('modalWhatsAppBtn');
  if (modalWhatsAppBtn) {
    modalWhatsAppBtn.addEventListener('click', () => {
      const chosenDesign = designs[selectedDesignIndex] || designs[0];
      const designTitle = chosenDesign ? chosenDesign.name : 'Standard';
      const unitPrice = chosenDesign ? chosenDesign.price : product.price;
      const settings = (typeof getSettings === 'function') ? getSettings() : {};
      const companyName = (settings && settings.shopName) ? settings.shopName : 'Pendragon Furniture';
      const showroom = shop ? shop.name : companyName;

      const msg = [
        `*New Furniture Order Inquiry - ${companyName}* 🪑`,
        ``,
        `• *Item:* ${product.name}`,
        `• *Design / Variant:* ${designTitle}`,
        `• *Category:* ${CATEGORIES[product.category] || product.category}`,
        `• *Price:* ${formatPrice(unitPrice)}`,
        `• *Preferred Showroom:* ${showroom}`,
        ``,
        `Hello! I would like to order this piece. Please confirm availability and delivery timeframe. Thank you!`
      ].join('\n');

      const url = getWhatsAppUrl(msg);
      window.open(url, '_blank');
    });
  }

  productModal.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => productModal.classList.add('is-open'));

  document.getElementById('orderBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const chosenDesign = designs[selectedDesignIndex] || designs[0];
    closeModal();
    const orderSection = document.getElementById('order');
    if (orderSection) {
      switchOrderMode('single');
      fillOrderProductSelect(product.id, chosenDesign ? chosenDesign.name : '');
      orderSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      const designParam = chosenDesign ? `&design=${encodeURIComponent(chosenDesign.name)}` : '';
      window.location.href = `shop.html?product=${encodeURIComponent(product.id)}${designParam}#order`;
    }
  });
}

function closeModal() {
  if (!productModal) return;
  productModal.classList.remove('is-open');
  document.body.style.overflow = '';

  if (prefersReducedMotion()) {
    productModal.hidden = true;
    return;
  }

  setTimeout(() => {
    if (!productModal.classList.contains('is-open')) {
      productModal.hidden = true;
    }
  }, 280);
}

/* =========================================================
   CART DRAWER CONTROLLER
   ========================================================= */

function openCart() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;
  drawer.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  renderCartDrawer();
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  if (!drawer) return;
  drawer.classList.remove('is-open');
  document.body.style.overflow = '';

  if (prefersReducedMotion()) {
    drawer.hidden = true;
    return;
  }

  setTimeout(() => {
    if (!drawer.classList.contains('is-open')) {
      drawer.hidden = true;
    }
  }, 320);
}

function renderCartDrawer() {
  const cart = typeof getCart === 'function' ? getCart() : [];
  const count = typeof getCartItemCount === 'function' ? getCartItemCount() : 0;
  const total = typeof getCartTotal === 'function' ? getCartTotal() : 0;

  const countBadges = document.querySelectorAll('#cartCountBadge, #floatingCartBadge');
  countBadges.forEach(b => {
    b.textContent = count;
    b.hidden = count === 0;
    b.classList.remove('cart-badge-bump');
    void b.offsetWidth;
    if (count > 0) b.classList.add('cart-badge-bump');
  });

  const headerCount = document.getElementById('cartHeaderCount');
  if (headerCount) headerCount.textContent = `${count} item${count !== 1 ? 's' : ''}`;

  const tabCount = document.getElementById('cartTabCount');
  if (tabCount) tabCount.textContent = count;

  const emptyEl = document.getElementById('cartEmpty');
  const listEl = document.getElementById('cartItemsList');
  const footerEl = document.getElementById('cartFooter');
  const subtotalEl = document.getElementById('cartSubtotal');
  const grandTotalEl = document.getElementById('cartGrandTotal');

  if (subtotalEl) subtotalEl.textContent = formatPrice(total);
  if (grandTotalEl) grandTotalEl.textContent = formatPrice(total);

  if (count === 0) {
    if (emptyEl) emptyEl.hidden = false;
    if (listEl) listEl.innerHTML = '';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (footerEl) footerEl.style.display = '';

  if (listEl) {
    listEl.innerHTML = cart.map(item => `
      <div class="cart-item-card" data-id="${item.id}">
        <div class="cart-item-thumb">
          ${isImageSource(item.image)
            ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null; this.src='images/logo-icon.png'; this.style.padding='0.2rem'; this.style.objectFit='contain';">`
            : `<span>${item.image || '🪑'}</span>`
          }
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${escapeHtml(item.name)}</div>
          <span class="cart-item-design">${escapeHtml(item.designName)}</span>
          <div class="cart-item-price">${formatPrice(item.price)} each</div>
          <div class="cart-item-bottom">
            <div class="qty-stepper">
              <button type="button" class="btn-qty-minus" aria-label="Decrease quantity">−</button>
              <input type="number" class="qty-input" min="1" max="99" value="${item.quantity}" aria-label="Item quantity">
              <button type="button" class="btn-qty-plus" aria-label="Increase quantity">+</button>
            </div>
            <strong class="cart-item-total">${formatPrice(item.price * item.quantity)}</strong>
          </div>
        </div>
        <button type="button" class="cart-item-remove" title="Remove item" aria-label="Remove item">&times;</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.cart-item-card').forEach(card => {
      const cartId = card.dataset.id;
      const minusBtn = card.querySelector('.btn-qty-minus');
      const plusBtn = card.querySelector('.btn-qty-plus');
      const input = card.querySelector('.qty-input');
      const removeBtn = card.querySelector('.cart-item-remove');

      if (minusBtn && input) {
        minusBtn.addEventListener('click', () => {
          const current = parseInt(input.value, 10) || 1;
          updateCartItemQty(cartId, current - 1);
        });
      }

      if (plusBtn && input) {
        plusBtn.addEventListener('click', () => {
          const current = parseInt(input.value, 10) || 1;
          updateCartItemQty(cartId, current + 1);
        });
      }

      if (input) {
        input.addEventListener('change', () => {
          const val = Math.max(1, parseInt(input.value, 10) || 1);
          updateCartItemQty(cartId, val);
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          removeFromCart(cartId);
        });
      }
    });
  }
}

function initCart() {
  const toggleBtns = document.querySelectorAll('#cartToggleBtn, #floatingCartBtn');
  toggleBtns.forEach(btn => btn.addEventListener('click', openCart));

  const closeBtn = document.getElementById('cartCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeCart);

  const backdrop = document.getElementById('cartBackdrop');
  if (backdrop) backdrop.addEventListener('click', closeCart);

  const clearBtn = document.getElementById('clearCartBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your shopping cart?')) {
        clearCart();
      }
    });
  }

  const exploreBtn = document.getElementById('cartExploreBtn');
  if (exploreBtn) {
    exploreBtn.addEventListener('click', () => {
      closeCart();
      const prodSec = document.getElementById('products');
      if (prodSec) {
        prodSec.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = 'shop.html#products';
      }
    });
  }

  const checkoutBtn = document.getElementById('cartCheckoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      closeCart();
      const orderSection = document.getElementById('order');
      if (orderSection) {
        switchOrderMode('cart');
        orderSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = 'shop.html?fromCart=true#order';
      }
    });
  }

  const cartWhatsAppBtn = document.getElementById('cartWhatsAppBtn');
  if (cartWhatsAppBtn) {
    cartWhatsAppBtn.addEventListener('click', () => {
      const cart = getCart();
      if (!cart.length) {
        alert('Your shopping cart is currently empty! Please add items first.');
        return;
      }
      const total = getCartTotal();
      const count = getCartItemCount();

      const itemsText = cart.map((item, idx) =>
        `${idx + 1}. *${item.name}* (${item.designName})\n   • Qty: ${item.quantity} | Total: ${formatPrice(item.price * item.quantity)}`
      ).join('\n');

      const settings = (typeof getSettings === 'function') ? getSettings() : {};
      const companyName = (settings && settings.shopName) ? settings.shopName : 'Pendragon Furniture';
      const msg = [
        `*Shopping Cart Order - ${companyName}* 🛒`,
        ``,
        `Hello! I would like to order the following ${count} item${count !== 1 ? 's' : ''} from my cart:`,
        ``,
        itemsText,
        ``,
        `*Estimated Total: ${formatPrice(total)}*`,
        ``,
        `Please confirm my order and let me know about pickup / delivery options. Thank you!`
      ].join('\n');

      const savedOrder = addOrder({
        customerName: 'WhatsApp Cart Order',
        phone: '',
        type: 'cart',
        items: cart.map(i => ({ name: i.name, designName: i.designName, quantity: i.quantity, price: i.price })),
        total: total,
        channel: 'whatsapp',
        status: 'pending'
      });

      if (window.PendragonInvoice) {
        PendragonInvoice.downloadPdf(savedOrder);
      }

      const url = getWhatsAppUrl(msg);
      window.open(url, '_blank');
    });
  }

  window.addEventListener('cart-updated', () => {
    renderCartDrawer();
    if (typeof currentOrderMode !== 'undefined' && currentOrderMode === 'cart') {
      renderOrderCartPreview();
      updateOrderPricing();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const drawer = document.getElementById('cartDrawer');
      if (drawer && !drawer.hidden && drawer.classList.contains('is-open')) {
        closeCart();
      }
    }
  });

  renderCartDrawer();
}

function animateCount(el, target, suffix = '', duration = 1200) {
  if (prefersReducedMotion() || target === 0) {
    el.textContent = target + suffix;
    el.dataset.counted = 'true';
    return;
  }

  const start = performance.now();
  const from = 0;

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (target - from) * eased);
    el.textContent = value + suffix;
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.dataset.counted = 'true';
    }
  }

  requestAnimationFrame(tick);
}

function initHeroStats() {
  updateProductCount();
  const stats = document.querySelectorAll('.hero-stats .stat-number[data-count]');
  if (!stats.length) return;

  const run = () => {
    stats.forEach((el) => {
      if (el.dataset.counted === 'true') return;
      const target = Number(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      animateCount(el, target, suffix);
    });
  };

  if (prefersReducedMotion()) {
    run();
    return;
  }

  setTimeout(run, 700);
}

function observeReveals(elements) {
  if (prefersReducedMotion()) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }

  elements.forEach((el) => revealObserver.observe(el));
}

function initScrollReveal() {
  document.querySelectorAll('.section-header, .filter-bar, .cta-box, .contact-info, .contact-form, .footer, .shop-hero-content, .shop-preview-actions')
    .forEach((el) => el.classList.add('reveal'));

  document.querySelectorAll('#workshop .about-content, #about .about-content')
    .forEach((el) => el.classList.add('reveal', 'reveal-left'));

  document.querySelectorAll('#workshop .about-image, #about .about-image')
    .forEach((el) => el.classList.add('reveal', 'reveal-right'));

  document.querySelectorAll('.contact-details .contact-item').forEach((el, i) => {
    el.classList.add('reveal', `reveal-delay-${Math.min(i + 1, 4)}`);
  });

  observeReveals(document.querySelectorAll('.reveal'));
}

function initHeroVideo() {
  const video = document.getElementById('heroVideo');
  if (!video) return;

  if (prefersReducedMotion()) {
    video.pause();
    return;
  }

  const tryPlay = () => {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  };

  if (video.readyState >= 2) {
    tryPlay();
  } else {
    video.addEventListener('loadeddata', tryPlay, { once: true });
  }
}

function initHeroParallax() {
  const media = document.querySelector('.hero-media');
  const overlay = document.querySelector('.hero-overlay');
  if (!media || prefersReducedMotion()) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = Math.min(window.scrollY, window.innerHeight);
      media.style.transform = `translate3d(0, ${y * 0.2}px, 0)`;
      if (overlay) {
        overlay.style.background = `
          linear-gradient(105deg, rgba(15, 10, 5, ${0.82 + y / 2000}) 0%, rgba(28, 18, 8, 0.62) 48%, rgba(15, 10, 5, 0.45) 100%),
          linear-gradient(to top, rgba(15, 10, 5, ${0.7 + y / 1500}) 0%, transparent 42%)
        `;
      }
      ticking = false;
    });
  }, { passive: true });
}

function initActiveNav() {
  if (!navLinks) return;
  const sections = document.querySelectorAll('main section[id]');
  const links = navLinks.querySelectorAll('a[href^="#"]');
  if (!sections.length || !links.length) return;

  const setActive = () => {
    const offset = window.scrollY + 120;
    let current = sections[0].id;

    sections.forEach((section) => {
      if (section.offsetTop <= offset) {
        current = section.id;
      }
    });

    links.forEach((link) => {
      const href = link.getAttribute('href');
      link.classList.toggle('active', href === `#${current}`);
    });
  };

  window.addEventListener('scroll', setActive, { passive: true });
  setActive();
}

function initHeroParticles() {
  const layer = document.getElementById('heroParticles');
  if (!layer || prefersReducedMotion()) return;

  const count = window.innerWidth < 768 ? 12 : 22;
  layer.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('span');
    dot.className = 'hero-particle';
    const size = 3 + Math.random() * 7;
    dot.style.setProperty('--size', `${size}px`);
    dot.style.setProperty('--x', `${Math.random() * 100}%`);
    dot.style.setProperty('--duration', `${7 + Math.random() * 10}s`);
    dot.style.setProperty('--delay', `${Math.random() * 8}s`);
    dot.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    dot.style.setProperty('--opacity', `${0.25 + Math.random() * 0.45}`);
    layer.appendChild(dot);
  }
}

function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar || prefersReducedMotion()) return;

  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = `${pct}%`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initButtonRipples() {
  if (prefersReducedMotion()) return;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const ink = document.createElement('span');
    ink.className = 'ripple-ink';
    ink.style.left = `${e.clientX - rect.left}px`;
    ink.style.top = `${e.clientY - rect.top}px`;
    btn.appendChild(ink);
    setTimeout(() => ink.remove(), 650);
  });
}

function initScrollCueHide() {
  const cue = document.querySelector('.scroll-cue');
  if (!cue) return;

  window.addEventListener('scroll', () => {
    cue.style.opacity = window.scrollY > 80 ? '0' : '1';
    cue.style.pointerEvents = window.scrollY > 80 ? 'none' : 'auto';
  }, { passive: true });
}

function initShopOrderForm() {
  if (!shopOrderForm) return;

  const params = new URLSearchParams(window.location.search);
  const preselectProduct = params.get('product') || '';
  const preselectDesign = params.get('design') || '';
  fillOrderProductSelect(preselectProduct, preselectDesign);

  const tabSingle = document.getElementById('tabSingleOrder');
  const tabCart = document.getElementById('tabCartOrder');
  if (tabSingle) tabSingle.addEventListener('click', () => switchOrderMode('single'));
  if (tabCart) tabCart.addEventListener('click', () => switchOrderMode('cart'));

  const editCartBtn = document.getElementById('editCartFromOrderBtn');
  if (editCartBtn) editCartBtn.addEventListener('click', openCart);

  if (params.get('fromCart') === 'true') {
    switchOrderMode('cart');
  }

  if (orderProductSelect) {
    orderProductSelect.addEventListener('change', () => {
      updateOrderDesignDropdown(orderProductSelect.value);
      updateOrderPricing();
    });
  }

  if (orderShopSelect) {
    orderShopSelect.addEventListener('change', () => {
      const currentDesign = document.getElementById('orderDesign') ? document.getElementById('orderDesign').value : '';
      fillOrderProductSelect(orderProductSelect ? orderProductSelect.value : '', currentDesign);
    });
  }

  const orderDesignSelect = document.getElementById('orderDesign');
  if (orderDesignSelect) {
    orderDesignSelect.addEventListener('change', () => {
      updateOrderPricing();
    });
  }

  const orderQtyInput = document.getElementById('orderQty');
  if (orderQtyInput) {
    orderQtyInput.addEventListener('input', updateOrderPricing);
    orderQtyInput.addEventListener('change', updateOrderPricing);
  }

  const orderWhatsAppBtn = document.getElementById('orderWhatsAppBtn');
  if (orderWhatsAppBtn) {
    orderWhatsAppBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('orderName');
      const phoneInput = document.getElementById('orderPhone');
      const emailInput = document.getElementById('orderEmail');
      const notesInput = document.getElementById('orderMessage');
      const shopSelect = document.getElementById('orderShop');

      const customerName = nameInput && nameInput.value.trim() ? nameInput.value.trim() : 'Customer';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const notes = notesInput ? notesInput.value.trim() : '';
      const shop = (shopSelect && shopSelect.value ? getShopById(shopSelect.value) : null) || getActiveShops()[0] || null;
      const shopName = shop ? shop.name : 'Showroom';

      let items = [];
      let total = 0;
      let itemsText = '';

      if (currentOrderMode === 'cart') {
        const cart = getCart();
        if (!cart.length) {
          alert('Your shopping cart is currently empty! Add items or switch to Single Item mode.');
          return;
        }
        total = getCartTotal();
        items = cart.map(i => ({ name: i.name, designName: i.designName, quantity: i.quantity, price: i.price }));
        itemsText = cart.map(i => `• ${i.quantity}x *${i.name}* (${i.designName}) — ${formatPrice(i.price * i.quantity)}`).join('\n');
      } else {
        const productId = orderProductSelect ? orderProductSelect.value : '';
        const product = getProducts().find(p => p.id === productId);
        if (!product) {
          alert('Please select a product first!');
          if (orderProductSelect) orderProductSelect.focus();
          return;
        }
        const designName = orderDesignSelect ? orderDesignSelect.value : '';
        const qty = parseInt(orderQtyInput ? orderQtyInput.value : '1', 10) || 1;
        const designs = getProductDesigns(product);
        const matchedDesign = designs.find(d => d.name === designName) || (designs[0] || null);
        const unitPrice = matchedDesign ? matchedDesign.price : product.price;
        total = unitPrice * qty;
        items = [{ name: product.name, designName: designName || 'Standard', quantity: qty, price: unitPrice }];
        itemsText = `• ${qty}x *${product.name}* (${designName || 'Standard'}) — ${formatPrice(total)}`;
      }

      const savedOrder = addOrder({
        customerName,
        phone,
        email,
        shopId: shop ? shop.id : '',
        shopName,
        type: currentOrderMode,
        items,
        total,
        notes,
        channel: 'whatsapp',
        status: 'pending'
      });

      const settings = (typeof getSettings === 'function') ? getSettings() : {};
      const companyName = (settings && settings.shopName) ? settings.shopName : 'Pendragon Furniture';
      const msg = [
        `*Direct WhatsApp Order - ${companyName}* 🪵`,
        `*Order Reference:* ${savedOrder.orderNumber}`,
        ``,
        `*Customer Details:*`,
        `• Name: ${customerName}`,
        phone ? `• Phone: ${phone}` : null,
        email ? `• Email: ${email}` : null,
        `• Showroom / Pickup: ${shopName}`,
        notes ? `• Delivery Address / Notes: ${notes}` : null,
        ``,
        `*Ordered Items:*`,
        itemsText,
        ``,
        `*Estimated Total: ${formatPrice(total)}*`,
        ``,
        `Hello! I would like to confirm this order via WhatsApp. Please let me know the payment and delivery procedure. Thank you!`
      ].filter(Boolean).join('\n');

      if (currentOrderMode === 'cart') clearCart();
      shopOrderForm.reset();
      switchOrderMode('single');
      fillOrderProductSelect();

      const waUrl = getWhatsAppUrl(msg);
      if (shopOrderSuccess) {
        shopOrderSuccess.innerHTML = `
          <strong>WhatsApp Order Initiated!</strong><br>
          Thank you, ${escapeHtml(customerName)}. Your order <strong>${savedOrder.orderNumber}</strong> was recorded.<br>
          <div class="invoice-actions-box">
            <button type="button" class="btn btn-download-pdf pf-download-trigger" data-order-id="${savedOrder.id}">
              <span>📄</span> Download Bill / Invoice (PDF)
            </button>
            <button type="button" class="btn btn-view-invoice pf-preview-trigger" data-order-id="${savedOrder.id}">
              <span>👁️</span> View &amp; Print Bill
            </button>
            <a href="${waUrl}" target="_blank" class="btn btn-whatsapp btn-whatsapp-sm" style="display:inline-flex;">💬 Open WhatsApp Now</a>
          </div>
        `;
        shopOrderSuccess.hidden = false;
        setTimeout(() => { shopOrderSuccess.hidden = true; }, 16000);
      }

      if (window.PendragonInvoice) {
        PendragonInvoice.downloadPdf(savedOrder);
      }

      window.open(waUrl, '_blank');
    });
  }

  shopOrderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('orderName');
    const customerName = nameInput ? nameInput.value.trim() : 'Customer';
    const phoneInput = document.getElementById('orderPhone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const emailInput = document.getElementById('orderEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    const messageInput = document.getElementById('orderMessage');
    const notes = messageInput ? messageInput.value.trim() : '';
    const shopSelect = document.getElementById('orderShop');
    const shop = (shopSelect && shopSelect.value ? getShopById(shopSelect.value) : null) || getActiveShops()[0] || null;
    const shopName = shop ? shop.name : 'Showroom';

    if (currentOrderMode === 'cart') {
      const cart = getCart();
      if (!cart.length) {
        alert('Your shopping cart is currently empty! Add items or switch to Single Item mode.');
        return;
      }
      const total = getCartTotal();
      const itemCount = getCartItemCount();

      const itemsListHtml = cart.map(i =>
        `• <strong>${i.quantity}x ${escapeHtml(i.name)}</strong> (<em>${escapeHtml(i.designName)}</em>) — ${formatPrice(i.price * i.quantity)}`
      ).join('<br>');

      const savedOrder = addOrder({
        customerName,
        phone,
        email,
        shopId: shop ? shop.id : '',
        shopName,
        type: 'cart',
        items: cart.map(i => ({ name: i.name, designName: i.designName, quantity: i.quantity, price: i.price })),
        total,
        notes,
        channel: 'website',
        status: 'pending'
      });

      const waFollowUpMsg = `Hello Pendragon Furniture! I just placed order ${savedOrder.orderNumber} on your website. My name is ${customerName}.`;
      const waFollowUpUrl = getWhatsAppUrl(waFollowUpMsg);

      if (shopOrderSuccess) {
        shopOrderSuccess.innerHTML = `
          <strong>Shopping Cart Order Placed!</strong><br>
          Thank you, ${escapeHtml(customerName)}. Your order <strong>${savedOrder.orderNumber}</strong> (${itemCount} item${itemCount !== 1 ? 's' : ''}) has been received.<br>
          <div style="text-align:left; margin:0.6rem auto; max-width:380px; background:var(--bg-alt); border:1px solid var(--border); padding:0.65rem 0.85rem; border-radius:8px; font-size:0.85rem; line-height:1.45; color:var(--text);">
            ${itemsListHtml}
          </div>
          <span style="display:inline-block; margin-top:0.35rem; color:var(--primary); font-weight:700; font-size:1.15rem;">
            Estimated Total: ${formatPrice(total)}
          </span><br>
          Collection Showroom: <em>${escapeHtml(shopName)}</em>.<br>
          <div class="invoice-actions-box">
            <button type="button" class="btn btn-download-pdf pf-download-trigger" data-order-id="${savedOrder.id}">
              <span>📄</span> Download Bill / Invoice (PDF)
            </button>
            <button type="button" class="btn btn-view-invoice pf-preview-trigger" data-order-id="${savedOrder.id}">
              <span>👁️</span> View &amp; Print Bill
            </button>
            <a href="${waFollowUpUrl}" target="_blank" class="btn btn-whatsapp btn-whatsapp-sm" style="display:inline-flex;">💬 Chat on WhatsApp to Confirm</a>
            <a href="#track-order" class="btn btn-outline btn-whatsapp-sm track-this-order-btn" data-order-number="${savedOrder.orderNumber}" style="display:inline-flex;">🔍 Track Live Status</a>
          </div>
        `;
        shopOrderSuccess.hidden = false;
      }

      if (window.PendragonInvoice) {
        PendragonInvoice.downloadPdf(savedOrder);
      }

      clearCart();
      shopOrderForm.reset();
      switchOrderMode('single');
      fillOrderProductSelect();
      setTimeout(() => {
        if (shopOrderSuccess) shopOrderSuccess.hidden = true;
      }, 16000);
      return;
    }

    const productId = orderProductSelect ? orderProductSelect.value : '';
    const product = getProducts().find(p => p.id === productId);
    const designName = orderDesignSelect ? orderDesignSelect.value : '';
    const qty = parseInt(orderQtyInput ? orderQtyInput.value : '1', 10) || 1;

    const designs = product ? getProductDesigns(product) : [];
    const matchedDesign = designs.find(d => d.name === designName) || (designs[0] || null);
    const unitPrice = matchedDesign ? matchedDesign.price : (product ? product.price : 0);
    const total = unitPrice * qty;

    const savedOrder = addOrder({
      customerName,
      phone,
      email,
      shopId: shop ? shop.id : '',
      shopName,
      type: 'single',
      items: [{ name: product ? product.name : 'Custom Item', designName: designName || 'Standard', quantity: qty, price: unitPrice }],
      total,
      notes,
      channel: 'website',
      status: 'pending'
    });

    const waFollowUpMsg = `Hello Pendragon Furniture! I just placed order ${savedOrder.orderNumber} for ${qty}x ${product ? product.name : 'Furniture'} on your website. My name is ${customerName}.`;
    const waFollowUpUrl = getWhatsAppUrl(waFollowUpMsg);

    if (shopOrderSuccess) {
      shopOrderSuccess.innerHTML = `
        <strong>Order Placed Successfully!</strong><br>
        Thank you, ${escapeHtml(customerName)}. Your order <strong>${savedOrder.orderNumber}</strong> for <strong>${qty}x ${escapeHtml(product ? product.name : 'Custom Item')}</strong> 
        (Design: <em>${escapeHtml(designName || 'Standard')}</em>) has been received.<br>
        <span style="display:inline-block; margin-top:0.4rem; color:var(--primary); font-weight:700; font-size:1.05rem;">
          Estimated Total: ${formatPrice(total)}
        </span><br>
        Our showroom team will contact you shortly to confirm details.<br>
        <div class="invoice-actions-box">
          <button type="button" class="btn btn-download-pdf pf-download-trigger" data-order-id="${savedOrder.id}">
            <span>📄</span> Download Bill / Invoice (PDF)
          </button>
          <button type="button" class="btn btn-view-invoice pf-preview-trigger" data-order-id="${savedOrder.id}">
            <span>👁️</span> View &amp; Print Bill
          </button>
          <a href="${waFollowUpUrl}" target="_blank" class="btn btn-whatsapp btn-whatsapp-sm" style="display:inline-flex;">💬 Chat on WhatsApp to Confirm</a>
          <a href="#track-order" class="btn btn-outline btn-whatsapp-sm track-this-order-btn" data-order-number="${savedOrder.orderNumber}" style="display:inline-flex;">🔍 Track Live Status</a>
        </div>
      `;
      shopOrderSuccess.hidden = false;
    }

    if (window.PendragonInvoice) {
      PendragonInvoice.downloadPdf(savedOrder);
    }

    shopOrderForm.reset();
    fillOrderProductSelect();
    setTimeout(() => {
      if (shopOrderSuccess) shopOrderSuccess.hidden = true;
    }, 16000);
  });
}

function initFilters() {
  if (!filterBar || !productsGrid) return;

  currentCategory = getCategoryFromUrl();
  filterBar.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === currentCategory);
  });

  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;

    if (prefersReducedMotion()) {
      renderProducts(currentCategory, { animate: false });
      return;
    }

    productsGrid.classList.add('is-filtering');
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => {
      renderProducts(currentCategory, { animate: true });
      productsGrid.classList.remove('is-filtering');
    }, 180);
  });
}

if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });
}

if (contactForm && formSuccess) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name') ? document.getElementById('name').value.trim() : '';
    const email = document.getElementById('email') ? document.getElementById('email').value.trim() : '';
    const phone = document.getElementById('phone') ? document.getElementById('phone').value.trim() : '';
    const message = document.getElementById('message') ? document.getElementById('message').value.trim() : '';

    if (typeof addContactMessage === 'function') {
      addContactMessage({ name, email, phone, message });
    }

    formSuccess.hidden = false;
    contactForm.reset();
    setTimeout(() => {
      formSuccess.hidden = true;
    }, 5000);
  });
}

if (modalClose) modalClose.addEventListener('click', closeModal);
if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (imageZoom && !imageZoom.hidden) {
      closeImageZoom();
      return;
    }
    closeModal();
  }
  if (imageZoom && !imageZoom.hidden) {
    if (e.key === 'ArrowLeft') changeZoomImage(-1);
    if (e.key === 'ArrowRight') changeZoomImage(1);
    if (e.key === '+' || e.key === '=') {
      zoomScale = Math.min(4, zoomScale + 0.25);
      applyZoomTransform();
    }
    if (e.key === '-') {
      zoomScale = Math.max(1, zoomScale - 0.25);
      if (zoomScale === 1) { zoomX = 0; zoomY = 0; }
      applyZoomTransform();
    }
  }
});

function initImageZoom() {
  if (!imageZoom || !imageZoomImg || !imageZoomStage) return;

  const closeBtn = document.getElementById('imageZoomClose');
  const backdrop = document.getElementById('imageZoomBackdrop');
  const zoomIn = document.getElementById('imageZoomIn');
  const zoomOut = document.getElementById('imageZoomOut');
  const zoomReset = document.getElementById('imageZoomReset');

  if (closeBtn) closeBtn.addEventListener('click', closeImageZoom);
  if (backdrop) backdrop.addEventListener('click', closeImageZoom);
  if (imageZoomPrev) imageZoomPrev.addEventListener('click', () => changeZoomImage(-1));
  if (imageZoomNext) imageZoomNext.addEventListener('click', () => changeZoomImage(1));

  if (zoomIn) {
    zoomIn.addEventListener('click', () => {
      zoomScale = Math.min(4, zoomScale + 0.35);
      applyZoomTransform();
    });
  }
  if (zoomOut) {
    zoomOut.addEventListener('click', () => {
      zoomScale = Math.max(1, zoomScale - 0.35);
      if (zoomScale === 1) { zoomX = 0; zoomY = 0; }
      applyZoomTransform();
    });
  }
  if (zoomReset) {
    zoomReset.addEventListener('click', () => {
      zoomScale = 1;
      zoomX = 0;
      zoomY = 0;
      applyZoomTransform();
    });
  }

  imageZoomStage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    zoomScale = Math.min(4, Math.max(1, zoomScale + delta));
    if (zoomScale === 1) { zoomX = 0; zoomY = 0; }
    applyZoomTransform();
  }, { passive: false });

  imageZoomStage.addEventListener('pointerdown', (e) => {
    if (zoomScale <= 1) return;
    zoomDragging = true;
    zoomStartX = e.clientX;
    zoomStartY = e.clientY;
    zoomOriginX = zoomX;
    zoomOriginY = zoomY;
    imageZoomStage.setPointerCapture(e.pointerId);
  });

  imageZoomStage.addEventListener('pointermove', (e) => {
    if (!zoomDragging) return;
    zoomX = zoomOriginX + (e.clientX - zoomStartX);
    zoomY = zoomOriginY + (e.clientY - zoomStartY);
    applyZoomTransform();
  });

  const endDrag = () => { zoomDragging = false; };
  imageZoomStage.addEventListener('pointerup', endDrag);
  imageZoomStage.addEventListener('pointercancel', endDrag);
}


let currentlyTrackedOrderId = null;

function renderOrderTrackingDetails(order) {
  const resultCard = document.getElementById('trackResultCard');
  const resultContent = document.getElementById('trackResultContent');
  const notFoundEl = document.getElementById('trackNotFound');
  if (!resultCard || !resultContent) return;

  if (!order) {
    resultCard.hidden = true;
    if (notFoundEl) notFoundEl.hidden = false;
    return;
  }

  currentlyTrackedOrderId = order.id;
  if (notFoundEl) notFoundEl.hidden = true;

  const status = (order.status || 'pending').toLowerCase();

  let statusClass = 'track-status-pending';
  let statusLabel = 'Pending Confirmation';
  if (status === 'confirmed') {
    statusClass = 'track-status-confirmed';
    statusLabel = 'Confirmed by Showroom';
  } else if (status === 'processing' || status === 'in-production') {
    statusClass = 'track-status-processing';
    statusLabel = 'In Crafting / Workshop';
  } else if (status === 'completed' || status === 'ready') {
    statusClass = 'track-status-completed';
    statusLabel = 'Ready / Delivered';
  } else if (status === 'cancelled') {
    statusClass = 'track-status-cancelled';
    statusLabel = 'Order Cancelled';
  }

  // Stepper milestones
  let step1Class = 'completed';
  let step2Class = '';
  let step3Class = '';
  let step4Class = '';
  let line1Class = '';
  let line2Class = '';
  let line3Class = '';

  let step2Sub = 'Awaiting review';
  let step3Sub = 'Pending queue';
  let step4Sub = 'Pending completion';

  if (status === 'cancelled') {
    step1Class = 'cancelled';
    step2Class = 'cancelled';
    step3Class = 'cancelled';
    step4Class = 'cancelled';
    step2Sub = 'Cancelled';
    step3Sub = 'Cancelled';
    step4Sub = 'Cancelled';
  } else if (status === 'pending') {
    step1Class = 'active';
  } else if (status === 'confirmed') {
    step1Class = 'completed';
    line1Class = 'completed';
    step2Class = 'active';
    step2Sub = 'Order Verified';
  } else if (status === 'processing' || status === 'in-production') {
    step1Class = 'completed';
    line1Class = 'completed';
    step2Class = 'completed';
    line2Class = 'completed';
    step3Class = 'active';
    step2Sub = 'Order Verified';
    step3Sub = 'Crafting in Progress';
  } else if (status === 'completed' || status === 'ready') {
    step1Class = 'completed';
    line1Class = 'completed';
    step2Class = 'completed';
    line2Class = 'completed';
    step3Class = 'completed';
    line3Class = 'completed';
    step4Class = 'completed';
    step2Sub = 'Order Verified';
    step3Sub = 'Crafted & Polished';
    step4Sub = 'Ready / Handed Over';
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsRows = items.map((i) => `
    <tr>
      <td>
        <div class="track-item-name">${escapeHtml(i.name || 'Furniture Item')}</div>
        ${i.designName ? `<div class="track-item-sub">Variant: ${escapeHtml(i.designName)}</div>` : ''}
      </td>
      <td style="text-align:center;">x${i.quantity || 1}</td>
      <td style="text-align:right;">${formatPrice(i.price || 0)}</td>
      <td style="text-align:right; font-weight:700;">${formatPrice((i.price || 0) * (i.quantity || 1))}</td>
    </tr>
  `).join('');

  const settings = (typeof getSettings === 'function') ? getSettings() : {};
  const companyName = (settings && settings.shopName) ? settings.shopName : 'Pendragon Furniture';
  const waInquiryText = `Hello ${companyName}! I am following up on my Order ${order.orderNumber} (${order.customerName}). Please let me know the status / delivery update. Thank you!`;
  const waInquiryUrl = getWhatsAppUrl(waInquiryText);

  resultContent.innerHTML = `
    <div class="track-result-top">
      <div>
        <span class="track-order-badge">${escapeHtml(order.orderNumber)}</span>
        <span class="track-order-date">📅 Placed on ${formatDate(order.date)}</span>
      </div>
      <div class="track-status-pill ${statusClass}">
        <span class="status-dot"></span>
        <span>${statusLabel}</span>
      </div>
    </div>

    <!-- Visual Stepper Progress Bar -->
    <div class="track-stepper">
      <div class="stepper-step ${step1Class}">
        <div class="stepper-circle">📝</div>
        <div class="stepper-label">1. Order Placed</div>
        <div class="stepper-sub">Received</div>
      </div>
      <div class="stepper-line ${line1Class}"></div>
      <div class="stepper-step ${step2Class}">
        <div class="stepper-circle">🔍</div>
        <div class="stepper-label">2. Confirmed</div>
        <div class="stepper-sub">${step2Sub}</div>
      </div>
      <div class="stepper-line ${line2Class}"></div>
      <div class="stepper-step ${step3Class}">
        <div class="stepper-circle">🪵</div>
        <div class="stepper-label">3. In Crafting</div>
        <div class="stepper-sub">${step3Sub}</div>
      </div>
      <div class="stepper-line ${line3Class}"></div>
      <div class="stepper-step ${step4Class}">
        <div class="stepper-circle">🚚</div>
        <div class="stepper-label">4. Ready / Handover</div>
        <div class="stepper-sub">${step4Sub}</div>
      </div>
    </div>

    <!-- Order Details Grid -->
    <div class="track-details-grid">
      <div class="track-info-box">
        <h4><span>👤</span> Customer &amp; Showroom</h4>
        <div class="track-info-row">
          <span>Customer Name:</span>
          <strong>${escapeHtml(order.customerName)}</strong>
        </div>
        ${order.phone ? `
        <div class="track-info-row">
          <span>Contact Phone:</span>
          <strong>${escapeHtml(order.phone)}</strong>
        </div>` : ''}
        ${order.email ? `
        <div class="track-info-row">
          <span>Contact Email:</span>
          <strong>${escapeHtml(order.email)}</strong>
        </div>` : ''}
        <div class="track-info-row">
          <span>Collection Showroom:</span>
          <strong>${escapeHtml(order.shopName || settings.address || 'Main Showroom')}</strong>
        </div>
        <div class="track-info-row">
          <span>Order Channel:</span>
          <strong style="text-transform: capitalize;">${escapeHtml(order.channel || 'Website')}</strong>
        </div>
        ${order.notes ? `
        <div class="track-info-row" style="flex-direction:column; align-items:flex-start; margin-top:0.5rem; background:var(--bg-alt); padding:0.6rem 0.75rem; border-radius:8px;">
          <span style="font-weight:600; margin-bottom:0.2rem;">📝 Special Instructions / Notes:</span>
          <em style="color:var(--text);">${escapeHtml(order.notes)}</em>
        </div>` : ''}
      </div>

      <div class="track-items-box">
        <h4><span>🛋️</span> Ordered Items</h4>
        <div class="track-table-scroll">
          <table class="track-table">
            <thead>
              <tr>
                <th>Item &amp; Design</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Price</th>
                <th style="text-align:right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows || '<tr><td colspan="4">No items listed</td></tr>'}
            </tbody>
          </table>
        </div>
        <div class="track-total-box">
          <span>Estimated Total:</span>
          <span class="track-total-amount">${formatPrice(order.total)}</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="track-actions-bar">
      <button type="button" class="btn btn-primary track-download-btn" id="trackCardPdfBtn" data-order-id="${order.id}">
        <span>📄</span>
        <span>Download Official Invoice (PDF)</span>
      </button>
      <button type="button" class="btn btn-outline track-preview-btn" id="trackCardPreviewBtn" data-order-id="${order.id}">
        <span>👁️</span>
        <span>View Invoice</span>
      </button>
      <a href="${waInquiryUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp">
        <svg class="whatsapp-icon-svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.34C9.33 7.34 9 7.42 8.73 7.71C8.45 8.01 7.68 8.74 7.68 10.21C7.68 11.69 8.75 13.11 8.9 13.31C9.05 13.51 11.02 16.55 14.04 17.85C14.76 18.16 15.32 18.35 15.76 18.49C16.48 18.72 17.14 18.69 17.65 18.61C18.23 18.52 19.42 17.89 19.67 17.19C19.92 16.49 19.92 15.89 19.84 15.76C19.77 15.63 19.57 15.56 19.27 15.41C18.98 15.26 17.51 14.54 17.24 14.44C16.96 14.34 16.77 14.29 16.57 14.59C16.37 14.88 15.81 15.56 15.63 15.76C15.46 15.96 15.29 15.98 14.99 15.83C14.7 15.68 13.74 15.37 12.61 14.36C11.73 13.57 11.13 12.6 10.96 12.3C10.79 12.01 10.94 11.85 11.09 11.7C11.22 11.57 11.38 11.36 11.53 11.18C11.68 11.01 11.73 10.88 11.83 10.69C11.93 10.49 11.88 10.32 11.8 10.17C11.73 10.02 11.13 8.56 10.88 7.96C10.64 7.37 10.4 7.45 10.22 7.44C10.04 7.44 9.84 7.44 9.53 7.34Z"/>
        </svg>
        <span>Inquire on WhatsApp</span>
      </a>
    </div>
  `;

  // Attach PDF download and preview buttons
  const dlBtn = resultContent.querySelector('#trackCardPdfBtn');
  if (dlBtn) {
    dlBtn.addEventListener('click', () => {
      if (window.PendragonInvoice) {
        dlBtn.disabled = true;
        const origHtml = dlBtn.innerHTML;
        dlBtn.innerHTML = '<span>⏳</span> Generating PDF...';
        PendragonInvoice.downloadPdf(order, () => {
          dlBtn.disabled = false;
          dlBtn.innerHTML = origHtml;
        });
        setTimeout(() => {
          dlBtn.disabled = false;
          dlBtn.innerHTML = origHtml;
        }, 3500);
      }
    });
  }

  const prevBtn = resultContent.querySelector('#trackCardPreviewBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (window.PendragonInvoice) {
        PendragonInvoice.preview(order);
      }
    });
  }

  resultCard.hidden = false;
}

function performOrderTracking(query) {
  const q = String(query || '').trim();
  const inputEl = document.getElementById('trackOrderInput');
  const notFoundEl = document.getElementById('trackNotFound');
  const resultCard = document.getElementById('trackResultCard');
  if (inputEl) inputEl.value = q;

  if (!q) {
    if (resultCard) resultCard.hidden = true;
    if (notFoundEl) notFoundEl.hidden = true;
    return;
  }

  const order = (typeof findOrderForTracking === 'function')
    ? findOrderForTracking(q)
    : (getOrders().find(o => o.orderNumber === q || o.id === q) || null);

  if (order) {
    renderOrderTrackingDetails(order);
    if (resultCard) {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else {
    currentlyTrackedOrderId = null;
    if (resultCard) resultCard.hidden = true;
    if (notFoundEl) {
      notFoundEl.hidden = false;
      const notFoundMsg = document.getElementById('trackNotFoundMsg');
      if (notFoundMsg) {
        notFoundMsg.textContent = `We could not find an active order matching "${q}". Please double check your order reference (e.g. #PF-1001) or phone number and try again.`;
      }
      notFoundEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function initOrderTracking() {
  const form = document.getElementById('trackOrderForm');
  const input = document.getElementById('trackOrderInput');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    performOrderTracking(input.value);
  });

  // Demo buttons
  document.querySelectorAll('[data-order-demo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const demoVal = btn.dataset.orderDemo;
      performOrderTracking(demoVal);
    });
  });

  // Delegate clicks on newly created order buttons
  document.addEventListener('click', (e) => {
    const trackTrigger = e.target.closest('.track-this-order-btn');
    if (trackTrigger && trackTrigger.dataset.orderNumber) {
      e.preventDefault();
      const trackSection = document.getElementById('track-order');
      if (trackSection) {
        trackSection.scrollIntoView({ behavior: 'smooth' });
      }
      performOrderTracking(trackTrigger.dataset.orderNumber);
    }
  });

  // Check URL params or hash
  const urlParams = new URLSearchParams(window.location.search);
  const trackParam = urlParams.get('track') || urlParams.get('order');
  if (trackParam) {
    setTimeout(() => {
      performOrderTracking(trackParam);
    }, 450);
  } else if (window.location.hash && window.location.hash.startsWith('#track-')) {
    const hashVal = window.location.hash.replace('#track-', '');
    setTimeout(() => {
      performOrderTracking(hashVal);
    }, 450);
  }
}

loadSettings();
initShopSelect();
initFilters();
renderProducts(currentCategory);
fillOrderProductSelect();
initShopOrderForm();
initCart();
initImageZoom();
initHeroStats();
initScrollReveal();
initHeroVideo();
initHeroParallax();
initHeroParticles();
initScrollProgress();
initButtonRipples();
initScrollCueHide();
initActiveNav();
initOrderTracking();

// Real-time synchronization event listener from Cloud Firestore / Local save
window.addEventListener('pendragon_data_updated', () => {
  if (typeof loadSettings === 'function') loadSettings();
  if (typeof renderProducts === 'function') renderProducts();
  if (typeof updateProductCount === 'function') updateProductCount();
  if (typeof updateSelectedShopDetails === 'function') updateSelectedShopDetails();
  if (typeof fillOrderProductSelect === 'function') fillOrderProductSelect();
  if (currentlyTrackedOrderId && typeof getOrderById === 'function') {
    const refreshed = getOrderById(currentlyTrackedOrderId);
    if (refreshed) renderOrderTrackingDetails(refreshed);
  }
});

// Cross-tab synchronization via localStorage storage event
window.addEventListener('storage', (e) => {
  if (e.key === 'woodcraft_website_db_v1') {
    if (typeof loadSettings === 'function') loadSettings();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof updateProductCount === 'function') updateProductCount();
    if (typeof fillOrderProductSelect === 'function') fillOrderProductSelect();
    if (currentlyTrackedOrderId && typeof getOrderById === 'function') {
      const refreshed = getOrderById(currentlyTrackedOrderId);
      if (refreshed) renderOrderTrackingDetails(refreshed);
    }
  }
});


