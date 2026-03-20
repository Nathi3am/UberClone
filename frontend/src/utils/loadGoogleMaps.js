let googleMapsPromise = null;

export function loadGoogleMaps(apiKey) {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve) => {
    if (typeof window !== "undefined" && window.google && window.google.maps) {
      resolve(window.google);
      return;
    }

    const script = document.createElement("script");
    // include geometry library for polyline decoding
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve(window.google);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });

  return googleMapsPromise;
}
