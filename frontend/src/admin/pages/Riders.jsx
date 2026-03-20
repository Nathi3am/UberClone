import React, { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import { getUsers } from '../services/adminApi';

export default function Riders(){
  const [riders, setRiders] = useState([]);

  useEffect(()=>{
    let mounted = true;
    getUsers().then(r => { if(mounted) setRiders(r.data || []); }).catch(()=>{});
    return ()=> mounted = false;
  },[]);

  const columns = [
    { key: '_id', title: 'Rider ID' },
    { key: 'fullname', title: 'Name', render: r => (r.fullname ? `${r.fullname.firstname || ''} ${r.fullname.lastname || ''}`.trim() : r.email) },
    { key: 'phone', title: 'Phone' },
    { key: 'email', title: 'Email' },
    { key: 'trips', title: 'Trips', render: r => r.totalRides || 0 },
    { key: 'spent', title: 'Total Spent', render: r => `R${(r.totalSpent||0).toFixed ? (r.totalSpent||0).toFixed(2) : (r.totalSpent||0)}` },
    { key: 'rating', title: 'Avg Rating', render: r => r.avgRating || '—' },
    { key: 'status', title: 'Status', render: r => r.suspended ? 'Banned' : 'Active' }
  ];

  return (
    <div>
      <h2>Riders</h2>
      <DataTable columns={columns} data={riders} />
    </div>
  );
}
