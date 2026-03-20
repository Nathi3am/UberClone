import React, { useContext } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { UserDataContext } from "../context/UserContext";
import { toast } from "react-toastify";

const BottomNav = () => {
  const linkClass = ({ isActive }) =>
    `flex flex-col items-center text-xs transition-all duration-300 ${
      isActive
        ? "text-white scale-110 -translate-y-1"
        : "text-white/60"
    }`;

  const { user } = useContext(UserDataContext);
  const { setUser } = useContext(UserDataContext);
  const navigate = useNavigate();
  const location = useLocation();

  // hide bottom nav on specialized standalone pages
  const hiddenPages = ['/special-requests', '/payments'];
  if (hiddenPages.includes(location.pathname)) return null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.info('Logged out');
    navigate('/login');
  };

  const isCaptain = user && user.role === "captain";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#060b19]/80 backdrop-blur-xl border-t border-white/[0.06] flex justify-around items-center py-3 z-50 transition-all duration-300 ease-out">
      {isCaptain ? (
        <>
          <NavLink to="/captain-home" className={linkClass} aria-label="Home">
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
                <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
                  <span className="text-2xl">📬</span>
                </div>
                <span className="mt-1">Requests</span>
              </>
            )}
          </NavLink>

          <NavLink to="/captain/dashboard" className={linkClass} aria-label="Earnings">
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

          <NavLink to="/help" className={linkClass} aria-label="Help">
            {({ isActive }) => (
              <>
                <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
                  <span className="text-2xl">❓</span>
                </div>
                <span className="mt-1">Help</span>
              </>
            )}
          </NavLink>
          <button onClick={handleLogout} className="text-white/60 flex flex-col items-center text-xs">
            <div>
              <span className="text-2xl">🔓</span>
            </div>
            <span className="mt-1">Logout</span>
          </button>
        </>
      ) : (
        <>
          <NavLink to="/home" className={linkClass} aria-label="Home">
            {({ isActive }) => (
              <>
                <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
                  <span className="text-2xl">🏠</span>
                </div>
                <span className="mt-1">Home</span>
              </>
            )}
          </NavLink>

          <NavLink to="/account/rides" className={linkClass} aria-label="Rides">
            {({ isActive }) => (
              <>
                <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
                  <span className="text-2xl">🚗</span>
                </div>
                <span className="mt-1">Rides</span>
              </>
            )}
          </NavLink>

          <NavLink to="/account/payment" className={linkClass} aria-label="Payments">
            {({ isActive }) => (
              <>
                <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
                  <span className="text-2xl">💳</span>
                </div>
                <span className="mt-1">Payments</span>
              </>
            )}
          </NavLink>

          <NavLink to="/account/profile" className={linkClass} aria-label="Account">
            {({ isActive }) => (
              <>
                <div className={isActive ? "bg-white/10 rounded-full px-3 py-1 shadow-lg" : ""}>
                  <span className="text-2xl">👤</span>
                </div>
                <span className="mt-1">Account</span>
              </>
            )}
          </NavLink>
          <button onClick={handleLogout} className="text-white/60 flex flex-col items-center text-xs">
            <div>
              <span className="text-2xl">🔓</span>
            </div>
            <span className="mt-1">Logout</span>
          </button>
        </>
      )}
    </nav>
  );
};

export default BottomNav;
