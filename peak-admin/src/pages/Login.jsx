import React from "react";
import { useState } from "react";
import axios from 'axios';
import { socket } from '../context/SocketContext'
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    (async () => {
      try {
        const res = await axios.post('http://localhost:4000/admin/login', { email, password });
        if (res.data && res.data.token) {
          localStorage.setItem('token', res.data.token);
          if (res.data.user && res.data.user.role) localStorage.setItem('role', res.data.user.role);
          if (res.data.user && res.data.user.id) {
            localStorage.setItem('userId', res.data.user.id);
            try { socket.emit('join', { userId: res.data.user.id, userType: 'admin' }); } catch (e) {}
          }
          navigate('/admin/dashboard');
        }
      } catch (err) {
        alert('Login failed');
      }
    })();
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(8px)',
    padding: '32px',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(2,6,23,0.6)',
    border: '1px solid rgba(255,255,255,0.08)'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    marginBottom: '12px'
  };

  const btnStyle = {
    width: '100%',
    background: '#2563eb',
    color: '#fff',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer'
  };

  const titleStyle = { textAlign: 'center', fontSize: '28px', marginBottom: '18px' };

  return (
    <div style={cardStyle}>
      <h2 style={titleStyle}>Admin Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Admin Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />

        <button type="submit" style={btnStyle}>Login</button>
      </form>
    </div>
  );
}
