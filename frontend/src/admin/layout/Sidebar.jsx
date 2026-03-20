import React, { useState, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import theme from '../theme';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { AdminContext } from '../context/AdminContext';
// lightweight toast implemented locally

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [toast, setToast] = useState(null);
  const { token } = useContext(AdminContext) || {};
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'drivers', label: 'Drivers', icon: '🚗' },
    { id: 'riders', label: 'Riders', icon: '👥' },
    { id: 'rides', label: 'Trips', icon: '🗺️' },
    { id: 'special-trips-drivers', label: 'Special Trips', icon: '🚚' },
    { id: 'special-requests', label: 'Special Requests', icon: '📦' },
    { id: 'finance', label: 'Financials', icon: '💳' },
    { id: 'pricing', label: 'Pricing', icon: '⚖️' },
    { id: 'promo', label: 'Promos', icon: '🏷️' },
    { id: 'safety', label: 'Safety', icon: '🛡️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <aside
      style={{
        width: collapsed ? 72 : 260,
        transition: 'width 220ms ease',
        padding: 20,
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: theme.glass.bg,
        backdropFilter: theme.glass.backdropFilter,
        borderRight: `1px solid ${theme.glass.border}`,
        color: theme.colors.textSecondary
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: theme.accentGradient }} />
          {!collapsed && <div style={{ fontWeight: 800, color: theme.colors.textPrimary, fontSize: 18 }}>Peak Admin</div>}
          <button onClick={() => setCollapsed(s => !s)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: theme.colors.textSecondary, cursor: 'pointer' }} aria-label="Toggle sidebar">{collapsed ? '➡️' : '⬅️'}</button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {links.map(l => {
            // Render Settings as a button that navigates so it behaves like an explicit action
            if (l.id === 'settings') return null; // render after nav links so it's visually separate
            return (
              <NavLink
                key={l.id}
                to={`/admin/${l.id}`}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary,
                  boxShadow: isActive ? `0 6px 18px ${theme.colors.accent}33` : 'none',
                  background: isActive ? theme.glow : 'transparent',
                  transition: 'all 180ms ease'
                })}
              >
                <div style={{ width: 28, textAlign: 'center' }}>{l.icon}</div>
                {!collapsed && <div style={{ fontWeight: 700, letterSpacing: 0.6 }}>{l.label}</div>}
              </NavLink>
            );
          })}

          {/* Settings button rendered separately */}
          <SidebarSettingsButton collapsed={collapsed} />
        </nav>
      </div>

      <div style={{ marginTop: 20 }}>
        {/* Reset Dashboard button placed below nav links, above logout */}
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => setShowResetModal(true)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid rgba(239,68,68,0.14)`,
              background: 'rgba(239,68,68,0.06)',
              color: '#fee2e2',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {!collapsed ? 'Reset Dashboard' : '⚠️'}
          </button>
        </div>

        <NavLink to="/admin/login" style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.colors.textSecondary, textDecoration: 'none' }} onClick={() => localStorage.removeItem('admin_token')}>
          <span style={{ fontSize: 18 }}>🔒</span>
          {!collapsed && <span>Logout</span>}
        </NavLink>
      </div>

      {showResetModal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.6)', zIndex: 1200 }}>
          <div style={{ background: theme.glass.bg, color: theme.colors.textPrimary, padding: 20, borderRadius: 10, width: 480 }}>
            <h3 style={{ marginBottom: 8 }}>Reset Dashboard</h3>
            <p style={{ color: theme.colors.textSecondary }}>Are you sure you want to reset the dashboard? This will zero out all financial and performance figures. Active drivers and riders will NOT be affected.</p>
            <div style={{ marginTop: 12 }}>
              <label style={{ display: 'block', color: theme.colors.textSecondary, marginBottom: 8 }}>Enter admin password to confirm</label>
              <input autoFocus value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} type="password" placeholder="Admin password" style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #334155', background: theme.glass.bg, color: theme.colors.textPrimary }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button onClick={() => { setShowResetModal(false); setResetPassword(''); }} style={{ padding: '8px 10px', borderRadius: 8, background: '#111827', color: theme.colors.textPrimary, border: '1px solid #243042' }}>Cancel</button>
              <button onClick={async () => {
                try {
                  if (!resetPassword || resetPassword.trim().length === 0) {
                    setToast({ msg: 'Please enter admin password', type: 'error' });
                    setTimeout(() => setToast(null), 2500);
                    return;
                  }
                  const authToken = token || localStorage.getItem('token') || localStorage.getItem('admin_token');
                  await axios.post(`${API_BASE_URL}/admin/reset-dashboard`, { password: resetPassword }, { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
                  setShowResetModal(false);
                  setResetPassword('');
                  setToast({ msg: 'Dashboard reset successfully' });
                  setTimeout(() => setToast(null), 3000);
                } catch (e) {
                  console.error('reset error', e);
                  const msg = (e && e.response && e.response.data && e.response.data.message) ? e.response.data.message : 'Failed to reset dashboard';
                  setToast({ msg, type: 'error' });
                  setTimeout(() => setToast(null), 3000);
                }
              }} style={{ padding: '8px 10px', borderRadius: 8, background: '#ef4444', color: '#fff', border: '1px solid #ef4444' }}>Confirm Reset</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, background: toast.type === 'error' ? '#ef4444' : '#10b981', color: '#fff', padding: '10px 14px', borderRadius: 8, zIndex: 2000 }}>
          {toast.msg}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;

function SidebarSettingsButton({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === '/admin/settings' || location.pathname === '/admin/settings/';

  return (
    <button
      onClick={() => navigate('/admin/settings')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 12,
        width: '100%',
        textAlign: 'left',
        background: isActive ? theme.glow : 'transparent',
        color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary,
        border: 'none',
        cursor: 'pointer'
      }}
    >
      <div style={{ width: 28, textAlign: 'center' }}>⚙️</div>
      {!collapsed && <div style={{ fontWeight: 700, letterSpacing: 0.6 }}>Settings</div>}
    </button>
  );
}
