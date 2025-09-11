import { supabase, getCurrentUserRole } from './supabase.js';

// Contract
// Inputs: localStorage 'zippyCart' array: [{id,name,price,quantity,image,businessId}]
// Outputs: Renders order summary; on submit creates order in Supabase (if configured),
// else stores locally under 'zippyOrders' for demo; clears cart and shows success toast.

let cart = JSON.parse(localStorage.getItem('zippyCart') || '[]');
let promoDeliveryDiscount = 0;

const $ = (id) => document.getElementById(id);

function formatCurrency(n) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n||0)); }
  catch { const v = Number(n||0); return `$${v.toFixed ? v.toFixed(2) : v}`; }
}

function calcSubtotal() { return cart.reduce((t, it) => t + (it.price * it.quantity), 0); }
function calcItems() { return cart.reduce((t, it) => t + it.quantity, 0); }

function getQueryParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

function deliveryFeeForCart() {
  // Simple rule: free over $50; otherwise $4.99 for delivery, $0 for pickup
  const method = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';
  if (method === 'pickup') return 0;
  const sub = calcSubtotal();
  const base = sub >= 50 ? 0 : 4.99;
  return Math.max(0, base - (promoDeliveryDiscount || 0));
}

function renderSummary() {
  const itemsWrap = $('orderItems');
  const empty = $('emptyState');
  const subtotalEl = $('subtotal');
  const deliveryEl = $('deliveryFee');
  const totalEl = $('orderTotal');
  const chipItems = $('chipItems');
  const chipTotal = $('chipTotal');

  if (!cart.length) {
    if (itemsWrap) itemsWrap.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  } else { if (empty) empty.style.display = 'none'; }

  const html = cart.map(it => `
    <div class="order-item">
      <div class="thumb">${it.image ? `<img src="${it.image}" alt="${escapeHtml(it.name)}"/>` : 'No image'}</div>
      <div>
        <div class="name">${escapeHtml(it.name)}</div>
        <div class="meta">Qty ${it.quantity} × ${formatCurrency(it.price)}</div>
      </div>
      <div class="price">${formatCurrency(it.price * it.quantity)}</div>
    </div>
  `).join('');
  if (itemsWrap) itemsWrap.innerHTML = html;

  const sub = calcSubtotal();
  const del = deliveryFeeForCart();
  const total = sub + del;

  if (subtotalEl) subtotalEl.textContent = formatCurrency(sub);
  if (deliveryEl) deliveryEl.textContent = formatCurrency(del);
  if (totalEl) totalEl.textContent = formatCurrency(total);
  if (chipItems) chipItems.textContent = `${calcItems()}`;
  if (chipTotal) chipTotal.textContent = formatCurrency(total);
}

function escapeHtml(str) {
  return (str ?? '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getCheckoutData() {
  const method = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';
  const data = {
    contact: {
      fullName: $('fullName')?.value?.trim() || '',
      email: $('email')?.value?.trim() || '',
      phone: $('phone')?.value?.trim() || '',
    },
    delivery: {
      method,
      address: $('address')?.value?.trim() || '',
      city: $('city')?.value?.trim() || '',
      postal: $('postal')?.value?.trim() || '',
      notes: $('notes')?.value?.trim() || '',
    },
    payment: {
      method: document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod',
      promoCode: $('promoCode')?.value?.trim() || '',
    },
    items: [...cart],
    prices: {
      subtotal: calcSubtotal(),
      deliveryFee: deliveryFeeForCart(),
      total: calcSubtotal() + deliveryFeeForCart(),
      currency: 'USD',
    },
    businessId: cart[0]?.businessId || null,
    createdAt: new Date().toISOString(),
  };
  return data;
}

function validate(data) {
  const errs = [];
  if (!data.contact.fullName) errs.push('Full name is required');
  if (!data.contact.phone) errs.push('Phone is required');
  if (data.delivery.method === 'delivery' && !data.delivery.address) errs.push('Delivery address is required');
  return errs;
}

function showToast(title = '', message = '', type = 'info', timeout = 3500) {
  try {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '!' : 'i'}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
        ${message ? `<p class="toast-message">${escapeHtml(message)}</p>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;
    container.appendChild(toast);
    const close = () => { toast.style.animation = 'slideOut var(--transition-normal) forwards'; setTimeout(() => toast.remove(), 280); };
    toast.querySelector('.toast-close')?.addEventListener('click', close);
    if (timeout > 0) setTimeout(close, timeout);
  } catch {}
}

async function placeOrder() {
  if (!cart.length) {
    showToast('Cart is empty', 'Add items to proceed', 'warning');
    return;
  }
  const data = getCheckoutData();
  const errs = validate(data);
  if (errs.length) {
    showToast('Fix the following', errs.join('\n'), 'error', 4500);
    return;
  }

  // Attempt to persist to Supabase if configured; otherwise fallback to localStorage demo
  try {
    const payload = {
      business_id: data.businessId,
      items: data.items,
      contact_name: data.contact.fullName,
      contact_email: data.contact.email || null,
      contact_phone: data.contact.phone,
      delivery_method: data.delivery.method,
      delivery_address: data.delivery.address,
      delivery_city: data.delivery.city,
      delivery_postal: data.delivery.postal,
      notes: data.delivery.notes || null,
      payment_method: data.payment.method,
      promo_code: data.payment.promoCode || null,
      subtotal: data.prices.subtotal,
      delivery_fee: data.prices.deliveryFee,
      total: data.prices.total,
      currency: data.prices.currency,
      status: 'pending',
      created_at: data.createdAt,
    };

    // Insert into a table named 'orders' (you can adjust on your backend)
    const { data: inserted, error } = await supabase
      .from('orders')
      .insert([payload])
      .select('*')
      .single();

    if (error) throw error;

    finalizeSuccess(inserted?.id || null);
  } catch (err) {
    console.warn('Supabase order create failed, using local storage fallback:', err?.message || err);
    // Local fallback
    const all = JSON.parse(localStorage.getItem('zippyOrders') || '[]');
    const localOrder = { id: `local_${Date.now()}`, ...getCheckoutData(), status: 'pending' };
    all.push(localOrder);
    localStorage.setItem('zippyOrders', JSON.stringify(all));
    finalizeSuccess(localOrder.id);
  }
}

function finalizeSuccess(orderId) {
  // Clear cart
  localStorage.setItem('zippyCart', '[]');
  cart = [];
  renderSummary();

  showToast('Order placed', `Your order ${orderId ? `#${orderId} ` : ''}was placed successfully.`, 'success');
  // Redirect after a short delay
  setTimeout(() => {
    window.location.href = 'customer-dashboard.html';
  }, 1200);
}

function onDeliveryMethodChange() {
  // Enable/disable address fields based on method
  const method = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'delivery';
  const isPickup = method === 'pickup';
  const addr = $('address');
  const city = $('city');
  const postal = $('postal');
  [addr, city, postal].forEach((el) => {
    if (!el) return;
    el.disabled = isPickup;
    if (isPickup) el.removeAttribute('required');
    else el.setAttribute('required', 'true');
  });
  renderSummary();
}

function applyPromo() {
  const code = $('promoCode')?.value?.trim().toUpperCase();
  if (!code) return;
  // Simple demo: code "SAVE5" reduces $5 if subtotal >= $25
  if (code === 'SAVE5' && calcSubtotal() >= 25) {
    promoDeliveryDiscount = 5;
    showToast('Promo applied', 'You saved $5.00 on delivery fee', 'success');
    renderSummary();
  } else {
    showToast('Invalid code', 'Try SAVE5 on orders over $25', 'warning');
  }
}

function setup() {
  // Preserve business id in header chip link
  const bizId = getQueryParam('id');
  const chip = $('cartSummaryChip');
  if (chip) chip.href = bizId ? `shop.html?id=${encodeURIComponent(bizId)}` : 'shop.html';

  // Prefill from user meta when available
  supabase.auth.getUser().then(({ data }) => {
    const user = data?.user;
    if (!user) return;
    const meta = user.user_metadata || {};
    if ($('fullName') && !$('fullName').value) $('fullName').value = `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
    if ($('email') && !$('email').value) $('email').value = user.email || '';
    if ($('phone') && !$('phone').value) $('phone').value = meta.phone || '';
    if ($('address') && !$('address').value) $('address').value = meta.address || '';
  }).catch(() => {});

  document.querySelectorAll('input[name="deliveryMethod"]').forEach(r => {
    r.addEventListener('change', onDeliveryMethodChange);
  });
  $('placeOrderBtn')?.addEventListener('click', placeOrder);
  $('applyPromo')?.addEventListener('click', applyPromo);

  // Initial state
  onDeliveryMethodChange();

  // Mobile layout tweak: ensure Payment is placed BELOW Order summary on small screens
  // Implementation: when width <= 991px, move the Order summary card before the Payment card
  try {
    const mq = window.matchMedia('(max-width: 991px)');
    const contentSection = document.querySelector('.checkout-section');
    const paymentCard = document.getElementById('paymentCard');
    const summaryCard = document.getElementById('summaryCard');
    const aside = document.querySelector('.summary-section');
    const applyOrder = () => {
      if (!contentSection || !paymentCard || !summaryCard) return;
      if (mq.matches) {
        // Place Order summary ABOVE Payment (so Payment is below)
        if (paymentCard.previousElementSibling !== summaryCard) {
          contentSection.insertBefore(summaryCard, paymentCard);
        }
      } else {
        // Restore Order summary back to sidebar for desktop layout
        if (aside && summaryCard.parentElement !== aside) {
          aside.appendChild(summaryCard);
        }
      }
    };
    mq.addEventListener ? mq.addEventListener('change', applyOrder) : mq.addListener(applyOrder);
    applyOrder();
  } catch {}
}

// Initialize
addEventListener('DOMContentLoaded', setup);
