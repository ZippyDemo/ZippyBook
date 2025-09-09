class GoogleMapsService {
    constructor() {
        this.map = null;
        this.markers = [];
        this.currentLocationMarker = null;
        this.geocoder = new google.maps.Geocoder();
        this.placesService = null;
    }

    initializeMap(containerId, options = {}) {
        const defaultOptions = {
            center: { lat: 0, lng: 0 },
            zoom: 13,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false
        };

        this.map = new google.maps.Map(
            document.getElementById(containerId),
            { ...defaultOptions, ...options }
        );

        this.placesService = new google.maps.places.PlacesService(this.map);
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

    addMarker(location, options = {}) {
        const marker = new google.maps.Marker({
            position: location,
            map: this.map,
            ...options
        });
        this.markers.push(marker);
        return marker;
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    async searchNearbyPlaces(location, type, radius = 5000) {
        return new Promise((resolve, reject) => {
            const request = {
                location: location,
                radius: radius,
                type: type
            };

            this.placesService.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else {
                    reject(new Error(`Places search failed: ${status}`));
                }
            });
        });
    }

    geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK') {
                    resolve(results[0].geometry.location);
                } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        });
    }

    setMapOnLocation(location, zoom = 13) {
        this.map.setCenter(location);
        this.map.setZoom(zoom);
    }
}

// Initialize and export the service
const googleMapsService = new GoogleMapsService();
export default googleMapsService;
