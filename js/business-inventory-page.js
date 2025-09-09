// Business Inventory Page Module
import { supabase, getInventoryFileUrl } from './supabase.js';

class BusinessInventoryPage {
    constructor() {
        this.businessId = null;
        this.businessData = null;
        this.inventory = [];
        this.filteredInventory = [];
        this.cart = [];
        this.currentView = 'grid';
        this.currentFilter = 'all';
        this.searchTerm = '';
        
        this.init();
    }

    async init() {
        // Get business ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.businessId = urlParams.get('businessId') || '1'; // Default to 1 for demo
        
        // Cache DOM elements
        this.cacheElements();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load business data and inventory
        await this.loadBusinessData();
        await this.loadInventory();
        
        // Initialize display
        this.updateDisplay();
    }

    cacheElements() {
        // Business info elements
        this.businessCoverImage = document.getElementById('businessCoverImage');
        this.businessLogoImage = document.getElementById('businessLogoImage');
        this.businessName = document.getElementById('businessName');
        this.businessCategory = document.getElementById('businessCategory');
        this.businessRating = document.getElementById('businessRating');
        this.ratingCount = document.getElementById('ratingCount');
        this.businessDescription = document.getElementById('businessDescription');
        this.businessAddress = document.getElementById('businessAddress');
        this.businessHours = document.getElementById('businessHours');
        this.businessPhone = document.getElementById('businessPhone');

        // Inventory elements
        this.inventoryGrid = document.getElementById('inventoryGrid');
        this.inventorySearch = document.getElementById('inventorySearch');
        this.categoryFilterBtn = document.getElementById('categoryFilterBtn');
        this.categoryFilterMenu = document.getElementById('categoryFilterMenu');
        this.emptyState = document.getElementById('emptyState');
        this.loadingState = document.getElementById('loadingState');

        // View toggle
        this.viewButtons = document.querySelectorAll('.view-btn');

        // Modal elements
        this.itemDetailModal = document.getElementById('itemDetailModal');
        this.closeItemModal = document.getElementById('closeItemModal');
        this.modalItemImage = document.getElementById('modalItemImage');
        this.modalItemName = document.getElementById('modalItemName');
        this.modalItemCategory = document.getElementById('modalItemCategory');
        this.modalItemPrice = document.getElementById('modalItemPrice');
        this.modalItemDescription = document.getElementById('modalItemDescription');
        this.modalItemAvailability = document.getElementById('modalItemAvailability');
        this.modalItemBadge = document.getElementById('modalItemBadge');

        // Quantity and cart elements
        this.qtyInput = document.getElementById('qtyInput');
        this.qtyMinus = document.getElementById('qtyMinus');
        this.qtyPlus = document.getElementById('qtyPlus');
        this.addToCartBtn = document.getElementById('addToCartBtn');

        // Cart elements
        this.floatingCart = document.getElementById('floatingCart');
        this.cartCount = document.getElementById('cartCount');
        this.viewCartBtn = document.getElementById('viewCartBtn');
        this.cartModal = document.getElementById('cartModal');
        this.closeCartModal = document.getElementById('closeCartModal');
        this.cartItems = document.getElementById('cartItems');
        this.cartSubtotal = document.getElementById('cartSubtotal');
        this.cartTax = document.getElementById('cartTax');
        this.cartTotal = document.getElementById('cartTotal');
        this.clearCartBtn = document.getElementById('clearCartBtn');
        this.continueShoppingBtn = document.getElementById('continueShoppingBtn');
        this.proceedToCheckoutBtn = document.getElementById('proceedToCheckoutBtn');

        // Toast container
        this.toastContainer = document.getElementById('toastContainer');
    }

    setupEventListeners() {
        // Search functionality
        this.inventorySearch.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.filterInventory();
        });

        // Category filter
        this.categoryFilterBtn.addEventListener('click', () => {
            this.categoryFilterBtn.parentElement.classList.toggle('active');
        });

        // Close filter dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-dropdown')) {
                document.querySelector('.filter-dropdown').classList.remove('active');
            }
        });

        // View toggle
        this.viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentView = btn.dataset.view;
                this.updateViewButtons();
                this.updateInventoryDisplay();
            });
        });

        // Modal close
        this.closeItemModal.addEventListener('click', () => this.closeModal());
        this.closeCartModal.addEventListener('click', () => this.closeCartModal());

        // Quantity controls
        this.qtyMinus.addEventListener('click', () => this.updateQuantity(-1));
        this.qtyPlus.addEventListener('click', () => this.updateQuantity(1));
        this.qtyInput.addEventListener('change', () => this.validateQuantity());

        // Cart functionality
        this.addToCartBtn.addEventListener('click', () => this.addCurrentItemToCart());
        this.viewCartBtn.addEventListener('click', () => this.showCartModal());
        this.clearCartBtn.addEventListener('click', () => this.clearCart());
        this.continueShoppingBtn.addEventListener('click', () => this.closeCartModal());
        this.proceedToCheckoutBtn.addEventListener('click', () => this.proceedToCheckout());

        // Close modals on backdrop click
        this.itemDetailModal.addEventListener('click', (e) => {
            if (e.target === this.itemDetailModal) this.closeModal();
        });
        this.cartModal.addEventListener('click', (e) => {
            if (e.target === this.cartModal) this.closeCartModal();
        });

        // Share button
        document.getElementById('shareBusinessBtn')?.addEventListener('click', () => this.shareBusinessPage());
    }

    async loadBusinessData() {
        try {
            // Try to load from Supabase first
            const { data, error } = await supabase
                .from('business_profiles')
                .select('*')
                .eq('id', this.businessId)
                .single();

            if (error) throw error;

            if (data) {
                this.businessData = data;
            } else {
                // Fallback to mock data
                this.loadMockBusinessData();
            }
        } catch (error) {
            console.warn('Could not load business data from database, using mock data:', error);
            this.loadMockBusinessData();
        }

        this.updateBusinessInfo();
    }

    loadMockBusinessData() {
        // Mock data based on business ID
        const mockBusinesses = {
            '1': {
                id: 1,
                name: 'Bella Vista Restaurant',
                category: 'Restaurant',
                description: 'Authentic Italian cuisine with a modern twist. Our chefs use only the finest ingredients to create memorable dining experiences that transport you straight to the heart of Italy.',
                featured_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=300&fit=crop',
                logo_url: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=120&h=120&fit=crop&crop=faces',
                phone: '(555) 123-4567',
                email: 'info@bellavista.com',
                address: '123 Italian Way, Downtown',
                website: 'www.bellavista.com',
                hours: 'Mon-Thu: 11AM-10PM, Fri-Sat: 11AM-11PM, Sun: 12PM-9PM',
                rating: 4.8,
                review_count: 234
            },
            '2': {
                id: 2,
                name: 'Urban Cuts Salon',
                category: 'Salon',
                description: 'Professional hair styling and beauty services in a luxurious, relaxing environment. Our expert stylists stay current with the latest trends and techniques.',
                featured_image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=300&fit=crop',
                logo_url: 'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=120&h=120&fit=crop&crop=faces',
                phone: '(555) 234-5678',
                email: 'book@urbancuts.com',
                address: '456 Style Street, Fashion District',
                website: 'www.urbancuts.com',
                hours: 'Tue-Fri: 9AM-7PM, Sat: 8AM-6PM, Sun-Mon: Closed',
                rating: 4.6,
                review_count: 156
            }
        };

        this.businessData = mockBusinesses[this.businessId] || mockBusinesses['1'];
    }

    updateBusinessInfo() {
        if (!this.businessData) return;

        // Update business info
        this.businessCoverImage.src = this.businessData.featured_image_url;
        this.businessCoverImage.alt = this.businessData.name;
        this.businessLogoImage.src = this.businessData.logo_url;
        this.businessLogoImage.alt = `${this.businessData.name} Logo`;
        this.businessName.textContent = this.businessData.name;
        this.businessCategory.textContent = this.businessData.category;
        this.businessDescription.textContent = this.businessData.description;
        
        // Update rating
        const rating = this.businessData.rating || 4.5;
        this.businessRating.innerHTML = this.generateStars(rating);
        this.ratingCount.textContent = `(${this.businessData.review_count || 0} reviews)`;

        // Update contact info
        if (this.businessData.address) {
            this.businessAddress.innerHTML = `<i class="fas fa-map-marker-alt"></i><span>${this.businessData.address}</span>`;
        }
        if (this.businessData.hours) {
            this.businessHours.innerHTML = `<i class="fas fa-clock"></i><span>${this.businessData.hours}</span>`;
        }
        if (this.businessData.phone) {
            this.businessPhone.innerHTML = `<i class="fas fa-phone"></i><span>${this.businessData.phone}</span>`;
        }

        // Update page title
        document.title = `${this.businessData.name} - ZippyBook`;
    }

    async loadInventory() {
        this.showLoading(true);
        
        try {
            // Try to load from Supabase first
            const { data, error } = await supabase
                .from('business_inventory')
                .select('*')
                .eq('business_id', this.businessId);

            if (error) throw error;

            if (data && data.length > 0) {
                // Normalize database format to customer page format
                this.inventory = await Promise.all(data.map(item => this.normalizeInventoryItem(item)));
            } else {
                // Fallback to mock data
                this.loadMockInventory();
            }
        } catch (error) {
            console.warn('Could not load inventory from database, using mock data:', error);
            this.loadMockInventory();
        }

        this.filteredInventory = [...this.inventory];
        this.generateCategoryFilter();
        this.showLoading(false);
    }

    async normalizeInventoryItem(dbItem) {
        // Convert database format to customer page format
        const normalized = {
            id: dbItem.id,
            name: dbItem.name || '',
            category: dbItem.category || 'Other',
            description: dbItem.description || '',
            price: Number(dbItem.price || 0),
            image_url: dbItem.image_url || dbItem.image_path || '',
            availability_status: this.getAvailabilityStatus(dbItem),
            stock_quantity: Number(dbItem.stock || 0),
            business_id: dbItem.business_id
        };

        // Resolve image URL if it's a file path
        try {
            if (normalized.image_url && !normalized.image_url.startsWith('http')) {
                const resolvedUrl = await getInventoryFileUrl(normalized.image_url);
                if (resolvedUrl) {
                    normalized.image_url = resolvedUrl;
                }
            }
        } catch (error) {
            console.warn(`Failed to resolve image URL for item ${normalized.name}:`, error);
        }

        return normalized;
    }

    getAvailabilityStatus(dbItem) {
        // Determine availability status from database flags or stock
        if (dbItem.flags && typeof dbItem.flags.isAvailable === 'boolean') {
            if (!dbItem.flags.isAvailable) return 'out-of-stock';
        }
        
        const stock = Number(dbItem.stock || 0);
        if (stock === 0) return 'out-of-stock';
        if (stock <= 5) return 'low-stock';
        return 'available';
    }

    loadMockInventory() {
        // Mock inventory data based on business type
        if (this.businessData.category === 'Restaurant') {
            this.inventory = [
                {
                    id: 1,
                    name: 'Margherita Pizza',
                    category: 'Main Course',
                    description: 'Classic Italian pizza with fresh mozzarella, tomato sauce, and basil leaves',
                    price: 18.99,
                    image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop',
                    availability_status: 'available',
                    stock_quantity: 50
                },
                {
                    id: 2,
                    name: 'Caesar Salad',
                    category: 'Appetizer',
                    description: 'Fresh romaine lettuce with parmesan, croutons, and our signature caesar dressing',
                    price: 12.99,
                    image_url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=400&h=300&fit=crop',
                    availability_status: 'available',
                    stock_quantity: 30
                },
                {
                    id: 3,
                    name: 'Tiramisu',
                    category: 'Dessert',
                    description: 'Traditional Italian dessert with mascarpone, coffee, and cocoa',
                    price: 8.99,
                    image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop',
                    availability_status: 'available',
                    stock_quantity: 15
                },
                {
                    id: 4,
                    name: 'Spaghetti Carbonara',
                    category: 'Main Course',
                    description: 'Classic Roman pasta with eggs, pecorino cheese, pancetta, and black pepper',
                    price: 16.99,
                    image_url: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400&h=300&fit=crop',
                    availability_status: 'available',
                    stock_quantity: 25
                },
                {
                    id: 5,
                    name: 'Bruschetta',
                    category: 'Appetizer',
                    description: 'Grilled bread topped with fresh tomatoes, garlic, and basil',
                    price: 9.99,
                    image_url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400&h=300&fit=crop',
                    availability_status: 'low-stock',
                    stock_quantity: 5
                },
                {
                    id: 6,
                    name: 'Gelato Selection',
                    category: 'Dessert',
                    description: 'Choose from our daily selection of handmade gelato flavors',
                    price: 6.99,
                    image_url: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=400&h=300&fit=crop',
                    availability_status: 'out-of-stock',
                    stock_quantity: 0
                }
            ];
        } else if (this.businessData.category === 'Salon') {
            this.inventory = [
                {
                    id: 7,
                    name: 'Haircut & Style',
                    category: 'Hair Services',
                    description: 'Professional haircut with wash, cut, and styling by our expert stylists',
                    price: 45.00,
                    image_url: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=300&fit=crop',
                    availability_status: 'available',
                    stock_quantity: 10
                },
                {
                    id: 8,
                    name: 'Hair Coloring',
                    category: 'Hair Services',
                    description: 'Full hair coloring service with premium organic hair dyes',
                    price: 85.00,
                    image_url: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&h=300&fit=crop',
                    availability_status: 'available',
                    stock_quantity: 8
                },
                {
                    id: 9,
                    name: 'Manicure',
                    category: 'Nail Services',
                    description: 'Complete manicure with nail shaping, cuticle care, and polish',
                    price: 25.00,
                    image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop',
                    availability_status: 'available',
                    stock_quantity: 15
                },
                {
                    id: 10,
                    name: 'Facial Treatment',
                    category: 'Beauty Services',
                    description: 'Relaxing facial treatment with deep cleansing and moisturizing',
                    price: 65.00,
                    image_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop',
                    availability_status: 'available',
                    stock_quantity: 6
                }
            ];
        }
    }

    generateCategoryFilter() {
        const categories = [...new Set(this.inventory.map(item => item.category))];
        
        // Clear existing options (except "All Categories")
        this.categoryFilterMenu.innerHTML = `
            <div class="filter-option active" data-category="all">
                <span>All Categories</span>
            </div>
        `;

        // Add category options
        categories.forEach(category => {
            const option = document.createElement('div');
            option.className = 'filter-option';
            option.dataset.category = category.toLowerCase().replace(/\s+/g, '-');
            option.innerHTML = `<span>${category}</span>`;
            option.addEventListener('click', () => this.selectCategory(category));
            this.categoryFilterMenu.appendChild(option);
        });

        // Add event listener for "All Categories"
        this.categoryFilterMenu.querySelector('[data-category="all"]').addEventListener('click', () => {
            this.selectCategory('all');
        });
    }

    selectCategory(category) {
        this.currentFilter = category;
        
        // Update button text
        const buttonText = category === 'all' ? 'All Categories' : category;
        this.categoryFilterBtn.querySelector('span').textContent = buttonText;
        
        // Update active state
        this.categoryFilterMenu.querySelectorAll('.filter-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const activeOption = category === 'all' 
            ? this.categoryFilterMenu.querySelector('[data-category="all"]')
            : this.categoryFilterMenu.querySelector(`[data-category="${category.toLowerCase().replace(/\s+/g, '-')}"]`);
        
        if (activeOption) {
            activeOption.classList.add('active');
        }

        // Close dropdown
        this.categoryFilterBtn.parentElement.classList.remove('active');
        
        // Filter inventory
        this.filterInventory();
    }

    filterInventory() {
        this.filteredInventory = this.inventory.filter(item => {
            const matchesSearch = !this.searchTerm || 
                item.name.toLowerCase().includes(this.searchTerm) ||
                item.description.toLowerCase().includes(this.searchTerm);
            
            const matchesCategory = this.currentFilter === 'all' || 
                item.category === this.currentFilter;
            
            return matchesSearch && matchesCategory;
        });

        this.updateInventoryDisplay();
    }

    updateDisplay() {
        this.updateViewButtons();
        this.updateInventoryDisplay();
        this.updateCartDisplay();
    }

    updateViewButtons() {
        this.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });
    }

    updateInventoryDisplay() {
        // Toggle view class
        this.inventoryGrid.className = `inventory-grid ${this.currentView}-view`;
        
        // Show/hide empty state
        if (this.filteredInventory.length === 0) {
            this.emptyState.style.display = 'block';
            this.inventoryGrid.style.display = 'none';
        } else {
            this.emptyState.style.display = 'none';
            this.inventoryGrid.style.display = 'grid';
        }

        // Render inventory items
        this.renderInventoryItems();
    }

    renderInventoryItems() {
        this.inventoryGrid.innerHTML = '';
        
        this.filteredInventory.forEach((item, index) => {
            const itemElement = this.createInventoryItemElement(item, index);
            this.inventoryGrid.appendChild(itemElement);
        });
    }

    createInventoryItemElement(item, index) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.style.animationDelay = `${(index % 6) * 0.1}s`;
        
        const availabilityClass = item.availability_status || 'available';
        const badgeText = this.getAvailabilityBadgeText(availabilityClass);
        const isAvailable = availabilityClass === 'available';
        
        itemDiv.innerHTML = `
            <div class="item-image-container">
                <img src="${item.image_url}" alt="${item.name}" class="item-image" 
                     onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'">
                ${badgeText ? `<div class="item-badge ${availabilityClass}">${badgeText}</div>` : ''}
            </div>
            <div class="item-info">
                ${this.currentView === 'list' ? '<div class="item-details">' : ''}
                <h3 class="item-name">${this.escapeHtml(item.name)}</h3>
                <div class="item-category">${this.escapeHtml(item.category)}</div>
                <p class="item-description">${this.escapeHtml(item.description)}</p>
                ${this.currentView === 'list' ? '</div>' : ''}
                <div class="item-footer">
                    <div class="item-price">$${item.price.toFixed(2)}</div>
                    ${this.currentView === 'list' ? '<div class="item-actions">' : ''}
                    ${isAvailable ? `
                        <button class="quick-add-btn" title="Quick add to cart">
                            <i class="fas fa-plus"></i>
                        </button>
                    ` : ''}
                    ${this.currentView === 'list' ? '</div>' : ''}
                </div>
            </div>
        `;

        // Add click handlers
        itemDiv.addEventListener('click', (e) => {
            if (!e.target.closest('.quick-add-btn')) {
                this.showItemDetail(item);
            }
        });

        const quickAddBtn = itemDiv.querySelector('.quick-add-btn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.quickAddToCart(item);
            });
        }

        return itemDiv;
    }

    getAvailabilityBadgeText(status) {
        switch (status) {
            case 'available': return 'Available';
            case 'low-stock': return 'Low Stock';
            case 'out-of-stock': return 'Out of Stock';
            default: return '';
        }
    }

    showItemDetail(item) {
        this.currentItem = item;
        
        // Populate modal with item data
        this.modalItemImage.src = item.image_url;
        this.modalItemImage.alt = item.name;
        this.modalItemName.textContent = item.name;
        this.modalItemCategory.textContent = item.category;
        this.modalItemPrice.textContent = `$${item.price.toFixed(2)}`;
        this.modalItemDescription.textContent = item.description;
        
        // Update availability status
        const isAvailable = item.availability_status === 'available';
        this.modalItemAvailability.className = `item-availability ${isAvailable ? 'available' : 'unavailable'}`;
        this.modalItemAvailability.innerHTML = `
            <i class="fas fa-${isAvailable ? 'check-circle' : 'times-circle'}"></i>
            <span>${isAvailable ? 'Available' : 'Currently Unavailable'}</span>
        `;
        
        // Show/hide badge
        const badgeText = this.getAvailabilityBadgeText(item.availability_status);
        if (badgeText && item.availability_status !== 'available') {
            this.modalItemBadge.style.display = 'block';
            this.modalItemBadge.className = `item-badge ${item.availability_status}`;
            this.modalItemBadge.querySelector('span').textContent = badgeText;
        } else {
            this.modalItemBadge.style.display = 'none';
        }
        
        // Enable/disable add to cart
        this.addToCartBtn.disabled = !isAvailable;
        
        // Reset quantity
        this.qtyInput.value = 1;
        
        // Show modal
        this.itemDetailModal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    closeModal() {
        this.itemDetailModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        this.currentItem = null;
    }

    closeCartModal() {
        this.cartModal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    updateQuantity(change) {
        const currentQty = parseInt(this.qtyInput.value) || 1;
        const newQty = Math.max(1, Math.min(10, currentQty + change));
        this.qtyInput.value = newQty;
        this.validateQuantity();
    }

    validateQuantity() {
        const qty = parseInt(this.qtyInput.value) || 1;
        const validQty = Math.max(1, Math.min(10, qty));
        this.qtyInput.value = validQty;
        
        // Update button states
        this.qtyMinus.disabled = validQty <= 1;
        this.qtyPlus.disabled = validQty >= 10;
    }

    addCurrentItemToCart() {
        if (!this.currentItem) return;
        
        const quantity = parseInt(this.qtyInput.value) || 1;
        this.addToCart(this.currentItem, quantity);
        this.closeModal();
    }

    quickAddToCart(item) {
        this.addToCart(item, 1);
    }

    addToCart(item, quantity) {
        const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.cart.push({
                ...item,
                quantity: quantity
            });
        }
        
        this.updateCartDisplay();
        this.showToast(`Added ${item.name} to cart`, 'success');
    }

    removeFromCart(itemId) {
        this.cart = this.cart.filter(item => item.id !== itemId);
        this.updateCartDisplay();
        this.updateCartModal();
    }

    updateCartItemQuantity(itemId, quantity) {
        const item = this.cart.find(cartItem => cartItem.id === itemId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(itemId);
            } else {
                item.quantity = quantity;
                this.updateCartDisplay();
                this.updateCartModal();
            }
        }
    }

    updateCartDisplay() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalItems > 0) {
            this.floatingCart.style.display = 'block';
            this.cartCount.textContent = totalItems;
        } else {
            this.floatingCart.style.display = 'none';
        }
    }

    showCartModal() {
        this.updateCartModal();
        this.cartModal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    updateCartModal() {
        // Render cart items
        this.cartItems.innerHTML = '';
        
        if (this.cart.length === 0) {
            this.cartItems.innerHTML = `
                <div class="empty-cart">
                    <p>Your cart is empty</p>
                </div>
            `;
        } else {
            this.cart.forEach(item => {
                const cartItemElement = this.createCartItemElement(item);
                this.cartItems.appendChild(cartItemElement);
            });
        }
        
        // Update totals
        this.updateCartTotals();
    }

    createCartItemElement(item) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        
        itemDiv.innerHTML = `
            <img src="${item.image_url}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
                <input type="number" value="${item.quantity}" min="1" max="10" class="cart-item-qty">
                <button class="remove-item" title="Remove item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add event listeners
        const qtyInput = itemDiv.querySelector('.cart-item-qty');
        const removeBtn = itemDiv.querySelector('.remove-item');
        
        qtyInput.addEventListener('change', () => {
            const newQty = parseInt(qtyInput.value) || 1;
            this.updateCartItemQuantity(item.id, newQty);
        });
        
        removeBtn.addEventListener('click', () => {
            this.removeFromCart(item.id);
        });
        
        return itemDiv;
    }

    updateCartTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.08; // 8% tax
        const total = subtotal + tax;
        
        this.cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        this.cartTax.textContent = `$${tax.toFixed(2)}`;
        this.cartTotal.textContent = `$${total.toFixed(2)}`;
    }

    clearCart() {
        if (this.cart.length === 0) return;
        
        if (confirm('Are you sure you want to clear your cart?')) {
            this.cart = [];
            this.updateCartDisplay();
            this.updateCartModal();
            this.showToast('Cart cleared', 'info');
        }
    }

    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showToast('Your cart is empty', 'error');
            return;
        }
        
        // Simulate checkout process
        this.showToast('Redirecting to checkout...', 'info');
        
        // In a real application, this would redirect to a checkout page
        setTimeout(() => {
            alert('Checkout functionality would be implemented here');
        }, 1500);
    }

    shareBusinessPage() {
        if (navigator.share) {
            navigator.share({
                title: this.businessData.name,
                text: this.businessData.description,
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showToast('Link copied to clipboard', 'success');
            });
        }
    }

    showLoading(show) {
        this.loadingState.style.display = show ? 'flex' : 'none';
        this.inventoryGrid.style.display = show ? 'none' : 'grid';
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide and remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'info': return 'info-circle';
            default: return 'info-circle';
        }
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHTML = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '★';
        }
        
        // Half star
        if (hasHalfStar) {
            starsHTML += '☆';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '☆';
        }
        
        return starsHTML;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BusinessInventoryPage();
});

export default BusinessInventoryPage;