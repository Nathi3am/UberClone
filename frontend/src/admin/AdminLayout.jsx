import React from "react";
import { Outlet, NavLink } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", color: "white" }}>
      <div style={{
        width: "240px",
        background: "#111827",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        borderRight: "1px solid #1f2937"
      }}>
        <h2 style={{ marginBottom: "20px", fontWeight: "bold" }}>Peak Admin</h2>

        { ["dashboard", "users", "drivers", "rides", "earnings"].map(route => (
          <NavLink
            key={route}
            to={`/admin/${route}`}
            style={({ isActive }) => ({
              padding: "10px",
              borderRadius: "8px",
              textDecoration: "none",
              color: isActive ? "#3b82f6" : "#9ca3af",
              background: isActive ? "#1f2937" : "transparent"
            })}
          >
            {route.charAt(0).toUpperCase() + route.slice(1)}
          </NavLink>
        )) }
      </div>

      <div style={{ flex: 1, padding: "30px" }}>
        <Outlet />
      </div>
    </div>
  );
}
