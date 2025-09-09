/**
 * Category Integration Module
 * Ensures consistent category handling across the application
 */

class CategoryIntegration {
    constructor() {
        this.categoryMapping = {
            // Business profile categories -> Filter categories
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

        this.filterToBusinessMapping = {
            'restaurants': ['Restaurant', 'Cafe'],
            'salons': ['Salon'],
            'hotels': ['Hotel'],
            'transport': ['Transport'],
            'health': ['Spa', 'Gym', 'Health'],
            'events': ['Events'],
            'other': ['Other']
        };

        this.init();
    }

    init() {
        this.setupFilterButtons();
        this.setupCategoryCheckboxes();
    }

    setupFilterButtons() {
        // Wire up home page filter buttons to properly filter businesses
        const filterButtons = document.querySelectorAll('.filter-btn[data-category]');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const category = button.dataset.category;
                this.filterByCategory(category);
            });
        });
    }

    setupCategoryCheckboxes() {
        // Wire up explore page category checkboxes
        const checkboxes = document.querySelectorAll('.filter-sidebar input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.applyFilters();
            });
        });
    }

    filterByCategory(filterCategory) {
        // Get businesses from featured businesses instance
        let filteredBusinesses = [];
        if (window.featuredBusinessesInstance) {
            filteredBusinesses = window.featuredBusinessesInstance.getBusinessesByCategory(filterCategory);
        }

        // Navigate to explore page and show filtered results
        this.showFilteredResults(filteredBusinesses, filterCategory);
    }

    showFilteredResults(businesses, category) {
        // Navigate to explore page
        if (window.app && window.app.navigation) {
            window.app.navigation.navigateTo('explore');
        } else {
            // Fallback navigation
            const pages = document.querySelectorAll('.page');
            pages.forEach(page => page.classList.remove('active'));
            const explorePage = document.getElementById('explore-page');
            if (explorePage) explorePage.classList.add('active');
        }

        // Update filter checkboxes
        const categoryCheckboxes = document.querySelectorAll('.filter-sidebar input[type="checkbox"]');
        categoryCheckboxes.forEach(checkbox => {
            checkbox.checked = checkbox.value === category;
        });

        // Display results
        this.displayBusinessResults(businesses, category);
    }

    displayBusinessResults(businesses, category) {
        const serviceList = document.querySelector('.service-list');
        if (!serviceList) return;

        serviceList.innerHTML = '';

        if (businesses.length === 0) {
            serviceList.innerHTML = `
                <div class="empty-state">
                    <p>No businesses found in the ${category} category</p>
                    <p>Check back later as new businesses join ZippyBook!</p>
                </div>
            `;
        } else {
            businesses.forEach(business => {
                const businessCard = this.createBusinessServiceCard(business);
                serviceList.appendChild(businessCard);
            });
        }

        // Show notification
        this.showNotification(`Found ${businesses.length} ${category} businesses`, 'info');
    }

    createBusinessServiceCard(business) {
        const card = document.createElement('div');
        card.className = 'service-card business-service-card';
        card.innerHTML = `
            <div class="service-image">
                <img src="${business.featured_image_url}" alt="${business.name}" 
                     onerror="this.src='https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=200&fit=crop'">
                <div class="service-badge">${business.category}</div>
            </div>
            <div class="service-info">
                <h4 class="service-name">${business.name}</h4>
                <div class="service-rating">
                    <div class="stars">★★★★☆</div>
                    <span class="rating-count">(New)</span>
                </div>
                <p class="service-category">${business.category}</p>
                <p class="service-location">${business.address || 'Contact for address'}</p>
                <div class="service-price">
                    <span>Contact for pricing</span>
                </div>
                <div class="service-actions">
                    <button class="btn btn-primary" onclick="window.location.href='business-inventory-page.html?businessId=${business.id}'">View Shop</button>
                    ${business.phone ? `<a href="tel:${business.phone}" class="btn btn-outline">Call</a>` : ''}
                </div>
            </div>
        `;

        // Add click handler
        card.addEventListener('click', () => {
            this.showBusinessDetails(business);
        });

        return card;
    }

    showBusinessDetails(business) {
        // Show business detail modal (reuse from featured-businesses.js)
        if (window.featuredBusinessesInstance) {
            window.featuredBusinessesInstance.showBusinessModal(business);
        }
    }

    applyFilters() {
        const checkedCategories = Array.from(
            document.querySelectorAll('.filter-sidebar input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        if (checkedCategories.length === 0) {
            // Show all businesses
            this.showAllBusinesses();
        } else {
            // Filter by selected categories
            let allFilteredBusinesses = [];
            checkedCategories.forEach(category => {
                if (window.featuredBusinessesInstance) {
                    const categoryBusinesses = window.featuredBusinessesInstance.getBusinessesByCategory(category);
                    allFilteredBusinesses = [...allFilteredBusinesses, ...categoryBusinesses];
                }
            });

            // Remove duplicates
            const uniqueBusinesses = allFilteredBusinesses.filter((business, index, arr) => 
                arr.findIndex(b => b.id === business.id) === index
            );

            this.displayBusinessResults(uniqueBusinesses, checkedCategories.join(', '));
        }
    }

    showAllBusinesses() {
        if (window.featuredBusinessesInstance) {
            const allBusinesses = window.featuredBusinessesInstance.businesses;
            this.displayBusinessResults(allBusinesses, 'all categories');
        }
    }

    showNotification(message, type = 'info') {
        // Create a simple notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--primary-color);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Utility method to get display category from business category
    getDisplayCategory(businessCategory) {
        return this.categoryMapping[businessCategory] || 'other';
    }

    // Utility method to get business categories from filter category
    getBusinessCategories(filterCategory) {
        return this.filterToBusinessMapping[filterCategory] || [];
    }
}

// Initialize category integration when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.categoryIntegration = new CategoryIntegration();
});

export default CategoryIntegration;