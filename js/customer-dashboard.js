import { DashboardGuard } from './dashboard-guard.js';

class CustomerDashboard {
    constructor() {
        this.guard = new DashboardGuard();
        this.socket = io('/customer');
        this.userName = null;
        this.init();
    }

    init() {
        this.guard.validateAccess();
        this.loadActiveReservations();
        this.setupSocketListeners();
        this.setupEventListeners();
        this.populateMetrics();
        this.populateRecentBookings();
        this.populateFavoriteProviders();
        this.setupRewardsCircle();
        this.applyDummyAvatars();
        // Load display name from Supabase profile/auth
        this.loadDisplayName();
    }

    setupSocketListeners() {
        this.socket.on('orderUpdate', (order) => {
            this.updateOrderStatus(order);
        });

        this.socket.on('deliveryUpdate', (delivery) => {
            this.updateDeliveryStatus(delivery);
        });
    }

    async loadActiveReservations() {
        try {
            const response = await fetch('/api/customer/reservations');
            const data = await response.json();
            this.renderReservations(data);
        } catch (error) {
            console.error('Failed to load reservations:', error);
        }
    }

    renderReservations(reservations) {
        const container = document.querySelector('.booking-list');
        container.innerHTML = '';
        
        reservations.forEach(reservation => {
            const template = document.getElementById('booking-item-template');
            const clone = template.content.cloneNode(true);
            // Populate reservation data
            container.appendChild(clone);
        });
    }

    populateMetrics() {
        document.querySelector('.metric-card:nth-child(1) .metric-value').textContent = customerData.metrics.upcomingBookings;
        document.querySelector('.metric-card:nth-child(2) .metric-value').textContent = customerData.metrics.favorites;
        document.querySelector('.metric-card:nth-child(3) .metric-value').textContent = customerData.metrics.rewardPoints.toLocaleString();
        document.querySelector('.metric-card:nth-child(4) .metric-value').textContent = customerData.metrics.notifications;
        const nameEl = document.getElementById('customer-name');
        if (nameEl && !nameEl.textContent) nameEl.textContent = customerData.name;
    }

    populateRecentBookings() {
        const bookingList = document.querySelector('#recent-bookings .booking-list');
        if (!bookingList) return;

        bookingList.innerHTML = customerData.recentBookings.map(booking => `
            <div class="booking-item">
                <div class="booking-image">
                    <img src="${booking.imageUrl}" alt="${booking.serviceName}">
                </div>
                <div class="booking-details">
                    <h4 class="booking-service-name">${booking.serviceName}</h4>
                    <div class="booking-info">
                        <span><i class="fas fa-calendar-alt"></i> ${new Date(booking.date).toLocaleDateString()}</span>
                        <span><i class="fas fa-clock"></i> ${booking.time}</span>
                    </div>
                </div>
                <div class="booking-status status-${booking.status}">
                    ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </div>
            </div>
        `).join('');
    }

    populateFavoriteProviders() {
        const providerList = document.querySelector('#favorite-providers .provider-list');
        if (!providerList) return;

        providerList.innerHTML = customerData.favoriteProviders.map(provider => `
            <div class="provider-card">
                <img src="${provider.imageUrl}" alt="${provider.name}" class="provider-avatar">
                <h5 class="provider-name">${provider.name}</h5>
                <p class="provider-category">${provider.category}</p>
            </div>
        `).join('');
    }

    setupRewardsCircle() {
        const circle = document.querySelector('.progress-ring__circle');
        if (!circle) return;

        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        const points = customerData.metrics.rewardPoints;
        const goal = 2000; // 2000 points for a voucher
        const offset = circumference - (points / goal) * circumference;

        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference;

        // Animate the circle
        setTimeout(() => {
            circle.style.strokeDashoffset = offset;
        }, 500);
    }

    applyDummyAvatars() {
        const avatars = [
            'images/avatars/avatar-1.svg',
            'images/avatars/avatar-2.svg',
            'images/avatars/avatar-3.svg',
            'images/avatars/avatar-4.svg',
            'images/avatars/avatar-5.svg',
            'images/avatars/avatar-6.svg',
            'images/default-avatar.svg'
        ];
        const pick = () => avatars[Math.floor(Math.random() * avatars.length)];
        (async () => {
            try {
                const mod = await import('./supabase.js');
                const { supabase } = mod;
                const { data } = await supabase.auth.getUser();
                const user = data?.user;
                const saved = user?.user_metadata?.avatar_url || null;
                // Header avatar
                const headerAvatar = document.querySelector('.user-profile .avatar');
                if (headerAvatar) headerAvatar.src = saved || pick();
                // Profile summary avatar
                const profileAvatar = document.querySelector('.profile-summary .profile-avatar');
                if (profileAvatar) profileAvatar.src = saved || pick();
            } catch (_) {
                const headerAvatar = document.querySelector('.user-profile .avatar');
                if (headerAvatar) headerAvatar.src = pick();
                const profileAvatar = document.querySelector('.profile-summary .profile-avatar');
                if (profileAvatar) profileAvatar.src = pick();
            }
        })();
        // Any reviewer avatars in lists
        document.querySelectorAll('.reviewer-avatar').forEach(img => img.src = pick());
    }

    async loadDisplayName() {
        try {
            const mod = await import('./supabase.js');
            const { supabase, fetchCurrentProfile } = mod;
            const { data } = await supabase.auth.getUser();
            const user = data?.user;
            const prof = await fetchCurrentProfile().catch(() => null);
            let first = (prof?.first_name || user?.user_metadata?.first_name || '').trim();
            const last = (prof?.last_name || user?.user_metadata?.last_name || '').trim();
            const email = user?.email || prof?.email || '';
            if (!first) first = (email.split('@')[0] || '');
            const display = [first, last].filter(Boolean).join(' ').trim() || 'Customer';
            this.userName = display;
            const nameEl = document.getElementById('customer-name');
            if (nameEl) nameEl.textContent = first || display;
        } catch (_) {
            // ignore
        }
    }
}

new CustomerDashboard();

// Mock data for the dashboard
const customerData = {
    name: "Omar",
    metrics: {
        upcomingBookings: 3,
        favorites: 8,
        rewardPoints: 1250,
        notifications: 2,
    },
    recentBookings: [
        {
            id: 1,
            serviceName: "The Grand Restaurant",
            date: "2025-09-05",
            time: "19:30",
            status: "upcoming",
            imageUrl: "https://via.placeholder.com/150/6366f1/ffffff?text=Restaurant"
        },
        {
            id: 2,
            serviceName: "City Center Hotel",
            date: "2025-08-28",
            time: "14:00 Check-in",
            status: "upcoming",
            imageUrl: "https://via.placeholder.com/150/22d3ee/ffffff?text=Hotel"
        },
        {
            id: 3,
            serviceName: "Quick Ride",
            date: "2025-08-25",
            time: "10:00",
            status: "completed",
            imageUrl: "https://via.placeholder.com/150/f59e0b/ffffff?text=Transport"
        },
    ],
    favoriteProviders: [
        { id: 1, name: "Luxe Salon", category: "Beauty", imageUrl: "https://via.placeholder.com/150/ef4444/ffffff?text=Salon" },
        { id: 2, name: "The Grand Restaurant", category: "Food", imageUrl: "https://via.placeholder.com/150/6366f1/ffffff?text=Restaurant" },
        { id: 3, name: "City Center Hotel", category: "Stays", imageUrl: "https://via.placeholder.com/150/22d3ee/ffffff?text=Hotel" },
        { id: 4, name: "FitZone Gym", category: "Health", imageUrl: "https://via.placeholder.com/150/10b981/ffffff?text=Gym" },
    ]
};
