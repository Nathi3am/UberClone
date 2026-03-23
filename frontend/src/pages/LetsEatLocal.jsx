import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://vexomove.onrender.com';

export default function LetsEatLocal() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/vendors`);
        const data = res.data;
        if (Array.isArray(data)) setVendors(data);
        else if (data && Array.isArray(data.vendors)) setVendors(data.vendors);
        else setVendors([]);
      } catch (e) {
        setError('Failed to load vendors');
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Lets Eat Local</h1>
      {loading && <p>Loading vendors...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && vendors.length === 0 && <p>No vendors found.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {vendors.map(vendor => (
          <div key={vendor._id || vendor.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, minWidth: 220 }}>
            <h2 style={{ margin: '0 0 8px 0' }}>{vendor.name}</h2>
            {vendor.phone && <p>Phone: {vendor.phone}</p>}
            {Array.isArray(vendor.menuItems) && vendor.menuItems.length > 0 && (
              <div>
                <strong>Menu:</strong>
                <ul>
                  {vendor.menuItems.map(item => (
                    <li key={item.id || item.title}>{item.title}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(vendor.images) && vendor.images.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {vendor.images.map((img, idx) => (
                  <img key={img._id || img.url || idx} src={img.url} alt="Vendor" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
