import React, { useState, useEffect, useContext, useRef } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import axios from 'axios';
import polyline from '@mapbox/polyline';
import { SocketContext } from "../context/SocketContext";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";
import { clearDeviceWatch, getCurrentDevicePosition, hasDeviceGeolocation, watchDevicePosition } from "../utils/deviceGeolocation";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.209,
};

const LiveTracking = ({ ride, role, onEta, simulatedDriverPosition, availableDrivers, navDestination, navMode }) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [error, setError] = useState(null);
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [directions, setDirections] = useState(null);
  const [polylinePath, setPolylinePath] = useState(null);
  const [heading, setHeading] = useState(0);
  const { socket } = useContext(SocketContext || {});
  const mapRef = useRef(null);
  const animRef = useRef(null);
  const prevPosRef = useRef(null);
  const smoothPosRef = useRef(null);
  const smoothAnimRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Google Maps API key missing. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file");
  }

  // ─── Bearing calculator ───
  const computeBearing = (from, to) => {
    if (!from || !to) return 0;
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const dLng = toRad(to.lng - from.lng);
    const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
    const x = Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
              Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

  const [mapsLoaded, setMapsLoaded] = useState(
    typeof window !== "undefined" && window.google && window.google.maps
  );

  // ─── Google-Maps-style blue navigation arrow as data URL ───
  const navArrowIcon = useRef(null);
  useEffect(() => {
    if (!window.google?.maps) return;
    // Blue arrow with white border — Google Maps navigation style
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="22" fill="#4285F4" stroke="white" stroke-width="3"/>
      <path d="M24 10 L32 32 L24 27 L16 32 Z" fill="white"/>
    </svg>`;
    navArrowIcon.current = {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new window.google.maps.Size(44, 44),
      anchor: new window.google.maps.Point(22, 22),
    };
  }, [mapsLoaded]);

  useEffect(() => {
    let mounted = true;
    if (mapsLoaded) return;
    loadGoogleMaps(apiKey).then((g) => {
      if (!mounted) return;
      if (g && g.maps) setMapsLoaded(true);
      else setMapsLoaded(false);
    });
    return () => {
      mounted = false;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!hasDeviceGeolocation()) {
      setError("Geolocation is not supported by your browser");
      setIsGeolocationAvailable(false);
      setIsLoading(false);
      return;
    }

    const handlePositionUpdate = (position) => {
      const { latitude, longitude } = position.coords;
      const newPos = { lat: latitude, lng: longitude };
      
      // Compute heading from previous position
      if (prevPosRef.current) {
        const dist = Math.abs(newPos.lat - prevPosRef.current.lat) + Math.abs(newPos.lng - prevPosRef.current.lng);
        if (dist > 0.00005) { // only update heading if moved enough (~5m)
          const bear = computeBearing(prevPosRef.current, newPos);
          setHeading(bear);
        }
      }
      prevPosRef.current = newPos;

      // Smooth animate position transition
      if (smoothPosRef.current && role === 'captain') {
        const startPos = { ...smoothPosRef.current };
        const endPos = newPos;
        const dur = 1000;
        let startTime = null;
        if (smoothAnimRef.current) cancelAnimationFrame(smoothAnimRef.current);
        const step = (ts) => {
          if (!startTime) startTime = ts;
          const t = Math.min((ts - startTime) / dur, 1);
          const interpLat = startPos.lat + (endPos.lat - startPos.lat) * t;
          const interpLng = startPos.lng + (endPos.lng - startPos.lng) * t;
          const interpPos = { lat: interpLat, lng: interpLng };
          smoothPosRef.current = interpPos;
          setCurrentPosition(interpPos);
          if (t < 1) smoothAnimRef.current = requestAnimationFrame(step);
        };
        smoothAnimRef.current = requestAnimationFrame(step);
      } else {
        smoothPosRef.current = newPos;
        setCurrentPosition(newPos);
      }
      setIsLoading(false);
    };

    const handleError = (error) => {
      setError(error.message);
      setIsLoading(false);
      console.warn("Geolocation error:", error);
    };

    let watchId = null;
    let active = true;

    getCurrentDevicePosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
      .then((position) => {
        if (!active) return;
        handlePositionUpdate(position);
      })
      .catch((geoError) => {
        if (!active) return;
        handleError(geoError);
      });

    watchDevicePosition(
      (position) => {
        if (!active) return;
        handlePositionUpdate(position);
      },
      (geoError) => {
        if (!active) return;
        handleError(geoError);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    ).then((id) => {
      watchId = id;
    }).catch((geoError) => {
      if (!active) return;
      handleError(geoError);
    });

    return () => {
      active = false;
      clearDeviceWatch(watchId).catch(() => {});
      if (smoothAnimRef.current) cancelAnimationFrame(smoothAnimRef.current);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = (driver) => {
      if (!ride || ride.status !== 'accepted') return;
      if (driver && driver.lat && driver.lng) {
        setDriverLocation({ lat: driver.lat, lng: driver.lng });
      }
    };

    socket.on('updateDriverOnMap', onUpdate);
    return () => socket.off('updateDriverOnMap', onUpdate);
  }, [socket, ride]);

  useEffect(() => {
    if (!simulatedDriverPosition) return;
    const startPos = driverLocation || simulatedDriverPosition;
    const endPos = simulatedDriverPosition;
    const duration = 800;
    let startTime = null;

    const step = (ts) => {
      if (!startTime) startTime = ts;
      const t = Math.min((ts - startTime) / duration, 1);
      const lat = startPos.lat + (endPos.lat - startPos.lat) * t;
      const lng = startPos.lng + (endPos.lng - startPos.lng) * t;
      setDriverLocation({ lat, lng });
      try { if (mapRef.current && mapRef.current.panTo) mapRef.current.panTo({ lat, lng }); } catch (e) {}
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); animRef.current = null; };
  }, [simulatedDriverPosition]);

  useEffect(() => {
    try {
      if (ride && Array.isArray(ride.routePath) && ride.routePath.length > 0) {
        const normalized = ride.routePath.map((p) => {
          if (!p) return null;
          if (Array.isArray(p) && p.length >= 2) {
            const a = Number(p[0]);
            const b = Number(p[1]);
            // if first value looks like longitude (abs > 90) then swap
            if (Math.abs(a) > 90 && Math.abs(b) <= 90) return { lat: Number(b), lng: Number(a) };
            return { lat: a, lng: b };
          }
          return { lat: Number(p.lat ?? p.latitude ?? 0), lng: Number(p.lng ?? p.longitude ?? 0) };
        }).filter(Boolean);
        if (normalized.length) {
          setPolylinePath(normalized);
          return;
        }
      }
      if (ride && ride.routePolyline) {
        const decoded = polyline.decode(String(ride.routePolyline));
        const path = decoded.map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));
        if (path.length) setPolylinePath(path);
      }
    } catch (e) {}
  }, [driverLocation, ride]);

  // Auto-pan map when driver location updates (follow driver)
  useEffect(() => {
    if (!driverLocation || !mapRef.current) return;
    if (navMode) return; // nav mode has its own follow logic
    try {
      if (mapRef.current && typeof mapRef.current.panTo === 'function') {
        mapRef.current.panTo({ lat: driverLocation.lat, lng: driverLocation.lng });
      }
    } catch (e) {}
  }, [driverLocation]);

  // In nav mode, follow captain's GPS position and rotate map to heading
  useEffect(() => {
    if (!navMode || role !== 'captain' || !currentPosition || !mapRef.current) return;
    try {
      mapRef.current.panTo(currentPosition);
      // Tilt the map for a navigation feel
      if (typeof mapRef.current.setTilt === 'function') mapRef.current.setTilt(45);
      if (typeof mapRef.current.setHeading === 'function') mapRef.current.setHeading(heading);
    } catch (e) {}
  }, [currentPosition, heading, navMode, role]);

  // Fit map to route polyline once when it becomes available
  useEffect(() => {
    if (!polylinePath || !polylinePath.length || !mapRef.current) return;
    try {
      const bounds = new window.google.maps.LatLngBounds();
      polylinePath.forEach((p) => { if (p && typeof p.lat === 'number' && typeof p.lng === 'number') bounds.extend(p); });
      // also include driver location so marker is visible
      if (driverLocation && typeof driverLocation.lat === 'number' && typeof driverLocation.lng === 'number') bounds.extend(driverLocation);
      mapRef.current.fitBounds(bounds);
    } catch (e) {}
  }, [polylinePath]);

  useEffect(() => {
    if (typeof onEta === 'function') {
      try { onEta(eta); } catch (e) {}
    }
  }, [eta, onEta]);

  const fallbackCenter = currentPosition || driverLocation || (ride && (ride.pickupCoords || ride.destination?.coordinates || ride.dropCoords)) || defaultCenter;

  if (!mapsLoaded) return <div>Loading map...</div>;
  if (!fallbackCenter) return <div>Waiting for location...</div>;

  if (!apiKey) {
    return (
      <div className="p-4 bg-red-500 text-white rounded">
        Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={fallbackCenter}
      onLoad={(map) => { mapRef.current = map; }}
      onUnmount={() => { mapRef.current = null; }}
      zoom={navMode ? 18 : 15}
      options={{
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: !navMode,
        streetViewControl: false,
        ...(navMode ? { tilt: 45, heading: heading, gestureHandling: 'greedy' } : {}),
      }}
    >
      {/* Captain's own position — blue nav arrow in nav mode, default marker otherwise */}
      {currentPosition && role === 'captain' && navMode && navArrowIcon.current && (
        <Marker
          position={currentPosition}
          icon={{
            ...navArrowIcon.current,
            rotation: heading,
          }}
          zIndex={9999}
        />
      )}
      {currentPosition && !(role === 'captain' && navMode) && (
        <Marker position={currentPosition} />
      )}
      {Array.isArray(availableDrivers) && availableDrivers.map((driver) => {
        const lat = driver.location?.lat || driver.lat || driver.ltd || null;
        const lng = driver.location?.lng || driver.lng || driver.lng || null;
        if (!lat || !lng) return null;
        return (
          <Marker
            key={driver._id || driver.id}
            position={{ lat, lng }}
            icon={ (window && window.google && { url: "/car-icon.png", scaledSize: new window.google.maps.Size(36, 36) }) || undefined }
          />
        );
      })}
      {driverLocation && (
        <Marker
          position={driverLocation}
          icon={ (window && window.google && { url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png", scaledSize: new window.google.maps.Size(40, 40) }) || undefined }
        />
      )}
      {role === 'captain' && ride && ride.pickupCoords && (
        <Marker position={{ lat: ride.pickupCoords.lat, lng: ride.pickupCoords.lng }} />
      )}
      {navDestination && navDestination.lat && navDestination.lng && (
        <Marker
          position={{ lat: navDestination.lat, lng: navDestination.lng }}
          icon={window?.google?.maps ? {
            url: 'https://maps.google.com/mapfiles/kml/paddle/grn-circle.png',
            scaledSize: new window.google.maps.Size(40, 40)
          } : undefined}
        />
      )}
      {polylinePath && (
        <Polyline
          path={polylinePath.map(p => ({ lat: Number(p.lat), lng: Number(p.lng) }))}
          options={{
            strokeColor: '#34d399',
            strokeOpacity: 0.95,
            strokeWeight: 6,
            clickable: false,
            geodesic: true,
            zIndex: 1000
          }}
        />
      )}
      {eta && role !== 'captain' && (
        <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
          <div className="bg-black bg-opacity-60 text-white px-3 py-2 rounded">ETA: {eta}</div>
        </div>
      )}
    </GoogleMap>
  );
};

export default LiveTracking;
