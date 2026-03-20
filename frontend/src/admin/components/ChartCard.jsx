import React from 'react';

export default function ChartCard({ title, data = [] }){
  // simple bar chart using inline SVG
  const max = Math.max(1, ...data.map(d=>d.value||0));
  const w = 500; const h = 140; const padding = 12; const barW = Math.max(8, (w - padding*2) / Math.max(1,data.length) - 6);

  return (
    <div style={{ background:'rgba(255,255,255,0.03)', padding:12, borderRadius:8 }}>
      <div style={{ fontSize:13, color:'#94a3b8', marginBottom:8 }}>{title}</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ display:'block' }}>
        {data.map((d,i)=>{
          const x = padding + i*(barW+6);
          const barH = (d.value||0)/max * (h - padding*2);
          return (
            <g key={i}>
              <rect x={x} y={h-padding-barH} width={barW} height={barH} fill="#0ea5e9" rx={4} />
              <text x={x + barW/2} y={h-4} fontSize={10} fill="#94a3b8" textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
