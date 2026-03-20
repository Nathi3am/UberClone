import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { socket } from '../context/SocketContext'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .lg-root {
    min-height: 100vh;
    background: #080810;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .lg-root::before {
    content: '';
    position: fixed;
    top: -30%;
    left: 50%;
    transform: translateX(-50%);
    width: 800px; height: 600px;
    background: radial-gradient(ellipse, rgba(99,102,241,0.14) 0%, transparent 65%);
    pointer-events: none;
  }
  .lg-root::after {
    content: '';
    position: fixed;
    bottom: -20%;
    right: -10%;
    width: 500px; height: 500px;
    background: radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 65%);
    pointer-events: none;
  }

  .lg-card {
    position: relative; z-index: 1;
    width: 100%;
    max-width: 440px;
    background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 28px;
    padding: 48px 40px;
    backdrop-filter: blur(20px);
    box-shadow: 0 24px 80px rgba(0,0,0,0.5);
    overflow: hidden;
  }
  .lg-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #6366f1, #10b981);
  }

  .lg-logo {
    width: 52px; height: 52px;
    background: linear-gradient(135deg, #6366f1, #818cf8);
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    margin: 0 auto 24px;
  }

  .lg-title {
    font-family: 'Syne', sans-serif;
    font-size: 26px;
    font-weight: 800;
    color: #f0f0fa;
    text-align: center;
    letter-spacing: -0.4px;
    margin-bottom: 6px;
  }
  .lg-sub {
    text-align: center;
    font-size: 13px;
    color: #5050a0;
    margin-bottom: 36px;
  }

  .lg-field {
    margin-bottom: 16px;
  }
  .lg-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #5050a0;
    margin-bottom: 8px;
  }
  .lg-input {
    width: 100%;
    padding: 13px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    color: #e8e8f8;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.2s, background 0.2s;
    outline: none;
  }
  .lg-input::placeholder { color: #3a3a70; }
  .lg-input:focus {
    border-color: rgba(99,102,241,0.5);
    background: rgba(99,102,241,0.06);
  }

  .lg-btn {
    width: 100%;
    margin-top: 24px;
    padding: 14px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff;
    border: none;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 700;
    font-family: 'Syne', sans-serif;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
  }
  .lg-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(99,102,241,0.45); }
  .lg-btn:active { transform: translateY(0); }
  .lg-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .lg-error {
    margin-top: 14px;
    padding: 12px 16px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 10px;
    color: #ef4444;
    font-size: 13px;
    text-align: center;
  }
  .lg-clear-btn {
    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
    background: rgba(255,255,255,0.03); border: 0; color: rgba(255,255,255,0.6);
    padding: 6px 8px; border-radius: 8px; cursor: pointer; font-size: 13px;
  }
  .lg-clear-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
`;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post("http://localhost:4000/admin/login", { email, password });
      if (res.data?.token) {
        // Store token under multiple keys to remain compatible with different admin clients
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("admin_token", res.data.token);
        localStorage.setItem("adminToken", res.data.token);
        if (res.data.user?.role) localStorage.setItem("role", res.data.user.role);
        if (res.data.user?.id) {
          localStorage.setItem('userId', res.data.user.id);
          try { socket.emit('join', { userId: res.data.user.id, userType: 'admin' }); } catch (e) {}
        }
        navigate("/admin/dashboard");
      }
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="lg-root">
        <div className="lg-card">
          <div className="lg-logo">🚗</div>
          <h1 className="lg-title">Admin Portal</h1>
          <p className="lg-sub">Sign in to manage your platform</p>

          <form onSubmit={handleLogin} autoComplete="off">
            {/* Hidden dummy inputs to reduce browser autofill interference */}
            <input type="text" name="no_autofill_user" autoComplete="username" style={{position:'absolute',left:-9999,top:-9999}} />
            <input type="password" name="no_autofill_pass" autoComplete="new-password" style={{position:'absolute',left:-9999,top:-9999}} />
            <div className="lg-field" style={{ position: 'relative' }}>
              <label className="lg-label">Email Address</label>
              <input
                className="lg-input"
                type="email"
                name="email"
                autoComplete="off"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Admin email"
              />
              {email && (
                <button type="button" className="lg-clear-btn" onClick={() => { setEmail(''); }} aria-label="Clear email">✕</button>
              )}
            </div>
            <div className="lg-field">
              <label className="lg-label">Password</label>
              <input
                className="lg-input"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="lg-btn" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          {error && <div className="lg-error">{error}</div>}
        </div>
      </div>
    </>
  );
}
