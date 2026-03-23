import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ProtectedRoute from '../components/ProtectedRoute'

export default function LetsEatLocal(){
  const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || 'https://vexomove.onrender.com' })
  // attach admin JWT from localStorage when present
  api.interceptors.request.use(cfg => {
    try {
      const token = localStorage.getItem('token')
      if (token) cfg.headers = Object.assign({}, cfg.headers, { Authorization: `Bearer ${token}` })
    } catch (e) {}
    return cfg
  })
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [newItem, setNewItem] = useState('')
  const [images, setImages] = useState([]) // { id, file, url }
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [social, setSocial] = useState([]) // { platform, url }
  const [newSocialPlatform, setNewSocialPlatform] = useState('')
  const [newSocialUrl, setNewSocialUrl] = useState('')
  const [vendors, setVendors] = useState([]) // list of saved vendors
  const [selectedVendorId, setSelectedVendorId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('form') // 'form' or 'list'
  const [page, setPage] = useState(1)
  const pageSize = 6
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [weeklyHours, setWeeklyHours] = useState(() => {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    return days.map(d => ({ day: d, open: false, slots: [] }))
  })
  const imagesRef = useRef([])

  const addItem = () => {
    const v = newItem && newItem.trim()
    if(!v) return
    setMenuItems(prev => [...prev, { id: Date.now(), title: v }])
    setNewItem('')
  }

  const addSocial = () => {
    const p = (newSocialPlatform || '').trim()
    const u = (newSocialUrl || '').trim()
    if (!u) return alert('Enter social URL')
    setSocial(prev => [...prev, { platform: p || 'link', url: u }])
    setNewSocialPlatform('')
    setNewSocialUrl('')
  }

  const removeSocial = (idx) => setSocial(prev => prev.filter((_,i)=>i!==idx))

  // Vendor CRUD handlers (local state)
  const clearForm = () => {
    setName(''); setPhone(''); setMenuItems([]); setNewItem('');
    setWebsite(''); setAddress(''); setSocial([]); setNewSocialPlatform(''); setNewSocialUrl('')
    // revoke current images and clear
    images.forEach(i=> i.url && URL.revokeObjectURL(i.url))
    setImages([])
    setWeeklyHours(w => w.map(d => ({...d, open:false, slots:[]})))
    setSelectedVendorId(null)
  }

  const saveVendor = async () => {
    if (!name) { alert('Please enter vendor name'); return }
    try {
      setLoading(true)
      const form = new FormData()
      form.append('name', name)
      form.append('phone', phone)
      form.append('menuItems', JSON.stringify(menuItems))
        form.append('website', website)
        form.append('address', address)
        form.append('social', JSON.stringify(social || []))
      form.append('weeklyHours', JSON.stringify(weeklyHours))

      const existing = images.filter(i => !i.file && i.url).map(i => i.url)
      form.append('existingImages', JSON.stringify(existing))

      images.forEach(i => { if (i.file) form.append('images', i.file) })

      let res
      if (selectedVendorId) {
        res = await api.patch(`/admin/vendors/${selectedVendorId}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        res = await api.post('/admin/vendors', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      await fetchVendors()
      if (res && res.data && res.data.vendor) setSelectedVendorId(res.data.vendor._id || res.data.vendor.id || selectedVendorId)
      alert(res && res.data && res.data.message ? res.data.message : 'Saved')
      } catch (e) {
      console.warn('saveVendor failed, falling back to local save', e && e.message)
      // Fallback: persist vendor locally so user sees saved card even if backend endpoint missing
      try {
        const localId = `local-${Date.now()}`
        const localImages = images.map(i => ({ url: i.url, local: true }))
        const record = {
          _id: localId,
          name,
          phone,
            website,
            address,
            social,
          menuItems,
          images: localImages,
          weeklyHours,
          createdAt: new Date().toISOString(),
          local: true
        }
        const next = [record].concat(Array.isArray(vendors) ? vendors : [])
        setVendors(next)
        saveLocalVendors(next)
        setSelectedVendorId(localId)
        alert('Saved locally (backend endpoint returned 404 or unreachable)')
      } catch (err) {
        console.error('local save failed', err)
        alert('Save failed')
      }
    } finally { setLoading(false) }
  }

  const deleteVendor = () => {
    if (!selectedVendorId) { alert('Select a vendor to delete'); return }
    setPendingDeleteId(selectedVendorId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return setShowDeleteConfirm(false)
    try {
      setLoading(true)
      await api.delete(`/admin/vendors/${pendingDeleteId}`)
      await fetchVendors()
      clearForm()
      setShowDeleteConfirm(false)
      setPendingDeleteId(null)
    } catch (e) {
      console.warn('delete vendor API failed, attempting local delete', e && e.message)
      try {
        const vendorList = Array.isArray(vendors) ? vendors.filter(v => String(v._id || v.id) !== String(pendingDeleteId)) : []
        setVendors(vendorList)
        saveLocalVendors(vendorList)
        clearForm()
        setShowDeleteConfirm(false)
        setPendingDeleteId(null)
      } catch (er) {
        console.error('local delete failed', er)
        alert('Delete failed')
      }
    } finally { setLoading(false) }
  }

  const loadVendor = (id) => {
    if (!id) { clearForm(); return }
    const vendorList = Array.isArray(vendors) ? vendors : []
    const v = vendorList.find(x => String(x._id) === String(id) || String(x.id) === String(id))
    if (!v) return
    setSelectedVendorId(v._id || v.id)
    setName(v.name || '')
    setPhone(v.phone || '')
    setWebsite(v.website || '')
    setAddress(v.address || '')
    setSocial(v.social || [])
    setMenuItems(v.menuItems || [])
    // images may be stored as {id,file,url}
    setImages((v.images||[]).map(img => ({ id: img._id || img.url || Date.now()+Math.random(), url: img.url, file: null })))
    setWeeklyHours(v.weeklyHours || weeklyHours)
  }

  const removeItem = (id) => setMenuItems(prev => prev.filter(i=>i.id!==id))
  const updateItem = (id, title) => setMenuItems(prev => prev.map(i=> i.id===id ? {...i, title } : i))

  // Image handlers
  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    handleFilesArray(files)
    e.target.value = ''
  }

  const handleFilesArray = (files) => {
    if (!files || !files.length) return
    const allowed = 5 - images.length
    if (allowed <= 0) return
    const MAX_BYTES = 100 * 1024 * 1024 // 100MB
    const toAdd = files.slice(0, allowed)
    const oversized = toAdd.filter(f => f.size > MAX_BYTES)
    const acceptable = toAdd.filter(f => f.size <= MAX_BYTES)
    if (oversized && oversized.length) {
      const names = oversized.map(f => f.name).slice(0,5).join(', ')
      alert(`Some files were skipped because they exceed the 100MB limit: ${names}`)
    }
    const mapped = acceptable.map(f => ({ id: Date.now() + Math.random(), file: f, url: URL.createObjectURL(f) }))
    if (mapped.length) setImages(prev => [...prev, ...mapped])
  }

  const onDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files || [])
    handleFilesArray(files)
  }

  const onDragOver = (e) => { e.preventDefault(); }

  // Fetch persisted vendors
  const fetchVendors = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/vendors')
      // normalize server response to an array
      const data = res && res.data
      if (Array.isArray(data)) setVendors(data)
      else if (data && Array.isArray(data.vendors)) setVendors(data.vendors)
      else setVendors([])
    } catch (e) {
      console.warn('fetchVendors failed, falling back to localStorage', e && e.message)
      // Try localStorage fallback so page still works when deployed backend lacks endpoint
      try {
        const raw = localStorage.getItem('letsEatVendors')
        const parsed = raw ? JSON.parse(raw) : []
        setVendors(Array.isArray(parsed) ? parsed : [])
      } catch (er) {
        console.error('local fallback parse error', er)
        setVendors([])
      }
    } finally { setLoading(false) }
  }

  const saveLocalVendors = (list) => {
    try { localStorage.setItem('letsEatVendors', JSON.stringify(list || [])) } catch (e) { console.warn('saveLocalVendors error', e) }
  }

  useEffect(() => { fetchVendors() }, [])

  const removeImage = (id) => {
    setImages(prev => {
      const found = prev.find(p=>p.id===id)
      if (found && found.url) URL.revokeObjectURL(found.url)
      return prev.filter(p=>p.id!==id)
    })
  }

  useEffect(() => { imagesRef.current = images }, [images])
  useEffect(() => {
    return () => {
      imagesRef.current.forEach(i => { if (i.url) URL.revokeObjectURL(i.url) })
    }
  }, [])

  return (
    <ProtectedRoute>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ margin: 0 }}>Lets Eat Local</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(() => {
              const vendorList = Array.isArray(vendors) ? vendors : []
              return (
                <select value={selectedVendorId||''} onChange={e => loadVendor(e.target.value ? e.target.value : null)} style={{ padding: '6px 8px', borderRadius: 6, background: '#071317', color: '#fff' }}>
                  <option value="">-- New Vendor --</option>
                  {vendorList.map(v => <option key={v._id || v.id} value={v._id || v.id}>{v.name || v._id || v.id}</option>)}
                </select>
              )
            })()}
            <button className="btn" onClick={() => setViewMode(viewMode === 'form' ? 'list' : 'form')}>{viewMode === 'form' ? 'List View' : 'Form View'}</button>
            <button className="btn" onClick={clearForm}>New</button>
            <button className="btn btn-primary" onClick={saveVendor}>Save</button>
            <button className="btn btn-ban" onClick={deleteVendor}>Delete</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#9aa6ba', marginBottom: 6 }}>Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Restaurant / Vendor name" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: '#071317', color: '#fff' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#9aa6ba', marginBottom: 6 }}>Phone number</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+27 71 000 0000" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: '#071317', color: '#fff' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#9aa6ba', marginBottom: 6 }}>Address</label>
              <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street address or area" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: '#071317', color: '#fff' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#9aa6ba', marginBottom: 6 }}>Website</label>
              <input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://example.com" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: '#071317', color: '#fff' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', color: '#9aa6ba', marginBottom: 6 }}>Social links</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input value={newSocialPlatform} onChange={e=>setNewSocialPlatform(e.target.value)} placeholder="Platform (e.g. Instagram)" style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: '#071317', color: '#fff' }} />
                <input value={newSocialUrl} onChange={e=>setNewSocialUrl(e.target.value)} placeholder="https://..." style={{ padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: '#071317', color: '#fff', flex: 1 }} />
                <button className="btn btn-primary" onClick={addSocial}>Add</button>
              </div>
              {social && social.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {social.map((s, idx) => (
                    <div key={`${s.platform || s.url || idx}`} style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{s.platform || 'link'}</div>
                      <div style={{ color: '#9aa6ba', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</div>
                      <button className="btn" onClick={() => removeSocial(idx)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={{ marginBottom: 8 }}>Editable Menu</h3>
              <p style={{ color: '#9aa6ba', marginBottom: 8 }}>Add items below — they can be edited or removed.</p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder="New menu item (e.g. Chicken Wrap - R45)" style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: '#071317', color: '#fff' }} />
                <button onClick={addItem} className="btn btn-primary">Add</button>
              </div>

              <div>
                {menuItems.length === 0 && <div style={{ color: '#9aa6ba' }}>No items yet.</div>}
                {menuItems.map(item => (
                  <MenuItem key={item.id} item={item} onRemove={removeItem} onUpdate={updateItem} />
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <h4 style={{ marginBottom: 8 }}>Menu Pictures</h4>
                <p style={{ color: '#9aa6ba', marginBottom: 8 }}>Upload up to 5 images (jpg, png).</p>
                <div onDrop={onDrop} onDragOver={onDragOver} style={{ padding: 12, border: '2px dashed rgba(255,255,255,0.04)', borderRadius: 8, textAlign: 'center', color: '#9aa6ba' }}>
                  <div>Drag & drop images here, or click to browse</div>
                  <label style={{ display: 'inline-block', marginTop: 8, cursor: 'pointer' }}>
                    <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={images.length >= 5} style={{ display: 'none' }} />
                    <span className="btn">Browse</span>
                  </label>
                </div>
                <div style={{ marginTop: 8, color: '#9aa6ba', fontSize: 13 }}>{images.length}/5 uploaded</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {images.map(img => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <img src={img.url} alt="menu" style={{ width: 110, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }} />
                      <button onClick={() => removeImage(img.id)} style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 999, width: 22, height: 22, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <h4 style={{ marginBottom: 8 }}>Weekly Trading Hours</h4>
                <p style={{ color: '#9aa6ba', marginBottom: 8 }}>Toggle day open and add up to 3 time slots per day.</p>
                <div style={{ display: 'grid', gap: 10 }}>
                  {weeklyHours.map((d, di) => (
                    <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ width: 120, fontWeight: 700 }}>{d.day}</label>
                      <input type="checkbox" checked={d.open} onChange={() => {
                        setWeeklyHours(w => w.map((x,i)=> i===di ? {...x, open: !x.open, slots: !x.open && x.slots.length===0 ? [{start:'09:00', end:'17:00'}] : x.slots } : x))
                      }} />
                      <div style={{ flex: 1 }}>
                        {d.open ? (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {d.slots.map((s, si) => (
                              <div key={`${di}-${s.start || ''}-${s.end || ''}-${si}`} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input type="time" value={s.start} onChange={e => setWeeklyHours(w => w.map((x,i)=> i===di ? {...x, slots: x.slots.map((ss,idx)=> idx===si ? {...ss, start: e.target.value} : ss)} : x))} />
                                <span style={{ color: '#9aa6ba' }}>—</span>
                                <input type="time" value={s.end} onChange={e => setWeeklyHours(w => w.map((x,i)=> i===di ? {...x, slots: x.slots.map((ss,idx)=> idx===si ? {...ss, end: e.target.value} : ss)} : x))} />
                                <button className="btn" onClick={() => setWeeklyHours(w => w.map((x,i)=> i===di ? {...x, slots: x.slots.filter((_,idxx)=> idxx!==si)} : x))}>Remove</button>
                              </div>
                            ))}
                            {d.slots.length < 3 && <button className="btn btn-primary" onClick={() => setWeeklyHours(w => w.map((x,i)=> i===di ? {...x, slots: [...x.slots, {start:'09:00', end:'17:00'}]} : x))}>Add slot</button>}
                          </div>
                        ) : (
                          <div style={{ color: '#9aa6ba' }}>Closed</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}>
              <h4 style={{ marginTop: 0 }}>Preview</h4>
              <p style={{ color: '#9aa6ba' }}>How the listing will appear.</p>

              <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{name || 'Vendor name'}</div>
                <div style={{ color: '#9aa6ba', marginBottom: 6 }}>{phone || 'Phone number'}</div>
                {address && <div style={{ color: '#9aa6ba', marginBottom: 6 }}>{address}</div>}
                {website && <div style={{ marginBottom: 6 }}><a href={website} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>{website}</a></div>}
                {social && social.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    {social.map((s, i) => <a key={s.url || s.platform || i} href={s.url} target="_blank" rel="noreferrer" style={{ color: '#9aa6ba' }}>{s.platform || s.url}</a>)}
                  </div>
                )}

                <div style={{ marginTop: 8 }}>
                  {images.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {images.map(img => (
                        <img key={img.id} src={img.url} alt="preview" style={{ width: 84, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }} />
                      ))}
                    </div>
                  )}

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700 }}>Trading Hours</div>
                    {weeklyHours.map(w => (
                      <div key={w.day} style={{ color: '#9aa6ba', fontSize: 13 }}>
                        <strong>{w.day}:</strong> {w.open ? w.slots.map(s => `${s.start}-${s.end}`).join(', ') : 'Closed'}
                      </div>
                    ))}
                  </div>

                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Menu</div>
                  {menuItems.length === 0 && <div style={{ color: '#9aa6ba' }}>No menu items</div>}
                  <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                    {menuItems.map(i=> (
                      <li key={i.id} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>{i.title}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Saved vendor cards shown beneath the form/preview for quick visual confirmation */}
        {Array.isArray(vendors) && vendors.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <h3>Saved Listings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginTop: 10 }}>
              {vendors.map(v => (
                <div
                  key={v._id || v.id}
                  onClick={() => loadVendor(v._id || v.id)}
                  role="button"
                  tabIndex={0}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: selectedVendorId && (String(selectedVendorId) === String(v._id || v.id)) ? 'linear-gradient(180deg,#0b2230,#071317)' : 'rgba(255,255,255,0.02)',
                    border: selectedVendorId && (String(selectedVendorId) === String(v._id || v.id)) ? '1px solid rgba(96,165,250,0.16)' : '1px solid rgba(255,255,255,0.03)',
                    boxShadow: '0 6px 20px rgba(2,6,23,0.45)',
                    transition: 'transform 160ms ease, box-shadow 160ms ease',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 120
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadVendor(v._id || v.id) }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 72, height: 56, background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {v.images && v.images[0] ? (
                        <img src={v.images[0].url} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ color: '#9aa6ba', padding: 6, fontSize: 13 }}>No Image</div>
                      )}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: '#e6eef6', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                        {v.local && <span style={{ fontSize: 11, color: '#94a3b8', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: 6 }}>local</span>}
                      </div>

                      <div style={{ color: '#9aa6ba', fontSize: 13, marginBottom: 6 }}>{v.phone || ''}</div>

                      {v.address && <div style={{ color: '#9aa6ba', fontSize: 12, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.address}</div>}

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {v.website && (
                          <a href={v.website} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} style={{ color: '#60a5fa', fontSize: 12, textDecoration: 'none', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.website}</a>
                        )}

                        {v.social && v.social.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {v.social.map((s, i) => (
                              <a
                                key={(s.url || s.platform || i)}
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e)=>e.stopPropagation()}
                                title={s.platform || s.url}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, color: '#9aa6ba', fontSize: 12, textDecoration: 'none' }}
                              >
                                <span style={{ fontSize: 12, opacity: 0.9 }}>{(s.platform || '').slice(0,2).toUpperCase()}</span>
                                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(s.platform || s.url || '').replace(/^https?:\/\//, '')}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button className="btn" onClick={(e) => { e.stopPropagation(); loadVendor(v._id || v.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                    <button className="btn btn-ban" onClick={(e) => { e.stopPropagation(); setPendingDeleteId(v._id || v.id); setShowDeleteConfirm(true); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'list' && (
          <div style={{ marginTop: 18 }}>
            <h3>Vendors</h3>
            <div style={{ border: '1px solid rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: 8 }}>Name</th>
                    <th style={{ padding: 8 }}>Phone</th>
                    <th style={{ padding: 8 }}>Created</th>
                    <th style={{ padding: 8 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(vendors || []).slice((page-1)*pageSize, (page)*pageSize).map(v => (
                    <tr key={v._id || v.id} style={{ borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: 8 }}>{v.name}</td>
                      <td style={{ padding: 8 }}>{v.phone}</td>
                      <td style={{ padding: 8 }}>{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}</td>
                      <td style={{ padding: 8 }}>
                        <button className="btn" onClick={() => { loadVendor(v._id || v.id); setViewMode('form') }}>Edit</button>
                        <button className="btn btn-ban" onClick={() => { setPendingDeleteId(v._id || v.id); setShowDeleteConfirm(true) }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn" onClick={() => setPage(Math.max(1, page-1))} disabled={page===1}>Prev</button>
              <div style={{ alignSelf: 'center', color: '#9aa6ba' }}>Page {page} / {Math.max(1, Math.ceil((vendors.length||0)/pageSize))}</div>
              <button className="btn" onClick={() => setPage(p => Math.min(Math.max(1, Math.ceil((vendors.length||0)/pageSize)), p+1))} disabled={page >= Math.ceil((vendors.length||0)/pageSize)}>Next</button>
            </div>
          </div>
        )}
        {showDeleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
            <div style={{ background: '#071317', padding: 18, borderRadius: 10, width: 420, boxShadow: '0 6px 30px rgba(0,0,0,0.6)' }}>
              <h3 style={{ marginTop: 0 }}>Confirm Delete</h3>
              <p style={{ color: '#cbd5e1' }}>Are you sure you want to delete this vendor? This action cannot be undone.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={() => { setShowDeleteConfirm(false); setPendingDeleteId(null) }}>Cancel</button>
                <button className="btn btn-ban" onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

// Modal rendering placed outside main return to keep file simple
// The modal markup is included inside the component above via state booleans.

function MenuItem({ item, onRemove, onUpdate }){
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(item.title)

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
      {editing ? (
        <input value={text} onChange={e=>setText(e.target.value)} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', background: '#071317', color: '#fff' }} />
      ) : (
        <div style={{ flex: 1 }}>{item.title}</div>
      )}
      {editing ? (
        <>
          <button className="btn" onClick={() => { onUpdate(item.id, text); setEditing(false); }}>Save</button>
          <button className="btn" onClick={() => { setText(item.title); setEditing(false); }}>Cancel</button>
        </>
      ) : (
        <>
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
          <button className="btn btn-ban" onClick={() => onRemove(item.id)}>Delete</button>
        </>
      )}
    </div>
  )
}
