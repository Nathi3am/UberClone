import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Earnings(){
  const [earnings,setEarnings] = useState(null)
  useEffect(()=>{
    const token = localStorage.getItem('token')
    axios.get('http://localhost:4000/admin/earnings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r=>setEarnings(r.data))
      .catch(()=>{})
  },[])

  if(!earnings) return <div style={{padding:20}}>Loading...</div>
  return (
    <div style={{padding:20}}>
      <h2>Earnings</h2>
      <div>Total Earnings: R{(earnings.totalEarnings||0).toFixed(2)}</div>
      <div>Today's Earnings: R{(earnings.todaysEarnings||0).toFixed(2)}</div>
      <div>Total Commission: R{(earnings.totalCommission||0).toFixed(2)}</div>
    </div>
  )
}
