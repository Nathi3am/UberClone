import { useState, useEffect, useRef } from "react";

// ─── BACKEND API CALLS ─────────────────────────────────────────────────────────
// Replace BASE_URL with your actual server address
const BASE_URL = "http://localhost:4000";

const API = {
  sendEmailOTP: async (email) => {
    const res = await fetch(`${BASE_URL}/api/otp/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },
  verifyOTP: async (email, code) => {
    const res = await fetch(`${BASE_URL}/api/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    return res.json();
  },
};
// ──────────────────────────────────────────────────────────────────────────────

const STEPS = { SIGNIN: "signin", OTP: "otp", SUCCESS: "success" };

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 18, height: 18,
      border: "2.5px solid rgba(255,255,255,0.3)",
      borderTopColor: "#fff", borderRadius: "50%",
      animation: "spin 0.7s linear infinite", verticalAlign: "middle"
    }} />
  );
}

function OTPInput({ length = 6, value, onChange, disabled }) {
  const inputs = useRef([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  const handleKey = (e, i) => {
    if (e.key === "Backspace") {
      const next = digits.map((d, idx) => idx === i ? "" : d).join("");
      onChange(next);
      if (i > 0) inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      inputs.current[i + 1]?.focus();
    }
  };

  const handleChange = (e, i) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => idx === i ? char : d).join("");
    onChange(next);
    if (char && i < length - 1) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted.padEnd(length, "").slice(0, length));
    inputs.current[Math.min(pasted.length, length - 1)]?.focus();
    e.preventDefault();
  };

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{
            width: 48, height: 56, textAlign: "center",
            fontSize: 22, fontWeight: 700, fontFamily: "'DM Mono', monospace",
            border: d ? "2px solid #6c63ff" : "2px solid #2e2e3a",
            borderRadius: 12, background: d ? "#1a1a2e" : "#13131f",
            color: "#f0f0ff", outline: "none", transition: "border 0.2s, background 0.2s",
            caretColor: "#6c63ff",
          }}
        />
      ))}
    </div>
  );
}

export default function OTPFlow() {
  const [step, setStep] = useState(STEPS.SIGNIN);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const validateEmail = () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      return "Enter a valid email address.";
    return "";
  };

  const handleSend = async () => {
    const err = validateEmail();
    if (err) { setError(err); return; }
    setError(""); setInfo(""); setLoading(true);
    try {
      const res = await API.sendEmailOTP(email);
      if (res.success) {
        setOtpCode("");
        setStep(STEPS.OTP);
        setTimer(60);
        setInfo("Check your inbox — a code is on its way.");
      } else {
        setError(res.message || "Failed to send OTP.");
      }
    } catch {
      setError("Network error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otpCode.length !== 6) { setError("Enter all 6 digits."); return; }
    setError(""); setLoading(true);
    try {
      const res = await API.verifyOTP(email, otpCode);
      if (res.success) {
        setStep(STEPS.SUCCESS);
      } else {
        setError(res.message || "Invalid OTP.");
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true); setError(""); setOtpCode("");
    try {
      const res = await API.sendEmailOTP(email);
      if (res.success) { setTimer(60); setInfo("New code sent!"); }
      else setError(res.message);
    } catch { setError("Resend failed."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.12)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #13131f inset;
          -webkit-text-fill-color: #f0f0ff;
        }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, #1e1040 0%, #0d0d18 60%)",
        fontFamily: "'DM Sans', sans-serif", padding: 20,
      }}>
        <div style={{ position:"fixed", top:"-20%", left:"-10%", width:500, height:500,
          borderRadius:"50%", background:"radial-gradient(circle, #4f35cc33, transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"fixed", bottom:"-15%", right:"-5%", width:400, height:400,
          borderRadius:"50%", background:"radial-gradient(circle, #c026d333, transparent 70%)", pointerEvents:"none" }} />

        <div style={{
          width: "100%", maxWidth: 420,
          background: "linear-gradient(145deg, #16162a, #111120)",
          border: "1px solid #2a2a45", borderRadius: 24,
          padding: "40px 36px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          animation: "fadeUp 0.5s ease both", position: "relative", zIndex: 1,
        }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px",
              background: "linear-gradient(135deg, #6c63ff, #a855f7)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, boxShadow: "0 8px 24px #6c63ff44",
            }}>
              {step === STEPS.SUCCESS ? "✓" : "📧"}
            </div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#f0f0ff" }}>
              {step === STEPS.SUCCESS ? "Email Verified!" : "Verify your Email"}
            </h1>
            <p style={{ color: "#6b6b8a", fontSize: 14, marginTop: 6 }}>
              {step === STEPS.SIGNIN && "Enter your email to receive a one-time code"}
              {step === STEPS.OTP && <>Code sent to <strong style={{ color: "#a0a0c0" }}>{email}</strong></>}
              {step === STEPS.SUCCESS && "Your email has been successfully verified"}
            </p>
          </div>

          {/* Banners */}
          {info && !error && (
            <div style={{
              background: "#1a2a1a", border: "1px solid #2a4a2a", borderRadius: 10,
              padding: "10px 14px", marginBottom: 16, color: "#4ade80", fontSize: 13,
            }}>{info}</div>
          )}
          {error && (
            <div style={{
              background: "#2a1a1a", border: "1px solid #4a2a2a", borderRadius: 10,
              padding: "10px 14px", marginBottom: 16, color: "#f87171", fontSize: 13,
            }}>{error}</div>
          )}

          {/* ── SIGN IN STEP ── */}
          {step === STEPS.SIGNIN && (
            <div style={{ animation: "fadeUp 0.35s ease both" }}>
              <label style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase" }}>
                Email Address
              </label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="you@example.com"
                style={{
                  width: "100%", marginTop: 8, padding: "14px 16px",
                  background: "#13131f", border: "2px solid #2e2e3a", borderRadius: 12,
                  color: "#f0f0ff", fontSize: 15, fontFamily: "'DM Sans', sans-serif",
                  outline: "none", transition: "border 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#6c63ff"}
                onBlur={(e) => e.target.style.borderColor = "#2e2e3a"}
              />
              <button onClick={handleSend} disabled={loading}
                style={{
                  width: "100%", marginTop: 20, padding: "15px 0",
                  background: loading ? "#3a3a55" : "linear-gradient(135deg, #6c63ff, #a855f7)",
                  border: "none", borderRadius: 12, color: "#fff",
                  fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading ? "none" : "0 6px 24px #6c63ff55",
                  transition: "all 0.2s", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 10,
                }}>
                {loading ? <><Spinner /> Sending Code…</> : "Send Verification Code"}
              </button>
            </div>
          )}

          {/* ── OTP STEP ── */}
          {step === STEPS.OTP && (
            <div style={{ animation: "fadeUp 0.35s ease both" }}>
              <OTPInput length={6} value={otpCode} onChange={setOtpCode} disabled={loading} />

              <button onClick={handleVerify} disabled={loading || otpCode.length < 6}
                style={{
                  width: "100%", marginTop: 24, padding: "15px 0",
                  background: (loading || otpCode.length < 6) ? "#3a3a55" : "linear-gradient(135deg, #6c63ff, #a855f7)",
                  border: "none", borderRadius: 12, color: "#fff",
                  fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
                  cursor: (loading || otpCode.length < 6) ? "not-allowed" : "pointer",
                  boxShadow: (loading || otpCode.length < 6) ? "none" : "0 6px 24px #6c63ff55",
                  transition: "all 0.2s", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 10,
                }}>
                {loading ? <><Spinner /> Verifying…</> : "Verify Code"}
              </button>

              <div style={{ textAlign: "center", marginTop: 18 }}>
                {timer > 0 ? (
                  <span style={{ color: "#4a4a6a", fontSize: 13 }}>
                    Resend in <strong style={{ color: "#a78bfa" }}>{timer}s</strong>
                  </span>
                ) : (
                  <button onClick={handleResend} disabled={loading}
                    style={{
                      background: "none", border: "none", color: "#6c63ff",
                      fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline",
                    }}>
                    Resend code
                  </button>
                )}
              </div>

              <button onClick={() => { setStep(STEPS.SIGNIN); setError(""); setInfo(""); setOtpCode(""); }}
                style={{
                  width: "100%", marginTop: 12, padding: "12px 0",
                  background: "transparent", border: "1px solid #2a2a45",
                  borderRadius: 12, color: "#6b6b8a", fontSize: 14,
                  cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                }}>
                ← Change email address
              </button>
            </div>
          )}

          {/* ── SUCCESS STEP ── */}
          {step === STEPS.SUCCESS && (
            <div style={{ textAlign: "center", animation: "fadeUp 0.4s ease both" }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 32, boxShadow: "0 8px 32px #22c55e44",
                animation: "pulse 2s ease infinite",
              }}>✓</div>
              <p style={{ color: "#86efac", fontSize: 15, lineHeight: 1.7 }}>
                <strong>{email}</strong> has been verified.<br />
                You can now continue to your account.
              </p>
              <button
                onClick={() => {
                  // TODO: redirect to your app / call your onSuccess handler here
                  setStep(STEPS.SIGNIN); setEmail(""); setOtpCode(""); setError(""); setInfo("");
                }}
                style={{
                  marginTop: 28, padding: "13px 32px",
                  background: "linear-gradient(135deg, #6c63ff, #a855f7)",
                  border: "none", borderRadius: 12, color: "#fff",
                  fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", boxShadow: "0 6px 24px #6c63ff55",
                }}>
                Continue →
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
