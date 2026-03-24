import React, { useState, useEffect } from 'react';
import styles from './LocalVendors.module.css';
import API_BASE_URL from '../config/api';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE_MB = 10; // enforce 10MB client-side default to avoid server 413
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Cloudinary unsigned upload config (set in peak-admin/.env)
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UNSIGNED_PRESET = import.meta.env.VITE_CLOUDINARY_UNSIGNED_PRESET || '';

// Image compression
import imageCompression from 'browser-image-compression';
const IMAGE_COMPRESSION_OPTIONS = { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true };

const STORAGE_KEY = 'localVendors_cache';
const FORM_STORAGE_KEY = 'localVendors_form';

const defaultHours = [
  { day: 'Monday', open: false, slots: [] },
  { day: 'Tuesday', open: false, slots: [] },
  { day: 'Wednesday', open: false, slots: [] },
  { day: 'Thursday', open: false, slots: [] },
  { day: 'Friday', open: false, slots: [] },
  { day: 'Saturday', open: false, slots: [] },
  { day: 'Sunday', open: false, slots: [] },
];

// FIX 1: Helper to reset all form fields — reused after save (create & edit)
const getEmptyForm = () => ({
  businessName: '',
  phones: [''],
  address: '',
  website: '',
  profilePic: null,
  profilePicUrl: null,
  images: [],
  socials: [{ platform: '', url: '' }],
  businessHours: defaultHours.map(d => ({ ...d, slots: [] })),
  menu: [{ name: '', price: '' }],
  delivery: false,
  collection: false,
});

export default function LocalVendors() {
  // vendorCards initialises from localStorage cache so cards show instantly on refresh
  const [vendorCards, setVendorCards] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [businessName, setBusinessName] = useState('');
  const [phones, setPhones] = useState(['']);
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [images, setImages] = useState([]);
  const [socials, setSocials] = useState([{ platform: '', url: '' }]);
  const [businessHours, setBusinessHours] = useState(defaultHours.map(d => ({ ...d, slots: [] })));
  const [menu, setMenu] = useState([{ name: '', price: '' }]);
  const [delivery, setDelivery] = useState(false);
  const [collection, setCollection] = useState(false);

  // FIX 3: resetForm applies the empty state to every field
  const resetForm = () => {
    const e = getEmptyForm();
    setBusinessName(e.businessName);
    setPhones(e.phones);
    setAddress(e.address);
    setWebsite(e.website);
    setProfilePic(e.profilePic);
    setProfilePicUrl(e.profilePicUrl);
    setImages(e.images);
    setSocials(e.socials);
    setBusinessHours(e.businessHours);
    setMenu(e.menu);
    setDelivery(e.delivery);
    setCollection(e.collection);
    try { localStorage.removeItem(FORM_STORAGE_KEY); } catch (e) { /* ignore */ }
  };

  // Business hours handlers
  const toggleDayOpen = idx => {
    const updated = [...businessHours];
    updated[idx] = { ...updated[idx], open: !updated[idx].open };
    if (!updated[idx].open) updated[idx].slots = [];
    setBusinessHours(updated);
  };
  const addSlot = idx => {
    const updated = businessHours.map((d, i) =>
      i === idx ? { ...d, slots: [...d.slots, { start: '', end: '' }] } : d
    );
    setBusinessHours(updated);
  };
  const removeSlot = (dayIdx, slotIdx) => {
    const updated = businessHours.map((d, i) =>
      i === dayIdx ? { ...d, slots: d.slots.filter((_, si) => si !== slotIdx) } : d
    );
    setBusinessHours(updated);
  };
  const handleSlotChange = (dayIdx, slotIdx, field, value) => {
    const updated = businessHours.map((d, i) => {
      if (i !== dayIdx) return d;
      const slots = d.slots.map((s, si) => si === slotIdx ? { ...s, [field]: value } : s);
      return { ...d, slots };
    });
    setBusinessHours(updated);
  };

  // Social media handlers
  const handleSocialChange = (idx, field, value) => {
    const updated = [...socials];
    updated[idx] = { ...updated[idx], [field]: value };
    setSocials(updated);
  };
  const addSocial = () => setSocials([...socials, { platform: '', url: '' }]);
  const removeSocial = idx => setSocials(socials.filter((_, i) => i !== idx));

  const handlePhoneChange = (idx, value) => {
    const updated = [...phones];
    updated[idx] = value;
    setPhones(updated);
  };
  const addPhone = () => setPhones([...phones, '']);
  const removePhone = idx => setPhones(phones.filter((_, i) => i !== idx));

  const handleMenuChange = (idx, field, value) => {
    const updated = [...menu];
    updated[idx] = { ...updated[idx], [field]: value };
    setMenu(updated);
  };
  const addMenuItem = () => setMenu([...menu, { name: '', price: '' }]);
  const removeMenuItem = idx => setMenu(menu.filter((_, i) => i !== idx));

  const handleImagesChange = e => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > MAX_IMAGES) {
      alert(`You can only upload up to ${MAX_IMAGES} images.`);
      return;
    }
    for (let file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        alert(`Unsupported image type: ${file.type}. Allowed: JPG, PNG, WEBP, GIF.`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        const mb = (file.size / (1024 * 1024)).toFixed(2);
        alert(`Image "${file.name}" is too large (${mb} MB). Maximum allowed is ${MAX_IMAGE_SIZE_MB} MB.`);
        return;
      }
    }
    setImages([...images, ...files]);
  };
  const removeImage = idx => setImages(images.filter((_, i) => i !== idx));

  const handleProfilePicChange = e => {
    const file = e.target.files[0];
    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        alert(`Unsupported profile image type: ${file.type}. Allowed: JPG, PNG, WEBP, GIF.`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        const mb = (file.size / (1024 * 1024)).toFixed(2);
        alert(`Profile image "${file.name}" is too large (${mb} MB). Maximum allowed is ${MAX_IMAGE_SIZE_MB} MB.`);
        return;
      }
      setProfilePic(file);
      setProfilePicUrl(URL.createObjectURL(file));
    } else {
      setProfilePic(null);
      setProfilePicUrl(null);
    }
  };

  const handleSaveVendor = (e) => {
    e.preventDefault();
    (async () => {
      try {
        if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UNSIGNED_PRESET) {
          return alert('Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UNSIGNED_PRESET in peak-admin/.env');
        }

        const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';

        // helper: compress and upload one file to Cloudinary
        const uploadToCloudinaryClient = async (file) => {
          try {
            const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
            file = compressed;
          } catch (e) {
            console.warn('compression failed, uploading original', e);
          }
          if (CLOUDINARY_UNSIGNED_PRESET && CLOUDINARY_UNSIGNED_PRESET !== 'your_unsigned_preset_here') {
            const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('upload_preset', CLOUDINARY_UNSIGNED_PRESET);
            const r = await fetch(url, { method: 'POST', body: fd });
            const txt = await r.text();
            let j = {};
            try { j = txt ? JSON.parse(txt) : {}; } catch (e) { j = { message: txt }; }
            if (!r.ok) throw new Error(j && j.error && j.error.message ? j.error.message : (j.message || `Upload failed: ${r.status}`));
            return { url: j.secure_url, public_id: j.public_id };
          }

          // signed upload fallback
          const signUrl = (API_BASE_URL || '').replace(/\/$/, '') + '/admin/cloudinary-sign?folder=vendors';
          const signRes = await fetch(signUrl, { method: 'GET', headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (!signRes.ok) {
            const txt = await signRes.text().catch(() => '');
            throw new Error(txt || 'Failed to get Cloudinary signature from server');
          }
          const signJson = await signRes.json();
          const uploadUrl = `https://api.cloudinary.com/v1_1/${signJson.cloud_name}/image/upload`;
          const fd2 = new FormData();
          fd2.append('file', file);
          fd2.append('timestamp', signJson.timestamp);
          fd2.append('signature', signJson.signature);
          fd2.append('api_key', signJson.api_key);
          if (signJson.folder) fd2.append('folder', signJson.folder);
          const r2 = await fetch(uploadUrl, { method: 'POST', body: fd2 });
          const txt2 = await r2.text();
          let j2 = {};
          try { j2 = txt2 ? JSON.parse(txt2) : {}; } catch (e) { j2 = { message: txt2 }; }
          if (!r2.ok) throw new Error(j2 && j2.error && j2.error.message ? j2.error.message : (j2.message || `Upload failed: ${r2.status}`));
          return { url: j2.secure_url, public_id: j2.public_id };
        };

        // upload profile pic first (if present)
        let profileImageResult = null;
        if (profilePic) {
          profileImageResult = await uploadToCloudinaryClient(profilePic);
        }

        // upload gallery images
        const imagesResult = [];
        if (images && images.length) {
          for (const f of images) {
            const uploaded = await uploadToCloudinaryClient(f);
            imagesResult.push({ url: uploaded.url, public_id: uploaded.public_id });
          }
        }

        // build payload and send to backend
        const payload = {
          name: businessName,
          phones: phones.filter(p => p.trim()),
          address,
          website,
          social: socials.filter(s => s.platform && s.url),
          weeklyHours: businessHours,
          menuItems: menu.filter(m => m.name),
          deliveryOption: delivery,
          collectionOption: collection,
          images: imagesResult,
          profileImage: profileImageResult
        };

        console.debug('LocalVendors: payload to send', payload);

        let res;
        if (editingIndex !== null && editingIndex >= 0 && vendorCards[editingIndex] && vendorCards[editingIndex]._id) {
          const id = vendorCards[editingIndex]._id;
          const url = (API_BASE_URL || '').replace(/\/$/, '') + `/admin/vendors/${id}`;
          res = await fetch(url, {
            method: 'PATCH',
            headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
            body: JSON.stringify(payload)
          });
        } else {
          const url = (API_BASE_URL || '').replace(/\/$/, '') + '/admin/vendors';
          res = await fetch(url, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
            body: JSON.stringify(payload)
          });
        }

        const text = await res.text();
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch (e) { json = { message: text }; }
        console.debug('LocalVendors: save response', res.status, json);
        if (!res.ok) return alert(json && json.message ? json.message : 'Error saving vendor');
        const saved = json.data || {};

        const v = {
          _id: saved._id,
          name: saved.name || businessName,
          phones: saved.phones || phones.filter(p => p.trim()),
          address: saved.address || address,
          website: saved.website || website,
          socials: saved.social || socials.filter(s => s.platform && s.url),
          // FIX 4: fallback to local businessHours state when backend doesn't return weeklyHours
          businessHours: saved.weeklyHours || businessHours,
          menu: saved.menuItems || menu.filter(m => m.name),
          delivery: saved.hasOwnProperty('deliveryOption') ? saved.deliveryOption : delivery,
          collection: saved.hasOwnProperty('collectionOption') ? saved.collectionOption : collection,
          images: (saved.images || imagesResult).map(i => (typeof i === 'string' ? i : (i.url || i))),
          profilePic: saved.profileImage ? (saved.profileImage.url || saved.profileImage.secure_url) : (profilePicUrl || null)
        };

        if (editingIndex !== null && editingIndex >= 0 && editingIndex < vendorCards.length) {
          const updated = [...vendorCards];
          if (saved._id) v._id = saved._id;
          updated[editingIndex] = v;
          setVendorCards(updated);
        } else {
          setVendorCards([v, ...vendorCards]);
        }

        // FIX 5: reset the form after every successful save (create or edit)
        setEditingIndex(null);
        resetForm();

      } catch (err) {
        console.error('save vendor error', err);
        alert(err && err.message ? err.message : 'Error saving vendor');
      }
    })();
  };

  const handleEditVendor = (idx) => {
    const v = vendorCards[idx];
    if (!v) return;
    setBusinessName(v.name || '');
    setPhones(Array.isArray(v.phones) && v.phones.length ? v.phones : ['']);
    setAddress(v.address || '');
    setWebsite(v.website || '');
    setSocials(Array.isArray(v.socials) && v.socials.length ? v.socials : [{ platform: '', url: '' }]);
    setBusinessHours(Array.isArray(v.businessHours) && v.businessHours.length ? v.businessHours : defaultHours.map(d => ({ ...d, slots: [] })));
    setMenu(Array.isArray(v.menu) && v.menu.length ? v.menu : [{ name: '', price: '' }]);
    setDelivery(Boolean(v.delivery));
    setCollection(Boolean(v.collection));
    // Images cannot be restored to File objects; clear file inputs
    setImages([]);
    setProfilePic(null);
    setProfilePicUrl(v.profilePic || null);
    setEditingIndex(idx);
  };

  // Persist form state (serializable parts) so inputs survive a browser refresh
  useEffect(() => {
    try {
      const toSave = {
        editingIndex,
        businessName,
        phones,
        address,
        website,
        profilePicUrl,
        socials,
        businessHours,
        menu,
        delivery,
        collection
      };
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) { /* ignore storage errors */ }
  }, [editingIndex, businessName, phones, address, website, profilePicUrl, socials, businessHours, menu, delivery, collection]);

  // Restore form state on mount if present
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FORM_STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s) return;
      if (s.businessName) setBusinessName(s.businessName);
      if (Array.isArray(s.phones)) setPhones(s.phones.length ? s.phones : ['']);
      if (s.address) setAddress(s.address);
      if (s.website) setWebsite(s.website);
      if (s.profilePicUrl) setProfilePicUrl(s.profilePicUrl);
      if (Array.isArray(s.socials) && s.socials.length) setSocials(s.socials);
      if (Array.isArray(s.businessHours) && s.businessHours.length) setBusinessHours(s.businessHours);
      if (Array.isArray(s.menu) && s.menu.length) setMenu(s.menu);
      if (typeof s.delivery === 'boolean') setDelivery(s.delivery);
      if (typeof s.collection === 'boolean') setCollection(s.collection);
      if (typeof s.editingIndex === 'number') setEditingIndex(s.editingIndex);
    } catch (e) { /* ignore parse errors */ }
  }, []);

  const handleDeleteVendor = (idx) => {
    const vendor = vendorCards[idx];
    if (!vendor) return;
    if (!confirm('Delete this vendor? This cannot be undone.')) return;

    (async () => {
      try {
        if (vendor._id) {
          const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || '';
          const delUrl = (API_BASE_URL || '').replace(/\/$/, '') + `/admin/vendors/${vendor._id}`;
          const res = await fetch(delUrl, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
          if (!res.ok) {
            const txt = await res.text().catch(() => '');
            let j = {};
            try { j = txt ? JSON.parse(txt) : {}; } catch (e) { j = { message: txt }; }
            return alert(j && j.message ? j.message : 'Failed to delete vendor on server');
          }
        }

        const updated = vendorCards.filter((_, i) => i !== idx);
        setVendorCards(updated);
        if (editingIndex === idx) setEditingIndex(null);
        if (editingIndex !== null && editingIndex > idx) setEditingIndex(editingIndex - 1);
      } catch (err) {
        console.error('delete vendor error', err);
        alert('Error deleting vendor');
      }
    })();
  };

  // Keep localStorage in sync whenever vendorCards changes
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vendorCards)); } catch { /* quota exceeded — ignore */ }
  }, [vendorCards]);

  // Load vendors from backend on mount, with retry for Render cold-start delays
  useEffect(() => {
    let cancelled = false;
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 8000; // 8 seconds between retries

    const normalise = (v) => {
      let phones = [];
      if (Array.isArray(v.phones)) phones = v.phones;
      else if (v.phones && typeof v.phones === 'string') phones = [v.phones];
      else if (v.phoneNumbers && Array.isArray(v.phoneNumbers)) phones = v.phoneNumbers;

      let socials = [];
      const rawSocials = v.social || v.socials || [];
      if (Array.isArray(rawSocials)) {
        socials = rawSocials.map(s => {
          if (!s) return { platform: '', url: '' };
          if (typeof s === 'string') return { platform: '', url: s };
          return { platform: s.platform || s.name || '', url: s.url || s.link || '' };
        });
      }

      let menu = [];
      const rawMenu = v.menuItems || v.menu || [];
      if (Array.isArray(rawMenu)) {
        menu = rawMenu.map(m => typeof m === 'string' ? { name: m, price: '' } : { name: m.name || m.title || '', price: m.price || m.cost || '' });
      }

      const images = Array.isArray(v.images) ? v.images.map(i => (typeof i === 'string' ? i : (i.url || i.secure_url || ''))) : [];

      let profilePic = '';
      if (v.profileImage) profilePic = v.profileImage.url || v.profileImage.secure_url || '';
      else if (v.profilePic && typeof v.profilePic === 'string') profilePic = v.profilePic;

      return {
        _id: v._id,
        name: v.name || v.businessName || v.title || '',
        phones,
        address: v.address || v.location || '',
        website: v.website || v.url || '',
        socials,
        businessHours: v.weeklyHours || v.businessHours || [],
        menu,
        delivery: Boolean(v.deliveryOption || v.delivery),
        collection: Boolean(v.collectionOption || v.collection),
        images,
        profilePic
      };
    };

    const fetchWithRetry = async () => {
      setLoadingVendors(true);
      setLoadError(null);
      const base = (API_BASE_URL || '').replace(/\/$/, '');
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (cancelled) return;
        try {
          const res = await fetch(base + '/vendors');
          if (!res.ok) throw new Error(`Status ${res.status}`);
          const list = await res.json();
          if (cancelled) return;
          if (!Array.isArray(list)) throw new Error('Unexpected response format');
          const mapped = list.map(normalise);
          setVendorCards(mapped);
          setLoadingVendors(false);
          setLoadError(null);
          return; // success — stop retrying
        } catch (err) {
          console.warn(`Vendors fetch attempt ${attempt} failed:`, err.message);
          if (attempt < MAX_RETRIES) {
            if (!cancelled) setLoadError(`Server is waking up… retrying (${attempt}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          } else {
            if (!cancelled) {
              setLoadError('Could not reach server. Showing cached data.');
              setLoadingVendors(false);
            }
          }
        }
      }
    };

    fetchWithRetry();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={styles.vendorFormContainer}>
      <h2 className={styles.vendorFormTitle}>
        {editingIndex !== null ? 'Edit Vendor' : 'Add Local Vendor'}
      </h2>
      {loadingVendors && (
        <div style={{ textAlign: 'center', color: '#38bdf8', marginBottom: 12, fontSize: '0.97rem' }}>
          ⏳ {loadError || 'Loading vendors…'}
        </div>
      )}
      {!loadingVendors && loadError && (
        <div style={{ textAlign: 'center', color: '#f87171', marginBottom: 12, fontSize: '0.97rem' }}>
          ⚠️ {loadError}
        </div>
      )}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Business Name</label>
        <input value={businessName} onChange={e => setBusinessName(e.target.value)} className={styles.input} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Phone Numbers</label>
        {phones.map((phone, idx) => (
          <div key={idx} className={styles.dynamicList} style={{ display: 'flex', alignItems: 'center' }}>
            <input value={phone} onChange={e => handlePhoneChange(idx, e.target.value)} className={styles.input} style={{ flex: 1 }} />
            {phones.length > 1 && <button type="button" className={styles.removeBtn} onClick={() => removePhone(idx)}>Remove</button>}
          </div>
        ))}
        <button type="button" className={styles.addBtn} onClick={addPhone}>Add Phone</button>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Address</label>
        <input value={address} onChange={e => setAddress(e.target.value)} className={styles.input} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Website</label>
        <input value={website} onChange={e => setWebsite(e.target.value)} className={styles.input} />
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Business Profile Picture</label>
        <input type="file" accept="image/*" onChange={handleProfilePicChange} />
        {profilePic && <span style={{ marginLeft: 8 }}>{profilePic.name}</span>}
        {!profilePic && profilePicUrl && (
          <img src={profilePicUrl} alt="Current profile" className={styles.imageThumb} style={{ marginTop: 6 }} />
        )}
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Upload Images (up to 5, max {MAX_IMAGE_SIZE_MB}MB each)</label>
        <input type="file" accept="image/*" multiple onChange={handleImagesChange} />
        <div className={styles.imagePreview}>
          {images.map((img, idx) => (
            <span key={idx}>
              <span>{img.name}</span>
              <button type="button" className={styles.removeBtn} onClick={() => removeImage(idx)}>Remove</button>
            </span>
          ))}
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Social Media</label>
        {socials.map((soc, idx) => (
          <div key={idx} className={styles.dynamicList} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <input
              placeholder="Platform (e.g. Instagram)"
              value={soc.platform}
              onChange={e => handleSocialChange(idx, 'platform', e.target.value)}
              className={styles.input}
              style={{ flex: 1 }}
            />
            <input
              placeholder="Profile URL"
              value={soc.url}
              onChange={e => handleSocialChange(idx, 'url', e.target.value)}
              className={styles.input}
              style={{ flex: 2 }}
            />
            {socials.length > 1 && (
              <button type="button" className={styles.removeBtn} onClick={() => removeSocial(idx)}>Remove</button>
            )}
          </div>
        ))}
        <button type="button" className={styles.addBtn} onClick={addSocial}>Add Social Media</button>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Business Hours</label>
        <div className={styles.businessHoursTable}>
          {businessHours.map((day, idx) => (
            <div key={day.day} className={styles.businessHoursRow} style={{ marginBottom: 8 }}>
              <label style={{ minWidth: 110, display: 'inline-block' }}>
                <input
                  type="checkbox"
                  checked={day.open}
                  onChange={() => toggleDayOpen(idx)}
                  style={{ marginRight: 6 }}
                /> {day.day}
              </label>
              {day.open && (
                <div className={styles.slotsContainer} style={{ display: 'inline-block', marginLeft: 12 }}>
                  {day.slots.map((slot, slotIdx) => (
                    <span key={slotIdx} className={styles.slot} style={{ marginRight: 8 }}>
                      <input
                        type="time"
                        value={slot.start}
                        onChange={e => handleSlotChange(idx, slotIdx, 'start', e.target.value)}
                        className={styles.input}
                        style={{ width: 100, display: 'inline-block' }}
                      />
                      <span style={{ margin: '0 4px' }}>-</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={e => handleSlotChange(idx, slotIdx, 'end', e.target.value)}
                        className={styles.input}
                        style={{ width: 100, display: 'inline-block' }}
                      />
                      <button type="button" className={styles.removeBtn} style={{ marginLeft: 4 }} onClick={() => removeSlot(idx, slotIdx)}>Remove</button>
                    </span>
                  ))}
                  <button type="button" className={styles.addBtn} onClick={() => addSlot(idx)}>Add Slot</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Menu</label>
        {menu.map((item, idx) => (
          <div key={idx} className={styles.dynamicList} style={{ display: 'flex', alignItems: 'center' }}>
            <input placeholder="Item name" value={item.name} onChange={e => handleMenuChange(idx, 'name', e.target.value)} className={styles.input} style={{ marginRight: 8 }} />
            <input placeholder="Price" value={item.price} onChange={e => handleMenuChange(idx, 'price', e.target.value)} className={styles.input} style={{ width: 80, marginRight: 8 }} />
            {menu.length > 1 && <button type="button" className={styles.removeBtn} onClick={() => removeMenuItem(idx)}>Remove</button>}
          </div>
        ))}
        <button type="button" className={styles.addBtn} onClick={addMenuItem}>Add Menu Item</button>
      </div>
      <div className={styles.checkboxGroup}>
        <label><input type="checkbox" checked={delivery} onChange={e => setDelivery(e.target.checked)} /> Delivery Option</label>
        <label><input type="checkbox" checked={collection} onChange={e => setCollection(e.target.checked)} /> Collection Option</label>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
        <button className={styles.saveBtn} onClick={handleSaveVendor}>
          {editingIndex !== null ? 'Update Vendor' : 'Save Vendor'}
        </button>
        {editingIndex !== null && (
          <button
            type="button"
            className={styles.saveBtn}
            style={{ background: '#334155', color: '#f1f5f9' }}
            onClick={() => { setEditingIndex(null); resetForm(); }}
          >
            Cancel Edit
          </button>
        )}
      </div>
      <div className={styles.cardsContainer}>
        {vendorCards.map((vendor, idx) => (
          <div key={idx} className={styles.vendorCard}>
            {/* Business Profile Picture */}
            {((typeof vendor.profilePic === 'string' && vendor.profilePic) || (vendor.profilePic && (vendor.profilePic.url || vendor.profilePic.secure_url))) ? (
              <img
                src={typeof vendor.profilePic === 'string' ? vendor.profilePic : (vendor.profilePic.url || vendor.profilePic.secure_url)}
                alt="Business Profile"
                className={styles.cardImage}
                style={{ background: '#1e293b' }}
              />
            ) : (
              <div className={styles.cardImage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontWeight: 700, fontSize: 32 }}>
                ?
              </div>
            )}
            <div className={styles.cardContent}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={styles.cardTitle}>{vendor.name}</div>
                <div className={styles.cardActions}>
                  {vendor._id && (
                    <>
                      <button type="button" className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => handleEditVendor(idx)}>Edit</button>
                      <button type="button" className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteVendor(idx)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
              <div className={styles.cardSection}><b>Phones:</b> {Array.isArray(vendor.phones) && vendor.phones.length ? vendor.phones.join(', ') : '—'}</div>
              <div className={styles.cardSection}><b>Address:</b> {vendor.address || '—'}</div>
              <div className={styles.cardSection}><b>Website:</b> {vendor.website ? <a href={vendor.website} target="_blank" rel="noopener noreferrer">{vendor.website}</a> : '—'}</div>
              <div className={`${styles.cardSection} ${styles.cardSocials}`}>
                <b>Socials:</b>{' '}
                {Array.isArray(vendor.socials) && vendor.socials.length
                  ? vendor.socials.map((s, i) => (
                    <a key={i} href={s.url || '#'} target="_blank" rel="noopener noreferrer" className={styles.cardSocialLink}>{s.platform || s.url}</a>
                  ))
                  : '—'}
              </div>
              {/* FIX 6: guard against undefined businessHours / menu with || [] to prevent crash */}
              <div className={`${styles.cardSection} ${styles.cardHours}`}>
                <b>Business Hours:</b>{' '}
                {(vendor.businessHours || []).filter(d => d.open).length
                  ? (vendor.businessHours || []).filter(d => d.open).map(d => `${d.day}: ${(d.slots || []).map(s => `${s.start}-${s.end}`).join(', ')}`).join(' | ')
                  : '—'}
              </div>
              <div className={`${styles.cardSection} ${styles.cardMenuList}`}>
                <b>Menu:</b>{' '}
                {(vendor.menu || []).length
                  ? (vendor.menu || []).map((m, i) => (
                    <span key={i} className={styles.cardMenuItem}>{m.name}{m.price ? ` (${m.price})` : ''}</span>
                  ))
                  : '—'}
              </div>
              <div className={styles.cardTags}>
                <span className={styles.cardTag}>{vendor.delivery ? 'Delivery' : 'No Delivery'}</span>
                <span className={styles.cardTag}>{vendor.collection ? 'Collection' : 'No Collection'}</span>
              </div>
              {Array.isArray(vendor.images) && vendor.images.length > 0 && (
                <div className={styles.cardImagesList}>
                  {vendor.images.map((img, i) => (
                    <img key={i} src={typeof img === 'string' ? img : (img.url || '')} alt={`img-${i}`} className={styles.cardImageThumb} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
