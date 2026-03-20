import React from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const stats = [
    { title: "Total Rides", value: 178 },
    { title: "Total Revenue", value: "R 24,560" },
    { title: "Commission Earned", value: "R 6,140" },
    { title: "Active Drivers", value: 32 },
    { title: "Total Users", value: 214 }
  ];

  const container = {
    display: "flex",
    height: "100vh",
    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    color: "white",
    fontFamily: "Arial"
  };

  const sidebar = {
    width: "240px",
    background: "#0b1620",
    padding: "30px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  };

  const main = {
    flex: 1,
    padding: "40px"
  };

  const cardGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginTop: "30px"
  };

  const card = {
    background: "rgba(255,255,255,0.08)",
    padding: "20px",
    borderRadius: "12px",
    backdropFilter: "blur(10px)"
  };

  const table = {
    width: "100%",
    marginTop: "40px",
    borderCollapse: "collapse"
  };

  const thtd = {
    padding: "12px",
    borderBottom: "1px solid rgba(255,255,255,0.1)"
  };

  return (
    <div style={container}>
      <div style={sidebar}>
        <h2>Peak Admin</h2>
        <div onClick={() => navigate("/admin/dashboard")}>Dashboard</div>
        <div onClick={() => navigate("/admin/users")}>Users</div>
        <div onClick={() => navigate("/admin/drivers")}>Drivers</div>
        <div onClick={() => navigate("/admin/rides")}>Rides</div>
        <div onClick={() => navigate("/admin/earnings")}>Earnings</div>
      </div>

      <div style={main}>
        <h1>Admin Dashboard</h1>

        <div style={cardGrid}>
          {stats.map((s, i) => (
            <div key={i} style={card}>
              <h3>{s.title}</h3>
              <h2>{s.value}</h2>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: "50px" }}>Recent Rides</h2>

        <table style={table}>
          <thead>
            <tr>
              <th style={thtd}>Ride ID</th>
              <th style={thtd}>User</th>
              <th style={thtd}>Driver</th>
              <th style={thtd}>Fare</th>
              <th style={thtd}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={thtd}>#1023</td>
              <td style={thtd}>Michael Stone</td>
              <td style={thtd}>John Dube</td>
              <td style={thtd}>R 78.00</td>
              <td style={thtd}>Completed</td>
            </tr>
            <tr>
              <td style={thtd}>#1024</td>
              <td style={thtd}>Sarah Khan</td>
              <td style={thtd}>James Nkosi</td>
              <td style={thtd}>R 45.50</td>
              <td style={thtd}>In Progress</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
