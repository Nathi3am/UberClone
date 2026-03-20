import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function SpecialTripDrivers() {
	const [drivers, setDrivers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		axios.get('http://localhost:4000/admin/special-requests', {
			headers: {
				Authorization: `Bearer ${localStorage.getItem('token')}`
			}
		})
			.then(res => {
				setDrivers(Array.isArray(res.data?.data) ? res.data.data : []);
				setLoading(false);
			})
			.catch(() => {
				setError('Failed to load drivers');
				setLoading(false);
			});
	}, []);

	if (loading) return <div style={{color:'#fff'}}>Loading…</div>;
	if (error) return <div style={{color:'#f87171'}}>{error}</div>;

	return (
		<div style={{ padding: 24, color: '#e2e8f0' }}>
			<h2 style={{ fontSize: 26, marginBottom: 16 }}>Trips - Special Drivers</h2>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
				{drivers.map(driver => (
					<div key={driver._id || driver.id} style={{ border: '1px solid #334155', borderRadius: 12, padding: 18, background: 'rgba(15,23,42,0.85)' }}>
						<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
							<img
								src={driver.imageUrl ? (driver.imageUrl.startsWith('http') ? driver.imageUrl : `http://localhost:4000${driver.imageUrl}`) : 'https://via.placeholder.com/100?text=No+Img'}
								alt={driver.name || 'Driver'}
								style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, border: '1px solid #64748b' }}
							/>
							<div>
								<h3 style={{ margin: 0, fontSize: 20, color: '#fff' }}>{driver.name || 'No Name'}</h3>
								<div style={{ color: '#a5b4fc', fontSize: 15, margin: '4px 0' }}><b>Surname:</b> {driver.surname || '-'}</div>
								<div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Number Plate:</b> {driver.plateNumber || driver.availableIn || '-'}</div>
								<div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Email:</b> {driver.contactEmail || '-'}</div>
								<div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Phone:</b> {driver.contactPhone || '-'}</div>
								<div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Hourly Rate:</b> R{driver.hourly ?? '-'}</div>
								<div style={{ color: '#a5b4fc', fontSize: 15 }}><b>Day Rate:</b> R{driver.daily ?? '-'}</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
