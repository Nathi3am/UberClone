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
      <div className="bg-[#0e1420]/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 max-w-lg w-full border border-white/8 hover:border-white/20 transition-all duration-300">
        {/* Wordmark */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center gap-3">
            <img src={logoPath} alt="VexoMove mark" className="w-14 h-14" />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              <span className="text-white">Vexo</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00B4FF] via-[#00E0FF] to-[#0088FF] ml-1">Move</span>
            </h1>
          </div>
          <div className="mt-2 text-lg text-slate-300 font-medium">Move Smarter</div>
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
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            <span>Welcome To </span>
            <span className="">Vexo</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#00B4FF] via-[#00E0FF] to-[#0088FF] ml-1">Move</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Your premium ride-sharing experience
          </p>
        </div>

        {/* CTA Button */}
        <Link
          to="/login"
          className="w-full inline-flex items-center justify-center py-5 rounded-full bg-gradient-to-r from-indigo-500 via-indigo-500/90 to-blue-500 text-white font-semibold text-lg shadow-2xl hover:shadow-indigo-500/40 active:scale-95 transform transition-all duration-300 ring-1 ring-white/5"
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
