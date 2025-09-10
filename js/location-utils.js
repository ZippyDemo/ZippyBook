// Location utilities for distance calculations and geocoding with simple caching

// In-memory cache for geocoding results
const geocodeCache = new Map();

export function haversineDistance(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number' || Number.isNaN(v))) return null;
  const R = 6371; // km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

// Try to get the user's current location from the app or browser
export async function getUserLatLng() {
  if (window.app?.userLocation) return window.app.userLocation;
  if (!navigator.geolocation) return null;
  try {
    const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

// Geocode an address to {lat, lng} using Google Maps JS API; cached
export async function geocodeAddressCached(address) {
  if (!address) return null;
  const key = address.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  if (!(window.google && window.google.maps && window.google.maps.Geocoder)) {
    return null; // API not ready; caller should handle gracefully
  }
  const geocoder = new window.google.maps.Geocoder();
  const result = await new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
  geocodeCache.set(key, result);
  return result;
}

// Ensure a business-like object has a coordinates {lat, lng}; returns the same object with .coordinates filled when possible
export async function ensureCoordinates(entity) {
  if (!entity || typeof entity !== 'object') return entity;
  // Already has coordinates
  if (entity.coordinates && typeof entity.coordinates.lat === 'number' && typeof entity.coordinates.lng === 'number') {
    return entity;
  }
  // Common field names
  const lat = entity.lat ?? entity.latitude ?? entity.location_lat;
  const lng = entity.lng ?? entity.longitude ?? entity.location_lng;
  if (typeof lat === 'number' && typeof lng === 'number') {
    entity.coordinates = { lat, lng };
    return entity;
  }
  // Try geocoding address
  const addr = entity.address || entity.location;
  const geo = await geocodeAddressCached(addr);
  if (geo) entity.coordinates = geo;
  return entity;
}

// Batch ensure coordinates with limited concurrency to avoid API throttling
export async function ensureCoordinatesForAll(items, concurrency = 3) {
  const queue = [...items];
  const results = [];
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, queue.length)) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      const ensured = await ensureCoordinates(item);
      results.push(ensured);
    }
  });
  await Promise.all(workers);
  return results;
}
