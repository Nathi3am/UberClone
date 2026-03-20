import React, { useEffect, useState } from 'react'
import axios from 'axios'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .po-root {
    min-height: 100vh;
    background: #080810;
    font-family: 'DM Sans', sans-serif;
    color: #e2e2f0;
    position: relative; overflow-x: hidden;
  }
  .po-root::before {
    content: '';
    position: fixed; top: -20%; left: -10%;
    width: 700px; height: 700px;
    background: radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 65%);
    pointer-events: none; z-index: 0;
  }

  .po-wrap {
    position: relative; z-index: 1;
    max-width: 1180px; margin: 0 auto;
    padding: 40px 32px 80px;
  }

  .po-header {
    display: flex; align-items: center;
    justify-content: space-between;
    flex-wrap: wrap; gap: 12px;
    margin-bottom: 40px;
  }
  .po-title {
    font-family: 'Syne', sans-serif;
    font-size: 30px; font-weight: 800;
    letter-spacing: -0.5px; color: #f0f0fa;
  }
  .po-title span {
    background: linear-gradient(90deg, #6366f1, #10b981);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .po-count {
    font-size: 13px; color: #5050a0;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    padding: 6px 14px; border-radius: 30px;
  }

  .po-export-btn {
    padding: 10px 20px;
    background: rgba(99,102,241,0.12);
    border: 1px solid rgba(99,102,241,0.3);
    color: #818cf8;
    border-radius: 12px;
    font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .po-export-btn:hover {
    background: rgba(99,102,241,0.2);
    transform: translateY(-1px);
  }

  .po-section-label {
    font-family: 'Syne', sans-serif;
    font-size: 11px; font-weight: 700;
    letter-spacing: 0.15em; text-transform: uppercase;
    color: #6366f1; margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px;
  }
  .po-section-label::after {
    content: ''; flex: 1; height: 1px;
    background: rgba(99,102,241,0.2);
  }

  .po-table-wrap {
    background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 22px; overflow: hidden;
    position: relative;
  }
  .po-table-wrap::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #6366f1, #10b981);
  }

  .po-table { width: 100%; border-collapse: collapse; }
  .po-table thead tr { background: rgba(0,0,0,0.3); }
  .po-table thead th {
    padding: 14px 18px;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: #5050a0; text-align: left; white-space: nowrap;
  }
  .po-table tbody tr {
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.18s;
  }
  .po-table tbody tr:last-child { border-bottom: none; }
  .po-table tbody tr:hover { background: rgba(99,102,241,0.05); }
  .po-table td { padding: 14px 18px; font-size: 13px; vertical-align: middle; }

  .po-avatar {
    width: 38px; height: 38px;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid rgba(255,255,255,0.1);
  }
  .po-initials {
    width: 38px; height: 38px;
    border-radius: 10px;
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.2);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 700; color: #818cf8;
  }

  .po-driver-name { font-weight: 600; color: #e0e0f0; }
  .po-date { font-size: 12px; color: #7070a0; }
  .po-amount {
    font-family: 'Syne', sans-serif;
    font-size: 16px; font-weight: 700; color: #10b981;
  }

  .po-method-badge {
    display: inline-block;
    padding: 4px 10px; border-radius: 30px;
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.06em;
    background: rgba(99,102,241,0.12);
    color: #818cf8;
    border: 1px solid rgba(99,102,241,0.2);
  }

  .po-notes { font-size: 12px; color: #5050a0; font-style: italic; }

  .po-empty {
    text-align: center; padding: 56px 20px;
    color: #4040a0; font-size: 14px;
  }

  .po-loader {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-height: 100vh; background: #080810; gap: 16px;
  }
  .po-spinner {
    width: 38px; height: 38px;
    border: 3px solid rgba(99,102,241,0.2);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .po-loader-text { color: #5050a0; font-size: 14px; }
`;

export default function PayoutsRecords() {
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const formatDate = (v) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const s = String(v);
      if (/^[0-9a-fA-F]{24}$/.test(s)) {
        const d2 = new Date(parseInt(s.substring(0, 8), 16) * 1000);
        if (!isNaN(d2.getTime())) return d2.toLocaleString();
      }
    } catch {}
    return '—';
  };

  const exportCSV = () => {
    if (!payouts.length) return;
    const rows = payouts.map(p => {
      const name = p.driver?.fullname?.firstname ? `${p.driver.fullname.firstname} ${p.driver.fullname.lastname || ''}` : (p.driver?.email || 'Unknown');
      return { date: formatDate(p.paidAt || p.createdAt || p._id), driver: name, amount: Number(p.amount || 0).toFixed(2), method: p.method || 'EFT', notes: p.notes || '' };
    });
    const header = Object.keys(rows[0]).join(',') + '\n';
    const body = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payouts_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:4000/admin/payouts', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!mounted) return;
        setPayouts(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (!mounted) return;
        setError('Unable to load payouts');
      } finally { if (mounted) setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="po-loader"><div className="po-spinner" /><p className="po-loader-text">Loading payouts…</p></div>
    </>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="po-root">
        <div className="po-wrap">
          <div className="po-header">
            <div>
              <h1 className="po-title">Payout <span>Records</span></h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="po-count">{payouts.length} records</span>
              <button className="po-export-btn" onClick={exportCSV}>↓ Export CSV</button>
            </div>
          </div>

          {error && (
            <div style={{ padding: '14px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#ef4444', marginBottom: 24, fontSize: 13 }}>{error}</div>
          )}

          <div className="po-section-label">All Payouts</div>
          <div className="po-table-wrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Driver</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr><td colSpan="6" className="po-empty">No payout records found</td></tr>
                ) : payouts.map(p => {
                  const name = p.driver?.fullname?.firstname
                    ? `${p.driver.fullname.firstname} ${p.driver.fullname.lastname || ''}`.trim()
                    : (p.driver?.email || 'Unknown');
                  const avatar = p.driver?.avatar || p.driver?.photo || null;
                  return (
                    <tr key={p._id}>
                      <td>
                        {avatar
                          ? <img src={avatar} alt={name} className="po-avatar" />
                          : <div className="po-initials">{getInitials(name)}</div>}
                      </td>
                      <td><div className="po-driver-name">{name}</div></td>
                      <td><div className="po-date">{formatDate(p.paidAt || p.createdAt || p._id)}</div></td>
                      <td><div className="po-amount">R{Number(p.amount || 0).toFixed(2)}</div></td>
                      <td><span className="po-method-badge">{(p.method || 'EFT').toUpperCase()}</span></td>
                      <td><span className="po-notes">{p.notes || '—'}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

