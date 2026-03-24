import React, { useState } from "react";
import logoPath from "../config/logo";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { UserDataContext } from "../context/UserContext";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import API from "../config/api";

const UserLogin = () => {
  const captainToken = localStorage.getItem("captainToken");
  const savedToken = localStorage.getItem("token");
  if (captainToken) {
    return <Navigate to="/captain-home" replace />;
  }
  if (savedToken) {
    return <Navigate to="/home" replace />;
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailFieldNameRef = React.useRef(`f_${Math.random().toString(36).slice(2,12)}`);
  const passwordFieldNameRef = React.useRef(`f_${Math.random().toString(36).slice(2,12)}`);
  const emailInputRef = React.useRef(null);
  const passwordInputRef = React.useRef(null);

  const navigate = useNavigate();
  const { user, setUser } = React.useContext(UserDataContext);

  const notify = (message, success = false) => {
    if (success) {
      toast.success(message, {
        position: "top-center", autoClose: 5000, theme: "dark",
        className: "w-5/6 mt-6 text-center",
      });
    } else {
      toast.error(message, {
        position: "top-center", autoClose: 5000, theme: "dark",
        className: "w-5/6 mt-6 text-center",
      });
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : email;
      console.log('[login] submitting user login', {
        url: `${API}/users/login`,
        email: emailNorm,
        hasPassword: Boolean(password),
      });
      const response = await axios.post(`${API}/users/login`, { email: emailNorm, password });
      console.log('[login] user login response', {
        status: response.status,
        hasUser: Boolean(response.data?.user),
        hasToken: Boolean(response.data?.token),
      });
      if (response.status === 200) {
        const { user: userData, token } = response.data;
        if (userData && userData.email) {
          setUser(userData);
          localStorage.setItem("token", token);
          localStorage.setItem("userProfile", JSON.stringify(userData));
          navigate("/home");
        }
      }
    } catch (error) {
      console.error('[login] user login failed', {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        data: error?.response?.data,
        url: `${API}/users/login`,
      });
      if (error && error.response) {
        notify("Login failed, invalid email or password", false);
      } else {
        notify("Unable to reach server — check backend is running", false);
        console.error('User login network error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Forgot-password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [fpStep, setFpStep] = useState("email"); // email, otp, password
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

  // Block browser autofill: briefly mark inputs readonly and clear values on mount
  React.useEffect(() => {
    let t;
    try {
      if (emailInputRef.current) emailInputRef.current.readOnly = true;
      if (passwordInputRef.current) passwordInputRef.current.readOnly = true;
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
    } catch (e) {}
    return () => clearTimeout(t);
  }, []);

  const sendFpOtp = async () => {
    setFpError(""); setFpLoading(true);
    try {
      const e = typeof fpEmail === 'string' ? fpEmail.trim().toLowerCase() : fpEmail;
      const res = await axios.post(`${API}/api/auth/forgot-password`, { email: e });
      if (res.data && res.data.success) {
        setFpStep("otp"); setFpTimer(60);
      } else {
        setFpError(res.data?.message || "Account not found");
      }
    } catch (err) {
      setFpError(err?.response?.data?.message || "Account not found");
    } finally { setFpLoading(false); }
  };

  const verifyFpOtp = async () => {
    if (fpOtp.length < 4) { setFpError("Enter the full code"); return; }
    // Do not call the OTP verify endpoint here because it consumes the code.
    // The /reset-password endpoint will verify and consume the OTP in one step.
    setFpError("");
    setFpStep("password");
  };

  const resetFpPassword = async () => {
    console.log('[FP] resetFpPassword clicked', { fpEmail, fpOtp, fpNewPass });
    notify('Resetting password...', false);
    const { ok, missing } = validatePasswordRequirements(fpNewPass);
    if (!ok) { setFpError("Password must include: " + missing.join(', ')); return; }
    if (fpNewPass !== fpConfirm) { setFpError("Passwords do not match"); return; }
    setFpLoading(true); setFpError("");
    try {
      const e = typeof fpEmail === 'string' ? fpEmail.trim().toLowerCase() : fpEmail;
      const res = await axios.post(`${API}/api/auth/reset-password`, { email: e, code: fpOtp, newPassword: fpNewPass });
      if (res.data && res.data.success) {
        // auto-login with a small retry in case DB write hasn't propagated
        const tryLogin = async () => {
          try {
            return await axios.post(`${API}/users/login`, { email: e, password: fpNewPass });
          } catch (err) {
            return null;
          }
        };

        let loginRes = await tryLogin();
        if (!loginRes || loginRes.status !== 200) {
          await new Promise(r => setTimeout(r, 300));
          loginRes = await tryLogin();
        }

        if (loginRes && loginRes.status === 200) {
          const { user: userData, token } = loginRes.data;
          setUser(userData);
          localStorage.setItem("token", token);
          notify("Password reset — logged in", true);
          setForgotOpen(false);
        } else {
          // if auto-login fails, inform user to sign in manually
          notify("Password reset — please sign in with your new password", false);
          setFpError("Reset succeeded but automatic sign-in failed");
        }
      } else setFpError(res.data?.message || "Reset failed");
    } catch (err) {
      setFpError(err?.response?.data?.message || "Reset failed");
    } finally { setFpLoading(false); }
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

        .user-login-page * { box-sizing: border-box; }

        @keyframes floatUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 12px rgba(99,102,241,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes orb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(30px,-20px) scale(1.1); }
        }
        @keyframes orb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-20px,30px) scale(0.9); }
        }

        .user-login-page .input-field {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 14px 18px;
          color: #f0f0ff;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 400;
          outline: none;
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
          letter-spacing: 0.2px;
        }
        .user-login-page .input-field::placeholder { color: rgba(255,255,255,0.25); }
        .user-login-page .input-field:focus {
          border-color: rgba(99,102,241,0.7);
          background: rgba(99,102,241,0.07);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1), 0 4px 20px rgba(99,102,241,0.15);
        }
        .user-login-page .login-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3730a3 100%);
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 8px 32px rgba(99,102,241,0.4), 0 2px 8px rgba(0,0,0,0.3);
        }
        .user-login-page .login-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          background-size: 200% auto;
          animation: shimmer 2.5s linear infinite;
        }
        .user-login-page .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(99,102,241,0.55), 0 4px 12px rgba(0,0,0,0.3);
        }
        .user-login-page .login-btn:active:not(:disabled) { transform: translateY(0); }
        .user-login-page .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .user-login-page .special-request-btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%);
          color: #fff;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          cursor: pointer;
          box-shadow: 0 0 0 0 rgba(37,99,235,0.7);
          animation: glowPulse 1.8s ease-in-out infinite;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .user-login-page .special-request-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 0 28px 5px rgba(37,99,235,0.8);
        }

        .user-login-page .lets-eat-local-btn {
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
        .user-login-page .lets-eat-local-btn:hover { transform: translateY(-3px) scale(1.01); box-shadow: 0 28px 80px rgba(255,138,61,0.28); filter: saturate(1.08); }
        .user-login-page .lets-eat-local-btn:active { transform: translateY(0) scale(0.995); box-shadow: 0 8px 26px rgba(255,138,61,0.18); }
        .user-login-page .lets-eat-local-btn .led-text { display: flex; flex-direction: column; line-height: 1; align-items: flex-start; }
        .user-login-page .lets-eat-local-btn .led-title { font-size: 15px; font-weight: 800; text-transform: none; color: #071024; }
        .user-login-page .lets-eat-local-btn .led-sub { font-size: 11px; color: rgba(7,16,36,0.6); font-weight: 600; margin-top: 2px; }
        .user-login-page .lets-eat-local-btn .led-icon { font-size: 20px; display: inline-block; transform: translateY(1px); }
        @keyframes eatPulse { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 6px 0 rgba(37,99,235,0.6); transform: scale(1); }
          50% { box-shadow: 0 0 24px 6px rgba(37,99,235,0.95); transform: scale(1.04); }
        }

        .user-login-page .captain-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 15px;
          border: 1.5px solid rgba(168,85,247,0.3);
          border-radius: 14px;
          background: rgba(168,85,247,0.08);
          color: #c4b5fd;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.25s;
          backdrop-filter: blur(10px);
        }
        .user-login-page .captain-btn:hover {
          background: rgba(168,85,247,0.18);
          border-color: rgba(168,85,247,0.6);
          color: #e9d5ff;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(168,85,247,0.2);
        }

        .user-login-page .divider {
          display: flex; align-items: center; gap: 12px; margin: 20px 0;
        }
        .user-login-page .divider::before,
        .user-login-page .divider::after {
          content: ''; flex: 1;
          height: 1px; background: rgba(255,255,255,0.07);
        }
        .user-login-page .divider span {
          color: rgba(255,255,255,0.2); font-size: 11px;
          font-family: 'Fira Code', monospace; letter-spacing: 2px;
        }
      `}</style>

      <div className="user-login-page" style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        fontFamily: "'Outfit', sans-serif", position: "relative", overflow: "hidden",
      }}>
        {/* Ambient orbs */}
        <div style={{
          position: "fixed", top: "5%", right: "-10%", width: 420, height: 420,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
          animation: "orb1 8s ease-in-out infinite", pointerEvents: "none",
        }} />
        <div style={{
          position: "fixed", bottom: "10%", left: "-8%", width: 340, height: 340,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)",
          animation: "orb2 10s ease-in-out infinite", pointerEvents: "none",
        }} />
        {/* Grid texture */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.025,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        {/* Top section */}
        <div style={{ animation: "floatUp 0.6s ease both" }}>
          {/* Logo */}
          <div style={{ padding: "28px 28px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link to="/">
              <img style={{ width: 52, filter: "drop-shadow(0 0 12px rgba(99,102,241,0.5))", transition: "transform 0.3s" }}
                onMouseEnter={e => e.target.style.transform = "scale(1.08)"}
                onMouseLeave={e => e.target.style.transform = "scale(1)"}
                src={logoPath} alt="logo" />
            </Link>
            {/* Rider badge */}
            <div style={{
              padding: "6px 14px", borderRadius: 20,
              background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)",
              color: "#a5b4fc", fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
              textTransform: "uppercase", fontFamily: "'Fira Code', monospace",
            }}>Rider Portal</div>
          </div>

          {/* Card */}
          <div style={{ padding: "24px 20px 0", animation: "floatUp 0.6s 0.1s ease both", opacity: 0, animationFillMode: "forwards" }}>
            <div style={{
              background: "rgba(15,20,40,0.7)", backdropFilter: "blur(24px)",
              borderRadius: 24, padding: "36px 28px",
              border: "1px solid rgba(99,102,241,0.15)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
              position: "relative", overflow: "hidden",
            }}>
              {/* Card top accent line */}
              <div style={{
                position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
                background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)",
              }} />

              {/* Heading */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
                    animation: "pulse-ring 2.5s ease infinite",
                  }}>🚗</div>
                  <div>
                    <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                      Welcome back
                    </h1>
                    <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0, fontFamily: "'Fira Code', monospace", letterSpacing: 0.5 }}>
                      sign in to your ride account
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={submitHandler} autoComplete="off">
                {/* Hidden dummy inputs to capture browser autofill */}
                <input type="text" name="no_autofill_username" autoComplete="username" style={{ position: 'absolute', left: -9999, top: -9999 }} />
                <input type="password" name="no_autofill_password" autoComplete="new-password" style={{ position: 'absolute', left: -9999, top: -9999 }} />
                {/* Email */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{
                    display: "block", marginBottom: 8,
                    color: "rgba(255,255,255,0.45)", fontSize: 11,
                    fontFamily: "'Fira Code', monospace", letterSpacing: 1.5, textTransform: "uppercase",
                  }}>Email address</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                      fontSize: 16, opacity: 0.4, pointerEvents: "none",
                    }}>✉</span>
                    <input
                      ref={emailInputRef}
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="input-field" required type="email" name={emailFieldNameRef.current}
                      autoComplete="off" placeholder="your@email.com"
                      onFocus={() => { try { if (emailInputRef.current) emailInputRef.current.readOnly = false; } catch(e){} }}
                      style={{ paddingLeft: 44 }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 28 }}>
                  <label style={{
                    display: "block", marginBottom: 8,
                    color: "rgba(255,255,255,0.45)", fontSize: 11,
                    fontFamily: "'Fira Code', monospace", letterSpacing: 1.5, textTransform: "uppercase",
                  }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                      fontSize: 16, opacity: 0.4, pointerEvents: "none",
                    }}>🔒</span>
                    <input
                      ref={passwordInputRef}
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="input-field" type={showPassword ? "text" : "password"} name={passwordFieldNameRef.current}
                      autoComplete="new-password" required placeholder="••••••••"
                      onFocus={() => { try { if (passwordInputRef.current) passwordInputRef.current.readOnly = false; } catch(e){} }}
                      style={{ paddingLeft: 44, paddingRight: 48 }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "rgba(255,255,255,0.3)", fontSize: 16, padding: 4,
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.7)"}
                      onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.3)"}
                    >{showPassword ? "🙈" : "👁"}</button>
                  </div>
                </div>

                <button className="login-btn" type="submit" disabled={loading}>
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                      <span style={{
                        width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite",
                        display: "inline-block",
                      }} />
                      Signing in…
                    </span>
                  ) : "Sign In →"}
                </button>

                <div className="divider"><span>OR</span></div>

                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13 }}> 
                  <p style={{ margin: 0 }}>New here?{" "}
                    <Link to="/signup" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600, transition: "color 0.2s" }}
                      onMouseEnter={e => e.target.style.color = "#a5b4fc"}
                      onMouseLeave={e => e.target.style.color = "#818cf8"}>
                      Create an account
                    </Link>
                  </p>
                  <p style={{ margin: 6 }}>
                    <button onClick={() => { setForgotOpen(true); setFpStep("email"); setFpEmail(""); setFpOtp(""); setFpNewPass(""); setFpConfirm(""); setFpError(""); }}
                      style={{ background: "none", border: "none", color: "#f97316", textDecoration: "underline", fontSize: 13, cursor: "pointer" }}
                      onMouseEnter={e => e.target.style.color = "#fb923c"}
                      onMouseLeave={e => e.target.style.color = "#f97316"}>
                      Forgot password?
                    </button>
                  </p>
                  <p style={{ margin: 6 }}>
                    <button className="special-request-btn" onClick={() => navigate('/special-requests')}>
                      Special Requests
                    </button>
                  </p>
                  <p style={{ margin: 6 }}>
                    <button className="lets-eat-local-btn" onClick={() => navigate('/lets-eat-local')}>
                      <span className="led-icon">🍽️</span>
                      <span className="led-text">
                        <span className="led-title">lets eat local</span>
                        <span className="led-sub">Support nearby eateries</span>
                      </span>
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom — Captain switch */}
        <div style={{ padding: "20px 20px 32px", animation: "floatUp 0.6s 0.2s ease both", opacity: 0, animationFillMode: "forwards" }}>
          <div style={{ marginBottom: 12, textAlign: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, fontFamily: "'Fira Code', monospace", letterSpacing: 1 }}>
              ARE YOU A DRIVER?
            </span>
          </div>
          <Link to="/captain-login" className="captain-btn">
            <span style={{ fontSize: 18 }}>🚖</span>
            Sign in as Captain
            <span style={{ fontSize: 12, opacity: 0.6 }}>→</span>
          </Link>
        </div>
      </div>
      {forgotOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ width: 420, maxWidth: "92%", borderRadius: 14, background: "#071024", padding: 22, boxShadow: "0 20px 80px rgba(2,6,23,0.8)", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Forgot password</h3>
              <button onClick={() => setForgotOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>✕</button>
            </div>
            {fpError && <div style={{ background: "rgba(239,68,68,0.08)", padding: 8, borderRadius: 8, marginBottom: 10, color: "#fca5a5" }}>{fpError}</div>}

            {fpStep === "email" && (
              <div>
                <p style={{ color: "rgba(255,255,255,0.35)", marginTop: 0, marginBottom: 10 }}>Enter the email for your account.</p>
                <input value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="email@domain.com" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12, background: "rgba(255,255,255,0.02)", color: "#fff" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setForgotOpen(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>Cancel</button>
                  <button onClick={sendFpOtp} disabled={fpLoading || !fpEmail} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#f97316", border: "none", color: "#fff" }}>{fpLoading ? "Sending…" : "Send code"}</button>
                </div>
              </div>
            )}

            {fpStep === "otp" && (
              <div>
                <p style={{ color: "rgba(255,255,255,0.35)", marginTop: 0, marginBottom: 8 }}>Enter the code sent to <strong style={{ color: "#a5b4fc" }}>{fpEmail}</strong></p>
                <input value={fpOtp} onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12, background: "rgba(255,255,255,0.02)", color: "#fff" }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setFpStep("email"); setFpOtp(""); }} style={{ flex: 1, padding: 10, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.06)", color: "#fff" }}>Change email</button>
                  <button onClick={verifyFpOtp} disabled={fpLoading || fpOtp.length < 4} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#6366f1", border: "none", color: "#fff" }}>{fpLoading ? "Verifying…" : "Verify"}</button>
                </div>
                <div style={{ marginTop: 8, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                  {fpTimer > 0 ? `Resend in ${fpTimer}s` : <button onClick={sendFpOtp} style={{ background: "none", border: "none", color: "#a5b4fc", cursor: "pointer" }}>Resend</button>}
                </div>
              </div>
            )}

            {fpStep === "password" && (
              <div>
                <p style={{ color: "rgba(255,255,255,0.35)", marginTop: 0 }}>Set a new password for <strong style={{ color: "#a5b4fc" }}>{fpEmail}</strong></p>
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
                  <button onClick={resetFpPassword} disabled={fpLoading || !fpNewPass || fpNewPass !== fpConfirm || !validatePasswordRequirements(fpNewPass).ok} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#10b981", border: "none", color: "#fff" }}>{fpLoading ? "Resetting…" : "Reset & Sign in"}</button>
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

export default UserLogin;
