import React, { useEffect, useState } from 'react';
import axios from 'axios';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .cm-root {
    min-height: 100vh;
    background: #080810;
    font-family: 'DM Sans', sans-serif;
    color: #e2e2f0;
    display: flex; align-items: flex-start;
    position: relative;
  }
  .cm-wrap {
    position: relative; z-index: 1;
    max-width: 560px;
    width: 100%;
    padding: 40px 32px 80px;
  }

  .cm-title {
    font-family: 'Syne', sans-serif;
    font-size: 28px; font-weight: 800;
    letter-spacing: -0.4px; color: #f0f0fa;
    margin-bottom: 6px;
  }
  .cm-title span {
    background: linear-gradient(90deg, #6366f1, #10b981);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .cm-sub { font-size: 13px; color: #5050a0; margin-bottom: 36px; }

  .cm-card {
    background: linear-gradient(135deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 22px; padding: 32px;
    position: relative; overflow: hidden;
  }
  .cm-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #6366f1, #10b981);
  }

  .cm-label {
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: #5050a0; margin-bottom: 8px; display: block;
  }
  .cm-input-wrap { position: relative; margin-bottom: 20px; }
  .cm-input {
    width: 100%;
    padding: 14px 46px 14px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    color: #e8e8f8; font-size: 22px; font-weight: 700;
    font-family: 'Syne', sans-serif;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
  }
  .cm-input:focus {
    border-color: rgba(99,102,241,0.5);
    background: rgba(99,102,241,0.06);
  }
  .cm-suffix {
    position: absolute; right: 14px; top: 50%;
    transform: translateY(-50%);
    font-size: 16px; color: #5050a0; font-weight: 600;
  }

  .cm-bar {
    height: 8px; border-radius: 99px;
    background: rgba(255,255,255,0.05);
    overflow: hidden; margin-bottom: 8px;
  }
  .cm-bar-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #6366f1, #10b981);
    transition: width 0.4s ease;
  }
  .cm-bar-labels {
    display: flex; justify-content: space-between;
    font-size: 12px; color: #5050a0; margin-bottom: 24px;
  }

  .cm-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff; border: none; border-radius: 14px;
    font-size: 14px; font-weight: 700;
    font-family: 'Syne', sans-serif;
    cursor: pointer; transition: all 0.2s;
    box-shadow: 0 4px 18px rgba(99,102,241,0.3);
  }
  .cm-btn:hover { transform: translateY(-1px); }
  .cm-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .cm-toast {
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    padding: 13px 22px; border-radius: 14px;
    font-size: 14px; font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: slideUp 0.3s ease;
  }
  .cm-toast-success { background: #10b981; color: #fff; }
  .cm-toast-error { background: #ef4444; color: #fff; }
  @keyframes slideUp {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

export default function Commission() {
  const [commission, setCommission] = useState(20);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const API = import.meta.env.VITE_BASE_URL || 'http://localhost:4000';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API}/admin/pricing`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const data = res.data || {};
        if (typeof data.commissionRate === 'number') setCommission(data.commissionRate);
      }).catch(() => {});
  }, []);

  const save = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/admin/pricing`, { commissionRate: Number(commission) }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Commission rate updated ✓');
    } catch {
      showToast('Failed to update', 'error');
    } finally { setLoading(false); }
  };

  const pct = Math.min(Math.max(Number(commission) || 0, 0), 100);

  return (
    <>
      <style>{styles}</style>
      {toast && <div className={`cm-toast cm-toast-${toast.type}`}>{toast.msg}</div>}
      <div className="cm-root">
        <div className="cm-wrap">
          <h1 className="cm-title">Platform <span>Commission</span></h1>
          <p className="cm-sub">Set the percentage the platform takes from each ride</p>

          <div className="cm-card">
            <label className="cm-label">Commission Rate</label>
            <div className="cm-input-wrap">
              <input
                className="cm-input"
                type="number"
                min="0" max="100"
                value={commission}
                onChange={e => setCommission(e.target.value)}
              />
              <span className="cm-suffix">%</span>
            </div>

            <div className="cm-bar">
              <div className="cm-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="cm-bar-labels">
              <span>Platform: {pct}%</span>
              <span>Driver: {100 - pct}%</span>
            </div>

            <button className="cm-btn" onClick={save} disabled={loading}>
              {loading ? 'Saving…' : 'Save Commission Rate'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

