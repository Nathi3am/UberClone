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
  const { socket } = useContext(SocketContext || {});
  const mapRef = useRef(null);
  const animRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Google Maps API key missing. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file");
  }

  const [mapsLoaded, setMapsLoaded] = useState(
    typeof window !== "undefined" && window.google && window.google.maps
  );

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
      setCurrentPosition({ lat: latitude, lng: longitude });
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
    try {
      if (mapRef.current && typeof mapRef.current.panTo === 'function') {
        mapRef.current.panTo({ lat: driverLocation.lat, lng: driverLocation.lng });
      }
    } catch (e) {}
  }, [driverLocation]);

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
      zoom={navMode ? 17 : 15}
      options={{ mapTypeControl: false, fullscreenControl: false, zoomControl: !navMode }}
    >
      {currentPosition && <Marker position={currentPosition} />}
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
