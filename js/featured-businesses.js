// Featured Businesses Carousel Module
import { supabase } from './supabase.js';
import { getUserLatLng, haversineDistance, ensureCoordinatesForAll } from './location-utils.js';

class FeaturedBusinesses {
    constructor() {
        this.businesses = [];
        this.currentIndex = 0;
        this.autoRotateInterval = null;
        this.autoRotateDelay = 5000; // 5 seconds
        this.visibleCards = this.calculateVisibleCards();
        
        this.init();
    }

    // Category mapping utility to normalize categories
    static getCategoryMapping() {
        return {
            // Business profile categories -> Display categories
            'Restaurant': 'restaurants',
            'Cafe': 'restaurants',
            'Hotel': 'hotels',
            'Salon': 'salons',
            'Spa': 'health',
            'Gym': 'health',
            'Transport': 'transport',
            'Health': 'health',
            'Events': 'events',
            'Other': 'other'
        };
    }

    // Reverse mapping for filtering
    static getFilterToBusinessMapping() {
        return {
            'restaurants': ['Restaurant', 'Cafe'],
            'salons': ['Salon'],
            'hotels': ['Hotel'],
            'transport': ['Transport'],
            'health': ['Spa', 'Gym', 'Health'],
            'events': ['Events'],
            'other': ['Other']
        };
    }

    // Normalize business category for filtering
    normalizeCategory(businessCategory) {
        const mapping = FeaturedBusinesses.getCategoryMapping();
        return mapping[businessCategory] || 'other';
    }

    // Filter businesses by category
    filterByCategory(filterCategory) {
        const businessCategories = FeaturedBusinesses.getFilterToBusinessMapping()[filterCategory] || [];
        return this.businesses.filter(business => 
            businessCategories.includes(business.category)
        );
    }

    async init() {
        this.cacheElements();
        await this.loadBusinesses();
        this.setupEventListeners();
        this.renderCarousel();
        this.startAutoRotate();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.visibleCards = this.calculateVisibleCards();
            // Recreate indicators when visible card count changes
            this.createIndicators();
            this.updateCarousel();
        });
    }

    cacheElements() {
        this.carousel = document.querySelector('.featured-businesses-carousel');
        this.prevBtn = document.getElementById('prevFeaturedBtn');
        this.nextBtn = document.getElementById('nextFeaturedBtn');
        this.indicators = document.getElementById('featuredIndicators');
        this.container = document.querySelector('.featured-businesses-container');
    }

    calculateVisibleCards() {
        const width = window.innerWidth;
        if (width >= 1200) return 3;
        if (width >= 768) return 2;
        return 1;
    }

    async loadBusinesses() {
        try {
            // Try to load from Supabase first
            const { data, error } = await supabase
                .from('business_profiles')
                .select('*')
                .limit(10);

            if (error) throw error;

            if (data && data.length > 0) {
                this.businesses = data.map(business => this.formatBusinessData(business));
                // Try to fill coordinates for distance sorting
                try {
                    await ensureCoordinatesForAll(this.businesses);
                } catch (_) {}
            } else {
                // Fallback to mock data if no businesses in database
                this.loadMockBusinesses();
            }
        } catch (error) {
            console.warn('Could not load businesses from database, using mock data:', error);
            this.loadMockBusinesses();
        }
    }

    loadMockBusinesses() {
        this.businesses = [
            {
                id: 1,
                name: 'Bella Vista Restaurant',
                category: 'Restaurant',
                description: 'Authentic Italian cuisine with a modern twist. Our chefs use only the finest ingredients to create memorable dining experiences.',
                featured_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=200&fit=crop',
                logo_url: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=80&h=80&fit=crop&crop=faces',
                phone: '(555) 123-4567',
                email: 'info@bellavista.com',
                address: '123 Italian Way, Downtown',
                website: 'www.bellavista.com',
                hours: 'Mon-Thu: 11AM-10PM, Fri-Sat: 11AM-11PM, Sun: 12PM-9PM'
            },
            {
                id: 2,
                name: 'Urban Cuts Salon',
                category: 'Salon',
                description: 'Professional hair styling and beauty services in a luxurious, relaxing environment. Expert stylists with years of experience.',
                featured_image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=200&fit=crop',
                logo_url: 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=80&h=80&fit=crop&crop=faces',
                phone: '(555) 234-5678',
                email: 'book@urbancuts.com',
                address: '456 Style Street, Fashion District',
                website: 'www.urbancuts.com',
                hours: 'Tue-Fri: 9AM-7PM, Sat: 8AM-6PM, Sun-Mon: Closed'
            },
            {
                id: 3,
                name: 'Grand Plaza Hotel',
                category: 'Hotel',
                description: 'Luxury accommodations in the heart of the city. Five-star amenities, world-class service, and stunning city views.',
                featured_image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop',
                logo_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=80&h=80&fit=crop&crop=faces',
                phone: '(555) 345-6789',
                email: 'reservations@grandplaza.com',
                address: '789 Luxury Lane, City Center',
                website: 'www.grandplaza.com',
                hours: 'Open 24/7'
            },
            {
                id: 4,
                name: 'FitZone Gym',
                category: 'Gym',
                description: 'State-of-the-art fitness facility with personal trainers, group classes, and top-quality equipment for all fitness levels.',
                featured_image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=200&fit=crop',
                logo_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=80&h=80&fit=crop&crop=faces',
                phone: '(555) 456-7890',
                email: 'info@fitzone.com',
                address: '321 Fitness Ave, Health District',
                website: 'www.fitzone.com',
                hours: 'Mon-Fri: 5AM-11PM, Sat-Sun: 6AM-10PM'
            },
            {
                id: 5,
                name: 'Café Mocha',
                category: 'Cafe',
                description: 'Artisanal coffee and fresh pastries in a cozy atmosphere. Perfect for meetings, studying, or casual dining.',
                featured_image_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=200&fit=crop',
                logo_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=80&h=80&fit=crop&crop=faces',
                phone: '(555) 567-8901',
                email: 'hello@cafemocha.com',
                address: '654 Coffee Street, Arts Quarter',
                website: 'www.cafemocha.com',
                hours: 'Daily: 6AM-9PM'
            },
            {
                id: 6,
                name: 'Zen Spa Retreat',
                category: 'Spa',
                description: 'Tranquil spa experience with massage therapy, facial treatments, and wellness services to rejuvenate your mind and body.',
                featured_image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=200&fit=crop',
                logo_url: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=80&h=80&fit=crop&crop=faces',
                phone: '(555) 678-9012',
                email: 'relax@zenspa.com',
                address: '987 Wellness Way, Peaceful Valley',
                website: 'www.zenspa.com',
                hours: 'Daily: 9AM-8PM'
            }
        ];
    }

    formatBusinessData(business) {
        // Ensure consistent category formatting
        const category = business.category || 'Other';
        return {
            id: business.id,
            name: business.name || 'Business Name',
            category: category, // Keep the original business category
            displayCategory: this.normalizeCategory(category), // Add normalized category for filtering
            description: business.description || 'Professional services available.',
            featured_image_url: business.featured_image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop',
            logo_url: business.logo_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=faces',
            phone: business.phone || '',
            email: business.email || '',
            address: business.address || '',
            website: business.website || '',
            hours: business.hours || 'Contact for hours',
            // Optional coordinates from backend fields if they exist
            coordinates: business.coordinates || (typeof business.lat === 'number' && typeof business.lng === 'number' ? { lat: business.lat, lng: business.lng } : undefined)
        };
    }

    setupEventListeners() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => {
                this.stopAutoRotate();
                this.previousSlide();
                this.startAutoRotate();
            });
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                this.stopAutoRotate();
                this.nextSlide();
                this.startAutoRotate();
            });
        }

        // Pause auto-rotate on hover
        if (this.container) {
            this.container.addEventListener('mouseenter', () => this.stopAutoRotate());
            this.container.addEventListener('mouseleave', () => this.startAutoRotate());
        }
    }

    renderCarousel() {
        if (!this.carousel || !this.businesses.length) return;

        // Clear existing content
        this.carousel.innerHTML = '';
        
        // Optionally sort by distance if user location available
        const renderList = [...this.businesses];
        const userLoc = window.app?.userLocation;
        if (userLoc) {
            renderList.forEach(b => {
                if (b.coordinates) {
                    b.__distance = haversineDistance(userLoc.lat, userLoc.lng, b.coordinates.lat, b.coordinates.lng);
                } else {
                    b.__distance = null;
                }
            });
            renderList.sort((a, b) => {
                if (a.__distance == null && b.__distance == null) return 0;
                if (a.__distance == null) return 1;
                if (b.__distance == null) return -1;
                return a.__distance - b.__distance;
            });
        }

        // Create business cards
        renderList.forEach(business => {
            const card = this.createBusinessCard(business);
            this.carousel.appendChild(card);
        });

        // Create indicators
        this.createIndicators();
        
        // Initial positioning
        this.updateCarousel();
    }

    createBusinessCard(business) {
        const card = document.createElement('div');
        card.className = 'business-card';
        card.setAttribute('data-business-id', business.id);

        // Format hours for display
        const currentHours = this.getCurrentBusinessHours(business.hours);
        
        card.innerHTML = `
            <div class="business-header">
                <img src="${business.featured_image_url}" alt="${business.name} featured image" class="business-featured-image" 
                     onerror="this.src='https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop'">
            </div>
            <div class="business-info">
                <h4 class="business-name">${this.escapeHtml(business.name)}</h4>
                <span class="business-category">${this.escapeHtml(business.category)}</span>
                <p class="business-description">${this.escapeHtml(business.description)}</p>
                <div class="business-hours">
                    <i class="fas fa-clock"></i>
                    <span>${this.escapeHtml(currentHours)}</span>
                </div>
                <div class="business-contact">
                    ${business.phone ? `<a href="tel:${business.phone}" class="contact-item"><i class="fas fa-phone"></i>${business.phone}</a>` : ''}
                    ${business.email ? `<a href="mailto:${business.email}" class="contact-item"><i class="fas fa-envelope"></i>Email</a>` : ''}
                    ${business.website ? `<a href="${business.website.startsWith('http') ? business.website : 'https://' + business.website}" target="_blank" class="contact-item"><i class="fas fa-globe"></i>Website</a>` : ''}
                </div>
            </div>
        `;

        // Show distance if available
        if (typeof business.__distance === 'number') {
            const info = card.querySelector('.business-info');
            const p = document.createElement('p');
            p.className = 'business-distance';
            p.innerHTML = `<i class="fas fa-route"></i> ${business.__distance.toFixed(1)} km away`;
            info.appendChild(p);
        }

        // Add click handler for the card
        card.addEventListener('click', () => {
            this.openBusinessDetail(business);
        });

        return card;
    }

    getCurrentBusinessHours(hours) {
        if (!hours) return 'Contact for hours';
        
        // Simple parsing - in a real app, this would be more sophisticated
        const now = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = dayNames[now.getDay()];
        
        // Try to extract today's hours
        const todayMatch = hours.match(new RegExp(`${today.substring(0, 3)}[^,]*:\\s*([^,]+)`, 'i'));
        if (todayMatch) {
            return `Today: ${todayMatch[1].trim()}`;
        }
        
        // Fallback to first part of hours string
        const firstPart = hours.split(',')[0].trim();
        return firstPart.length > 30 ? firstPart.substring(0, 30) + '...' : firstPart;
    }

    createIndicators() {
        if (!this.indicators) return;

        this.indicators.innerHTML = '';
        const totalSlides = Math.max(1, this.businesses.length - this.visibleCards + 1);
        
        for (let i = 0; i < totalSlides; i++) {
            const indicator = document.createElement('div');
            indicator.className = 'indicator';
            if (i === 0) indicator.classList.add('active');
            
            indicator.addEventListener('click', () => {
                this.stopAutoRotate();
                this.goToSlide(i);
                this.startAutoRotate();
            });
            
            this.indicators.appendChild(indicator);
        }
    }

    updateCarousel() {
        if (!this.carousel) return;

        // Calculate step dynamically: card width + CSS gap
        const firstCard = this.carousel.querySelector('.business-card');
        let cardWidth = 320;
        if (firstCard) {
            cardWidth = firstCard.offsetWidth; // includes padding/border
        }
        const styles = window.getComputedStyle(this.carousel);
        // Prefer gap if supported, fallback to columnGap/rowGap or 0
        const gapPx = parseFloat(styles.gap || styles.columnGap || styles.rowGap || '0') || 0;
        const step = cardWidth + gapPx;

        // Clamp current index to max range in case of resize
        const maxIndex = Math.max(0, this.businesses.length - this.visibleCards);
        if (this.currentIndex > maxIndex) this.currentIndex = maxIndex;

        const translateX = -this.currentIndex * step;
        this.carousel.style.transform = `translateX(${translateX}px)`;

        // Update indicators
        if (this.indicators) {
            const activeIndicator = this.indicators.querySelector('.indicator.active');
            if (activeIndicator) activeIndicator.classList.remove('active');
            const newActiveIndicator = this.indicators.children[this.currentIndex];
            if (newActiveIndicator) newActiveIndicator.classList.add('active');
        }

        // Update navigation buttons
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
    const maxIndex = Math.max(0, this.businesses.length - this.visibleCards);
        
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentIndex <= 0;
        }
        
        if (this.nextBtn) {
            this.nextBtn.disabled = this.currentIndex >= maxIndex;
        }
    }

    nextSlide() {
        const maxIndex = Math.max(0, this.businesses.length - this.visibleCards);
        if (this.currentIndex < maxIndex) {
            this.currentIndex++;
        } else {
            this.currentIndex = 0; // Loop back to start
        }
        this.updateCarousel();
    }

    previousSlide() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            // Go to last slide
            this.currentIndex = Math.max(0, this.businesses.length - this.visibleCards);
        }
        this.updateCarousel();
    }

    goToSlide(index) {
        const maxIndex = Math.max(0, this.businesses.length - this.visibleCards);
        this.currentIndex = Math.max(0, Math.min(index, maxIndex));
        this.updateCarousel();
    }

    startAutoRotate() {
        if (this.businesses.length <= this.visibleCards) return; // Don't auto-rotate if all cards are visible
        
        this.stopAutoRotate();
        this.autoRotateInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoRotateDelay);
    }

    stopAutoRotate() {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
            this.autoRotateInterval = null;
        }
    }

    openBusinessDetail(business) {
        // Create a modal or navigate to business detail page
        this.showBusinessModal(business);
    }

    showBusinessModal(business) {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'modal business-detail-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <button class="modal-close">&times;</button>
                <div class="business-detail-header">
                    <img src="${business.featured_image_url}" alt="${business.name}" class="business-detail-featured">
                    <div class="business-detail-info">
                        <h2 class="business-detail-name">${this.escapeHtml(business.name)}</h2>
                        <span class="business-detail-category">${this.escapeHtml(business.category)}</span>
                    </div>
                </div>
                <div class="business-detail-body">
                    <p class="business-detail-description">${this.escapeHtml(business.description)}</p>
                    
                    <div class="business-detail-section">
                        <h3><i class="fas fa-clock"></i> Business Hours</h3>
                        <p>${this.escapeHtml(business.hours)}</p>
                    </div>
                    
                    ${business.address ? `
                        <div class="business-detail-section">
                            <h3><i class="fas fa-map-marker-alt"></i> Location</h3>
                            <p>${this.escapeHtml(business.address)}</p>
                        </div>
                    ` : ''}
                    
                    <div class="business-detail-section">
                        <h3><i class="fas fa-phone"></i> Contact Information</h3>
                        <div class="contact-links">
                            ${business.phone ? `<a href="tel:${business.phone}" class="contact-link"><i class="fas fa-phone"></i> ${business.phone}</a>` : ''}
                            ${business.email ? `<a href="mailto:${business.email}" class="contact-link"><i class="fas fa-envelope"></i> ${business.email}</a>` : ''}
                            ${business.website ? `<a href="${business.website.startsWith('http') ? business.website : 'https://' + business.website}" target="_blank" class="contact-link"><i class="fas fa-globe"></i> Visit Website</a>` : ''}
                        </div>
                    </div>
                    
                    <div class="business-detail-actions">
                        <button class="btn btn-primary" data-action="view-shop">View Shop</button>
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Save for Later</button>
                        <button class="btn btn-outline btn-cancel" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .business-detail-modal .modal-content {
                max-height: 90vh;
                overflow-y: auto;
            }
            .business-detail-header {
                position: relative;
                margin: -24px -24px 20px -24px;
            }
            .business-detail-featured {
                width: 100%;
                height: 200px;
                object-fit: cover;
            }
            .business-detail-info {
                position: absolute;
                bottom: -30px;
                left: 24px;
                display: flex;
                align-items: flex-end;
                gap: 16px;
            }
            .business-detail-name {
                margin: 0;
                color: white;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
            }
            .business-detail-category {
                background: rgba(255,255,255,0.9);
                color: var(--primary-color);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8rem;
                font-weight: 500;
            }
            .business-detail-body {
                padding-top: 40px;
            }
            .business-detail-section {
                margin-bottom: 24px;
            }
            .business-detail-section h3 {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                color: var(--primary-color);
            }
            .contact-links {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .contact-link {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                text-decoration: none;
                color: var(--text-medium);
                transition: color 0.2s;
            }
            .contact-link:hover {
                color: var(--primary-color);
            }
            .business-detail-actions {
                display: flex;
                gap: 12px;
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid var(--border-color);
                justify-content: space-between;
            }
            .business-detail-actions .btn {
                flex: 1;
                text-align: center;
            }
        `;
        document.head.appendChild(style);

        // Add close event listener and View Shop navigation
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                modal.remove();
                style.remove();
                return;
            }
            const btn = e.target.closest('button[data-action="view-shop"]');
            if (btn) {
                // Navigate to shop page with business id
                try { sessionStorage.setItem('zippybook.shop.business', JSON.stringify(business)); } catch (_) {}
                const base = window.location.pathname.replace(/[^/]*$/, 'shop.html');
                const url = `${base}?id=${encodeURIComponent(business.id)}`;
                window.location.href = url;
            }
        });

        // Show modal
        document.body.appendChild(modal);
        modal.classList.add('active');
        
        // Add modal-open class to body to prevent scrolling
        document.body.classList.add('modal-open');
        
        // Clean up on modal removal
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    for (let node of mutation.removedNodes) {
                        if (node === modal) {
                            document.body.classList.remove('modal-open');
                            observer.disconnect();
                        }
                    }
                }
            });
        });
        observer.observe(document.body, { childList: true });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public method to refresh businesses (useful for admin updates)
    async refresh() {
        await this.loadBusinesses();
        this.currentIndex = 0;
        this.renderCarousel();
    }

    // Public method to add a new business (useful for real-time updates)
    addBusiness(business) {
        this.businesses.unshift(this.formatBusinessData(business));
        this.renderCarousel();
    }

    // Get businesses by category for integration with search/filter
    getBusinessesByCategory(category) {
        return this.filterByCategory(category);
    }

    // Get all available categories from current businesses
    getAvailableCategories() {
        const categories = new Set();
        this.businesses.forEach(business => {
            categories.add(business.displayCategory);
        });
        return Array.from(categories);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the main page and the carousel exists
    if (document.querySelector('.featured-businesses-carousel')) {
        window.featuredBusinessesInstance = new FeaturedBusinesses();
    }
});

export default FeaturedBusinesses;