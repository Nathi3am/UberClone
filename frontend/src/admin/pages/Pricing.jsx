import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';

export default function Pricing(){
  const [form, setForm] = useState({ baseFare: 5, perKm: 2, perMin: 0.5, surge: 1.0, commission: 20, cancellation: 10 });
  const API = API_BASE_URL;

  useEffect(()=>{
    const saved = localStorage.getItem('admin_pricing');
    if(saved) setForm(JSON.parse(saved));
    // fetch server-side pricing (including commissionRate)
    const token = localStorage.getItem('token');
    axios.get(`${API}/admin/pricing`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const data = res.data || {};
        setForm(prev => ({
          ...prev,
          baseFare: (typeof data.baseFare === 'number') ? data.baseFare : prev.baseFare,
          perKm: (typeof data.pricePerKm === 'number') ? data.pricePerKm : prev.perKm,
          commission: (typeof data.commissionRate === 'number') ? data.commissionRate : prev.commission
        }));
      })
      .catch(()=>{});
  },[]);

  const save = async ()=>{
    try{
      // persist locally as before
      localStorage.setItem('admin_pricing', JSON.stringify(form));

      // send relevant pricing fields to server
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/admin/pricing`, {
        pricePerKm: Number(form.perKm),
        baseFare: Number(form.baseFare),
        commissionRate: Number(form.commission)
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert('Pricing saved');
    }catch(e){
      console.error('Failed saving pricing', e);
      alert('Failed saving pricing');
    }
  };

  return (
    <div>
      <h2>Pricing Settings</h2>
      <div style={{ maxWidth:600, marginTop:12, display:'grid', gap:12 }}>
        <label>Base Fare<input value={form.baseFare} onChange={e=>setForm({...form, baseFare: Number(e.target.value)})} /></label>
        <label>Price Per KM<input value={form.perKm} onChange={e=>setForm({...form, perKm: Number(e.target.value)})} /></label>
        <label>Price Per Minute<input value={form.perMin} onChange={e=>setForm({...form, perMin: Number(e.target.value)})} /></label>
        <label>Surge Multiplier<input value={form.surge} onChange={e=>setForm({...form, surge: Number(e.target.value)})} /></label>
        <label>Commission %<input value={form.commission} onChange={e=>setForm({...form, commission: Number(e.target.value)})} /></label>
        <label>Cancellation Fee<input value={form.cancellation} onChange={e=>setForm({...form, cancellation: Number(e.target.value)})} /></label>
        <div><button onClick={save} style={{ padding:'8px 12px' }}>Save</button></div>
      </div>
    </div>
  );
}
