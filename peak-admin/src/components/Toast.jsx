import React from 'react';

export default function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.type === 'error' ? '#ef4444' : (toast.type === 'warning' ? '#f59e0b' : '#10b981');
  return (
    <div style={{
      position: 'fixed',
      right: 20,
      bottom: 20,
      zIndex: 99999,
      minWidth: 220,
      padding: '10px 14px',
      borderRadius: 8,
      background: bg,
      color: 'white',
      boxShadow: '0 6px 18px rgba(2,6,23,0.6)'
    }}>
      {toast.msg}
    </div>
  );
}
