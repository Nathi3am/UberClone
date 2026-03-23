import React, { useState, useEffect } from "react";
import logoPath from "../config/logo";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import API from "../config/api";
import PasswordRequirements from "../components/PasswordRequirements";
import OTPFlow from "../components/OTPFlow";
import { UserDataContext } from "../context/UserContext";
import { ToastContainer, toast } from "react-toastify";

const UserSignup = () => {
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [showPwdReq, setShowPwdReq] = useState(false);
  const [showOtpFlow, setShowOtpFlow] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);

  const [userData, setUserData] = useState({});

  // Auto-prefill test otp on dev environment for easier dev testing.
  useEffect(() => {
    try {
      const host = typeof window !== "undefined" ? window.location.hostname : null;
      if (host === "vexomove.onrender.com") {
        const testOtp = import.meta.env.VITE_TEST_OTP || "";
        if (testOtp) {
          // OTPFlow handles test OTP; nothing to set here in signup
        }
      }
    } catch (e) {
      // ignore in non-browser environments
    }
  }, []);

  
  function timeout(delay) {
    return new Promise((res) => setTimeout(res, delay));
  }
  const notify = () =>
    toast.success(`Registered, Redirecting to Login`, {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "dark",
      className: "w-5/6 mt-6 text-center",
    });
  const navigate = useNavigate();
  const { user, setUser } = React.useContext(UserDataContext);

  const submitHandler = async (e) => {
    e.preventDefault();
    // ensure passwords match before sending OTP
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    // send OTP to email and show verification input
    if (!email) {
      alert("Please enter a valid email");
      return;
    }
    // check availability first
    try {
      const eaddr = typeof email === 'string' ? email.trim().toLowerCase() : email;
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(eaddr)) {
        setEmailError('Invalid email address');
        return;
      }
      setEmailChecking(true);
      const avail = await axios.get(`${API}/api/check-email`, { params: { email: eaddr } });
      if (avail && avail.data && avail.data.available === false) {
        setEmailError(avail.data.message || 'Email already exists');
        setEmailChecking(false);
        return;
      }
      setEmailChecking(false);
    } catch (err) {
      console.error('check email error', err?.response?.data || err.message || err);
      setEmailChecking(false);
      // If the availability check fails (server down), proceed but notify
      toast.warn('Could not verify email availability — proceeding');
    }

    // show embedded OTP flow which will send the email and verify
    setShowOtpFlow(true);
  };
  const handleVerifiedAndRegister = async (verifiedEmail) => {
    // called by OTPFlow when verification succeeds
    try {
      const newUser = {
        fullname: { firstname, lastname },
        email: verifiedEmail || email,
        password,
        emailVerified: true,
      };
      const response = await axios.post(`${API}/users/register`, newUser);
      // reset fields
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setFirstName("");
      setLastName("");
      setProfileImage(null);
      setShowOtpFlow(false);

      if (response.status === 201) {
        const data = response.data;
        setUserData(data.user);
        setUser(data.user);
        // Persist token and mark user as logged in
        try { localStorage.setItem('token', data.token); } catch (e) {}
        notify();
        await timeout(1500);
        navigate("/home");
      } else {
        throw new Error(response?.data?.message || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      alert(err?.message || "Registration failed after verification");
    }
  };
  return (
    <div className="flex flex-col justify-between h-screen">
      <div>
        <div className="ml-7 py-7 hover:scale-105 transition-transform duration-300">
          <Link to="/">
            <img className="w-16" src={logoPath} alt="logo" />
          </Link>
        </div>

        <div className="px-6 pt-6">
          <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <form
              onSubmit={(e) => {
                submitHandler(e);
              }}
            >
              
              <h3 className="text-base mb-2 font-semibold text-white">
                What should we call you?
              </h3>
              <div className="flex gap-3 mb-5">
                <input
                  value={firstname}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-lg placeholder:text-gray-400 font-semibold placeholder:ml-2 w-1/2 backdrop-blur-sm"
                  required
                  type="text"
                  placeholder="First name"
                />
                <input
                  value={lastname}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-lg placeholder:text-gray-400 font-semibold placeholder:ml-2 w-1/2 backdrop-blur-sm"
                  required
                  type="text"
                  placeholder="Last name"
                />
              </div>

              <h3 className="text-base mb-2 font-semibold text-white">What's your email</h3>
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                className="bg-white/10 mb-5 rounded-lg px-4 py-3 border border-white/20 w-full text-lg placeholder:text-gray-400 font-semibold backdrop-blur-sm"
                required
                type="email"
                placeholder="your_email@here.com"
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {emailError && <p style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>{emailError}</p>}
                {emailChecking && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 }}>Checking…</p>}
              </div>
              
              <h3 className="text-base mb-2 font-semibold text-white">Enter Password</h3>
              <div
                className="relative"
                onMouseEnter={() => setShowPwdReq(true)}
                onMouseLeave={() => setShowPwdReq(false)}
              >
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setShowPwdReq(true)}
                  onBlur={() => setShowPwdReq(false)}
                  className="bg-white/10 mb-5 rounded-lg px-4 py-3 border border-white/20 w-full text-lg placeholder:text-gray-400 font-semibold backdrop-blur-sm"
                  type="password"
                  required
                  placeholder="yourPassword"
                />
                {showPwdReq && (
                  <div className="absolute left-0 top-full mt-2 z-50">
                    <PasswordRequirements password={password} />
                  </div>
                )}
              </div>
              <h3 className="text-base mb-2 font-semibold text-white">Confirm Password</h3>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-white/10 mb-5 rounded-lg px-4 py-3 border border-white/20 w-full text-lg placeholder:text-gray-400 font-semibold backdrop-blur-sm"
                type="password"
                required
                placeholder="confirmPassword"
              />
              <h3 className="text-base mb-2 font-semibold text-white">Upload Profile Picture (Optional)</h3>
              <input
                onChange={(e) => setProfileImage(e.target.files[0])}
                className="bg-white/10 mb-5 rounded-lg px-4 py-3 border border-white/20 w-full text-base placeholder:text-gray-400 font-semibold file:bg-indigo-500/40 file:border-0 file:text-white file:font-semibold backdrop-blur-sm"
                type="file"
                accept=".jpg,.jpeg,.png"
              />
              {showOtpFlow && (
                <div className="mb-4">
                  <OTPFlow onVerified={handleVerifiedAndRegister} />
                </div>
              )}

              <div id="recaptcha-container"></div>
              <button className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-lg hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-300 mt-2">
                {showOtpFlow ? "Waiting for verification…" : "Create Account"}
              </button>
              <p className="text-center text-gray-300 mt-4">
                Already a user?{" "}
                <Link to="/login" className="text-indigo-400 hover:text-indigo-300">
                  Login here.
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
      <div className="flex justify-center items-center p-4 bg-[#121826]/50 border-t border-white/10">
        <p className="text-center text-[11px] text-gray-400">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy. Your information is safe with us and will not be shared
          without your consent.
        </p>
      </div>
      <ToastContainer />
    </div>
  );
};

export default UserSignup;
