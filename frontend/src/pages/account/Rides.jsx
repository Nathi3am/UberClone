import { useEffect, useState, useContext, useRef } from "react";
import axios from "axios";
import API from '../../config/api';
import RideChat from "../../components/RideChat";
import DriverSelected from "../../../components/DriverSelected";
import LiveTracking from "../../components/LiveTracking";
import logoPath from "../../config/logo";
import { SocketContext } from "../../context/SocketContext";
import { UserDataContext } from "../../context/UserContext";
import { RideContext } from "../../context/RideContext";

const RiderRides = () => {
  const [rides, setRides] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [completedRideId, setCompletedRideId] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [bufferedChatMessages, setBufferedChatMessages] = useState([]);
  const [showLive, setShowLive] = useState(false);
  const { activeRide, setActiveRide } = useContext(RideContext);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [showVehicleZoom, setShowVehicleZoom] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomTranslate, setZoomTranslate] = useState({ x: 0, y: 0 });
  const pinchRef = useRef({ initialDist: 0, initialScale: 1, lastTouch: null });
  const API_BASE = API;

  useEffect(() => {
    fetchRides();
  }, []);

  const socketCtx = useContext(SocketContext) || {};
  const socket = socketCtx.socket;
  const userCtx = useContext(UserDataContext) || {};
  const user = userCtx.user;

  // Join user's personal socket room and listen for ride end/status updates
  useEffect(() => {
    try {
      const userId = (user && user._id) ? user._id : localStorage.getItem('userId');
      if (socket && userId) {
        try { socket.emit('join-user-room', userId); } catch (e) {}
      }

      const handleRideEnded = (payload) => {
        try {
          setActiveRide(null);
          fetchRides();
          try {
            const rideId = (payload && (payload.rideId || payload._id)) || (payload && payload.data && payload.data.rideId) || null;
            if (rideId) {
              setCompletedRideId(rideId);
              setShowRatingPopup(true);
            }
          } catch (e) {}
        } catch (e) {}
      };

      const handleRideStatusUpdate = (payload) => {
        try {
          const status = payload && (payload.status || payload.state) ? (payload.status || payload.state) : null;
          if (status === 'completed') {
            setActiveRide(null);
            fetchRides();
          }
        } catch (e) {}
      };

      const handleActiveRideCleared = (payload) => {
        try {
          setActiveRide(null);
          fetchRides();
        } catch (e) {}
      };
      const playBeepUser = () => {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) return;
          const ctx = new AudioCtx();
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(660, ctx.currentTime);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.start();
          oscillator.stop(ctx.currentTime + 0.24);
          setTimeout(() => { try { ctx.close(); } catch (e) {} }, 500);
        } catch (e) {}
      };

      if (socket) {
        socket.on('ride-ended', handleRideEnded);
        socket.on('ride-completed', handleRideEnded);
        socket.on('rideStatusUpdate', handleRideStatusUpdate);
        socket.on('activeRideCleared', handleActiveRideCleared);
        try { socket.on('activeRideCleared', () => { try { playBeepUser(); } catch (e) {} }); } catch (e) {}
      }

      const onChatIncoming = (payload) => {
        try {
          if (!payload || !payload.rideId) return;
          if (!activeRide || !activeRide._id) return;
          if (String(payload.rideId) !== String(activeRide._id)) return;
          const normalized = { senderId: payload.senderId || payload.from || payload.sender || null, message: payload.message || payload.text || '', rideId: payload.rideId, timestamp: payload.timestamp || new Date().toISOString() };
          setBufferedChatMessages(b => [...b, normalized]);
          setShowChat(true);
        } catch (e) {}
      };

      try { if (socket) { socket.on('receive-message', onChatIncoming); socket.on('receive-ride-message', onChatIncoming); socket.on('chat-message', onChatIncoming); } } catch (e) {}

      return () => {
        try {
          if (socket) {
            socket.off('ride-ended', handleRideEnded);
            socket.off('ride-completed', handleRideEnded);
            socket.off('rideStatusUpdate', handleRideStatusUpdate);
            socket.off('activeRideCleared', handleActiveRideCleared);
          }
        } catch (e) {}
        try { if (socket) { socket.off('receive-message'); socket.off('receive-ride-message'); socket.off('chat-message'); } } catch (e) {}
      };
    } catch (e) {}
  }, [socket, user]);

  const fetchRides = async () => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.paymentMethod = paymentFilter;
      if (q && q.trim().length > 0) params.q = q.trim();

      const res = await axios.get(`${API}/rides/my-rides`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      const payload = res.data;
      let data = [];
      if (Array.isArray(payload)) data = payload;
      else if (Array.isArray(payload && payload.rides)) data = payload.rides;
      if (payload && typeof payload.page !== 'undefined') {
        setPage(Number(payload.page || 1));
        setLimit(Number(payload.limit || limit));
        setTotalPages(Number(payload.totalPages || Math.max(1, Math.ceil((payload.total || data.length) / (payload.limit || limit)))));
        setTotal(Number(payload.total || data.length));
      } else {
        setTotalPages(1);
        setTotal(data.length);
      }
      try {
        data = data.sort((a, b) => {
          const ta = new Date(a.createdAt || a.created || 0).getTime();
          const tb = new Date(b.createdAt || b.created || 0).getTime();
          return tb - ta;
        });
      } catch (e) {}
      setRides(data);

      const currentActiveRide = data.find(
        (ride) =>
          ride.status === "pending" ||
          ride.status === "accepted" ||
          ride.status === "ongoing"
      );

      setActiveRide(currentActiveRide || null);
      return data;
    } catch (err) {
      console.error("Failed to fetch rides:", err);
      try {
        const status = err && err.response && err.response.status;
        if (status === 401) {
          try { localStorage.removeItem('token'); } catch (e) {}
          try { localStorage.removeItem('userId'); } catch (e) {}
          setRides([]);
          setActiveRide(null);
          setTimeout(() => { window.location.href = '/login'; }, 200);
          return [];
        }
      } catch (e) {}
      setRides([]);
      setActiveRide(null);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async (rating) => {
    try {
      const token = localStorage.getItem('token');
      if (!completedRideId) return;
      setSubmittingRating(true);
      await axios.post(`${API}/rides/${completedRideId}/rate`, { rating }, { headers: { Authorization: `Bearer ${token}` } });
      setRatingSubmitted(true);
      setTimeout(() => {
        setShowRatingPopup(false);
        setCompletedRideId(null);
        setSelectedRating(0);
        setRatingSubmitted(false);
        setSubmittingRating(false);
        fetchRides();
      }, 1400);
    } catch (e) {
      console.error('Failed to submit rating', e);
      setSubmittingRating(false);
    }
  };

  const formatName = (n) => {
    if (!n) return '';
    if (typeof n === 'string') return n;
    if (typeof n === 'object') {
      const first = n.firstname || n.first || n.given || n.name || '';
      const last = n.lastname || n.last || n.surname || '';
      const joined = `${first} ${last}`.trim();
      if (joined) return joined;
      if (n.fullname && typeof n.fullname === 'string') return n.fullname;
      try { return JSON.stringify(n); } catch (e) { return '' + n; }
    }
    return String(n);
  };

  const getEntityName = (entity) => {
    if (!entity) return '';
    if (typeof entity === 'string') return entity;
    if (entity.fullname) return formatName(entity.fullname);
    if (entity.name) return formatName(entity.name);
    return formatName(entity);
  };

  useEffect(() => {
    const t = setTimeout(() => { fetchRides(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, statusFilter, paymentFilter, q]);

  const statusColor = (s) => {
    if (s === 'completed') return 'text-emerald-400';
    if (s === 'ongoing' || s === 'accepted') return 'text-sky-400';
    if (s === 'pending') return 'text-amber-400';
    if (s === 'cancelled') return 'text-red-400';
    return 'text-gray-400';
  };

  const statusBg = (s) => {
    if (s === 'completed') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
    if (s === 'ongoing' || s === 'accepted') return 'bg-sky-500/15 text-sky-400 border-sky-500/20';
    if (s === 'pending') return 'bg-amber-500/15 text-amber-400 border-amber-500/20';
    if (s === 'cancelled') return 'bg-red-500/15 text-red-400 border-red-500/20';
    return 'bg-white/5 text-gray-400 border-white/10';
  };

  return (
    <div className="min-h-screen pb-28">
      {/* ──── Rating Popup ──── */}
      {showRatingPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-[#0e1529] border border-white/10 p-6 rounded-2xl w-[520px] max-w-[94%] text-center shadow-2xl transform transition-all">
            {!ratingSubmitted ? (
              <>
                <div className="flex flex-col items-center gap-3 -mt-2">
                  <div className="bg-gradient-to-r from-indigo-600 to-sky-500 rounded-xl p-3 shadow-lg">
                    <img src={logoPath} alt="VexoMove" className="w-20" />
                  </div>
                  <div className="text-2xl font-bold text-white">Thank You for choosing VexoMove</div>
                </div>
                <p className="text-sm text-gray-400 mt-2">We hope you enjoyed your ride — please rate your experience</p>

                <div className="mt-6 flex items-center justify-center gap-4">
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSelectedRating(n)}
                      className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-200 ${selectedRating >= n ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110' : 'bg-white/5 border border-white/10 text-gray-500 hover:scale-105 hover:border-white/20'}`}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mb-0.5">
                        <path d="M12 .587l3.668 7.431L24 9.748l-6 5.847L19.335 24 12 20.201 4.665 24 6 15.595 0 9.748l8.332-1.73z" />
                      </svg>
                      <div className="text-xs font-bold">{n}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-center">
                  <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-gray-400">
                    {selectedRating === 0 ? 'Select rating 1–5' : `${selectedRating} — ${ {1: 'Terrible', 2: 'Bad', 3: 'Ok', 4: 'Good', 5: 'Great'}[selectedRating] }`}
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-center">
                  <button onClick={() => { setShowRatingPopup(false); setSelectedRating(0); }} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:bg-white/10 transition-colors">Cancel</button>
                  <button
                    onClick={() => { if (selectedRating > 0) submitRating(selectedRating); }}
                    disabled={selectedRating === 0 || submittingRating}
                    className={`px-6 py-2.5 rounded-xl text-white font-semibold transition-all ${selectedRating === 0 ? 'bg-white/5 border border-white/10 cursor-not-allowed opacity-40' : 'bg-gradient-to-r from-indigo-600 to-sky-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'}`}
                  >
                    {submittingRating ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>

                <div className="mt-4 text-xs text-gray-500">1 — Terrible • 2 — Bad • 3 — Ok • 4 — Good • 5 — Great</div>
              </>
            ) : (
              <div className="py-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/15 rounded-full mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="text-xl font-semibold text-white">Thanks — rating received</div>
                <div className="text-sm text-gray-400 mt-2">We appreciate your feedback.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──── Vehicle Zoom Modal ──── */}
      {showVehicleZoom && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center" onClick={() => { setShowVehicleZoom(false); setZoomSrc(null); setZoomScale(1); setZoomTranslate({ x: 0, y: 0 }); }}>
          <div className="relative max-w-[92%] max-h-[92%] p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setShowVehicleZoom(false); setZoomSrc(null); setZoomScale(1); setZoomTranslate({ x: 0, y: 0 }); }}
              className="absolute -top-2 -right-2 z-50 bg-white/10 backdrop-blur-sm text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg border border-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="w-[min(90vw,900px)] h-[min(80vh,800px)] flex items-center justify-center overflow-hidden rounded-xl">
              <img
                src={zoomSrc}
                alt="vehicle-large"
                className="max-w-full max-h-full object-contain touch-none"
                style={{
                  transform: `translate(${zoomTranslate.x}px, ${zoomTranslate.y}px) scale(${zoomScale})`,
                  transition: 'transform 0s',
                  touchAction: 'none',
                }}
                onTouchStart={(e) => {
                  try {
                    if (!e.touches) return;
                    if (e.touches.length === 2) {
                      const t0 = e.touches[0];
                      const t1 = e.touches[1];
                      const dx = t0.clientX - t1.clientX;
                      const dy = t0.clientY - t1.clientY;
                      pinchRef.current.initialDist = Math.hypot(dx, dy);
                      pinchRef.current.initialScale = zoomScale;
                    } else if (e.touches.length === 1) {
                      pinchRef.current.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    }
                  } catch (err) {}
                }}
                onTouchMove={(e) => {
                  try {
                    if (!e.touches) return;
                    if (e.touches.length === 2) {
                      const t0 = e.touches[0];
                      const t1 = e.touches[1];
                      const dx = t0.clientX - t1.clientX;
                      const dy = t0.clientY - t1.clientY;
                      const dist = Math.hypot(dx, dy) || 1;
                      const scale = Math.min(4, Math.max(1, (pinchRef.current.initialScale || 1) * (dist / (pinchRef.current.initialDist || 1))));
                      setZoomScale(scale);
                    } else if (e.touches.length === 1 && zoomScale > 1) {
                      const t = e.touches[0];
                      const last = pinchRef.current.lastTouch;
                      if (last) {
                        const dx = t.clientX - last.x;
                        const dy = t.clientY - last.y;
                        setZoomTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }));
                      }
                      pinchRef.current.lastTouch = { x: t.clientX, y: t.clientY };
                    }
                    e.preventDefault();
                  } catch (err) {}
                }}
                onTouchEnd={(e) => {
                  try {
                    pinchRef.current.lastTouch = null;
                    pinchRef.current.initialDist = 0;
                    pinchRef.current.initialScale = zoomScale;
                    if (zoomScale <= 1.02) {
                      setZoomScale(1);
                      setZoomTranslate({ x: 0, y: 0 });
                    }
                  } catch (err) {}
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ──── Header ──── */}
      <div className="sticky top-0 z-30 bg-[#060b19]/80 backdrop-blur-xl border-b border-white/5 -mx-4 px-4 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Ride History</h2>
              <p className="text-xs text-gray-500">{total} total ride{total !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {loading && (
            <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* ──── Active Ride Card ──── */}
      {activeRide ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Active Ride</h3>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-sm">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-500" />

            <div className="p-5 space-y-4">
              {/* Driver Row */}
              <div className="flex items-center gap-4">
                {(() => {
                  const candidate = activeRide.driverImage || activeRide.captainProfileImage || (activeRide.driver && activeRide.driver.profileImage) || (activeRide.captain && activeRide.captain.profileImage) || null;
                  if (!candidate) return (
                    <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                  );
                  const src = (typeof candidate === 'string' && candidate.startsWith('/')) ? `${API_BASE}${candidate}` : candidate;
                  return (
                    <img
                      onClick={() => setShowDriverDetails(true)}
                      src={src}
                      alt="driver"
                      className="w-14 h-14 rounded-full object-cover cursor-pointer ring-2 ring-white/10 hover:ring-indigo-400/50 transition-all"
                    />
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-semibold text-white truncate">
                    {getEntityName(activeRide.driver) || getEntityName(activeRide.captain) || "Driver"}
                  </div>
                  <div className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBg(activeRide.status)}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    {activeRide.status?.charAt(0).toUpperCase() + activeRide.status?.slice(1)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-white">
                    {typeof activeRide.fare === "number" ? `R${activeRide.fare.toFixed(2)}` : activeRide.fare || "—"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Fare</div>
                </div>
              </div>

              {/* Vehicle */}
              {(() => {
                const v = activeRide.captain?.vehicle || activeRide.driver?.vehicle || (activeRide.vehicle ? { model: activeRide.vehicle } : null);
                if (!v) return null;
                const candidateImg = activeRide.captain?.vehicle?.image || activeRide.vehicleImage || activeRide.vehicle?.image || activeRide.vehicleImageUrl || null;
                const imgSrc = candidateImg ? ((typeof candidateImg === 'string' && candidateImg.startsWith('/')) ? `${API_BASE}${candidateImg}` : candidateImg) : null;
                const parts = [];
                if (v.brand) parts.push(v.brand);
                if (v.model) parts.push(v.model);
                if (v.vehicleType && parts.length === 0) parts.push(v.vehicleType);
                const main = parts.join(' ').trim();
                const extras = [];
                if (v.year) extras.push(v.year);
                if (v.capacity) extras.push(`${v.capacity} seats`);
                const plate = v.plate || v.vehiclePlate || '';
                return (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt="vehicle"
                        className="w-20 h-14 object-cover rounded-lg border border-white/10 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => { setZoomSrc(imgSrc); setShowVehicleZoom(true); }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{main || 'Vehicle'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {[...extras, plate].filter(Boolean).join(' • ')}
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600 shrink-0">
                      <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                    </svg>
                  </div>
                );
              })()}

              {/* Pickup / Dropoff */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-emerald-400/30 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Pickup</div>
                    <div className="text-sm text-gray-300 mt-0.5 truncate">{activeRide.pickupAddress || "N/A"}</div>
                  </div>
                </div>
                <div className="ml-1.5 border-l border-dashed border-white/10 h-3" />
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-3 h-3 rounded-sm bg-red-400 border-2 border-red-400/30 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Dropoff</div>
                    <div className="text-sm text-gray-300 mt-0.5 truncate">{activeRide.dropAddress || "N/A"}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowChat(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 rounded-xl font-medium text-sm hover:bg-indigo-500/25 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Chat
                </button>
                <button
                  onClick={() => setShowLive(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-xl font-medium text-sm hover:bg-emerald-500/25 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
                  </svg>
                  Live Location
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="mb-8 p-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">No active ride right now</p>
          </div>
        )
      )}

      {/* ──── Chat Overlay ──── */}
      {showChat && activeRide && (
        <RideChat socket={socket} ride={activeRide} user={user || {}} otherUser={activeRide.captain || activeRide.driver || {}} initialMessages={bufferedChatMessages} onOpen={() => setBufferedChatMessages([])} onClose={() => setShowChat(false)} />
      )}

      {/* ──── Driver Details Modal ──── */}
      {showDriverDetails && activeRide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-[#0e1529] border border-white/10 rounded-2xl w-[720px] max-w-[96%] p-5 text-white shadow-2xl">
            <div className="flex justify-end">
              <button onClick={() => setShowDriverDetails(false)} className="text-sm text-gray-500 hover:text-white transition-colors px-3 py-1 rounded-lg bg-white/5 border border-white/10">Close</button>
            </div>
            <div className="mt-2">
              <DriverSelected ride={activeRide} />
            </div>
          </div>
        </div>
      )}

      {/* ──── Live Tracking Modal ──── */}
      {showLive && activeRide && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="w-[92%] h-[82%] bg-[#0e1529] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="bg-[#060b19] text-white p-4 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold">Live Location</span>
              </div>
              <button onClick={() => setShowLive(false)} className="px-4 py-1.5 bg-white/5 border border-white/10 text-white rounded-lg text-sm hover:bg-white/10 transition-colors">Close</button>
            </div>
            <div className="h-[calc(100%-60px)]">
              <LiveTracking ride={activeRide} role="user" />
            </div>
          </div>
        </div>
      )}

      {/* ──── Completed Rides Section ──── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <h3 className="text-lg font-bold text-white">Completed Rides</h3>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-3 mb-5">
          <div className="relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search pickup or dropoff..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-gray-300 outline-none focus:border-indigo-500/40 transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="ongoing">Ongoing</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-gray-300 outline-none focus:border-indigo-500/40 transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All Payment</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>

            <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
              <span>{total} ride{total !== 1 ? 's' : ''}</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-gray-400 outline-none cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ride List */}
        {rides && rides.filter(r => r.status === 'completed').length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <p className="text-sm text-gray-500">No completed rides yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rides
              .filter(r => r.status === 'completed')
              .sort((a, b) => new Date(b.createdAt || b.created || 0) - new Date(a.createdAt || a.created || 0))
              .map((r) => (
                <div key={r._id || r.id} className="group p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{getEntityName(r.driver) || getEntityName(r.captain) || 'Driver'}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusBg(r.status)}`}>
                          <span className="w-1 h-1 rounded-full bg-current" />
                          {r.status?.charAt(0).toUpperCase() + r.status?.slice(1)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-start gap-2">
                        <div className="flex flex-col items-center mt-1 gap-0.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                          <div className="w-px h-3 bg-white/10" />
                          <div className="w-2 h-2 rounded-sm bg-red-400/60" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="text-xs text-gray-400 truncate">{r.pickupAddress || r.pickup?.address || '—'}</div>
                          <div className="text-xs text-gray-400 truncate">{r.dropAddress || r.drop?.address || '—'}</div>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-600">
                        <span>{new Date(r.createdAt || r.created || Date.now()).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>•</span>
                        <span>{new Date(r.createdAt || r.created || Date.now()).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-white">
                        R{(typeof r.fare !== 'undefined' ? Number(r.fare).toFixed(2) : (typeof r.totalFare !== 'undefined' ? Number(r.totalFare).toFixed(2) : '0.00'))}
                      </div>
                      <div className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wide ${(r.paymentMethod || 'card') === 'cash' ? 'bg-amber-500/10 text-amber-400' : 'bg-sky-500/10 text-sky-400'}`}>
                        {(r.paymentMethod || 'card').toString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-gray-400 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Prev
            </button>
            <div className="px-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-gray-400">
              {page} / {totalPages}
            </div>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 px-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-gray-400 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
            >
              Next
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderRides;
