import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { RideContext } from "../context/RideContext";

const FloatingRideButton = () => {
  const navigate = useNavigate();
  const { activeRide } = useContext(RideContext);

  return (
    // hide request button while user has an active ride
    !activeRide ? (
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => navigate("/home")}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-300 animate-pulse"
          aria-label="Request Ride"
        >
          <span className="mr-2">🚗</span> Request Ride
        </button>
      </div>
    ) : null
  );
};

export default FloatingRideButton;
