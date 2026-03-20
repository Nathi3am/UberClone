import React, { useEffect, useMemo, useState } from 'react';
import API_BASE_URL from '../../config/api';
import {
  deleteSpecialRequest,
  getSpecialRequests,
  patchSpecialRequest,
  postSpecialRequest,
  uploadSpecialRequestImage,
} from '../services/adminApi';

const emptyForm = {
  name: '',
  description: '',
  hourly: '',
  daily: '',
  availableIn: 'Immediately',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  imageUrl: '',
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

function getImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) return imageUrl;
  return imageUrl.startsWith('/') ? `${API_BASE_URL}${imageUrl}` : `${API_BASE_URL}/${imageUrl}`;
}

export default function SpecialRequests() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const previewUrl = useMemo(() => getImageUrl(form.imageUrl), [form.imageUrl]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await getSpecialRequests();
      setItems(response.data?.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Failed to load special requests' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImageFile(null);
  };

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleUpload = async () => {
    if (!imageFile) return;
    try {
      setSaving(true);
      const response = await uploadSpecialRequestImage(imageFile);
      const imageUrl = response.data?.data?.imageUrl || '';
      setField('imageUrl', imageUrl);
      setMessage({ type: 'success', text: 'Image uploaded successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Image upload failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        hourly: Number(form.hourly),
        daily: Number(form.daily),
      };
      if (editingId) {
        await patchSpecialRequest(editingId, payload);
        setMessage({ type: 'success', text: 'Special request updated' });
      } else {
        await postSpecialRequest(payload);
        setMessage({ type: 'success', text: 'Special request created' });
      }
      resetForm();
      await loadItems();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Failed to save special request' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      hourly: item.hourly ?? '',
      daily: item.daily ?? '',
      availableIn: item.availableIn || 'Immediately',
      contactName: item.contactName || '',
      contactPhone: item.contactPhone || '',
      contactEmail: item.contactEmail || '',
      imageUrl: item.imageUrl || '',
    });
    setImageFile(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this special request?')) return;
    try {
      await deleteSpecialRequest(id);
      setMessage({ type: 'success', text: 'Special request deleted' });
      if (editingId === id) resetForm();
      await loadItems();
    } catch (error) {
      setMessage({ type: 'error', text: error?.response?.data?.message || 'Failed to delete special request' });
    }
  };

  return (
    <div>
      <h2 style={{ color: '#fff', marginBottom: 16 }}>Special Requests</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 20 }}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
          <h3 style={{ color: '#fff', margin: 0 }}>{editingId ? 'Edit Request' : 'New Request'}</h3>
          <input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Name" style={inputStyle} required />
          <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Description" rows={4} style={inputStyle} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input value={form.hourly} onChange={(e) => setField('hourly', e.target.value)} placeholder="Hourly rate" type="number" min="0" style={inputStyle} required />
            <input value={form.daily} onChange={(e) => setField('daily', e.target.value)} placeholder="Daily rate" type="number" min="0" style={inputStyle} required />
          </div>
          <input value={form.availableIn} onChange={(e) => setField('availableIn', e.target.value)} placeholder="Available in" style={inputStyle} />
          <input value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} placeholder="Contact name" style={inputStyle} />
          <input value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} placeholder="Contact phone" style={inputStyle} />
          <input value={form.contactEmail} onChange={(e) => setField('contactEmail', e.target.value)} placeholder="Contact email" style={inputStyle} />
          <input value={form.imageUrl} onChange={(e) => setField('imageUrl', e.target.value)} placeholder="Image URL" style={inputStyle} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} style={{ color: '#cbd5e1' }} />
            <button type="button" onClick={handleUpload} style={{ ...buttonStyle, background: '#2563eb', color: '#fff' }} disabled={!imageFile || saving}>Upload</button>
          </div>
          {previewUrl && (
            <img src={previewUrl} alt="preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }} />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" style={{ ...buttonStyle, background: '#10b981', color: '#fff' }} disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={resetForm} style={{ ...buttonStyle, background: '#1f2937', color: '#fff' }}>Clear</button>
          </div>
          {message && <div style={{ color: message.type === 'error' ? '#ef4444' : '#10b981' }}>{message.text}</div>}
        </form>

        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
          <h3 style={{ color: '#fff', marginTop: 0 }}>Existing Requests</h3>
          {loading ? (
            <div style={{ color: '#cbd5e1' }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {items.map((item) => (
                <div key={item._id} style={{ display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 96, height: 96, borderRadius: 10, overflow: 'hidden', background: '#0f172a' }}>
                    {item.imageUrl ? <img src={getImageUrl(item.imageUrl)} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>{item.description}</div>
                    <div style={{ color: '#cbd5e1', marginTop: 8 }}>Hourly: R{Number(item.hourly || 0).toFixed(2)} | Daily: R{Number(item.daily || 0).toFixed(2)}</div>
                    <div style={{ color: '#94a3b8', marginTop: 4 }}>{item.availableIn || 'Immediately'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button type="button" onClick={() => handleEdit(item)} style={{ ...buttonStyle, background: '#2563eb', color: '#fff' }}>Edit</button>
                    <button type="button" onClick={() => handleDelete(item._id)} style={{ ...buttonStyle, background: '#ef4444', color: '#fff' }}>Delete</button>
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
