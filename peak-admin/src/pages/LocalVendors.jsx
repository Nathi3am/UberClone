import React, { useState } from 'react';
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

export default function LocalVendors() {
  const [businessName, setBusinessName] = useState('');
  const [phones, setPhones] = useState(['']);
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [images, setImages] = useState([]);
  const [socials, setSocials] = useState([{ platform: '', url: '' }]);
  const defaultHours = [
    { day: 'Monday', open: false, slots: [] },
    { day: 'Tuesday', open: false, slots: [] },
    { day: 'Wednesday', open: false, slots: [] },
    { day: 'Thursday', open: false, slots: [] },
    { day: 'Friday', open: false, slots: [] },
    { day: 'Saturday', open: false, slots: [] },
    { day: 'Sunday', open: false, slots: [] },
  ];
  const [businessHours, setBusinessHours] = useState(defaultHours);
    // Business hours handlers
    const toggleDayOpen = idx => {
      const updated = [...businessHours];
      updated[idx].open = !updated[idx].open;
      if (!updated[idx].open) updated[idx].slots = [];
      setBusinessHours(updated);
    };
    const addSlot = idx => {
      const updated = [...businessHours];
      updated[idx].slots.push({ start: '', end: '' });
      setBusinessHours(updated);
    };
    const removeSlot = (dayIdx, slotIdx) => {
      const updated = [...businessHours];
      updated[dayIdx].slots.splice(slotIdx, 1);
      setBusinessHours(updated);
    };
    const handleSlotChange = (dayIdx, slotIdx, field, value) => {
      const updated = [...businessHours];
      updated[dayIdx].slots[slotIdx][field] = value;
      setBusinessHours(updated);
    };
  const [menu, setMenu] = useState([{ name: '', price: '' }]);
  const [delivery, setDelivery] = useState(false);
  const [collection, setCollection] = useState(false);
  // Social media handlers
  const handleSocialChange = (idx, field, value) => {
    const updated = [...socials];
    updated[idx][field] = value;
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
    updated[idx][field] = value;
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
        const mb = (file.size / (1024*1024)).toFixed(2);
        alert(`Image "${file.name}" is too large (${mb} MB). Maximum allowed is ${MAX_IMAGE_SIZE_MB} MB.`);
        return;
      }
    }
    setImages([...images, ...files]);
  };
  const removeImage = idx => setImages(images.filter((_, i) => i !== idx));

  
  const [editingIndex, setEditingIndex] = useState(null);

  const handleProfilePicChange = e => {
    const file = e.target.files[0];
    if (file) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        alert(`Unsupported profile image type: ${file.type}. Allowed: JPG, PNG, WEBP, GIF.`);
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        const mb = (file.size / (1024*1024)).toFixed(2);
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

        // helper: compress and upload one file to unsigned Cloudinary
        const uploadToCloudinaryClient = async (file) => {
          // compress image to reduce bytes
          try {
            const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS);
            file = compressed;
          } catch (e) {
            console.warn('compression failed, uploading original', e);
          }
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

        // build payload (JSON) and send to backend
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

        const url = (API_BASE_URL || '').replace(/\/$/, '') + '/admin/vendors';
        const res = await fetch(url, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
          body: JSON.stringify(payload)
        });
        const text = await res.text();
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch (e) { json = { message: text }; }
        if (!res.ok) return alert(json && json.message ? json.message : 'Error saving vendor');
        const saved = json.data || {};

        const v = {
          _id: saved._id,
          name: saved.name,
          phones: saved.phones || [],
          address: saved.address || '',
          website: saved.website || '',
          socials: saved.social || [],
          businessHours: saved.weeklyHours || businessHours,
          menu: saved.menuItems || [],
          delivery: saved.deliveryOption || false,
          collection: saved.collectionOption || false,
          images: (saved.images || []).map(i => i.url || i),
          profilePic: saved.profileImage ? saved.profileImage.url : (profilePicUrl || null)
        };

        if (editingIndex !== null && editingIndex >= 0 && editingIndex < vendorCards.length) {
          const updated = [...vendorCards];
          updated[editingIndex] = v;
          setVendorCards(updated);
        } else {
          setVendorCards([v, ...vendorCards]);
        }

        setEditingIndex(null);
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
    setBusinessHours(Array.isArray(v.businessHours) && v.businessHours.length ? v.businessHours : defaultHours);
    setMenu(Array.isArray(v.menu) && v.menu.length ? v.menu : [{ name: '', price: '' }]);
    setDelivery(Boolean(v.delivery));
    setCollection(Boolean(v.collection));
    // Images cannot be restored to File objects; clear file inputs
    setImages([]);
    setProfilePic(null);
    setProfilePicUrl(v.profilePic || null);
    setEditingIndex(idx);
  };

  const handleDeleteVendor = (idx) => {
    const vendor = vendorCards[idx];
    if (!vendor) return;
    if (!confirm('Delete this vendor? This cannot be undone.')) return;

    (async () => {
      try {
        // if persisted on server, delete there
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

  const [vendorCards, setVendorCards] = useState([]);

  return (
    <div className={styles.vendorFormContainer}>
      <h2 className={styles.vendorFormTitle}>Add Local Vendor</h2>
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
      </div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Upload Images (up to 5, max 100MB each)</label>
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
      <button className={styles.saveBtn} onClick={handleSaveVendor}>Save Vendor</button>
      <div className={styles.vendorCardsContainer}>
        {vendorCards.map((vendor, idx) => (
          <div key={idx} className={styles.vendorCard}>
            {/* Business Profile Picture */}
            {vendor.profilePic ? (
              <img
                src={typeof vendor.profilePic === 'string' && vendor.profilePic.startsWith('blob:') ? vendor.profilePic : ''}
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
                  <button type="button" className={styles.actionBtn + ' ' + styles.editBtn} onClick={() => handleEditVendor(idx)}>Edit</button>
                  <button type="button" className={styles.actionBtn + ' ' + styles.deleteBtn} onClick={() => handleDeleteVendor(idx)}>Delete</button>
                </div>
              </div>
              <div className={styles.cardSection}><b>Phones:</b> {vendor.phones.join(', ')}</div>
              <div className={styles.cardSection}><b>Address:</b> {vendor.address}</div>
              <div className={styles.cardSection}><b>Website:</b> {vendor.website}</div>
              <div className={styles.cardSection + ' ' + styles.cardSocials}><b>Socials:</b> {vendor.socials.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className={styles.cardSocialLink}>{s.platform}</a>
              ))}</div>
              <div className={styles.cardSection + ' ' + styles.cardHours}><b>Business Hours:</b> {vendor.businessHours.filter(d => d.open).map(d => `${d.day}: ${d.slots.map(s => s.start + '-' + s.end).join(', ')}`).join(' | ')}</div>
              <div className={styles.cardSection + ' ' + styles.cardMenuList}><b>Menu:</b> {vendor.menu.map((m, i) => (
                <span key={i} className={styles.cardMenuItem}>{m.name} ({m.price})</span>
              ))}</div>
              <div className={styles.cardTags}>
                <span className={styles.cardTag}>{vendor.delivery ? 'Delivery' : 'No Delivery'}</span>
                <span className={styles.cardTag}>{vendor.collection ? 'Collection' : 'No Collection'}</span>
              </div>
              {Array.isArray(vendor.images) && vendor.images.length > 0 && (
                <div className={styles.cardImagesList}>
                  {vendor.images.map((img, i) => (
                    <span key={i} className={styles.cardImageThumb} title={img}>{img}</span>
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
