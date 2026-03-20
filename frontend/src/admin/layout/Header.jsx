import React, { useContext, useState, useRef, useEffect } from 'react';
import { AdminContext } from '../context/AdminContext';
import theme from '../theme';

const Header = () => {
  const { admin, logout, notifications = [] } = useContext(AdminContext);
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const statusOnline = true;

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: theme.accentGradient }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: theme.colors.textPrimary }}>Peak Admin Console</div>
          <div style={{ fontSize: 12, color: theme.colors.textSecondary }}>{admin ? admin.email : 'Not signed in'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          {notifications && notifications.length > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: theme.colors.danger, color:'#fff', borderRadius: 8, padding: '2px 6px', fontSize: 11 }}>{notifications.length}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: 10, background: statusOnline ? theme.colors.success : theme.colors.danger }} />
          <div style={{ fontSize: 13, color: theme.colors.textSecondary }}>{statusOnline ? 'Online' : 'Maintenance'}</div>
        </div>

        <div ref={ref} style={{ position: 'relative' }}>
          <button onClick={() => setOpen(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 12, background: theme.glass.bg, border: `1px solid ${theme.glass.border}`, color: theme.colors.textPrimary }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: theme.accentGradient }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700 }}>{admin ? admin.name || admin.email : 'Admin'}</div>
              <div style={{ fontSize: 11, color: theme.colors.textSecondary }}>Administrator</div>
            </div>
          </button>

          {open && (
            <div style={{ position: 'absolute', right: 0, marginTop: 8, width: 220, padding: 12, borderRadius: 12, background: theme.glass.bg, backdropFilter: theme.glass.backdropFilter, border: `1px solid ${theme.glass.border}`, boxShadow: '0 8px 34px rgba(2,6,23,0.6)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button style={{ background: 'transparent', border: 'none', color: theme.colors.textPrimary, textAlign: 'left' }}>Profile</button>
                <button style={{ background: 'transparent', border: 'none', color: theme.colors.textPrimary, textAlign: 'left' }}>Settings</button>
                <button onClick={logout} style={{ background: 'transparent', border: 'none', color: theme.colors.danger, textAlign: 'left' }}>Logout</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
