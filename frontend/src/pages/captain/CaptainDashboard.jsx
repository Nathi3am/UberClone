import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ActiveRequests from "./ActiveRequests";
import Earnings from "./Earnings";
import DriverBottomNav from "../../components/navigation/DriverBottomNav";
import { SocketContext } from "../../context/SocketContext";
import API from "../../config/api";

const CaptainDashboard = () => {
  const navigate = useNavigate();
  const tabs = [
    { key: "active", label: "Active Requests" },
    { key: "past", label: "Past Requests" },
    { key: "future", label: "Future Requests" },
    { key: "earnings", label: "Earnings" },
  ];

  const [activeTab, setActiveTab] = useState("active");
  const [completedRides, setCompletedRides] = useState([]);
  const [captain, setCaptain] = useState(null);

  const { socket } = useContext(SocketContext);

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${API}/rides/completed`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setCompletedRides(res.data || []))
      .catch((err) => {
        //console.log(err);
      });
  
    // fetch captain profile for totalEarnings
    axios.get(`${API}/captain/profile`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then((res) => {
        if (res && res.data && res.data.captain) setCaptain(res.data.captain);
      })
      .catch(() => {});
    // listen for ride-completed events to refresh earnings & completed list
    try {
      if (socket) {
        const handler = () => {
          const t = localStorage.getItem('token');
          axios.get(`${API}/rides/completed`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => setCompletedRides(r.data || [])).catch(()=>{});
          axios.get(`${API}/captain/profile`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((r) => { if (r && r.data && r.data.captain) setCaptain(r.data.captain); }).catch(()=>{});
        };
        socket.on('ride-completed', handler);
        socket.on('ride-ended', handler);
        return () => {
          try { socket.off('ride-completed', handler); } catch (e) {}
          try { socket.off('ride-ended', handler); } catch (e) {}
        }
      }
    } catch (e) {}
  }, []);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Captain Dashboard</h1>
        </div>
        {captain && (
          <div className="text-sm text-gray-300 mt-1">Total Earnings: R{(captain.totalEarnings || 0).toFixed(2)}</div>
        )}

        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === t.key
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="pt-4">
          {activeTab === "active" && <ActiveRequests />}
          {activeTab === "earnings" && <Earnings completedRides={completedRides} />}
          {activeTab === "past" && (
            <div className="space-y-3">
              {completedRides.length === 0 ? (
                <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-8 border border-white/10 text-center">
                  <p className="text-gray-400">No past completed rides</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedRides.map((ride) => (
                    <div key={ride._id} className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-300">{ride.pickupAddress} → {ride.dropAddress}</div>
                        <div className="text-xs text-gray-400">Distance: {ride.distance} km</div>
                      </div>
                      <div className="text-right">
                        {ride.fare !== undefined && ride.fare !== null && (
                          <div className="text-white font-semibold">R{Number(ride.fare).toFixed(2)}</div>
                        )}
                        <div className="text-xs text-gray-400">{new Date(ride.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "future" && (
            <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
              <h3 className="text-lg font-semibold text-white">Future Requests</h3>
              <p className="text-gray-400 mt-2">No future requests scheduled</p>
            </div>
          )}
        </div>
      </div>
      <DriverBottomNav />
    </div>
  );
};

export default CaptainDashboard;
