import React, { useEffect, useContext, useState } from "react";
import logoPath from "../config/logo";
import { useGSAP } from "@gsap/react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import "remixicon/fonts/remixicon.css";
import LocationSearchPanel from "../../components/LocationSearchPanel";
import VehiclePanel from "../../components/VehiclePanel";
import ConfirmedRide from "../../components/ConfirmedRide";
import FindingDriver from "../../components/FindingDriver";
import DriverSelected from "../../components/DriverSelected";
import DriverPreviewCard from "../components/DriverPreviewCard";
import axios from "axios";
import API_BASE_URL from '../config/api';
import { SocketContext } from "../context/SocketContext";
import { UserDataContext } from "../context/UserContext";
import { RideContext } from "../context/RideContext";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import LiveTracking from "../components/LiveTracking";
import { loadGoogleMaps } from "../utils/loadGoogleMaps";
import { clearDeviceWatch, getCurrentDevicePosition, hasDeviceGeolocation, watchDevicePosition } from "../utils/deviceGeolocation";

const ui = {
  bg: "#0B0F1A",
  card: "#121826",
  primary: "#4F7CFF",
  text: "#FFFFFF",
  subtext: "#9CA3AF",
  accent: "#22C55E",
};

function Home() {
  const sumbitHandler = (e) => {
    e.preventDefault();
  };

  const [searching, setSearching] = useState(false);
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const API = API_BASE_URL.replace(/\/api$/, '');
  const [showNoDriversModal, setShowNoDriversModal] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  const handleFindDriver = async () => {
    try {
      // clear any previous "no drivers" modal when starting a new search
      setShowNoDriversModal(false);
      setSearchedOnce(true);
      if (!pickup || !destination) {
        alert('Pickup and destination required');
        return;
      }

      setFindingDriver(true);
      setSearching(true);
      setAssignedDriver(null);
      setAvailableDrivers([]);

      // auto-timeout to stop searching if no driver accepts in 60s
      try {
        if (findTimeoutRef.current) clearTimeout(findTimeoutRef.current);
        findTimeoutRef.current = setTimeout(() => {
          setFindingDriver(false);
          setSearching(false);
          setAvailableDrivers([]);
          setShowNoDriversModal(true);
          findTimeoutRef.current = null;
        }, 60000);
      } catch (e) {}

      // create the ride on the backend
      const created = await createRide();
      // immediately tell drivers there's a request (fast UX)
      try {
        if (socket && created) {
          socket.emit('request-drivers', created);
          // ensure rider is in their personal room so they receive ride updates
          try {
            const userId = (created && created.user && (created.user._id || created.user.id)) || created.userId || null;
            if (userId && socket) socket.emit('join-room', userId.toString());
          } catch (e) {}
        }
      } catch (e) {
        // ignore socket emit errors
      }

      // Simulate nearby drivers appearing
      setTimeout(() => {
        const drivers = [
          { id: 1, fullName: "John D", vehicleType: "Toyota Corolla", rating: 4.9, distance: 1.9, profileImage: "https://i.pravatar.cc/150?img=12" },
          { id: 2, fullName: "Mike S", vehicleType: "VW Polo", rating: 4.7, distance: 2.5, profileImage: "https://i.pravatar.cc/150?img=8" }
        ];
        setAvailableDrivers(drivers.map(d => ({
          ...d,
          _id: d._id || d.id,
          distanceValue: d.distance || 0,
          distance: (d.distance || 0).toFixed(1) + " km",
          eta: calculateETA(d.distance || 0)
        })));
      }, 2000);

    } catch (err) {
      console.error('Error creating ride', err);
      setSearching(false);
      setFindingDriver(false);
    }
  };


  const fetchAvailableDrivers = async () => {
    try {
      const res = await axios.get(`${API}/captain/available`);
      setNearbyDrivers(res.data || []);
    } catch (err) {
      console.error('Error fetching available drivers', err);
    }
  };

  // Ensure core ride state exists first
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState(null);
  const [price, setPrice] = useState(null);
  const [driversVisible, setDriversVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [passengers, setPassengers] = useState(1);

  // Client-side cash limit for UX: match backend CASH_LIMIT (currency units)
  const CASH_LIMIT = Number(import.meta.env.VITE_CASH_LIMIT || 600);
  const cashDisabled = (estimatedFare !== null) && (Number(estimatedFare || 0) >= CASH_LIMIT);

  
  
  const [pickupLocation, setPickupLocation] = React.useState(null); // { address, lat, lng }
  const [dropoffLocation, setDropoffLocation] = React.useState(null); // { address, lat, lng }
  const [panelOpen, setPanelOpen] = React.useState(false);
  const panelRef = React.useRef(null);
  const titleRef = React.useRef(null);
  const serachRef = React.useRef(null);
  const pickupInputRef = React.useRef(null);
  const destInputRef = React.useRef(null);
  const vehicleRef = React.useRef(null);
  const arrowRef = React.useRef(null);
  const vehicleFoundRef = React.useRef(null);
  const driverSelectedRef = React.useRef(null);
  const confirmRidePanelRef = React.useRef(null);
  const findTimeoutRef = React.useRef(null);
  const [vehiclePanel, setVehiclePanel] = React.useState(false);
  const [confirmRidePanel, setConfirmRidePanel] = React.useState(false);
  const [vehicleFound, setVehicleFound] = React.useState(false);
  const [driverSelected, setDriverSelected] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState([]); // Initialize as empty array
  const [activeInput, setActiveInput] = React.useState(null); // 'pickup' or 'destination'
  const [prices, setPrices] = React.useState([]);
  const [distanceData, setDistanceData] = React.useState(null);
  const [selectedVehicle, setSelectedVehicle] = React.useState(null);
  const [selectedPrice, setSelectedPrice] = React.useState(null);
  const [ride, setRide] = useState(null);
  const { activeRide, setActiveRide } = useContext(RideContext);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [findingDriver, setFindingDriver] = useState(false);
  const [driverFound, setDriverFound] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);

  function calculateETA(distanceKm) {
    const avgSpeedKmPerMin = 0.5; // 30 km/h ~ 0.5 km per minute
    const minutes = Math.max(1, Math.ceil((distanceKm || 0) / avgSpeedKmPerMin));
    return `${minutes} min`;
  }

  // Use device geolocation and optionally reverse-geocode to a human address.
  // type: 'pickup' or 'destination'
  const handleUseCurrent = async (type = 'pickup') => {
    if (!hasDeviceGeolocation()) return alert('Geolocation not available');

    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        try {
          const perm = await navigator.permissions.query({ name: 'geolocation' });
          if (perm && perm.state === 'denied') {
            alert('Location permission is denied. To enable, open your browser settings and allow location access for this site.');
            return;
          }
        } catch (e) {
          // ignore permission query errors and continue to request
        }
      }
    } catch (e) {}

    try {
      const pos = await getCurrentDevicePosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const fallback = `Current location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

      if (type === 'pickup') {
        setPickup(fallback);
        setPickupLocation({ address: null, lat, lng });
      } else {
        setDestination(fallback);
        setDropoffLocation({ address: null, lat, lng });
      }

      try {
        const google = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
        if (google && google.maps && google.maps.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const address = results[0].formatted_address || results[0].name || fallback;
              if (type === 'pickup') {
                setPickup(address);
                setPickupLocation({ address, lat, lng });
              } else {
                setDestination(address);
                setDropoffLocation({ address, lat, lng });
              }
            }
          });
        }
      } catch (e) {
        console.error('reverse geocode failed', e);
      }
    } catch (err) {
      try { console.error('geolocation error', err); } catch (e) {}
      try {
        if (err && err.code === 1) {
          alert('Location permission denied. Please allow location access in your browser and try again.');
          return;
        }
        if (err && err.code === 2) {
          try {
            const ipRes = await fetch('https://ipapi.co/json/');
            if (ipRes && ipRes.ok) {
              const ipj = await ipRes.json();
              const lat = parseFloat(ipj.latitude);
              const lng = parseFloat(ipj.longitude);
              if (!isNaN(lat) && !isNaN(lng)) {
                const fallback = `Approximate location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                if (type === 'pickup') {
                  setPickup(fallback);
                  setPickupLocation({ address: null, lat, lng });
                } else {
                  setDestination(fallback);
                  setDropoffLocation({ address: null, lat, lng });
                }
                try {
                  const google = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
                  if (google && google.maps && google.maps.Geocoder) {
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                      if (status === 'OK' && results && results[0]) {
                        const address = results[0].formatted_address || fallback;
                        if (type === 'pickup') {
                          setPickup(address);
                          setPickupLocation({ address, lat, lng });
                        } else {
                          setDestination(address);
                          setDropoffLocation({ address, lat, lng });
                        }
                      }
                    });
                  }
                } catch (e) {}
                return;
              }
            }
          } catch (e) {}
        }
        alert('Unable to get current location. Make sure location services are enabled and this page is served over HTTPS or https://vexomove.onrender.com.');
      } catch (e) {
        alert('Unable to get current location');
      }
    }
  };

  const handleSelectDriver = async (driver) => {
    try {
      setFindingDriver(true);
      setSearching(true);
      // build ride payload
      const token = localStorage.getItem('token');
      const payload = {
        pickupAddress: pickup,
        dropAddress: destination,
        pickupCoords: pickupLocation || {},
        dropCoords: dropoffLocation || {},
        vehicle: selectedVehicle || 'car',
        selectedDriverId: driver._id || driver.id,
        distance: distance || distanceKm || 0.1,
        paymentMethod: paymentMethod,
      };

      const res = await axios.post(`${API}/rides/create`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res && res.data) {
        // backend returns created ride object
        setRide(res.data);
        // keep finding overlay active while waiting for driver to accept
        setAvailableDrivers([]);
      }
    } catch (err) {
      console.error('Select driver failed', err);
      setFindingDriver(false);
      setSearching(false);
    }
  };
  // Ride estimator states
  
  const [distanceKm, setDistanceKm] = React.useState(0);
  const [rideData, setRideData] = React.useState({ distanceInKm: null, estimatedFare: null });
  const [loadingDrivers, setLoadingDrivers] = React.useState(false);
  const [loadingPrice, setLoadingPrice] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hideMap, setHideMap] = useState(false);

  // Prepare a distance object for VehiclePanel (it expects distance.duration.value and distance.distance.value)
  const vehicleDistance = React.useMemo(() => {
    if (distanceData && distanceData.distance && distanceData.duration) return distanceData;
    // Fallback estimate: assume average speed 40 km/h to estimate duration
    const meters = (distanceKm || 0) * 1000;
    const seconds = Math.round(((distanceKm || 0) / 40) * 3600);
    return { distance: { value: meters }, duration: { value: seconds }, status: "OK" };
  }, [distanceData, distanceKm]);

  // Price is calculated on the server; frontend must not compute or send fare.
  const fetchPrices = async () => {
    // intentionally left blank to avoid client-side fare computation
    return null;
  };

  useEffect(() => {
    if (pickup && destination) {
      fetchPrices(pickup, destination);
    }
  }, [pickup, destination]);

  const findDrivers = async () => {
    setLoadingDrivers(true);
    try {
      await fetchNearbyDrivers();
      console.log("Nearby drivers:", nearbyDrivers);
    } catch (err) {
      console.log(err);
    }
    setLoadingDrivers(false);
  };

  const handleFindDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/ride/find-drivers`,
        { pickup, dropoff: destination, price },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("Drivers:", res.data);
      setNearbyDrivers(res.data || []);
    } catch (err) {
      console.log("Driver search error", err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const { socket } = useContext(SocketContext);
  const { user } = useContext(UserDataContext);
  const navigate = useNavigate();
  const [driverEta, setDriverEta] = useState(null);
  const [driverLocationState, setDriverLocationState] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [tripSeconds, setTripSeconds] = useState(0);

  // const socket = io(`${import.meta.env.VITE_BASE_URL}`);

  // console.log(user._id);

  useEffect(() => {
    if (!socket || !user || !user._id) return;
    socket.emit("join", { userType: "user", userId: user._id });
  }, [socket, user]);

  socket.on("ride-started", (ride) => {
    // console.log("ride started");
    setDriverSelected(false);
    navigate("/riding", { state: { ride } }); // Updated navigate to include ride data
  });

  // LISTEN FOR DRIVER ACCEPT EVENT
  useEffect(() => {
    if (!socket) return;

    const onAccepted = (ride) => {
      try {
        console.debug('Home.jsx received ride-accepted', ride);
        localStorage.setItem('activeRide', JSON.stringify(ride));
      } catch (e) {}
      if (findTimeoutRef.current) {
        clearTimeout(findTimeoutRef.current);
        findTimeoutRef.current = null;
      }
      setFindingDriver(false);
      setDriverFound(true);
      setRide(ride);
      try { setActiveRide(ride); } catch (e) {}
      try { navigate('/account/rides'); } catch (e) {}
    };

    // support both naming conventions
    socket.on("ride-accepted", onAccepted);
    socket.on("rideAccepted", onAccepted);

    return () => {
      socket.off("ride-accepted", onAccepted);
      socket.off("rideAccepted", onAccepted);
    };
  }, [socket]);

  // ensure 'no drivers' modal closes if a driver accepts while it's shown
  useEffect(() => {
    if (driverFound || ride) {
      setShowNoDriversModal(false);
    }
  }, [driverFound, ride]);

  useEffect(() => {
    if (findingDriver) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [findingDriver]);

  // Listen for driver location events targeted at this user
  useEffect(() => {
    if (!socket) return;
    const onDriverLocation = (data) => {
      try {
        setDriverLocationState({ lat: data.lat, lng: data.lng });
      } catch (e) {}
    };

    socket.on('driverLocation', onDriverLocation);
    return () => socket.off('driverLocation', onDriverLocation);
  }, [socket]);

  // Mirror driver location into global activeRide so other pages can read it
  useEffect(() => {
    if (!driverLocationState) return;
    try {
      setActiveRide((prev) => {
        if (!prev) return prev;
        return { ...prev, driverLocation: driverLocationState };
      });
    } catch (e) {}
  }, [driverLocationState]);

  // ETA countdown: convert driverEta string like '5 min' to minutes integer and countdown
  useEffect(() => {
    if (!driverEta) return;
    // attempt to parse integer minutes from string
    const m = parseInt(String(driverEta).match(/\d+/)?.[0] || '0', 10);
    if (!m || m <= 0) return;
    setEtaMinutes(m);
    const t = setInterval(() => {
      setEtaMinutes((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 60000);
    return () => clearInterval(t);
  }, [driverEta]);

  // reflect ETA minutes into activeRide
  useEffect(() => {
    if (etaMinutes === null) return;
    try {
      setActiveRide((prev) => {
        if (!prev) return prev;
        return { ...prev, etaMinutes };
      });
    } catch (e) {}
  }, [etaMinutes]);

  // Trip timer when activeRide becomes ongoing
  useEffect(() => {
    if (!activeRide || activeRide.status !== 'ongoing') {
      setTripSeconds(0);
      return;
    }
    const iv = setInterval(() => setTripSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [activeRide]);

  useEffect(() => {
    try {
      setActiveRide((prev) => {
        if (!prev) return prev;
        return { ...prev, tripSeconds };
      });
    } catch (e) {}
  }, [tripSeconds]);

  // Listen for ride status updates (ongoing/completed)
  useEffect(() => {
    if (!socket) return;

    const onStatusUpdate = (updatedRide) => {
      try {
        // only keep activeRide in context when ride is an active status; otherwise clear it
        const ACTIVE_STATUSES = ['accepted', 'arriving', 'ongoing'];
        if (updatedRide && ACTIVE_STATUSES.includes(String(updatedRide.status))) {
          setActiveRide(updatedRide);
          try { localStorage.setItem('activeRide', JSON.stringify(updatedRide)); } catch (e) {}
        } else {
          try { if (setActiveRide) setActiveRide(null); } catch (e) {}
          try { localStorage.removeItem('activeRide'); } catch (e) {}
        }
      } catch (e) {}
    };

    socket.on('rideStatusUpdate', onStatusUpdate);
    socket.on('ride-status-update', onStatusUpdate);

    return () => {
      socket.off('rideStatusUpdate', onStatusUpdate);
      socket.off('ride-status-update', onStatusUpdate);
    };
  }, [socket]);

  // Listen specifically for driver accept relay (driver object)
  useEffect(() => {
    if (!socket) return;

    const onDriverAccepted = (driver) => {
      if (findTimeoutRef.current) {
        clearTimeout(findTimeoutRef.current);
        findTimeoutRef.current = null;
      }
      setSearching(false);
      setFindingDriver(false);
      setAssignedDriver(driver);
      setAvailableDrivers([]);
    };

    socket.on("rideAccepted", onDriverAccepted);
    socket.on("ride-accepted", onDriverAccepted);

    return () => {
      socket.off("rideAccepted", onDriverAccepted);
      socket.off("ride-accepted", onDriverAccepted);
    };
  }, [socket]);

  // Initialize Google Places Autocomplete using the loader
  React.useEffect(() => {
    let pickupAutocomplete = null;
    let destinationAutocomplete = null;
    let mounted = true;

    async function init() {
      const google = await loadGoogleMaps(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
      if (!mounted || !google || !google.maps || !google.maps.places) return;

      try {
        // We intentionally do NOT create google.maps.places.Autocomplete instances here
        // because the native Google dropdown conflicts with our custom LocationSearchPanel.
        // Suggestions are fetched via `fetchSuggestions` and rendered in the panel below.
        // If you want to re-enable native Autocomplete later, uncomment the code and
        // handle the added listeners accordingly.
      } catch (e) {
        // ignore
      }
    }

    init();

    return () => {
      mounted = false;
      try {
        if (pickupAutocomplete && window.google && window.google.maps) {
          window.google.maps.event.clearInstanceListeners(pickupAutocomplete);
        }
        if (destinationAutocomplete && window.google && window.google.maps) {
          window.google.maps.event.clearInstanceListeners(destinationAutocomplete);
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  const fetchSuggestions = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/maps/get-suggestions`, {
        params: { address: query },
        headers,
      });
      // console.log(response);
      // Make sure we're setting an array of predictions
      setSuggestions(response.data || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]); // Reset to empty array on error
    }
  };

  const fetchVehiclePrices = async (destination, pickup) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/maps/get-prices`, {
        params: { origin: pickup, destination: destination },
        headers,
      });
      // set vehicle pricing options (if backend returns array-like data)
      setPrices(response.data || []);
    } catch (error) {
      console.error("Error fetching vehicle prices:", error);
      setPrices([]); // Reset to empty array on error
    }
  };

  const fetchDistance = async (destination, pickup) => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/maps/get-distance`, {
        params: { origin: pickup, destination: destination },
        headers,
      });
      // console.log(response.data);
      // Make sure we're setting an array of predictions
      setDistanceData(response.data || null);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setDistanceData(null); // Reset on error
    }
  };

    // When both pickup and dropoff locations are set with coordinates, fetch prices
    useEffect(() => {
      if (pickupLocation && dropoffLocation) {
          // call existing pricing endpoint which expects origin/destination strings
            fetchVehiclePrices(dropoffLocation.address, pickupLocation.address);
          // Optionally fetch distance as well
          fetchDistance(dropoffLocation.address, pickupLocation.address);
            // get server-side fare estimate
            (async () => {
              try {
                const token = localStorage.getItem('token');
                const res = await axios.post(`${API}/rides/estimate`, { pickupCoords: pickupLocation, dropCoords: dropoffLocation, passengers }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                if (res && res.data) {
                  console.debug('Estimate response:', res.data);
                  // server returns { distance, estimate }
                  const dist = typeof res.data.distance === 'number' ? res.data.distance : (res.data.distance ? Number(res.data.distance) : null);
                  const est = typeof res.data.estimate !== 'undefined' ? res.data.estimate : (res.data.fare || null);
                  if (est !== null) setEstimatedFare(est);
                  if (dist !== null) setDistanceKm(dist);
                  setRideData({ distanceInKm: dist, estimatedFare: est });
                }
              } catch (e) {
                // ignore estimate failures
              }
            })();
        }
    }, [pickupLocation, dropoffLocation, passengers]);

    // Remove client-side fare estimation (backend is the source of truth)
    useEffect(() => {}, [pickupLocation, dropoffLocation]);

  const logoutUser = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.get(`${API}/users/logout`, {
        params: { origin: pickup, destination: destination },
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate("/login");
    } catch (error) {
      console.error("Error Logging out :", error);
    }
  };

  // Fetch nearby drivers
  const fetchNearbyDrivers = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // First, get coordinates for pickup location
      if (!pickup) {
        console.log("No pickup location set");
        return;
      }

      // Prefer using pickupLocation coordinates if available
      let ltd, lng;
      if (pickupLocation && pickupLocation.lat && pickupLocation.lng) {
        ltd = pickupLocation.lat;
        lng = pickupLocation.lng;
      } else {
        // Fallback: resolve coordinates by address
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const coordsResponse = await axios.get(`${API}/maps/get-coordinates`, {
          params: { address: pickup },
          headers,
        });

        ltd = coordsResponse.data.ltd;
        lng = coordsResponse.data.lng;
      }

      // Fetch nearby drivers with coordinates
      const headers2 = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/maps/nearby`, {
        params: { lat: ltd, lng: lng },
        headers: headers2,
      });
      setNearbyDrivers(response.data || []);
    } catch (error) {
      console.error("Error fetching nearby drivers:", error);
      setNearbyDrivers([]);
    }
  };

  // Fetch nearby drivers when vehicle is found
  useEffect(() => {
    if (vehicleFound) {
      fetchNearbyDrivers();
      // Optional: Refresh drivers every 10 seconds
      const interval = setInterval(fetchNearbyDrivers, 10000);
      return () => clearInterval(interval);
    }
  }, [vehicleFound]);

  socket.on("ride-confirmed", (ride) => {
    // console.log("ride confirmed has been called");
    setVehicleFound(false);
    setDriverSelected(true);
    setRide(ride);
  });

  if (
    vehiclePanel == true &&
    pickup !== "" &&
    destination !== "" &&
    prices.length === 0
  ) {
    fetchVehiclePrices(destination, pickup);
    fetchDistance(destination, pickup);
  }

  const handleSuggestionSelect = (suggestion) => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // suggestion may be a string (description) or an object from Google predictions
        const address = typeof suggestion === 'string' ? suggestion : (suggestion.description || suggestion.place_id || suggestion.structured_formatting?.main_text || '');

        if (activeInput === "pickup") {
          setPickup(address);
        } else {
          setDestination(address);
        }

        // Try to resolve coordinates for the selected address so estimates can be fetched
        try {
          const res = await axios.get(`${API}/maps/get-coordinates`, {
            params: { address },
            headers,
          });
          if (activeInput === 'pickup') {
            setPickupLocation({ address, lat: res.data.ltd, lng: res.data.lng });
          } else {
            setDropoffLocation({ address, lat: res.data.ltd, lng: res.data.lng });
          }
        } catch (e) {
          // If geocode fails, leave location null — createRide will fallback to server geocode
          if (activeInput === 'pickup') setPickupLocation(null);
          else setDropoffLocation(null);
        }

        setSuggestions([]);
        setPanelOpen(false);

        // If both pickup and destination strings are present, fetch prices now
        const curPickup = (activeInput === 'pickup') ? address : pickup;
        const curDestination = (activeInput === 'destination') ? address : destination;
        if (curPickup && curDestination) {
          try { await fetchVehiclePrices(curDestination, curPickup); } catch (e) { /* ignore */ }
          try { await fetchDistance(curDestination, curPickup); } catch (e) { /* ignore */ }
          setVehiclePanel(true);
        }
      } catch (err) {
        console.error('handleSuggestionSelect error', err);
      }
    })();
  };

  async function createRide() {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in to request a ride");
      navigate('/login');
      return null;
    }
    try {
      // Get pickup coordinates
      const pickupCoordsResponse = await axios.get(
        `${API}/maps/get-coordinates`,
        {
          params: { address: pickup },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Get drop coordinates
      const dropCoordsResponse = await axios.get(
        `${API}/maps/get-coordinates`,
        {
          params: { address: destination },
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Extract distance value from the distance object (if available)
      let distanceMeters = 0;
      try {
        if (distanceData && typeof distanceData === 'object') {
          // handle different shapes returned by map APIs
          if (typeof distanceData === 'number') distanceMeters = distanceData;
          else if (distanceData.distance && distanceData.distance.value) distanceMeters = distanceData.distance.value;
          else if (distanceData.value) distanceMeters = distanceData.value;
        }
      } catch (e) {
        distanceMeters = 0;
      }

      // If distance isn't available yet, ask backend for a price/distance estimate
      if (!distanceMeters || distanceMeters === 0) {
        try {
          const pricesRes = await axios.get(`${API}/maps/get-prices`, {
            params: { origin: pickup, destination: destination },
            headers: { Authorization: `Bearer ${token}` },
          });
          const pd = pricesRes.data && pricesRes.data.distance;
          if (typeof pd === 'number') distanceMeters = pd;
          else if (pd && pd.distance && pd.distance.value) distanceMeters = pd.distance.value;
          else if (pd && pd.value) distanceMeters = pd.value;
        } catch (e) {
          // ignore — we'll fall back to a small non-zero distance to satisfy validation
          distanceMeters = 0;
        }
      }

      let distanceKm = (distanceMeters || 0) / 1000;
      if (!distanceKm || distanceKm <= 0) distanceKm = 0.1; // fallback to avoid validation 0

      const res = await axios.post(
        `${API}/rides/create`,
        {
          pickupAddress: pickup,
          dropAddress: destination,
          pickupCoords: {
            lat: pickupCoordsResponse.data.ltd,
            lng: pickupCoordsResponse.data.lng,
          },
          dropCoords: {
            lat: dropCoordsResponse.data.ltd,
            lng: dropCoordsResponse.data.lng,
          },
          // Send the same distance used for estimate (prefer rideData.distanceInKm when available)
          distanceInKm: (rideData && rideData.distanceInKm) ? rideData.distanceInKm : distanceKm,
          // include legacy `distance` field to satisfy backend validators
          distance: (rideData && rideData.distanceInKm) ? rideData.distanceInKm : distanceKm,
          paymentMethod: paymentMethod,
          vehicle: selectedVehicle || 'car',
          passengers: passengers,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      return res && res.data ? res.data : null;
    } catch (error) {
      console.error("Error creating ride:", error);
      if (error && error.response && error.response.status === 401) {
        toast.error('Session expired — please log in again');
        try { localStorage.removeItem('token'); } catch (e) {}
        navigate('/login');
      }
      return null;
    }
  }

  useGSAP(
    function () {
      if (vehiclePanel) {
        gsap.to(vehicleRef.current, {
          y: "0%",
          delay: 0.3,
          // transform: "translateY(0%)",
        });
      } else {
        gsap.to(vehicleRef.current, {
          y: "100%",
          // transform: "translateY(100%)",
        });
      }
    },
    [vehiclePanel]
  );

  useGSAP(
    function () {
      if (driverSelected) {
        gsap.to(driverSelectedRef.current, {
          y: "0%",
          delay: 0.3,
          // transform: "translateY(0%)",
        });
      } else {
        gsap.to(driverSelectedRef.current, {
          y: "100%",
          // transform: "translateY(100%)",
        });
      }
    },
    [driverSelected]
  );

  useGSAP(
    function () {
      if (vehicleFound) {
        gsap.to(vehicleFoundRef.current, {
          y: "0%",
          delay: 0.3,
          // transform: "translateY(0%)",
        });
      } else {
        gsap.to(vehicleFoundRef.current, {
          y: "100%",
          // transform: "translateY(100%)",
        });
      }
    },
    [vehicleFound]
  );

  useGSAP(
    function () {
      if (confirmRidePanel) {
        gsap.to(confirmRidePanelRef.current, {
          y: "0%",
          delay: 0.3,
          // transform: "translateY(0%)",
        });
      } else {
        gsap.to(confirmRidePanelRef.current, {
          y: "100%",
          // transform: "translateY(100%)",
        });
      }
    },
    [confirmRidePanel]
  );

  useGSAP(
    function () {
      if (panelOpen) {
        gsap.to(titleRef.current, {
          display: "none",
          duration: 0.3,
        });
        gsap.to(panelRef.current, {
          height: "68%",
          display: "flex",
          duration: 0.5,
          delay: 0.2,
          opacity: 1,
        });
        gsap.to(arrowRef.current, {
          display: "block",
          duration: 0.5,
          delay: 0.5,
        });
      } else {
        gsap.to(arrowRef.current, {
          display: "none",
          duration: 0.3,
        });
        gsap.to(panelRef.current, {
          height: "0%",
          display: "none",
          duration: 0.5,
          delay: 0.2,
          opacity: 0,
        });
        gsap.to(titleRef.current, {
          display: "block",
          duration: 0.5,
          delay: 0.3,
        });
      }
    },
    [panelOpen]
  );

  useEffect(() => {
    if (!socket || !user?._id || !hasDeviceGeolocation()) return undefined;

    let watchId = null;
    let active = true;

    watchDevicePosition(
      (position) => {
        if (!active) return;
        socket.emit("update-location-user", {
          userId: user._id,
          location: {
            ltd: position.coords.latitude,
            lng: position.coords.longitude,
          },
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    ).then((id) => {
      watchId = id;
    }).catch(() => {});

    return () => {
      active = false;
      clearDeviceWatch(watchId).catch(() => {});
    };
  }, [user, socket]);

  // Map hide/show on bottom sheet scroll
  useEffect(() => {
    const panel = document.getElementById("bottomSheet");
    const map = document.getElementById("mapContainer");
    if (!panel || !map) return;

    const handleScroll = () => {
      const sc = panel.scrollTop || 0;
      if (sc > 120) {
        setIsExpanded(true);
      } else {
        setIsExpanded(false);
      }
    };

    panel.addEventListener("scroll", handleScroll, { passive: true });
    return () => panel.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">

      {findingDriver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">

          <div className="flex flex-col items-center space-y-6">

            {/* Animated Ring */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-blue-300 border-b-transparent animate-spin-slow"></div>
            </div>

            {/* Text */}
            <h2 className="text-white text-xl font-semibold tracking-wide">
              {ride && (ride.captain || ride.selectedDriverId) ? 'Waiting for driver acceptance...' : 'Looking for drivers...'}
            </h2>

            <p className="text-gray-300 text-sm">
              {ride && (ride.captain || ride.selectedDriverId) ? 'Request sent to selected driver' : 'Connecting you to nearby captains'}
            </p>

            {/* Nearby drivers card hidden while actively searching */}

          </div>
        </div>
      )}

      {/* Global no-drivers overlay (shown after timeout) */}
      {showNoDriversModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div role="dialog" aria-modal="true" aria-label="No drivers available"
               className="w-full max-w-lg mx-4 bg-gradient-to-b from-[#0b1220] to-[#071025] p-6 rounded-3xl text-center shadow-2xl ring-1 ring-white/5">
            <h3 className="text-white text-2xl font-bold mb-3">No drivers available</h3>
            <p className="text-gray-300 text-base mb-6">We couldn't find any drivers near you right now. Try again or move your pickup slightly.</p>
            <div className="flex gap-4">
              <button onClick={() => { setShowNoDriversModal(false); handleFindDriver(); }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold py-3 rounded-xl shadow-lg transition transform duration-150 focus:outline-none focus:ring-4 focus:ring-blue-500/30">
                Find Drivers
              </button>
              <button onClick={() => setShowNoDriversModal(false)}
                className="flex-1 bg-transparent border border-white/10 text-gray-200 font-medium py-3 rounded-xl hover:bg-white/2 transition focus:outline-none focus:ring-2 focus:ring-white/10">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {assignedDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-50 text-white">

          <h2 className="text-2xl font-bold mb-4 text-green-400">
            Driver Found
          </h2>

          <div className="bg-gray-900 p-6 rounded-2xl shadow-xl w-80 text-center">
            <p className="text-lg font-semibold">{assignedDriver.name}</p>
            <p className="text-gray-400">{assignedDriver.car}</p>
            <p className="mt-2 text-green-400">ETA: {driverEta || '—'}</p>
            <p className="mt-2 text-green-400">
              ⭐ {assignedDriver.rating}
            </p>
            <p className="text-sm text-gray-400 mt-3">Driver is en route — you can see live location on the map.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowDriverDetails(true)} className="flex-1 bg-blue-600 px-3 py-2 rounded">Details</button>
              <button onClick={() => setAssignedDriver(null)} className="flex-1 bg-gray-600 px-3 py-2 rounded">Exit</button>
              <button onClick={async () => {
                try {
                  const token = localStorage.getItem('token');
                  await axios.post(`${API}/rides/cancel`, { rideId: ride?._id }, { headers: { Authorization: `Bearer ${token}` } });
                } catch (e) {
                  console.error('cancel failed', e);
                } finally {
                  setAssignedDriver(null);
                  setSearching(false);
                  setRide(null);
                  setAvailableDrivers([]);
                }
              }} className="flex-1 bg-red-600 px-3 py-2 rounded">Cancel</button>
            </div>
          </div>

        </div>
      )}

      {showDriverDetails && ride && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="w-full max-w-md bg-[#0b1020] p-4 rounded-t-3xl">

            <button onClick={() => setShowDriverDetails(false)} className="text-sm text-gray-400 mb-2">Close</button>
            <DriverSelected ride={ride} />
          </div>
        </div>
      )}

      {/* Drivers nearby cards removed per UX request */}

      {/* Show a bottom popup when user searched but no drivers were found (hide if global modal is visible) */}
      {/* Bottom 'no drivers' popup removed to avoid duplication with global modal */}

      {/* MAP SECTION */}
      <div className="absolute inset-0 z-0">
        <LiveTracking ride={ride} onEta={setDriverEta} availableDrivers={availableDrivers} />
      </div>

      {/* BOTTOM SHEET */}
      <div
        className="absolute bottom-0 left-0 w-full z-20 bg-gradient-to-b from-[#0f172a] to-black rounded-t-3xl shadow-2xl transition-all duration-300"
        style={{ height: "45%" }}
      >

        <div className="p-5 overflow-y-auto h-full text-white">

          <div className="w-12 h-1 bg-gray-500 rounded-full mx-auto mb-4"></div>

          <h2 className="text-2xl font-bold mb-4 text-white">Find a ride</h2>

          <div className="flex items-center mb-3 bg-gradient-to-r from-gray-900/60 to-gray-900/40 p-1 rounded-2xl shadow-sm relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </div>
            <input
              ref={pickupInputRef}
              value={pickup}
              onChange={(e) => { setPickup(e.target.value); fetchSuggestions(e.target.value); }}
              onClick={() => { setPanelOpen(true); setActiveInput("pickup"); }}
              placeholder="Add a pick-up location"
              className="flex-1 pl-10 px-4 py-3 bg-transparent text-white placeholder-gray-400 rounded-l-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button onClick={() => handleUseCurrent('pickup')} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-r-2xl text-sm font-semibold hover:from-indigo-700 hover:to-blue-600 shadow-md">Use current</button>
          </div>

          <div className="flex items-center mb-4 bg-gradient-to-r from-gray-900/60 to-gray-900/40 p-1 rounded-2xl shadow-sm relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </div>
            <input
              ref={destInputRef}
              value={destination}
              onChange={(e) => { setDestination(e.target.value); fetchSuggestions(e.target.value); }}
              onClick={() => { setPanelOpen(true); setActiveInput("destination"); }}
              placeholder="Enter your destination"
              className="flex-1 pl-10 px-4 py-3 bg-transparent text-white placeholder-gray-400 rounded-l-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button onClick={() => handleUseCurrent('destination')} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-r-2xl text-sm font-semibold hover:from-indigo-700 hover:to-blue-600 shadow-md">Use current</button>
          </div>
          {panelOpen && Array.isArray(suggestions) && suggestions.length > 0 && (
            <div className="mt-3 mb-3 max-h-52 overflow-y-auto rounded-2xl border border-gray-600 bg-black/80 shadow-xl ring-1 ring-white/10">
              <LocationSearchPanel suggestions={suggestions} onSuggestionSelect={handleSuggestionSelect} />
            </div>
          )}

          {estimatedFare !== null && (
            <div className="flex items-center justify-center gap-2 mt-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span className="text-emerald-400 font-bold text-sm">Estimated Fare: R{Number(estimatedFare).toFixed(2)}</span>
            </div>
          )}

          {/* Passengers */}
          <div className="mb-4 mt-1">
            <div className="flex items-center gap-2 mb-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <p className="text-sm font-medium text-gray-300">Passengers</p>
            </div>
            <div className="inline-flex items-center bg-white/[0.04] border border-white/10 rounded-xl overflow-hidden">
              <button type="button" onClick={() => setPassengers(p => Math.max(1, p-1))} className="w-10 h-10 flex items-center justify-center text-lg font-semibold text-gray-300 hover:bg-white/10 active:bg-white/15 transition-colors">−</button>
              <div className="w-12 h-10 flex items-center justify-center text-white font-bold text-lg border-x border-white/10">{passengers}</div>
              <button type="button" onClick={() => setPassengers(p => Math.min(10, p+1))} className="w-10 h-10 flex items-center justify-center text-lg font-semibold text-gray-300 hover:bg-white/10 active:bg-white/15 transition-colors">+</button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">Select number of passengers (1-10)</p>
          </div>

          {/* Payment Method */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <p className="text-sm font-medium text-gray-300">Payment Method</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-500 border-indigo-500/30 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white/[0.04] border-white/10 text-gray-400 hover:bg-white/[0.07] hover:border-white/15'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Card
              </button>
              <button
                onClick={() => {
                  if (cashDisabled) {
                    alert(`Cash payment is disabled for fares R${CASH_LIMIT} or more. Please choose card.`);
                    return;
                  }
                  setPaymentMethod('cash');
                }}
                disabled={cashDisabled}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-500 border-indigo-500/30 text-white shadow-lg shadow-indigo-500/20'
                    : cashDisabled
                      ? 'bg-white/[0.02] border-white/5 text-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-white/[0.04] border-white/10 text-gray-400 hover:bg-white/[0.07] hover:border-white/15'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                Cash
              </button>
            </div>
          </div>
          {cashDisabled && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Cash disabled for fares R{CASH_LIMIT}+ — please use card.
            </div>
          )}

          <button
            onClick={handleFindDriver}
            className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all py-3.5 rounded-xl font-bold text-white text-[15px] tracking-wide flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            Find Driver
          </button>

          {/* Fare estimates are provided by the backend once a ride is created; frontend does not calculate fare. */}

        </div>
      </div>

    </div>
  );
}

export default Home;
