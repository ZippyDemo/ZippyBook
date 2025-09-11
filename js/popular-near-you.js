// Popular Near You horizontal slider showing closest businesses (limit 10)
import { getUserLatLng, haversineDistance, ensureCoordinatesForAll } from './location-utils.js';

class PopularNearYou {
  constructor() {
    this.allItems = []; // mix of businesses and services (optional)
    this.items = []; // top 5 closest businesses/services to render
    this.currentIndex = 0;
    this.visibleCards = this.calculateVisibleCards();
    this.autoRotate = null;
    this.delay = 5000;
    this.cacheEls();
    this.init();
  }

  cacheEls() {
    this.carousel = document.querySelector('.popular-businesses-carousel');
    this.prevBtn = document.getElementById('prevPopularBtn');
    this.nextBtn = document.getElementById('nextPopularBtn');
    this.indicators = document.getElementById('popularIndicators');
    this.container = document.querySelector('.popular-businesses-container');
  }

  calculateVisibleCards() {
    const w = window.innerWidth;
    if (w >= 1200) return 3;
    if (w >= 768) return 2;
    return 1;
  }

  async init() {
    if (!this.carousel) return;
    await this.refreshData();
    this.render();
    this.wire();
    // In case featured businesses load after we initialize, retry a couple of times
    setTimeout(() => this.refreshAndRenderIfDataArrived(), 1500);
    setTimeout(() => this.refreshAndRenderIfDataArrived(), 3500);
    window.addEventListener('resize', () => {
      this.visibleCards = this.calculateVisibleCards();
      this.createIndicators();
      this.update();
    });
    // update on user location changes from index inline script
    window.addEventListener('user-location-changed', async () => {
      await this.refreshData();
      this.currentIndex = 0;
      this.render();
    });
  }

  async refreshAndRenderIfDataArrived() {
    const prevCount = this.items?.length || 0;
    await this.refreshData();
    if ((this.items?.length || 0) !== prevCount) {
      this.currentIndex = 0;
      this.render();
    }
  }

  async refreshData() {
    // Compose items from FeaturedBusinesses instance primarily
    let businesses = [];
    if (window.featuredBusinessesInstance) {
      businesses = window.featuredBusinessesInstance.businesses || [];
    }
    // Optionally include app.services if desired; for now prioritize businesses only
    this.allItems = [...businesses];

    // Ensure we have coordinates
    try { await ensureCoordinatesForAll(this.allItems); } catch (_) {}
    const user = await getUserLatLng();

    const withDistance = this.allItems.map(b => {
      const coords = b.coordinates;
      const d = (user && coords) ? haversineDistance(user.lat, user.lng, coords.lat, coords.lng) : null;
      return { ...b, __distance: d };
    }).sort((a, b) => {
      if (a.__distance == null && b.__distance == null) return 0;
      if (a.__distance == null) return 1;
      if (b.__distance == null) return -1;
      return a.__distance - b.__distance;
    });

    // Limit to 10 items
    this.items = withDistance.slice(0, 10);
  }

  wire() {
    this.prevBtn?.addEventListener('click', () => {
      this.prev();
    });
    this.nextBtn?.addEventListener('click', () => {
      this.next();
    });
    // Pause on hover
    if (this.container) {
      this.container.addEventListener('mouseenter', () => this.stop());
      this.container.addEventListener('mouseleave', () => this.start());
    }

    // Touch swipe support for mobile/tablet
    const target = this.container || this.carousel;
    if (target) {
      let startX = 0, startY = 0, dx = 0, dy = 0, isSwiping = false;
      const threshold = 40; // min px to trigger swipe
      const onStart = (x, y) => {
        startX = x; startY = y; dx = 0; dy = 0; isSwiping = false; this.stop();
      };
      const onMove = (x, y) => {
        dx = x - startX; dy = y - startY;
        if (!isSwiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
          isSwiping = true;
        }
      };
      const onEnd = () => {
        if (isSwiping && Math.abs(dx) > threshold) {
          if (dx < 0) this.next(); else this.prev();
        }
        this.start();
      };
      // Touch events
      target.addEventListener('touchstart', (e) => {
        const t = e.changedTouches && e.changedTouches[0];
        if (!t) return; onStart(t.clientX, t.clientY);
      }, { passive: true });
      target.addEventListener('touchmove', (e) => {
        const t = e.changedTouches && e.changedTouches[0];
        if (!t) return; onMove(t.clientX, t.clientY);
      }, { passive: true });
      target.addEventListener('touchend', () => onEnd(), { passive: true });
      target.addEventListener('touchcancel', () => onEnd(), { passive: true });
    }
  }

  render() {
    if (!this.carousel) return;
    this.carousel.innerHTML = '';
    this.items.forEach(item => {
      const card = this.createCard(item);
      this.carousel.appendChild(card);
    });
    this.createIndicators();
    this.update();
    this.start();

    // Notify listeners (e.g., map layer) that the popular items changed
    try {
      const evt = new CustomEvent('popular-near-you:items', { detail: { items: this.items } });
      window.dispatchEvent(evt);
    } catch (_) {}
  }

  createCard(item) {
    // Reuse the business-card UI from Featured
    const card = document.createElement('div');
    card.className = 'business-card';
    card.setAttribute('data-id', item.id);
    const name = this.escape(item.name || 'Business');
    const cat = this.escape(item.category || item.displayCategory || 'Other');
    const desc = this.escape(item.description || '');
    const img = item.featured_image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop';

    card.innerHTML = `
      <div class="business-header">
        <img class="business-featured-image" src="${img}" alt="${name}" onerror="this.src='https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop'" />
      </div>
      <div class="business-info">
        <h4 class="business-name">${name}</h4>
        <span class="business-category">${cat}</span>
        ${desc ? `<p class="business-description">${desc}</p>` : ''}
        ${typeof item.__distance === 'number' ? `<p class="business-distance"><i class='fas fa-route'></i> ${item.__distance.toFixed(1)} km away</p>` : ''}
      </div>
    `;

    card.addEventListener('click', () => {
      if (window.featuredBusinessesInstance) {
        window.featuredBusinessesInstance.showBusinessModal(item);
      }
    });
    return card;
  }

  createIndicators() {
    if (!this.indicators) return;
    this.indicators.innerHTML = '';
    const total = Math.max(1, this.items.length - this.visibleCards + 1);
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('div');
      dot.className = 'indicator' + (i === this.currentIndex ? ' active' : '');
      dot.addEventListener('click', () => {
        this.currentIndex = i;
        this.update();
      });
      this.indicators.appendChild(dot);
    }
  }

  update() {
    if (!this.carousel) return;
    const firstCard = this.carousel.querySelector('.business-card');
    let cardWidth = 320;
    if (firstCard) cardWidth = firstCard.offsetWidth;
    const styles = window.getComputedStyle(this.carousel);
    const gapPx = parseFloat(styles.gap || styles.columnGap || styles.rowGap || '0') || 0;
    const step = cardWidth + gapPx;
    const maxIndex = Math.max(0, this.items.length - this.visibleCards);
    if (this.currentIndex > maxIndex) this.currentIndex = maxIndex;
    this.carousel.style.transform = `translateX(${-this.currentIndex * step}px)`;

    // Buttons
    if (this.prevBtn) this.prevBtn.disabled = this.currentIndex <= 0;
    if (this.nextBtn) this.nextBtn.disabled = this.currentIndex >= maxIndex;

    // Indicators
    if (this.indicators) {
      Array.from(this.indicators.children).forEach((c, idx) => {
        c.classList.toggle('active', idx === this.currentIndex);
      });
    }
  }

  next() {
    const maxIndex = Math.max(0, this.items.length - this.visibleCards);
    if (this.currentIndex < maxIndex) this.currentIndex++;
    else this.currentIndex = 0;
    this.update();
  }

  prev() {
    const maxIndex = Math.max(0, this.items.length - this.visibleCards);
    if (this.currentIndex > 0) this.currentIndex--;
    else this.currentIndex = maxIndex;
    this.update();
  }

  start() {
    this.stop();
    if (this.items.length <= this.visibleCards) return;
    this.autoRotate = setInterval(() => this.next(), this.delay);
  }

  stop() {
    if (this.autoRotate) {
      clearInterval(this.autoRotate);
      this.autoRotate = null;
    }
  }

  escape(t) { const d = document.createElement('div'); d.textContent = t || ''; return d.innerHTML; }
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only init if the section exists
  if (document.querySelector('.popular-businesses-carousel')) {
    window.popularNearYou = new PopularNearYou();
  }
});

export default PopularNearYou;
