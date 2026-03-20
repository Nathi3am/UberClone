import React, { useEffect, useState } from "react";
import { getStats } from './services/adminApi';

export default function Dashboard() {
  const [stats, setStats] = useState({ rides: 0, revenue: 0, commission: 0, users: 0, drivers: 0 });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await getStats();
        setStats({
          rides: res.data.totalRides || 0,
          revenue: res.data.totalRevenue || 0,
          commission: res.data.totalCommission || 0,
          users: res.data.totalUsers || 0,
          drivers: res.data.totalDrivers || 0
        });
      } catch (e) {
        try {
          const status = e && e.response && e.response.status;
          if (status === 401) {
            localStorage.removeItem('admin_token');
            setTimeout(() => { window.location.href = '/admin/login'; }, 150);
          }
        } catch (err) {}
      }
    }
    fetchStats();
  }, []);

  const cardStyle = {
    background: "#1f2937",
    padding: "20px",
    borderRadius: "12px",
    flex: "1",
    minWidth: "200px"
  };

  return (
    <div>
      <h1 style={{ marginBottom: "30px" }}>Admin Dashboard</h1>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div style={cardStyle}>
          <h3>Total Rides</h3>
          <h2>{stats.rides}</h2>
        </div>

        <div style={cardStyle}>
          <h3>Total Revenue</h3>
          <h2>R{stats.revenue}</h2>
        </div>

        <div style={cardStyle}>
          <h3>Total Commission</h3>
          <h2>R{stats.commission}</h2>
        </div>

        <div style={cardStyle}>
          <h3>Total Users</h3>
          <h2>{stats.users}</h2>
        </div>

        <div style={cardStyle}>
          <h3>Total Drivers</h3>
          <h2>{stats.drivers}</h2>
        </div>
      </div>
    </div>
  );
}
