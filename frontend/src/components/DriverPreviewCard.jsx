import React from "react";

const DriverPreviewCard = ({ driver, onSelect }) => {
  const d = driver || {};
  const name = d.fullname || d.fullName || d.name || d.vehicle?.vehicleType || "Driver";
  const vehicleLine = `${d.vehicle?.brand || d.vehicle?.vehicleType || ''} ${d.vehicle?.model || ''}`.trim();
  const distanceText = d.distance || d.distanceText || d.distanceValue || "Nearby";
  const price = d.estimatedPrice ?? d.estimate ?? d.price ?? 0;

  return (
    <div
      onClick={() => onSelect ? onSelect(driver) : null}
      className="p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 cursor-pointer"
      role="button"
      style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.03)' }}
    >
      <img
        src={d.profileImage || "/avatar-placeholder.png"}
        alt={name}
        className="w-14 h-14 rounded-full object-cover shadow-lg"
        style={{ border: '1px solid rgba(255,255,255,0.04)' }}
      />

      <div className="flex-1">
        <h3 className="text-white font-semibold">{name}</h3>
        <p className="text-gray-400 text-sm">{vehicleLine}</p>
        <p className="text-gray-400 text-sm">{distanceText}</p>
      </div>

      <div className="text-right">
        <p className="text-blue-400 font-bold text-lg">R{Number(price || 0).toFixed(2)}</p>
        <p className="text-gray-400 text-xs">est</p>
      </div>
    </div>
  );
};

export default DriverPreviewCard;
