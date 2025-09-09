// filepath: /Users/ll/Downloads/reservation-app-with-location copy/js/google-maps-loader.js
import { config } from './config.js';

let loadingPromise = null;

export function loadGoogleMaps(options = {}) {
  const { libraries = ['places'] } = options;
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (loadingPromise) return loadingPromise;
  const key = config.GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error('Missing GOOGLE_MAPS_API_KEY in js/config.js'));
  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const libs = encodeURIComponent(libraries.join(','));
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=${libs}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
  return loadingPromise;
}
