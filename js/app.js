// Update app.js to integrate Google Maps functionality

import { DriverManager } from './driver.js';
import DeliverySystem from './delivery-system.js';
import BusinessAdsManager from './business-ads.js';
import googleMapsService from './google-maps-integration.js';
import { Auth } from './auth.js';
import { DashboardManager } from './dashboard-manager.js';
import { getUserLatLng, haversineDistance, ensureCoordinatesForAll } from './location-utils.js';

const auth = new Auth();

// Crypto submenu functionality
document.addEventListener('DOMContentLoaded', function() {
    const cryptoBtn = document.getElementById('crypto-dropdown-btn');
    const cryptoSubmenu = document.getElementById('crypto-submenu');

    cryptoBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        cryptoSubmenu.classList.toggle('active');
    });

    // Close submenu when clicking outside
    document.addEventListener('click', function(e) {
        if (!cryptoBtn.contains(e.target) && !cryptoSubmenu.contains(e.target)) {
            cryptoSubmenu.classList.remove('active');
        }
    });

    // Handle crypto option selection
    const cryptoOptions = document.querySelectorAll('.crypto-option-btn');
    cryptoOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Handle crypto selection here
            cryptoSubmenu.classList.remove('active');
        });
    });
});

// Enhance the App class with location features
class App {
  constructor() {
    this.services = [];
    this.bookings = [];
    this.currentUser = null;
    this.isLoggedIn = false;
    
    // Initialize components
    this.navigation = new Navigation(this);
    this.auth = new Authentication(this);
    this.bookingSystem = new BookingSystem(this);
    this.notifications = new NotificationSystem(this);
    this.dashboardManager = new DashboardManager();
    
    // Initialize location-related properties
    this.userLocation = null;
    this.savedLocations = [];
    
    this.init();
  }
  
  init() {
    // Load mock data
    this.loadMockData();
    
    // Initialize UI
    this.initUI();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Location is initialized by index.html maps module; subscribe to updates instead of duplicating geolocation
    window.addEventListener('user-location-changed', (e) => {
      this.userLocation = e.detail || this.userLocation;
      try { this.updateNearbyServices(); } catch (_) {}
    });
    // Re-evaluate nearby cards when viewport crosses desktop/mobile
    if (window.matchMedia) {
      const mq = window.matchMedia('(min-width: 1024px)');
      const handler = () => { try { this.updateNearbyServices(); } catch (_) {} };
      mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
    }
    
    console.log('App initialized');
  }
  
  loadMockData() {
    // Load mock services data
    this.services = [
      {
        id: 1,
        name: 'Gourmet Bistro',
        category: 'restaurants',
        subcategory: 'Fine Dining',
        rating: 4.8,
        ratingCount: 243,
        price: '$$',
        image: 'https://source.unsplash.com/random/300x200/?restaurant',
        location: '123 Culinary Ave, New York, NY',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        description: 'Experience exquisite dining with our chef\'s special menu featuring seasonal ingredients and creative culinary techniques.',
        amenities: ['Outdoor Seating', 'Vegan Options', 'Full Bar', 'Wheelchair Accessible'],
        openingHours: {
          monday: '11:00 AM - 10:00 PM',
          tuesday: '11:00 AM - 10:00 PM',
          wednesday: '11:00 AM - 10:00 PM',
          thursday: '11:00 AM - 11:00 PM',
          friday: '11:00 AM - 12:00 AM',
          saturday: '10:00 AM - 12:00 AM',
          sunday: '10:00 AM - 9:00 PM'
        },
        featured: true
      },
      {
        id: 2,
        name: 'Luxe Salon & Spa',
        category: 'salons',
        subcategory: 'Hair & Beauty',
        rating: 4.6,
        ratingCount: 189,
        price: '$$$',
        image: 'https://source.unsplash.com/random/300x200/?salon',
        location: '456 Beauty Blvd, Los Angeles, CA',
        coordinates: { lat: 34.0522, lng: -118.2437 },
        description: 'Indulge in premium beauty treatments and hair styling services in our luxurious and relaxing environment.',
        amenities: ['Free Wifi', 'Complimentary Beverages', 'Product Shop', 'Wheelchair Accessible'],
        openingHours: {
          monday: '9:00 AM - 7:00 PM',
          tuesday: '9:00 AM - 7:00 PM',
          wednesday: '9:00 AM - 7:00 PM',
          thursday: '9:00 AM - 8:00 PM',
          friday: '9:00 AM - 8:00 PM',
          saturday: '8:00 AM - 6:00 PM',
          sunday: 'Closed'
        },
        featured: true
      },
      {
        id: 3,
        name: 'Grand Plaza Hotel',
        category: 'hotels',
        subcategory: 'Luxury',
        rating: 4.9,
        ratingCount: 512,
        price: '$$$$',
        image: 'https://source.unsplash.com/random/300x200/?hotel',
        location: '789 Luxury Lane, Chicago, IL',
        coordinates: { lat: 41.8781, lng: -87.6298 },
        description: 'Experience unparalleled luxury and comfort in our 5-star hotel with stunning city views and world-class amenities.',
        amenities: ['Swimming Pool', 'Spa', 'Fitness Center', 'Room Service', 'Free Wifi', 'Restaurant', 'Bar'],
        openingHours: {
          monday: 'Open 24 Hours',
          tuesday: 'Open 24 Hours',
          wednesday: 'Open 24 Hours',
          thursday: 'Open 24 Hours',
          friday: 'Open 24 Hours',
          saturday: 'Open 24 Hours',
          sunday: 'Open 24 Hours'
        },
        featured: true
      },
      {
        id: 4,
        name: 'City Express Limo',
        category: 'transport',
        subcategory: 'Luxury Transport',
        rating: 4.7,
        ratingCount: 156,
        price: '$$$',
        image: 'https://source.unsplash.com/random/300x200/?limousine',
        location: '101 Transit Way, San Francisco, CA',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        description: 'Professional and reliable luxury transportation services for any occasion with experienced chauffeurs.',
        amenities: ['Airport Pickup', 'Corporate Events', 'Wedding Services', 'Hourly Rental'],
        openingHours: {
          monday: 'Open 24 Hours',
          tuesday: 'Open 24 Hours',
          wednesday: 'Open 24 Hours',
          thursday: 'Open 24 Hours',
          friday: 'Open 24 Hours',
          saturday: 'Open 24 Hours',
          sunday: 'Open 24 Hours'
        },
        featured: false
      },
      {
        id: 5,
        name: 'Wellness Center',
        category: 'health',
        subcategory: 'Wellness & Fitness',
        rating: 4.5,
        ratingCount: 203,
        price: '$$',
        image: 'https://source.unsplash.com/random/300x200/?wellness',
        location: '222 Health Street, Miami, FL',
        coordinates: { lat: 25.7617, lng: -80.1918 },
        description: 'Comprehensive wellness services including massage therapy, acupuncture, nutrition counseling, and fitness classes.',
        amenities: ['Sauna', 'Yoga Studio', 'Meditation Room', 'Nutritionist Consultation'],
        openingHours: {
          monday: '6:00 AM - 9:00 PM',
          tuesday: '6:00 AM - 9:00 PM',
          wednesday: '6:00 AM - 9:00 PM',
          thursday: '6:00 AM - 9:00 PM',
          friday: '6:00 AM - 8:00 PM',
          saturday: '8:00 AM - 6:00 PM',
          sunday: '8:00 AM - 4:00 PM'
        },
        featured: false
      },
      {
        id: 6,
        name: 'Summer Music Festival',
        category: 'events',
        subcategory: 'Music Festival',
        rating: 4.8,
        ratingCount: 342,
        price: '$$$',
        image: 'https://source.unsplash.com/random/300x200/?concert',
        location: '333 Festival Grounds, Austin, TX',
        coordinates: { lat: 30.2672, lng: -97.7431 },
        description: 'Three-day music festival featuring top artists across multiple genres with food vendors, art installations, and more.',
        amenities: ['Multiple Stages', 'Food & Drink', 'VIP Areas', 'Camping Options'],
        openingHours: {
          friday: '12:00 PM - 11:00 PM',
          saturday: '12:00 PM - 11:00 PM',
          sunday: '12:00 PM - 10:00 PM'
        },
        featured: true
      }
    ];
    
    // Add coordinates to all services if not present
    this.services.forEach(service => {
      if (!service.coordinates) {
        // Generate random coordinates near New York as fallback
        const lat = 40.7128 + (Math.random() - 0.5) * 0.1;
        const lng = -74.0060 + (Math.random() - 0.5) * 0.1;
        service.coordinates = { lat, lng };
      }
    });
    
    // Load mock bookings data
    this.bookings = [
      {
        id: 1,
        serviceId: 1,
        userId: 'user123',
        date: '2025-05-15',
        time: '19:00',
        guests: 2,
        status: 'confirmed',
        notes: 'Window seat preferred',
        location: '123 Culinary Ave, New York, NY',
        userLocation: '456 User St, New York, NY'
      },
      {
        id: 2,
        serviceId: 2,
        userId: 'user123',
        date: '2025-05-20',
        time: '14:00',
        guests: 1,
        status: 'confirmed',
        notes: 'First time visit',
        location: '456 Beauty Blvd, Los Angeles, CA',
        userLocation: '789 User Ave, Los Angeles, CA'
      }
    ];
    
    // Load mock saved locations
    this.savedLocations = [
      {
        id: 1,
        name: 'Home',
        address: '123 Main St, Anytown, USA',
        type: 'home',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      {
        id: 2,
        name: 'Work',
        address: '456 Office Blvd, Business City, USA',
        type: 'work',
        coordinates: { lat: 40.7580, lng: -73.9855 }
      }
    ];
  }
  
  initUI() {
    // Populate featured services
    this.populateFeaturedServices();
    
    // Populate popular services
    this.populatePopularServices();
    
    // Initialize service provider dashboard
    this.initServiceProviderDashboard();
  }
  
  setupEventListeners() {
    // Navigation event listeners
    // Only handle links that actually have a data-page; ignore dropdown toggles like "Account"
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const page = link?.dataset?.page;
        if (!page) {
          // Let non-routing nav links (e.g., dropdown toggles) behave normally
          return;
        }
        e.preventDefault();
        this.navigation.navigateTo(page);
      });
    });
    
    // Login/Signup buttons (guarded: these IDs may not exist on all pages)
    const topLoginBtn = document.getElementById('loginBtn');
    if (topLoginBtn) {
      topLoginBtn.addEventListener('click', () => this.auth.showLoginModal());
    }
    const topSignupBtn = document.getElementById('signupBtn');
    if (topSignupBtn) {
      topSignupBtn.addEventListener('click', () => this.auth.showSignupModal());
    }
    
    // Switch between login and signup
    document.getElementById('switchToSignup').addEventListener('click', (e) => {
      e.preventDefault();
      this.auth.showSignupModal();
    });
    
    document.getElementById('switchToLogin').addEventListener('click', (e) => {
      e.preventDefault();
      this.auth.showLoginModal();
    });
    
    // Close modals
    document.querySelectorAll('.modal-close, .close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal.active').forEach(modal => {
          modal.classList.remove('active');
        });
      });
    });
    
    // Modal background click to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        btn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
      });
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        this.filterServicesByCategory(category);
      });
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.querySelector('.search-btn');
    
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) {
        this.searchServices(query);
      }
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          this.searchServices(query);
        }
      }
    });
    
    // Current location button is wired in index.html maps module to avoid double-binding
    
    // Map view toggle
    const mapViewToggleBtns = document.querySelectorAll('.map-view-toggle button');
    mapViewToggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.toggleMapView(view);
        
        // Update active button
        mapViewToggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    // Saved locations
    const addLocationBtn = document.querySelector('.add-location-btn');
    if (addLocationBtn) {
      addLocationBtn.addEventListener('click', () => {
        this.showAddLocationModal();
      });
    }
    
    // Account navigation
    document.querySelectorAll('.account-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.showAccountSection(section);
      });
    });
    
    document.querySelector('.login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const role = document.getElementById('loginRole')?.value || 'customer';
      
      try {
          await auth.login(email, password, role);
      } catch (error) {
          showError('Login failed. Please check your credentials.');
      }
    });
    
    // Check authentication status on page load
    document.addEventListener('DOMContentLoaded', () => {
        if (auth.isAuthenticated()) {
            const userRole = localStorage.getItem('userRole');
            auth.redirectToDashboard(userRole);
        }
    });
    
    // Logout handler
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logout();
    });

    function showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        document.querySelector('.toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
  }
  
  // Location-related methods are handled by maps module; app listens for updates via 'user-location-changed'
  
  updateNearbyServices() {
    // Intentionally do NOT render any cards below the map.
    // This prevents mock/placeholder businesses from appearing in mobile view (e.g., on GitHub Pages).
    const nearbySection = document.querySelector('.nearby-section');
    const serviceCardsContainer = nearbySection?.querySelector('.service-cards');
    if (serviceCardsContainer) serviceCardsContainer.innerHTML = '';
    return;
  }
  
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  }
  
  deg2rad(deg) {
    return deg * (Math.PI/180);
  }
  
  showAddLocationModal() {
    const modal = document.getElementById('add-location-modal');
    if (modal) {
      modal.classList.add('active');
      
      // Initialize map preview if Google Maps API is loaded
      if (window.google && window.google.maps) {
        const mapPreview = document.getElementById('location-map-preview');
        if (mapPreview) {
          const map = new google.maps.Map(mapPreview, {
            center: this.userLocation || { lat: 40.7128, lng: -74.0060 },
            zoom: 13
          });
          
          // Add marker for current location
          if (this.userLocation) {
            new google.maps.Marker({
              position: this.userLocation,
              map: map,
              title: 'Your Location'
            });
          }
          
          // Initialize autocomplete for address input
          const addressInput = document.getElementById('locationAddress');
          if (addressInput) {
            const autocomplete = new google.maps.places.Autocomplete(addressInput);
            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (place.geometry) {
                map.setCenter(place.geometry.location);
                
                // Add marker
                new google.maps.Marker({
                  position: place.geometry.location,
                  map: map,
                  title: place.name
                });
              }
            });
          }
        }
      }
      
      // Set up form submission
      const form = modal.querySelector('.add-location-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveNewLocation();
        });
      }
      
      // Cancel button
      const cancelBtn = document.getElementById('cancel-add-location');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
    }
  }
  
  saveNewLocation() {
    const nameInput = document.getElementById('locationName');
    const addressInput = document.getElementById('locationAddress');
    const typeInputs = document.querySelectorAll('input[name="locationType"]');
    
    if (!nameInput || !addressInput) return;
    
    const name = nameInput.value.trim();
    const address = addressInput.value.trim();
    let type = 'other';
    
    // Get selected type
    typeInputs.forEach(input => {
      if (input.checked) {
        type = input.value;
      }
    });
    
    if (!name || !address) {
      this.notifications.show('Please fill in all fields', 'error');
      return;
    }
    
    // Get coordinates from address using Google Maps Geocoding
    if (window.google && window.google.maps) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          const coordinates = { 
            lat: location.lat(), 
            lng: location.lng() 
          };
          
          // Create new location object
          const newLocation = {
            id: this.savedLocations.length + 1,
            name,
            address,
            type,
            coordinates
          };
          
          // Add to saved locations
          this.savedLocations.push(newLocation);
          
          // Update UI
          this.updateSavedLocationsUI();
          
          // Close modal
          const modal = document.getElementById('add-location-modal');
          if (modal) {
            modal.classList.remove('active');
          }
          
          this.notifications.show('Location saved successfully', 'success');
        } else {
          this.notifications.show('Could not geocode address. Please try again.', 'error');
        }
      });
    } else {
      // Fallback if Google Maps API not loaded
      const newLocation = {
        id: this.savedLocations.length + 1,
        name,
        address,
        type,
        coordinates: this.userLocation || { lat: 40.7128, lng: -74.0060 }
      };
      
      // Add to saved locations
      this.savedLocations.push(newLocation);
      
      // Update UI
      this.updateSavedLocationsUI();
      
      // Close modal
      const modal = document.getElementById('add-location-modal');
      if (modal) {
        modal.classList.remove('active');
      }
      
      this.notifications.show('Location saved successfully', 'success');
    }
  }
  
  updateSavedLocationsUI() {
    const locationList = document.querySelector('.saved-location-list');
    if (!locationList) return;
    
    locationList.innerHTML = '';
    
    this.savedLocations.forEach(location => {
      const locationItem = document.createElement('div');
      locationItem.className = 'saved-location-item';
      
      let iconClass = 'fa-map-marker-alt';
      if (location.type === 'home') iconClass = 'fa-home';
      if (location.type === 'work') iconClass = 'fa-briefcase';
      if (location.type === 'favorite') iconClass = 'fa-heart';
      
      locationItem.innerHTML = `
        <div class="location-icon">
          <i class="fas ${iconClass}"></i>
        </div>
        <div class="location-details">
          <h4>${location.name}</h4>
          <p>${location.address}</p>
        </div>
        <div class="location-actions">
          <button class="btn btn-outline btn-sm edit-location" data-id="${location.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline btn-sm delete-location" data-id="${location.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      
      locationList.appendChild(locationItem);
      
      // Add event listeners
      const editBtn = locationItem.querySelector('.edit-location');
      const deleteBtn = locationItem.querySelector('.delete-location');
      
      editBtn.addEventListener('click', () => {
        this.editLocation(location.id);
      });
      
      deleteBtn.addEventListener('click', () => {
        this.deleteLocation(location.id);
      });
    });
  }
  
  editLocation(locationId) {
    const location = this.savedLocations.find(loc => loc.id === locationId);
    if (!location) return;
    
    // Show add location modal with pre-filled data
    const modal = document.getElementById('add-location-modal');
    if (modal) {
      // Pre-fill form
      const nameInput = document.getElementById('locationName');
      const addressInput = document.getElementById('locationAddress');
      const typeInputs = document.querySelectorAll('input[name="locationType"]');
      
      if (nameInput) nameInput.value = location.name;
      if (addressInput) addressInput.value = location.address;
      
      typeInputs.forEach(input => {
        if (input.value === location.type) {
          input.checked = true;
        }
      });
      
      // Show modal
      modal.classList.add('active');
      
      // Initialize map preview
      if (window.google && window.google.maps) {
        const mapPreview = document.getElementById('location-map-preview');
        if (mapPreview) {
          const map = new google.maps.Map(mapPreview, {
            center: location.coordinates,
            zoom: 15
          });
          
          // Add marker
          new google.maps.Marker({
            position: location.coordinates,
            map: map,
            title: location.name
          });
        }
      }
      
      // Update form submission to edit instead of add
      const form = modal.querySelector('.add-location-form');
      if (form) {
        // Remove existing event listeners
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        
        // Add new event listener
        newForm.addEventListener('submit', (e) => {
          e.preventDefault();
          
          // Update location
          location.name = nameInput.value.trim();
          location.address = addressInput.value.trim();
          
          typeInputs.forEach(input => {
            if (input.checked) {
              location.type = input.value;
            }
          });
          
          // Update UI
          this.updateSavedLocationsUI();
          
          // Close modal
          modal.classList.remove('active');
          
          this.notifications.show('Location updated successfully', 'success');
        });
      }
      
      // Cancel button
      const cancelBtn = document.getElementById('cancel-add-location');
      if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newCancelBtn.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
    }
  }
  
  deleteLocation(locationId) {
    // Confirm deletion
    if (confirm('Are you sure you want to delete this location?')) {
      // Remove location from array
      this.savedLocations = this.savedLocations.filter(loc => loc.id !== locationId);
      
      // Update UI
      this.updateSavedLocationsUI();
      
      this.notifications.show('Location deleted successfully', 'success');
    }
  }
  
  toggleMapView(view) {
    const listView = document.querySelector('.list-view');
    const mapView = document.querySelector('.map-view');
    
    if (!listView || !mapView) return;
    
    if (view === 'list') {
      listView.classList.add('active');
      mapView.classList.remove('active');
    } else if (view === 'map') {
      listView.classList.remove('active');
      mapView.classList.add('active');
      
      // Initialize map if not already initialized
      this.initializeExploreMap();
    }
  }
  
  initializeExploreMap() {
    const mapContainer = document.getElementById('explore-map');
    if (!mapContainer) return;
    
    // Check if map already initialized
    if (mapContainer.dataset.initialized === 'true') return;
    
    // Check if Google Maps API is loaded
    if (window.google && window.google.maps) {
      // Create map
      const map = new google.maps.Map(mapContainer, {
        center: this.userLocation || { lat: 40.7128, lng: -74.0060 },
        zoom: 12,
        gestureHandling: 'greedy'
      });
      
      // Add markers for services
      this.services.forEach(service => {
        const marker = new google.maps.Marker({
          position: service.coordinates,
          map: map,
          title: service.name,
          animation: google.maps.Animation.DROP
        });
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="map-info-window">
              <h3>${service.name}</h3>
              <p>${service.category} • ${service.price}</p>
              <p>${service.location}</p>
              <div class="stars">
                ${this.getStarsHTML(service.rating)}
                <span>${service.rating} (${service.ratingCount})</span>
              </div>
              <button class="btn btn-primary btn-sm view-service" 
                onclick="window.app.viewServiceDetail(${service.id})">
                View Details
              </button>
            </div>
          `
        });
        
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });
      
      // Add user location marker if available
      if (this.userLocation) {
        new google.maps.Marker({
          position: this.userLocation,
          map: map,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
      }
      
      // Mark as initialized
      mapContainer.dataset.initialized = 'true';
    } else {
      // If Google Maps API not loaded yet, show message
      mapContainer.innerHTML = `
        <div class="map-loading">
          <p>Loading map...</p>
        </div>
      `;
      
      // Try again in 1 second
      setTimeout(() => {
        this.initializeExploreMap();
      }, 1000);
    }
  }
  
  // Service-related methods
  populateFeaturedServices() {
    // The featured businesses carousel is now handled by the FeaturedBusinesses module
    // This method can be kept for backward compatibility or removed
    console.log('Featured businesses are now handled by the FeaturedBusinesses module');
  }
  
  populatePopularServices() {
    const popularContainer = document.querySelector('.popular-section .service-cards');
    if (!popularContainer) return;
    
    // Sort by rating
    const popularServices = [...this.services]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
    
    popularServices.forEach(service => {
      const serviceCard = this.createServiceCard(service);
      popularContainer.appendChild(serviceCard);
    });
  }

  // Build the Explore list with nearest items first using both services and businesses
  async populateExploreListNearest() {
    const serviceList = document.querySelector('.service-list');
    if (!serviceList) return;

    // Compose combined list
    let businesses = [];
    if (window.featuredBusinessesInstance) {
      // If carousel is showing mock (filler) data, do not include in Explore
      const fbi = window.featuredBusinessesInstance;
      businesses = fbi.isMockData ? [] : (fbi.businesses || []);
    }
    const combined = [...this.services, ...businesses];
    try { await ensureCoordinatesForAll(combined); } catch (_) {}
    const userLoc = await getUserLatLng();
    const enriched = combined.map(item => {
      const coords = item.coordinates;
      const distance = (userLoc && coords) ? haversineDistance(userLoc.lat, userLoc.lng, coords.lat, coords.lng) : null;
      return { ...item, distance };
    }).sort((a, b) => {
      if (a.distance == null && b.distance == null) return (b.rating || 0) - (a.rating || 0);
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });

    serviceList.innerHTML = '';
    enriched.forEach(item => {
      if (item.featured_image_url) {
        const businessLike = { ...item };
        if (typeof item.distance === 'number' && typeof item.__distance !== 'number') {
          businessLike.__distance = item.distance;
        }
        const card = window.categoryIntegration?.createBusinessServiceCard
          ? window.categoryIntegration.createBusinessServiceCard(businessLike)
          : (() => { const d = document.createElement('div'); d.textContent = item.name; return d; })();
        serviceList.appendChild(card);
      } else {
        const card = this.createServiceCard(item);
        serviceList.appendChild(card);
      }
    });
  }
  
  createServiceCard(service) {
    const template = document.getElementById('service-card-template');
    if (!template) return document.createElement('div');
    
    const card = template.content.cloneNode(true);
    
    // Set service data
    card.querySelector('.service-name').textContent = service.name;
    card.querySelector('.service-category').textContent = service.subcategory || service.category;
    card.querySelector('.service-location').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${service.location}`;
    card.querySelector('.service-price').textContent = service.price;
    card.querySelector('.service-image img').src = service.image;
    card.querySelector('.service-image img').alt = service.name;
    
    // Set rating stars
    card.querySelector('.stars').innerHTML = this.getStarsHTML(service.rating);
    card.querySelector('.rating-count').textContent = `(${service.ratingCount})`;
    
    // Add badge if featured
    if (service.featured) {
      card.querySelector('.service-badge').textContent = 'Featured';
      card.querySelector('.service-badge').classList.add('featured');
    } else {
      card.querySelector('.service-badge').remove();
    }
    
    // Add click event
    const serviceCard = card.querySelector('.service-card');
    serviceCard.addEventListener('click', () => {
      this.viewServiceDetail(service.id);
    });
    
    // Add distance if available
    if (service.distance !== undefined) {
      const distanceElement = document.createElement('p');
      distanceElement.className = 'service-distance';
      distanceElement.innerHTML = `<i class="fas fa-route"></i> ${service.distance.toFixed(1)} km away`;
      serviceCard.querySelector('.service-info').appendChild(distanceElement);
    }
    
    return serviceCard;
  }
  
  getStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHTML = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fas fa-star"></i>';
    }
    
    // Half star
    if (halfStar) {
      starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="far fa-star"></i>';
    }
    
    return starsHTML;
  }
  
  async filterServicesByCategory(category) {
    // Navigate to explore page
    this.navigation.navigateTo('explore');
    
    // Update category checkboxes
    const categoryCheckboxes = document.querySelectorAll('.filter-sidebar input[type="checkbox"]');
    categoryCheckboxes.forEach(checkbox => {
      checkbox.checked = checkbox.value === category;
    });
    
    // Filter services from app's mock data
    const filteredServices = this.services.filter(service => service.category === category);

    // Also get real businesses from FeaturedBusinesses if available
    let realBusinesses = [];
    if (window.featuredBusinessesInstance && window.featuredBusinessesInstance.isMockData !== true) {
      realBusinesses = window.featuredBusinessesInstance.getBusinessesByCategory(category);
    }

    // Combine and ensure coordinates, then sort by distance
    const allFilteredServices = [...filteredServices, ...realBusinesses];
    try { await ensureCoordinatesForAll(allFilteredServices); } catch (_) {}
    const userLoc = await getUserLatLng();
    const enriched = allFilteredServices.map(item => {
      const coords = item.coordinates;
      const distance = (userLoc && coords) ? haversineDistance(userLoc.lat, userLoc.lng, coords.lat, coords.lng) : null;
      return { ...item, distance };
    }).sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
    
    // Update service list
    const serviceList = document.querySelector('.service-list');
    if (serviceList) {
      serviceList.innerHTML = '';
      
      if (enriched.length === 0) {
        serviceList.innerHTML = `
          <div class="empty-state">
            <p>No services found in this category</p>
          </div>
        `;
      } else {
        enriched.forEach(item => {
          // If this looks like a business profile (from FeaturedBusinesses), use that card renderer
          if (item.featured_image_url) {
            // Ensure __distance for the business card template
            const businessLike = { ...item };
            if (typeof item.distance === 'number' && typeof item.__distance !== 'number') {
              businessLike.__distance = item.distance;
            }
            const card = window.categoryIntegration?.createBusinessServiceCard
              ? window.categoryIntegration.createBusinessServiceCard(businessLike)
              : (() => { const d = document.createElement('div'); d.textContent = item.name; return d; })();
            serviceList.appendChild(card);
          } else {
            const card = this.createServiceCard(item);
            serviceList.appendChild(card);
          }
        });
      }
    }
    
    // Show notification
    this.notifications.show(`Showing ${enriched.length} ${category} services (nearest first)`, 'info');
  }
  
  async searchServices(query) {
    // Navigate to explore page
    this.navigation.navigateTo('explore');

    const q = query.toLowerCase();
    const fromApp = this.services.filter(service => {
      const searchString = `${service.name} ${service.category} ${service.subcategory || ''} ${service.location || ''}`.toLowerCase();
      return searchString.includes(q);
    });
    let fromBusinesses = [];
    if (window.featuredBusinessesInstance) {
      // match on name, category, description, address
      fromBusinesses = window.featuredBusinessesInstance.businesses.filter(b => {
        const s = `${b.name} ${b.category} ${b.displayCategory || ''} ${b.description || ''} ${b.address || ''}`.toLowerCase();
        return s.includes(q);
      });
    }

    // Combine and ensure coordinates for distance
    const combined = [...fromApp, ...fromBusinesses];
    try { await ensureCoordinatesForAll(combined); } catch (_) {}
    const userLoc = await getUserLatLng();
    const enriched = combined.map(item => {
      const coords = item.coordinates || item.coordinates; // same key
      const distance = (userLoc && coords) ? haversineDistance(userLoc.lat, userLoc.lng, coords.lat, coords.lng) : null;
      return { ...item, distance };
    });
    // Sort nearest first, then by rating if available
    enriched.sort((a, b) => {
      if (a.distance == null && b.distance == null) return (b.rating || 0) - (a.rating || 0);
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });

    const serviceList = document.querySelector('.service-list');
    if (serviceList) {
      serviceList.innerHTML = '';
      if (enriched.length === 0) {
        serviceList.innerHTML = `
          <div class="empty-state">
            <p>No results for "${query}" nearby</p>
          </div>
        `;
      } else {
        enriched.forEach(item => {
          if (item.featured_image_url) {
            const businessLike = { ...item };
            if (typeof item.distance === 'number' && typeof item.__distance !== 'number') {
              businessLike.__distance = item.distance;
            }
            const card = window.categoryIntegration?.createBusinessServiceCard
              ? window.categoryIntegration.createBusinessServiceCard(businessLike)
              : (() => { const d = document.createElement('div'); d.textContent = item.name; return d; })();
            serviceList.appendChild(card);
          } else {
            const card = this.createServiceCard(item);
            serviceList.appendChild(card);
          }
        });
      }
    }
    this.notifications.show(`Search results for "${query}" sorted by nearest`, 'info');
  }
  
  viewServiceDetail(serviceId) {
    const service = this.services.find(s => s.id === serviceId);
    if (!service) return;
    
    const detailPage = document.getElementById('service-detail-page');
    if (!detailPage) return;
    
    // Create detail page content
    detailPage.innerHTML = `
      <div class="page-header">
        <button class="btn btn-back"><i class="fas fa-arrow-left"></i></button>
        <h2>${service.name}</h2>
      </div>
      <div class="service-detail-container">
        <div class="service-detail-main">
          <div class="service-detail-image">
            <img src="${service.image}" alt="${service.name}">
          </div>
          <div class="service-detail-info">
            <div class="service-rating">
              <div class="stars">${this.getStarsHTML(service.rating)}</div>
              <span class="rating-value">${service.rating}</span>
              <span class="rating-count">(${service.ratingCount} reviews)</span>
            </div>
            <p class="service-category">${service.subcategory || service.category}</p>
            <p class="service-location"><i class="fas fa-map-marker-alt"></i> ${service.location}</p>
            <p class="service-price">${service.price}</p>
            <div class="service-actions">
              <button class="btn btn-primary btn-book">View Shop</button>
              <button class="btn btn-outline btn-save"><i class="far fa-heart"></i> Save</button>
              <button class="btn btn-outline btn-cancel" onclick="history.back()">Cancel</button>
            </div>
          </div>
        </div>
        <div class="service-description">
          <h3>About</h3>
          <p>${service.description}</p>
          
          <h3>Amenities</h3>
          <ul class="amenities-list">
            ${service.amenities.map(amenity => `<li><i class="fas fa-check"></i> ${amenity}</li>`).join('')}
          </ul>
          
          <h3>Opening Hours</h3>
          <div class="opening-hours">
            ${Object.entries(service.openingHours).map(([day, hours]) => `
              <div class="opening-hours-item">
                <span class="day">${day.charAt(0).toUpperCase() + day.slice(1)}</span>
                <span class="hours">${hours}</span>
              </div>
            `).join('')}
          </div>
          
          <h3>Location</h3>
          <div class="service-map"></div>
          
          <h3>Reviews</h3>
          <div class="reviews-container">
            <div class="reviews-summary">
              <div class="rating-large">
                <span class="rating-value">${service.rating}</span>
                <div class="stars">${this.getStarsHTML(service.rating)}</div>
                <span class="rating-count">${service.ratingCount} reviews</span>
              </div>
              <button class="btn btn-outline btn-write-review">Write a Review</button>
            </div>
            <div class="reviews-list">
              <!-- Reviews will be dynamically generated -->
              <div class="review-item">
                <div class="review-header">
                  <div class="reviewer-info">
                    <img src="images/default-avatar.svg" alt="Reviewer" class="reviewer-avatar">
                    <div class="reviewer-details">
                      <h4 class="reviewer-name">John D.</h4>
                      <p class="review-date">March 15, 2025</p>
                    </div>
                  </div>
                  <div class="review-rating">
                    <div class="stars">${this.getStarsHTML(5)}</div>
                  </div>
                </div>
                <p class="review-text">Amazing experience! The service was excellent and the staff was very friendly. Highly recommend!</p>
              </div>
              <div class="review-item">
                <div class="review-header">
                  <div class="reviewer-info">
                    <img src="images/default-avatar.svg" alt="Reviewer" class="reviewer-avatar">
                    <div class="reviewer-details">
                      <h4 class="reviewer-name">Sarah M.</h4>
                      <p class="review-date">February 28, 2025</p>
                    </div>
                  </div>
                  <div class="review-rating">
                    <div class="stars">${this.getStarsHTML(4)}</div>
                  </div>
                </div>
                <p class="review-text">Great service and atmosphere. Would definitely come back again!</p>
              </div>
            </div>
            <button class="btn btn-outline btn-load-more">Load More Reviews</button>
          </div>
        </div>
      </div>
    `;
    
    // Navigate to detail page
    this.navigation.navigateTo('service-detail');
    
    // Add event listeners
    const backBtn = detailPage.querySelector('.btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.history.back();
      });
    }
    
    const bookBtn = detailPage.querySelector('.btn-book');
    if (bookBtn) {
      bookBtn.addEventListener('click', () => {
        this.showBookingForm(service);
      });
    }
    
    // Initialize map
    if (window.google && window.google.maps) {
      const mapContainer = detailPage.querySelector('.service-map');
      if (mapContainer) {
        const map = new google.maps.Map(mapContainer, {
          center: service.coordinates,
          zoom: 15,
          gestureHandling: 'greedy'
        });
        
        // Add marker
        const marker = new google.maps.Marker({
          position: service.coordinates,
          map: map,
          title: service.name,
          animation: google.maps.Animation.DROP
        });
        
        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="map-info-window">
              <h3>${service.name}</h3>
              <p>${service.location}</p>
            </div>
          `
        });
        
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
        
        // Open info window by default
        infoWindow.open(map, marker);
      }
    }
  }
  
  showBookingForm(service) {
    const bookingPage = document.getElementById('booking-form-page');
    if (!bookingPage) return;
    
    // Create booking form
    bookingPage.innerHTML = `
      <div class="page-header">
        <button class="btn btn-back"><i class="fas fa-arrow-left"></i></button>
        <h2>Book ${service.name}</h2>
      </div>
      <div class="booking-form-container">
        <div class="booking-service-summary">
          <div class="service-image">
            <img src="${service.image}" alt="${service.name}">
          </div>
          <div class="service-info">
            <h3 class="service-name">${service.name}</h3>
            <p class="service-category">${service.subcategory || service.category}</p>
            <p class="service-location"><i class="fas fa-map-marker-alt"></i> ${service.location}</p>
            <div class="service-rating">
              <div class="stars">${this.getStarsHTML(service.rating)}</div>
              <span class="rating-count">(${service.ratingCount})</span>
            </div>
          </div>
        </div>
        <form class="booking-form">
          <div class="form-group">
            <label for="bookingDate">Date</label>
            <input type="date" id="bookingDate" required min="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label for="bookingTime">Time</label>
            <input type="time" id="bookingTime" required>
          </div>
          <div class="form-group">
            <label for="bookingGuests">Number of Guests</label>
            <input type="number" id="bookingGuests" min="1" max="10" value="2" required>
          </div>
          <div class="form-group">
            <label for="bookingLocation">Your Location</label>
            <input type="text" id="bookingLocation" placeholder="Enter your location">
          </div>
          <div class="form-group">
            <label for="bookingNotes">Special Requests</label>
            <textarea id="bookingNotes" placeholder="Any special requests or notes"></textarea>
          </div>
          <div class="booking-summary">
            <h3>Booking Summary</h3>
            <div class="summary-item">
              <span class="summary-label">Service</span>
              <span class="summary-value">${service.name}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Date</span>
              <span class="summary-value" id="summaryDate">Select a date</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Time</span>
              <span class="summary-value" id="summaryTime">Select a time</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Guests</span>
              <span class="summary-value" id="summaryGuests">2</span>
            </div>
            <div class="summary-item total">
              <span class="summary-label">Estimated Price</span>
              <span class="summary-value">${service.price}</span>
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-block">Confirm Booking</button>
          </div>
        </form>
      </div>
    `;
    
    // Navigate to booking page
    this.navigation.navigateTo('booking-form');
    
    // Add event listeners
    const backBtn = bookingPage.querySelector('.btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.history.back();
      });
    }
    
    // Initialize location autocomplete
    if (window.google && window.google.maps) {
      const locationInput = document.getElementById('bookingLocation');
      if (locationInput) {
        // Pre-fill with user location if available
        if (this.userLocation && window.google.maps.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: this.userLocation }, (results, status) => {
            if (status === 'OK' && results[0]) {
              locationInput.value = results[0].formatted_address;
            }
          });
        }
        
        // Initialize autocomplete
        const autocomplete = new google.maps.places.Autocomplete(locationInput);
      }
    }
    
    // Update summary when inputs change
    const dateInput = document.getElementById('bookingDate');
    const timeInput = document.getElementById('bookingTime');
    const guestsInput = document.getElementById('bookingGuests');
    
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        const summaryDate = document.getElementById('summaryDate');
        if (summaryDate) {
          const date = new Date(dateInput.value);
          summaryDate.textContent = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        }
      });
    }
    
    if (timeInput) {
      timeInput.addEventListener('change', () => {
        const summaryTime = document.getElementById('summaryTime');
        if (summaryTime) {
          summaryTime.textContent = timeInput.value;
        }
      });
    }
    
    if (guestsInput) {
      guestsInput.addEventListener('change', () => {
        const summaryGuests = document.getElementById('summaryGuests');
        if (summaryGuests) {
          summaryGuests.textContent = guestsInput.value;
        }
      });
    }
    
    // Handle form submission
    const bookingForm = bookingPage.querySelector('.booking-form');
    if (bookingForm) {
      bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Check if user is logged in
        if (!this.isLoggedIn) {
          this.notifications.show('Please log in to complete your booking', 'error');
          this.auth.showLoginModal();
          return;
        }
        
        // Create booking
        const newBooking = {
          id: this.bookings.length + 1,
          serviceId: service.id,
          userId: 'user123', // In a real app, this would be the current user's ID
          date: dateInput.value,
          time: timeInput.value,
          guests: parseInt(guestsInput.value),
          status: 'confirmed',
          notes: document.getElementById('bookingNotes').value,
          location: service.location,
          userLocation: document.getElementById('bookingLocation').value
        };
        
        // Add to bookings
        this.bookings.push(newBooking);
        
        // Show confirmation
        this.notifications.show('Booking confirmed!', 'success');
        
        // Navigate to bookings page
        this.navigation.navigateTo('bookings');
        
        // Update bookings UI
        this.updateBookingsUI();
      });
    }
  }
  
  updateBookingsUI() {
    const upcomingBookingsList = document.querySelector('#upcoming-bookings .booking-list');
    if (!upcomingBookingsList) return;
    
    upcomingBookingsList.innerHTML = '';
    
    // Filter upcoming bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingBookings = this.bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= today && booking.status === 'confirmed';
    });
    
    if (upcomingBookings.length === 0) {
      const emptyState = document.querySelector('#upcoming-bookings .empty-state');
      if (emptyState) {
        emptyState.classList.remove('hidden');
      }
    } else {
      const emptyState = document.querySelector('#upcoming-bookings .empty-state');
      if (emptyState) {
        emptyState.classList.add('hidden');
      }
      
      upcomingBookings.forEach(booking => {
        const service = this.services.find(s => s.id === booking.serviceId);
        if (!service) return;
        
        const bookingItem = this.createBookingItem(booking, service);
        upcomingBookingsList.appendChild(bookingItem);
      });
    }
  }
  
  createBookingItem(booking, service) {
    const template = document.getElementById('booking-item-template');
    if (!template) return document.createElement('div');
    
    const item = template.content.cloneNode(true);
    
    // Set booking data
    item.querySelector('.booking-service-name').textContent = service.name;
    item.querySelector('.booking-image img').src = service.image;
    item.querySelector('.booking-image img').alt = service.name;
    
    // Format date
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    item.querySelector('.booking-date').textContent = formattedDate;
    item.querySelector('.booking-time').textContent = booking.time;
    item.querySelector('.booking-guests').textContent = `${booking.guests} ${booking.guests === 1 ? 'guest' : 'guests'}`;
    
    // Set status
    const statusElement = item.querySelector('.booking-status');
    statusElement.textContent = booking.status;
    statusElement.classList.add(booking.status.toLowerCase());
    
    // Add event listeners
    const modifyBtn = item.querySelector('.btn-modify');
    const cancelBtn = item.querySelector('.btn-cancel');
    
    modifyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.modifyBooking(booking.id);
    });
    
    cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cancelBooking(booking.id);
    });
    
    // Add click event to view booking details
    const bookingItem = item.querySelector('.booking-item');
    bookingItem.addEventListener('click', () => {
      this.viewBookingDetail(booking.id);
    });
    
    return bookingItem;
  }
  
  modifyBooking(bookingId) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const service = this.services.find(s => s.id === booking.serviceId);
    if (!service) return;
    
    // Show booking form with pre-filled data
    this.showBookingForm(service);
    
    // Pre-fill form
    setTimeout(() => {
      const dateInput = document.getElementById('bookingDate');
      const timeInput = document.getElementById('bookingTime');
      const guestsInput = document.getElementById('bookingGuests');
      const notesInput = document.getElementById('bookingNotes');
      const locationInput = document.getElementById('bookingLocation');
      
      if (dateInput) dateInput.value = booking.date;
      if (timeInput) timeInput.value = booking.time;
      if (guestsInput) guestsInput.value = booking.guests;
      if (notesInput) notesInput.value = booking.notes || '';
      if (locationInput) locationInput.value = booking.userLocation || '';
      
      // Update summary
      const summaryDate = document.getElementById('summaryDate');
      const summaryTime = document.getElementById('summaryTime');
      const summaryGuests = document.getElementById('summaryGuests');
      
      if (summaryDate) {
        const date = new Date(booking.date);
        summaryDate.textContent = date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      if (summaryTime) summaryTime.textContent = booking.time;
      if (summaryGuests) summaryGuests.textContent = booking.guests;
    }, 100);
  }
  
  cancelBooking(bookingId) {
    // Confirm cancellation
    if (confirm('Are you sure you want to cancel this booking?')) {
      // Update booking status
      const booking = this.bookings.find(b => b.id === bookingId);
      if (booking) {
        booking.status = 'canceled';
        
        // Update UI
        this.updateBookingsUI();
        
        this.notifications.show('Booking canceled successfully', 'success');
      }
    }
  }
  
  viewBookingDetail(bookingId) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    const service = this.services.find(s => s.id === booking.serviceId);
    if (!service) return;
    
    // Create modal for booking details
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'booking-detail-modal';
    
    // Format date
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close">&times;</button>
        <h2>Booking Details</h2>
        <div class="booking-detail-container">
          <div class="booking-service-summary">
            <div class="service-image">
              <img src="${service.image}" alt="${service.name}">
            </div>
            <div class="service-info">
              <h3 class="service-name">${service.name}</h3>
              <p class="service-category">${service.subcategory || service.category}</p>
              <p class="service-location"><i class="fas fa-map-marker-alt"></i> ${service.location}</p>
              <div class="booking-status ${booking.status.toLowerCase()}">${booking.status}</div>
            </div>
          </div>
          <div class="booking-details">
            <div class="detail-item">
              <span class="detail-label">Booking ID</span>
              <span class="detail-value">#${booking.id}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Date</span>
              <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Time</span>
              <span class="detail-value">${booking.time}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Guests</span>
              <span class="detail-value">${booking.guests} ${booking.guests === 1 ? 'guest' : 'guests'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Your Location</span>
              <span class="detail-value">${booking.userLocation || 'Not specified'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Special Requests</span>
              <span class="detail-value">${booking.notes || 'None'}</span>
            </div>
          </div>
          <div id="booking-map" class="booking-map"></div>
          <div class="booking-actions">
            ${booking.status === 'confirmed' ? `
              <button class="btn btn-outline btn-modify-booking" data-id="${booking.id}">Modify</button>
              <button class="btn btn-outline btn-cancel-booking" data-id="${booking.id}">Cancel</button>
            ` : ''}
            <button class="btn btn-outline btn-get-directions" data-location="${service.location}">Get Directions</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('active');
    
    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    
    // Add action button event listeners
    if (booking.status === 'confirmed') {
      const modifyBtn = modal.querySelector('.btn-modify-booking');
      const cancelBtn = modal.querySelector('.btn-cancel-booking');
      
      modifyBtn.addEventListener('click', () => {
        modal.remove();
        this.modifyBooking(booking.id);
      });
      
      cancelBtn.addEventListener('click', () => {
        modal.remove();
        this.cancelBooking(booking.id);
      });
    }
    
    // Get directions button
    const directionsBtn = modal.querySelector('.btn-get-directions');
    directionsBtn.addEventListener('click', () => {
      const location = directionsBtn.dataset.location;
      
      // If Google Maps integration is available
      if (window.app && window.app.mapsIntegration) {
        window.app.mapsIntegration.showDirections(location);
      } else {
        // Fallback to Google Maps URL
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
        window.open(mapsUrl, '_blank');
      }
    });
    
    // Initialize map
    if (window.google && window.google.maps) {
      const mapContainer = document.getElementById('booking-map');
      if (mapContainer) {
        const map = new google.maps.Map(mapContainer, {
          center: service.coordinates,
          zoom: 14,
          gestureHandling: 'greedy'
        });
        
        // Add service marker
        const serviceMarker = new google.maps.Marker({
          position: service.coordinates,
          map: map,
          title: service.name,
          animation: google.maps.Animation.DROP
        });
        
        // Add user location marker if available
        if (booking.userLocation && window.google.maps.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: booking.userLocation }, (results, status) => {
            if (status === 'OK' && results[0]) {
              const userLocation = results[0].geometry.location;
              
              const userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: 'Your Location',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#4285F4',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2
                }
              });
              
              // Fit bounds to include both markers
              const bounds = new google.maps.LatLngBounds();
              bounds.extend(service.coordinates);
              bounds.extend(userLocation);
              map.fitBounds(bounds);
              
              // Draw route between points
              const directionsService = new google.maps.DirectionsService();
              const directionsRenderer = new google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true
              });
              
              directionsService.route({
                origin: userLocation,
                destination: service.coordinates,
                travelMode: google.maps.TravelMode.DRIVING
              }, (response, status) => {
                if (status === 'OK') {
                  directionsRenderer.setDirections(response);
                }
              });
            }
          });
        }
      }
    }
  }
  
  // Account-related methods
  showAccountSection(section) {
    // Hide all sections
    document.querySelectorAll('.account-section').forEach(s => {
      s.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${section}-section`);
    if (selectedSection) {
      selectedSection.classList.add('active');
    }
    
    // Update active nav link
    document.querySelectorAll('.account-nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`.account-nav-link[data-section="${section}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
    
    // Initialize location-specific UI if needed
    if (section === 'saved-locations') {
      this.updateSavedLocationsUI();
    }
  }
  
  // Service provider dashboard
  initServiceProviderDashboard() {
    // This would be expanded in a real application
    console.log('Service provider dashboard initialized');
  }
  
  async handleLogin(credentials) {
    try {
      const response = await this.authService.login(credentials);
      if (response.success) {
        const userRole = response.user.role;
        this.dashboardManager.switchToDashboard(userRole);
        this.showToast('Login successful', 'success');
      }
    } catch (error) {
      this.showToast('Login failed', 'error');
    }
  }
}

// Navigation class
class Navigation {
  constructor(app) {
    this.app = app;
    this.currentPage = 'home';
    this.history = ['home'];
  }
  
  navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    // Show selected page
    const selectedPage = document.getElementById(`${page}-page`);
    if (selectedPage) {
        selectedPage.classList.add('active');
        this.currentPage = page;

        // Add to history
        this.history.push(page);

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        const activeLink = document.querySelector(`.nav-link[data-page="${page}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

    // Back button visibility: hide on home, show otherwise
    const backBtn = document.getElementById("backBtn");
    if (backBtn) {
      backBtn.classList.toggle('hidden', page === 'home');
    }

        // Initialize page-specific UI
        this.initPageUI(page);
    }
  }
  
  goBack() {
    if (this.history.length > 1) {
      this.history.pop(); // Remove current page
      const previousPage = this.history[this.history.length - 1];
      this.navigateTo(previousPage);
    }
  }
  
  initPageUI(page) {
    switch (page) {
      case 'explore':
        // Populate service list if empty
        const serviceList = document.querySelector('.service-list');
        if (serviceList && serviceList.children.length === 0) {
          // Show nearest items by default
          this.app.populateExploreListNearest();
          // Also load all real businesses by default if no checkbox is selected
          const anyChecked = document.querySelectorAll('.filter-sidebar input[type="checkbox"]:checked').length > 0;
          if (!anyChecked && window.categoryIntegration?.showAllBusinesses) {
            window.categoryIntegration.showAllBusinesses();
          }
        }
        break;
      case 'bookings':
        // Update bookings UI
        this.app.updateBookingsUI();
        break;
      case 'account':
        // Show profile section by default
        this.app.showAccountSection('profile');
        break;
    }
  }
}

// Authentication class
class Authentication {
  constructor(app) {
    this.app = app;
  }
  
  showLoginModal() {
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
      // Hide any other active modals
      document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
      });
      
      loginModal.classList.add('active');
      
      // Focus on email input
      const emailInput = document.getElementById('loginEmail');
      if (emailInput) {
        emailInput.focus();
      }
      
      // Set up form submission
      const form = loginModal.querySelector('.login-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.login();
        });
      }
    }
  }
  
  showSignupModal() {
    const signupModal = document.getElementById('signup-modal');
    if (signupModal) {
      // Hide any other active modals
      document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
      });
      
      signupModal.classList.add('active');
      
      // Focus on first name input
      const firstNameInput = document.getElementById('signupFirstName');
      if (firstNameInput) {
        firstNameInput.focus();
      }
      
      // Set up form submission
      const form = signupModal.querySelector('.signup-form');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.signup();
        });
      }
      
      // Password strength meter
      const passwordInput = document.getElementById('signupPassword');
      if (passwordInput) {
        passwordInput.addEventListener('input', () => {
          this.updatePasswordStrength(passwordInput.value);
        });
      }
    }
  }
  
  login() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    if (!emailInput || !passwordInput) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      this.app.notifications.show('Please fill in all fields', 'error');
      return;
    }
    
    // In a real app, this would validate credentials with a server
    // For this demo, we'll just simulate a successful login
    
    // Close modal
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
      loginModal.classList.remove('active');
    }
    
    // Update UI for logged in state
    this.app.isLoggedIn = true;
    this.app.currentUser = {
      id: 'user123',
      firstName: 'John',
      lastName: 'Doe',
      email: email,
      phone: '+1 (555) 123-4567',
      address: '123 Main St, Anytown, USA'
    };
    
    this.updateLoggedInUI();
    
    // Show notification
    this.app.notifications.show('Logged in successfully', 'success');
  }
  
  signup() {
    const firstNameInput = document.getElementById('signupFirstName');
    const lastNameInput = document.getElementById('signupLastName');
    const emailInput = document.getElementById('signupEmail');
    const phoneInput = document.getElementById('signupPhone');
    const addressInput = document.getElementById('signupAddress');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('signupConfirmPassword');
    const agreeTermsInput = document.getElementById('agreeTerms');
    
    if (!firstNameInput || !lastNameInput || !emailInput || !phoneInput || 
        !passwordInput || !confirmPasswordInput || !agreeTermsInput) return;
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput ? addressInput.value.trim() : '';
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const agreeTerms = agreeTermsInput.checked;
    
    // Validate inputs
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword) {
      this.app.notifications.show('Please fill in all required fields', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      this.app.notifications.show('Passwords do not match', 'error');
      return;
    }
    
    if (!agreeTerms) {
      this.app.notifications.show('Please agree to the Terms of Service and Privacy Policy', 'error');
      return;
    }
    
    // In a real app, this would create a new user account on the server
    // For this demo, we'll just simulate a successful signup
    
    // Close modal
    const signupModal = document.getElementById('signup-modal');
    if (signupModal) {
      signupModal.classList.remove('active');
    }
    
    // Update UI for logged in state
    this.app.isLoggedIn = true;
    this.app.currentUser = {
      id: 'user123',
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      address: address
    };
    
    this.updateLoggedInUI();
    
    // Show notification
    this.app.notifications.show('Account created successfully', 'success');
  }
  
  logout() {
    // In a real app, this would invalidate the session on the server
    
    // Update UI for logged out state
    this.app.isLoggedIn = false;
    this.app.currentUser = null;
    
    this.updateLoggedOutUI();
    
    // Show notification
    this.app.notifications.show('Logged out successfully', 'success');
    
    // Navigate to home page
    this.app.navigation.navigateTo('home');
  }
  
  updateLoggedInUI() {
    // Hide login/signup buttons
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userProfile = document.querySelector('.user-profile');
    
    if (loginBtn) loginBtn.classList.add('hidden');
    if (signupBtn) signupBtn.classList.add('hidden');
    if (userProfile) userProfile.classList.remove('hidden');
    
    // Update profile information
    const profileName = document.querySelector('.profile-name');
    const profileEmail = document.querySelector('.profile-email');
    
    if (profileName) profileName.textContent = `${this.app.currentUser.firstName} ${this.app.currentUser.lastName}`;
    if (profileEmail) profileEmail.textContent = this.app.currentUser.email;
    
    // Add logout event listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
    
    // Update account page form
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const addressInput = document.getElementById('address');
    
    if (firstNameInput) firstNameInput.value = this.app.currentUser.firstName;
    if (lastNameInput) lastNameInput.value = this.app.currentUser.lastName;
    if (emailInput) emailInput.value = this.app.currentUser.email;
    if (phoneInput) phoneInput.value = this.app.currentUser.phone;
    if (addressInput) addressInput.value = this.app.currentUser.address || '';
  }
  
  updateLoggedOutUI() {
    // Show login/signup buttons
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userProfile = document.querySelector('.user-profile');
    
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (signupBtn) signupBtn.classList.remove('hidden');
    if (userProfile) userProfile.classList.add('hidden');
  }
  
  updatePasswordStrength(password) {
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthMeter || !strengthText) return;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 1;
    
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 1;
    
    // Number check
    if (/[0-9]/.test(password)) strength += 1;
    
       
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    // Update strength meter
    const segments = strengthMeter.querySelectorAll('.strength-segment');
    
    segments.forEach((segment, index) => {
      if (index < strength) {
        segment.style.backgroundColor = this.getStrengthColor(strength);
      } else {
        segment.style.backgroundColor = 'var(--color-border)';
      }
    });
    
    // Update strength text
    let strengthLabel = 'Weak';
    if (strength >= 4) strengthLabel = 'Strong';
    else if (strength >= 3) strengthLabel = 'Good';
    else if (strength >= 2) strengthLabel = 'Fair';
    
    strengthText.textContent = `Password strength: ${strengthLabel}`;
    strengthText.style.color = this.getStrengthColor(strength);
  }
  
  getStrengthColor(strength) {
    if (strength >= 4) return 'var(--color-success)';
    if (strength >= 3) return 'var(--color-primary)';
    if (strength >= 2) return 'var(--color-warning)';
    return 'var(--color-error)';
  }
}

// Booking System class
class BookingSystem {
  constructor(app) {
    this.app = app;
  }
  
  // Booking methods would be implemented here
}

// Notification System class
class NotificationSystem {
  constructor(app) {
    this.app = app;
    this.toastContainer = document.querySelector('.toast-container');
  }
  
  show(message, type = 'info', duration = 3000) {
    if (!this.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas fa-${icon}"></i>
      </div>
      <div class="toast-content">
        <p>${message}</p>
      </div>
      <button class="toast-close">&times;</button>
    `;
    
    this.toastContainer.appendChild(toast);
    
    // Add animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Add close button event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });
    
    // Auto remove after duration
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);
  }
  
  removeToast(toast) {
    toast.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (toast.parentNode === this.toastContainer) {
        this.toastContainer.removeChild(toast);
      }
    }, 300);
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  const deliverySystem = new DeliverySystem();
  const businessAdsManager = new BusinessAdsManager();
});

// Legacy inline map init removed in favor of consolidated initializer in index.html module block.

// Privacy Policy modal functionality
document.getElementById('privacy-policy-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('privacy-policy-modal').style.display = 'flex';
});

document.querySelector('#privacy-policy-modal .modal-close').addEventListener('click', () => {
    document.getElementById('privacy-policy-modal').style.display = 'none';
});

// Back button functionality
document.addEventListener('DOMContentLoaded', () => {
    const backButtons = document.querySelectorAll('.btn-back');

    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPageId = button.getAttribute('data-target');
            const currentPage = document.querySelector('.page.active');
            const targetPage = document.getElementById(targetPageId);

            if (currentPage && targetPage) {
                currentPage.classList.remove('active');
                targetPage.classList.add('active');
            }
        });
    });
});
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (!backBtn) return;
  // Ensure back button is hidden on initial home page load
  const onHome = document.getElementById('home-page')?.classList.contains('active');
  backBtn.classList.toggle('hidden', !!onHome);
});