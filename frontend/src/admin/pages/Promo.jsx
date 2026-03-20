import React, { useEffect, useState } from 'react';

export default function Promo(){
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState({ code:'', pct:0, amount:0, expiry:'', limit:0, enabled:true });

  useEffect(()=>{
    const saved = localStorage.getItem('admin_promos');
    if(saved) setPromos(JSON.parse(saved));
  },[]);

  const save = ()=>{
    const next = [{...form, id: Date.now()}, ...promos];
    setPromos(next); localStorage.setItem('admin_promos', JSON.stringify(next));
    setForm({ code:'', pct:0, amount:0, expiry:'', limit:0, enabled:true });
  };

  return (
    <div>
      <h2>Promotions</h2>
      <div style={{ maxWidth:700, marginTop:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <input placeholder="Code" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} />
          <input placeholder="Discount %" value={form.pct} onChange={e=>setForm({...form, pct:Number(e.target.value)})} />
          <input placeholder="Fixed Amount" value={form.amount} onChange={e=>setForm({...form, amount:Number(e.target.value)})} />
          <input type="date" value={form.expiry} onChange={e=>setForm({...form, expiry:e.target.value})} />
          <input placeholder="Usage Limit" value={form.limit} onChange={e=>setForm({...form, limit:Number(e.target.value)})} />
          <label><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form, enabled:e.target.checked})} /> Enabled</label>
        </div>
        <div style={{ marginTop:12 }}><button onClick={save} style={{ padding:'8px 12px' }}>Create Promo</button></div>

        <h3 style={{ marginTop:20 }}>Existing Promos</h3>
        <table style={{ width:'100%', marginTop:8 }}>
          <thead><tr><th>Code</th><th>Disc %</th><th>Amount</th><th>Expiry</th><th>Enabled</th></tr></thead>
          <tbody>
            {promos.map(p=> (<tr key={p.id}><td>{p.code}</td><td>{p.pct}</td><td>{p.amount}</td><td>{p.expiry}</td><td>{p.enabled? 'Yes':'No'}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
