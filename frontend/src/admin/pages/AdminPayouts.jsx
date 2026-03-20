import { useEffect, useState, useContext } from "react";
import { SocketContext } from '../../context/SocketContext';
import { getDriverBalances, postPayDriver, postSettleDriverDebt } from '../services/adminApi';

export default function AdminPayouts() {
  const [drivers, setDrivers] = useState([]);
  const API = API_BASE_URL.replace(/\/api$/, '');

  useEffect(() => {
    fetchBalances();
  }, []);

  // subscribe to admin socket broadcasts
  const { socket } = useContext(SocketContext);
  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      try {
        // payload: { driverId, owedToPlatform, totalOwed }
        if (!payload) return;
        const { driverId, owedToPlatform } = payload;
        if (driverId) {
          setDrivers((prev) => prev.map((d) => d._id === driverId ? { ...d, owedToPlatform: Number(owedToPlatform || 0) } : d));
        } else {
          // fallback: refetch all balances
          fetchBalances();
        }
      } catch (e) {}
    };
    socket.on('owed-updated', handler);
    return () => { socket.off('owed-updated', handler); };
  }, [socket]);

  const fetchBalances = async () => {
    try {
      const res = await getDriverBalances();
      setDrivers(res.data);
    } catch (e) {
      console.error('Failed fetching driver balances', e);
      try { if (e && e.response && e.response.status === 401) { localStorage.removeItem('admin_token'); setTimeout(() => { window.location.href = '/admin/login'; }, 150); } } catch (er) {}
    }
  };

  const payDriver = async (id) => {
    try {
      await postPayDriver(id);
      fetchBalances();
    } catch (e) {
      console.error('Failed paying driver', e);
      try { if (e && e.response && e.response.status === 401) { localStorage.removeItem('admin_token'); setTimeout(() => { window.location.href = '/admin/login'; }, 150); } } catch (er) {}
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Driver Payout Management</h2>

      <div className="space-y-4">
        {drivers.map((d) => (
          <div
            key={d._id}
            className="bg-white/5 p-4 rounded-xl flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">{d.fullname}</p>
              <p className="text-sm text-gray-400">Wallet Balance: R{(d.walletBalance || 0).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total Earned: R{(d.totalEarnings || 0).toFixed(2)}</p>
              <p className="text-sm mt-1 text-red-400">Owed to Platform: R{(d.owedToPlatform || 0).toFixed(2)}</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => payDriver(d._id)}
                disabled={!(d.walletBalance > 0)}
                className="bg-emerald-500 px-4 py-2 rounded-lg text-white disabled:bg-gray-600"
              >
                Mark as Paid
              </button>
              <button
                onClick={() => {
                  // Quick admin action: settle owed-to-platform for this driver
                  postSettleDriverDebt(d._id).then(() => fetchBalances()).catch((e) => { console.error('Failed to settle debt', e); try { if (e && e.response && e.response.status === 401) { localStorage.removeItem('admin_token'); setTimeout(() => { window.location.href = '/admin/login'; }, 150); } } catch (er) {} });
                }}
                className="bg-red-600 px-3 py-2 rounded-lg text-white"
                disabled={!(d.owedToPlatform > 0)}
              >
                Clear Owed
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
