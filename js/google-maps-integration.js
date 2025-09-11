import { loadGoogleMaps } from './google-maps-loader.js';

class GoogleMapsService {
    constructor() {
        this.map = null;
        this.markers = [];
        this.currentLocationMarker = null;
        this.geocoder = null;
        this.placesService = null;
        this._maps = null;
    }

    async ensureApi() {
        if (this._maps) return this._maps;
        this._maps = await loadGoogleMaps({ libraries: ['places'] });
        if (!this.geocoder) this.geocoder = new this._maps.Geocoder();
        return this._maps;
    }

    async initializeMap(containerId, options = {}) {
        const maps = await this.ensureApi();
        const defaultOptions = {
            center: { lat: 0, lng: 0 },
            zoom: 13,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false
        };

        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Map container not found: ${containerId}`);
        this.map = new maps.Map(el, { ...defaultOptions, ...options });
        this.placesService = new maps.places.PlacesService(this.map);
        return this.map;
    }

    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    resolve(location);
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    async addMarker(location, options = {}) {
        const maps = await this.ensureApi();
        if (!this.map) throw new Error('Map is not initialized');
        const marker = new maps.Marker({
            position: location,
            map: this.map,
            ...options
        });
        this.markers.push(marker);
        return marker;
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.setMap && marker.setMap(null));
        this.markers = [];
    }

    async searchNearbyPlaces(location, type, radius = 5000) {
        await this.ensureApi();
        if (!this.placesService) throw new Error('Places service is not initialized');
        return new Promise((resolve, reject) => {
            const request = { location, radius, type };
            this.placesService.nearbySearch(request, (results, status) => {
                const ok = (window.google && window.google.maps && window.google.maps.places && window.google.maps.places.PlacesServiceStatus && status === window.google.maps.places.PlacesServiceStatus.OK);
                if (ok) {
                    resolve(results);
                } else {
                    reject(new Error(`Places search failed: ${status}`));
                }
            });
        });
    }

    async geocodeAddress(address) {
        const maps = await this.ensureApi();
        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK') {
                    resolve(results[0].geometry.location);
                } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        });
    }

    async setMapOnLocation(location, zoom = 13) {
        await this.ensureApi();
        if (!this.map) return;
        this.map.setCenter(location);
        this.map.setZoom(zoom);
    }
}

// Initialize and export the service
const googleMapsService = new GoogleMapsService();
export default googleMapsService;
