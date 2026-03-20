import React, { useEffect, useState } from "react";
import { getRides } from './services/adminApi';
import API_BASE_URL from '../config/api';

export default function Rides() {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getRides();
        setRides(res.data || []);
      } catch (e) {
        try { if (e && e.response && e.response.status === 401) { localStorage.removeItem('admin_token'); setTimeout(() => { window.location.href = '/admin/login'; }, 150); } } catch (er) {}
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <h1>All Rides</h1>

      <table style={{ width: "100%", marginTop: "20px" }}>
        <thead>
          <tr style={{ background: "#1f2937" }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>User</th>
            <th style={{ textAlign: 'left' }}>Driver</th>
            <th style={{ textAlign: 'left' }}>Fare</th>
            <th style={{ textAlign: 'left' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rides.map(ride => (
            <tr key={ride._id}>
              <td style={{ padding: '10px' }}>{ride.user && (ride.user.fullname ? `${ride.user.fullname.firstname || ''} ${ride.user.fullname.lastname || ''}`.trim() : ride.user.email) }</td>
              <td>{ride.captain && (ride.captain.fullname ? `${ride.captain.fullname.firstname || ''} ${ride.captain.fullname.lastname || ''}`.trim() : ride.captain.email)}</td>
              <td>R{(ride.fare || ride.totalFare || 0).toFixed ? (ride.fare || ride.totalFare || 0).toFixed(2) : (ride.fare || ride.totalFare || 0)}</td>
              <td>{ride.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
