import React from 'react';

export default function Modal({ open, onClose, title, children }){
  if(!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }}>
      <div style={{ background:'#0b1220', padding:20, borderRadius:8, minWidth:360, color:'#e6eef6' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontWeight:700 }}>{title}</div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#94a3b8' }}>✕</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
