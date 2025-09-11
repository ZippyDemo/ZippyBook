// Service Provider Dashboard Module
// Helper: determine if a business user is logged in
async function isBusinessLoggedIn() {
    // Prefer Supabase auth if available, else fall back to stored role
    try {
        const mod = await import('./supabase.js');
        const { supabase } = mod;
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) return false;
        const metaRole = (user.user_metadata?.role || '').toLowerCase();
        if (metaRole) return metaRole === 'business';
    } catch (_) {
        // ignore and fall back
    }
    try {
        const role = (sessionStorage.getItem('zippybook.role') || localStorage.getItem('userRole') || '').toLowerCase();
        return role === 'business';
    } catch (_) {
        return false;
    }
}

class ServiceProviderDashboard {
    constructor(app) {
        this.app = app;
        this.services = [];
        this.bookings = [];
        this.providerInfo = {
            id: 'provider-1',
            name: 'Business Name',
            email: 'business@example.com',
            phone: '+1 (555) 987-6543',
            address: '456 Business Ave, Cityville, USA',
            categories: ['restaurants', 'events'],
            description: 'Premium service provider with years of experience.',
            openingHours: {
                monday: { open: '09:00', close: '21:00' },
                tuesday: { open: '09:00', close: '21:00' },
                wednesday: { open: '09:00', close: '21:00' },
                thursday: { open: '09:00', close: '21:00' },
                friday: { open: '09:00', close: '22:00' },
                saturday: { open: '10:00', close: '22:00' },
                sunday: { open: '10:00', close: '20:00' }
            }
        };
        
        // Initialize dashboard
        this.initDashboard();

        // Listen for auth state changes to remove Provider Dashboard UI on logout
        (async () => {
            try {
                const mod = await import('./supabase.js');
                const { supabase } = mod;
                supabase.auth.onAuthStateChange(async (_event, session) => {
                    // If there's no session or role isn't business, remove UI
                    const isBiz = await isBusinessLoggedIn();
                    if (!session || !isBiz) {
                        this.removeProviderUI();
                    }
                });
            } catch (_) {
                // If supabase isn't available, nothing to subscribe to.
            }
        })();
    }
    
    async initDashboard() {
        // Load mock data, but do NOT render the floating Provider Dashboard button anymore
        this.loadMockData();
        // Intentionally skip creating/appending the button
        return;
    }

    removeProviderUI() {
        try {
            const btn = document.getElementById('provider-dashboard-btn');
            if (btn) btn.remove();
            const modal = document.getElementById('provider-dashboard-modal');
            if (modal) {
                modal.classList.remove('active');
                if (!document.querySelector('.modal.active')) {
                    document.body.classList.remove('modal-open');
                }
            }
        } catch (_) {}
    }
    
    loadMockData() {
        // Mock services data (provider's own services)
        this.services = [
            {
                id: 101,
                name: 'Premium Dining Experience',
                category: 'restaurants',
                image: 'https://via.placeholder.com/300x180/4a6cfa/ffffff?text=Premium+Dining',
                rating: 4.9,
                ratingCount: 156,
                location: 'Main Location',
                price: '$$$',
                description: 'Exclusive dining experience with personalized service.',
                featured: true,
                popular: true,
                availability: {
                    monday: ['18:00', '19:00', '20:00', '21:00'],
                    tuesday: ['18:00', '19:00', '20:00', '21:00'],
                    wednesday: ['18:00', '19:00', '20:00', '21:00'],
                    thursday: ['18:00', '19:00', '20:00', '21:00'],
                    friday: ['18:00', '19:00', '20:00', '21:00', '22:00'],
                    saturday: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'],
                    sunday: ['17:00', '18:00', '19:00', '20:00']
                }
            },
            {
                id: 102,
                name: 'Corporate Event Venue',
                category: 'events',
                image: 'https://via.placeholder.com/300x180/ff6b6b/ffffff?text=Event+Venue',
                rating: 4.8,
                ratingCount: 89,
                location: 'Business District',
                price: '$$$$',
                description: 'Professional venue for corporate events and conferences.',
                featured: true,
                popular: false,
                availability: {
                    monday: ['09:00', '13:00', '17:00'],
                    tuesday: ['09:00', '13:00', '17:00'],
                    wednesday: ['09:00', '13:00', '17:00'],
                    thursday: ['09:00', '13:00', '17:00'],
                    friday: ['09:00', '13:00', '17:00'],
                    saturday: ['10:00', '14:00', '18:00'],
                    sunday: ['10:00', '14:00', '18:00']
                }
            }
        ];
        
        // Mock bookings data (bookings for this provider)
        this.bookings = [
            {
                id: 1001,
                serviceId: 101,
                serviceName: 'Premium Dining Experience',
                customerName: 'Alice Johnson',
                customerEmail: 'alice@example.com',
                customerPhone: '+1 (555) 123-4567',
                date: '2025-05-15',
                time: '19:30',
                guests: 4,
                status: 'confirmed',
                notes: 'Anniversary celebration, window table requested',
                createdAt: '2025-04-10T14:30:00'
            },
            {
                id: 1002,
                serviceId: 101,
                serviceName: 'Premium Dining Experience',
                customerName: 'Bob Smith',
                customerEmail: 'bob@example.com',
                customerPhone: '+1 (555) 234-5678',
                date: '2025-05-16',
                time: '20:00',
                guests: 2,
                status: 'confirmed',
                notes: 'No special requests',
                createdAt: '2025-04-12T09:15:00'
            },
            {
                id: 1003,
                serviceId: 102,
                serviceName: 'Corporate Event Venue',
                customerName: 'Tech Solutions Inc.',
                customerEmail: 'events@techsolutions.com',
                customerPhone: '+1 (555) 345-6789',
                date: '2025-05-20',
                time: '13:00',
                guests: 50,
                status: 'pending',
                notes: 'Product launch event, requires AV equipment and catering',
                createdAt: '2025-04-15T11:45:00'
            },
            {
                id: 1004,
                serviceId: 101,
                serviceName: 'Premium Dining Experience',
                customerName: 'Charlie Davis',
                customerEmail: 'charlie@example.com',
                customerPhone: '+1 (555) 456-7890',
                date: '2025-04-18',
                time: '19:00',
                guests: 6,
                status: 'completed',
                notes: 'Birthday celebration, brought own cake',
                createdAt: '2025-04-05T16:20:00'
            },
            {
                id: 1005,
                serviceId: 102,
                serviceName: 'Corporate Event Venue',
                customerName: 'Marketing Experts LLC',
                customerEmail: 'events@marketingexperts.com',
                customerPhone: '+1 (555) 567-8901',
                date: '2025-04-10',
                time: '09:00',
                guests: 25,
                status: 'canceled',
                notes: 'Training workshop, canceled due to scheduling conflict',
                createdAt: '2025-03-25T10:30:00'
            }
        ];
    }
    
    openDashboard() {
        // Show dashboard modal
        const dashboardModal = document.getElementById('provider-dashboard-modal');
        dashboardModal.classList.add('active');
        
        // Load dashboard content
        this.loadDashboardContent();
        
        // Add event listeners for dashboard tabs
        document.querySelectorAll('#provider-dashboard-modal .tab-btn').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('#provider-dashboard-modal .tab-btn').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabId = tab.dataset.tab;
                this.loadTabContent(tabId);
            });
        });
        
        // Load overview tab by default
        this.loadTabContent('overview');
    }
    
    loadDashboardContent() {
        // Add CSS for dashboard
        if (!document.getElementById('dashboard-styles')) {
            const style = document.createElement('style');
            style.id = 'dashboard-styles';
            style.textContent = `
                .dashboard-content {
                    padding: var(--spacing-lg);
                }
                
                .dashboard-card {
                    background-color: var(--background-white);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    box-shadow: var(--shadow-sm);
                    margin-bottom: var(--spacing-lg);
                }
                
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-md);
                }
                
                .dashboard-title {
                    margin: 0;
                    font-size: var(--font-size-xl);
                }
                
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: var(--spacing-lg);
                    margin-bottom: var(--spacing-xl);
                }
                
                .stat-card {
                    background-color: var(--background-white);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    box-shadow: var(--shadow-sm);
                    text-align: center;
                }
                
                .stat-card.primary {
                    background-color: var(--primary-color);
                    color: var(--background-white);
                }
                
                .stat-card.secondary {
                    background-color: var(--secondary-color);
                    color: var(--background-white);
                }
                
                .stat-card.success {
                    background-color: var(--success-color);
                    color: var(--background-white);
                }
                
                .stat-card.warning {
                    background-color: var(--warning-color);
                    color: var(--text-dark);
                }
                
                .stat-value {
                    font-size: var(--font-size-3xl);
                    font-weight: 700;
                    margin-bottom: var(--spacing-xs);
                }
                
                .stat-label {
                    font-size: var(--font-size-sm);
                    opacity: 0.9;
                }
                
                .recent-bookings {
                    margin-bottom: var(--spacing-xl);
                }
                
                .booking-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                
                .booking-table th,
                .booking-table td {
                    padding: var(--spacing-md);
                    text-align: left;
                    border-bottom: 1px solid var(--border-light);
                }
                
                .booking-table th {
                    font-weight: 600;
                    color: var(--text-medium);
                }
                
                .booking-status-badge {
                    display: inline-block;
                    padding: var(--spacing-xs) var(--spacing-sm);
                    border-radius: var(--radius-sm);
                    font-size: var(--font-size-xs);
                    font-weight: 600;
                }
                
                .booking-status-badge.confirmed {
                    background-color: var(--success-color);
                    color: var(--background-white);
                }
                
                .booking-status-badge.pending {
                    background-color: var(--warning-color);
                    color: var(--text-dark);
                }
                
                .booking-status-badge.completed {
                    background-color: var(--primary-color);
                    color: var(--background-white);
                }
                
                .booking-status-badge.canceled {
                    background-color: var(--error-color);
                    color: var(--background-white);
                }
                
                .calendar-container {
                    background-color: var(--background-white);
                    border-radius: var(--radius-lg);
                    padding: var(--spacing-lg);
                    box-shadow: var(--shadow-sm);
                }
                
                .calendar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--spacing-md);
                }
                
                .calendar-nav {
                    display: flex;
                    gap: var(--spacing-sm);
                }
                
                .calendar-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 1px;
                    background-color: var(--border-light);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                }
                
                .calendar-day-header {
                    background-color: var(--primary-light);
                    padding: var(--spacing-sm);
                    text-align: center;
                    font-weight: 600;
                    color: var(--primary-color);
                }
                
                .calendar-day {
                    background-color: var(--background-white);
                    min-height: 100px;
                    padding: var(--spacing-sm);
                    position: relative;
                }
                
                .calendar-day.other-month {
                    background-color: var(--background-light);
                    color: var(--text-light);
                }
                
                .calendar-day.today {
                    background-color: var(--primary-light);
                }
                
                .day-number {
                    font-weight: 600;
                    margin-bottom: var(--spacing-sm);
                }
                
                .day-events {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                
                .day-event {
                    font-size: var(--font-size-xs);
                    padding: 2px 4px;
                    border-radius: 2px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    cursor: pointer;
                }
                
                .day-event.dining {
                    background-color: var(--primary-color);
                    color: var(--background-white);
                }
                
                .day-event.event {
                    background-color: var(--secondary-color);
                    color: var(--background-white);
                }
                
                .service-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: var(--spacing-lg);
                }
                
                .service-item {
                    background-color: var(--background-white);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                }
                
                .service-item-image {
                    height: 160px;
                    overflow: hidden;
                }
                
                .service-item-image img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .service-item-content {
                    padding: var(--spacing-md);
                }
                
                .service-item-title {
                    font-size: var(--font-size-lg);
                    margin-bottom: var(--spacing-xs);
                }
                
                .service-item-meta {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: var(--spacing-sm);
                    font-size: var(--font-size-sm);
                    color: var(--text-light);
                }
                
                .service-item-actions {
                    display: flex;
                    gap: var(--spacing-sm);
                    margin-top: var(--spacing-md);
                }
                
                .review-summary {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-md);
                    margin-bottom: var(--spacing-lg);
                }
                
                .review-chart {
                    width: 120px;
                    height: 120px;
                    position: relative;
                }
                
                .review-chart-value {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: var(--font-size-2xl);
                    font-weight: 700;
                }
                
                .review-stats {
                    flex: 1;
                }
                
                .review-stat {
                    display: flex;
                    align-items: center;
                    margin-bottom: var(--spacing-xs);
                }
                
                .review-stat-label {
                    width: 80px;
                    font-size: var(--font-size-sm);
                }
                
                .review-stat-bar {
                    flex: 1;
                    height: 8px;
                    background-color: var(--border-light);
                    border-radius: var(--radius-full);
                    margin: 0 var(--spacing-sm);
                    overflow: hidden;
                }
                
                .review-stat-value {
                    height: 100%;
                    background-color: var(--primary-color);
                }
                
                .review-stat-percent {
                    width: 40px;
                    font-size: var(--font-size-sm);
                    text-align: right;
                }
                
                .settings-form {
                    max-width: 600px;
                }
                
                .settings-section {
                    margin-bottom: var(--spacing-xl);
                }
                
                .settings-section h3 {
                    margin-bottom: var(--spacing-md);
                    padding-bottom: var(--spacing-xs);
                    border-bottom: 1px solid var(--border-light);
                }
                
                .hours-grid {
                    display: grid;
                    grid-template-columns: 100px 1fr 1fr;
                    gap: var(--spacing-md) var(--spacing-sm);
                    align-items: center;
                }
                
                .hours-day {
                    font-weight: 500;
                }
                
                .hours-closed {
                    grid-column: 2 / span 2;
                }
                
                .checkbox-toggle {
                    display: flex;
                    align-items: center;
                    gap: var(--spacing-sm);
                }
                
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 24px;
                }
                
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--border-color);
                    transition: var(--transition-normal);
                    border-radius: 34px;
                }
                
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: var(--transition-normal);
                    border-radius: 50%;
                }
                
                input:checked + .toggle-slider {
                    background-color: var(--primary-color);
                }
                
                input:checked + .toggle-slider:before {
                    transform: translateX(26px);
                }
                
                @media (max-width: 768px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                    
                    .booking-table {
                        display: block;
                        overflow-x: auto;
                    }
                    
                    .calendar-grid {
                        font-size: var(--font-size-xs);
                    }
                    
                    .calendar-day {
                        min-height: 80px;
                        padding: var(--spacing-xs);
                    }
                    
                    .hours-grid {
                        grid-template-columns: 80px 1fr 1fr;
                    }
                }
                
                @media (max-width: 576px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .review-summary {
                        flex-direction: column;
                    }
                    
                    .hours-grid {
                        grid-template-columns: 70px 1fr 1fr;
                        font-size: var(--font-size-sm);
                    }
                }
            `;
            
            document.head.appendChild(style);
        }
    }
    
    loadTabContent(tabId) {
        const dashboardContent = document.querySelector('.dashboard-content');
        
        switch (tabId) {
            case 'overview':
                this.loadOverviewTab(dashboardContent);
                break;
            case 'bookings':
                this.loadBookingsTab(dashboardContent);
                break;
            case 'services':
                this.loadServicesTab(dashboardContent);
                break;
            case 'calendar':
                this.loadCalendarTab(dashboardContent);
                break;
            case 'reviews':
                this.loadReviewsTab(dashboardContent);
                break;
            case 'settings':
                this.loadSettingsTab(dashboardContent);
                break;
            default:
                this.loadOverviewTab(dashboardContent);
        }
    }
    
    loadOverviewTab(container) {
        // Calculate statistics
        const totalBookings = this.bookings.length;
        const confirmedBookings = this.bookings.filter(b => b.status === 'confirmed').length;
        const pendingBookings = this.bookings.filter(b => b.status === 'pending').length;
        const canceledBookings = this.bookings.filter(b => b.status === 'canceled').length;
        
        // Get upcoming bookings (confirmed or pending, and in the future)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingBookings = this.bookings.filter(booking => 
            (booking.status === 'confirmed' || booking.status === 'pending') && 
            new Date(booking.date) >= today
        ).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
        
        // Create overview content
        container.innerHTML = `
            <div class="dashboard-header">
                <h3 class="dashboard-title">Dashboard Overview</h3>
                <div class="date-display">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
            
            <div class="dashboard-grid">
                <div class="stat-card primary">
                    <div class="stat-value">${totalBookings}</div>
                    <div class="stat-label">Total Bookings</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-value">${confirmedBookings}</div>
                    <div class="stat-label">Confirmed</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-value">${pendingBookings}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card secondary">
                    <div class="stat-value">${this.services.length}</div>
                    <div class="stat-label">Active Services</div>
                </div>
            </div>
            
            <div class="dashboard-card recent-bookings">
                <div class="dashboard-header">
                    <h3 class="dashboard-title">Upcoming Bookings</h3>
                    <button class="btn btn-outline btn-sm" id="view-all-bookings">View All</button>
                </div>
                
                ${upcomingBookings.length > 0 ? `
                <table class="booking-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Service</th>
                            <th>Customer</th>
                            <th>Date & Time</th>
                            <th>Guests</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${upcomingBookings.map(booking => `
                        <tr>
                            <td>#${booking.id}</td>
                            <td>${booking.serviceName}</td>
                            <td>${booking.customerName}</td>
                            <td>${new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${booking.time}</td>
                            <td>${booking.guests}</td>
                            <td><span class="booking-status-badge ${booking.status}">${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span></td>
                            <td>
                                <button class="btn btn-outline btn-sm view-booking" data-id="${booking.id}">View</button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : `
                <div class="empty-state">
                    <p>No upcoming bookings</p>
                </div>
                `}
            </div>
            
            <div class="dashboard-grid">
                <div class="dashboard-card">
                    <h3 class="dashboard-title">Quick Actions</h3>
                    <div class="quick-actions" style="display: flex; flex-direction: column; gap: var(--spacing-md); margin-top: var(--spacing-md);">
                        <button class="btn btn-primary" id="add-service-btn">Add New Service</button>
                        <button class="btn btn-outline" id="export-bookings-btn">Export Bookings</button>
                        <button class="btn btn-outline" id="send-promotions-btn">Send Promotions</button>
                    </div>
                </div>
                
                <div class="dashboard-card">
                    <h3 class="dashboard-title">Business Hours</h3>
                    <div class="business-hours" style="margin-top: var(--spacing-md);">
                        ${Object.entries(this.providerInfo.openingHours).map(([day, hours]) => `
                        <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-sm);">
                            <div style="text-transform: capitalize; font-weight: 500;">${day}</div>
                            <div>${hours.open} - ${hours.close}</div>
                        </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        container.querySelector('#view-all-bookings').addEventListener('click', () => {
            document.querySelector('[data-tab="bookings"]').click();
        });
        
        container.querySelectorAll('.view-booking').forEach(btn => {
            btn.addEventListener('click', () => {
                const bookingId = parseInt(btn.dataset.id);
                this.viewBookingDetails(bookingId);
            });
        });
        
        container.querySelector('#add-service-btn').addEventListener('click', () => {
            document.querySelector('[data-tab="services"]').click();
            this.showAddServiceForm();
        });
        
        container.querySelector('#export-bookings-btn').addEventListener('click', () => {
            this.exportBookings();
        });
        
        container.querySelector('#send-promotions-btn').addEventListener('click', () => {
            this.app.notifications.show('Promotion tools will be available in the next update', 'info');
        });
    }
    
    loadBookingsTab(container) {
        // Create booking filter options
        const statusOptions = ['all', 'confirmed', 'pending', 'completed', 'canceled'];
        const serviceOptions = [{ id: 'all', name: 'All Services' }, ...this.services];
        
        // Create bookings content
        container.innerHTML = `
            <div class="dashboard-header">
                <h3 class="dashboard-title">Manage Bookings</h3>
                <div class="booking-filters" style="display: flex; gap: var(--spacing-md);">
                    <select id="status-filter" class="filter-select">
                        ${statusOptions.map(status => `
                        <option value="${status}">${status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}</option>
                        `).join('')}
                    </select>
                    
                    <select id="service-filter" class="filter-select">
                        ${serviceOptions.map(service => `
                        <option value="${service.id}">${service.name}</option>
                        `).join('')}
                    </select>
                    
                    <input type="date" id="date-filter" class="filter-date">
                </div>
            </div>
            
            <div class="dashboard-card">
                <table class="booking-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Service</th>
                            <th>Customer</th>
                            <th>Date & Time</th>
                            <th>Guests</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="bookings-table-body">
                        ${this.bookings.map(booking => `
                        <tr data-status="${booking.status}" data-service="${booking.serviceId}" data-date="${booking.date}">
                            <td>#${booking.id}</td>
                            <td>${booking.serviceName}</td>
                            <td>${booking.customerName}</td>
                            <td>${new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${booking.time}</td>
                            <td>${booking.guests}</td>
                            <td><span class="booking-status-badge ${booking.status}">${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span></td>
                            <td>
                                <div style="display: flex; gap: var(--spacing-xs);">
                                    <button class="btn btn-outline btn-sm view-booking" data-id="${booking.id}">View</button>
                                    <button class="btn btn-outline btn-sm update-status" data-id="${booking.id}">Update</button>
                                </div>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        // Add event listeners for filters
        const statusFilter = container.querySelector('#status-filter');
        const serviceFilter = container.querySelector('#service-filter');
        const dateFilter = container.querySelector('#date-filter');
        
        const filterBookings = () => {
            const status = statusFilter.value;
            const serviceId = serviceFilter.value;
            const date = dateFilter.value;
            
            const rows = container.querySelectorAll('#bookings-table-body tr');
            
            rows.forEach(row => {
                const rowStatus = row.dataset.status;
                const rowServiceId = row.dataset.service;
                const rowDate = row.dataset.date;
                
                const statusMatch = status === 'all' || rowStatus === status;
                const serviceMatch = serviceId === 'all' || rowServiceId === serviceId;
                const dateMatch = !date || rowDate === date;
                
                if (statusMatch && serviceMatch && dateMatch) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        };
        
        statusFilter.addEventListener('change', filterBookings);
        serviceFilter.addEventListener('change', filterBookings);
        dateFilter.addEventListener('change', filterBookings);
        
        // Add event listeners for booking actions
        container.querySelectorAll('.view-booking').forEach(btn => {
            btn.addEventListener('click', () => {
                const bookingId = parseInt(btn.dataset.id);
                this.viewBookingDetails(bookingId);
            });
        });
        
        container.querySelectorAll('.update-status').forEach(btn => {
            btn.addEventListener('click', () => {
                const bookingId = parseInt(btn.dataset.id);
                this.updateBookingStatus(bookingId);
            });
        });
    }
    
    loadServicesTab(container) {
        container.innerHTML = `
            <div class="dashboard-header">
                <h3 class="dashboard-title">Manage Services</h3>
                <button class="btn btn-primary" id="add-service">Add New Service</button>
            </div>
            
            <div class="service-list">
                ${this.services.map(service => `
                <div class="service-item">
                    <div class="service-item-image">
                        <img src="${service.image}" alt="${service.name}">
                    </div>
                    <div class="service-item-content">
                        <h4 class="service-item-title">${service.name}</h4>
                        <div class="service-item-meta">
                            <div>${this.formatCategory(service.category)}</div>
                            <div>${service.price}</div>
                        </div>
                        <p>${service.description}</p>
                        <div class="service-item-actions">
                            <button class="btn btn-outline btn-sm edit-service" data-id="${service.id}">Edit</button>
                            <button class="btn btn-outline btn-sm manage-availability" data-id="${service.id}">Availability</button>
                            <button class="btn btn-outline btn-sm btn-danger delete-service" data-id="${service.id}">Delete</button>
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        `;
        
        // Add event listeners
        container.querySelector('#add-service').addEventListener('click', () => {
            this.showAddServiceForm();
        });
        
        container.querySelectorAll('.edit-service').forEach(btn => {
            btn.addEventListener('click', () => {
                const serviceId = parseInt(btn.dataset.id);
                this.editService(serviceId);
            });
        });
        
        container.querySelectorAll('.manage-availability').forEach(btn => {
            btn.addEventListener('click', () => {
                const serviceId = parseInt(btn.dataset.id);
                this.manageServiceAvailability(serviceId);
            });
        });
        
        container.querySelectorAll('.delete-service').forEach(btn => {
            btn.addEventListener('click', () => {
                const serviceId = parseInt(btn.dataset.id);
                this.deleteService(serviceId);
            });
        });
    }
    
    loadCalendarTab(container) {
        // Get current date
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // Create calendar
        container.innerHTML = `
            <div class="dashboard-header">
                <h3 class="dashboard-title">Booking Calendar</h3>
                <div class="calendar-nav">
                    <button class="btn btn-outline btn-sm" id="prev-month"><i class="fas fa-chevron-left"></i></button>
                    <div class="current-month">${new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                    <button class="btn btn-outline btn-sm" id="next-month"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
            
            <div class="calendar-container">
                <div class="calendar-grid">
                    <div class="calendar-day-header">Sun</div>
                    <div class="calendar-day-header">Mon</div>
                    <div class="calendar-day-header">Tue</div>
                    <div class="calendar-day-header">Wed</div>
                    <div class="calendar-day-header">Thu</div>
                    <div class="calendar-day-header">Fri</div>
                    <div class="calendar-day-header">Sat</div>
                    
                    ${this.generateCalendarDays(currentYear, currentMonth)}
                </div>
            </div>
        `;
        
        // Add event listeners for navigation
        container.querySelector('#prev-month').addEventListener('click', () => {
            const currentMonthText = container.querySelector('.current-month').textContent;
            const [monthName, year] = currentMonthText.split(' ');
            
            const date = new Date(`${monthName} 1, ${year}`);
            date.setMonth(date.getMonth() - 1);
            
            container.querySelector('.current-month').textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            const calendarGrid = container.querySelector('.calendar-grid');
            const dayHeaders = calendarGrid.querySelectorAll('.calendar-day-header');
            const days = calendarGrid.querySelectorAll('.calendar-day');
            
            days.forEach(day => day.remove());
            
            const newDays = this.generateCalendarDays(date.getFullYear(), date.getMonth());
            calendarGrid.insertAdjacentHTML('beforeend', newDays);
            
            // Re-add event listeners for day events
            this.addCalendarEventListeners(container);
        });
        
        container.querySelector('#next-month').addEventListener('click', () => {
            const currentMonthText = container.querySelector('.current-month').textContent;
            const [monthName, year] = currentMonthText.split(' ');
            
            const date = new Date(`${monthName} 1, ${year}`);
            date.setMonth(date.getMonth() + 1);
            
            container.querySelector('.current-month').textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            
            const calendarGrid = container.querySelector('.calendar-grid');
            const dayHeaders = calendarGrid.querySelectorAll('.calendar-day-header');
            const days = calendarGrid.querySelectorAll('.calendar-day');
            
            days.forEach(day => day.remove());
            
            const newDays = this.generateCalendarDays(date.getFullYear(), date.getMonth());
            calendarGrid.insertAdjacentHTML('beforeend', newDays);
            
            // Re-add event listeners for day events
            this.addCalendarEventListeners(container);
        });
        
        // Add event listeners for day events
        this.addCalendarEventListeners(container);
    }
    
    addCalendarEventListeners(container) {
        container.querySelectorAll('.day-event').forEach(event => {
            event.addEventListener('click', () => {
                const bookingId = parseInt(event.dataset.id);
                this.viewBookingDetails(bookingId);
            });
        });
    }
    
    generateCalendarDays(year, month) {
        // Get first day of month and last day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Get day of week for first day (0 = Sunday, 6 = Saturday)
        const firstDayOfWeek = firstDay.getDay();
        
        // Get total days in month
        const daysInMonth = lastDay.getDate();
        
        // Get days from previous month to fill first week
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const prevMonthDays = Array.from({ length: firstDayOfWeek }, (_, i) => {
            const day = prevMonthLastDay - firstDayOfWeek + i + 1;
            return { day, month: month - 1, year, otherMonth: true };
        });
        
        // Get days for current month
        const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
            return { day: i + 1, month, year, otherMonth: false };
        });
        
        // Get days from next month to fill last week
        const totalDaysDisplayed = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
        const nextMonthDays = Array.from({ length: totalDaysDisplayed - (firstDayOfWeek + daysInMonth) }, (_, i) => {
            return { day: i + 1, month: month + 1, year, otherMonth: true };
        });
        
        // Combine all days
        const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
        
        // Get today's date for highlighting
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        
        // Generate HTML for calendar days
        return allDays.map(({ day, month, year, otherMonth }) => {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            
            // Check if this day is today
            const isToday = day === todayDay && month === todayMonth && year === todayYear;
            
            // Get bookings for this day
            const dayBookings = this.bookings.filter(booking => booking.date === dateString);
            
            return `
            <div class="calendar-day ${otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                <div class="day-number">${day}</div>
                <div class="day-events">
                    ${dayBookings.map(booking => {
                        const serviceCategory = this.services.find(s => s.id === booking.serviceId)?.category || 'other';
                        const eventClass = serviceCategory === 'restaurants' ? 'dining' : 'event';
                        
                        return `
                        <div class="day-event ${eventClass}" data-id="${booking.id}">
                            ${booking.time} - ${booking.serviceName.substring(0, 15)}${booking.serviceName.length > 15 ? '...' : ''}
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
            `;
        }).join('');
    }
    
    loadReviewsTab(container) {
        // Calculate average rating
        const totalReviews = this.services.reduce((sum, service) => sum + service.ratingCount, 0);
        const weightedSum = this.services.reduce((sum, service) => sum + (service.rating * service.ratingCount), 0);
        const averageRating = totalReviews > 0 ? (weightedSum / totalReviews).toFixed(1) : 0;
        
        // Calculate rating distribution (mock data)
        const ratingDistribution = {
            5: 70,
            4: 20,
            3: 7,
            2: 2,
            1: 1
        };
        
        container.innerHTML = `
            <div class="dashboard-header">
                <h3 class="dashboard-title">Customer Reviews</h3>
                <button class="btn btn-outline btn-sm" id="export-reviews">Export Reviews</button>
            </div>
            
            <div class="dashboard-card">
                <div class="review-summary">
                    <div class="review-chart">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" stroke-width="12" />
                            <circle cx="60" cy="60" r="54" fill="none" stroke="#4a6cfa" stroke-width="12" 
                                stroke-dasharray="339.3" stroke-dashoffset="${339.3 - (339.3 * averageRating / 5)}" 
                                transform="rotate(-90 60 60)" />
                        </svg>
                        <div class="review-chart-value">${averageRating}</div>
                    </div>
                    
                    <div class="review-stats">
                        ${Object.entries(ratingDistribution).reverse().map(([rating, percent]) => `
                        <div class="review-stat">
                            <div class="review-stat-label">${rating} stars</div>
                            <div class="review-stat-bar">
                                <div class="review-stat-value" style="width: ${percent}%"></div>
                            </div>
                            <div class="review-stat-percent">${percent}%</div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="review-filters" style="display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                    <select id="service-review-filter" class="filter-select">
                        <option value="all">All Services</option>
                        ${this.services.map(service => `
                        <option value="${service.id}">${service.name}</option>
                        `).join('')}
                    </select>
                    
                    <select id="rating-filter" class="filter-select">
                        <option value="all">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>
                
                <div class="review-list">
                    <!-- Mock reviews -->
                    <div class="review-item">
                        <div class="review-header">
                            <img src="images/default-avatar.svg" alt="User" class="reviewer-avatar">
                            <div class="reviewer-info">
                                <h4 class="reviewer-name">John D.</h4>
                                <div class="review-date">April 15, 2025</div>
                            </div>
                            <div class="review-rating">
                                <div class="stars">★★★★★</div>
                            </div>
                        </div>
                        <div class="review-content">
                            <p>Amazing experience! The service was impeccable and the staff was very friendly. Would definitely recommend to anyone looking for a great experience.</p>
                        </div>
                        <div class="review-service" style="margin-top: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--text-light);">
                            Service: Premium Dining Experience
                        </div>
                    </div>
                    
                    <div class="review-item">
                        <div class="review-header">
                            <img src="images/default-avatar.svg" alt="User" class="reviewer-avatar">
                            <div class="reviewer-info">
                                <h4 class="reviewer-name">Sarah M.</h4>
                                <div class="review-date">April 10, 2025</div>
                            </div>
                            <div class="review-rating">
                                <div class="stars">★★★★☆</div>
                            </div>
                        </div>
                        <div class="review-content">
                            <p>Great service and atmosphere. The only reason I'm giving 4 stars instead of 5 is because the wait time was a bit longer than expected. Otherwise, everything was perfect!</p>
                        </div>
                        <div class="review-service" style="margin-top: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--text-light);">
                            Service: Premium Dining Experience
                        </div>
                    </div>
                    
                    <div class="review-item">
                        <div class="review-header">
                            <img src="images/default-avatar.svg" alt="User" class="reviewer-avatar">
                            <div class="reviewer-info">
                                <h4 class="reviewer-name">Corporate Client</h4>
                                <div class="review-date">April 5, 2025</div>
                            </div>
                            <div class="review-rating">
                                <div class="stars">★★★★★</div>
                            </div>
                        </div>
                        <div class="review-content">
                            <p>Perfect venue for our corporate event. The staff was professional and accommodating to all our needs. The AV equipment worked flawlessly and the catering was excellent.</p>
                        </div>
                        <div class="review-service" style="margin-top: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--text-light);">
                            Service: Corporate Event Venue
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        container.querySelector('#export-reviews').addEventListener('click', () => {
            this.app.notifications.show('Reviews exported successfully', 'success');
        });
        
        // Add filter functionality
        const serviceFilter = container.querySelector('#service-review-filter');
        const ratingFilter = container.querySelector('#rating-filter');
        
        const filterReviews = () => {
            // This would filter the reviews based on selected service and rating
            // For the mock implementation, we'll just show a notification
            this.app.notifications.show('Review filters applied', 'info');
        };
        
        serviceFilter.addEventListener('change', filterReviews);
        ratingFilter.addEventListener('change', filterReviews);
    }
    
    loadSettingsTab(container) {
        container.innerHTML = `
            <div class="dashboard-header">
                <h3 class="dashboard-title">Business Settings</h3>
                <button class="btn btn-primary" id="save-settings">Save Changes</button>
            </div>
            
            <div class="dashboard-card">
                <form class="settings-form">
                    <div class="settings-section">
                        <h3>Business Information</h3>
                        
                        <div class="form-group">
                            <label for="business-name">Business Name</label>
                            <input type="text" id="business-name" value="${this.providerInfo.name}">
                        </div>
                        
                        <div class="form-group">
                            <label for="business-email">Email</label>
                            <input type="email" id="business-email" value="${this.providerInfo.email}">
                        </div>
                        
                        <div class="form-group">
                            <label for="business-phone">Phone</label>
                            <input type="tel" id="business-phone" value="${this.providerInfo.phone}">
                        </div>
                        
                        <div class="form-group">
                            <label for="business-address">Address</label>
                            <textarea id="business-address" rows="3">${this.providerInfo.address}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="business-description">Description</label>
                            <textarea id="business-description" rows="4">${this.providerInfo.description}</textarea>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Business Hours</h3>
                        
                        <div class="hours-grid">
                            <div class="hours-day">Monday</div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.monday.open}" id="monday-open">
                            </div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.monday.close}" id="monday-close">
                            </div>
                            
                            <div class="hours-day">Tuesday</div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.tuesday.open}" id="tuesday-open">
                            </div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.tuesday.close}" id="tuesday-close">
                            </div>
                            
                            <div class="hours-day">Wednesday</div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.wednesday.open}" id="wednesday-open">
                            </div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.wednesday.close}" id="wednesday-close">
                            </div>
                            
                            <div class="hours-day">Thursday</div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.thursday.open}" id="thursday-open">
                            </div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.thursday.close}" id="thursday-close">
                            </div>
                            
                            <div class="hours-day">Friday</div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.friday.open}" id="friday-open">
                            </div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.friday.close}" id="friday-close">
                            </div>
                            
                            <div class="hours-day">Saturday</div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.saturday.open}" id="saturday-open">
                            </div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.saturday.close}" id="saturday-close">
                            </div>
                            
                            <div class="hours-day">Sunday</div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.sunday.open}" id="sunday-open">
                            </div>
                            <div class="hours-time">
                                <input type="time" value="${this.providerInfo.openingHours.sunday.close}" id="sunday-close">
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Notification Settings</h3>
                        
                        <div class="form-group">
                            <div class="checkbox-toggle">
                                <label class="toggle-switch">
                                    <input type="checkbox" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span>Email notifications for new bookings</span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <div class="checkbox-toggle">
                                <label class="toggle-switch">
                                    <input type="checkbox" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span>SMS notifications for new bookings</span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <div class="checkbox-toggle">
                                <label class="toggle-switch">
                                    <input type="checkbox" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span>Booking reminders</span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <div class="checkbox-toggle">
                                <label class="toggle-switch">
                                    <input type="checkbox">
                                    <span class="toggle-slider"></span>
                                </label>
                                <span>Marketing emails</span>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        `;
        
        // Add event listener for save button
        container.querySelector('#save-settings').addEventListener('click', () => {
            // Update provider info
            this.providerInfo.name = container.querySelector('#business-name').value;
            this.providerInfo.email = container.querySelector('#business-email').value;
            this.providerInfo.phone = container.querySelector('#business-phone').value;
            this.providerInfo.address = container.querySelector('#business-address').value;
            this.providerInfo.description = container.querySelector('#business-description').value;
            
            // Update business hours
            this.providerInfo.openingHours.monday.open = container.querySelector('#monday-open').value;
            this.providerInfo.openingHours.monday.close = container.querySelector('#monday-close').value;
            this.providerInfo.openingHours.tuesday.open = container.querySelector('#tuesday-open').value;
            this.providerInfo.openingHours.tuesday.close = container.querySelector('#tuesday-close').value;
            this.providerInfo.openingHours.wednesday.open = container.querySelector('#wednesday-open').value;
            this.providerInfo.openingHours.wednesday.close = container.querySelector('#wednesday-close').value;
            this.providerInfo.openingHours.thursday.open = container.querySelector('#thursday-open').value;
            this.providerInfo.openingHours.thursday.close = container.querySelector('#thursday-close').value;
            this.providerInfo.openingHours.friday.open = container.querySelector('#friday-open').value;
            this.providerInfo.openingHours.friday.close = container.querySelector('#friday-close').value;
            this.providerInfo.openingHours.saturday.open = container.querySelector('#saturday-open').value;
            this.providerInfo.openingHours.saturday.close = container.querySelector('#saturday-close').value;
            this.providerInfo.openingHours.sunday.open = container.querySelector('#sunday-open').value;
            this.providerInfo.openingHours.sunday.close = container.querySelector('#sunday-close').value;
            
            // Show success notification
            this.app.notifications.show('Settings saved successfully', 'success');
        });
    }
    
    viewBookingDetails(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return;
        
        // Create modal for booking details
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'booking-details-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <h2>Booking Details</h2>
                
                <div style="margin-bottom: var(--spacing-lg);">
                    <div class="booking-status-badge ${booking.status}" style="margin-bottom: var(--spacing-md);">
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </div>
                    
                    <h3>${booking.serviceName}</h3>
                    <p><strong>Booking ID:</strong> #${booking.id}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-lg);">
                    <div>
                        <h4>Customer Information</h4>
                        <p><strong>Name:</strong> ${booking.customerName}</p>
                        <p><strong>Email:</strong> ${booking.customerEmail}</p>
                        <p><strong>Phone:</strong> ${booking.customerPhone}</p>
                    </div>
                    
                    <div>
                        <h4>Booking Information</h4>
                        <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p><strong>Time:</strong> ${booking.time}</p>
                        <p><strong>Guests:</strong> ${booking.guests}</p>
                    </div>
                </div>
                
                <div style="margin-bottom: var(--spacing-lg);">
                    <h4>Special Requests</h4>
                    <p>${booking.notes || 'No special requests'}</p>
                </div>
                
                <div style="margin-bottom: var(--spacing-lg);">
                    <h4>Booking Timeline</h4>
                    <div style="display: flex; flex-direction: column; gap: var(--spacing-sm);">
                        <div style="display: flex; gap: var(--spacing-md);">
                            <div style="width: 20px; height: 20px; border-radius: 50%; background-color: var(--primary-color);"></div>
                            <div>
                                <div style="font-weight: 500;">Booking Created</div>
                                <div style="font-size: var(--font-size-sm); color: var(--text-light);">${new Date(booking.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                        
                        ${booking.status !== 'pending' ? `
                        <div style="display: flex; gap: var(--spacing-md);">
                            <div style="width: 20px; height: 20px; border-radius: 50%; background-color: var(--success-color);"></div>
                            <div>
                                <div style="font-weight: 500;">Booking ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</div>
                                <div style="font-size: var(--font-size-sm); color: var(--text-light);">${new Date(new Date(booking.createdAt).getTime() + 3600000).toLocaleString()}</div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                
                <div style="display: flex; gap: var(--spacing-md);">
                    ${booking.status === 'pending' ? `
                    <button class="btn btn-primary confirm-booking" data-id="${booking.id}">Confirm Booking</button>
                    <button class="btn btn-outline btn-danger reject-booking" data-id="${booking.id}">Reject Booking</button>
                    ` : booking.status === 'confirmed' ? `
                    <button class="btn btn-outline btn-danger cancel-booking" data-id="${booking.id}">Cancel Booking</button>
                    ` : ''}
                    <button class="btn btn-outline close-details">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.close-details').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Add event listeners for booking actions
        if (booking.status === 'pending') {
            modal.querySelector('.confirm-booking').addEventListener('click', () => {
                this.updateBookingStatusAction(bookingId, 'confirmed');
                modal.remove();
            });
            
            modal.querySelector('.reject-booking').addEventListener('click', () => {
                this.updateBookingStatusAction(bookingId, 'canceled');
                modal.remove();
            });
        } else if (booking.status === 'confirmed') {
            modal.querySelector('.cancel-booking').addEventListener('click', () => {
                this.updateBookingStatusAction(bookingId, 'canceled');
                modal.remove();
            });
        }
    }
    
    updateBookingStatus(bookingId) {
        const booking = this.bookings.find(b => b.id === bookingId);
        if (!booking) return;
        
        // Create modal for updating booking status
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'update-status-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <h2>Update Booking Status</h2>
                
                <div style="margin-bottom: var(--spacing-lg);">
                    <h3>${booking.serviceName}</h3>
                    <p><strong>Booking ID:</strong> #${booking.id}</p>
                    <p><strong>Customer:</strong> ${booking.customerName}</p>
                    <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <p><strong>Time:</strong> ${booking.time}</p>
                </div>
                
                <div style="margin-bottom: var(--spacing-lg);">
                    <label for="booking-status">Status</label>
                    <select id="booking-status" class="form-control" style="width: 100%; padding: var(--spacing-md); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-top: var(--spacing-xs);">
                        <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="canceled" ${booking.status === 'canceled' ? 'selected' : ''}>Canceled</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: var(--spacing-md);">
                    <button class="btn btn-primary update-status-confirm">Update Status</button>
                    <button class="btn btn-outline close-modal">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        modal.querySelector('.update-status-confirm').addEventListener('click', () => {
            const newStatus = modal.querySelector('#booking-status').value;
            this.updateBookingStatusAction(bookingId, newStatus);
            modal.remove();
        });
    }
    
    updateBookingStatusAction(bookingId, newStatus) {
        const bookingIndex = this.bookings.findIndex(b => b.id === bookingId);
        if (bookingIndex === -1) return;
        
        // Update booking status
        this.bookings[bookingIndex].status = newStatus;
        
        // Show success notification
        this.app.notifications.show(`Booking status updated to ${newStatus}`, 'success');
        
        // Reload current tab
        const activeTab = document.querySelector('#provider-dashboard-modal .tab-btn.active').dataset.tab;
        this.loadTabContent(activeTab);
    }
    
    showAddServiceForm() {
        // Create modal for adding new service
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'add-service-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <h2>Add New Service</h2>
                
                <form class="add-service-form">
                    <div class="form-group">
                        <label for="service-name">Service Name</label>
                        <input type="text" id="service-name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="service-category">Category</label>
                        <select id="service-category" required>
                            <option value="restaurants">Restaurant</option>
                            <option value="salons">Hair Salon</option>
                            <option value="hotels">Hotel</option>
                            <option value="transport">Transportation</option>
                            <option value="health">Health & Beauty</option>
                            <option value="events">Event Venue</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="service-price">Price Range</label>
                        <select id="service-price" required>
                            <option value="$">$ (Budget)</option>
                            <option value="$$">$$ (Moderate)</option>
                            <option value="$$$">$$$ (Upscale)</option>
                            <option value="$$$$">$$$$ (Luxury)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="service-location">Location</label>
                        <input type="text" id="service-location" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="service-description">Description</label>
                        <textarea id="service-description" rows="4" required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-toggle">
                            <label class="toggle-switch">
                                <input type="checkbox" id="service-featured">
                                <span class="toggle-slider"></span>
                            </label>
                            <span>Featured Service</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
                        <button type="submit" class="btn btn-primary">Add Service</button>
                        <button type="button" class="btn btn-outline close-modal">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        modal.querySelector('.add-service-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form values
            const name = modal.querySelector('#service-name').value;
            const category = modal.querySelector('#service-category').value;
            const price = modal.querySelector('#service-price').value;
            const location = modal.querySelector('#service-location').value;
            const description = modal.querySelector('#service-description').value;
            const featured = modal.querySelector('#service-featured').checked;
            
            // Create new service
            const newService = {
                id: Math.floor(Math.random() * 1000) + 200,
                name,
                category,
                image: `https://via.placeholder.com/300x180/4a6cfa/ffffff?text=${encodeURIComponent(name)}`,
                rating: 0,
                ratingCount: 0,
                location,
                price,
                description,
                featured,
                popular: false,
                badge: featured ? 'New' : null,
                availability: {
                    monday: ['09:00', '12:00', '15:00', '18:00'],
                    tuesday: ['09:00', '12:00', '15:00', '18:00'],
                    wednesday: ['09:00', '12:00', '15:00', '18:00'],
                    thursday: ['09:00', '12:00', '15:00', '18:00'],
                    friday: ['09:00', '12:00', '15:00', '18:00', '20:00'],
                    saturday: ['10:00', '13:00', '16:00', '19:00'],
                    sunday: ['10:00', '13:00', '16:00']
                }
            };
            
            // Add service to list
            this.services.push(newService);
            
            // Show success notification
            this.app.notifications.show('Service added successfully', 'success');
            
            // Reload services tab
            this.loadTabContent('services');
            
            // Close modal
            modal.remove();
        });
    }
    
    editService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        // Create modal for editing service
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'edit-service-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <h2>Edit Service</h2>
                
                <form class="edit-service-form">
                    <div class="form-group">
                        <label for="edit-service-name">Service Name</label>
                        <input type="text" id="edit-service-name" value="${service.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-service-category">Category</label>
                        <select id="edit-service-category" required>
                            <option value="restaurants" ${service.category === 'restaurants' ? 'selected' : ''}>Restaurant</option>
                            <option value="salons" ${service.category === 'salons' ? 'selected' : ''}>Hair Salon</option>
                            <option value="hotels" ${service.category === 'hotels' ? 'selected' : ''}>Hotel</option>
                            <option value="transport" ${service.category === 'transport' ? 'selected' : ''}>Transportation</option>
                            <option value="health" ${service.category === 'health' ? 'selected' : ''}>Health & Beauty</option>
                            <option value="events" ${service.category === 'events' ? 'selected' : ''}>Event Venue</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-service-price">Price Range</label>
                        <select id="edit-service-price" required>
                            <option value="$" ${service.price === '$' ? 'selected' : ''}>$ (Budget)</option>
                            <option value="$$" ${service.price === '$$' ? 'selected' : ''}>$$ (Moderate)</option>
                            <option value="$$$" ${service.price === '$$$' ? 'selected' : ''}>$$$ (Upscale)</option>
                            <option value="$$$$" ${service.price === '$$$$' ? 'selected' : ''}>$$$$ (Luxury)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-service-location">Location</label>
                        <input type="text" id="edit-service-location" value="${service.location}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-service-description">Description</label>
                        <textarea id="edit-service-description" rows="4" required>${service.description}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <div class="checkbox-toggle">
                            <label class="toggle-switch">
                                <input type="checkbox" id="edit-service-featured" ${service.featured ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                            <span>Featured Service</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-outline close-modal">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        modal.querySelector('.edit-service-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form values
            const name = modal.querySelector('#edit-service-name').value;
            const category = modal.querySelector('#edit-service-category').value;
            const price = modal.querySelector('#edit-service-price').value;
            const location = modal.querySelector('#edit-service-location').value;
            const description = modal.querySelector('#edit-service-description').value;
            const featured = modal.querySelector('#edit-service-featured').checked;
            
            // Update service
            const serviceIndex = this.services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                this.services[serviceIndex] = {
                    ...this.services[serviceIndex],
                    name,
                    category,
                    price,
                    location,
                    description,
                    featured
                };
                
                // Show success notification
                this.app.notifications.show('Service updated successfully', 'success');
                
                // Reload services tab
                this.loadTabContent('services');
            }
            
            // Close modal
            modal.remove();
        });
    }
    
    manageServiceAvailability(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        // Create modal for managing availability
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'availability-modal';
        
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <h2>Manage Availability</h2>
                <h3>${service.name}</h3>
                
                <div style="margin-top: var(--spacing-lg);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-md);">
                        <h4>Available Time Slots</h4>
                        <button class="btn btn-outline btn-sm" id="add-time-slot">Add Time Slot</button>
                    </div>
                    
                    <div class="availability-container">
                        ${Object.entries(service.availability).map(([day, slots]) => `
                        <div class="availability-day">
                            <h5 style="text-transform: capitalize; margin-bottom: var(--spacing-sm);">${day}</h5>
                            <div class="time-slots" data-day="${day}">
                                ${slots.map(slot => `
                                <div class="time-slot">
                                    <span>${slot}</span>
                                    <button class="remove-slot" data-day="${day}" data-time="${slot}">×</button>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
                    <button class="btn btn-primary save-availability">Save Changes</button>
                    <button class="btn btn-outline close-modal">Cancel</button>
                </div>
            </div>
        `;
        
        // Add CSS for availability modal
        const style = document.createElement('style');
        style.textContent = `
            .availability-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: var(--spacing-lg);
            }
            
            .availability-day {
                margin-bottom: var(--spacing-md);
            }
            
            .time-slots {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-sm);
            }
            
            .time-slot {
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
                background-color: var(--primary-light);
                color: var(--primary-color);
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--radius-sm);
                font-size: var(--font-size-sm);
            }
            
            .remove-slot {
                background: none;
                border: none;
                color: var(--primary-color);
                font-size: var(--font-size-lg);
                line-height: 1;
                cursor: pointer;
                padding: 0;
                margin-left: var(--spacing-xs);
            }
            
            .add-slot-form {
                margin-top: var(--spacing-md);
                padding: var(--spacing-md);
                background-color: var(--background-light);
                border-radius: var(--radius-md);
            }
            
            .add-slot-form h5 {
                margin-bottom: var(--spacing-sm);
            }
            
            .slot-form-controls {
                display: flex;
                gap: var(--spacing-md);
                align-items: flex-end;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Add event listener for removing time slots
        modal.querySelectorAll('.remove-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                const day = btn.dataset.day;
                const time = btn.dataset.time;
                
                // Remove time slot from UI
                btn.closest('.time-slot').remove();
            });
        });
        
        // Add event listener for adding time slots
        modal.querySelector('#add-time-slot').addEventListener('click', () => {
            // Check if add slot form already exists
            if (modal.querySelector('.add-slot-form')) {
                return;
            }
            
            // Create add slot form
            const addSlotForm = document.createElement('div');
            addSlotForm.className = 'add-slot-form';
            
            addSlotForm.innerHTML = `
                <h5>Add New Time Slot</h5>
                <div class="slot-form-controls">
                    <div class="form-group">
                        <label for="slot-day">Day</label>
                        <select id="slot-day">
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="slot-time">Time</label>
                        <input type="time" id="slot-time">
                    </div>
                    
                    <button type="button" class="btn btn-primary" id="add-slot">Add</button>
                    <button type="button" class="btn btn-outline" id="cancel-add-slot">Cancel</button>
                </div>
            `;
            
            modal.querySelector('.availability-container').insertAdjacentElement('beforebegin', addSlotForm);
            
            // Add event listeners for add slot form
            modal.querySelector('#add-slot').addEventListener('click', () => {
                const day = modal.querySelector('#slot-day').value;
                const time = modal.querySelector('#slot-time').value;
                
                if (!time) {
                    this.app.notifications.show('Please select a time', 'error');
                    return;
                }
                
                // Format time (HH:MM)
                const formattedTime = time;
                
                // Add time slot to UI
                const timeSlots = modal.querySelector(`.time-slots[data-day="${day}"]`);
                
                const newSlot = document.createElement('div');
                newSlot.className = 'time-slot';
                newSlot.innerHTML = `
                    <span>${formattedTime}</span>
                    <button class="remove-slot" data-day="${day}" data-time="${formattedTime}">×</button>
                `;
                
                timeSlots.appendChild(newSlot);
                
                // Add event listener for remove button
                newSlot.querySelector('.remove-slot').addEventListener('click', () => {
                    newSlot.remove();
                });
                
                // Remove add slot form
                addSlotForm.remove();
            });
            
            modal.querySelector('#cancel-add-slot').addEventListener('click', () => {
                addSlotForm.remove();
            });
        });
        
        // Add event listener for saving availability
        modal.querySelector('.save-availability').addEventListener('click', () => {
            // Collect all time slots from UI
            const availability = {};
            
            Object.keys(service.availability).forEach(day => {
                availability[day] = [];
                
                const timeSlots = modal.querySelectorAll(`.time-slots[data-day="${day}"] .time-slot span`);
                timeSlots.forEach(slot => {
                    availability[day].push(slot.textContent);
                });
                
                // Sort time slots
                availability[day].sort();
            });
            
            // Update service availability
            const serviceIndex = this.services.findIndex(s => s.id === serviceId);
            if (serviceIndex !== -1) {
                this.services[serviceIndex].availability = availability;
                
                // Show success notification
                this.app.notifications.show('Availability updated successfully', 'success');
            }
            
            // Close modal
            modal.remove();
        });
    }
    
    deleteService(serviceId) {
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
            return;
        }
        
        // Remove service from list
        this.services = this.services.filter(s => s.id !== serviceId);
        
        // Show success notification
        this.app.notifications.show('Service deleted successfully', 'success');
        
        // Reload services tab
        this.loadTabContent('services');
    }
    
    exportBookings() {
        // In a real application, this would generate a CSV or Excel file
        // For this demo, we'll just show a notification
        this.app.notifications.show('Bookings exported successfully', 'success');
    }
    
    formatCategory(category) {
        const categories = {
            restaurants: 'Restaurant',
            salons: 'Hair Salon',
            hotels: 'Hotel',
            transport: 'Transportation',
            health: 'Health & Beauty',
            events: 'Event Venue'
        };
        
        return categories[category] || category;
    }
}

// Add ServiceProviderDashboard to the app
document.addEventListener('DOMContentLoaded', () => {
    // Wait for app to initialize
    setTimeout(() => {
        if (window.app) {
            window.app.providerDashboard = new ServiceProviderDashboard(window.app);
            // Remove any stray floating button if it exists from older markup
            const strayBtn = document.getElementById('provider-dashboard-btn');
            if (strayBtn) strayBtn.remove();
        }
    }, 500);
});
