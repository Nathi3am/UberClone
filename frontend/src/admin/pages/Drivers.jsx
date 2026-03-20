import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { getDrivers, postSuspendDriver } from '../services/adminApi';

export default function Drivers(){
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    let mounted = true;
    getDrivers().then(r=>{
      if (!mounted) return;
      // API may return { drivers: [...], totalPages, currentPage } or an array directly
      const list = (r && r.data && (Array.isArray(r.data) ? r.data : (r.data.drivers || []))) || [];
      setDrivers(list);
    }).catch(()=>{});
    return ()=> mounted=false;
  },[]);

  const columns = [
    { key: 'totalTrips', title: 'Trips Completed', render: d => (typeof d.totalTrips === 'number' ? d.totalTrips : (d.totalTrips || 0)) },
    { key: '_id', title: 'Driver ID' },
    { key: 'fullname', title: 'Name', render: d => (d.fullname ? `${d.fullname.firstname || ''} ${d.fullname.lastname || ''}` : d.email) },
    { key: 'phone', title: 'Phone' },
    { key: 'vehicle', title: 'Vehicle', render: d => (d.vehicle && d.vehicle.plate) ? d.vehicle.plate : (d.vehicle || '—') },
    { key: 'rating', title: 'Rating', render: d => d.rating || '—' },
    { key: 'status', title: 'Status', render: d => d.suspended ? 'Suspended' : 'Active' },
    { key: 'actions', title: 'Actions', render: d => (
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => { postSuspendDriver(d._id).then(()=>window.location.reload()); }} style={{ padding: '6px 8px', borderRadius:6, background:'#ef4444', color:'#fff', border:'none' }}>Suspend</button>
      </div>
    )}
  ];

  return (
    <div>
      <h2>Drivers</h2>
      <DataTable columns={columns} data={drivers} />
    </div>
  );
}
