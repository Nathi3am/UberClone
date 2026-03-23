import React, { useState, useEffect, useContext, useRef } from 'react';
import polyline from '@mapbox/polyline';
import axios from 'axios';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiStar, FiClock, FiShield } from 'react-icons/fi';
import { CaptainDataContext } from '../../context/CaptainContext';
import { SocketContext } from '../../context/SocketContext';
import RideRequestPopup from '../../components/captain/RideRequestPopup';
import ActiveTripCard from '../../components/captain/ActiveTripCard';
import NavigationModal from '../../components/captain/NavigationModal';
import DriverBottomNav from '../../components/navigation/DriverBottomNav';
import LiveTracking from '../../components/LiveTracking';
import RideChat from '../../components/RideChat';
import NavigationBar from '../../components/captain/NavigationBar';
import API from '../../config/api';
import { API_BASE_URL } from '../../config/api';
import { clearDeviceWatch, getCurrentDevicePosition, hasDeviceGeolocation, watchDevicePosition } from '../../utils/deviceGeolocation';

const CaptainHome = () => {
  const { captain } = useContext(CaptainDataContext);
  const { socket } = useContext(SocketContext);
  // Use centralized API base URL
  // `API` imported from `src/config/api.js` resolves VITE_BASE_URL -> VITE_API_URL -> https://vexomove.onrender.com

  const [isOnline, setIsOnline] = useState(false);
  const [tripActive, setTripActive] = useState(false);
  const [incomingRide, setIncomingRide] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    todayCommission: 0,
    todayNet: 0,
    totalCompletedRides: 0,
    avgFare: 0,
    rating: 5.0,
    weeklyEarnings: 0,
    weeklyAverageEarnings: 0,
    dailyAverageEarnings: 0,
    owePlatform: 0,
    totalEarnings: 0,
    completionRate: 100,
    walletBalance: 0,
    availableForPayout: 0,
    driverPayout: 0
  });
  
  const [navVisible, setNavVisible] = useState(false);
  const [navTarget, setNavTarget] = useState('pickup');
  const [navActive, setNavActive] = useState(false);
  const [navTargetCoords, setNavTargetCoords] = useState(null);
  const [navTargetLabel, setNavTargetLabel] = useState('Pickup');
  const [navRoutePolyline, setNavRoutePolyline] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [bufferedChatMessages, setBufferedChatMessages] = useState([]);
  const [simulateActive, setSimulateActive] = useState(false);
  const simulateRef = useRef(null);
  const [simulateDropoffActive, setSimulateDropoffActive] = useState(false);
  const simulateDropoffRef = useRef(null);
  const [simulatedDriverPosition, setSimulatedDriverPosition] = useState(null);
  const declinedRideIdsRef = useRef(new Set());
  const RIDE_REQUEST_MAX_AGE_MS = 120000;

  const getRideIdentity = (ride) => {
    if (!ride) return null;
    return String(ride._id || ride.rideId || ride.id || '');
  };

  const hasDeclinedRide = (ride) => {
    const rideId = getRideIdentity(ride);
    return Boolean(rideId && declinedRideIdsRef.current.has(rideId));
  };

  const getAssignedCaptainId = (ride) => {
    if (!ride) return null;
    const direct = ride.captainId || ride.selectedDriverId || ride.driverId || null;
    if (direct) return String(direct);
    if (ride.captain && typeof ride.captain === 'object' && ride.captain._id) {
      return String(ride.captain._id);
    }
    if (ride.captain && (typeof ride.captain === 'string' || typeof ride.captain === 'number')) {
      return String(ride.captain);
    }
    return null;
  };

  const getRideTimestampMs = (ride) => {
    if (!ride) return null;
    const raw = ride.createdAt || ride.requestedAt || ride.timestamp || ride.updatedAt || null;
    if (!raw) return null;
    const ts = new Date(raw).getTime();
    return Number.isFinite(ts) ? ts : null;
  };

  const isRideFresh = (ride) => {
    const ts = getRideTimestampMs(ride);
    if (!ts) return true;
    return Date.now() - ts <= RIDE_REQUEST_MAX_AGE_MS;
  };

  const isRideForCurrentCaptain = (ride) => {
    const assignedCaptainId = getAssignedCaptainId(ride);
    if (!assignedCaptainId) return true;
    if (!captain || !captain._id) return false;
    return String(assignedCaptainId) === String(captain._id);
  };

  const shouldSurfaceRideRequest = (ride) => {
    if (!ride) return false;
    if (hasDeclinedRide(ride)) return false;
    if (!isRideForCurrentCaptain(ride)) return false;
    const status = String(ride.status || '').toLowerCase();
    if (status && !['pending', 'searching'].includes(status)) return false;
    if (!isRideFresh(ride)) return false;
    return true;
  };

  const rememberDeclinedRide = (ride) => {
    const rideId = getRideIdentity(ride);
    if (!rideId) return;
    declinedRideIdsRef.current.add(rideId);
    try {
      window.sessionStorage.setItem('captain_declined_ride_ids', JSON.stringify(Array.from(declinedRideIdsRef.current)));
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem('captain_declined_ride_ids');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        declinedRideIdsRef.current = new Set(parsed.map((value) => String(value)));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!socket) return;
    try {
      if (captain && captain._id) {
        socket.emit('join', { userType: 'captain', userId: captain._id });
        try { socket.emit('join-room', captain._id.toString()); } catch (e) {}
        try { socket.emit('captain-online', captain._id); } catch (e) {}
        try { socket.emit('driver-online', captain._id); } catch (e) {}
      } else {
        socket.emit('join', { userType: 'captain', userId: captain?._id });
      }
    } catch (e) {}

    socket.on('new-ride', (ride) => {
      if (!ride) return;
      if (!shouldSurfaceRideRequest(ride)) return;
      setIncomingRide(ride);
      if (!isOnline) {
        setIsOnline(true);
        try { localStorage.setItem('captainOnline', 'true'); } catch (e) {}
      }
    });

    socket.on('new-ride-request', (ride) => {
      if (!ride) return;
      if (!shouldSurfaceRideRequest(ride)) return;
      setIncomingRide(ride);
      if (!isOnline) {
        setIsOnline(true);
        try { localStorage.setItem('captainOnline', 'true'); } catch (e) {}
      }
    });

    // Handle ride cancellations from users
    socket.on('ride-cancelled', ({ rideId, message, ...rest }) => {
      console.log('ride-cancelled received for', rideId, message);
      // clear any incoming or current trip state and return driver to waiting
      setIncomingRide(null);
      setTripActive(false);
      setCurrentRide(null);
      try { window.sessionStorage.removeItem('captain_pending_ride_request'); } catch (e) {}
      // notify driver briefly
      try { alert(message || 'Passenger cancelled the ride.'); } catch (e) {}
    });

    return () => {
      socket.off('new-ride');
      socket.off('new-ride-request');
      socket.off('ride-cancelled');
    };
  }, [socket, captain, isOnline]);

  useEffect(() => {
    const onPushRideRequest = async (evt) => {
      try {
        const detail = evt && evt.detail ? evt.detail : {};
        const rideId = detail.rideId ? String(detail.rideId) : null;

        const captainToken = localStorage.getItem('captainToken') || localStorage.getItem('token');
        const sessionToken = localStorage.getItem('device_session_token');
        if (!captainToken) return;

        const headers = { Authorization: `Bearer ${captainToken}` };
        if (sessionToken) headers['x-session-token'] = sessionToken;

        const res = await axios.get(`${API}/rides/pending`, { headers });
        const pending = (Array.isArray(res.data) ? res.data : []).filter((ride) => shouldSurfaceRideRequest(ride));
        if (!pending.length) return;

        const matched = rideId
          ? (pending.find((r) => String(r._id) === rideId) || pending.find((r) => String(r.rideId || '') === rideId))
          : null;
        const nextRide = matched || pending[0] || null;
        if (!nextRide) return;

        if (!isOnline) {
          setIsOnline(true);
          try { localStorage.setItem('captainOnline', 'true'); } catch (e) {}
        }
        setIncomingRide(nextRide);
      } catch (e) {
        // ignore popup fetch errors
      }
    };

    const recoverPendingPushRideRequest = async () => {
      try {
        const raw = window.sessionStorage.getItem('captain_pending_ride_request');
        if (!raw) return;

        let saved = null;
        try {
          saved = JSON.parse(raw);
        } catch (e) {
          saved = null;
        }

        if (!saved) {
          window.sessionStorage.removeItem('captain_pending_ride_request');
          return;
        }

        const ageMs = Date.now() - Number(saved.ts || 0);
        if (ageMs > RIDE_REQUEST_MAX_AGE_MS) {
          window.sessionStorage.removeItem('captain_pending_ride_request');
          return;
        }

        await onPushRideRequest({ detail: { rideId: saved.rideId, payload: saved.payload } });
        window.sessionStorage.removeItem('captain_pending_ride_request');
      } catch (e) {
        // ignore recovery errors
      }
    };

    window.addEventListener('captain:new-ride-request', onPushRideRequest);
    recoverPendingPushRideRequest();
    return () => window.removeEventListener('captain:new-ride-request', onPushRideRequest);
  }, [isOnline, captain]);

  // Initialize online state from persisted preference or server-provided captain.status
  useEffect(() => {
    try {
      const stored = localStorage.getItem('captainOnline');
      if (stored !== null) {
        setIsOnline(stored === 'true');
      } else if (captain && captain.status) {
        setIsOnline(captain.status === 'active');
      }
    } catch (e) {}
  }, [captain]);

  // cleanup simulation interval on unmount
  useEffect(() => {
    return () => {
      if (simulateRef.current) {
        clearInterval(simulateRef.current);
        simulateRef.current = null;
      }
      if (simulateDropoffRef.current) {
        clearInterval(simulateDropoffRef.current);
        simulateDropoffRef.current = null;
      }
    };
  }, []);

  // Listen for incoming chat messages and auto-open chat when a message for the current ride arrives
  useEffect(() => {
    if (!socket) return;

    const onReceive = (payload) => {
      try {
        if (!payload || !payload.rideId) return;
        // if the message belongs to the current ride, buffer it and open chat
        if (currentRide && currentRide._id && String(payload.rideId) === String(currentRide._id)) {
          const normalized = { senderId: payload.senderId || payload.from || payload.sender || null, message: payload.message || payload.text || payload.text || '', rideId: payload.rideId, timestamp: payload.timestamp || new Date().toISOString() };
          setBufferedChatMessages(b => [...b, normalized]);
          setShowChat(true);
        }
      } catch (e) {}
    };

    try { socket.on('receive-message', onReceive); } catch (e) {}
    try { socket.on('receive-ride-message', onReceive); } catch (e) {}
    try { socket.on('chat-message', onReceive); } catch (e) {}

    return () => {
      try { socket.off('receive-message', onReceive); } catch (e) {}
      try { socket.off('receive-ride-message', onReceive); } catch (e) {}
      try { socket.off('chat-message', onReceive); } catch (e) {}
    };
  }, [socket, currentRide]);

  // Refresh captain stats when rides complete or status updates to completed
  useEffect(() => {
    if (!socket) return;

    const handleRideCompleted = (payload) => {
      try {
        // payload may be a ride object or just an id string. If it's an object with earnings,
        // apply an optimistic update to the dashboard so cards update even when /captain/stats fails.
        const ride = payload && typeof payload === 'object' ? payload : null;
        if (ride && (ride.driverEarnings || ride.fare || ride.totalFare || ride.platformCommission)) {
          const driverEarnings = Number(ride.driverEarnings || ride.fare || ride.totalFare || 0) || 0;
          const platformCommission = Number(ride.platformCommission || 0) || 0;
          const paymentMethod = (ride.paymentMethod || 'card').toString();
          const paid = (ride.isPaid === true) || (ride.paymentStatus === 'paid');

          setStats((s) => {
            const newToday = Number(s.todayEarnings || 0) + driverEarnings;
            const newTodayCommission = Number(s.todayCommission || 0) + platformCommission;
            const newTotal = Number(s.totalEarnings || 0) + driverEarnings;
            const newTrips = Number(s.totalCompletedRides || s.tripsToday || 0) + 1;
            // owePlatform increases for unpaid CASH rides
            let newOwe = Number(s.owePlatform || 0);
            if (paymentMethod === 'cash' && !paid) {
              newOwe = newOwe + platformCommission;
            }
            // For cash unpaid rides, DO NOT increase availableForPayout; backend will emit wallet-updated when authoritative
            const newAvailable = (paymentMethod === 'cash' && !paid) ? Number(s.availableForPayout || 0) : Number(s.availableForPayout || 0) + driverEarnings;

            return {
              ...s,
              todayEarnings: Number(newToday.toFixed(2)),
              todayCommission: Number(newTodayCommission.toFixed(2)),
              todayNet: Number((newToday - newTodayCommission).toFixed(2)),
              totalEarnings: Number(newTotal.toFixed(2)),
              totalCompletedRides: newTrips,
              tripsToday: newTrips,
              owePlatform: Number(newOwe.toFixed(2)),
              availableForPayout: Number(newAvailable.toFixed(2)),
            };
          });

          // if the completed ride was the current active ride, clear it
          try {
            if (currentRide && ride._id && currentRide._id && String(ride._id) === String(currentRide._id)) {
              setTripActive(false);
              setCurrentRide(null);
            }
          } catch (e) {}
          // still attempt to reconcile by fetching full stats in background
          setTimeout(() => { try { fetchAndComputeStats(); } catch (e) {} }, 1200);
          return;
        }

        // fallback: if payload isn't a rich ride object, fetch canonical stats
        fetchAndComputeStats();
      } catch (e) {
        try { fetchAndComputeStats(); } catch (err) {}
      }
    };

    const handleStatusUpdate = (ride) => {
      try {
        if (ride && (ride.status === 'completed' || ride.status === 'completed'.toLowerCase())) {
          fetchAndComputeStats();
        }
      } catch (e) {}
    };

    socket.on('ride-completed', handleRideCompleted);
    socket.on('rideCompleted', handleRideCompleted);
    socket.on('rideStatusUpdate', handleStatusUpdate);
    socket.on('ride-status-updated', handleStatusUpdate);

    const handleWalletUpdated = (payload) => {
      try {
        if (!payload) return;
        const payout = (typeof payload.availableForPayout !== 'undefined') ? payload.availableForPayout : (payload.walletBalance || null);
        const owe = (typeof payload.owedToPlatform !== 'undefined') ? payload.owedToPlatform : null;
        const driverPayout = (typeof payload.driverPayout !== 'undefined') ? payload.driverPayout : null;
        setStats((s) => {
          const next = { ...s };
          if (payout !== null) { next.availableForPayout = payout; next.walletBalance = payout; }
          if (owe !== null) { next.owePlatform = owe; }
          if (driverPayout !== null) { next.driverPayout = driverPayout; }
          return next;
        });
      } catch (e) {}
    };
    socket.on('wallet-updated', handleWalletUpdated);

    return () => {
      try { socket.off('ride-completed', handleRideCompleted); } catch (e) {}
      try { socket.off('rideCompleted', handleRideCompleted); } catch (e) {}
      try { socket.off('rideStatusUpdate', handleStatusUpdate); } catch (e) {}
      try { socket.off('ride-status-updated', handleStatusUpdate); } catch (e) {}
      try { socket.off('wallet-updated', handleWalletUpdated); } catch (e) {}
    };
  }, [socket]);

  // completed rides are shown on the separate Rides tab

  useEffect(() => {
    // load stats on mount and when captain changes
    fetchAndComputeStats();
  }, [captain]);

  // Fetch pending rides from server as a fallback when socket doesn't deliver
  const fetchPending = async () => {
    try {
      const captainToken = localStorage.getItem('captainToken');
      const sessionToken = localStorage.getItem('device_session_token');
      const headers = captainToken ? { Authorization: `Bearer ${captainToken}` } : {};
      if (sessionToken) headers['x-session-token'] = sessionToken;
      const res = await axios.get(`${API}/rides/pending`, { headers, withCredentials: true });
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const nextRide = res.data.find((ride) => shouldSurfaceRideRequest(ride));
        if (!nextRide) return;
        // show pending popup when not already in an active trip flow
        if (!tripActive) {
          setIncomingRide(nextRide);
          if (!isOnline) {
            setIsOnline(true);
            try { localStorage.setItem('captainOnline', 'true'); } catch (e) {}
          }
        }
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (!isOnline) return;

    fetchPending();

    const onFocus = () => {
      fetchPending();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchPending();
      }
    };

    const poll = setInterval(() => {
      fetchPending();
    }, 8000);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isOnline, tripActive, currentRide]);

  // Fetch completed rides and compute driver stats
  const fetchAndComputeStats = async () => {
    try {
      const captainToken = localStorage.getItem('captainToken');
      const headers = captainToken ? { Authorization: `Bearer ${captainToken}` } : {};
      // send browser timezone so server can compute "today" relative to driver
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await axios.get(`${API}/captain/stats`, { headers, withCredentials: true, params: { tz } });
      const data = res && res.data ? res.data : null;
      if (!data) return setStats(null);

      setStats({
        todayEarnings: data.todayEarnings || 0,
        todayCommission: data.todayCommission || 0,
        todayNet: data.todayNet || data.todayEarnings || 0,
        totalCompletedRides: data.tripsToday || 0,
        avgFare: data.avgFare || 0,
        rating: data.rating || 5.0,
        weeklyEarnings: data.weeklyEarnings || 0,
        weeklyAverageEarnings: data.weeklyAverageEarnings || 0,
        dailyAverageEarnings: data.dailyAverageEarnings || 0,
        owePlatform: data.owePlatform || 0,
        availableForPayout: (typeof data.availableForPayout !== 'undefined') ? data.availableForPayout : (data.walletBalance || 0),
        driverPayout: (typeof data.driverPayout !== 'undefined') ? data.driverPayout : ((typeof data.availableForPayout !== 'undefined' ? data.availableForPayout : (data.walletBalance || 0)) - (data.owePlatform || 0)),
        totalEarnings: data.totalEarnings || 0,
        completionRate: data.completionRate || 100,
        walletBalance: data.walletBalance || 0
      });
    } catch (e) {
      console.error('Failed fetching captain stats', e);
      // keep existing stats (safe defaults) so UI cards remain visible
    }
  };

  // Note: intentionally NOT auto-fetching pending rides when toggling online.
  // Pending rides should only be delivered in real-time via socket events
  // when a NEW ride is created by a passenger.

  // Emit driver location updates when captain is online
  useEffect(() => {
    if (!socket) return;
    let watchId;

    if (isOnline && hasDeviceGeolocation()) {
      watchDevicePosition(
        (position) => {
          socket.emit('driverLocationUpdate', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          // silently ignore geolocation errors for now
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
      ).then((id) => {
        watchId = id;
      }).catch(() => {});
    }

    return () => {
      if (watchId !== undefined) {
        clearDeviceWatch(watchId).catch(() => {});
      }
    };
  }, [isOnline, tripActive, socket]);

  // Start in-app navigation to given coordinates
  const startInAppNavigation = (lat, lng, label = 'Pickup') => {
    if (!lat || !lng) return;
    setNavTargetCoords({ lat, lng });
    setNavTargetLabel(label);
    setNavActive(true);
  };

  // Handle arrival at navigation target — auto-navigate pickup→dropoff
  const handleNavArrived = (label) => {
    if (label === 'Pickup' || label === 'Pick-up location') {
      // Arrived at pickup — auto-start navigation to drop-off
      if (currentRide) {
        const dc = getCoord(currentRide, ['dropCoords', 'dropoffCoords', 'dropoff', 'dropoff_location', 'destination', 'destinationCoords', 'drop']);
        if (dc && dc.lat && dc.lng) {
          setNavActive(false);
          setTimeout(() => {
            startInAppNavigation(dc.lat, dc.lng, 'Drop-off location');
          }, 2000);
          return;
        }
      }
      setNavActive(false);
      setNavTargetCoords(null);
      setNavRoutePolyline(null);
    } else {
      // Arrived at drop-off — close navigation
      setNavActive(false);
      setNavTargetCoords(null);
      setNavRoutePolyline(null);
    }
  };

  // Handle route data from NavigationBar
  const handleNavRouteUpdate = (routeData) => {
    if (routeData?.polyline) {
      setNavRoutePolyline(routeData.polyline);
      // Attach the polyline to the current ride so LiveTracking can render it
      if (currentRide) {
        setCurrentRide(prev => prev ? { ...prev, routePolyline: routeData.polyline } : prev);
      }
    }
  };

  const handleAccept = (ride) => {
    // assign tripActive and clear incoming
    setTripActive(true);
    setIncomingRide(null);
    setCurrentRide(ride);
    // Auto-start in-app navigation to pickup
    const pc = ride?.pickupCoords || ride?.pickup?.coordinates || ride?.pickup_location;
    if (pc && pc.lat && pc.lng) {
      startInAppNavigation(pc.lat, pc.lng, 'Pickup');
    }
    try { window.sessionStorage.removeItem('captain_pending_ride_request'); } catch (e) {}
    // Optionally notify backend via socket or API (existing flows handle confirm)
    if (socket) {
      const carLabel = captain?.vehicleNumber || captain?.vehicle?.plate || (typeof captain?.vehicle === 'string' ? captain.vehicle : 'Vehicle');
      socket.emit('acceptRide', {
        rideId: ride._id,
        driver: {
          name: captain?.name || 'Driver',
          car: carLabel,
          rating: 4.9,
        }
      });
      // Also request server to mark ride as accepted so user receives the canonical ride object
      try {
        socket.emit('accept-ride', ride._id);
      } catch (e) {
        // ignore socket errors
      }
      // Fallback: call accept API so server updates DB and emits to rider even if socket delivery failed
      (async () => {
        try {
          const captainToken = localStorage.getItem('captainToken') || localStorage.getItem('token');
          const rideId = ride && (ride._id || ride.id || ride.rideId || ride.ride || null);
          if (!rideId) {
            console.error('Fallback accept API skipped: missing ride id', ride);
            return;
          }
          console.log('Fallback accept API calling for rideId=', rideId, 'captainToken present=', !!captainToken);
          await axios.patch(`${API}/rides/${rideId}/accept`, {}, { headers: captainToken ? { Authorization: `Bearer ${captainToken}` } : {} });
        } catch (err) {
          console.error('Fallback accept API failed', err && err.response ? err.response.data || err.response.statusText : err.message || err);
        }
      })();
      // simulation logic removed
    }
  };

  // Simulation: emit incremental driverLocationUpdate events to simulate driving toward pickup
  // helper: resolve coordinates from a ride object for various field shapes
  const getCoord = (ride, keys = []) => {
    if (!ride || typeof ride !== 'object') return null;
    for (const k of keys) {
      try {
        const v = ride[k];
        if (!v) continue;
        if (v && typeof v === 'object') {
          if (v.lat !== undefined && v.lng !== undefined) return { lat: Number(v.lat), lng: Number(v.lng) };
          if (v.latitude !== undefined && v.longitude !== undefined) return { lat: Number(v.latitude), lng: Number(v.longitude) };
          if (Array.isArray(v) && v.length >= 2) {
            const a = Number(v[0]);
            const b = Number(v[1]);
            if (!isNaN(a) && Math.abs(a) <= 90 && !isNaN(b) && Math.abs(b) <= 180) return { lat: a, lng: b };
            if (!isNaN(b) && Math.abs(b) <= 90 && !isNaN(a)) return { lat: b, lng: a };
          }
          // GeoJSON-like: { coordinates: [lng, lat] }
          if (v.coordinates && Array.isArray(v.coordinates) && v.coordinates.length >= 2) {
            const lon = Number(v.coordinates[0]);
            const lat = Number(v.coordinates[1]);
            if (!isNaN(lat) && !isNaN(lon)) return { lat, lng: lon };
          }
          // nested geometry/location objects
          if (v.location && v.location.coordinates && Array.isArray(v.location.coordinates) && v.location.coordinates.length >= 2) {
            const lon = Number(v.location.coordinates[0]);
            const lat = Number(v.location.coordinates[1]);
            if (!isNaN(lat) && !isNaN(lon)) return { lat, lng: lon };
          }
          if (v.geometry && v.geometry.coordinates && Array.isArray(v.geometry.coordinates) && v.geometry.coordinates.length >= 2) {
            const lon = Number(v.geometry.coordinates[0]);
            const lat = Number(v.geometry.coordinates[1]);
            if (!isNaN(lat) && !isNaN(lon)) return { lat, lng: lon };
          }
        } else if (typeof v === 'string') {
          const m = v.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
          if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
        }
      } catch (e) {
        continue;
      }
    }
    // fallback: destination.coordinates (GeoJSON [lng, lat])
    try {
      if (ride.destination && Array.isArray(ride.destination.coordinates) && ride.destination.coordinates.length >= 2) {
        const lon = Number(ride.destination.coordinates[0]);
        const lat = Number(ride.destination.coordinates[1]);
        if (!isNaN(lat) && !isNaN(lon)) return { lat, lng: lon };
      }
    } catch (e) {}
    return null;
  };

  const startSimulation = async (ride) => {
    if (!socket || !ride) return;
    // determine pickup / drop fallback coordinates first (robustly)
    const pickup = getCoord(ride, ['pickupCoords', 'pickup', 'pickup_location', 'originCoords', 'origin']);
    const dropoff = getCoord(ride, ['dropCoords','dropoffCoords', 'dropoff', 'dropoff_location', 'destination', 'destinationCoords', 'drop']);

    // Prefer Google Directions (overview_polyline) when pickup & dropoff available and API key configured
    let routePoints = null;
    const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (pickup && dropoff) {
      try {
        // Use server proxy to avoid CORS issues and keep API key secret
        const res = await axios.get(`${API}/maps/directions-proxy`, {
          params: {
            originLat: pickup.lat,
            originLng: pickup.lng,
            destLat: dropoff.lat,
            destLng: dropoff.lng
          }
        });
        const data = res && res.data ? res.data : null;
        const pts = (data && data.overview_polyline && data.overview_polyline.points) || (data && data.raw && data.raw.routes && data.raw.routes[0] && data.raw.routes[0].overview_polyline && data.raw.routes[0].overview_polyline.points) || (data && data.routes && Array.isArray(data.routes) && data.routes[0] && data.routes[0].overview_polyline && data.routes[0].overview_polyline.points) || null;
        if (pts) {
          const decoded = polyline.decode(pts || '');
          if (Array.isArray(decoded) && decoded.length > 0) {
            routePoints = decoded.map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));
          }
        }
      } catch (e) {
        routePoints = null;
      }
    }

    // If Directions not used / failed, prefer a stored route if available (routePath array or encoded routePolyline)
    if (!routePoints) {
      try {
        if (Array.isArray(ride.routePath) && ride.routePath.length > 0) {
          // normalize routePath entries which may be [lat,lng] or {lat,lng}
          routePoints = ride.routePath.map((p) => {
            if (Array.isArray(p) && p.length >= 2) return { lat: Number(p[0]), lng: Number(p[1]) };
            return { lat: Number(p.lat || p.latitude || p[0] || 0), lng: Number(p.lng || p.longitude || p[1] || 0) };
          }).filter(p => p && !isNaN(p.lat) && !isNaN(p.lng));
        } else if (ride.routePolyline) {
          try {
            const decoded = polyline.decode(ride.routePolyline || '');
            if (Array.isArray(decoded) && decoded.length > 0) {
              routePoints = decoded.map(([lat, lng]) => ({ lat: Number(lat), lng: Number(lng) }));
            }
          } catch (e) {
            routePoints = null;
          }
        }
      } catch (e) { routePoints = null; }
    }

    

    if (!pickup && (!routePoints || routePoints.length === 0)) {
      try { alert('No route or pickup coordinates available to simulate.'); } catch (e) {}
      return;
    }

    let startPos = null;
    try {
      const pos = await getCurrentDevicePosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
      startPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (e) {
      // fallback: start a short distance away from pickup
      const ref = pickup || (routePoints && routePoints[0]);
      startPos = ref ? { lat: ref.lat + 0.005, lng: ref.lng + 0.005 } : { lat: 0, lng: 0 };
    }

    const interpolate = (a, b, n) => {
      const out = [];
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
      }
      return out;
    };

    let path = [];
    if (routePoints && routePoints.length > 0) {
      // startPos -> first route point, then follow routePoints
      path = path.concat(interpolate(startPos, routePoints[0], 8));
      // Optionally downsample long polylines for performance
      const sampleEvery = Math.max(1, Math.floor(routePoints.length / 120));
      for (let i = 0; i < routePoints.length; i += sampleEvery) path.push(routePoints[i]);
      // ensure final route point included
      const last = routePoints[routePoints.length - 1];
      if (!path.length || path[path.length - 1].lat !== last.lat || path[path.length - 1].lng !== last.lng) path.push(last);
      // If we have a dropoff coordinate and the route's final point isn't the dropoff,
      // append an interpolation from the route end to the dropoff so simulation continues.
      const isNear = (a, b) => a && b && Math.abs(a.lat - b.lat) < 0.0006 && Math.abs(a.lng - b.lng) < 0.0006;
      try {
        if (dropoff && (!last || !isNear(last, dropoff))) {
          const seg = 40;
          path = path.concat(interpolate(last || routePoints[routePoints.length - 1], dropoff, seg));
          // ensure exact final dropoff included
          path.push(dropoff);
        }
      } catch (e) {}
    } else {
      // fallback: start -> pickup -> dropoff
      const segSteps = 30;
      path = path.concat(interpolate(startPos, pickup, segSteps));
      if (dropoff) path = path.concat(interpolate(pickup, dropoff, segSteps));
    }

    if (!path || path.length === 0) return;

    let idx = 0;
    if (simulateRef.current) { clearInterval(simulateRef.current); simulateRef.current = null; }
    setSimulateActive(true);
    setSimulatedDriverPosition(path[0]);
    simulateRef.current = setInterval(() => {
      try {
        const pos = path[idx] || path[path.length - 1];
        setSimulatedDriverPosition(pos);
        try { socket.emit('driverLocationUpdate', { lat: pos.lat, lng: pos.lng, rideId: ride._id }); } catch (e) {}
        idx += 1;
        if (idx >= path.length) {
          clearInterval(simulateRef.current);
          simulateRef.current = null;
          setSimulateActive(false);
        }
      } catch (e) {
        clearInterval(simulateRef.current);
        simulateRef.current = null;
        setSimulateActive(false);
      }
    }, 1000);
  };

  const stopSimulation = () => {
    if (simulateRef.current) { clearInterval(simulateRef.current); simulateRef.current = null; }
    setSimulateActive(false);
    setSimulatedDriverPosition(null);
  };

  const stopDropoffSimulation = () => {
    if (simulateDropoffRef.current) { clearInterval(simulateDropoffRef.current); simulateDropoffRef.current = null; }
    setSimulateDropoffActive(false);
    // don't clear `simulatedDriverPosition` so UI can remain consistent; if you'd like to clear, uncomment next line
    // setSimulatedDriverPosition(null);
  };

  const handleSimulate = (ride) => {
    if (simulateActive) stopSimulation(); else startSimulation(ride || currentRide);
  };

  // Simulate only the dropoff leg: move from pickup -> dropoff
  const startDropoffSimulation = async (ride) => {
    if (!socket || !ride) return;
    // determine pickup & drop coords
    const pickup = getCoord(ride, ['pickupCoords', 'pickup', 'pickup_location', 'originCoords', 'origin']);
    const dropoff = getCoord(ride, ['dropCoords','dropoffCoords', 'dropoff', 'dropoff_location', 'destination', 'destinationCoords', 'drop']);

    if (!pickup || !dropoff) {
      try { alert('Pickup or dropoff coordinates are missing for drop-off simulation.'); } catch (e) {}
      return;
    }

    const interpolate = (a, b, n) => {
      const out = [];
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        out.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
      }
      return out;
    };

    const segSteps = 40;
    const path = [];
    // start exactly at pickup, then interpolate to dropoff
    path.push(pickup);
    path.push(...interpolate(pickup, dropoff, segSteps));

    if (!path || path.length === 0) return;

    let idx = 0;
    if (simulateDropoffRef.current) { clearInterval(simulateDropoffRef.current); simulateDropoffRef.current = null; }
    setSimulateDropoffActive(true);
    setSimulatedDriverPosition(path[0]);
    simulateDropoffRef.current = setInterval(() => {
      try {
        const pos = path[idx] || path[path.length - 1];
        setSimulatedDriverPosition(pos);
        try { socket.emit('driverLocationUpdate', { lat: pos.lat, lng: pos.lng, rideId: ride._id }); } catch (e) {}
        idx += 1;
        if (idx >= path.length) {
          clearInterval(simulateDropoffRef.current);
          simulateDropoffRef.current = null;
          setSimulateDropoffActive(false);
        }
      } catch (e) {
        clearInterval(simulateDropoffRef.current);
        simulateDropoffRef.current = null;
        setSimulateDropoffActive(false);
      }
    }, 1000);
  };

  const handleSimulateDropoff = (ride) => {
    if (simulateDropoffActive) stopDropoffSimulation(); else startDropoffSimulation(ride || currentRide);
  };

  

  const handleNavigate = ({ target = 'pickup', trip } = {}) => {
    setNavTarget(target);
    setCurrentRide(trip || currentRide);
    setNavVisible(true);
  };

  const handleDecline = (ride) => {
    rememberDeclinedRide(ride);
    setIncomingRide(null);
    try { window.sessionStorage.removeItem('captain_pending_ride_request'); } catch (e) {}
    const rideId = ride && (ride._id || ride.rideId || ride.id || null);
    if (socket && rideId) {
      socket.emit('captain_decline_request', { rideId, captainId: captain?._id });
    }
    (async () => {
      try {
        if (!rideId) return;
        const captainToken = localStorage.getItem('captainToken') || localStorage.getItem('token');
        const sessionToken = localStorage.getItem('device_session_token');
        const headers = captainToken ? { Authorization: `Bearer ${captainToken}` } : {};
        if (sessionToken) headers['x-session-token'] = sessionToken;
        await axios.patch(`${API}/rides/${rideId}/decline`, {}, { headers, withCredentials: true });
      } catch (err) {
        console.error('Decline ride API failed', err?.response?.data || err?.message || err);
      }
    })();
  };

  

  return (
    <>
    <div className="min-h-screen w-screen text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Driver Header */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm mb-5">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400" />
          <div className="p-5">
            <div className="flex items-center gap-4">
              {/* Driver avatar */}
              {captain?.profileImage ? (
                <img
                  src={captain.profileImage.startsWith('/') ? `${API}${captain.profileImage}` : captain.profileImage}
                  alt="Profile"
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-white/10"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center text-xl font-bold shadow-lg">
                  {captain?.fullname?.firstname?.[0]?.toUpperCase() || captain?.name?.[0]?.toUpperCase() || 'D'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white truncate">
                  {captain?.fullname ? `${captain.fullname.firstname || ''} ${captain.fullname.lastname || ''}`.trim() : (captain?.name || 'Driver')}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    isOnline
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                      : 'bg-gray-500/15 text-gray-400 border-gray-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    {isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-amber-400">⭐</span>
                  <span className="text-sm font-bold text-amber-300">{stats.rating || '5.0'}</span>
                </div>
              </div>
            </div>

            {/* Online/Offline Toggle */}
            <div className="mt-4 flex justify-center">
              <button
                onClick={async () => {
                  try {
                    const captainToken = localStorage.getItem('captainToken');
                    const headers = captainToken ? { Authorization: `Bearer ${captainToken}` } : {};
                    if (!isOnline) {
                      setIncomingRide(null);
                      setCurrentRide(null);
                      await axios.post(`${API}/captain/go-online`, {}, { headers, withCredentials: true });
                      setIsOnline(true);
                      try { localStorage.setItem('captainOnline', 'true'); } catch (e) {}
                      if (socket && captain && captain._id) {
                        socket.emit('captain-online', captain._id);
                        try { socket.emit('driver-online', captain._id); } catch (e) {}
                      }
                    } else {
                      await axios.post(`${API}/captain/go-offline`, {}, { headers, withCredentials: true });
                      if (socket && captain && captain._id) {
                        try { socket.emit('driver-offline', captain._id); } catch (e) {}
                      }
                      setIsOnline(false);
                      try { localStorage.setItem('captainOnline', 'false'); } catch (e) {}
                      setIncomingRide(null);
                      setCurrentRide(null);
                    }
                  } catch (err) {
                    console.error('Error toggling online status', err);
                    setIsOnline((s) => !s);
                  }
                }}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold shadow-lg transition-all transform active:scale-[0.97] ${
                  isOnline
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-red-500/20 hover:shadow-red-500/30'
                    : 'bg-gradient-to-r from-indigo-500 to-sky-500 shadow-indigo-500/20 hover:shadow-indigo-500/30'
                }`}
              >
                {isOnline ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                )}
                {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
              </button>
            </div>
          </div>
        </div>

        {/* Live map for captain */}
        <div className="h-[45vh] w-full rounded-2xl bg-black/20 backdrop-blur-md mb-4 border border-white/10 overflow-hidden relative transition-all duration-300">
          <LiveTracking ride={currentRide} role="captain" simulatedDriverPosition={simulatedDriverPosition} navDestination={navActive ? navTargetCoords : null} navMode={navActive} />
          {navActive && (
            <NavigationBar
              targetCoords={navTargetCoords}
              targetLabel={navTargetLabel}
              onRouteUpdate={handleNavRouteUpdate}
              onArrived={handleNavArrived}
              onClose={() => { setNavActive(false); setNavTargetCoords(null); setNavRoutePolyline(null); }}
            />
          )}
        </div>

        {/* WALLET SUMMARY SECTION */}
        {stats && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Available for Payout',
                value: `R${(stats.availableForPayout && stats.availableForPayout > 0) ? Number(stats.availableForPayout).toFixed(2) : '0.00'}`,
                subtitle: 'Ready to withdraw',
                icon: FiDollarSign,
                variant: 'from-emerald-500/20 to-emerald-400/20 border-emerald-500/30 text-emerald-300'
              },
              {
                title: 'You Owe Platform',
                value: `R${(stats.owePlatform && stats.owePlatform > 0) ? Number(stats.owePlatform).toFixed(2) : '0.00'}`,
                subtitle: 'Outstanding balance',
                icon: FiTrendingDown,
                variant: stats.owePlatform > 0 ? 'from-red-500/20 to-red-400/20 border-red-500/30 text-red-300' : 'from-slate-500/10 to-slate-500/10 border-slate-400/20 text-gray-400'
              },
              {
                title: 'Net Balance',
                value: `R${(typeof stats.driverPayout !== 'undefined') ? Number(stats.driverPayout).toFixed(2) : ((Number(stats.availableForPayout || 0) - Number(stats.owePlatform || 0)).toFixed(2))}`,
                subtitle: 'After fees',
                icon: FiTrendingUp,
                variant: (typeof stats.driverPayout !== 'undefined' && stats.driverPayout < 0) ? 'from-red-500/20 to-red-400/20 border-red-500/30 text-red-300' : 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30 text-blue-200'
              }
            ].map(({ title, value, subtitle, icon: Icon, variant }, idx) => (
              <div key={idx} className={`relative overflow-hidden rounded-2xl border ${variant} bg-gradient-to-br p-5 shadow-[0_15px_35px_rgba(0,0,0,0.25)] backdrop-blur-lg transition-all hover:scale-[1.01] hover:shadow-[0_20px_40px_rgba(0,0,0,0.35)]`}>
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-300">{title}</p>
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/15 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
                <p className="mt-2 text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        )}

        

        

        {/* DRIVER STATS SECTION */}
        {stats && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Today Earnings',
                value: `R${stats.todayEarnings.toFixed(2)}`,
                icon: FiClock,
                colorClass: 'text-emerald-300',
                variant: 'from-emerald-500/20 to-emerald-300/15 border-emerald-500/30'
              },
              {
                title: 'Daily Avg',
                value: `R${(typeof stats.dailyAverageEarnings !== 'undefined' ? Number(stats.dailyAverageEarnings).toFixed(2) : ((stats.todayNet || stats.todayEarnings || 0).toFixed(2)))}`,
                icon: FiTrendingUp,
                colorClass: 'text-blue-200',
                variant: 'from-blue-500/20 to-indigo-500/15 border-indigo-500/30'
              },
              {
                title: 'Trips Today',
                value: `${stats.totalCompletedRides}`,
                icon: FiShield,
                colorClass: 'text-purple-200',
                variant: 'from-purple-500/20 to-pink-500/15 border-purple-500/30'
              }
            ].map(({ title, value, icon: Icon, colorClass, variant }, idx) => (
              <div key={idx} className={`relative overflow-hidden rounded-2xl border ${variant} bg-gradient-to-br p-4 shadow-lg backdrop-blur-lg transition-all hover:scale-[1.01] hover:shadow-xl`}>
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -left-6 -bottom-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-300">{title}</p>
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/15 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <p className={`mt-3 text-2xl font-semibold ${colorClass}`}>{value}</p>
              </div>
            ))}

            <div className="relative overflow-hidden rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/10 via-yellow-500/10 to-orange-500/10 p-4 shadow-lg backdrop-blur-lg">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">Rating</p>
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/15 text-white">
                  <FiStar className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-yellow-300">⭐ {stats.rating || '5.0'}</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 p-4 shadow-lg backdrop-blur-lg">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">Weekly Avg</p>
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/15 text-white">
                  <FiClock className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-blue-200">R{(typeof stats.weeklyAverageEarnings !== 'undefined' ? Number(stats.weeklyAverageEarnings).toFixed(2) : (stats.weeklyEarnings ? (Number(stats.weeklyEarnings)/7).toFixed(2) : '0.00'))}</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 shadow-lg backdrop-blur-lg">
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-300">Total Earnings</p>
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/15 text-white">
                  <FiDollarSign className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-purple-300">R{(stats.totalEarnings || 0).toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Active trip card placeholder (hidden unless tripActive true) */}
        {tripActive && (
          <div className="mb-4">
            <ActiveTripCard
              trip={currentRide || incomingRide}
              onEnd={() => setTripActive(false)}
              onNavigate={(opts) => {
                const trip = currentRide || opts?.trip;
                const pc = trip?.pickupCoords || trip?.pickup?.coordinates || trip?.pickup_location;
                const dc = trip?.dropCoords || trip?.destination?.coordinates || trip?.drop_location;
                const target = opts?.target === 'dropoff' ? dc : pc;
                const label = opts?.target === 'dropoff' ? 'Dropoff' : 'Pickup';
                if (target && target.lat && target.lng) {
                  startInAppNavigation(target.lat, target.lng, label);
                }
              }}
              onChat={(trip) => { setCurrentRide(trip); setShowChat(true); }}
            />
            {showChat && currentRide && (
              <RideChat socket={socket} ride={currentRide} user={captain} otherUser={currentRide.user} initialMessages={bufferedChatMessages} onOpen={() => setBufferedChatMessages([])} onClose={() => setShowChat(false)} />
            )}
          </div>
        )}

        {navVisible && currentRide && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNavVisible(false)} />
            <NavigationModal ride={currentRide} target={navTarget} onClose={() => setNavVisible(false)} />
          </>
        )}

        {/* Bottom spacing so bottom nav doesn't overlap */}
        <div className="h-28" />
        {/* Completed rides moved to the Rides tab */}
      </div>

      {/* Ride request popup - only visible when online and incomingRide exists */}
      {incomingRide && (
        <RideRequestPopup ride={incomingRide} onAccept={handleAccept} onDecline={handleDecline} />
      )}

      {/* SOS Button removed per request */}

      <DriverBottomNav />
    </div>
    </>
  );
}

export default CaptainHome;
