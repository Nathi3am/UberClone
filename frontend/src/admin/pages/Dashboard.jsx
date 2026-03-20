import React, { useEffect, useState, useContext } from 'react';
import StatCard from '../components/StatCard';
import { getStats, getRides } from '../services/adminApi';
import { AdminContext } from '../context/AdminContext';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const { socket } = useContext(AdminContext);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const s = await getStats();
        const r = await getRides();
        if (!mounted) return;
        setStats(s.data || {});
        setRecent(r.data || []);
      } catch (e) {}
    }
    load();

    const interval = setInterval(load, 45000);

    if (socket) {
      socket.on('new_trip', (d) => setRecent(prev => [d, ...prev].slice(0, 10)));
    }

    return () => { mounted = false; clearInterval(interval); };
  }, [socket]);

  if (!stats) return <div style={{ color: '#cbd5e1' }}>Loading...</div>;

  const statList = [
    { title: 'Active Drivers', value: stats.totalDrivers || 0, delta: 5 },
    { title: 'Active Riders', value: stats.totalUsers || 0, delta: 2 },
    { title: 'Ongoing Trips', value: (recent || []).filter(r => r.status === 'accepted' || r.status === 'ongoing').length, delta: -1 },
    { title: 'Completed Today', value: stats.totalRides || 0, delta: 8 },
    { title: 'Today Revenue', value: `R ${Number(stats.totalRevenue || 0).toFixed(2)}`, delta: 6 },
    { title: 'Avg Driver Rating', value: (stats.avgDriverRating || 4.6), delta: 0.5 },
  ];

  return (
    <div>
      <h2 style={{ color: '#e6eef6' }}>Overview</h2>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16 }}>
        {statList.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <h3 style={{ marginTop: 30 }}>Recent Activity</h3>
      <div style={{ marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: 12 }}>Ride</th>
              <th>Driver</th>
              <th>User</th>
              <th>Fare</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(recent || []).slice(0,10).map((r) => (
              <tr key={r._id} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: 12 }}>{r._id}</td>
                <td>{r.captain ? (r.captain.fullname ? `${r.captain.fullname.firstname || ''} ${r.captain.fullname.lastname || ''}` : r.captain.email) : '—'}</td>
                <td>{r.user ? (r.user.fullname ? `${r.user.fullname.firstname || ''} ${r.user.fullname.lastname || ''}` : r.user.email) : '—'}</td>
                <td>R{(r.fare || r.totalFare || 0).toFixed ? (r.fare || r.totalFare || 0).toFixed(2) : (r.fare || r.totalFare || 0)}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
