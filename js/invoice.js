/**
 * Pendragon Furniture - Luxury Invoice & Bill PDF Generator
 * Generates prestigious, branded PDF invoices and printable bills for orders.
 */

(function () {
  'use strict';

  function formatInvoicePrice(price) {
    if (typeof formatPrice === 'function') return formatPrice(price);
    return 'Rs. ' + Number(price || 0).toLocaleString('en-LK');
  }

  function formatInvoiceDate(dateStr) {
    if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }

  function getCompanySettings() {
    if (typeof getSettings === 'function') {
      return getSettings();
    }
    return {
      shopName: 'Pendragon Furniture',
      phone: '+94 11 234 5678',
      whatsapp: '+94 77 951 4377',
      email: 'info@woodcraft.lk',
      address: '45, Furniture Lane, Moratuwa, Sri Lanka'
    };
  }

  function getInvoiceCss() {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Inter:wght@400;500;600;700;800&display=swap');

      * { box-sizing: border-box; }
      
      .pf-invoice-card {
        width: 100%;
        max-width: 790px;
        margin: 0 auto;
        background: #ffffff !important;
        color: #1e293b !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 26px 30px;
        box-sizing: border-box;
        line-height: 1.45;
        border-radius: 10px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        border: 1px solid #e2e8f0;
        position: relative;
        background-image: radial-gradient(#faf5ea 1px, transparent 1px) !important;
        background-size: 20px 20px !important;
      }

      /* Top Gold Accent Header Bar */
      .pf-inv-top-accent {
        height: 5px;
        background: linear-gradient(90deg, #83161c 0%, #c59b27 35%, #ffd700 50%, #c59b27 65%, #83161c 100%);
        border-radius: 8px 8px 0 0;
        margin: -26px -30px 20px -30px;
      }

      /* Header */
      .pf-inv-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 14px;
      }

      .pf-inv-brand {
        flex: 1;
      }

      .pf-inv-logo-row {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 10px;
      }

      .pf-inv-logo-frame {
        width: 62px;
        height: 62px;
        min-width: 62px;
        border-radius: 10px;
        background: #ffffff;
        border: 2px solid #c59b27;
        box-shadow: 0 3px 10px rgba(131, 22, 28, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 3px;
        overflow: hidden;
      }

      .pf-inv-logo {
        width: 54px;
        height: 54px;
        object-fit: contain;
        display: block;
      }

      .pf-inv-title-wrap {
        display: flex;
        flex-direction: column;
      }

      .pf-inv-company-name {
        font-family: 'Cinzel', 'Inter', Georgia, serif;
        font-size: 1.45rem;
        font-weight: 800;
        color: #83161c !important;
        margin: 0;
        line-height: 1.15;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .pf-inv-company-sub {
        font-size: 0.76rem;
        color: #b48316;
        font-weight: 700;
        margin: 2px 0 0 0;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .pf-inv-company-contact {
        font-size: 0.78rem;
        color: #475569;
        line-height: 1.45;
        background: #fafaf9;
        padding: 6px 12px;
        border-radius: 6px;
        border-left: 3px solid #c59b27;
        display: inline-block;
      }

      .pf-inv-contact-item {
        display: inline-block;
        margin-right: 12px;
      }

      /* Meta Column (Right) */
      .pf-inv-meta {
        text-align: right;
        min-width: 220px;
      }

      .pf-inv-badge-wrap {
        display: inline-block;
        background: linear-gradient(135deg, #83161c 0%, #5a0c11 100%);
        color: #ffffff !important;
        padding: 5px 14px;
        border-radius: 6px;
        border: 1px solid #c59b27;
        box-shadow: 0 2px 8px rgba(131, 22, 28, 0.2);
        margin-bottom: 8px;
      }

      .pf-inv-badge-title {
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .pf-inv-meta-card {
        background: #fdfcfb;
        border: 1px solid #e7e5e4;
        border-radius: 6px;
        padding: 8px 12px;
        text-align: right;
      }

      .pf-inv-meta-line {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
        margin-bottom: 3px;
        font-size: 0.82rem;
      }

      .pf-inv-meta-line:last-child {
        margin-bottom: 0;
      }

      .pf-inv-meta-label {
        color: #64748b;
        font-weight: 600;
        font-size: 0.76rem;
        text-transform: uppercase;
      }

      .pf-inv-order-ref {
        font-family: 'Cinzel', monospace;
        font-size: 1.15rem;
        color: #83161c !important;
        font-weight: 800;
        letter-spacing: 0.04em;
      }

      .pf-inv-meta-val {
        color: #1e293b;
        font-weight: 700;
      }

      .pf-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .pf-status-badge.status-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
      .pf-status-badge.status-confirmed { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
      .pf-status-badge.status-completed { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
      .pf-status-badge.status-cancelled { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

      /* Divider Ribbon */
      .pf-inv-divider {
        display: flex;
        align-items: center;
        margin: 12px 0 16px 0;
        gap: 10px;
      }

      .pf-inv-divider-line {
        flex: 1;
        height: 1.5px;
        background: linear-gradient(90deg, #e2e8f0 0%, #c59b27 50%, #e2e8f0 100%);
      }

      .pf-inv-divider-crest {
        color: #c59b27;
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 3px;
      }

      /* 2-Column Info Grid */
      .pf-inv-info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 16px;
      }

      .pf-info-box {
        background: #fdfcfb;
        border: 1px solid #e7e5e4;
        border-top: 3px solid #c59b27;
        border-radius: 8px;
        padding: 10px 14px;
      }

      .pf-info-box-title {
        font-size: 0.76rem;
        font-weight: 800;
        color: #83161c;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin: 0 0 8px 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .pf-info-row {
        font-size: 0.8rem;
        color: #1e293b;
        margin-bottom: 4px;
        line-height: 1.35;
      }

      .pf-info-row strong {
        color: #475569;
        font-weight: 600;
        display: inline-block;
        min-width: 72px;
      }

      .pf-info-row.highlight-name {
        font-size: 0.92rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 5px;
      }

      .pf-delivery-notes-tag {
        margin-top: 4px;
        padding: 4px 8px;
        background: #fffbeb;
        border: 1px solid #fef3c7;
        border-radius: 4px;
        font-size: 0.76rem;
        color: #92400e;
      }

      /* Items Table */
      .pf-table-wrapper {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 16px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
      }

      .pf-invoice-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
        text-align: left;
      }

      .pf-invoice-table thead th {
        background: #1e1e24;
        color: #ffffff !important;
        font-weight: 700;
        padding: 9px 12px;
        text-transform: uppercase;
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        border-bottom: 2px solid #c59b27;
      }

      .pf-invoice-table tbody tr {
        border-bottom: 1px solid #e2e8f0;
      }

      .pf-invoice-table tbody tr:nth-child(even) {
        background: #fafaf9;
      }

      .pf-invoice-table tbody tr:last-child {
        border-bottom: none;
      }

      .pf-invoice-table td {
        padding: 10px 12px;
        vertical-align: middle;
      }

      .pf-col-num { width: 36px; text-align: center; color: #64748b; font-weight: 700; }
      .pf-col-item { color: #0f172a; }
      .pf-col-price { width: 110px; text-align: right; font-weight: 600; color: #334155; }
      .pf-col-qty { width: 45px; text-align: center; font-weight: 800; color: #0f172a; }
      .pf-col-total { width: 125px; text-align: right; font-weight: 800; color: #83161c; }

      .pf-item-title {
        font-weight: 700;
        font-size: 0.88rem;
        color: #0f172a;
      }

      .pf-item-design-pill {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        margin-top: 3px;
        font-size: 0.74rem;
        color: #854d0e;
        background: #fefce8;
        border: 1px solid #fef08a;
        padding: 2px 7px;
        border-radius: 4px;
        font-weight: 600;
      }

      /* Settlement Grid */
      .pf-settlement-grid {
        display: grid;
        grid-template-columns: 1.35fr 1fr;
        gap: 16px;
        margin-bottom: 18px;
        align-items: stretch;
      }

      .pf-notes-panel {
        background: #fcfbf9;
        border: 1px solid #e7e5e4;
        border-radius: 8px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .pf-notes-panel h4 {
        margin: 0 0 6px 0;
        font-size: 0.82rem;
        color: #83161c;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .pf-notes-panel p {
        margin: 0 0 5px 0;
        font-size: 0.76rem;
        color: #57534e;
        line-height: 1.4;
      }

      .pf-notes-hotline {
        background: #fefce8;
        border: 1px solid #fef08a;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 0.76rem;
        color: #854d0e;
        margin-top: 4px;
      }

      .pf-totals-panel {
        background: #fdfcfb;
        border: 1px solid #e7e5e4;
        border-radius: 8px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
      }

      .pf-totals-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.82rem;
        color: #475569;
      }

      .pf-totals-row strong {
        color: #0f172a;
      }

      .pf-free-tag {
        color: #15803d;
        font-weight: 800;
      }

      .pf-totals-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 4px 0;
      }

      .pf-grand-total-box {
        background: linear-gradient(135deg, #83161c 0%, #580c10 100%);
        color: #ffffff !important;
        border: 1.5px solid #c59b27;
        border-radius: 6px;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 3px 10px rgba(131, 22, 28, 0.18);
        margin-top: 2px;
      }

      .pf-grand-total-label {
        font-size: 0.82rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #fef08a !important;
      }

      .pf-grand-total-amount {
        font-family: 'Cinzel', 'Inter', monospace;
        font-size: 1.25rem;
        font-weight: 800;
        color: #ffffff !important;
        letter-spacing: 0.02em;
      }

      /* Footer Official Seal & Signature */
      .pf-inv-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px dashed #cbd5e1;
        gap: 16px;
      }

      .pf-seal-container {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .pf-royal-seal {
        width: 74px;
        height: 74px;
        min-width: 74px;
        border: 2px solid #c59b27;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 3px;
        background: #fbf8f0;
        box-shadow: inset 0 0 0 2px #83161c;
        transform: rotate(-6deg);
      }

      .pf-seal-stars {
        font-size: 0.5rem;
        color: #c59b27;
        letter-spacing: 2px;
        line-height: 1;
      }

      .pf-seal-text-brand {
        font-family: 'Cinzel', serif;
        font-size: 0.58rem;
        font-weight: 800;
        color: #83161c;
        letter-spacing: 0.05em;
        line-height: 1.1;
      }

      .pf-seal-text-verified {
        font-size: 0.48rem;
        font-weight: 800;
        color: #b48316;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .pf-seal-text-wood {
        font-size: 0.44rem;
        color: #475569;
        text-transform: uppercase;
        font-weight: 600;
      }

      .pf-seal-caption {
        font-size: 0.72rem;
        color: #64748b;
        max-width: 260px;
        line-height: 1.3;
      }

      .pf-sign-box {
        text-align: center;
        min-width: 170px;
      }

      .pf-sig-rule {
        width: 150px;
        height: 1px;
        background: #78716c;
        margin: 0 auto 5px auto;
      }

      .pf-sig-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: #1e293b;
        display: block;
      }

      .pf-sig-company {
        font-size: 0.68rem;
        color: #64748b;
        display: block;
      }

      /* Print Optimizations */
      @media print {
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        body {
          background: #ffffff !important;
          padding: 0 !important;
          margin: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        .pf-invoice-card {
          box-shadow: none !important;
          border: 1px solid #cbd5e1 !important;
          margin: 0 auto !important;
          padding: 20px 24px !important;
          width: 100% !important;
          max-width: 100% !important;
          page-break-inside: avoid !important;
        }

        .pf-inv-top-accent {
          margin: -20px -24px 16px -24px !important;
        }

        .print-btn-bar, .pf-inv-modal-header, .pf-inv-modal-actions {
          display: none !important;
        }
      }
    `;
  }

  function buildInvoiceHtml(order) {
    const settings = getCompanySettings();
    const items = Array.isArray(order.items) && order.items.length
      ? order.items
      : [{ name: 'Custom Furniture Item', designName: 'Standard', quantity: 1, price: order.total || 0 }];

    const itemsRowsHtml = items.map((item, idx) => {
      const unit = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      const lineTotal = unit * qty;
      const designTag = item.designName
        ? `<div class="pf-item-design-pill">✦ Variant: <em>${escapeHtml(item.designName)}</em></div>`
        : '';

      return `
        <tr>
          <td class="pf-col-num">${idx + 1}</td>
          <td class="pf-col-item">
            <div class="pf-item-title">${escapeHtml(item.name)}</div>
            ${designTag}
          </td>
          <td class="pf-col-price">${formatInvoicePrice(unit)}</td>
          <td class="pf-col-qty">${qty}</td>
          <td class="pf-col-total">${formatInvoicePrice(lineTotal)}</td>
        </tr>
      `;
    }).join('');

    const channelLabel = order.channel === 'whatsapp' ? '💬 Direct WhatsApp Order' : '🌐 Online Website Order';
    const statusUpper = (order.status || 'pending').toUpperCase();
    const customerPhone = order.phone || 'Not provided';
    const orderNumber = order.orderNumber || order.id || '#PF-1001';

    return `
      <div class="pf-invoice-card" id="pfInvoiceContent">
        <!-- Top Gradient Accent -->
        <div class="pf-inv-top-accent"></div>

        <!-- Header -->
        <div class="pf-inv-header">
          <div class="pf-inv-brand">
            <div class="pf-inv-logo-row">
              <div class="pf-inv-logo-frame">
                <img src="images/logo-icon.png" width="54" height="54" alt="Pendragon Furniture Logo" class="pf-inv-logo" onerror="this.src='images/favicon-64.png'">
              </div>
              <div class="pf-inv-title-wrap">
                <h1 class="pf-inv-company-name">${escapeHtml(settings.shopName || 'Pendragon Furniture')}</h1>
                <p class="pf-inv-company-sub">Master Hardwood &amp; Handcrafted Living · Moratuwa</p>
              </div>
            </div>
            <div class="pf-inv-company-contact">
              <span class="pf-inv-contact-item">📍 ${escapeHtml(settings.address || '45, Furniture Lane, Moratuwa, Sri Lanka')}</span><br>
              <span class="pf-inv-contact-item">📞 ${escapeHtml(settings.phone || '+94 11 234 5678')}</span>
              <span class="pf-inv-contact-item">💬 WhatsApp: <strong>${escapeHtml(settings.whatsapp || '+94 77 951 4377')}</strong></span>
              <span class="pf-inv-contact-item">✉️ ${escapeHtml(settings.email || 'info@woodcraft.lk')}</span>
            </div>
          </div>

          <div class="pf-inv-meta">
            <div class="pf-inv-badge-wrap">
              <span class="pf-inv-badge-title">OFFICIAL ORDER BILL</span>
            </div>
            <div class="pf-inv-meta-card">
              <div class="pf-inv-meta-line">
                <span class="pf-inv-meta-label">Order Ref:</span>
                <span class="pf-inv-order-ref">${escapeHtml(orderNumber)}</span>
              </div>
              <div class="pf-inv-meta-line">
                <span class="pf-inv-meta-label">Date:</span>
                <span class="pf-inv-meta-val">${formatInvoiceDate(order.date)}</span>
              </div>
              <div class="pf-inv-meta-line">
                <span class="pf-inv-meta-label">Channel:</span>
                <span class="pf-inv-meta-val" style="font-size:0.75rem;">${channelLabel}</span>
              </div>
              <div class="pf-inv-meta-line">
                <span class="pf-inv-meta-label">Status:</span>
                <span class="pf-status-badge status-${order.status || 'pending'}">● ${statusUpper}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Decorative Divider -->
        <div class="pf-inv-divider">
          <div class="pf-inv-divider-line"></div>
          <span class="pf-inv-divider-crest">❖ PENDRAGON LUXURY CRAFT ❖</span>
          <div class="pf-inv-divider-line"></div>
        </div>

        <!-- Customer & Showroom Info -->
        <div class="pf-inv-info-grid">
          <div class="pf-info-box">
            <div class="pf-info-box-title">👤 Customer / Delivery Information</div>
            <div class="pf-info-row highlight-name">${escapeHtml(order.customerName || 'Valued Customer')}</div>
            <div class="pf-info-row"><strong>Phone:</strong> <span>${escapeHtml(customerPhone)}</span></div>
            ${order.email ? `<div class="pf-info-row"><strong>Email:</strong> <span>${escapeHtml(order.email)}</span></div>` : ''}
            ${order.notes ? `<div class="pf-delivery-notes-tag"><strong>Notes / Address:</strong> <em>${escapeHtml(order.notes)}</em></div>` : ''}
          </div>

          <div class="pf-info-box">
            <div class="pf-info-box-title">🏪 Showroom &amp; Fulfillment</div>
            <div class="pf-info-row"><strong>Showroom:</strong> <span>${escapeHtml(order.shopName || settings.shopName || 'Moratuwa Main Showroom')}</span></div>
            <div class="pf-info-row"><strong>Fulfillment:</strong> <span>Showroom Collection / Standard Delivery</span></div>
            <div class="pf-info-row"><strong>Guarantee:</strong> <span style="color:#15803d; font-weight:700;">2-Year Natural Hardwood Warranty</span></div>
            <div class="pf-info-row"><strong>Payment:</strong> <span>Pay upon Delivery / Showroom Collection</span></div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="pf-table-wrapper">
          <table class="pf-invoice-table">
            <thead>
              <tr>
                <th class="pf-col-num">#</th>
                <th class="pf-col-item">Furniture Item &amp; Chosen Variant / Finish</th>
                <th class="pf-col-price">Unit Price</th>
                <th class="pf-col-qty">Qty</th>
                <th class="pf-col-total">Total (LKR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Calculations & Notes -->
        <div class="pf-settlement-grid">
          <div class="pf-notes-panel">
            <div>
              <h4>✨ Craftsmanship Guarantee &amp; Assistance</h4>
              <p>Thank you for choosing <strong>Pendragon Furniture</strong>. Every piece is handcrafted from 100% seasoned, grade-A natural hardwood.</p>
              <p>Our showroom representative will get in touch on <strong>${escapeHtml(customerPhone)}</strong> to confirm your delivery schedule.</p>
            </div>
            <div class="pf-notes-hotline">
              💬 For instant support on WhatsApp, message <strong>${escapeHtml(settings.whatsapp || '+94 77 951 4377')}</strong> quoting reference <strong>${escapeHtml(orderNumber)}</strong>.
            </div>
          </div>

          <div class="pf-totals-panel">
            <div class="pf-totals-row">
              <span>Items Subtotal:</span>
              <strong>${formatInvoicePrice(order.total)}</strong>
            </div>
            <div class="pf-totals-row">
              <span>Showroom Pickup:</span>
              <span class="pf-free-tag">FREE</span>
            </div>
            <div class="pf-totals-row">
              <span>Assembly &amp; Wood Care:</span>
              <span style="color:#166534; font-weight:600;">INCLUDED</span>
            </div>
            <div class="pf-totals-divider"></div>
            <div class="pf-grand-total-box">
              <span class="pf-grand-total-label">Estimated Total:</span>
              <span class="pf-grand-total-amount">${formatInvoicePrice(order.total)}</span>
            </div>
          </div>
        </div>

        <!-- Footer Seal & Signature -->
        <div class="pf-inv-footer">
          <div class="pf-seal-container">
            <div class="pf-royal-seal">
              <span class="pf-seal-stars">★ ★ ★</span>
              <span class="pf-seal-text-brand">PENDRAGON</span>
              <span class="pf-seal-text-verified">AUTHENTIC</span>
              <span class="pf-seal-text-wood">100% HARDWOOD</span>
            </div>
            <div class="pf-seal-caption">
              <strong>Official Computer-Generated Bill</strong><br>
              Issued by Pendragon Furniture (Pvt) Ltd. All natural wood protected under standard warranty terms.
            </div>
          </div>

          <div class="pf-sign-box">
            <div class="pf-sig-rule"></div>
            <span class="pf-sig-title">Authorized Signatory</span>
            <span class="pf-sig-company">Pendragon Furniture (Pvt) Ltd</span>
          </div>
        </div>
      </div>
    `;
  }

  function downloadOrderPdf(order, onComplete) {
    if (!order) {
      alert('Order details missing.');
      return;
    }

    const orderNum = (order.orderNumber || order.id || 'PF-ORDER').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `Pendragon_Invoice_${orderNum}.pdf`;

    // Render off-screen wrapper with explicit dimensions and full CSS
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed; left:0; top:0; z-index:-99999; opacity:0; pointer-events:none; width:790px; background:#ffffff;';
    container.innerHTML = `
      <style>${getInvoiceCss()}</style>
      ${buildInvoiceHtml(order)}
    `;
    document.body.appendChild(container);

    const invoiceEl = container.querySelector('#pfInvoiceContent');

    // Helper to ensure images inside the container are loaded before capturing
    const ensureImages = () => {
      const imgs = Array.from(invoiceEl.querySelectorAll('img'));
      return Promise.all(imgs.map(img => {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise(res => {
          img.onload = () => res();
          img.onerror = () => res();
          setTimeout(res, 600);
        });
      }));
    };

    ensureImages().then(() => {
      if (typeof window.html2pdf === 'function') {
        const opt = {
          margin: [6, 6, 6, 6],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().set(opt).from(invoiceEl).save().then(() => {
          if (container.parentNode) container.parentNode.removeChild(container);
          if (typeof onComplete === 'function') onComplete(true);
        }).catch(err => {
          console.error('PDF generation error, switching to print fallback:', err);
          if (container.parentNode) container.parentNode.removeChild(container);
          fallbackPrintInvoice(order);
          if (typeof onComplete === 'function') onComplete(false);
        });
      } else {
        if (container.parentNode) container.parentNode.removeChild(container);
        fallbackPrintInvoice(order);
        if (typeof onComplete === 'function') onComplete(true);
      }
    });
  }

  function fallbackPrintInvoice(order) {
    const printWindow = window.open('', '_blank', 'width=880,height=960');
    if (!printWindow) {
      alert('Popup blocker prevented opening invoice. Please allow popups.');
      return;
    }

    const htmlContent = buildInvoiceHtml(order);
    const cssContent = getInvoiceCss();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${order.orderNumber || 'Pendragon'}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          ${cssContent}
          body { 
            background: #f1f5f9; 
            padding: 24px; 
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .print-btn-bar {
            width: 100%;
            max-width: 790px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #ffffff;
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .print-btn-bar span {
            font-size: 0.9rem;
            color: #475569;
            font-weight: 600;
          }
          .print-btn-bar button {
            padding: 8px 20px;
            background: linear-gradient(135deg, #83161c 0%, #580c10 100%);
            color: #ffffff;
            border: 1px solid #c59b27;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 700;
            font-size: 0.9rem;
            box-shadow: 0 2px 6px rgba(131,22,28,0.25);
            transition: all 0.2s ease;
          }
          .print-btn-bar button:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }
          @media print {
            body { padding: 0 !important; background: #fff !important; }
            .print-btn-bar { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-btn-bar">
          <span>📄 Official Bill / Invoice &middot; ${order.orderNumber || ''}</span>
          <button onclick="window.print()">🖨️ Print / Save as PDF</button>
        </div>
        ${htmlContent}
        <script>
          window.onload = function() {
            // Small timeout to guarantee fonts & image loaded
            setTimeout(function() { 
              window.print(); 
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function previewOrderInvoice(order) {
    let modal = document.getElementById('pfInvoiceModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pfInvoiceModal';
      modal.className = 'pf-inv-modal';
      modal.innerHTML = `
        <div class="pf-inv-modal-backdrop" id="pfInvModalBackdrop"></div>
        <div class="pf-inv-modal-dialog">
          <div class="pf-inv-modal-header">
            <div class="pf-inv-modal-title">
              <h3>📄 Customer Order Bill / Invoice</h3>
              <span class="pf-inv-modal-subtitle" id="pfInvModalSubtitle">Order Preview</span>
            </div>
            <div class="pf-inv-modal-actions">
              <button type="button" class="btn btn-primary btn-sm" id="pfInvDownloadBtn">
                <span>📥</span> Download PDF
              </button>
              <button type="button" class="btn btn-outline btn-sm" id="pfInvPrintBtn">
                <span>🖨️</span> Print Bill
              </button>
              <button type="button" class="pf-inv-modal-close" id="pfInvCloseBtn" aria-label="Close invoice">&times;</button>
            </div>
          </div>
          <div class="pf-inv-modal-body" id="pfInvModalBody"></div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeHandler = () => { modal.hidden = true; };
      modal.querySelector('#pfInvCloseBtn').addEventListener('click', closeHandler);
      modal.querySelector('#pfInvModalBackdrop').addEventListener('click', closeHandler);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) closeHandler();
      });
    }

    const subEl = modal.querySelector('#pfInvModalSubtitle');
    if (subEl) subEl.textContent = `Order ${order.orderNumber || ''} · ${order.customerName || ''}`;

    const bodyEl = modal.querySelector('#pfInvModalBody');
    bodyEl.innerHTML = buildInvoiceHtml(order);

    const downloadBtn = modal.querySelector('#pfInvDownloadBtn');
    downloadBtn.onclick = () => {
      downloadBtn.disabled = true;
      downloadBtn.innerHTML = '<span>⏳</span> Generating PDF...';
      downloadOrderPdf(order, () => {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = '<span>📥</span> Download PDF';
      });
    };

    const printBtn = modal.querySelector('#pfInvPrintBtn');
    printBtn.onclick = () => {
      fallbackPrintInvoice(order);
    };

    modal.hidden = false;
  }

  // Delegated click handling for any trigger buttons across the site
  document.addEventListener('click', (e) => {
    const downloadBtn = e.target.closest('.pf-download-trigger');
    if (downloadBtn) {
      e.preventDefault();
      const orderId = downloadBtn.getAttribute('data-order-id');
      const order = (typeof getOrderById === 'function' ? getOrderById(orderId) : null)
        || (typeof getOrders === 'function' ? getOrders().find(o => o.id === orderId) : null);
      if (order) {
        downloadOrderPdf(order);
      } else {
        alert('Order details could not be found.');
      }
      return;
    }

    const previewBtn = e.target.closest('.pf-preview-trigger');
    if (previewBtn) {
      e.preventDefault();
      const orderId = previewBtn.getAttribute('data-order-id');
      const order = (typeof getOrderById === 'function' ? getOrderById(orderId) : null)
        || (typeof getOrders === 'function' ? getOrders().find(o => o.id === orderId) : null);
      if (order) {
        previewOrderInvoice(order);
      } else {
        alert('Order details could not be found.');
      }
      return;
    }
  });

  // Expose global API
  window.PendragonInvoice = {
    buildHtml: buildInvoiceHtml,
    downloadPdf: downloadOrderPdf,
    preview: previewOrderInvoice,
    print: fallbackPrintInvoice,
    getCss: getInvoiceCss
  };

})();
