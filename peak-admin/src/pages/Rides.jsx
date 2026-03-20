import React, { useEffect, useState } from 'react'
import axios from 'axios'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .rd-root {
    min-height: 100vh;
    background: #080810;
    font-family: 'DM Sans', sans-serif;
    color: #e2e0f0;
    position: relative; overflow-x: hidden;
  }
  .rd-root::before {
    content: '';
    position: fixed; top: -20%; right: -10%;
    width: 700px; height: 700px;
    background: radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 65%);
    pointer-events: none; z-index: 0;
  }

  .rd-wrap {
    position: relative; z-index: 1;
    max-width: 1180px; margin: 0 auto;
    padding: 40px 32px 80px;
  }

  .rd-header {
    display: flex; align-items: center;
    justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
    margin-bottom: 16px;
  }
  .rd-title {
    font-family: 'Syne', sans-serif;
    font-size: 30px; font-weight: 800;
    letter-spacing: -0.5px; color: #f0f0fa;
  }
  .rd-title span {
    background: linear-gradient(90deg, #10b981, #34d399);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }

  .rd-count {
    font-size: 13px; color: #5050a0;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    padding: 6px 14px; border-radius: 30px;
  }

  .rd-section-label {
    font-family: 'Syne', sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase;
    color: #10b981; margin-bottom: 16px; margin-top: 32px;
    display: flex; align-items: center; gap: 10px;
  }
  .rd-section-label::after {
    content: ''; flex: 1; height: 1px;
    background: rgba(16,185,129,0.2);
  }

  .rd-table-wrap {
    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 22px; overflow: hidden;
    position: relative;
  }
  .rd-table-wrap::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #10b981, #6366f1);
  }

  .rd-table { width: 100%; border-collapse: collapse; }
  .rd-table thead tr { background: rgba(0,0,0,0.3); }
  .rd-table thead th {
    padding: 14px 18px;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: #5050a0; text-align: left; white-space: nowrap;
  }
  .rd-table tbody tr {
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.18s;
  }
  .rd-table tbody tr:last-child { border-bottom: none; }
  .rd-table tbody tr:hover { background: rgba(16,185,129,0.04); }
  .rd-table td { padding: 14px 18px; font-size: 13px; vertical-align: middle; }

  .rd-time { font-size: 12px; color: #7070a0; }
  .rd-person { font-weight: 500; color: #c0c0e0; }
  .rd-fare {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 700; color: #10b981;
  }

  .rd-status-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 30px;
    font-size: 11px; font-weight: 600;
    text-transform: capitalize; letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .rd-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .rd-status-completed { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.25); }
  .rd-status-ongoing { background: rgba(99,102,241,0.12); color: #818cf8; border: 1px solid rgba(99,102,241,0.25); }
  .rd-status-cancelled { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
  .rd-status-default { background: rgba(255,255,255,0.05); color: #7070a0; border: 1px solid rgba(255,255,255,0.08); }

  .rd-empty {
    text-align: center; padding: 56px 20px;
    color: #4040a0; font-size: 14px;
  }

  .rd-loader {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 100vh; background: #080810; gap: 16px;
  }
  .rd-spinner {
    width: 38px; height: 38px;
    border: 3px solid rgba(16,185,129,0.2);
    border-top-color: #10b981;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .rd-loader-text { color: #5050a0; font-size: 14px; }

  @media (max-width: 768px) {
    .rd-wrap { padding: 24px 14px 60px; }
    .rd-table thead th:nth-child(3),
    .rd-table td:nth-child(3) { display: none; }
  }
`;

const statusClass = (s) => {
  if (!s) return 'rd-status-default';
  const l = s.toLowerCase();
  if (l === 'completed') return 'rd-status-completed';
  if (l === 'ongoing' || l === 'in-progress' || l === 'accepted') return 'rd-status-ongoing';
  if (l === 'cancelled' || l === 'canceled') return 'rd-status-cancelled';
  return 'rd-status-default';
};

export default function Rides() {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get('http://localhost:4000/admin/rides', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { setRides(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="rd-loader"><div className="rd-spinner" /><p className="rd-loader-text">Loading rides…</p></div>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="rd-root">
        <div className="rd-wrap">
          <div className="rd-header">
            <h1 className="rd-title">All <span>Rides</span></h1>
            <span className="rd-count">{rides.length} total</span>
          </div>

          <div className="rd-section-label">Trip History</div>
          <div className="rd-table-wrap">
            <table className="rd-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Passenger</th>
                  <th>Driver</th>
                  <th>Fare</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rides.length === 0 ? (
                  <tr><td colSpan="5" className="rd-empty">No rides found</td></tr>
                ) : rides.map(r => (
                  <tr key={r._id}>
                    <td>
                      <div className="rd-time">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: '#4040a0', marginTop: 2 }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>
                    <td><div className="rd-person">{r.user?.fullname?.firstname || r.user?.email || '—'}</div></td>
                    <td><div className="rd-person">{r.captain?.fullname?.firstname || r.captain?.email || <span style={{ color: '#5050a0', fontStyle: 'italic' }}>Unassigned</span>}</div></td>
                    <td><div className="rd-fare">R{((r.totalFare || r.fare) || 0).toFixed(2)}</div></td>
                    <td>
                      <span className={`rd-status-badge ${statusClass(r.status)}`}>
                        <span className="rd-status-dot" />
                        {r.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

