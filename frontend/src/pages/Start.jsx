import React from "react";
import { Link, Navigate } from "react-router-dom";
import logoPath from "../config/logo";
import welcomeImg from "../../../assets/Welcome Page.png";

const Start = () => {
  const captainToken = localStorage.getItem("captainToken");
  const userToken = localStorage.getItem("token");

  if (captainToken) {
    return <Navigate to="/captain-home" replace />;
  }

  if (userToken) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="bg-[#121826]/70 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/10 hover:border-white/20 transition-all duration-300">
        {/* Logo */}
        <div className="mb-8">
            <img
            className="w-12 h-12 hover:scale-110 transition-transform duration-300"
            src={logoPath}
            alt="VexoMove Logo"
          />
        </div>

        {/* Hero Image */}
        <div className="mb-8 rounded-xl overflow-hidden">
          <img
            className="w-full h-auto object-cover"
            src={welcomeImg}
            alt="Welcome"
          />
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold tracking-wide text-white mb-2">
            Welcome To VexoMove
          </h2>
          <p className="text-gray-400 text-sm">
            Your premium ride-sharing experience
          </p>
        </div>

        {/* CTA Button */}
        <Link
          to="/login"
          className="
            w-full
            py-4
            rounded-xl
            bg-gradient-to-r from-indigo-500 to-blue-500
            text-white
            font-semibold
            shadow-lg
            hover:shadow-indigo-500/40
            hover:scale-[1.02]
            active:scale-95
            transition-all
            duration-300
            inline-flex
            items-center
            justify-center
          "
        >
          Continue
        </Link>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Ride smarter, ride premium
        </p>
      </div>
    </div>
  );
};

export default Start;
