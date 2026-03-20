import React, { useState, useEffect, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import logoPath from "../config/logo";
import { UserDataContext } from "../context/UserContext";
import API from "../config/api";

// ── Reusable OTP digit input ───────────────────────────────────────────────────
function OTPInput({ length = 6, value, onChange, disabled }) {
	const inputs = useRef([]);
	const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

	const handleKey = (e, i) => {
		if (e.key === "Backspace") {
			onChange(digits.map((d, idx) => (idx === i ? "" : d)).join(""));
			if (i > 0) inputs.current[i - 1]?.focus();
		} else if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
		else if (e.key === "ArrowRight" && i < length - 1) inputs.current[i + 1]?.focus();
	};

	const handleChange = (e, i) => {
		const char = e.target.value.replace(/\D/g, "").slice(-1);
		onChange(digits.map((d, idx) => (idx === i ? char : d)).join(""));
		if (char && i < length - 1) inputs.current[i + 1]?.focus();
	};

	const handlePaste = (e) => {
		const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
		onChange(pasted.padEnd(length, "").slice(0, length));
		inputs.current[Math.min(pasted.length, length - 1)]?.focus();
		e.preventDefault();
	};

	return (
		<div style={{ display: "flex", gap: 10, justifyContent: "center", margin: "8px 0" }}>
			{digits.map((d, i) => (
				<input
					key={i}
					ref={(el) => (inputs.current[i] = el)}
					type="text" inputMode="numeric" maxLength={1}
					value={d} disabled={disabled}
					onChange={(e) => handleChange(e, i)}
					onKeyDown={(e) => handleKey(e, i)}
					onPaste={handlePaste}
					onFocus={(e) => e.target.select()}
					style={{
						width: 46, height: 54, textAlign: "center",
						fontSize: 20, fontWeight: 700, fontFamily: "'Fira Code', monospace",
						border: d ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.08)",
						borderRadius: 12,
						background: d ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
						color: "#f0f0ff", outline: "none",
						transition: "border 0.2s, background 0.2s",
					}}
				/>
			))}
		</div>
	);
}

// ── Password strength checker ─────────────────────────────────────────────────
function PasswordStrength({ password }) {
	const checks = [
		{ label: "8+ characters", pass: password.length >= 8 },
		{ label: "Uppercase letter", pass: /[A-Z]/.test(password) },
		{ label: "Number", pass: /\d/.test(password) },
		{ label: "Special character", pass: /[^A-Za-z0-9]/.test(password) },
	];
	const score = checks.filter((c) => c.pass).length;
	const colors = ["#ef4444", "#f97316", "#eab308", "#10b981"];
	const labels = ["Weak", "Fair", "Good", "Strong"];

	if (!password) return null;
	return (
		<div style={{ marginTop: 10 }}>
			<div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
				{[0, 1, 2, 3].map((i) => (
					<div key={i} style={{
						flex: 1, height: 3, borderRadius: 4,
						background: i < score ? colors[score - 1] : "rgba(255,255,255,0.08)",
						transition: "background 0.3s",
					}} />
				))}
			</div>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<span style={{ fontSize: 11, color: score > 0 ? colors[score - 1] : "transparent", fontFamily: "'Fira Code', monospace" }}>
					{score > 0 ? labels[score - 1] : ""}
				</span>
				<div style={{ display: "flex", gap: 10 }}>
					{checks.map((c) => (
						<span key={c.label} style={{ fontSize: 10, color: c.pass ? "#10b981" : "rgba(255,255,255,0.2)" }}>
							{c.pass ? "✓" : "○"} {c.label}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

// ── Main Component ────────────────────────────────────────────────────────────
const STEPS = { EMAIL: "email", OTP: "otp", PASSWORD: "password", SUCCESS: "success" };

export default function ForgotPassword() {
	const [step, setStep] = useState(STEPS.EMAIL);
	const [email, setEmail] = useState("");
	const [otpCode, setOtpCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showNew, setShowNew] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [info, setInfo] = useState("");
	const [timer, setTimer] = useState(0);

	const navigate = useNavigate();
	const { setUser } = useContext(UserDataContext);

	useEffect(() => {
		if (timer <= 0) return;
		const id = setTimeout(() => setTimer((t) => t - 1), 1000);
		return () => clearTimeout(id);
	}, [timer]);

	// ── Step 1: Send OTP ────────────────────────────────────────────────────────
	const handleSendOTP = async (e) => {
		e.preventDefault();
		if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
			setError("Enter a valid email address."); return;
		}
		setError(""); setLoading(true);
		try {
			const res = await axios.post(`${API}/api/auth/forgot-password`, { email });
			if (res.data.success) {
				setStep(STEPS.OTP);
				setTimer(60);
				setInfo("Check your inbox — a reset code is on its way.");
			} else {
				setError(res.data.message || "Failed to send code.");
			}
		} catch (err) {
			setError(err?.response?.data?.message || "No account found with that email.");
		} finally {
			setLoading(false);
		}
	};

	// ── Step 2: Verify OTP ──────────────────────────────────────────────────────
	const handleVerifyOTP = async () => {
		if (otpCode.length !== 6) { setError("Enter all 6 digits."); return; }
		setError(""); setLoading(true);
		try {
			const res = await axios.post(`${API}/api/auth/verify-reset-otp`, { email, code: otpCode });
			if (res.data.success) {
				setStep(STEPS.PASSWORD);
				setError("");
			} else {
				setError(res.data.message || "Invalid code.");
			}
		} catch (err) {
			setError(err?.response?.data?.message || "Invalid or expired code.");
		} finally {
			setLoading(false);
		}
	};

	// ── Step 3: Reset Password + Auto Login ─────────────────────────────────────
	const handleResetPassword = async (e) => {
		e.preventDefault();
		if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
		if (newPassword !== confirmPassword) { setError("Passwords don't match."); return; }
		setError(""); setLoading(true);
		try {
			const res = await axios.post(`${API}/api/auth/reset-password`, {
				email, code: otpCode, newPassword,
			});
			if (res.data.success) {
				// Auto login with new password
				const loginRes = await axios.post(`${API}/users/login`, { email, password: newPassword });
				if (loginRes.status === 200) {
					const { user: userData, token } = loginRes.data;
					setUser(userData);
					localStorage.setItem("token", token);
					setStep(STEPS.SUCCESS);
					setTimeout(() => navigate("/home"), 1800);
				}
			} else {
				setError(res.data.message || "Reset failed.");
			}
		} catch (err) {
			setError(err?.response?.data?.message || "Something went wrong.");
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		setLoading(true); setError(""); setOtpCode("");
		try {
			const res = await axios.post(`${API}/api/auth/forgot-password`, { email });
			if (res.data.success) { setTimer(60); setInfo("New code sent!"); }
			else setError(res.data.message);
		} catch { setError("Resend failed."); }
		finally { setLoading(false); }
	};

	const stepLabels = ["Email", "Verify", "Reset"];
	const stepIndex = { [STEPS.EMAIL]: 0, [STEPS.OTP]: 1, [STEPS.PASSWORD]: 2, [STEPS.SUCCESS]: 3 };
	const currentStep = stepIndex[step] ?? 0;

	return (
		<>
			<style>{`
				@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap');
				.fp-page * { box-sizing: border-box; }
				@keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
				@keyframes spin   { to { transform: rotate(360deg); } }
				@keyframes orbA   { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(25px,-20px)scale(1.08)} }
				@keyframes orbB   { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(-20px,25px)scale(0.93)} }
				@keyframes successPop { 0%{transform:scale(0.5);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
				@keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }

				.fp-page .fp-input {
					width: 100%;
					background: rgba(255,255,255,0.04);
					border: 1.5px solid rgba(255,255,255,0.08);
					border-radius: 14px;
					padding: 14px 18px;
					color: #f0f0ff;
					font-family: 'Outfit', sans-serif;
					font-size: 15px;
					outline: none;
					transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
				}
				.fp-page .fp-input::placeholder { color: rgba(255,255,255,0.22); }
				.fp-page .fp-input:focus {
					border-color: rgba(99,102,241,0.7);
					background: rgba(99,102,241,0.07);
					box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
				}
				.fp-page .fp-btn {
					width: 100%; padding: 15px; border: none; border-radius: 14px;
					background: linear-gradient(135deg, #6366f1, #4f46e5, #3730a3);
					color: #fff; font-family: 'Outfit', sans-serif;
					font-size: 16px; font-weight: 700; cursor: pointer;
					position: relative; overflow: hidden;
					transition: transform 0.2s, box-shadow 0.2s;
					box-shadow: 0 8px 32px rgba(99,102,241,0.4);
				}
				.fp-page .fp-btn::before {
					content:''; position:absolute; inset:0;
					background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
					background-size: 200% auto;
					animation: shimmer 2.5s linear infinite;
				}
				.fp-page .fp-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(99,102,241,0.55); }
				.fp-page .fp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
			`}</style>

			<div className="fp-page" style={{
				minHeight: "100vh",
				display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
				fontFamily: "'Outfit', sans-serif", padding: 20, position: "relative", overflow: "hidden",
			}}>
				<div style={{ position:"fixed", top:"-5%", right:"-8%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)", animation:"orbA 8s ease-in-out infinite", pointerEvents:"none" }} />
				<div style={{ position:"fixed", bottom:"5%", left:"-8%", width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle, rgba(59,130,246,0.09), transparent 70%)", animation:"orbB 10s ease-in-out infinite", pointerEvents:"none" }} />
				<div style={{ position:"fixed", inset:0, pointerEvents:"none", opacity:0.025, backgroundImage:"linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize:"40px 40px" }} />

				<div style={{ position:"absolute", top:28, left:28 }}>
					<Link to="/"><img src={logoPath} alt="logo" style={{ width:48, filter:"drop-shadow(0 0 10px rgba(99,102,241,0.5))" }} /></Link>
				</div>

				<div style={{
					width: "100%", maxWidth: 440, position: "relative", zIndex: 1,
					background: "rgba(15,20,40,0.75)", backdropFilter: "blur(24px)",
					borderRadius: 24, padding: "40px 32px",
					border: "1px solid rgba(99,102,241,0.15)",
					boxShadow: "0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
					animation: "fadeUp 0.5s ease both",
				}}>
					<div style={{ position:"absolute", top:0, left:"10%", right:"10%", height:1, background:"linear-gradient(90deg,transparent,rgba(99,102,241,0.6),transparent)" }} />

					{step !== STEPS.SUCCESS && (
						<div style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
							{stepLabels.map((label, i) => (
								<React.Fragment key={label}>
									<div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
										<div style={{
											width: 32, height: 32, borderRadius: "50%",
											background: i < currentStep ? "#6366f1" : i === currentStep ? "linear-gradient(135deg,#6366f1,#a855f7)" : "rgba(255,255,255,0.05)",
											border: i === currentStep ? "2px solid #818cf8" : i < currentStep ? "2px solid #6366f1" : "2px solid rgba(255,255,255,0.1)",
											display:"flex", alignItems:"center", justifyContent:"center",
											fontSize: 13, fontWeight: 700, color: i <= currentStep ? "#fff" : "rgba(255,255,255,0.2)",
											transition: "all 0.3s",
											boxShadow: i === currentStep ? "0 0 16px rgba(99,102,241,0.5)" : "none",
										}}>
											{i < currentStep ? "✓" : i + 1}
										</div>
										<span style={{ fontSize:10, fontFamily:"'Fira Code',monospace", letterSpacing:0.5, color: i <= currentStep ? "#a5b4fc" : "rgba(255,255,255,0.2)", textTransform:"uppercase" }}>
											{label}
										</span>
									</div>
									{i < stepLabels.length - 1 && (
										<div style={{ flex:1, height:1, margin:"0 8px 16px", background: i < currentStep ? "#6366f1" : "rgba(255,255,255,0.07)", transition:"background 0.4s" }} />
									)}
								</React.Fragment>
							))}
						</div>
					)}

					{info && !error && (
						<div style={{ background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:16, color:"#6ee7b7", fontSize:13 }}>
							{info}
						</div>
					)}
					{error && (
						<div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 14px", marginBottom:16, color:"#fca5a5", fontSize:13 }}>
							⚠ {error}
						</div>
					)}

					{step === STEPS.EMAIL && (
						<div style={{ animation:"fadeUp 0.35s ease both" }}>
							<div style={{ marginBottom:28 }}>
								<div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#6366f1,#4f46e5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:14, boxShadow:"0 4px 16px rgba(99,102,241,0.4)" }}>🔑</div>
								<h1 style={{ color:"#fff", fontSize:22, fontWeight:800, margin:"0 0 4px" }}>Forgot Password?</h1>
								<p style={{ color:"rgba(255,255,255,0.3)", fontSize:13, margin:0 }}>Enter your email and we'll send you a reset code.</p>
							</div>
							<form onSubmit={handleSendOTP}>
								<label style={{ display:"block", marginBottom:8, color:"rgba(255,255,255,0.4)", fontSize:11, fontFamily:"'Fira Code',monospace", letterSpacing:1.5, textTransform:"uppercase" }}>Email address</label>
								<div style={{ position:"relative", marginBottom:24 }}>
									<span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.35, pointerEvents:"none" }}>✉</span>
									<input value={email} onChange={(e) => setEmail(e.target.value)} className="fp-input" required type="email" placeholder="your@email.com" style={{ paddingLeft:44 }} />
								</div>
								<button className="fp-btn" type="submit" disabled={loading}>
									{loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={{ width:18,height:18,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} />Sending…</span> : "Send Reset Code →"}
								</button>
							</form>
							<p style={{ textAlign:"center", color:"rgba(255,255,255,0.25)", fontSize:13, marginTop:20 }}>
								Remembered it?{" "}
								<Link to="/login" style={{ color:"#818cf8", textDecoration:"none", fontWeight:600 }}>Back to login</Link>
							</p>
						</div>
					)}

					{step === STEPS.OTP && (
						<div style={{ animation:"fadeUp 0.35s ease both" }}>
							<div style={{ marginBottom:24 }}>
								<h1 style={{ color:"#fff", fontSize:22, fontWeight:800, margin:"0 0 4px" }}>Enter Reset Code</h1>
								<p style={{ color:"rgba(255,255,255,0.3)", fontSize:13, margin:0 }}>
									Code sent to <strong style={{ color:"#a5b4fc" }}>{email}</strong>
								</p>
							</div>
							<OTPInput length={6} value={otpCode} onChange={setOtpCode} disabled={loading} />
							<button className="fp-btn" onClick={handleVerifyOTP} disabled={loading || otpCode.length < 6} style={{ marginTop:24 }}>
								{loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={{ width:18,height:18,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} />Verifying…</span> : "Verify Code →"}
							</button>
							<div style={{ textAlign:"center", marginTop:16 }}>
								{timer > 0 ? (
									<span style={{ color:"rgba(255,255,255,0.2)", fontSize:13 }}>Resend in <strong style={{ color:"#a78bfa" }}>{timer}s</strong></span>
								) : (
									<button onClick={handleResend} disabled={loading} style={{ background:"none", border:"none", color:"#6366f1", fontSize:13, fontWeight:600, cursor:"pointer", textDecoration:"underline" }}>Resend code</button>
								)}
							</div>
							<button onClick={() => { setStep(STEPS.EMAIL); setError(""); setOtpCode(""); }} style={{ width:"100%", marginTop:12, padding:"12px", background:"transparent", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, color:"rgba(255,255,255,0.3)", fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
								← Change email
							</button>
						</div>
					)}

					{step === STEPS.PASSWORD && (
						<div style={{ animation:"fadeUp 0.35s ease both" }}>
							<div style={{ marginBottom:24 }}>
								<h1 style={{ color:"#fff", fontSize:22, fontWeight:800, margin:"0 0 4px" }}>Set New Password</h1>
								<p style={{ color:"rgba(255,255,255,0.3)", fontSize:13, margin:0 }}>Choose a strong password for your account.</p>
							</div>
							<form onSubmit={handleResetPassword}>
								<label style={{ display:"block", marginBottom:8, color:"rgba(255,255,255,0.4)", fontSize:11, fontFamily:"'Fira Code',monospace", letterSpacing:1.5, textTransform:"uppercase" }}>New Password</label>
								<div style={{ position:"relative", marginBottom:4 }}>
									<span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.35, pointerEvents:"none" }}>🔒</span>
									<input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="fp-input" type={showNew ? "text" : "password"} required placeholder="New password" style={{ paddingLeft:44, paddingRight:48 }} />
									<button type="button" onClick={() => setShowNew(!showNew)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", fontSize:15 }}>{showNew ? "🙈" : "👁"}</button>
								</div>
								<PasswordStrength password={newPassword} />

								<label style={{ display:"block", margin:"18px 0 8px", color:"rgba(255,255,255,0.4)", fontSize:11, fontFamily:"'Fira Code',monospace", letterSpacing:1.5, textTransform:"uppercase" }}>Confirm Password</label>
								<div style={{ position:"relative", marginBottom:28 }}>
									<span style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", fontSize:15, opacity:0.35, pointerEvents:"none" }}>🔒</span>
									<input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="fp-input" type={showConfirm ? "text" : "password"} required placeholder="Confirm password"
										style={{ paddingLeft:44, paddingRight:48, borderColor: confirmPassword && confirmPassword !== newPassword ? "rgba(239,68,68,0.5)" : undefined }} />
									<button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.3)", fontSize:15 }}>{showConfirm ? "🙈" : "👁"}</button>
								</div>
								{confirmPassword && confirmPassword !== newPassword && (
									<p style={{ color:"#fca5a5", fontSize:12, marginTop:-20, marginBottom:16, fontFamily:"'Fira Code',monospace" }}>⚠ Passwords don't match</p>
								)}
								<button className="fp-btn" type="submit" disabled={loading || !newPassword || newPassword !== confirmPassword}>
									{loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={{ width:18,height:18,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} />Resetting…</span> : "Reset & Sign In →"}
								</button>
							</form>
						</div>
					)}

					{step === STEPS.SUCCESS && (
						<div style={{ textAlign:"center", animation:"fadeUp 0.4s ease both", padding:"20px 0" }}>
							<div style={{ width:80, height:80, borderRadius:"50%", margin:"0 auto 20px", background:"linear-gradient(135deg,#10b981,#059669)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, boxShadow:"0 8px 32px rgba(16,185,129,0.4)", animation:"successPop 0.5s ease both" }}>✓</div>
							<h2 style={{ color:"#ecfdf5", fontSize:22, fontWeight:800, margin:"0 0 8px" }}>Password Reset!</h2>
							<p style={{ color:"rgba(255,255,255,0.35)", fontSize:14, margin:"0 0 6px" }}>You're now signed in.</p>
							<p style={{ color:"rgba(255,255,255,0.2)", fontSize:12, fontFamily:"'Fira Code',monospace" }}>Redirecting to home…</p>
							<div style={{ marginTop:20, width:40, height:3, borderRadius:4, background:"linear-gradient(90deg,#6366f1,#10b981)", margin:"20px auto 0", animation:"shimmer 1.5s linear infinite", backgroundSize:"200% auto" }} />
						</div>
					)}
				</div>
			</div>
		</>
	);
}