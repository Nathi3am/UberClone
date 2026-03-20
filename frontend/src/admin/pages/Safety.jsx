import React from 'react';

export default function Safety(){
  const alerts = [
    { id:1, type:'SOS', details:'SOS from rider 0x112', time:'2026-02-19 10:12' },
    { id:2, type:'Complaint', details:'Driver reported for reckless driving', time:'2026-02-19 09:54' }
  ];

  return (
    <div>
      <h2>Safety & Reports</h2>
      <div style={{ marginTop:12 }}>
        {alerts.map(a=> (
          <div key={a.id} style={{ background:'rgba(255,255,255,0.02)', padding:12, borderRadius:8, marginBottom:8 }}>
            <div style={{ fontWeight:700 }}>{a.type} <span style={{ color:'#94a3b8', fontWeight:400, marginLeft:8 }}>{a.time}</span></div>
            <div style={{ marginTop:6 }}>{a.details}</div>
            <div style={{ marginTop:8 }}>
              <button style={{ marginRight:8 }}>Investigate</button>
              <button>Warn</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
