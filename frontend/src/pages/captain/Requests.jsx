import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DriverBottomNav from "../../components/navigation/DriverBottomNav";
import { SocketContext } from "../../context/SocketContext";
import API from "../../config/api";

const Requests = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState([]);
  const [past, setPast] = useState([]);
  const [futureList, setFutureList] = useState([]);

  const { socket } = useContext(SocketContext);

  useEffect(() => {
    const captainToken = localStorage.getItem("captainToken") || localStorage.getItem("token");
    const headers = captainToken ? { Authorization: `Bearer ${captainToken}` } : {};
    axios
      .get(`${API}/rides/pending`, { headers })
      .then((res) => setActive(res.data || []))
      .catch(() => {});

    axios
      .get(`${API}/rides/completed`, { headers })
      .then((res) => setPast(res.data || []))
      .catch(() => {});

    // futureList remains empty for now (prebookings)
  }, []);

  // Listen for realtime new-ride broadcasts and prepend to active list
  useEffect(() => {
    if (!socket) return;

    const handleNewRide = (ride) => {
      if (!ride || !ride._id) return;
      setActive((prev) => {
        const exists = prev.find((r) => String(r._id) === String(ride._id));
        if (exists) return prev.map((r) => (String(r._id) === String(ride._id) ? ride : r));
        return [ride, ...prev];
      });
    };

    socket.on('new-ride', handleNewRide);
    socket.on('new-ride-request', handleNewRide);

    return () => {
      socket.off('new-ride', handleNewRide);
      socket.off('new-ride-request', handleNewRide);
    };
  }, [socket]);

  const handleAccept = async (rideId) => {
    const token = localStorage.getItem("token");
    await axios.patch(`${API}/rides/${rideId}/accept`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setActive((s) => s.filter((r) => r._id !== rideId));
  };

  const handleDecline = async (rideId) => {
    const token = localStorage.getItem("token");
    await axios.patch(`${API}/rides/${rideId}/decline`, {}, { headers: { Authorization: `Bearer ${token}` } });
    setActive((s) => s.filter((r) => r._id !== rideId));
  };

  const Card = ({ ride }) => (
    <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex justify-between items-start">
      <div>
        <div className="text-sm text-gray-300">{ride.pickupAddress} → {ride.dropAddress}</div>
        <div className="text-xs text-gray-400">Distance: {ride.distance} km</div>
      </div>
      <div className="text-right">
      {ride.fare !== undefined && ride.fare !== null && (
        <div className="text-white font-semibold">R{Number(ride.fare).toFixed(2)}</div>
      )}
        <div className="flex gap-2 mt-3">
          <button onClick={() => handleAccept(ride._id)} className="px-3 py-1 rounded-xl bg-emerald-600">Accept</button>
          <button onClick={() => handleDecline(ride._id)} className="px-3 py-1 rounded-xl bg-red-600">Decline</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 className="text-2xl font-bold">Active Requests</h2>
        </div>
        {active.length === 0 ? <div className="text-gray-400">No active requests</div> : active.map((r) => <Card key={r._id} ride={r} />)}

        <h2 className="text-2xl font-bold mt-6">Past Requests</h2>
        {past.length === 0 ? <div className="text-gray-400">No past requests</div> : past.map((r) => <Card key={r._id} ride={r} />)}

        <h2 className="text-2xl font-bold mt-6">Future Requests</h2>
        {futureList.length === 0 ? <div className="text-gray-400">No future bookings</div> : futureList.map((r) => <Card key={r._id} ride={r} />)}
      </div>
      <DriverBottomNav />
    </div>
  );
};

export default Requests;
