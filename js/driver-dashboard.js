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
        // Load Google Maps first, then finish init
        loadGoogleMaps().then(() => {
            this.initializeMap();
            this.ensureListContainer();
            this.setupSocketListeners();
            this.setupEventListeners();
            this.startLocationTracking();
        }).catch(() => {
            // Proceed without map; list UI still works
            this.ensureListContainer();
            this.setupSocketListeners();
            this.setupEventListeners();
        });
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
        card.dataset.id = delivery.id || delivery._id || '';
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
        card.querySelector('.customer-name')?.append(document.createTextNode(delivery.customerName || delivery.name || ''));
        card.querySelector('.delivery-address')?.append(document.createTextNode(dropoff.address || delivery.address || ''));
        card.querySelector('.phone-number')?.append(document.createTextNode(delivery.phone || delivery.phoneNumber || ''));
        card.querySelector('.delivery-status')?.append(document.createTextNode(delivery.status || 'New'));
        card.querySelector('.pickup-time')?.append(document.createTextNode(delivery.pickupTime || ''));
        card.querySelector('.estimated-delivery')?.append(document.createTextNode(delivery.eta || delivery.estimatedDelivery || ''));

        this.listEl.appendChild(frag);
        const appendedCard = this.listEl.lastElementChild;
        this.currentDeliveries.set(card.dataset.id, appendedCard);
        this.updateCardLocations(appendedCard);
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
            if (e.target.closest('.btn-navigate')) {
                const url = card.__navigateUrl;
                if (url) window.open(url, '_blank', 'noopener');
                return;
            }

            // Location panel actions
            const copyPickup = e.target.closest('[data-action="copy-pickup"]');
            if (copyPickup) {
                const text = card.dataset.pickupAddress || card.querySelector('.pickup-address')?.textContent?.trim();
                this.copyToClipboard(text);
                return;
            }
            const copyDrop = e.target.closest('[data-action="copy-dropoff"]');
            if (copyDrop) {
                const text = card.dataset.dropoffAddress || card.querySelector('.dropoff-address')?.textContent?.trim();
                this.copyToClipboard(text);
                return;
            }
        });
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
