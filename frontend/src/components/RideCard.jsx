import React from "react";

const RideCard = ({ ride, onAccept, onDecline }) => {
  return (
    <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-4 border border-white/10 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-xl">
          {ride.user?.initials || "👤"}
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold">{ride.user?.name || "Unknown User"}</p>
          <p className="text-gray-400 text-sm">{ride.pickup?.address}</p>
          <p className="text-gray-400 text-sm">→ {ride.destination?.address}</p>
          <div className="text-gray-400 text-sm mt-2 flex gap-4">
            <span>Distance: {ride.distance ? `${ride.distance.toFixed(2)} km` : "N/A"}</span>
            <span>Est: ৳{ride.estimatedFare ? Number(ride.estimatedFare).toFixed(2) : '0.00'}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => onAccept(ride)}
          className="flex-1 py-3 rounded-lg bg-emerald-500/80 hover:bg-emerald-500/100 text-white font-semibold transition-all duration-300"
        >
          Accept
        </button>
        <button
          onClick={() => onDecline(ride)}
          className="flex-1 py-3 rounded-lg bg-red-500/30 hover:bg-red-500/40 text-red-300 font-semibold transition-all duration-300"
        >
          Decline
        </button>
      </div>
    </div>
  );
};

export default RideCard;
