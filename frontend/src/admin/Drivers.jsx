import React, { useEffect, useState } from "react";
import { getDrivers } from './services/adminApi';

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getDrivers();
        // API returns an object { drivers: [...], totalPages, currentPage }
        const list = (res && res.data && (res.data.drivers || res.data)) || [];
        setDrivers(list);
      } catch (e) {
        try { if (e && e.response && e.response.status === 401) { localStorage.removeItem('admin_token'); setTimeout(() => { window.location.href = '/admin/login'; }, 150); } } catch (er) {}
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <h1>Drivers</h1>

      <table style={{ width: "100%", marginTop: "20px" }}>
        <thead>
          <tr style={{ background: "#1f2937" }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Trips Completed</th>
            <th style={{ textAlign: 'left' }}>Vehicle</th>
            <th style={{ textAlign: 'left' }}>Earnings</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map(driver => (
            <tr key={driver._id}>
              <td style={{ padding: '10px' }}>{(driver.fullname && (driver.fullname.firstname || driver.fullname.lastname)) ? `${driver.fullname.firstname || ''} ${driver.fullname.lastname || ''}`.trim() : (driver.name || driver.email)}</td>
              <td>{Number(driver.totalTrips || driver.totalTrips === 0 ? driver.totalTrips : (driver.totalTrips || 0))}</td>
              <td>{(driver.vehicle && driver.vehicle.plate) ? `${driver.vehicle.plate}` : (driver.vehicle || '—')}</td>
              <td>R{driver.totalEarnings || driver.earnings || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
