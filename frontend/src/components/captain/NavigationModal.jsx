import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import LiveTracking from '../LiveTracking';
import { API_BASE_URL } from '../../config/api';
import { getCurrentDevicePosition, hasDeviceGeolocation } from '../../utils/deviceGeolocation';

const NavigationModal = ({ ride, target = 'pickup', onClose }) => {
  const [mode, setMode] = useState(target); // 'pickup' or 'dropoff'
  const [routePolyline, setRoutePolyline] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // { duration, distance }
  const [loading, setLoading] = useState(false);
  const fetchedKey = useRef(null); // track what we already fetched to avoid re-fetching

  // Resolve the target coordinates based on mode
  const getTargetCoords = () => {
    if (mode === 'pickup') {
      const c = ride?.pickupCoords || ride?.pickup?.coordinates || ride?.pickup_location;
      if (c && c.lat && c.lng) return c;
    } else {
      const c = ride?.dropCoords || ride?.destination?.coordinates || ride?.drop_location;
      if (c && c.lat && c.lng) return c;
    }
    return null;
  };

  // Fetch directions from driver's current location to the target
  useEffect(() => {
    let cancelled = false;

    const fetchRoute = async () => {
      const dest = getTargetCoords();
      if (!dest) return;

      const key = `${mode}-${dest.lat}-${dest.lng}`;
      if (fetchedKey.current === key) return;

      setLoading(true);
      try {
        let driverPos = null;
        if (hasDeviceGeolocation()) {
          const pos = await getCurrentDevicePosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 });
          driverPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
        if (!driverPos || !driverPos.lat || !driverPos.lng) return;

        const resp = await axios.get(`${API_BASE_URL}/maps/directions-proxy`, {
          params: {
            originLat: driverPos.lat,
            originLng: driverPos.lng,
            destLat: dest.lat,
            destLng: dest.lng,
          },
        });

        if (cancelled) return;

        const poly = resp.data?.overview_polyline?.points;
        if (poly) {
          setRoutePolyline(poly);
          fetchedKey.current = key;
        }
        setRouteInfo({
          duration: resp.data?.duration?.text || null,
          distance: resp.data?.distance?.text || null,
        });
      } catch (e) {
        console.warn('[NavigationModal] directions fetch failed', e?.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [mode, ride]);

  const displayedRide = { ...ride };
  // Attach the fetched route polyline so LiveTracking can render it
  if (routePolyline) {
    displayedRide.routePolyline = routePolyline;
  }
  // Set pickupCoords to the target so LiveTracking shows the destination marker
  if (mode === 'pickup') {
    displayedRide.pickupCoords = ride?.pickupCoords || ride?.pickup?.coordinates || ride?.pickup_location || null;
  } else {
    displayedRide.pickupCoords = ride?.dropCoords || ride?.destination?.coordinates || ride?.drop_location || null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-white font-semibold">Navigation</div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRoutePolyline(null); setMode(mode === 'pickup' ? 'dropoff' : 'pickup'); }} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">
            {mode === 'pickup' ? 'Go to Dropoff' : 'Go to Pickup'}
          </button>
          <button onClick={onClose} className="px-3 py-1 rounded bg-red-600 text-white text-sm">Close</button>
        </div>
      </div>

      {/* Route info bar */}
      {routeInfo && (routeInfo.duration || routeInfo.distance) && (
        <div className="flex items-center gap-3 mb-2 px-2">
          {routeInfo.distance && <span className="text-emerald-400 text-sm font-medium">{routeInfo.distance}</span>}
          {routeInfo.duration && <span className="text-white text-sm">ETA: {routeInfo.duration}</span>}
        </div>
      )}
      {loading && <div className="text-white/60 text-xs mb-1 px-2">Loading route...</div>}

      <div className="flex-1 rounded-lg overflow-hidden shadow-lg border border-white/10">
        <LiveTracking ride={displayedRide} role="captain" />
      </div>
    </div>
  );
};

export default NavigationModal;
