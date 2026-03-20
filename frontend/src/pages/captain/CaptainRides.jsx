import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import DriverBottomNav from '../../components/navigation/DriverBottomNav';
import { SocketContext } from '../../context/SocketContext';
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import DriverInfoCard from "../../components/DriverInfoCard";
import DriverSelected from "../../../components/DriverSelected";
import LiveTracking from "../../components/LiveTracking";
import { UserDataContext } from "../../context/UserContext";
import RideCard from "../../components/RideCard";
import { RideContext } from "../../context/RideContext";
// SearchBox and MapPicker imports removed (not present in src/components)
// geocoding utilities were previously imported from 'react-places-autocomplete' but are unused in this file
import API_BASE_URL from '../../config/api';
const API = API_BASE_URL.replace(/\/api$/, '');
const CaptainRides = () => {
  const { socket } = useContext(SocketContext);
  const [rides, setRides] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [status, setStatus] = useState('completed');
  const [q, setQ] = useState('');

  useEffect(() => {
    fetchRides(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, paymentMethod, status, q]);

  useEffect(() => {
    if (!socket) return;
    const onRideCompleted = (payload) => {
      try { fetchRides(page); } catch (e) {}
    };
    socket.on('ride-completed', onRideCompleted);
    socket.on('ride-ended', onRideCompleted);
    return () => {
      try { socket.off('ride-completed', onRideCompleted); } catch (e) {}
      try { socket.off('ride-ended', onRideCompleted); } catch (e) {}
    };
  }, [socket, page, limit, paymentMethod, status, q]);

  const fetchRides = async (p = 1) => {
    try {
      setLoading(true);
      const captainToken = localStorage.getItem('captainToken') || localStorage.getItem('token');
      const headers = captainToken ? { Authorization: `Bearer ${captainToken}` } : {};
      const params = { page: p, limit };
      if (paymentMethod && paymentMethod !== 'all') params.paymentMethod = paymentMethod;
      if (status && status !== 'all') params.status = status;
      if (q && q.trim().length > 0) params.q = q.trim();

      const res = await axios.get(`${API}/rides/completed`, { headers, params, withCredentials: true });
      if (res && res.data) {
        const { rides: data = [], total: tot = 0, totalPages: tp = 1, page: current = p, limit: lim = limit } = res.data;
        setRides(Array.isArray(data) ? data : []);
        setTotal(Number(tot || 0));
        setTotalPages(Number(tp || 1));
        setPage(Number(current || p));
        setLimit(Number(lim || limit));
      } else {
        setRides([]);
        setTotal(0);
        setTotalPages(1);
      }
      setLoading(false);
    } catch (e) {
      console.error('fetchRides error', e);
      setRides([]);
      setTotal(0);
      setTotalPages(1);
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="pb-28 px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 my-2">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 className="text-2xl font-semibold">Rides</h2>
        </div>
        <div className="flex gap-2 items-center">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pickup or drop" className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm w-48" />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
            <option value="all">All Payments</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
            <option value="completed">Completed</option>
            <option value="all">All</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
          <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="text-center text-sm text-gray-300 py-6">Loading...</div>
        ) : rides.length === 0 ? (
          <div className="text-center text-sm text-gray-300 py-6">No rides found.</div>
        ) : (
          <div className="space-y-4">
            {rides.map((r) => (
              <div key={r._id || r.id} className="bg-white/5 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm text-gray-300 font-semibold">{(r.user && (r.user.fullname && (r.user.fullname.firstname || r.user.fullname.lastname))) ? `${r.user.fullname.firstname || ''} ${r.user.fullname.lastname || ''}`.trim() : (r.user && (r.user.email || r.user.phone) ? (r.user.email || r.user.phone) : 'Passenger')}</div>
                    <div className="text-sm text-gray-400">{r.pickup?.address || r.pickupAddress || ''} → {r.drop?.address || r.dropAddress || ''}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(r.createdAt || r.created || Date.now()).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-300">R{(typeof r.fare !== 'undefined' ? Number(r.fare).toFixed(2) : (typeof r.totalFare !== 'undefined' ? Number(r.totalFare).toFixed(2) : '0.00'))}</div>
                    <div className="text-xs text-gray-400 mt-1">{(r.paymentMethod || 'card').toString().toUpperCase()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-400">Showing page {page} of {totalPages} — {total} rides</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 bg-white/5 rounded-lg disabled:opacity-50">Previous</button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-2 bg-white/5 rounded-lg disabled:opacity-50">Next</button>
        </div>
      </div>

      <DriverBottomNav />
    </div>
  );
};

export default CaptainRides;
