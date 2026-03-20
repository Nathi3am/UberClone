import React, { useEffect, useState, useContext } from "react";
import { NavLink } from "react-router-dom";
import axios from 'axios';
import { SocketContext } from '../../context/SocketContext';

const CaptainBottomNav = () => {
  const { socket } = useContext(SocketContext);
  const [pendingCount, setPendingCount] = useState(0);
  import API_BASE_URL from '../../config/api';
  const API = API_BASE_URL.replace(/\/api$/, '');

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/rides/pending`, { headers: { Authorization: `Bearer ${token}` } });
        if (!mounted) return;
        setPendingCount(Array.isArray(res.data) ? res.data.length : (res.data && res.data.length) || 0);
      } catch (e) {
        // ignore
      }
    };
    fetchPending();

    if (socket) {
      // server may emit 'captain_receive_request' or 'new-ride' depending on flow
      socket.on('captain_receive_request', (ride) => {
        setPendingCount((c) => c + 1);
      });
      socket.on('new-ride', (ride) => {
        setPendingCount((c) => c + 1);
      });
      // when a ride is accepted/declined remove one from count if present
      socket.on('ride-accepted', (ride) => {
        setPendingCount((c) => Math.max(0, c - 1));
      });
      socket.on('ride-declined', (ride) => {
        setPendingCount((c) => Math.max(0, c - 1));
      });
    }

    return () => {
      mounted = false;
      try { socket && socket.off('captain_receive_request'); } catch (e) {}
      try { socket && socket.off('ride-accepted'); } catch (e) {}
      try { socket && socket.off('ride-declined'); } catch (e) {}
    };
  }, [socket]);
  const linkClass = ({ isActive }) =>
    `flex flex-col items-center text-xs transition-all duration-300 ${
      isActive ? "text-white scale-110 -translate-y-1" : "text-white/70"
    }`;

  return (
    <nav className="fixed bottom-0 w-full bg-black/40 backdrop-blur-xl border-t border-white/10 flex justify-around items-center py-3 z-50">
      <NavLink to="/captain/home" className={linkClass} aria-label="Home">
        {({ isActive }) => (
          <>
            <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
              <span className="text-2xl">🏠</span>
            </div>
            <span className="mt-1">Home</span>
          </>
        )}
      </NavLink>

      <NavLink to="/captain/requests" className={linkClass} aria-label="Requests">
        {({ isActive }) => (
          <>
            <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg relative" : "relative"}>
              <span className="text-2xl">📬</span>
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{pendingCount}</span>
              )}
            </div>
            <span className="mt-1">Requests</span>
          </>
        )}
      </NavLink>

      <NavLink to="/captain/earnings" className={linkClass} aria-label="Earnings">
        {({ isActive }) => (
          <>
            <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
              <span className="text-2xl">💰</span>
            </div>
            <span className="mt-1">Earnings</span>
          </>
        )}
      </NavLink>

      <NavLink to="/captain/ratings" className={linkClass} aria-label="Ratings">
        {({ isActive }) => (
          <>
            <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
              <span className="text-2xl">⭐</span>
            </div>
            <span className="mt-1">Ratings</span>
          </>
        )}
      </NavLink>

      <NavLink to="/captain/profile" className={linkClass} aria-label="Profile">
        {({ isActive }) => (
          <>
            <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
              <span className="text-2xl">👤</span>
            </div>
            <span className="mt-1">Profile</span>
          </>
        )}
      </NavLink>

      <NavLink to="/captain/help" className={linkClass} aria-label="Help">
        {({ isActive }) => (
          <>
            <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
              <span className="text-2xl">❓</span>
            </div>
            <span className="mt-1">Help</span>
          </>
        )}
      </NavLink>
    </nav>
  );
};

export default CaptainBottomNav;
