import React, { useEffect, useState } from 'react';
import { getStats } from '../services/adminApi';
import ChartCard from '../components/ChartCard';

export default function Finance(){
  const [stats, setStats] = useState(null);

  useEffect(()=>{
    let mounted = true;
    getStats().then(r=>{ if(mounted) setStats(r.data || {}); }).catch(()=>{});
    return ()=> mounted = false;
  },[]);

  if(!stats) return <div style={{ color:'#cbd5e1' }}>Loading finance...</div>;

  const revenueSeries = [
    { label: 'Mon', value: (stats.monRevenue||1000) },
    { label: 'Tue', value: (stats.tueRevenue||1800) },
    { label: 'Wed', value: (stats.wedRevenue||1400) },
    { label: 'Thu', value: (stats.thuRevenue||2100) },
    { label: 'Fri', value: (stats.friRevenue||2400) },
    { label: 'Sat', value: (stats.satRevenue||3000) },
    { label: 'Sun', value: (stats.sunRevenue||1900) }
  ];

  return (
    <div>
      <h2>Finance</h2>
      <div style={{ display:'flex', gap:16, marginTop:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ background:'rgba(255,255,255,0.03)', padding:16, borderRadius:8 }}>
            <div style={{ color:'#94a3b8' }}>Total Revenue</div>
            <div style={{ fontSize:24, fontWeight:700 }}>R {(stats.totalRevenue||0).toFixed ? (stats.totalRevenue||0).toFixed(2) : (stats.totalRevenue||0)}</div>
          </div>
        </div>
        <div style={{ flex:2 }}>
          <ChartCard title="Revenue (Last 7 days)" data={revenueSeries} />
        </div>
      </div>
    </div>
  );
}
