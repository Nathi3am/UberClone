import React from 'react';

const ActiveTripCard = ({ trip = {}, onEnd, onNavigate, onChat, onSimulate, simulateActive, onSimulateDropoff, simulateDropoffActive }) => {
  // Support multiple ride object shapes: legacy fields and populated DB ride
  const passengerName = trip.passengerName || (trip.user && (
    (trip.user.fullname && (trip.user.fullname.firstname ? `${trip.user.fullname.firstname} ${trip.user.fullname.lastname || ''}` : trip.user.fullname))
  )) || trip.riderName || trip.name;

  const pickup = trip.pickup || trip.pickupAddress || trip.origin || '';
  const dropoff = trip.dropoff || trip.dropAddress || trip.destination || '';
  const pickupCoords = trip.pickupCoords || trip.pickup_location || trip.originCoords || null;
  const phone = trip.phone || (trip.user && trip.user.phone) || '';

  const navigateToPickup = () => {
    if (typeof onNavigate === 'function') {
      onNavigate({ target: 'pickup', trip });
    }
  };

  const etaSeconds = trip.duration?.value || trip.durationSeconds || trip.etaSeconds || null;

  function formatDuration(seconds) {
    if (!seconds) return '—';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rmins = mins % 60;
    return rmins === 0 ? `${hrs} hr` : `${hrs} hr ${rmins} min`;
  }

  return (
    <div className="rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 p-4 shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-300">Passenger</p>
          <p className="text-lg font-semibold">{passengerName || 'Passenger'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-300">ETA</p>
            <p className="font-semibold">{trip.etaDisplay || formatDuration(etaSeconds)}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-sm text-gray-300">Pickup</div>
        <div className="font-medium">{pickup || 'Unknown'}</div>
        <div className="text-sm text-gray-300 mt-2">Dropoff</div>
        <div className="font-medium">{dropoff || 'Unknown'}</div>
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={() => { if (typeof onChat === 'function') onChat(trip); }} className="flex-1 text-center px-4 py-2 rounded-xl bg-indigo-600">Chat</button>
        <button onClick={navigateToPickup} className="flex-1 text-center px-4 py-2 rounded-xl bg-emerald-600">Navigate</button>
        {typeof onSimulate === 'function' && (
          <button onClick={() => onSimulate(trip)} className={`px-4 py-2 rounded-xl ${simulateActive ? 'bg-yellow-500' : 'bg-yellow-600'}`}>{simulateActive ? 'Stop Simulation' : 'Simulate Drive'}</button>
        )}
        {typeof onSimulateDropoff === 'function' && (
          <button onClick={() => onSimulateDropoff(trip)} className={`px-4 py-2 rounded-xl ${simulateDropoffActive ? 'bg-orange-500' : 'bg-orange-600'}`}>{simulateDropoffActive ? 'Stop Drop-off' : 'Simulate Drop-off'}</button>
        )}
        <button onClick={onEnd} className="px-4 py-2 rounded-xl bg-red-600">End</button>
      </div>
    </div>
  );
};

export default ActiveTripCard;
