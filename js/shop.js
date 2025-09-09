import { supabase, fetchBusinessProfileById, fetchInventoryByBusinessId, getInventoryFileUrl } from './supabase.js';

// Cart management
let cart = JSON.parse(localStorage.getItem('zippyCart') || '[]');

function saveCart() {
  localStorage.setItem('zippyCart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(item) {
  const existingItem = cart.find(cartItem => cartItem.id === item.id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item._display_image || '',
      quantity: 1,
      businessId: getQueryParam('id')
    });
  }
  
  saveCart();
  showCartAnimation();
  // Toast notify
  showToast('Item added to cart', '', 'success');
}

function removeFromCart(itemId) {
  cart = cart.filter(item => item.id !== itemId);
  saveCart();
}

function updateQuantity(itemId, change) {
  const item = cart.find(cartItem => cartItem.id === itemId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(itemId);
    } else {
      saveCart();
    }
  }
}

function getTotalPrice() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function getTotalItems() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const cartItems = document.getElementById('cartItems');
  const cartEmpty = document.getElementById('cartEmpty');
  const cartFooter = document.getElementById('cartFooter');
  const cartTotal = document.getElementById('cartTotal');
  
  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  
  if (cartCount) cartCount.textContent = totalItems;
  if (cartTotal) cartTotal.textContent = formatCurrency(totalPrice);
  
  if (cart.length === 0) {
    if (cartItems) cartItems.style.display = 'none';
    if (cartEmpty) cartEmpty.style.display = 'flex';
    if (cartFooter) cartFooter.style.display = 'none';
  } else {
    if (cartItems) cartItems.style.display = 'block';
    if (cartEmpty) cartEmpty.style.display = 'none';
    if (cartFooter) cartFooter.style.display = 'block';
    
    if (cartItems) {
      cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
          <div class="cart-item-image">
            ${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" />` : ''}
          </div>
          <div class="cart-item-details">
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            <div class="cart-item-price">${formatCurrency(item.price)}</div>
            <div class="cart-item-controls">
              <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
              <span class="quantity-display">${item.quantity}</span>
              <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
              <button class="remove-item" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
}

function showCartAnimation() {
  const cartToggle = document.getElementById('cartToggle');
  if (cartToggle) {
    cartToggle.style.transform = 'scale(1.1)';
    setTimeout(() => {
      cartToggle.style.transform = 'scale(1)';
    }, 200);
  }
}

function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('show');
}

function closeCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

function proceedToCheckout() {
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  
  // For now, show an alert with order summary
  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();
  
  let orderSummary = `Order Summary:\n\n`;
  cart.forEach(item => {
    orderSummary += `${item.name} x${item.quantity} - ${formatCurrency(item.price * item.quantity)}\n`;
  });
  orderSummary += `\nTotal: ${formatCurrency(totalPrice)} (${totalItems} items)`;
  
  alert(orderSummary + '\n\nCheckout functionality will be implemented soon!');
}

// Simple toast helper for this page (matches styles.css .toast*)
function showToast(title = '', message = '', type = 'info', timeout = 3000) {
  try {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}</div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
        ${message ? `<p class="toast-message">${escapeHtml(message)}</p>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;
    container.appendChild(toast);
    const close = () => {
      toast.style.animation = 'slideOut var(--transition-normal) forwards';
      setTimeout(() => toast.remove(), 300);
    };
    toast.querySelector('.toast-close')?.addEventListener('click', close);
    if (timeout > 0) setTimeout(close, timeout);
  } catch (_) {}
}

// Make functions global for onclick handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.toggleCart = toggleCart;
window.closeCart = closeCart;
window.proceedToCheckout = proceedToCheckout;

function getQueryParam(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

function setText(id, value, fallback = '') {
  const el = document.getElementById(id);
  if (!el) return;
  if (value) {
    el.textContent = value;
    el.style.display = '';
  } else {
    el.textContent = fallback;
  }
}

function setImage(id, src, alt, placeholder = '') {
  const el = document.getElementById(id);
  if (!el) return;
  if (src) {
    el.src = src;
    el.alt = alt || '';
    el.style.display = '';
  } else {
    if (placeholder) el.src = placeholder;
    else el.style.display = 'none';
  }
}

function formatCurrency(n) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(n || 0));
  } catch (_) {
    const v = Number(n || 0);
    return `$${v.toFixed ? v.toFixed(2) : v}`;
  }
}

async function resolveItemDisplay(item) {
  const resolved = { ...item };
  // Resolve main image URL if needed
  if (resolved.image_url && !/^https?:\/\//i.test(resolved.image_url)) {
    try {
      const url = await getInventoryFileUrl(resolved.image_url);
      if (url) resolved._display_image = url;
    } catch (_) {}
  } else if (resolved.image_url) {
    resolved._display_image = resolved.image_url;
  }
  // Normalize older columns
  if (!resolved._display_image && resolved.imageUrl) resolved._display_image = resolved.imageUrl;
  if (!resolved._display_image && resolved.imagePath) {
    try { resolved._display_image = await getInventoryFileUrl(resolved.imagePath); } catch (_) {}
  }
  // Resolve additional images to displayable URLs if they are storage paths
  if (Array.isArray(resolved.additional_image_urls)) {
    resolved._display_additional = await Promise.all(resolved.additional_image_urls.map(async (p) => {
      if (p && !/^https?:\/\//i.test(p)) {
        try { return await getInventoryFileUrl(p) || p; } catch (_) { return p; }
      }
      return p;
    }));
  }
  return resolved;
}

function createItemCard(item, businessCategory = 'Other') {
  const priceLabel = (businessCategory === 'Hotel' || businessCategory === 'Salon' || businessCategory === 'Gym') ? 'Rate' : 'Price';
  const stockLabel = (businessCategory === 'Hotel' || businessCategory === 'Salon' || businessCategory === 'Gym') ? 'Capacity' : 'Stock';
  const img = item._display_image || '';
  const hasImg = !!img;
  const isAvailable = item.flags?.isAvailable !== false && (item.stock || 0) > 0;

  const card = document.createElement('div');
  card.className = 'shop-card';
  card.innerHTML = `
    <div class="image-wrap">${hasImg ? `
      <img src="${img}" alt="${escapeHtml(item.name || 'Item')}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <div class="no-image" style="display:none">No Image</div>
    ` : `
      <div class="no-image">No Image</div>
    `}
    </div>
    <div class="body">
      <h3 class="title">${escapeHtml(item.name || 'Item')}</h3>
      <div class="price">${priceLabel}: ${formatCurrency(item.price)}</div>
      ${item.description ? `<div class="desc">${escapeHtml(String(item.description)).slice(0, 120)}${String(item.description).length > 120 ? '…' : ''}</div>` : ''}
      <div class="meta">
        ${item.category ? `<span class="badge" style="background:#eef2ff;color:#3730a3;padding:4px 10px;border-radius:20px;font-size:0.8rem;">${escapeHtml(item.category)}</span>` : ''}
        <span class="badge" style="background:#ecfeff;color:#155e75;padding:4px 10px;border-radius:20px;font-size:0.8rem;">${stockLabel}: ${Number(item.stock || 0)}</span>
        ${item.flags?.isVeg ? '<span class="badge" style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:20px;font-size:0.8rem;">Veg</span>' : ''}
        ${item.flags?.requiresStaff ? '<span class="badge" style="background:#fef9c3;color:#713f12;padding:4px 10px;border-radius:20px;font-size:0.8rem;">Staff</span>' : ''}
        ${item.flags?.isAvailable === false ? '<span class="badge" style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:20px;font-size:0.8rem;">Unavailable</span>' : ''}
      </div>
      <div class="actions">
        <button class="add-to-cart-btn" onclick="addToCart(${JSON.stringify(item).replace(/"/g, '&quot;')})" ${!isAvailable ? 'disabled' : ''}>
          <i class="fas fa-shopping-cart"></i>
          ${isAvailable ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  `;
  return card;
}

function escapeHtml(str) {
  return (str ?? '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function loadShop() {
  const id = getQueryParam('id');
  if (!id) {
    const emptyState = document.getElementById('emptyState');
    const inventoryGrid = document.getElementById('inventoryGrid');
    if (emptyState) emptyState.style.display = '';
    if (inventoryGrid) inventoryGrid.style.display = 'none';
    setText('shopName', 'Shop');
    return;
  }

  // Load profile
  let profile = null;
  try {
    profile = await fetchBusinessProfileById(id);
  } catch (e) {
    console.warn('Failed to fetch business profile:', e?.message || e);
  }
  // Fallback to session saved business (from modal) if available
  if (!profile) {
    try {
      const raw = sessionStorage.getItem('zippybook.shop.business');
      if (raw) {
        const b = JSON.parse(raw);
        if (b && b.id == id) {
          profile = {
            id: b.id,
            name: b.name,
            category: b.category,
            description: b.description,
            featured_image_url: b.featured_image_url,
            logo_url: b.logo_url,
            phone: b.phone,
            email: b.email,
            address: b.address,
            website: b.website,
            hours: b.hours
          };
        }
      }
    } catch (_) {}
  }
  const category = profile?.category || 'Other';

  setText('shopName', profile?.name || 'Shop');
  setText('shopCategory', profile?.category || '');
  setText('shopAddress', profile?.address || '');
  setText('shopDescription', profile?.description || '');

  const featured = profile?.featured_image_url || '';
  const logo = profile?.logo_url || '';
  setImage('shopFeatured', featured, profile?.name || '');
  setImage('shopLogo', logo || 'images/default-avatar.svg', profile?.name || '');

  const call = document.getElementById('shopCall');
  if (call) {
    if (profile?.phone) { call.href = `tel:${profile.phone}`; call.style.display = ''; } else { call.style.display = 'none'; }
  }
  const email = document.getElementById('shopEmail');
  if (email) {
    if (profile?.email) { email.href = `mailto:${profile.email}`; email.style.display = ''; } else { email.style.display = 'none'; }
  }
  const website = document.getElementById('shopWebsite');
  if (website) {
    if (profile?.website) {
      const url = profile.website.startsWith('http') ? profile.website : `https://${profile.website}`;
      website.href = url; website.style.display = '';
    } else { website.style.display = 'none'; }
  }

  // Load inventory
  let items = [];
  try {
    const rows = await fetchInventoryByBusinessId(id);
    items = Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.warn('Failed to fetch inventory:', e?.message || e);
  }

  // If empty and this is the current user's shop being viewed locally, optionally try localStorage mirror
  if ((!items || items.length === 0) && typeof localStorage !== 'undefined') {
    try {
      const lsKey = `zippybook:${id}:inventory`;
      const raw = localStorage.getItem(lsKey);
      const localItems = raw ? JSON.parse(raw) : [];
      if (Array.isArray(localItems) && localItems.length > 0) items = localItems;
    } catch (_) {}
  }

  // Resolve images
  const resolved = await Promise.all((items || []).map(resolveItemDisplay));

  const grid = document.getElementById('inventoryGrid');
  const empty = document.getElementById('emptyState');
  if (!resolved || resolved.length === 0) {
    if (grid) {
      grid.innerHTML = '';
      grid.style.display = 'none';
    }
    if (empty) empty.style.display = '';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (grid) {
    grid.style.display = 'grid';
    grid.innerHTML = '';
    resolved.forEach(item => grid.appendChild(createItemCard(item, category)));
  }

  // Search filter
  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.toLowerCase().trim();
      const filtered = resolved.filter(r => [r.name, r.category, r.description].filter(Boolean).some(v => String(v).toLowerCase().includes(q)));
      if (grid) {
        grid.innerHTML = '';
        if (filtered.length === 0) {
          if (empty) empty.style.display = '';
          grid.style.display = 'none';
        } else {
          if (empty) empty.style.display = 'none';
          grid.style.display = 'grid';
          filtered.forEach(item => grid.appendChild(createItemCard(item, category)));
        }
      }
    });
  }
}

function setupCartEventListeners() {
  // Cart toggle
  const cartToggle = document.getElementById('cartToggle');
  const cartClose = document.getElementById('cartClose');
  const cartOverlay = document.getElementById('cartOverlay');
  const checkoutBtn = document.getElementById('checkoutBtn');

  if (cartToggle) {
    cartToggle.addEventListener('click', toggleCart);
  }

  if (cartClose) {
    cartClose.addEventListener('click', closeCart);
  }

  if (cartOverlay) {
    cartOverlay.addEventListener('click', closeCart);
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', proceedToCheckout);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadShop();
  updateCartUI();
  setupCartEventListeners();
});