/**
 * Pendragon Furniture - Design Gallery & Interactive Zoom Lightbox
 * Allows customers and admin to browse design mini-albums, view multiple angles,
 * and zoom in with pan/drag to inspect wood grain and craftsmanship.
 */

(function () {
  'use strict';

  // Lightbox State
  let currentAlbum = null;
  let currentPhotoIndex = 0;
  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialPinchDistance = null;
  let initialPinchZoom = 1;

  const MIN_ZOOM = 0.8;
  const MAX_ZOOM = 4.0;
  const ZOOM_STEP = 0.3;

  /**
   * Initialize or return the singleton Lightbox DOM elements
   */
  function ensureLightboxModal() {
    let modal = document.getElementById('pendragonGalleryLightbox');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'pendragonGalleryLightbox';
    modal.className = 'pg-lightbox';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Furniture Design Image Viewer');

    modal.innerHTML = `
      <div class="pg-lightbox-backdrop" id="pgLbBackdrop"></div>
      
      <!-- Top Toolbar -->
      <header class="pg-lightbox-header">
        <div class="pg-lb-title-group">
          <span class="pg-lb-category-tag" id="pgLbCategory">Design</span>
          <h3 class="pg-lb-title" id="pgLbTitle">Furniture Design</h3>
          <span class="pg-lb-counter" id="pgLbCounter">1 / 1</span>
        </div>

        <div class="pg-lb-toolbar-actions">
          <div class="pg-lb-zoom-controls">
            <button type="button" class="pg-lb-btn" id="pgLbZoomOutBtn" title="Zoom Out (-)">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <span class="pg-lb-zoom-level" id="pgLbZoomLevel">100%</span>
            <button type="button" class="pg-lb-btn" id="pgLbZoomInBtn" title="Zoom In (+)">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
            <button type="button" class="pg-lb-btn pg-lb-btn-reset" id="pgLbZoomResetBtn" title="Reset Zoom (100%)">
              Fit
            </button>
          </div>

          <button type="button" class="pg-lb-btn" id="pgLbFullscreenBtn" title="Toggle Fullscreen">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
          </button>

          <button type="button" class="pg-lb-btn pg-lb-btn-close" id="pgLbCloseBtn" title="Close Lightbox (Esc)">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </header>

      <!-- Main Stage Viewport -->
      <div class="pg-lightbox-stage" id="pgLbStage">
        <button type="button" class="pg-lb-nav pg-lb-prev" id="pgLbPrevBtn" aria-label="Previous Photo">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <div class="pg-lb-img-container" id="pgLbImgContainer">
          <img src="" alt="Furniture view" class="pg-lb-img" id="pgLbImg" draggable="false">
          <div class="pg-lb-zoom-hint" id="pgLbZoomHint">
            <span>🔍 Scroll wheel or double-click to zoom • Drag to pan</span>
          </div>
        </div>

        <button type="button" class="pg-lb-nav pg-lb-next" id="pgLbNextBtn" aria-label="Next Photo">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <!-- Bottom Drawer: Captions & Thumbnail Strip -->
      <footer class="pg-lightbox-footer">
        <div class="pg-lb-footer-info">
          <div class="pg-lb-spec-pill" id="pgLbWoodSpec">Seasoned Teak</div>
          <p class="pg-lb-caption" id="pgLbCaption">Photo caption</p>
          <a href="#" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp pg-lb-wa-btn" id="pgLbWhatsAppBtn">
            <svg class="whatsapp-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.34C9.33 7.34 9 7.42 8.73 7.71C8.45 8.01 7.68 8.74 7.68 10.21C7.68 11.69 8.75 13.11 8.9 13.31C9.05 13.51 11.02 16.55 14.04 17.85C14.76 18.16 15.32 18.35 15.76 18.49C16.48 18.72 17.14 18.69 17.65 18.61C18.23 18.52 19.42 17.89 19.67 17.19C19.92 16.49 19.92 15.89 19.84 15.76C19.77 15.63 19.57 15.56 19.27 15.41C18.98 15.26 17.51 14.54 17.24 14.44C16.96 14.34 16.77 14.29 16.57 14.59C16.37 14.88 15.81 15.56 15.63 15.76C15.46 15.96 15.29 15.98 14.99 15.83C14.7 15.68 13.74 15.37 12.61 14.36C11.73 13.57 11.13 12.6 10.96 12.3C10.79 12.01 10.94 11.85 11.09 11.7C11.22 11.57 11.38 11.36 11.53 11.18C11.68 11.01 11.73 10.88 11.83 10.69C11.93 10.49 11.88 10.32 11.8 10.17C11.73 10.02 11.13 8.56 10.88 7.96C10.64 7.37 10.4 7.45 10.22 7.44C10.04 7.44 9.84 7.44 9.53 7.34Z"/>
            </svg>
            <span>Inquire About This Design</span>
          </a>
        </div>

        <div class="pg-lb-thumbnails" id="pgLbThumbnails"></div>
      </footer>
    `;

    document.body.appendChild(modal);
    attachLightboxListeners(modal);
    return modal;
  }

  /**
   * Attach interactive listeners (mouse, drag, wheel, pinch, keyboard)
   */
  function attachLightboxListeners(modal) {
    const backdrop = modal.querySelector('#pgLbBackdrop');
    const closeBtn = modal.querySelector('#pgLbCloseBtn');
    const prevBtn = modal.querySelector('#pgLbPrevBtn');
    const nextBtn = modal.querySelector('#pgLbNextBtn');
    const zoomInBtn = modal.querySelector('#pgLbZoomInBtn');
    const zoomOutBtn = modal.querySelector('#pgLbZoomOutBtn');
    const zoomResetBtn = modal.querySelector('#pgLbZoomResetBtn');
    const fsBtn = modal.querySelector('#pgLbFullscreenBtn');
    const stage = modal.querySelector('#pgLbStage');
    const img = modal.querySelector('#pgLbImg');

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (backdrop) backdrop.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', prevPhoto);
    if (nextBtn) nextBtn.addEventListener('click', nextPhoto);

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + ZOOM_STEP));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - ZOOM_STEP));
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => resetZoom());

    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          modal.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Double-click to toggle zoom
    if (stage) {
      stage.addEventListener('dblclick', (e) => {
        // Prevent if clicking nav buttons
        if (e.target.closest('.pg-lb-nav')) return;
        if (zoomLevel > 1.05) {
          resetZoom();
        } else {
          setZoom(2.4, e.clientX, e.clientY);
        }
      });

      // Mouse Wheel Zoom
      stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        setZoom(zoomLevel + delta, e.clientX, e.clientY);
      }, { passive: false });

      // Mouse Drag / Pan
      stage.addEventListener('mousedown', (e) => {
        if (e.target.closest('.pg-lb-nav') || e.target.closest('.pg-lb-btn')) return;
        if (zoomLevel > 1.0) {
          isDragging = true;
          startX = e.clientX - panX;
          startY = e.clientY - panY;
          stage.classList.add('is-dragging');
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        applyTransform();
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          stage.classList.remove('is-dragging');
        }
      });

      // Touch events (Drag & Pinch)
      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1 && zoomLevel > 1) {
          isDragging = true;
          startX = e.touches[0].clientX - panX;
          startY = e.touches[0].clientY - panY;
        } else if (e.touches.length === 2) {
          isDragging = false;
          initialPinchDistance = getTouchDistance(e.touches);
          initialPinchZoom = zoomLevel;
        }
      }, { passive: true });

      stage.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches.length === 1) {
          panX = e.touches[0].clientX - startX;
          panY = e.touches[0].clientY - startY;
          applyTransform();
        } else if (e.touches.length === 2 && initialPinchDistance) {
          const currentDist = getTouchDistance(e.touches);
          const ratio = currentDist / initialPinchDistance;
          setZoom(initialPinchZoom * ratio);
        }
      }, { passive: true });

      stage.addEventListener('touchend', () => {
        isDragging = false;
        initialPinchDistance = null;
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (modal.hidden) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        prevPhoto();
      } else if (e.key === 'ArrowRight') {
        nextPhoto();
      } else if (e.key === '+' || e.key === '=') {
        setZoom(zoomLevel + ZOOM_STEP);
      } else if (e.key === '-' || e.key === '_') {
        setZoom(zoomLevel - ZOOM_STEP);
      } else if (e.key === '0') {
        resetZoom();
      }
    });
  }

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function applyTransform() {
    const img = document.getElementById('pgLbImg');
    const stage = document.getElementById('pgLbStage');
    const zoomLevelEl = document.getElementById('pgLbZoomLevel');

    if (!img) return;

    if (zoomLevel <= 1.0) {
      panX = 0;
      panY = 0;
      if (stage) stage.classList.remove('is-zoomed');
    } else {
      if (stage) stage.classList.add('is-zoomed');
    }

    img.style.transform = `translate3d(${panX}px, ${panY}px, 0px) scale(${zoomLevel})`;
    if (zoomLevelEl) {
      zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
  }

  function setZoom(newZoom, focalX, focalY) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    if (Math.abs(clamped - zoomLevel) < 0.01) return;

    // Adjust pan toward focal point if given
    if (focalX != null && focalY != null && zoomLevel > 0) {
      const stage = document.getElementById('pgLbStage');
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const factor = (clamped / zoomLevel) - 1;
        panX -= (focalX - centerX) * factor * 0.4;
        panY -= (focalY - centerY) * factor * 0.4;
      }
    }

    zoomLevel = clamped;
    applyTransform();
  }

  function resetZoom() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  /**
   * Open the Lightbox modal on a specific album and photo index
   */
  function openLightbox(albumOrId, index = 0) {
    let album = null;
    if (typeof albumOrId === 'string') {
      if (typeof getGalleryAlbumById === 'function') {
        album = getGalleryAlbumById(albumOrId);
      }
    } else {
      album = albumOrId;
    }

    if (!album) return;

    currentAlbum = album;
    currentPhotoIndex = Math.max(0, Math.min(index, (album.photos || []).length - 1));

    const modal = ensureLightboxModal();
    resetZoom();

    // Populate Album Metadata
    const catEl = modal.querySelector('#pgLbCategory');
    const titleEl = modal.querySelector('#pgLbTitle');
    const woodEl = modal.querySelector('#pgLbWoodSpec');

    if (catEl) catEl.textContent = formatCategoryName(album.category);
    if (titleEl) titleEl.textContent = album.title;
    if (woodEl) woodEl.textContent = `${album.woodType || 'Solid Wood'}${album.finish ? ' • ' + album.finish : ''}`;

    // Render Thumbnail strip
    renderLightboxThumbnails(modal, album);

    // Render current active photo
    renderActivePhoto();

    modal.hidden = false;
    document.body.classList.add('pg-lightbox-open');
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
    });
  }

  function closeLightbox() {
    const modal = document.getElementById('pendragonGalleryLightbox');
    if (!modal) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    modal.classList.remove('is-open');
    document.body.classList.remove('pg-lightbox-open');
    setTimeout(() => {
      modal.hidden = true;
      resetZoom();
      currentAlbum = null;
    }, 300);
  }

  function renderLightboxThumbnails(modal, album) {
    const container = modal.querySelector('#pgLbThumbnails');
    if (!container) return;

    const photos = album.photos || [];
    container.innerHTML = photos.map((photo, i) => `
      <button type="button" class="pg-lb-thumb${i === currentPhotoIndex ? ' is-active' : ''}" data-index="${i}" aria-label="View photo ${i + 1}">
        <img src="${escapeHtml(photo.url)}" alt="Thumbnail ${i + 1}">
        <span class="pg-lb-thumb-num">${i + 1}</span>
      </button>
    `).join('');

    container.querySelectorAll('.pg-lb-thumb').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        goToPhoto(idx);
      });
    });
  }

  function renderActivePhoto() {
    if (!currentAlbum || !currentAlbum.photos || !currentAlbum.photos.length) return;

    const modal = document.getElementById('pendragonGalleryLightbox');
    if (!modal) return;

    const photo = currentAlbum.photos[currentPhotoIndex];
    if (!photo) return;

    const img = modal.querySelector('#pgLbImg');
    const counterEl = modal.querySelector('#pgLbCounter');
    const captionEl = modal.querySelector('#pgLbCaption');
    const prevBtn = modal.querySelector('#pgLbPrevBtn');
    const nextBtn = modal.querySelector('#pgLbNextBtn');
    const waBtn = modal.querySelector('#pgLbWhatsAppBtn');

    // Reset zoom before image switch
    resetZoom();

    if (img) {
      img.src = photo.url;
      img.alt = `${currentAlbum.title} - ${photo.caption || 'Photo ' + (currentPhotoIndex + 1)}`;
    }

    if (counterEl) {
      counterEl.textContent = `Photo ${currentPhotoIndex + 1} of ${currentAlbum.photos.length}`;
    }

    if (captionEl) {
      captionEl.textContent = photo.caption || `Perspective Angle ${currentPhotoIndex + 1} of ${currentAlbum.title}`;
    }

    // Toggle navigation buttons visibility if only 1 photo
    const hasMultiple = currentAlbum.photos.length > 1;
    if (prevBtn) prevBtn.style.visibility = hasMultiple ? 'visible' : 'hidden';
    if (nextBtn) nextBtn.style.visibility = hasMultiple ? 'visible' : 'hidden';

    // Highlight thumbnail
    modal.querySelectorAll('.pg-lb-thumb').forEach((btn, i) => {
      btn.classList.toggle('is-active', i === currentPhotoIndex);
      if (i === currentPhotoIndex) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });

    // Update WhatsApp Inquiry Button
    if (waBtn) {
      const settings = (typeof getSettings === 'function') ? getSettings() : {};
      const shopName = (settings && settings.shopName) ? settings.shopName : 'Pendragon Furniture';
      const msg = `Hello ${shopName}! I saw your design "${currentAlbum.title}" (${currentAlbum.woodType || 'Solid Wood'}) in your gallery and I would like to inquire about ordering this design / getting a quote. Photo ${currentPhotoIndex + 1}: ${photo.url}`;
      waBtn.href = (typeof getWhatsAppUrl === 'function')
        ? getWhatsAppUrl(msg)
        : `https://wa.me/94772345678?text=${encodeURIComponent(msg)}`;
    }
  }

  function goToPhoto(index) {
    if (!currentAlbum || !currentAlbum.photos) return;
    const total = currentAlbum.photos.length;
    currentPhotoIndex = (index + total) % total;
    renderActivePhoto();
  }

  function prevPhoto() {
    goToPhoto(currentPhotoIndex - 1);
  }

  function nextPhoto() {
    goToPhoto(currentPhotoIndex + 1);
  }

  function formatCategoryName(cat) {
    const map = {
      dining: 'Dining Suite',
      living: 'Living Room',
      bedroom: 'Bedroom Suite',
      office: 'Office & Study',
      custom: 'Custom Project'
    };
    return map[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Furniture Design');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Render Gallery Album Cards into a grid (used on gallery.html & index.html)
   */
  function renderGalleryGrid(containerId = 'galleryGrid', filterCategory = 'all', searchQuery = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (typeof getGalleryAlbums !== 'function') return;

    let albums = getGalleryAlbums();

    if (filterCategory && filterCategory !== 'all') {
      albums = albums.filter(a => (a.category || '').toLowerCase() === filterCategory.toLowerCase());
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      albums = albums.filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.woodType || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      );
    }

    if (!albums.length) {
      container.innerHTML = `
        <div class="gallery-empty-state">
          <div class="gallery-empty-icon">🖼️</div>
          <h3>No Design Albums Found</h3>
          <p>No furniture designs match your current filter or search criteria. Try selecting another category.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = albums.map(album => {
      const photos = album.photos || [];
      const photoCount = photos.length;
      const coverUrl = album.coverImage || (photos[0] ? photos[0].url : 'images/logo.jpg');
      const waMsg = `Hello Pendragon Furniture! I am interested in your design "${album.title}" (${album.woodType || 'Solid Wood'}). Could you please share more details and a price quote?`;
      const waUrl = (typeof getWhatsAppUrl === 'function')
        ? getWhatsAppUrl(waMsg)
        : `https://wa.me/94772345678?text=${encodeURIComponent(waMsg)}`;

      // Mini thumbnail preview strip (first 4 photos)
      const thumbsHtml = photos.slice(0, 4).map((p, idx) => `
        <button type="button" class="alb-card-thumb-btn" data-album-id="${album.id}" data-photo-idx="${idx}" title="${escapeHtml(p.caption || 'View photo ' + (idx + 1))}">
          <img src="${escapeHtml(p.url)}" alt="${escapeHtml(album.title)} thumb ${idx + 1}" loading="lazy">
        </button>
      `).join('');

      const moreBadge = photoCount > 4 ? `<span class="alb-card-more-badge">+${photoCount - 4} more</span>` : '';

      return `
        <article class="gallery-album-card" data-album-id="${album.id}">
          <div class="alb-card-media" data-album-id="${album.id}" data-photo-idx="0">
            <img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(album.title)}" class="alb-card-cover-img" loading="lazy">
            <div class="alb-card-overlay">
              <span class="alb-card-zoom-badge">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                <span>Zoom &amp; Inspect</span>
              </span>
            </div>
            <div class="alb-card-badges">
              <span class="alb-badge-count">📷 ${photoCount} Photo${photoCount !== 1 ? 's' : ''}</span>
              <span class="alb-badge-category">${escapeHtml(formatCategoryName(album.category))}</span>
            </div>
          </div>

          <div class="alb-card-body">
            <div class="alb-card-spec-row">
              <span class="alb-spec-wood">🌿 ${escapeHtml(album.woodType || 'Solid Moratuwa Teak')}</span>
              ${album.finish ? `<span class="alb-spec-finish">✨ ${escapeHtml(album.finish)}</span>` : ''}
            </div>

            <h3 class="alb-card-title">${escapeHtml(album.title)}</h3>
            <p class="alb-card-desc">${escapeHtml(album.description || 'Custom handcrafted design featuring traditional joinery and premium wood polish.')}</p>

            <!-- Mini Thumbnails Filmstrip inside Card -->
            <div class="alb-card-strip">
              <span class="alb-strip-label">Album Previews:</span>
              <div class="alb-strip-thumbs">
                ${thumbsHtml}
                ${moreBadge}
              </div>
            </div>

            <div class="alb-card-footer">
              <button type="button" class="btn btn-primary alb-view-album-btn" data-album-id="${album.id}">
                <span>🔍 Open Album &amp; Zoom</span>
              </button>
              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline alb-wa-inquire-btn" title="Inquire on WhatsApp">
                <svg class="whatsapp-icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.34C9.33 7.34 9 7.42 8.73 7.71C8.45 8.01 7.68 8.74 7.68 10.21C7.68 11.69 8.75 13.11 8.9 13.31C9.05 13.51 11.02 16.55 14.04 17.85C14.76 18.16 15.32 18.35 15.76 18.49C16.48 18.72 17.14 18.69 17.65 18.61C18.23 18.52 19.42 17.89 19.67 17.19C19.92 16.49 19.92 15.89 19.84 15.76C19.77 15.63 19.57 15.56 19.27 15.41C18.98 15.26 17.51 14.54 17.24 14.44C16.96 14.34 16.77 14.29 16.57 14.59C16.37 14.88 15.81 15.56 15.63 15.76C15.46 15.96 15.29 15.98 14.99 15.83C14.7 15.68 13.74 15.37 12.61 14.36C11.73 13.57 11.13 12.6 10.96 12.3C10.79 12.01 10.94 11.85 11.09 11.7C11.22 11.57 11.38 11.36 11.53 11.18C11.68 11.01 11.73 10.88 11.83 10.69C11.93 10.49 11.88 10.32 11.8 10.17C11.73 10.02 11.13 8.56 10.88 7.96C10.64 7.37 10.4 7.45 10.22 7.44C10.04 7.44 9.84 7.44 9.53 7.34Z"/>
                </svg>
                <span>Inquire</span>
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach click triggers to open lightbox
    container.querySelectorAll('.alb-card-media, .alb-view-album-btn').forEach(el => {
      el.addEventListener('click', () => {
        const albumId = el.dataset.albumId;
        const photoIdx = Number(el.dataset.photoIdx || 0);
        openLightbox(albumId, photoIdx);
      });
    });

    container.querySelectorAll('.alb-card-thumb-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const albumId = btn.dataset.albumId;
        const photoIdx = Number(btn.dataset.photoIdx || 0);
        openLightbox(albumId, photoIdx);
      });
    });
  }

  /**
   * Initialize Gallery page filters, search bar, and grid
   */
  function initGalleryPage() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    let activeFilter = 'all';
    let searchQuery = '';

    const filterBar = document.getElementById('galleryFilterBar');
    if (filterBar) {
      filterBar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFilter = btn.dataset.category || 'all';
          renderGalleryGrid('galleryGrid', activeFilter, searchQuery);
        });
      });
    }

    const searchInput = document.getElementById('gallerySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderGalleryGrid('galleryGrid', activeFilter, searchQuery);
      });
    }

    renderGalleryGrid('galleryGrid', activeFilter, searchQuery);

    // Listen for gallery data changes from Admin or Cloud sync
    window.addEventListener('gallery-updated', () => {
      renderGalleryGrid('galleryGrid', activeFilter, searchQuery);
    });
  }

  // Expose API
  window.PendragonGallery = {
    openLightbox: openLightbox,
    closeLightbox: closeLightbox,
    renderGalleryGrid: renderGalleryGrid,
    initGalleryPage: initGalleryPage
  };

  // Auto-init if on page with gallery
  document.addEventListener('DOMContentLoaded', () => {
    initGalleryPage();
  });

})();
