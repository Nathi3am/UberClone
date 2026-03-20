import API_BASE_URL from "../config/api";
import { useEffect, useContext, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";
import { UserDataContext } from "../context/UserContext";
import { RideContext } from "../context/RideContext";
const API = API_BASE_URL;
import LiveTracking from "../components/LiveTracking";
import polyline from '@mapbox/polyline';
import axios from 'axios';
import { useRef } from 'react';
import RideChat from '../components/RideChat';

const RideStarted = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);

  const ride = location.state?.ride;
  const { user } = useContext(UserDataContext);
  const { setActiveRide } = useContext(RideContext);
  const { activeRide } = useContext(RideContext);

  const [driverPosition, setDriverPosition] = useState(() => ({
    lat: ride?.pickupCoords?.lat || -26.2337,
    lng: ride?.pickupCoords?.lng || 29.9058,
  }));
  const [socketDriverPosition, setSocketDriverPosition] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const routeRef = useRef(null);
  const [showChat, setShowChat] = useState(false);
  const [bufferedChatMessages, setBufferedChatMessages] = useState([]);

  // Keep hooks stable: redirect in effect rather than during render
  useEffect(() => {
    if (!ride) {
      navigate("/home");
    }
  }, [ride, navigate]);

  useEffect(() => {
    try {
      const joinId = ride?.user?._id;
      if (socket && joinId) socket.emit("join", { userType: "user", userId: joinId });
      // also join a simple personal room for direct ride messages
      try { if (socket && joinId) socket.emit('join-room', joinId.toString()); } catch (e) {}
    } catch (e) {}
  }, [socket, ride]);

  

  // Arrival detection (simple proximity check)
  useEffect(() => {
    try {
      const pickupLat = ride?.pickupCoords?.lat;
      const pickupLng = ride?.pickupCoords?.lng;
      if (!pickupLat || !pickupLng) return;
      const distance = Math.abs(driverPosition.lat - pickupLat) + Math.abs(driverPosition.lng - pickupLng);
      if (distance < 0.001) {
        // notify arrival once
        // eslint-disable-next-line no-alert
        alert('Driver has arrived!');
      }
    } catch (e) {}
  }, [driverPosition, ride]);

  // Fetch route polyline once when ride loads (backend directions proxy)
  useEffect(() => {
    let cancelled = false;
    const fetchRoute = async () => {
      try {
        // prefer coords when available
        const body = {};
        if (ride?.pickupCoords && ride?.dropCoords) {
          body.originLat = ride.pickupCoords.lat;
          body.originLng = ride.pickupCoords.lng;
          body.destLat = ride.dropCoords.lat;
          body.destLng = ride.dropCoords.lng;
        } else {
          body.origin = ride?.pickup || ride?.pickupAddress;
          body.destination = ride?.destination || ride?.dropAddress || ride?.destination;
        }

        const res = await axios.post(`${API}/directions`, body);
        if (res && res.data && res.data.polyline && !cancelled) {
          const decoded = polyline.decode(res.data.polyline);
          const path = decoded.map(([lat, lng]) => ({ lat, lng }));
          setRoutePath(path);
          routeRef.current = path;
          // store on ride object for LiveTracking to pick up (non-persistent)
          try { ride.routePolyline = res.data.polyline; } catch (e) {}
        }
      } catch (e) {
        // ignore route fetch errors
      }
    };
    if (ride) fetchRoute();
    return () => { cancelled = true; };
  }, [ride]);

  // Listen for server-driven simulated driver updates (backend emits)
  useEffect(() => {
    if (!socket) return;
    const onLocation = ({ rideId, location }) => {
      try {
        if (!rideId || !location) return;
        if (rideId === ride?._id) {
          setSocketDriverPosition({ lat: location.lat, lng: location.lng });
        }
      } catch (e) {}
    };

    const onArrived = ({ rideId }) => {
      try {
        if (rideId === ride?._id) {
          // eslint-disable-next-line no-alert
          alert('Driver has arrived (server)');
        }
      } catch (e) {}
    };

    socket.on('driver-location-update', onLocation);
    socket.on('driver-arrived', onArrived);

    const onReceive = (payload) => {
      try {
        if (!payload || (!payload.rideId && !payload.ride)) return;
        const rid = payload.rideId || (payload.ride && payload.ride._id);
        if (rid !== ride?._id) return;
        // open chat when a message arrives for this ride
        if (!showChat) setShowChat(true);
        // buffer message so the mounted chat can show it
        setBufferedChatMessages((b) => [...b, payload]);
      } catch (e) {}
    };

    socket.on('receive-message', onReceive);
    socket.on('receive-ride-message', onReceive);

    return () => {
      try { socket.off('driver-location-update', onLocation); } catch (e) {}
      try { socket.off('driver-arrived', onArrived); } catch (e) {}
      try { socket.off('receive-message', onReceive); } catch (e) {}
      try { socket.off('receive-ride-message', onReceive); } catch (e) {}
    };
  }, [socket, ride]);

  useEffect(() => {
    if (!socket) return;
    const onEnded = (payload) => {
      try {
        const ridePayload = payload && payload.data ? payload.data : payload;
        try { if (setActiveRide) setActiveRide(null); } catch (e) {}
        try { window.sessionStorage.setItem('incomingRide', JSON.stringify(ridePayload || {})); } catch (e) {}
        navigate('/account/rides', { state: { ride: ridePayload } });
      } catch (e) {}
    };
    socket.on("ride-ended", onEnded);
    return () => socket.off("ride-ended", onEnded);
  }, [socket, navigate, setActiveRide]);

  if (!ride) return null;

  const formatAddress = (address) => {
    const addr = typeof address === 'string' ? address : (address?.address || '');
    const firstCommaIndex = addr.indexOf(",");
    if (firstCommaIndex === -1) return { firstPart: addr, secondPart: "" };
    const firstPart = addr.substring(0, firstCommaIndex);
    const secondPart = addr.substring(firstCommaIndex + 1).trim();
    return { firstPart, secondPart };
  };

  const destAddress = ride.destination?.address || ride.dropAddress || ride.destination || '';
  const { firstPart, secondPart } = formatAddress(destAddress);

  // Don't block map rendering while waiting for driver info — show a small status instead

  const driverName =
    ride?.driver?.fullName || (ride?.captain?.fullname ? `${ride.captain.fullname.firstname || ''} ${ride.captain.fullname.lastname || ''}`.trim() : 'Driver Assigned');
  const driverPhone = ride?.driver?.phone || ride?.captain?.phone || 'N/A';
  const vehicleNumber = ride?.driver?.vehicleNumber || ride?.captain?.vehicle?.plate || '—';
  const pickupText = ride?.pickup || ride?.pickupAddress || 'Unknown';
  const dropText = ride?.destination || ride?.dropAddress || 'Unknown';

  return (
    <div className="h-screen w-screen">
      <Link
        to="/home"
        className="absolute top-2 right-2 w-12 h-12 rounded-full bg-black flex items-center justify-center z-30"
      >
        <i style={{ color: "white" }} className="ri-home-line ri-xl mb-1"></i>
      </Link>

      <div className="absolute w-screen h-[100%] top-0 z-20">
        <LiveTracking ride={{...ride, routePath}} simulatedDriverPosition={socketDriverPosition || driverPosition} />
      </div>
      <div className="bg-white absolute bottom-0 w-screen h-[50%] rounded-t-lg z-50">
        <div
          style={{ padding: "15px" }}
          className="flex flex-row justify-between items-center"
        >
          <div style={{ width: "25%" }} className="w-[25%]">
            <img
              style={{ width: "70px", height: "70px" }}
              className="rounded-full"
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRV-zbJg0P98SwYoQJCjzTONpVf1dB9pB9VCQ&s"
              alt=""
            />
          </div>
          <div style={{ textAlign: "right" }} className="">
            <h3 className="text-2xl font-semibold">
              {ride?.user?.fullname?.firstname || ''} {ride?.user?.fullname?.lastname || ''}
            </h3>
            <h2 className="text-xl font-semibold">{driverName}</h2>
            <h3 className="text-sm font-light">
              {vehicleNumber} • {driverPhone}
            </h3>
            {!ride.driver && !ride.captain && (
              <p className="text-sm text-gray-400 mt-2">Connecting to driver...</p>
            )}
            <div className="flex flex-row justify-end items-center">
              <i className="ri-star-fill ri-xs"></i>
              <h4 className="text-sm font-semibold">4.9</h4>
            </div>
          </div>
        </div>
        <div
          className="mb-2"
          style={{ height: "2px", width: "100%", background: "#D6D6D6" }}
        ></div>
        <div className="flex flex-row justify-start w-screen ml-2">
          <div className="flex items-center justify-center w-[20%]">
            <i className="ri-map-pin-range-fill ri-xl"></i>
          </div>
          <div className="flex flex-col justify-start items-start w-full mr-5">
            <h2 className="text-xl font-semibold">{firstPart}</h2>
            <h4 className="text-sm">{secondPart}</h4>
            <div
              className="my-2"
              style={{ height: "2px", width: "100%", background: "#D6D6D6" }}
            ></div>
          </div>
        </div>
        <div className="flex flex-row justify-start w-screen ml-2">
          <div className="flex items-center justify-center w-[20%]">
            <i className="ri-bank-card-2-fill"></i>
          </div>
          <div className="flex flex-col justify-start items-start w-full mr-5">
            {ride?.fare !== undefined && ride?.fare !== null && (
              <h2 className="text-xl font-semibold">R{Number(ride.fare).toFixed(2)}</h2>
            )}
            <h4 className="text-sm">{ride?.paymentMethod === 'card' ? 'Card' : 'Cash'}</h4>
            <div
              className="my-2"
              style={{ height: "2px", width: "100%", background: "#D6D6D6" }}
            ></div>
          </div>
        </div>
          <div className="flex items-center justify-center mt-3">
            {!activeRide && (
            <button
              onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                if (!ride || ride?.fare === undefined || ride?.fare === null) {
                  alert('Fare not available yet. Please wait for the driver confirmation.');
                  return;
                }
                const payload = {
                  email: user?.email || '',
                  amount: Number(ride.fare),
                  rideId: ride?._id
                };

                const initRes = await axios.post(`${API}/payments/initialize`, payload, {
                  headers: { Authorization: `Bearer ${token}` }
                });

                const reference = initRes?.data?.data?.reference;
                const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_public_key_here';

                const handler = window.PaystackPop.setup({
                  key: publicKey,
                  email: payload.email,
                  amount: Math.round((payload.amount || 0) * 100),
                  ref: reference,
                  callback: async function(response) {
                    try {
                      await axios.get(`${API}/payments/verify/${response.reference}`);
                      alert('Payment successful!');
                      window.location.reload();
                    } catch (e) {
                      console.error(e);
                      alert('Payment verification failed');
                    }
                  },
                  onClose: function() {
                    alert('Payment window closed');
                  }
                });

                handler.openIframe();
              } catch (err) {
                console.error(err);
                alert('Unable to initiate payment');
              }
            }}
            className="w-3/5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-lg hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-300"
          >
            Make Payment
          </button>
          )}
        </div>
        {/* See driver location and Chat button */}
        <div className="flex flex-row justify-center gap-3 mt-3">
          <button
            onClick={() => {
              try {
                navigate('/riding', { state: { ride } });
              } catch (e) {
                window.location.href = '/riding';
              }
            }}
            className="px-4 py-2 rounded-xl bg-gray-800 text-white"
          >
            See driver location
          </button>
          {(ride && (ride.captain || ride.driver)) && (
            <button onClick={() => setShowChat(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white">Chat to driver</button>
          )}
        </div>

        {showChat && (
          <RideChat socket={socket} ride={ride} user={user} otherUser={ride.captain || ride.driver} initialMessages={bufferedChatMessages} onOpen={() => setBufferedChatMessages([])} onClose={() => setShowChat(false)} />
        )}
      </div>

      {/* Bottom floating card like Uber */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="mx-auto max-w-md bg-black/80 text-white p-4 rounded-t-3xl">
          <h2 className="text-white text-lg font-bold">Your driver is on the way</h2>
          <p className="text-gray-400 text-sm">Arriving in {ride?.etaMinutes ?? '—'} minutes</p>
        </div>
      </div>
    </div>
  );
};

export default RideStarted;
