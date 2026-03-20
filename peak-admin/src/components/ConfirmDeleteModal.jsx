import React from 'react';

export default function ConfirmDeleteModal({ show, title = 'Confirm Delete', message, password, setPassword, error, loading, onCancel, onConfirm }) {
  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 420, background: '#0b0b0f', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ marginBottom: 8, fontFamily: 'Syne, sans-serif' }}>{title}</h3>
        {message && <p style={{ color: '#9ca3ff', marginBottom: 12 }}>{message}</p>}
        <input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8, background: '#07070a', color: '#e8e8f0' }} />
        {error && <div style={{ color: '#ffb4b4', marginBottom: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#9ca3ff', padding: '8px 12px', borderRadius: 8 }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#ef4444', color: 'white' }}>{loading ? 'Deleting…' : 'Confirm Delete'}</button>
        </div>
      </div>
    </div>
  );
}
