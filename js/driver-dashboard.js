import { DashboardGuard } from './dashboard-guard.js';
import { loadGoogleMaps } from './google-maps-loader.js';

class DriverDashboard {
    constructor() {
        this.guard = new DashboardGuard();
        this.socket = io('/driver');
        this.map = null;
        this.driverMarker = null;
        this.currentDeliveries = new Map();
        this.geocoder = null;
        this.driverLocation = null;
        this.listEl = null;
        this.init();
    }

    init() {
        this.guard.validateAccess();
        this.initializeModernDashboard();
        // Load Google Maps first, then finish init
        loadGoogleMaps().then(() => {
            this.initializeMap();
            this.ensureListContainer();
            this.setupSocketListeners();
            this.setupEventListeners();
            this.startLocationTracking();
            this.addDemoDelivery(); // Add demo delivery for testing
        }).catch(() => {
            // Proceed without map; list UI still works
            this.ensureListContainer();
            this.setupSocketListeners();
            this.setupEventListeners();
            this.addDemoDelivery(); // Add demo delivery for testing
        });
    }

    initializeModernDashboard() {
        // Initialize theme toggle
        this.setupThemeToggle();
        // Initialize stats tracking
        this.initializeStats();
        // Hide empty state initially if there are deliveries
        this.updateEmptyState();
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const html = document.documentElement;
                const currentTheme = html.getAttribute('data-theme') || 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                html.setAttribute('data-theme', newTheme);
                
                // Update icon
                const icon = themeToggle.querySelector('i');
                icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                
                // Save preference
                localStorage.setItem('driver-theme', newTheme);
            });
            
            // Load saved theme
            const savedTheme = localStorage.getItem('driver-theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            const icon = themeToggle.querySelector('i');
            icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    initializeStats() {
        this.stats = {
            earnings: 0,
            deliveries: 0,
            rating: 4.9,
            onlineTime: 0
        };
        this.startTime = Date.now();
        this.updateStatsDisplay();
        
        // Update online time every minute
        setInterval(() => {
            this.updateOnlineTime();
        }, 60000);
    }

    updateStatsDisplay() {
        const earningsEl = document.querySelector('.stat-card.earnings .stat-value');
        const deliveriesEl = document.querySelector('.stat-card.deliveries .stat-value');
        const ratingEl = document.querySelector('.stat-card.rating .stat-value');
        
        if (earningsEl) earningsEl.textContent = `$${this.stats.earnings.toFixed(2)}`;
        if (deliveriesEl) deliveriesEl.textContent = this.currentDeliveries.size.toString();
        if (ratingEl) ratingEl.textContent = this.stats.rating.toFixed(1);
    }

    updateOnlineTime() {
        const elapsed = Date.now() - this.startTime;
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        
        const timeEl = document.querySelector('.stat-card.time .stat-value');
        if (timeEl) timeEl.textContent = `${hours}h ${minutes}m`;
    }

    updateEmptyState() {
        const emptyState = document.getElementById('empty-deliveries');
        if (emptyState) {
            emptyState.style.display = this.currentDeliveries.size === 0 ? 'flex' : 'none';
        }
    }

    // Ensure there is a container to place delivery cards under the driver dashboard content
    ensureListContainer() {
        const content = document.querySelector('#driver-dashboard .dashboard-content');
        if (!content) return;
        this.listEl = content.querySelector('.driver-deliveries');
        if (!this.listEl) {
            this.listEl = document.createElement('div');
            this.listEl.className = 'driver-deliveries';
            content.appendChild(this.listEl);
        }
    }

    setupSocketListeners() {
        this.socket.on('newDelivery', (delivery) => {
            this.addDeliveryToQueue(delivery);
        });

        this.socket.on('deliveryUpdate', (delivery) => {
            this.updateDeliveryStatus(delivery);
        });
    }

    initializeMap() {
        // Use correct element id from dashboard.html
        const el = document.getElementById('delivery-map');
        if (!el || !window.google || !google.maps) return;
        this.map = new google.maps.Map(el, {
            zoom: 13,
            center: { lat: 0, lng: 0 }
        });
        this.geocoder = new google.maps.Geocoder();
        navigator.geolocation.getCurrentPosition(
            pos => this.map && this.map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        );
    }

    startLocationTracking() {
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.watchPosition(
            pos => {
                this.driverLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                this.socket.emit('updateDriverLocation', this.driverLocation);
                this.updateMapMarker(this.driverLocation);
            },
            () => {},
            { enableHighAccuracy: true }
        );
    }

    updateMapMarker(location) {
        if (!this.map || !window.google || !google.maps) return;
        if (!this.driverMarker) {
            this.driverMarker = new google.maps.Marker({ map: this.map, position: location, icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: '#1d4ed8',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            }});
        } else {
            this.driverMarker.setPosition(location);
        }
    }

    // ---------- Location helpers ----------
    toNumber(v) {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
    }

    latLngToString(pos) { return `${pos.lat},${pos.lng}`; }

    placeLink(pos) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.latLngToString(pos))}`;
    }

    routeLink(origin, waypoint, destination) {
        const params = new URLSearchParams({ api: '1', destination: this.latLngToString(destination) });
        if (origin) params.set('origin', this.latLngToString(origin));
        if (waypoint) params.set('waypoints', this.latLngToString(waypoint));
        return `https://www.google.com/maps/dir/?${params.toString()}`;
    }

    reverseGeocode(pos) {
        return new Promise((resolve) => {
            if (!this.geocoder) return resolve(null);
            this.geocoder.geocode({ location: pos }, (res, status) => {
                if (status === 'OK' && res && res[0]) resolve(res[0].formatted_address);
                else resolve(null);
            });
        });
    }

    async updateCardLocations(card) {
        if (!card) return;
        const pLat = this.toNumber(card.dataset.pickupLat);
        const pLng = this.toNumber(card.dataset.pickupLng);
        const dLat = this.toNumber(card.dataset.dropoffLat);
        const dLng = this.toNumber(card.dataset.dropoffLng);
        if ([pLat, pLng, dLat, dLng].some(v => v === null)) return;
        const pickup = { lat: pLat, lng: pLng };
        const dropoff = { lat: dLat, lng: dLng };

        // Open place links
        const pickupOpen = card.querySelector('[data-action="open-pickup"]');
        const dropoffOpen = card.querySelector('[data-action="open-dropoff"]');
        if (pickupOpen) pickupOpen.href = this.placeLink(pickup);
        if (dropoffOpen) dropoffOpen.href = this.placeLink(dropoff);

        // Build navigation URL using driver's current location if available
        const origin = this.driverLocation || pickup;
        card.__navigateUrl = this.routeLink(origin, pickup, dropoff);

        // Addresses: prefer dataset, else reverse geocode and cache
        const pickupAddrEl = card.querySelector('.pickup-address');
        const dropoffAddrEl = card.querySelector('.dropoff-address');
        let pickupAddress = (card.dataset.pickupAddress || '').trim();
        let dropoffAddress = (card.dataset.dropoffAddress || '').trim();
        if (!pickupAddress) {
            pickupAddress = await this.reverseGeocode(pickup) || this.latLngToString(pickup);
            card.dataset.pickupAddress = pickupAddress;
        }
        if (!dropoffAddress) {
            dropoffAddress = await this.reverseGeocode(dropoff) || this.latLngToString(dropoff);
            card.dataset.dropoffAddress = dropoffAddress;
        }
        if (pickupAddrEl) pickupAddrEl.textContent = pickupAddress;
        if (dropoffAddrEl) dropoffAddrEl.textContent = dropoffAddress;
    }

    // ---------- Rendering ----------
    getTemplate(id) {
        const tpl = document.getElementById(id);
        return tpl?.content ? tpl.content : null;
    }

    extractCoordsFromDelivery(delivery) {
        const p = delivery.pickup || delivery.origin || {};
        const d = delivery.dropoff || delivery.destination || {};
        const pickup = {
            lat: p.lat ?? p.latitude ?? delivery.pickupLat ?? delivery.originLat,
            lng: p.lng ?? p.longitude ?? delivery.pickupLng ?? delivery.originLng,
            address: p.address ?? delivery.pickupAddress ?? ''
        };
        const dropoff = {
            lat: d.lat ?? d.latitude ?? delivery.dropoffLat ?? delivery.destinationLat,
            lng: d.lng ?? d.longitude ?? delivery.dropoffLng ?? delivery.destinationLng,
            address: d.address ?? delivery.dropoffAddress ?? ''
        };
        return { pickup, dropoff };
    }

    addDeliveryToQueue(delivery) {
        if (!this.listEl) this.ensureListContainer();
        const tpl = this.getTemplate('delivery-card-template');
        if (!tpl || !this.listEl) return;
        const frag = tpl.cloneNode(true);
        const card = frag.querySelector('.delivery-card');

        const { pickup, dropoff } = this.extractCoordsFromDelivery(delivery);

        // Cache coordinates on the card for the location panel helpers
        const deliveryId = delivery.id || delivery._id || Date.now().toString();
        card.dataset.id = deliveryId;
        if (pickup.lat != null && pickup.lng != null) {
            card.dataset.pickupLat = pickup.lat;
            card.dataset.pickupLng = pickup.lng;
        }
        if (dropoff.lat != null && dropoff.lng != null) {
            card.dataset.dropoffLat = dropoff.lat;
            card.dataset.dropoffLng = dropoff.lng;
        }
        if (pickup.address) card.dataset.pickupAddress = pickup.address;
        if (dropoff.address) card.dataset.dropoffAddress = dropoff.address;

        // Populate visible fields if present
        card.querySelector('.customer-name')?.append(document.createTextNode(delivery.customerName || delivery.name || 'Customer'));
        card.querySelector('.order-number')?.append(document.createTextNode(deliveryId.slice(-6)));
        card.querySelector('.delivery-address')?.append(document.createTextNode(dropoff.address || delivery.address || 'Loading...'));
        card.querySelector('.phone-number')?.append(document.createTextNode(delivery.phone || delivery.phoneNumber || 'N/A'));
        card.querySelector('.delivery-status')?.append(document.createTextNode(delivery.status || 'New'));
        card.querySelector('.pickup-time')?.append(document.createTextNode(delivery.pickupTime || new Date().toLocaleTimeString()));
        card.querySelector('.estimated-delivery')?.append(document.createTextNode(delivery.eta || delivery.estimatedDelivery || '30 min'));

        // Add animation class for new deliveries
        card.classList.add('new-delivery');

        this.listEl.appendChild(frag);
        const appendedCard = this.listEl.lastElementChild;
        this.currentDeliveries.set(deliveryId, appendedCard);
        this.updateCardLocations(appendedCard);
        this.updateStatsDisplay();
        this.updateEmptyState();

        // Remove animation class after animation completes
        setTimeout(() => {
            appendedCard.classList.remove('new-delivery');
        }, 300);
    }

    updateDeliveryStatus(delivery) {
        const id = delivery.id || delivery._id;
        const card = this.currentDeliveries.get(id) || document.querySelector(`.delivery-card[data-id="${CSS.escape(id)}"]`);
        if (!card) return;
        const statusEl = card.querySelector('.delivery-status');
        if (statusEl) statusEl.textContent = delivery.status || statusEl.textContent;
        // Coordinates/address might change
        const { pickup, dropoff } = this.extractCoordsFromDelivery(delivery);
        if (pickup.lat != null && pickup.lng != null) { card.dataset.pickupLat = pickup.lat; card.dataset.pickupLng = pickup.lng; }
        if (dropoff.lat != null && dropoff.lng != null) { card.dataset.dropoffLat = dropoff.lat; card.dataset.dropoffLng = dropoff.lng; }
        if (pickup.address) card.dataset.pickupAddress = pickup.address;
        if (dropoff.address) card.dataset.dropoffAddress = dropoff.address;
        this.updateCardLocations(card);
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.delivery-card');
            if (!card) return;

            // Open navigation (driver -> pickup -> dropoff)
            if (e.target.closest('.btn-navigate') || e.target.closest('.primary-btn')) {
                const url = card.__navigateUrl;
                if (url) window.open(url, '_blank', 'noopener');
                return;
            }

            // Phone call functionality
            if (e.target.closest('.action-btn') && e.target.closest('.info-item')) {
                const phoneNumber = card.querySelector('.phone-number')?.textContent?.trim();
                if (phoneNumber && phoneNumber !== 'N/A') {
                    window.location.href = `tel:${phoneNumber}`;
                }
                return;
            }

            // Location panel actions
            const copyPickup = e.target.closest('[data-action="copy-pickup"]');
            if (copyPickup) {
                const text = card.dataset.pickupAddress || card.querySelector('.pickup-address')?.textContent?.trim();
                this.copyToClipboard(text);
                this.showToast('Pickup address copied!');
                return;
            }
            const copyDrop = e.target.closest('[data-action="copy-dropoff"]');
            if (copyDrop) {
                const text = card.dataset.dropoffAddress || card.querySelector('.dropoff-address')?.textContent?.trim();
                this.copyToClipboard(text);
                this.showToast('Delivery address copied!');
                return;
            }
        });

        // Map control buttons
        document.getElementById('center-location')?.addEventListener('click', () => {
            if (this.driverLocation && this.map) {
                this.map.setCenter(this.driverLocation);
                this.map.setZoom(15);
            }
        });

        document.getElementById('toggle-traffic')?.addEventListener('click', (e) => {
            if (this.map && window.google && google.maps) {
                if (!this.trafficLayer) {
                    this.trafficLayer = new google.maps.TrafficLayer();
                }
                
                if (this.trafficLayer.getMap()) {
                    this.trafficLayer.setMap(null);
                    e.target.classList.remove('active');
                } else {
                    this.trafficLayer.setMap(this.map);
                    e.target.classList.add('active');
                }
            }
        });
    }

    showToast(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--driver-success);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-weight: 500;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Add demo delivery for testing
    addDemoDelivery() {
        const demoDelivery = {
            id: 'demo-001',
            customerName: 'John Smith',
            phone: '+1 (555) 123-4567',
            status: 'Ready for Pickup',
            pickupTime: new Date().toLocaleTimeString(),
            eta: '25 min',
            pickup: {
                lat: 40.7589,
                lng: -73.9851,
                address: "Central Park, New York, NY 10024"
            },
            dropoff: {
                lat: 40.7505,
                lng: -73.9934,
                address: "Times Square, New York, NY 10036"
            }
        };
        
        // Add after a short delay to show the animation
        setTimeout(() => {
            this.addDeliveryToQueue(demoDelivery);
        }, 1000);
    }

    copyToClipboard(text) {
        if (!text) return;
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch(_) {}
            document.body.removeChild(ta);
        }
    }
}

new DriverDashboard();
