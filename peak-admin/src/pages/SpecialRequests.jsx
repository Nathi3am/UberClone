import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

export default function SpecialRequests () {
  const [items, setItems] = useState([]);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [formState, setFormState] = useState({ name: '', description: '', hourly: '', daily: '', imageUrl: '', availableIn: 'Immediately', contactName: '', contactPhone: '', contactEmail: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadItems = async (editId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/special-requests`, { headers: authHeaders() });
      const list = res.data?.data || [];
      setItems(list);

      if (editId) {
        const match = Array.isArray(list) ? list.find((item) => (item._id || item.id) === editId) : null;
        if (match) {
          openEditForm(match);
        }
      }
    } catch (error) {
      console.error('Failed to load special requests', error);
      alert('Unable to load special requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    loadItems(editId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNewForm = () => {
    setItemToEdit(null);
    setFormState({ name: '', description: '', hourly: '', daily: '', imageUrl: '', availableIn: 'Immediately', contactName: '', contactPhone: '', contactEmail: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setItemToEdit(item);
    setFormState({
      name: item.name,
      description: item.description,
      hourly: item.hourly,
      daily: item.daily,
      imageUrl: item.imageUrl || '',
      availableIn: item.availableIn || 'Immediately',
      contactName: item.contactName || '',
      contactPhone: item.contactPhone || '',
      contactEmail: item.contactEmail || ''
    });
    setIsFormOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingImage(true);
      const res = await axios.post(`${API_BASE_URL}/admin/special-requests/upload`, formData, {
        headers: {
          ...authHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      const url = res.data?.data?.imageUrl;
      if (url) {
        setFormState((prev) => ({ ...prev, imageUrl: url }));
      } else {
        alert('Image uploaded but URL not returned');
      }
    } catch (err) {
      console.error('Image upload failed', err);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveItem = async () => {
    const { name, description, hourly, daily } = formState;
    if (!name.trim() || !description.trim() || hourly === '' || daily === '') {
      return alert('All fields are required');
    }

    const numericHourly = Number(hourly);
    const numericDaily = Number(daily);
    if (isNaN(numericHourly) || isNaN(numericDaily)) {
      return alert('Rates must be valid numbers');
    }

    const { imageUrl, availableIn, contactName, contactPhone, contactEmail } = formState;
    try {
      setLoading(true);
      if (itemToEdit) {
        await axios.patch(
          `${API_BASE_URL}/admin/special-requests/${itemToEdit._id || itemToEdit.id}`,
          {
            name: name.trim(),
            description: description.trim(),
            hourly: numericHourly,
            daily: numericDaily,
            imageUrl: (imageUrl || '').trim(),
            availableIn: (availableIn || 'Immediately').trim(),
            contactName: (contactName || '').trim(),
            contactPhone: (contactPhone || '').trim(),
            contactEmail: (contactEmail || '').trim(),
          },
          { headers: authHeaders() }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/admin/special-requests`,
          {
            name: name.trim(),
            description: description.trim(),
            hourly: numericHourly,
            daily: numericDaily,
            imageUrl: (imageUrl || '').trim(),
            availableIn: (availableIn || 'Immediately').trim(),
            contactName: (contactName || '').trim(),
            contactPhone: (contactPhone || '').trim(),
            contactEmail: (contactEmail || '').trim(),
          },
          { headers: authHeaders() }
        );
      }
      await loadItems();
      setItemToEdit(null);
      setIsFormOpen(false);
      setFormState({ name: '', description: '', hourly: '', daily: '', imageUrl: '', availableIn: 'Immediately', contactName: '', contactPhone: '', contactEmail: '' });
    } catch (error) {
      console.error('Save special request failed', error);
      alert('Failed to save special request');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete special request "${item.name}"?`)) return;

    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/admin/special-requests/${item._id || item.id}`, { headers: authHeaders() });
      await loadItems();
      if (selectedItem && (selectedItem._id === item._id || selectedItem.id === item.id)) {
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Delete special request failed', error);
      alert('Failed to delete special request');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items
    .filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      const name = (item.name || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return name.includes(query) || desc.includes(query);
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'name') {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

  return (
    <div style={{ padding: 24, color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 26, marginBottom: 8 }}>Special Requests</h2>
          <p style={{ color: '#94a3b8', margin: 0 }}>Marketplace list of user-listed rental items; persisted to backend.</p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by name or description"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0', minWidth: 210 }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
          >
            <option value="createdAt">Newest</option>
            <option value="name">Name</option>
            <option value="hourly">Hourly Rate</option>
            <option value="daily">Daily Rate</option>
          </select>
          <button
            onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            style={{ border: 'none', borderRadius: 8, background: '#38bdf8', color: '#020617', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
          >
            {sortDirection === 'asc' ? 'Asc' : 'Desc'}
          </button>
// ...existing code...
          <button
            onClick={openNewForm}
            style={{ border: 'none', borderRadius: 8, background: '#22c55e', color: '#050b14', padding: '10px 16px', fontWeight: 700, cursor: 'pointer' }}
          >
            Create New
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, border: '1px solid rgba(147,197,253,0.45)', background: 'rgba(15,23,42,0.8)' }}>
          <h3 style={{ margin: '0 0 10px', color: '#bfdbfe' }}>{itemToEdit ? 'Edit Special Request' : 'New Special Request'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              placeholder="Item"
              value={formState.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <textarea
                placeholder="Description (max 250 chars)"
                value={formState.description}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 250);
                  handleFormChange('description', value);
                }}
                maxLength={250}
                rows={4}
                style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0', resize: 'vertical', minHeight: 100 }}
              />
              <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{(formState.description || '').length}/250</span>
            </div>
            <input
              placeholder="Hourly Rate"
              value={formState.hourly}
              onChange={(e) => handleFormChange('hourly', e.target.value)}
              type="number"
              style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
            />
            <input
              placeholder="Daily Rate"
              value={formState.daily}
              onChange={(e) => handleFormChange('daily', e.target.value)}
              type="number"
              style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: '#cbd5e1', fontSize: 12 }}>Upload Image</label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageFileChange}
                style={{ padding: 6, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
              />
              {uploadingImage && <span style={{ color: '#9ca3af', fontSize: 12 }}>Uploading image...</span>}
              {formState.imageUrl && (
                <div style={{ position: 'relative', width: '100%', height: 120, borderRadius: 8, overflow: 'hidden', marginTop: 8, border: '1px solid rgba(148,163,184,0.4)' }}>
                  <img src={formState.imageUrl} alt="item" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )}
            </div>
            <input
              placeholder="How soon available"
              value={formState.availableIn}
              onChange={(e) => handleFormChange('availableIn', e.target.value)}
              type="text"
              style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
            />
            <input
              placeholder="Contact Name"
              value={formState.contactName}
              onChange={(e) => handleFormChange('contactName', e.target.value)}
              type="text"
              style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
            />
            <input
              placeholder="Contact Phone"
              value={formState.contactPhone}
              onChange={(e) => handleFormChange('contactPhone', e.target.value)}
              type="text"
              style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
            />
            <input
              placeholder="Contact Email"
              value={formState.contactEmail}
              onChange={(e) => handleFormChange('contactEmail', e.target.value)}
              type="email"
              style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: '#0f172a', color: '#e2e8f0' }}
            />
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              disabled={loading}
              onClick={saveItem}
              style={{ border: 'none', borderRadius: 8, background: '#22c55e', color: '#050b14', fontWeight: 700, padding: '8px 14px', cursor: 'pointer' }}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setItemToEdit(null); setIsFormOpen(false); setFormState({ name: '', description: '', hourly: '', daily: '', imageUrl: '', availableIn: 'Immediately', contactName: '', contactPhone: '', contactEmail: '' }); }}
              style={{ border: '1px solid rgba(148,163,184,0.6)', borderRadius: 8, background: 'transparent', color: '#94a3b8', fontWeight: 700, padding: '8px 14px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
        {loading ? (
          <div style={{ color: '#94a3b8' }}>Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ color: '#94a3b8' }}>No special requests available.</div>
        ) : (
          filteredItems.map((item) => {
            const imageSrc = item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${API_BASE_URL}${item.imageUrl}`) : null;
            return (
              <div key={item._id || item.id} style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(147,197,253,0.4)', background: 'rgba(15,23,42,0.7)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 120, height: 120, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#0c1220', border: '1px solid rgba(148,163,184,0.35)' }}>
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14, fontStyle: 'italic', textAlign: 'center', padding: 8 }}>
                      No image available
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 8px', color: '#bfdbfe', maxWidth: '100%', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.name}</h3>
                  <p style={{ margin: '0 0 5px', color: '#94a3b8', fontSize: 14, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>{item.description}</p>
                  <p style={{ margin: '0 0 5px', color: '#cbd5e1', fontSize: 13, maxWidth: '100%', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'break-word' }}>Available in: {item.availableIn || 'Immediately'}</p>
                  <p style={{ margin: 0, color: '#fff' }}>Hourly: R{Number(item.hourly).toFixed(2)}</p>
                  <p style={{ margin: '4px 0 0', color: '#fff' }}>Daily: R{Number(item.daily).toFixed(2)}</p>
                </div>
              </div>
              {(item.contactName || item.contactPhone || item.contactEmail) && (
                <div style={{ marginTop: 10, padding: '10px', border: '1px solid rgba(148,163,184,0.4)', borderRadius: 8, background: 'rgba(15,23,42,0.75)' }}>
                  {item.contactName && <p style={{ margin: '0 0 4px', color: '#cbd5e1', fontSize: 13 }}><strong>Contact:</strong> {item.contactName}</p>}
                  {item.contactPhone && <p style={{ margin: '0 0 4px', color: '#cbd5e1', fontSize: 13 }}><strong>Phone:</strong> {item.contactPhone}</p>}
                  {item.contactEmail && <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13 }}><strong>Email:</strong> {item.contactEmail}</p>}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13 }}>Available in: {item.availableIn || 'Immediately'}</p>
                <p style={{ margin: 0, color: '#fff', fontSize: 13 }}>Hourly: R{Number(item.hourly).toFixed(2)}</p>
                <p style={{ margin: 0, color: '#fff', fontSize: 13 }}>Daily: R{Number(item.daily).toFixed(2)}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                <button
                  onClick={() => openEditForm(item)}
                  style={{ border: 'none', borderRadius: 8, background: '#facc15', color: '#0f172a', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteItem(item)}
                  style={{ border: 'none', borderRadius: 8, background: '#ef4444', color: '#fff', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedItem(item)}
                  style={{ border: '1px solid #94a3b8', borderRadius: 8, background: 'transparent', color: '#94a3b8', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  View Details
                </button>
              </div>
            </div>
            );
          })
        )}
      </div>

      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            zIndex: 999
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div style={{ background: '#0f172a', borderRadius: 12, padding: 24, width: 'min(95vw, 520px)' }} onClick={(e) => e.stopPropagation()}>
            {selectedItem.imageUrl && (
              <img src={selectedItem.imageUrl} alt={selectedItem.name} style={{ width: '100%', height: 170, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
            )}
            <h3 style={{ marginTop: 0, color: '#bfdbfe' }}>{selectedItem.name}</h3>
            <p style={{ color: '#94a3b8' }}>{selectedItem.description}</p>
            <p style={{ color: '#cbd5e1' }}>Available in: {selectedItem.availableIn || 'Immediately'}</p>
            {(selectedItem.contactName || selectedItem.contactPhone || selectedItem.contactEmail) && (
              <div style={{ background: '#0b1124', borderRadius: 8, padding: 8, marginBottom: 8, border: '1px solid rgba(148,163,184,0.4)' }}>
                {selectedItem.contactName && <p style={{ margin: '0 0 3px', color: '#e2e8f0', fontSize: 13 }}><strong>Contact:</strong> {selectedItem.contactName}</p>}
                {selectedItem.contactPhone && <p style={{ margin: '0 0 3px', color: '#e2e8f0', fontSize: 13 }}><strong>Phone:</strong> {selectedItem.contactPhone}</p>}
                {selectedItem.contactEmail && <p style={{ margin: 0, color: '#e2e8f0', fontSize: 13 }}><strong>Email:</strong> {selectedItem.contactEmail}</p>}
              </div>
            )}
            <p style={{ color: '#fff' }}>Hourly rate: R{Number(selectedItem.hourly || 0).toFixed(2)}</p>
            <p style={{ color: '#fff' }}>Daily rate: R{Number(selectedItem.daily || 0).toFixed(2)}</p>
            <p style={{ color: '#94a3b8', fontSize: 12 }}>Created at: {new Date(selectedItem.createdAt || selectedItem.created_on || Date.now()).toLocaleString()}</p>
            <button
              onClick={() => setSelectedItem(null)}
              style={{ border: 'none', borderRadius: 8, background: '#38bdf8', color: '#020617', padding: '10px 16px', fontWeight: 700, cursor: 'pointer', marginTop: 12 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

