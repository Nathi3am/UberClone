import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { DrawerContext } from "../context/DrawerContext";

const MobileHeader = ({ title, showBack = true }) => {
  const navigate = useNavigate();
  const { openDrawer } = useContext(DrawerContext);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#060b19]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between h-full px-4">
        {/* Hamburger / Back Button */}
        {showBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
            title="Go back"
          >
            <span className="text-lg text-white">←</span>
          </button>
        ) : (
          <button
            onClick={() => openDrawer()}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
            title="Open menu"
          >
            <span className="text-lg text-white">☰</span>
          </button>
        )}

        {/* Title */}
        <h1 className="text-lg font-semibold text-white flex-1 text-center">
          {title}
        </h1>

        {/* Empty space for balance */}
        <div className="w-10 h-10" />
      </div>
    </div>
  );
};

export default MobileHeader;
