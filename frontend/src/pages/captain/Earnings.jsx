import React, { useMemo } from "react";

const Earnings = ({ completedRides = [] }) => {
  const total = useMemo(() => completedRides.reduce((s, r) => s + (r.fare || 0), 0), [completedRides]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Earnings</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 rounded-xl p-4">
          <p className="text-sm text-gray-400">Total Earnings</p>
          <p className="text-white font-bold text-2xl">৳{total.toFixed(2)}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-sm text-gray-400">Today</p>
          <p className="text-white font-bold text-2xl">৳0.00</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
          <p className="text-sm text-gray-400">This Week</p>
          <p className="text-white font-bold text-2xl">৳0.00</p>
        </div>
      </div>

      <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-3">Recent Rides</h3>
        {completedRides.length === 0 ? (
          <p className="text-gray-400">No recent rides to display</p>
        ) : (
          <div className="space-y-2">
            {completedRides.slice(0, 5).map((r) => (
              <div key={r._id} className="flex justify-between text-sm text-gray-300">
                <div>{r.pickupAddress} → {r.dropAddress}</div>
                <div>R{Number(r.fare || 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Earnings;
