import React, { useEffect, useState, useContext } from 'react'
import axios from 'axios'
import { SocketContext } from '../context/SocketContext'

export default function DeletedProfiles(){
  const [loading, setLoading] = useState(true)
  const [audits, setAudits] = useState([])
  const [error, setError] = useState(null)

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const { socket } = useContext(SocketContext)
  const { clearDeletedCount } = useContext(SocketContext)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const res = await axios.get('http://localhost:4000/admin/audits?limit=200', { headers: getAuthHeaders() })
        if (!mounted) return
        setAudits(res.data.audits || [])
      } catch (e) {
        setError('Unable to load deleted profiles')
      }
      if (mounted) setLoading(false)
    }
    load()
    // clear badge when viewing page
    try { if (clearDeletedCount) clearDeletedCount(); } catch (e) {}

    // listen for real-time audit events
    const onAudit = (payload) => {
      try {
        if (!payload) return
        setAudits((prev) => [payload, ...prev])
      } catch (e) {}
    }
    if (socket) socket.on('audit-created', onAudit)

    // also listen for local in-page audit events (dispatched after a delete response)
    const onLocalAudit = (ev) => {
      try {
        const payload = ev && ev.detail ? ev.detail : null
        if (!payload) return
        setAudits((prev) => [payload, ...prev])
      } catch (e) {}
    }
    window.addEventListener('local-audit-created', onLocalAudit)

    return () => {
      mounted = false
      try { if (socket) socket.off('audit-created', onAudit) } catch (e) {}
      try { window.removeEventListener('local-audit-created', onLocalAudit) } catch (e) {}
    }
  }, [socket])

  const drivers = audits.filter(a => a.targetType === 'captain' || a.action === 'delete_driver')
  const users = audits.filter(a => a.targetType === 'user' || a.action === 'delete_user')

  return (
    <div style={{ padding: 32, fontFamily: 'DM Sans, sans-serif', color: '#e8e8f0' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', marginBottom: 12 }}>Deleted Profiles</h2>
      <p style={{ color: '#9ca3ff', marginBottom: 18 }}>List of deleted driver and user profiles recorded by admin actions.</p>

      {loading && (<div>Loading…</div>)}
      {error && (<div style={{ color: '#ffb4b4' }}>{error}</div>)}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
            <h3 style={{ marginBottom: 12 }}>Drivers</h3>
            {drivers.length === 0 && <div style={{ color: '#9090b0' }}>No deleted driver profiles found.</div>}
            {drivers.map((d) => (
              <div key={d._id} style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontWeight: 700 }}>{d.targetEmail || '—'}</div>
                <div style={{ color: '#9ca3ff', fontSize: 13 }}>Deleted by: {d.actorEmail || 'admin'}</div>
                <div style={{ color: '#9ca3ff', fontSize: 12 }}>{new Date(d.createdAt).toLocaleString()}</div>
                {d.meta && <div style={{ color: '#c0c0d8', marginTop: 6 }}>Meta: {JSON.stringify(d.meta)}</div>}
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12 }}>
            <h3 style={{ marginBottom: 12 }}>Users</h3>
            {users.length === 0 && <div style={{ color: '#9090b0' }}>No deleted user profiles found.</div>}
            {users.map((d) => (
              <div key={d._id} style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontWeight: 700 }}>{d.targetEmail || '—'}</div>
                <div style={{ color: '#9ca3ff', fontSize: 13 }}>Deleted by: {d.actorEmail || 'admin'}</div>
                <div style={{ color: '#9ca3ff', fontSize: 12 }}>{new Date(d.createdAt).toLocaleString()}</div>
                {d.meta && <div style={{ color: '#c0c0d8', marginTop: 6 }}>Meta: {JSON.stringify(d.meta)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
