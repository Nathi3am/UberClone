import React from "react";
import API from '../src/config/api';

const DriverSelected = (props) => {
  const formatAddress = (address) => {
    if (!address) return { firstPart: "", secondPart: "" };
    const firstCommaIndex = address.indexOf(",");
    if (firstCommaIndex === -1) {
      return { firstPart: address, secondPart: "" };
    }
    const firstPart = address.substring(0, firstCommaIndex);
    const secondPart = address.substring(firstCommaIndex + 1).trim();
    return { firstPart, secondPart };
  };
  if (!props.ride)
    return (
      <div>
        <h1>Loading...</h1>
      </div>
    );
  // //console.log(props.ride);
  const pickupAddress = props.ride.pickupAddress || props.ride.pickup || "";
  const dropAddress = props.ride.dropAddress || props.ride.destination || "";
  const { firstPart, secondPart } = formatAddress(pickupAddress || "");
  const captain = props.ride.captain || {};
  const vehicle = captain.vehicle || {};
  const status = props.ride.status || "pending";
  const API_BASE = API || "";
  const imageCandidate = captain.profileImage || props.ride.captainProfileImage || null;
  const profileSrc = imageCandidate && typeof imageCandidate === 'string' && imageCandidate.startsWith('/') ? `${API_BASE}${imageCandidate}` : imageCandidate;
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg border border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">Ride</h2>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${status === 'accepted' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
              {status}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <div className="flex gap-6 items-center">
            <div className="flex-shrink-0">
              {profileSrc ? (
                <img
                  className="w-24 h-24 rounded-full object-cover ring-2 ring-white/20"
                  src={profileSrc}
                  alt={(captain.fullname && (captain.fullname.firstname || captain.fullname.lastname)) ? `${captain.fullname.firstname || ''} ${captain.fullname.lastname || ''}`.trim() : (props.ride.captainName || 'Captain')}
                  onError={(e) => { e.target.onerror = null; e.target.src = '/default-avatar.svg'; }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-3xl">👨‍✈️</div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold">{props.ride.captainName || ((captain.fullname && (captain.fullname.firstname + (captain.fullname.lastname ? ' ' + captain.fullname.lastname : ''))) || captain.email || 'Captain')}</div>
                  <div className="text-sm text-gray-300 mt-1">{captain.phone || props.ride.captainPhone || captain.email || 'No contact'}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold">{vehicle.plate || props.ride.vehiclePlate || '—'}</div>
                  <div className="text-sm text-gray-300 mt-1">{(vehicle.brand || '') + (vehicle.model ? ` ${vehicle.model}` : '')}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="inline-flex items-center gap-2 bg-white/3 px-3 py-2 rounded-lg">
                  <i className="ri-car-line ri-lg"></i>
                  <div className="text-sm">{vehicle.year || props.ride.vehicleYear || 'Year'}</div>
                </div>
                <div className="inline-flex items-center gap-2 bg-white/3 px-3 py-2 rounded-lg">
                  <i className="ri-group-line ri-lg"></i>
                  <div className="text-sm">{vehicle.capacity ? `${vehicle.capacity} seats` : (props.ride.vehicleCapacity ? `${props.ride.vehicleCapacity} seats` : 'Capacity')}</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-300 px-3 py-2 rounded-lg">
                    <i className="ri-star-fill ri-xs"></i>
                    <span className="font-semibold">{(captain.rating || props.ride.captainRating || 4.9).toFixed ? (captain.rating || props.ride.captainRating || 4.9).toFixed(1) : (captain.rating || props.ride.captainRating || 4.9)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm text-gray-400 mb-2">Pickup</div>
            <div className="flex items-start gap-3">
              <i className="ri-map-pin-range-fill ri-xl text-white/70" />
              <div>
                <div className="font-semibold text-lg">{firstPart}</div>
                {secondPart && <div className="text-sm text-gray-300">{secondPart}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverSelected;
