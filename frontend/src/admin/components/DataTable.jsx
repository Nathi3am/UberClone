import React from 'react';

export default function DataTable({ columns = [], data = [] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left', padding: 12, background: 'rgba(255,255,255,0.02)', color: '#cbd5e1' }}>{c.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: 12 }}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
