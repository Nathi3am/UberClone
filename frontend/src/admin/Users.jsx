import React, { useEffect, useState } from "react";
import { getUsers } from './services/adminApi';

export default function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getUsers();
        setUsers(res.data || []);
      } catch (e) {
        try { if (e && e.response && e.response.status === 401) { localStorage.removeItem('admin_token'); setTimeout(() => { window.location.href = '/admin/login'; }, 150); } } catch (er) {}
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <h1>Users</h1>

      <table style={{ width: "100%", marginTop: "20px", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#1f2937" }}>
            <th style={{ padding: "10px", textAlign: 'left' }}>Name</th>
            <th style={{ textAlign: 'left' }}>Email</th>
            <th style={{ textAlign: 'left' }}>Total Rides</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id} style={{ borderBottom: "1px solid #1f2937" }}>
              <td style={{ padding: "10px" }}>{(user.fullname && (user.fullname.firstname || user.fullname.lastname)) ? `${user.fullname.firstname || ''} ${user.fullname.lastname || ''}`.trim() : (user.name || user.email)}</td>
              <td>{user.email}</td>
              <td>{user.totalRides || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
