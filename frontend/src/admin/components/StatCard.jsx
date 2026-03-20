import React from 'react';

export default function StatCard({ title = '', value = '', delta = null }) {
	const deltaStyle = {
		color: delta === null ? '#94a3b8' : (Number(delta) >= 0 ? '#34d399' : '#fb7185'),
		fontWeight: 600,
		marginLeft: 8,
	};

	const cardStyle = {
		background: '#0b1220',
		padding: 16,
		borderRadius: 12,
		minWidth: 160,
		color: '#e6eef6',
		boxShadow: '0 6px 18px rgba(2,6,23,0.6)'
	};

	return (
		<div style={cardStyle}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
				<div style={{ fontSize: 12, color: '#94a3b8' }}>{title}</div>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					<div style={deltaStyle}>{delta !== null ? (Number(delta) > 0 ? `+${delta}` : `${delta}`) : ''}</div>
				</div>
			</div>
			<div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{value}</div>
		</div>
	);
}
