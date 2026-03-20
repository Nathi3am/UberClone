import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { useParams, Link } from 'react-router-dom'
import API_BASE_URL from '../config/api';

export default function DriverDetails(){
  const { driverId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{
    let mounted = true
    async function load(){
      setLoading(true)
      setError(null)
      try{
        const token = localStorage.getItem('token')
        const res = await axios.get(`${API_BASE_URL}/admin/driver/${driverId}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        if(!mounted) return
        setData(res.data)
      }catch(e){
        if(!mounted) return
        setError('Unable to load driver')
      }finally{ if(mounted) setLoading(false) }
    }
    load()
    return ()=>{ mounted = false }
  },[driverId])

  // Subscribe to admin socket owed updates to refresh displayed owed amount in real time
  const { socket } = useContext(require('../context/SocketContext'));
  useEffect(() => {
    if (!socket) return;
    const h = (payload) => {
      try {
        if (!payload) return;
        if (payload.driverId && payload.driverId === driverId) {
          // update owedToPlatform shown in this view
          setData((prev) => ({ ...(prev||{}), owedToPlatform: Number(payload.owedToPlatform || 0), driverPayout: (typeof payload.driverPayout !== 'undefined') ? Number(payload.driverPayout) : undefined }));
        }
      } catch (e) {}
    };
    socket.on('owed-updated', h);
    return () => socket.off('owed-updated', h);
  }, [socket, driverId]);

  if(loading) return <div style={{padding:20}}>Loading driver…</div>
  if(error) return <div style={{padding:20,color:'salmon'}}>{error}</div>
  if(!data) return <div style={{padding:20}}>No data</div>

  const { driver, totalTrips, totalEarnings, declinedRequests, owedToPlatform } = data

  return (
    <div style={{padding:20}}>
      <Link to="/admin/drivers">← Back to drivers</Link>
      <h2 style={{marginTop:8}}>{driver.fullname?.firstname || driver.email}</h2>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:12}}>
        <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:8}}>
          <h3>Profile</h3>
          <p><strong>Email:</strong> {driver.email}</p>
          <p><strong>Phone:</strong> {driver.phone || '—'}</p>
          <p><strong>Rating:</strong> {driver.rating?.toFixed ? driver.rating.toFixed(1) : (driver.rating ?? '—')}</p>
          <p><strong>Online:</strong> {driver.isOnline ? 'Yes' : 'No'}</p>
        </div>

        <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:8}}>
          <h3>Vehicle</h3>
          <p><strong>Type:</strong> {driver.vehicle?.vehicleType || '—'}</p>
          <p><strong>Brand:</strong> {driver.vehicle?.brand || '—'}</p>
          <p><strong>Model:</strong> {driver.vehicle?.model || '—'}</p>
          <p><strong>Plate:</strong> {driver.vehicle?.plate || '—'}</p>
        </div>
      </div>

      <div style={{display:'flex',gap:12,marginTop:16}}>
        <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:8,minWidth:160}}>
          <h4>Total Trips</h4>
          <div style={{fontSize:20,fontWeight:700}}>{totalTrips ?? 0}</div>
        </div>
        <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:8,minWidth:160}}>
          <h4>Total Earnings</h4>
          <div style={{fontSize:20,fontWeight:700}}>R{Number(totalEarnings ?? 0).toFixed(2)}</div>
        </div>
        <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:8,minWidth:160}}>
          <h4>Owed to Platform</h4>
          <div style={{fontSize:20,fontWeight:700,color:'#ff6b6b'}}>R{Number(owedToPlatform ?? 0).toFixed(2)}</div>
        </div>
        <div style={{padding:12,background:'rgba(255,255,255,0.03)',borderRadius:8,minWidth:160}}>
          <h4>Declined Requests</h4>
          <div style={{fontSize:20,fontWeight:700}}>{declinedRequests ?? 0}</div>
        </div>
      </div>

    </div>
  )
}
