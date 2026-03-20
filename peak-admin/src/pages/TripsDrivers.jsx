import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config/api';

export default function TripsDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', surname: '', plateNumber: '', email: '', phone: '', imageUrl: '', hourlyRate: '', dayRate: '', places: '', vehicleType: '', vehicleCapacity: '' });
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const loadDrivers = () => {
    setLoading(true);
    axios.get(`${API_BASE_URL}/admin/special-trips-drivers`, { headers: authHeaders() })
      .then(res => {
        setDrivers(Array.isArray(res.data?.data) ? res.data.data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load drivers');
        setLoading(false);
      });
  };

  useEffect(() => { loadDrivers(); }, []);

  const openNewForm = () => {
    setForm({ name: '', surname: '', plateNumber: '', email: '', phone: '', imageUrl: '', hourlyRate: '', dayRate: '', places: '', vehicleType: '', vehicleCapacity: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (driver) => {
    setForm({
      name: driver.name || '',
      surname: driver.surname || '',
      plateNumber: driver.plateNumber || '',
      email: driver.email || '',
      phone: driver.phone || '',
      imageUrl: driver.imageUrl || '',
      hourlyRate: driver.hourlyRate || '',
      dayRate: driver.dayRate || '',
      places: Array.isArray(driver.places) ? driver.places.join(', ') : (driver.places || ''),
      vehicleType: driver.vehicleType || '',
      vehicleCapacity: driver.vehicleCapacity ?? ''
    });
    setEditingId(driver._id);
    setShowForm(true);
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    try {
      // You may want to create a dedicated upload endpoint for images
      const res = await axios.post(`${API_BASE_URL}/admin/special-requests/upload`, formData, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.data?.imageUrl;
      if (url) setForm(prev => ({ ...prev, imageUrl: url }));
      else alert('Image uploaded but URL not returned');
    } catch (err) {
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      surname: form.surname.trim(),
      plateNumber: form.plateNumber.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      imageUrl: form.imageUrl.trim(),
      hourlyRate: Number(form.hourlyRate),
      dayRate: Number(form.dayRate),
      places: form.places ? form.places.trim() : '',
      vehicleType: form.vehicleType ? form.vehicleType.trim() : '',
      vehicleCapacity: form.vehicleCapacity !== '' ? Number(form.vehicleCapacity) : undefined
    };
    try {
      if (editingId) {
        await axios.patch(`${API_BASE_URL}/admin/special-trips-drivers/${editingId}`, payload, { headers: authHeaders() });
      } else {
        await axios.post(`${API_BASE_URL}/admin/special-trips-drivers`, payload, { headers: authHeaders() });
      }
      setShowForm(false);
      loadDrivers();
    } catch (err) {
      alert('Failed to save driver');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this driver?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/special-trips-drivers/${id}`, { headers: authHeaders() });
      loadDrivers();
    } catch (err) {
      alert('Failed to delete driver');
    }
  };

  if (loading) return <div style={{color:'#fff'}}>Loading…</div>;
  if (error) return <div style={{color:'#f87171'}}>{error}</div>;

  return (
    <div style={{ padding: 24, color: '#e2e8f0' }}>
      <h2 style={{ fontSize: 26, marginBottom: 16 }}>Trips - Special Drivers</h2>
      <button onClick={openNewForm} style={{ border: 'none', borderRadius: 8, background: '#22c55e', color: '#050b14', fontWeight: 700, padding: '10px 16px', marginBottom: 18 }}>Add New Driver</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {drivers.map(driver => (
          <div key={driver._id || driver.id} style={{ border: '1px solid #334155', borderRadius: 12, padding: 18, background: 'rgba(15,23,42,0.85)' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <img
                src={driver.imageUrl ? (driver.imageUrl.startsWith('http') ? driver.imageUrl : `${API_BASE_URL}${driver.imageUrl}`) : 'https://via.placeholder.com/100?text=No+Img'}
                alt={driver.name || 'Driver'}
                style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, border: '1px solid #64748b' }}
              />
              <div>
                <h3 style={{ margin: 0, fontSize: 20, color: '#fff' }}>{driver.name || 'No Name'}</h3>
                <div style={{ color: '#a5b4fc', fontSize: 15, margin: '4px 0' }}><b>Surname:</b> {driver.surname || '-'}</div>
                <div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Number Plate:</b> {driver.plateNumber || '-'}</div>
                <div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Email:</b> {driver.email || '-'}</div>
                <div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Phone:</b> {driver.phone || '-'}</div>
                <div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Hourly Rate:</b> R{driver.hourlyRate ?? '-'}</div>
                <div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Day Rate:</b> R{driver.dayRate ?? '-'}</div>
                  <div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Vehicle:</b> {driver.vehicleType || '-'} ({driver.vehicleCapacity ?? '-'})</div>
                <div style={{ color: '#a5b4fc', fontSize: 15, marginTop: 6 }}><b>Places:</b> {Array.isArray(driver.places) ? driver.places.join(', ') : (driver.places || '-')}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditForm(driver)} style={{ border: 'none', borderRadius: 8, background: '#f59e0b', color: '#0f172a', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => handleDelete(driver._id)} style={{ border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }} onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(96vw, 480px)', background: '#0f172a', borderRadius: 14, border: '1px solid rgba(148,163,184,0.4)', padding: 20 }}>
            <h2 style={{ margin: 0, color: '#22c55e' }}>{editingId ? 'Edit' : 'Add'} Special Trips Driver</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <input placeholder="Name" value={form.name} onChange={e => handleFormChange('name', e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <input placeholder="Surname" value={form.surname} onChange={e => handleFormChange('surname', e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <input placeholder="Number Plate" value={form.plateNumber} onChange={e => handleFormChange('plateNumber', e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <input placeholder="Email" value={form.email} onChange={e => handleFormChange('email', e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <input placeholder="Phone" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <input placeholder="Hourly Rate" value={form.hourlyRate} onChange={e => handleFormChange('hourlyRate', e.target.value)} type="number" style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <input placeholder="Day Rate" value={form.dayRate} onChange={e => handleFormChange('dayRate', e.target.value)} type="number" style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <input placeholder="Places (comma separated)" value={form.places} onChange={e => handleFormChange('places', e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0', gridColumn: '1 / -1' }} />
              <input placeholder="Vehicle Type" value={form.vehicleType} onChange={e => handleFormChange('vehicleType', e.target.value)} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <input placeholder="Vehicle Capacity" value={form.vehicleCapacity} onChange={e => handleFormChange('vehicleCapacity', e.target.value)} type="number" style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: '#cbd5e1', fontSize: 12 }}>Upload Image</label>
                <input type="file" accept="image/png, image/jpeg" onChange={handleImageUpload} style={{ padding: 6, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }} />
                {uploading && <span style={{ color: '#9ca3af', fontSize: 12 }}>Uploading image...</span>}
                {form.imageUrl && (
                  <div style={{ position: 'relative', width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginTop: 8, border: '1px solid rgba(148,163,184,0.4)' }}>
                    <img src={form.imageUrl.startsWith('http') ? form.imageUrl : `${API_BASE_URL}${form.imageUrl}`} alt="item" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button onClick={handleSave} style={{ border: 'none', borderRadius: 8, background: '#22c55e', color: '#050b14', fontWeight: 700, padding: '8px 16px', cursor: 'pointer' }}>{editingId ? 'Save Changes' : 'Add Driver'}</button>
              <button onClick={() => setShowForm(false)} style={{ border: '1px solid rgba(148,163,184,0.6)', borderRadius: 8, background: 'transparent', color: '#94a3b8', fontWeight: 700, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
