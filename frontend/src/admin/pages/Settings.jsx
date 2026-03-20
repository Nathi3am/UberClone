import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { AdminContext } from '../context/AdminContext';

export default function Settings(){
  const [settings, setSettings] = useState({ maintenance:false, realtime:true });
  const { token } = useContext(AdminContext) || {};

  // Account form state
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [emailMsg, setEmailMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState(null);

  useEffect(()=>{
    const s = localStorage.getItem('admin_settings');
    if(s) setSettings(JSON.parse(s));

    // load current admin email if available
    (async ()=>{
      try {
        if (!token) return;
        const resp = await axios.get(`${API_BASE_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (resp && resp.data && resp.data.user && resp.data.user.email) setEmail(resp.data.user.email);
      } catch (e) {
        // ignore silently
      }
    })();
  },[token]);

  const toggle = (k)=>{
    const next = {...settings, [k]:!settings[k]};
    setSettings(next); localStorage.setItem('admin_settings', JSON.stringify(next));
  };

  const sendOtp = async (e) => {
    e && e.preventDefault();
    try {
      if (!email) { setEmailMsg({ type: 'error', text: 'Enter valid email' }); return; }
      await axios.post(`${API_BASE_URL}/api/otp/send-email`, { email: email });
      setOtpSent(true);
      setEmailMsg({ type: 'success', text: 'OTP sent to email. Check your inbox.' });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to send OTP';
      setEmailMsg({ type: 'error', text: msg });
    }
  };

  const updateEmail = async (e) => {
    e && e.preventDefault();
    try {
      if (!token) { setEmailMsg({ type: 'error', text: 'Not authenticated' }); return; }
      const resp = await axios.put(`${API_BASE_URL}/users/update-profile`, { email, code: otpCode }, { headers: { Authorization: `Bearer ${token}` } });
      setEmailMsg({ type: 'success', text: resp.data && resp.data.message ? resp.data.message : 'Email updated' });
      setOtpSent(false);
      setOtpCode('');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update email';
      setEmailMsg({ type: 'error', text: msg });
    }
  };

  const changePassword = async (e) => {
    e && e.preventDefault();
    try {
      if (!token) { setPwdMsg({ type: 'error', text: 'Not authenticated' }); return; }
      const resp = await axios.put(`${API_BASE_URL}/users/change-password`, { currentPassword, newPassword, confirmPassword }, { headers: { Authorization: `Bearer ${token}` } });
      setPwdMsg({ type: 'success', text: resp.data && resp.data.message ? resp.data.message : 'Password changed' });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to change password';
      setPwdMsg({ type: 'error', text: msg });
    }
  };

  return (
    <div>
      <h2 style={{ color: '#fff' }}>System Settings</h2>
      <div style={{ marginTop:12, display:'grid', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:520 }}>
          <div>
            <div style={{ fontWeight:700, color: '#fff' }}>Maintenance Mode</div>
            <div style={{ color:'#94a3b8' }}>Toggle maintenance mode for all users</div>
          </div>
          <button onClick={()=>toggle('maintenance')}>{settings.maintenance ? 'Disable' : 'Enable'}</button>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', maxWidth:520 }}>
          <div>
            <div style={{ fontWeight:700, color: '#fff' }}>Real-time Updates</div>
            <div style={{ color:'#94a3b8' }}>Enable or disable socket updates</div>
          </div>
          <button onClick={()=>toggle('realtime')}>{settings.realtime ? 'Disable' : 'Enable'}</button>
        </div>
      </div>

      <hr style={{ margin: '20px 0', borderColor: '#1f2937' }} />

      <section style={{ maxWidth:720 }}>
        <h3 style={{ color: '#fff', marginBottom: 8 }}>Admin Account</h3>

        <div style={{ display: 'grid', gap: 10, background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
          <label style={{ color: '#94a3b8' }}>Email address</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="admin@example.com" style={{ padding: '8px 10px', borderRadius: 8, background: 'transparent', border: '1px solid #334155', color: '#fff' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={sendOtp} style={{ padding: '8px 12px', borderRadius: 8 }}>Send OTP</button>
            <button onClick={updateEmail} style={{ padding: '8px 12px', borderRadius: 8 }} disabled={!otpSent}>Update Email</button>
          </div>
          {otpSent && (
            <div>
              <label style={{ color: '#94a3b8' }}>Enter OTP</label>
              <input value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} placeholder="123456" style={{ padding: '8px 10px', borderRadius: 8, background: 'transparent', border: '1px solid #334155', color: '#fff' }} />
            </div>
          )}
          {emailMsg && <div style={{ color: emailMsg.type === 'error' ? '#ef4444' : '#10b981' }}>{emailMsg.text}</div>}
        </div>

        <div style={{ height: 18 }} />

        <div style={{ display:'grid', gap:10, background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius:12, border: '1px solid rgba(255,255,255,0.03)' }}>
          <h4 style={{ color:'#fff', margin: 0 }}>Change Password</h4>
          <label style={{ color: '#94a3b8' }}>Current password</label>
          <input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} style={{ padding: '8px 10px', borderRadius:8, background: 'transparent', border: '1px solid #334155', color: '#fff' }} />
          <label style={{ color: '#94a3b8' }}>New password</label>
          <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} style={{ padding: '8px 10px', borderRadius:8, background: 'transparent', border: '1px solid #334155', color: '#fff' }} />
          <label style={{ color: '#94a3b8' }}>Confirm new password</label>
          <input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} style={{ padding: '8px 10px', borderRadius:8, background: 'transparent', border: '1px solid #334155', color: '#fff' }} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={changePassword} style={{ padding: '8px 12px', borderRadius:8 }}>Change Password</button>
          </div>
          {pwdMsg && <div style={{ color: pwdMsg.type === 'error' ? '#ef4444' : '#10b981' }}>{pwdMsg.text}</div>}
        </div>
      </section>
    </div>
  );
}
