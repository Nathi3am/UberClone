import React from 'react';

export default function MapView({ center }){
  // Placeholder map view. Integrate Google Maps or Mapbox client-side if API keys available.
  return (
    <div style={{ width:'100%', height:300, borderRadius:8, overflow:'hidden', background:'linear-gradient(180deg,#0b1220,#071018)', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8' }}>
      <div>Map preview {center ? `(${center.lat}, ${center.lng})` : ''}</div>
    </div>
  );
}
