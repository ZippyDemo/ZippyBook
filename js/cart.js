// Global Cart Module: makes cart available on any page
// Reuses localStorage key 'zippyCart' used by shop.js

const CART_KEY = 'zippyCart';

// Internal state mirrors localStorage; on pages that already manage it (shop.js), we only render UI.
let cart = [];

function readCart() {
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { cart = []; }
  return cart;
}

function writeCart(next) {
  cart = Array.isArray(next) ? next : cart;
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {}
}

function getTotalItems() { return readCart().reduce((n, it) => n + Number(it.quantity || 0), 0); }
function getTotalPrice() { return readCart().reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 0), 0); }

function formatCurrency(n) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n || 0)); }
  catch { const v = Number(n || 0); return `$${v.toFixed ? v.toFixed(2) : v}`; }
}

function escapeHtml(str) {
  return (str ?? '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function ensureContainer() {
  // If the page already has a cart (shop.html), do nothing
  if (document.getElementById('cartSidebar') && document.getElementById('cartOverlay')) return false;

  // Add minimal toast container if missing (for consistency)
  if (!document.querySelector('.toast-container')) {
    const t = document.createElement('div'); t.className = 'toast-container'; t.setAttribute('aria-live','polite'); t.setAttribute('aria-atomic','true');
    document.body.appendChild(t);
  }

  // Always use a floating action button on non-shop pages
  const toggle = document.createElement('button');
  toggle.id = 'cartToggle';
  toggle.className = 'cart-toggle floating';
  toggle.innerHTML = '<i class="fas fa-shopping-cart"></i> <span id="cartCount" class="cart-count">0</span>';
  toggle.addEventListener('click', toggleCart);
  document.body.appendChild(toggle);

  // Sidebar + overlay
  const sidebar = document.createElement('div'); sidebar.id = 'cartSidebar'; sidebar.className = 'cart-sidebar';
  sidebar.innerHTML = `
    <div class="cart-header">
      <button id="cartBack" class="cart-back" aria-label="Back"><i class="fas fa-arrow-left"></i></button>
      <h3>Shopping Cart</h3>
      <button id="cartClose" class="cart-close" aria-label="Close"><i class="fas fa-xmark"></i></button>
    </div>
    <div id="cartItems" class="cart-items"></div>
    <div id="cartEmpty" class="cart-empty" style="display:none;">
      <i class="fas fa-shopping-cart"></i>
      <p>Your cart is empty</p>
    </div>
    <div id="cartFooter" class="cart-footer" style="display:none;">
      <div class="cart-total">Total: <span id="cartTotal">$0.00</span></div>
      <button id="checkoutBtn" class="checkout-btn"><i class="fas fa-credit-card"></i> Proceed to Checkout</button>
    </div>`;

  const overlay = document.createElement('div'); overlay.id = 'cartOverlay'; overlay.className = 'cart-overlay';
  document.body.appendChild(sidebar);
  document.body.appendChild(overlay);

  document.getElementById('cartBack')?.addEventListener('click', closeCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  overlay.addEventListener('click', closeCart);
  document.getElementById('checkoutBtn')?.addEventListener('click', proceedToCheckout);

  return true;
}

function updateCartUI() {
  // Keep cart in sync
  readCart();
  const cartCount = document.getElementById('cartCount');
  const cartItems = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartFooter = document.getElementById('cartFooter');
  const cartTotal = document.getElementById('cartTotal');

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  if (cartCount) cartCount.textContent = String(totalItems);
  if (cartTotal) cartTotal.textContent = formatCurrency(totalPrice);

  if (!cartItems || !cartEmpty || !cartFooter) return;

  if (cart.length === 0) {
    cartItems.style.display = 'none';
    cartEmpty.style.display = 'flex';
    cartFooter.style.display = 'none';
  } else {
    cartItems.style.display = 'block';
    cartEmpty.style.display = 'none';
    cartFooter.style.display = 'block';
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" />` : ''}</div>
        <div class="cart-item-details">
          <div class="cart-item-name">${escapeHtml(item.name || 'Item')}</div>
          <div class="cart-item-price">${formatCurrency(Number(item.price) * Number(item.quantity || 1))}</div>
          <div class="cart-item-controls">
            <button class="quantity-btn" data-action="dec" data-id="${item.id}">-</button>
            <span class="quantity-display">${Number(item.quantity || 1)}</span>
            <button class="quantity-btn" data-action="inc" data-id="${item.id}">+</button>
            <button class="remove-item" data-action="remove" data-id="${item.id}"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>`).join('');

    // Delegate controls
    cartItems.onclick = (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      const id = btn.getAttribute('data-id'); const action = btn.getAttribute('data-action');
      if (!id || !action) return;
      if (action === 'remove') removeFromCart(id);
      if (action === 'inc') changeQty(id, +1);
      if (action === 'dec') changeQty(id, -1);
    };
  }
}

function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
}
function openCart() { const s = document.getElementById('cartSidebar'); const o = document.getElementById('cartOverlay'); if (s) s.classList.add('open'); if (o) o.classList.add('show'); }
function closeCart() { const s = document.getElementById('cartSidebar'); const o = document.getElementById('cartOverlay'); if (s) s.classList.remove('open'); if (o) o.classList.remove('show'); }

function removeFromCart(itemId) {
  readCart();
  const next = cart.filter(it => String(it.id) !== String(itemId));
  writeCart(next);
  updateCartUI();
}
function changeQty(itemId, delta) {
  readCart();
  const next = cart.map(it => String(it.id) === String(itemId) ? { ...it, quantity: Math.max(0, Number(it.quantity || 0) + delta) } : it).filter(it => Number(it.quantity || 0) > 0);
  writeCart(next);
  updateCartUI();
}

function proceedToCheckout() {
  readCart();
  if (!cart.length) { alert('Your cart is empty!'); return; }
  // Prefer the dedicated shop checkout flow if available
  try { if (typeof window.proceedToCheckout === 'function' && window.__SHOP_PAGE__) { return window.proceedToCheckout(); } } catch {}

  // Navigate directly to checkout from any page
  try {
    const params = new URLSearchParams(window.location.search);
    const businessId = params.get('id');
    const url = businessId ? `checkout.html?id=${encodeURIComponent(businessId)}` : 'checkout.html';
    window.location.href = url;
  } catch (_) {
    // As a last resort, open checkout without query
    window.location.href = 'checkout.html';
  }
}

function observeExternalCartChanges() {
  // If another tab or page updates localStorage, refresh UI
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) updateCartUI();
  });
}

export function initGlobalCart() {
  // If a business user is logged in, do NOT render cart UI
  try {
    const role = (sessionStorage.getItem('zippybook.role') || localStorage.getItem('userRole') || '').toLowerCase();
    if (role === 'business') {
      // Still keep API exports without DOM
      window.openCart = () => {};
      window.closeCart = () => {};
      window.toggleCart = () => {};
      window.updateGlobalCartUI = () => {};
      return;
    }
  } catch (_) {}

  const created = ensureContainer();
  // Mark when we're not on shop page
  if (!document.querySelector('script[src$="/js/shop.js"]')) window.__SHOP_PAGE__ = false; else window.__SHOP_PAGE__ = true;
  readCart();
  updateCartUI();
  observeExternalCartChanges();
  // Expose a tiny API for other modules
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.toggleCart = toggleCart;
  window.updateGlobalCartUI = updateCartUI;
}

// Auto-init when loaded as a regular script
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGlobalCart);
  else initGlobalCart();
}
