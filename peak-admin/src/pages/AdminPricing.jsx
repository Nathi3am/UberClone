import React, { useEffect, useState } from "react";
import axios from "axios";

export default function AdminPricing(){
  const [pricePerKm, setPricePerKm] = useState('');
  const [baseFare, setBaseFare] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:4000/admin/pricing', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (cancelled) return;
        const payload = res && res.data ? res.data : {};
        setPricePerKm((payload.pricePerKm !== undefined && payload.pricePerKm !== null) ? String(payload.pricePerKm) : '');
        setBaseFare((payload.baseFare !== undefined && payload.baseFare !== null) ? String(payload.baseFare) : '');
      } catch (e) {
        console.error('Failed to load pricing', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  },[])

  const updatePrice = async () => {
    try{
      setLoading(true)
      const token = localStorage.getItem('token')
      await axios.patch('http://localhost:4000/admin/pricing', { pricePerKm: Number(pricePerKm), baseFare: Number(baseFare) }, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      alert('Price updated successfully')
    }catch(e){
      console.error('update failed', e)
      alert('Failed to update pricing')
    }finally{ setLoading(false) }
  }

  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h1>Pricing Settings</h1>

      <div style={{
        background: "rgba(255,255,255,0.05)",
        padding: "20px",
        borderRadius: "12px",
        width: "320px"
      }}>
        <label>Price Per KM (R)</label>
        <input
          type="number"
          value={pricePerKm}
          onChange={(e) => setPricePerKm(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "10px",
            borderRadius: "8px",
            border: "none"
          }}
        />

        <label style={{marginTop:12, display:'block'}}>Base Fare (R)</label>
        <input
          type="number"
          value={baseFare}
          onChange={(e) => setBaseFare(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "10px",
            borderRadius: "8px",
            border: "none"
          }}
        />

        <button
          onClick={updatePrice}
          disabled={loading}
          style={{
            marginTop: "15px",
            background: "#3b82f6",
            color: "white",
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            width: "100%"
          }}
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
