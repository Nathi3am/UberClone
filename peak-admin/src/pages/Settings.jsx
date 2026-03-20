import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = 'http://localhost:4000';

export default function Settings(){
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [message, setMessage] = useState(null);
  const otpRef = useRef(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMessage, setPwdMessage] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await axios.get(`${API}/users/profile`, { headers: getAuthHeaders() });
        if (!mounted) return;
        const u = resp.data && resp.data.user ? resp.data.user : null;
        if (u) {
          setAdminEmail(u.email || '');
          const name = (u.fullname && (u.fullname.firstname || u.fullname.lastname)) ? `${u.fullname.firstname || ''} ${u.fullname.lastname || ''}`.trim() : (u.name || '');
          setAdminName(name);
          setEmailInput(u.email || '');
        }
      } catch (e) {
        console.error('profile load error', e && e.response ? e.response.data : e);
        setMessage({ type: 'error', text: 'Unable to load profile' });
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const sendOtp = async (e) => {
    e && e.preventDefault();
    try {
      if (!emailInput || !emailInput.includes('@')) { setMessage({ type: 'error', text: 'Enter valid email' }); return; }
      await axios.post(`${API}/api/otp/send-email`, { email: emailInput });
      setOtpSent(true);
      setMessage({ type: 'success', text: 'OTP sent to email' });
      setTimeout(() => { try { otpRef.current && otpRef.current.focus(); } catch (e) {} }, 120);
    } catch (err) {
      const txt = err?.response?.data?.message || err.message || 'Failed to send OTP';
      setMessage({ type: 'error', text: txt });
    }
  };

  const updateEmail = async (e) => {
    e && e.preventDefault();
    try {
      if (!otpCode || !emailInput) { setMessage({ type: 'error', text: 'Provide OTP and email' }); return; }
      const resp = await axios.put(`${API}/users/update-profile`, { email: emailInput, code: otpCode }, { headers: getAuthHeaders() });
      setMessage({ type: 'success', text: resp.data && resp.data.message ? resp.data.message : 'Email updated' });
      setAdminEmail(emailInput);
      setOtpSent(false);
      setOtpCode('');
    } catch (err) {
      const txt = err?.response?.data?.message || err.message || 'Failed to update email';
      setMessage({ type: 'error', text: txt });
    }
  };

  return (
    <div className="settings-page" style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 6 }}>Settings</h1>
      <p className="lead">Manage admin account details.</p>

      {loading && <div>Loading…</div>}

      {!loading && (
        <div style={{ maxWidth: 720, display: 'grid', gap: 12 }}>
          <div className="settings-card">
            <h3 style={{ margin: 0 }}>Admin Account</h3>
            <div className="settings-row" style={{ marginTop: 8 }}>
              <div className="settings-label">Name</div>
              <div className="settings-value">{adminName || '—'}</div>
              {/* name change control removed */}
              <div className="settings-label">Email</div>
              <div className="settings-value">{adminEmail || '—'}</div>
            </div>
          </div>

          <div className="settings-card">
            <h4 style={{ margin: 0 }}>Change Email (OTP verification)</h4>
            <label className="settings-label" style={{ marginTop: 8 }}>New email</label>
            <input className="form-input" value={emailInput} onChange={(e)=>setEmailInput(e.target.value)} placeholder="new-admin@example.com" />
            <div className="form-actions">
              <button className="btn btn-primary" onClick={async () => {
                if (!otpSent) {
                  await sendOtp();
                  return;
                }
                await updateEmail();
              }} type="button">Update Email</button>
            </div>
            {otpSent && (
              <div className="otp-row" style={{ marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label className="settings-label">Enter OTP</label>
                  <input ref={otpRef} className="form-input" value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} placeholder="123456" />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={async () => { await updateEmail(); }} type="button">Update</button>
                </div>
              </div>
            )}
          </div>

          {message && <div className={message.type === 'error' ? 'error-msg' : 'success-msg'}>{message.text}</div>}
        </div>
      )}

      {/* Change password section */}
      {!loading && (
        <div style={{ maxWidth: 720, marginTop: 14 }}>
          <div className="settings-card">
            <h4 style={{ margin: 0 }}>Change Password</h4>
            <label className="settings-label" style={{ marginTop: 8 }}>Current password</label>
            <input className="form-input" type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} placeholder="Current password" />
            <label className="settings-label" style={{ marginTop: 8 }}>New password</label>
            <input className="form-input" type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="New password" />
            <label className="settings-label" style={{ marginTop: 8 }}>Confirm new password</label>
            <input className="form-input" type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            <div className="form-actions">
              <button className="btn btn-primary" onClick={async (e)=>{
                e.preventDefault();
                try {
                  setPwdMessage(null);
                  if (!currentPassword || !newPassword || !confirmPassword) { setPwdMessage({ type: 'error', text: 'Fill all password fields' }); return; }
                  if (newPassword !== confirmPassword) { setPwdMessage({ type: 'error', text: 'New passwords do not match' }); return; }
                  const resp = await axios.put(`${API}/users/change-password`, { currentPassword, newPassword, confirmPassword }, { headers: getAuthHeaders() });
                  setPwdMessage({ type: 'success', text: resp.data && resp.data.message ? resp.data.message : 'Password changed' });
                  setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
                } catch (err) {
                  const txt = err?.response?.data?.message || err.message || 'Failed to change password';
                  setPwdMessage({ type: 'error', text: txt });
                }
              }}>Change Password</button>
            </div>
            {pwdMessage && <div className={pwdMessage.type === 'error' ? 'error-msg' : 'success-msg'} style={{ marginTop: 8 }}>{pwdMessage.text}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

