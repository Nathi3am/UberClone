import React, { useState } from "react";
import logoPath from "../config/logo";
import { Link, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { CaptainDataContext } from "../context/CaptainContext";
import { ToastContainer, toast } from "react-toastify";
import API from "../config/api";

const CaptainLogin = () => {
  const captainToken = localStorage.getItem("captainToken");
  const savedToken = localStorage.getItem("token");
  if (captainToken) {
    return <Navigate to="/captain-home" replace />;
  }
  if (savedToken && !captainToken) {
    return <Navigate to="/home" replace />;
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const emailFieldNameRef = React.useRef(`f_${Math.random().toString(36).slice(2,12)}`);
  const passwordFieldNameRef = React.useRef(`f_${Math.random().toString(36).slice(2,12)}`);
  const emailInputRef = React.useRef(null);
  const passwordInputRef = React.useRef(null);
  const {
    captain, setCaptain, isLoading, setIsLoading, error, setError,
  } = React.useContext(CaptainDataContext);
  const navigate = useNavigate();

  const notify = (message, success = false) => {
    if (success) {
      toast.success(message, { position: "top-center", autoClose: 5000, theme: "dark", className: "w-5/6 mt-6 text-center" });
    } else {
      toast.error(message, { position: "top-center", autoClose: 5000, theme: "dark", className: "w-5/6 mt-6 text-center" });
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : email;
      const response = await axios.post(`${API}/captain/login`, { email: emailNorm, password });
      if (response.status === 200) {
        const data = response.data;
        setCaptain(data.captain);
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("captainToken", data.token);
          if (data.captain) {
            localStorage.setItem("captainProfile", JSON.stringify(data.captain));
          }
          if (data.deviceToken) {
            try { localStorage.setItem('device_session_token', data.deviceToken); } catch (e) {}
          }
        }
        navigate("/captain-home");
      }
    } catch (error) {
      // distinguish between auth failure and network/server issues
      if (error && error.response) {
        notify("Login failed, invalid email or password", false);
        setError("Login failed. Please try again.");
      } else {
        notify("Unable to reach server — check backend is running", false);
        setError("Network error: could not contact server");
        console.error('Captain login network error:', error);
      }
    } finally {
      setIsLoading(false);
    }
    setEmail("");
    setPassword("");
  };

  // Forgot-password modal for captain
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpStep, setFpStep] = useState("email");
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPass, setFpNewPass] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpTimer, setFpTimer] = useState(0);

  React.useEffect(() => {
    if (fpTimer <= 0) return;
    const t = setTimeout(() => setFpTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [fpTimer]);

  // Prevent browser autofill by using hidden dummy fields and briefly making
  // the real inputs readonly on mount, then clearing their values.
  React.useEffect(() => {
    let t;
    try {
      if (emailInputRef.current) emailInputRef.current.readOnly = true;
      if (passwordInputRef.current) passwordInputRef.current.readOnly = true;
      // Clear any autofilled values and remove readonly shortly after mount
      t = setTimeout(() => {
        if (emailInputRef.current) {
          emailInputRef.current.readOnly = false;
          emailInputRef.current.value = '';
        }
        if (passwordInputRef.current) {
          passwordInputRef.current.readOnly = false;
          passwordInputRef.current.value = '';
        }
        setEmail(''); setPassword('');
      }, 300);
    } catch (e) {
      // no-op
    }
    return () => clearTimeout(t);
  }, []);

  const sendFpOtp = async () => {
    setFpError(""); setFpLoading(true);
    try {
      const e = typeof fpEmail === 'string' ? fpEmail.trim().toLowerCase() : fpEmail;
      const res = await axios.post(`${API}/api/auth/forgot-password`, { email: e });
      if (res.data && res.data.success) { setFpStep("otp"); setFpTimer(60); }
      else setFpError(res.data?.message || "Account not found");
    } catch (err) { setFpError(err?.response?.data?.message || "Account not found"); }
    finally { setFpLoading(false); }
  };

  const verifyFpOtp = async () => {
    if (fpOtp.length < 4) { setFpError("Enter the full code"); return; }
    // Skip calling the OTP verify endpoint here since it consumes the code.
    // The reset endpoint will verify and consume the OTP in a single operation.
    setFpError("");
    setFpStep("password");
  };

  const resetFpPassword = async () => {
    console.log('[FP] resetFpPassword clicked (captain)', { fpEmail, fpOtp, fpNewPass });
    notify('Resetting password...', false);
    const { ok, missing } = validatePasswordRequirements(fpNewPass);
    if (!ok) { setFpError("Password must include: " + missing.join(', ')); return; }
    if (fpNewPass !== fpConfirm) { setFpError("Passwords do not match"); return; }
    setFpLoading(true); setFpError("");
    try {
      const e = typeof fpEmail === 'string' ? fpEmail.trim().toLowerCase() : fpEmail;
      const res = await axios.post(`${API}/api/auth/reset-password`, { email: e, code: fpOtp, newPassword: fpNewPass });
      if (res.data && res.data.success) {
        const tryLogin = async () => {
          try { return await axios.post(`${API}/captain/login`, { email: e, password: fpNewPass }); }
          catch (err) { return null; }
        };
        let loginRes = await tryLogin();
        if (!loginRes || loginRes.status !== 200) {
          await new Promise(r => setTimeout(r, 300));
          loginRes = await tryLogin();
        }
        if (loginRes && loginRes.status === 200) {
          const data = loginRes.data;
          setCaptain(data.captain);
          if (data.token) { localStorage.setItem("token", data.token); localStorage.setItem("captainToken", data.token); }
          if (data.deviceToken) { try { localStorage.setItem('device_session_token', data.deviceToken); } catch (e) {} }
          notify("Password reset — signed in", true);
          setForgotOpen(false);
        } else {
          notify("Password reset — please sign in with your new password", false);
          setFpError("Reset succeeded but automatic sign-in failed");
        }
      } else setFpError(res.data?.message || "Reset failed");
    } catch (err) { setFpError(err?.response?.data?.message || "Reset failed"); }
    finally { setFpLoading(false); }
  };

  const validatePasswordRequirements = (pw) => {
    const checks = [
      { test: pw.length >= 8, msg: '8+ characters' },
      { test: /[A-Z]/.test(pw), msg: 'uppercase letter' },
      { test: /[a-z]/.test(pw), msg: 'lowercase letter' },
      { test: /\d/.test(pw), msg: 'number' },
      { test: /[^A-Za-z0-9]/.test(pw), msg: 'special character' },
    ];
    const missing = checks.filter(c => !c.test).map(c => c.msg);
    return { ok: missing.length === 0, missing };
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');

        .captain-login-page * { box-sizing: border-box; }

        @keyframes floatUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        @keyframes orbC1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-25px,20px) scale(1.08); }
        }
        @keyframes orbC2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(20px,-25px) scale(0.92); }
        }
        @keyframes captainPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50%     { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
        }
        @keyframes shimmerGreen {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes badgeBlink {
          0%,90%,100% { opacity: 1; } 95% { opacity: 0.4; }
        }

        .captain-login-page .cap-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 14px 18px;
          color: #f0fff8;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          outline: none;
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
        }
        .captain-login-page .cap-input::placeholder { color: rgba(255,255,255,0.2); }
        .captain-login-page .cap-input:focus {
          border-color: rgba(16,185,129,0.6);
          background: rgba(16,185,129,0.06);
          box-shadow: 0 0 0 4px rgba(16,185,129,0.08), 0 4px 20px rgba(16,185,129,0.12);
        }

        .captain-login-page .cap-btn {
          width: 100%; padding: 15px; border: none; border-radius: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
          color: #fff; font-family: 'Outfit', sans-serif;
          font-size: 16px; font-weight: 700; letter-spacing: 0.5px;
          cursor: pointer; position: relative; overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 8px 32px rgba(16,185,129,0.35), 0 2px 8px rgba(0,0,0,0.3);
        }
        .captain-login-page .cap-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          background-size: 200% auto;
          animation: shimmerGreen 2.5s linear infinite;
        }
        .captain-login-page .cap-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(16,185,129,0.5), 0 4px 12px rgba(0,0,0,0.3);
        }
        .captain-login-page .cap-btn:active:not(:disabled) { transform: translateY(0); }
        .captain-login-page .cap-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .captain-login-page .special-request-btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          cursor: pointer;
          box-shadow: 0 0 0 0 rgba(59,130,246,0.7);
          animation: glowPulseBlue 1.8s ease-in-out infinite;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .captain-login-page .special-request-btn:hover {
          transform: scale(1.025);
          box-shadow: 0 0 28px 6px rgba(59,130,246,0.85);
        }
        .captain-login-page .lets-eat-local-btn {
          width: 100%;
          padding: 16px 18px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(135deg, #ff8a3d 0%, #ff6a00 45%, #ffb86b 100%);
          color: #071024;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 800;
          text-transform: none;
          letter-spacing: 0.6px;
          cursor: pointer;
          box-shadow: 0 10px 40px rgba(255,138,61,0.22), inset 0 -6px 20px rgba(0,0,0,0.08);
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          animation: eatPulse 3s ease-in-out infinite 0.6s;
        }
        .captain-login-page .lets-eat-local-btn:hover { transform: translateY(-3px) scale(1.01); box-shadow: 0 28px 80px rgba(255,138,61,0.28); filter: saturate(1.08); }
        .captain-login-page .lets-eat-local-btn:active { transform: translateY(0) scale(0.995); box-shadow: 0 8px 26px rgba(255,138,61,0.18); }
        .captain-login-page .lets-eat-local-btn .led-text { display: flex; flex-direction: column; line-height: 1; align-items: flex-start; }
        .captain-login-page .lets-eat-local-btn .led-title { font-size: 15px; font-weight: 800; text-transform: none; color: #071024; }
        .captain-login-page .lets-eat-local-btn .led-sub { font-size: 11px; color: rgba(7,16,36,0.6); font-weight: 600; margin-top: 2px; }
        .captain-login-page .lets-eat-local-btn .led-icon { font-size: 20px; display: inline-block; transform: translateY(1px); }
        @keyframes eatPulse { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes glowPulseBlue {
          0%,100% { box-shadow: 0 0 6px 0 rgba(59,130,246,0.6); transform: scale(1); }
          50% { box-shadow: 0 0 26px 6px rgba(59,130,246,0.95); transform: scale(1.045); }
        }

        .captain-login-page .user-switch-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 15px;
          border: 1.5px solid rgba(99,102,241,0.25);
          border-radius: 14px;
          background: rgba(99,102,241,0.06);
          color: #a5b4fc;
          font-family: 'Outfit', sans-serif;
          font-size: 15px; font-weight: 600;
          text-decoration: none;
          transition: all 0.25s;
          backdrop-filter: blur(10px);
        }
        .captain-login-page .user-switch-btn:hover {
          background: rgba(99,102,241,0.14);
          border-color: rgba(99,102,241,0.5);
          color: #c7d2fe;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.15);
        }

        .captain-login-page .stat-chip {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 20px;
          background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);
          color: #6ee7b7; font-size: 11px; font-family: 'Fira Code', monospace;
        }
        .captain-login-page .stat-chip .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10b981; animation: badgeBlink 3s ease infinite;
        }
      `}</style>

      <div className="captain-login-page" style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        fontFamily: "'Outfit', sans-serif", position: "relative", overflow: "hidden",
      }}>
        {/* Ambient orbs */}
        <div style={{
          position: "fixed", top: "0%", left: "-5%", width: 450, height: 450,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
          animation: "orbC1 9s ease-in-out infinite", pointerEvents: "none",
        }} />
        <div style={{
          position: "fixed", bottom: "5%", right: "-10%", width: 380, height: 380,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(5,150,105,0.08) 0%, transparent 70%)",
          animation: "orbC2 11s ease-in-out infinite", pointerEvents: "none",
        }} />

        {/* Diagonal grid — more industrial */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(16,185,129,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.8) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />

        {/* Scanline effect */}
        <div style={{
          position: "fixed", left: 0, right: 0, height: "25%", pointerEvents: "none",
          background: "linear-gradient(to bottom, transparent, rgba(16,185,129,0.02), transparent)",
          animation: "scanline 6s linear infinite", zIndex: 0,
        }} />

        {/* Top section */}
        <div style={{ animation: "floatUp 0.55s ease both", position: "relative", zIndex: 1 }}>
          {/* Logo + status */}
          <div style={{ padding: "28px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link to="/">
              <img style={{
                width: 52,
                filter: "drop-shadow(0 0 14px rgba(16,185,129,0.55)) drop-shadow(0 0 4px rgba(16,185,129,0.3))",
                transition: "transform 0.3s",
              }}
                onMouseEnter={e => e.target.style.transform = "scale(1.08)"}
                onMouseLeave={e => e.target.style.transform = "scale(1)"}
                src={logoPath} alt="logo" />
            </Link>
            <div className="stat-chip">
              <span className="dot" />
              Captain Portal
            </div>
          </div>

          {/* Card */}
          <div style={{ padding: "24px 20px 0", animation: "floatUp 0.6s 0.1s ease both", opacity: 0, animationFillMode: "forwards" }}>
            <div style={{
              background: "rgba(6,18,14,0.75)", backdropFilter: "blur(24px)",
              borderRadius: 24, padding: "36px 28px",
              border: "1px solid rgba(16,185,129,0.12)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(16,185,129,0.07)",
              position: "relative", overflow: "hidden",
            }}>
              {/* Top accent */}
              <div style={{
                position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
                background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)",
              }} />

              {/* Corner decoration */}
              <div style={{
                position: "absolute", top: 16, right: 16, width: 60, height: 60,
                border: "1px solid rgba(16,185,129,0.1)", borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, color: "rgba(16,185,129,0.2)",
              }}>⬡</div>

              {/* Heading */}
              <div style={{ marginBottom: 32 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, marginBottom: 14,
                  boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
                  animation: "captainPulse 2.5s ease infinite",
                }}>🚖</div>
                <h1 style={{ color: "#ecfdf5", fontSize: 23, fontWeight: 800, margin: "0 0 4px", lineHeight: 1.2 }}>
                  Captain Sign In
                </h1>
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, margin: 0, fontFamily: "'Fira Code', monospace", letterSpacing: 0.5 }}>
                  access your driver dashboard
                </p>
              </div>

              <form onSubmit={submitHandler} autoComplete="off">
                {/* Hidden dummy inputs to capture browser autofill */}
                <input type="text" name="no_autofill_username" autoComplete="username" style={{ position: 'absolute', left: -9999, top: -9999 }} />
                <input type="password" name="no_autofill_password" autoComplete="new-password" style={{ position: 'absolute', left: -9999, top: -9999 }} />
                {/* Email */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{
                    display: "block", marginBottom: 8,
                    color: "rgba(110,231,183,0.5)", fontSize: 11,
                    fontFamily: "'Fira Code', monospace", letterSpacing: 1.5, textTransform: "uppercase",
                  }}>Email address</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                      fontSize: 15, opacity: 0.35, pointerEvents: "none",
                    }}>✉</span>
                    <input
                      ref={emailInputRef}
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="cap-input" required type="email" name={emailFieldNameRef.current}
                      autoComplete="off" placeholder="captain@email.com"
                      onFocus={() => { try { if (emailInputRef.current) emailInputRef.current.readOnly = false; } catch(e){} }}
                      style={{ paddingLeft: 44 }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 8 }}>
                  <label style={{
                    display: "block", marginBottom: 8,
                    color: "rgba(110,231,183,0.5)", fontSize: 11,
                    fontFamily: "'Fira Code', monospace", letterSpacing: 1.5, textTransform: "uppercase",
                  }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                      fontSize: 15, opacity: 0.35, pointerEvents: "none",
                    }}>🔒</span>
                    <input
                      ref={passwordInputRef}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="cap-input" type={showPassword ? "text" : "password"} name={passwordFieldNameRef.current}
                      autoComplete="new-password" required placeholder="••••••••"
                      onFocus={() => { try { if (passwordInputRef.current) passwordInputRef.current.readOnly = false; } catch(e){} }}
                      style={{ paddingLeft: 44, paddingRight: 48 }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.25)", fontSize: 15, padding: 4,
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={e => e.target.style.color = "rgba(110,231,183,0.7)"}
                      onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.25)"}
                    >{showPassword ? "🙈" : "👁"}</button>
                  </div>
                </div>

                {error && (
                  <p style={{ color: "#f87171", fontSize: 12, margin: "8px 0 0", fontFamily: "'Fira Code', monospace" }}>
                    ⚠ {error}
                  </p>
                )}

                <div style={{ marginTop: 28 }}>
                  <button className="cap-btn" type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                        <span style={{
                          width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite",
                          display: "inline-block",
                        }} />
                        Signing in…
                      </span>
                    ) : "Start Driving →"}
                  </button>
                </div>

                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 20, marginBottom: 0 }}>
                  Not a Captain yet?{" "}
                  <Link to="/captain-signup" style={{ color: "#34d399", textDecoration: "none", fontWeight: 600, transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = "#6ee7b7"}
                    onMouseLeave={e => e.target.style.color = "#34d399"}>
                    Apply to drive
                  </Link>
                </p>
                <p style={{ textAlign: "center", marginTop: 8 }}>
                  <button onClick={() => { setForgotOpen(true); setFpStep("email"); setFpEmail(""); setFpOtp(""); setFpNewPass(""); setFpConfirm(""); setFpError(""); }}
                    style={{ background: "none", border: "none", color: "#34d399", textDecoration: "underline", fontSize: 13, cursor: "pointer" }}>
                    Forgot password?
                  </button>
                </p>
                <p style={{ textAlign: "center", marginTop: 8 }}>
                  <button className="special-request-btn" onClick={() => navigate('/special-requests')}>
                    Special Requests
                  </button>
                </p>
                <p style={{ textAlign: "center", marginTop: 8 }}>
                  <button className="lets-eat-local-btn" onClick={() => navigate('/lets-eat-local')}>
                    <span className="led-icon">🍽️</span>
                    <span className="led-text">
                      <span className="led-title">lets eat local</span>
                      <span className="led-sub">Support nearby eateries</span>
                    </span>
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom — User switch */}
        <div style={{ padding: "20px 20px 32px", animation: "floatUp 0.6s 0.2s ease both", opacity: 0, animationFillMode: "forwards", position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 12, textAlign: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 11, fontFamily: "'Fira Code', monospace", letterSpacing: 1 }}>
              LOOKING FOR A RIDE?
            </span>
          </div>
          <Link to="/login" className="user-switch-btn">
            <span style={{ fontSize: 18 }}>🚗</span>
            Sign in as Rider
            <span style={{ fontSize: 12, opacity: 0.5 }}>→</span>
          </Link>
        </div>
      </div>
      {forgotOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 420, maxWidth: "92%", borderRadius: 12, background: "#071317", padding: 20, color: "#fff", boxShadow: "0 20px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Forgot password</h3>
              <button onClick={() => setForgotOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>✕</button>
            </div>
            {fpError && <div style={{ background: "rgba(239,68,68,0.08)", padding: 8, borderRadius: 8, marginBottom: 10, color: "#fca5a5" }}>{fpError}</div>}

            {fpStep === "email" && (
              <div>
                <p style={{ color: "rgba(255,255,255,0.35)", marginTop: 0, marginBottom: 10 }}>Enter your captain email.</p>
                <input value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="captain@email.com" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12, background: "rgba(255,255,255,0.02)", color: "#fff" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setForgotOpen(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>Cancel</button>
                  <button onClick={sendFpOtp} disabled={fpLoading || !fpEmail} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#34d399", border: "none", color: "#052018" }}>{fpLoading ? "Sending…" : "Send code"}</button>
                </div>
              </div>
            )}

            {fpStep === "otp" && (
              <div>
                <p style={{ color: "rgba(255,255,255,0.35)", marginTop: 0, marginBottom: 8 }}>Enter the code sent to <strong style={{ color: "#86efac" }}>{fpEmail}</strong></p>
                <input value={fpOtp} onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12, background: "rgba(255,255,255,0.02)", color: "#fff" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setFpStep("email"); setFpOtp(""); }} style={{ flex: 1, padding: 10, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>Change email</button>
                  <button onClick={verifyFpOtp} disabled={fpLoading || fpOtp.length < 4} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#10b981", border: "none", color: "#052018" }}>{fpLoading ? "Verifying…" : "Verify"}</button>
                </div>
                <div style={{ marginTop: 8, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                  {fpTimer > 0 ? `Resend in ${fpTimer}s` : <button onClick={sendFpOtp} style={{ background: "none", border: "none", color: "#86efac", cursor: "pointer" }}>Resend</button>}
                </div>
              </div>
            )}

            {fpStep === "password" && (
              <div>
                <p style={{ color: "rgba(255,255,255,0.35)", marginTop: 0 }}>Set a new password for <strong style={{ color: "#86efac" }}>{fpEmail}</strong></p>
                <input value={fpNewPass} onChange={(e) => setFpNewPass(e.target.value)} type="password" placeholder="New password" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8, background: "rgba(255,255,255,0.02)", color: "#fff" }} />
                <input value={fpConfirm} onChange={(e) => setFpConfirm(e.target.value)} type="password" placeholder="Confirm new password" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12, background: "rgba(255,255,255,0.02)", color: "#fff" }} />
                {fpNewPass && (() => {
                  const { ok, missing } = validatePasswordRequirements(fpNewPass);
                  return (
                    <div style={{ fontSize: 12, color: ok ? '#86efac' : '#fca5a5', marginBottom: 8 }}>
                      {ok ? 'Password meets requirements' : 'Needs: ' + missing.join(', ')}
                    </div>
                  );
                })()}
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setFpStep("email"); }} style={{ flex: 1, padding: 10, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>Cancel</button>
                  <button onClick={resetFpPassword} disabled={fpLoading || !fpNewPass || fpNewPass !== fpConfirm || !validatePasswordRequirements(fpNewPass).ok} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#6366f1", border: "none", color: "#fff" }}>{fpLoading ? "Resetting…" : "Reset & Sign in"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <ToastContainer />
    </>
  );
};

export default CaptainLogin;
