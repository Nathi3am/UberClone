import React, { useContext, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import logo from '../assests/logo.png';
import { SocketContext } from '../context/SocketContext'
import axios from 'axios'
import Toast from '../components/Toast'
import API_BASE_URL from '../config/api';

export default function AdminLayout() {
  const { newDeletedCount } = useContext(SocketContext) || {};
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }

  const doReset = async () => {
    try {
      if (!resetPassword || resetPassword.trim().length === 0) {
        showToast('Please enter admin password', 'error');
        return;
      }
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/admin/reset-dashboard`, { password: resetPassword }, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setShowResetModal(false);
      setResetPassword('');
      showToast('Dashboard reset successfully');
    } catch (e) {
      console.error('reset error', e);
      const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Failed to reset dashboard';
      showToast(msg, 'error');
    }
  }
  return (
    <div className="admin-container">
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logo} alt="VexoMove" style={{ height: 36 }} />
        </div>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 72px)' }}>
        <aside className="sidebar">
          <h2>VexoMove Admin</h2>
          <nav style={{ marginTop: 12 }}>
            <ul>
              <li><NavLink to="/admin/dashboard" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink></li>
              <li><NavLink to="/admin/drivers" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Drivers</NavLink></li>
              <li><NavLink to="/admin/users" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Users</NavLink></li>
              <li><NavLink to="/admin/rides" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Rides</NavLink></li>
              <li><NavLink to="/admin/earnings" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Earnings</NavLink></li>
              <li><NavLink to="/admin/pricing" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Pricing</NavLink></li>
              <li><NavLink to="/admin/commission" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Commission</NavLink></li>
              <li style={{ marginTop: 18 }}><NavLink to="/admin/payouts-records" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Payouts Records</NavLink></li>
              <li style={{ position: 'relative' }}>
                <NavLink to="/admin/deleted-profiles" className={({isActive}) => isActive ? 'nav-link active muted' : 'nav-link muted'}>
                  Deleted Profiles
                </NavLink>
                {newDeletedCount > 0 && (
                  <span style={{ position: 'absolute', left: 150, top: 8, background: '#ef4444', color: '#fff', padding: '6px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{newDeletedCount}</span>
                )}
              </li>
              <li><NavLink to="/admin/special-requests" className={({isActive}) => isActive ? 'nav-link active muted' : 'nav-link muted'}>Special Requests</NavLink></li>
              <li><NavLink to="/admin/trips-drivers" className={({isActive}) => isActive ? 'nav-link active muted' : 'nav-link muted'}>Trips</NavLink></li>
              <li style={{ marginTop: 6 }}>
                <NavLink to="/admin/lets-eat-local" className={({isActive}) => isActive ? 'nav-link active subbtn' : 'nav-link subbtn'}>
                  <span style={{ marginRight: 8 }}>🍽️</span>
                  <span>lets eat local</span>
                </NavLink>
              </li>
              <li><NavLink to="/admin/settings" className={({isActive}) => isActive ? 'nav-link active muted' : 'nav-link muted'}>Settings</NavLink></li>
              <li style={{ marginTop: 12 }}>
                <button className="reset-dashboard-btn" onClick={() => setShowResetModal(true)}>Reset Dashboard</button>
              </li>
            </ul>
          </nav>
        </aside>

        {showResetModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>Reset Dashboard</h3>
              <p>Are you sure you want to reset the dashboard? This will zero out all financial and performance figures. Active drivers and riders will NOT be affected.</p>
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', marginBottom: 8, color: '#94a3b8' }}>Enter admin password to confirm</label>
                <input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} type="password" placeholder="Admin password" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: '#0b1220', color: '#e6eef8' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button className="btn" onClick={() => { setShowResetModal(false); setResetPassword(''); }}>Cancel</button>
                <button className="btn danger" onClick={doReset}>Confirm Reset</button>
              </div>
            </div>
          </div>
        )}

        <main className="main-content">
          <Outlet />
        </main>
        <Toast toast={toast} />
      </div>
    </div>
  );
}
