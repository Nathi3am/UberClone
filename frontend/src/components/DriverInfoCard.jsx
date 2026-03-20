import React from "react";

const DriverInfoCard = ({ driver, eta }) => {
  const d = driver || {};
  const displayName = d.name || d.fullname || d.fullName || "Driver";
  const vehicleType = d.vehicleType || d.vehicle?.vehicleType || d.vehicle?.brand || "Car";
  const color = d.color || d.vehicle?.color || "Color";
  const plate = d.plate || d.vehicle?.plate || "XXX-000";
  const distanceAwayText = d.distanceAway || d.distance || d.distanceText || "Nearby";

  return (
    <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-4 border border-white/10 transition-all duration-300 shadow-md">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-800">
          {d?.profileImage ? (
            <img src={d.profileImage} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">👨‍✈️</div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">{displayName}</p>
          <p className="text-gray-400 text-sm">{vehicleType} • {color} • {plate}</p>
          <p className="text-gray-400 text-sm">{distanceAwayText ? `${distanceAwayText}` : "Nearby"}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-bold">ETA</p>
          <p className="text-gray-300">{eta || "5 min"}</p>
        </div>
      </div>
    </div>
  );
};

export default DriverInfoCard;
