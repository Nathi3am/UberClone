import React, { useEffect, useState } from 'react';
import {
  deleteSpecialTripsDriver,
  getSpecialTripsDrivers,
  patchSpecialTripsDriver,
  postSpecialTripsDriver,
} from '../services/adminApi';

const emptyForm = {
  name: '',
  surname: '',
  plateNumber: '',
  email: '',
  phone: '',
  imageUrl: '',
  hourlyRate: '',
  dayRate: '',
  places: '',
  vehicleType: '',
  vehicleCapacity: '',
};

const inputStyle = {
  padding: '8px 10px',
  borderRadius: 8,
  background: 'transparent',
  border: '1px solid #334155',
  color: '#fff',
};

const buttonStyle = {
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 700,
};

export default function SpecialTripsDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const response = await getSpecialTripsDrivers();
      setDrivers(response.data?.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Failed to load special trips drivers' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, []);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        hourlyRate: Number(form.hourlyRate),
        dayRate: Number(form.dayRate),
        vehicleCapacity: form.vehicleCapacity === '' ? undefined : Number(form.vehicleCapacity),
        places: form.places,
      };
      if (editingId) {
        await patchSpecialTripsDriver(editingId, payload);
        setMessage({ type: 'success', text: 'Special trips driver updated' });
      } else {
        await postSpecialTripsDriver(payload);
        setMessage({ type: 'success', text: 'Special trips driver created' });
      }
      resetForm();
      await loadDrivers();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Failed to save special trips driver' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (driver) => {
    setEditingId(driver._id);
    setForm({
      name: driver.name || '',
      surname: driver.surname || '',
      plateNumber: driver.plateNumber || '',
      email: driver.email || '',
      phone: driver.phone || '',
      imageUrl: driver.imageUrl || '',
      hourlyRate: driver.hourlyRate ?? '',
      dayRate: driver.dayRate ?? '',
      places: Array.isArray(driver.places) ? driver.places.join(', ') : '',
      vehicleType: driver.vehicleType || '',
      vehicleCapacity: driver.vehicleCapacity ?? '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this special trips driver?')) return;
    try {
      await deleteSpecialTripsDriver(id);
      setMessage({ type: 'success', text: 'Special trips driver deleted' });
      if (editingId === id) resetForm();
      await loadDrivers();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.error || 'Failed to delete special trips driver' });
    }
  };

  return (
    <div>
      <h2 style={{ color: '#fff', marginBottom: 16 }}>Special Trips Drivers</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>{editingId ? 'Edit Driver' : 'New Driver'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="First name" style={inputStyle} required />
            <input value={form.surname} onChange={(e) => setField('surname', e.target.value)} placeholder="Surname" style={inputStyle} required />
          </div>
          <input value={form.plateNumber} onChange={(e) => setField('plateNumber', e.target.value)} placeholder="Plate number" style={inputStyle} required />
          <input value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="Email" type="email" style={inputStyle} required />
          <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="Phone" style={inputStyle} required />
          <input value={form.imageUrl} onChange={(e) => setField('imageUrl', e.target.value)} placeholder="Image URL" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input value={form.hourlyRate} onChange={(e) => setField('hourlyRate', e.target.value)} placeholder="Hourly rate" type="number" min="0" style={inputStyle} required />
            <input value={form.dayRate} onChange={(e) => setField('dayRate', e.target.value)} placeholder="Day rate" type="number" min="0" style={inputStyle} required />
          </div>
          <input value={form.vehicleType} onChange={(e) => setField('vehicleType', e.target.value)} placeholder="Vehicle type" style={inputStyle} />
          <input value={form.vehicleCapacity} onChange={(e) => setField('vehicleCapacity', e.target.value)} placeholder="Vehicle capacity" type="number" min="0" style={inputStyle} />
          <textarea value={form.places} onChange={(e) => setField('places', e.target.value)} placeholder="Places served, comma-separated" rows={3} style={inputStyle} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ ...buttonStyle, background: '#10b981', color: '#fff' }} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={resetForm} style={{ ...buttonStyle, background: '#1f2937', color: '#fff' }}>Clear</button>
          </div>
          {message && <div style={{ color: message.type === 'error' ? '#ef4444' : '#10b981' }}>{message.text}</div>}
        </form>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
          <h3 style={{ color: '#fff', marginTop: 0 }}>Existing Drivers</h3>
          {loading ? (
            <div style={{ color: '#cbd5e1' }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {drivers.map((driver) => (
                <div key={driver._id} style={{ display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 84, height: 84, borderRadius: 10, overflow: 'hidden', background: '#0f172a' }}>
                    {driver.imageUrl ? <img src={driver.imageUrl} alt={driver.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700 }}>{driver.name} {driver.surname}</div>
                    <div style={{ color: '#cbd5e1', marginTop: 4 }}>{driver.email} | {driver.phone}</div>
                    <div style={{ color: '#94a3b8', marginTop: 4 }}>Plate: {driver.plateNumber}</div>
                    <div style={{ color: '#94a3b8', marginTop: 4 }}>Vehicle: {driver.vehicleType || '—'} {driver.vehicleCapacity ? `(${driver.vehicleCapacity})` : ''}</div>
                    <div style={{ color: '#cbd5e1', marginTop: 6 }}>Hourly: R{Number(driver.hourlyRate || 0).toFixed(2)} | Daily: R{Number(driver.dayRate || 0).toFixed(2)}</div>
                    <div style={{ color: '#94a3b8', marginTop: 4 }}>Places: {Array.isArray(driver.places) ? driver.places.join(', ') : ''}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button type="button" onClick={() => handleEdit(driver)} style={{ ...buttonStyle, background: '#2563eb', color: '#fff' }}>Edit</button>
                    <button type="button" onClick={() => handleDelete(driver._id)} style={{ ...buttonStyle, background: '#ef4444', color: '#fff' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
