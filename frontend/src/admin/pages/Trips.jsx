import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { getRides, postCancelRide } from '../services/adminApi';

export default function Trips(){
  const [trips, setTrips] = useState([]);

  useEffect(()=>{
    let mounted = true;
    getRides().then(r => { if(mounted) setTrips(r.data || []); }).catch(()=>{});
    return ()=> mounted = false;
  },[]);

  const cancel = async (id) => {
    if (!confirm('Cancel this trip?')) return;
    try { await postCancelRide(id); setTrips(await (await getRides()).data || []); } catch(e){}
  };

  const columns = [
    { key: '_id', title: 'Trip ID' },
    { key: 'captain', title: 'Driver', render: r => r.captain ? (r.captain.fullname ? `${r.captain.fullname.firstname||''} ${r.captain.fullname.lastname||''}` : r.captain.email) : '—' },
    { key: 'user', title: 'Rider', render: r => r.user ? (r.user.fullname ? `${r.user.fullname.firstname||''} ${r.user.fullname.lastname||''}` : r.user.email) : '—' },
    { key: 'distance', title: 'Distance', render: r => (r.distance || 0).toFixed ? `${(r.distance||0).toFixed(2)} km` : (r.distance||0) },
    { key: 'fare', title: 'Fare', render: r => `R ${((r.fare||r.totalFare)||0).toFixed(2)}` },
    { key: 'status', title: 'Status' },
    { key: 'actions', title: 'Actions', render: r => (
      <div style={{ display:'flex', gap:8 }}>
        <button style={{ padding:'6px 8px', borderRadius:6 }} onClick={()=>cancel(r._id)}>Cancel</button>
      </div>
    ) }
  ];

  return (
    <div>
      <h2>Trips</h2>
      <DataTable columns={columns} data={trips} />
    </div>
  );
}
