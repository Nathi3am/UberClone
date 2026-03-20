import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import logoPath from "../config/logo";
import { Link } from "react-router-dom";
import { CaptainDataContext } from "../context/CaptainContext";
import PasswordRequirements from "../components/PasswordRequirements";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API from "../config/api";

const CaptainSignup = () => {
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwdReq, setShowPwdReq] = useState(false);
  const [userData, setUserData] = useState({});
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewClosing, setReviewClosing] = useState(false);
  const [signupOtp, setSignupOtp] = useState("");
  const [pendingCaptainData, setPendingCaptainData] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleCapacity, setVehicleCapacity] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [plateError, setPlateError] = useState("");
  const [plateChecking, setPlateChecking] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const navigate = useNavigate();
  const { captain, setCaptain } = React.useContext(CaptainDataContext);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const captainData = {
      fullname: {
        firstname: firstname,
        lastname: lastname,
      },
      email: email,
      password: password,
      vehicle: {
        color: vehicleColor,
        plate: vehiclePlate,
        make: vehicleMake,
        year: vehicleYear,
        capacity: vehicleCapacity,
        vehicleType: vehicleType,
      },
    };

    // attach preview file if present
    if (profileFile) {
      captainData.profileImage = true; // marker for client flow
    }

    // check email availability first (prevents creating duplicate accounts)
    try {
      const eaddr = typeof email === 'string' ? email.trim().toLowerCase() : email;
      const avail = await axios.get(`${API}/api/check-email`, { params: { email: eaddr } });
      if (avail && avail.data && avail.data.available === false) {
        setEmailError(avail.data.message || 'Email already exists');
        return;
      }

      // store pending data and send OTP to email before creating account
      const res = await axios.post(`${API}/api/otp/send-email`, { email: eaddr });
      if (res && (res.status === 200 || res.status === 201 || res.data?.success)) {
        setPendingCaptainData(captainData);
        setShowVerifyModal(true);
        setEmailError("");
        toast.info('Verification code sent to your email');
      } else {
        toast.error(res.data?.message || 'Failed to send verification code');
      }
    } catch (err) {
      console.error('send signup otp error', err?.response?.data || err.message || err);
      const msg = err?.response?.data?.message || err.message || 'Failed to send verification code';
      toast.error(msg);
      // If OTP service is unavailable (dev), fallback to creating the account directly
      const shouldFallback = !err?.response || (err.response && err.response.status >= 500) || (String(msg).toLowerCase().includes('otp proxy'));
      if (shouldFallback) {
        try {
          // Before direct-creating in fallback ensure availability one more time
            try {
            const avail2 = await axios.get(`${API}/api/check-email`, { params: { email: eaddr } });
            if (avail2 && avail2.data && avail2.data.available === false) {
              setEmailError(avail2.data.message || 'Email already exists');
              return;
            }
          } catch (e) {}

          // send multipart if profile image present
          let createRes;
          if (profileFile) {
            const fd = new FormData();
            fd.append('fullname[firstname]', captainData.fullname.firstname);
            fd.append('fullname[lastname]', captainData.fullname.lastname || '');
            fd.append('email', captainData.email);
            fd.append('password', captainData.password);
            fd.append('vehicle[color]', captainData.vehicle.color);
            fd.append('vehicle[plate]', captainData.vehicle.plate);
            fd.append('vehicle[make]', captainData.vehicle.make || '');
            fd.append('vehicle[year]', captainData.vehicle.year || '');
            fd.append('vehicle[capacity]', captainData.vehicle.capacity);
            fd.append('vehicle[vehicleType]', captainData.vehicle.vehicleType);
            fd.append('profileImage', profileFile, profileFile.name);
            createRes = await axios.post(`${API}/captain/register`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          } else {
            createRes = await axios.post(`${API}/captain/register`, captainData);
          }
          if (createRes && (createRes.status === 201 || createRes.data?.message)) {
            setPendingCaptainData(captainData);
            setShowReviewModal(true);
            toast.info('Your account is under Review by admin, wait for admin approval');
          } else {
            toast.error(createRes.data?.message || 'Failed to create account');
          }
        } catch (createErr) {
          console.error('Fallback create captain error', createErr?.response?.data || createErr.message || createErr);
          const errData = createErr?.response?.data;
          if (errData && errData.error === 'vehicle_plate_taken') {
            setPlateError('This vehicle plate is already in use. Please check your plate number.');
            return;
          }
          toast.error(createErr?.response?.data?.message || 'Failed to create account (fallback)');
        }
      }
    }
  };

  // live-debounce email availability check
  React.useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const eaddr = typeof email === 'string' ? email.trim().toLowerCase() : email;
        if (!eaddr) {
          if (mounted) { setEmailError(''); setEmailChecking(false); }
          return;
        }
        // basic email format check before pinging server
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(eaddr)) {
          if (mounted) { setEmailError('Invalid email address'); setEmailChecking(false); }
          return;
        }
        if (mounted) setEmailChecking(true);
        const avail = await axios.get(`${API}/api/check-email`, { params: { email: eaddr } });
        if (!mounted) return;
        if (avail && avail.data && avail.data.available === false) {
          setEmailError(avail.data.message || 'Email already exists');
        } else {
          setEmailError('');
        }
      } catch (err) {
        console.error('live check email error', err?.response?.data || err.message || err);
      } finally {
        if (mounted) setEmailChecking(false);
      }
    };

    const handle = setTimeout(check, 500);
    return () => { mounted = false; clearTimeout(handle); };
  }, [email]);

  // live-debounce plate availability check
  React.useEffect(() => {
    let mounted = true;
    if (!vehiclePlate || vehiclePlate.trim().length < 2) {
      setPlateError('');
      setPlateChecking(false);
      return;
    }
    setPlateChecking(true);
    const check = async () => {
      try {
        const plateNorm = String(vehiclePlate || '').trim().toUpperCase();
        const res = await axios.get(`${API}/api/check-plate`, { params: { plate: plateNorm } });
        if (!mounted) return;
        if (res && res.data && res.data.available === false) {
          setPlateError('This vehicle plate is already in use. Please check your plate number.');
        } else {
          setPlateError('');
        }
      } catch (err) {
        // on error, clear checking but don't block user
        console.error('plate check error', err?.response?.data || err.message || err);
      } finally {
        if (mounted) setPlateChecking(false);
      }
    };

    const handle = setTimeout(check, 450);
    return () => { mounted = false; clearTimeout(handle); };
  }, [vehiclePlate]);

  const verifyAndCreate = async () => {
    if (!pendingCaptainData) return;
    if (!signupOtp || signupOtp.length < 4) { toast.error('Enter the full code'); return; }
    setVerifyLoading(true);
    try {
      const emailNorm = typeof pendingCaptainData.email === 'string' ? pendingCaptainData.email.trim().toLowerCase() : pendingCaptainData.email;
      // verify OTP via backend proxy which forwards to OTP service
      const v = await axios.post(`${API}/api/auth/verify-reset-otp`, { email: emailNorm, code: signupOtp });
      if (v && v.data && v.data.success) {
        // create captain account
        let createRes;
        if (profileFile) {
          const fd = new FormData();
          fd.append('fullname[firstname]', pendingCaptainData.fullname.firstname);
          fd.append('fullname[lastname]', pendingCaptainData.fullname.lastname || '');
          fd.append('email', pendingCaptainData.email);
          fd.append('password', pendingCaptainData.password);
          fd.append('vehicle[color]', pendingCaptainData.vehicle.color);
          fd.append('vehicle[plate]', pendingCaptainData.vehicle.plate);
          fd.append('vehicle[make]', pendingCaptainData.vehicle.make || '');
          fd.append('vehicle[year]', pendingCaptainData.vehicle.year || '');
          fd.append('vehicle[capacity]', pendingCaptainData.vehicle.capacity);
          fd.append('vehicle[vehicleType]', pendingCaptainData.vehicle.vehicleType);
          fd.append('profileImage', profileFile, profileFile.name);
          createRes = await axios.post(`${API}/captain/register`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } else {
          createRes = await axios.post(`${API}/captain/register`, pendingCaptainData);
        }
        if (createRes.status === 201) {
          const data = createRes.data;
          setUserData(data.user);
          // Do not auto-sign-in — show admin review notice instead
          setShowVerifyModal(false);
          setReviewClosing(false);
          setShowReviewModal(true);
          toast.info('Your account is under Review by admin, wait for admin approval');
        } else {
          toast.error(createRes.data?.message || 'Failed to create account');
        }
      } else {
        toast.error(v?.data?.message || 'Invalid verification code');
      }
    } catch (err) {
      console.error('verify signup error', err?.response?.data || err.message || err);
      const errData = err?.response?.data;
      if (errData && errData.error === 'vehicle_plate_taken') {
        setPlateError('This vehicle plate is already in use. Please check your plate number.');
        setVerifyLoading(false);
        return;
      }
      toast.error(err?.response?.data?.message || 'Verification failed');
    } finally {
      setVerifyLoading(false);
    }
  };

  const simulateCreateAccount = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const captainData = {
      fullname: { firstname, lastname },
      email,
      password,
      vehicle: {
        color: vehicleColor,
        plate: vehiclePlate,
        make: vehicleMake,
        year: vehicleYear,
        capacity: vehicleCapacity,
        vehicleType,
      },
    };
    setPendingCaptainData(captainData);
    setReviewClosing(false);
    setShowReviewModal(true);
    toast.info('Your account is under Review by admin, wait for admin approval');
  };

  const onProfileChange = (e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setProfileFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setProfilePreview(url);
    } else {
      setProfilePreview(null);
    }
  };

  const closeReviewModal = () => {
    setReviewClosing(true);
    // leave time for exit animation then actually unmount
    setTimeout(() => {
      setShowReviewModal(false);
      setReviewClosing(false);
    }, 260);
  };
  return (
    <div className="flex flex-col justify-between h-screen">
      <div>
        <div className="ml-6 pt-5 pb-2.5 hover:scale-105 transition-transform duration-300">
          <Link to="/">
            <img className="w-12" src={logoPath} alt="logo" />
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
              <div className="flex gap-3 mb-4">
                <input
                  value={firstname}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-base placeholder:text-gray-400 font-semibold w-1/2 backdrop-blur-sm"
                  required
                  type="text"
                  placeholder="First name"
                />
                <input
                  value={lastname}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-base placeholder:text-gray-400 font-semibold w-1/2 backdrop-blur-sm"
                  required
                  type="text"
                  placeholder="Last name"
                />
              </div>

              <div className="mb-6">
                <h3 className="text-base mb-2 font-semibold text-white">Profile Picture</h3>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <input id="profileImageInput" type="file" accept="image/*" onChange={onProfileChange} className="hidden" />
                    <label htmlFor="profileImageInput" className="inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold rounded-lg shadow-lg cursor-pointer border-2 border-transparent hover:brightness-105 transition-all duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-95">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <circle cx="12" cy="10" r="3" />
                        <path d="M7 10l-2-2" />
                      </svg>
                      <span>Upload Photo</span>
                    </label>
                    <span className="mt-2 text-xs text-gray-400">JPG, PNG — max 5MB</span>
                  </div>
                  {profilePreview && (
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white/5 border border-white/10">
                      <img src={profilePreview} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <h3 className="text-base mb-2 font-semibold text-white">What's your email</h3>
                <div style={{ position: 'relative' }}>
                  <input
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    className="bg-white/10 mb-4 rounded-lg px-4 py-3 border border-white/20 w-full text-base placeholder:text-gray-400 font-semibold backdrop-blur-sm"
                    required
                    type="email"
                    placeholder="your_email@here.com"
                  />
                  <div style={{ position: 'absolute', right: 12, top: 12 }}>
                    {emailChecking && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Checking…</span>}
                  </div>
                </div>
                {emailError && <p style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>{emailError}</p>}
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
                  className="bg-white/10 mb-4 rounded-lg px-4 py-3 border border-white/20 w-full text-base placeholder:text-gray-400 font-semibold backdrop-blur-sm"
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
                className="bg-white/10 mb-4 rounded-lg px-4 py-3 border border-white/20 w-full text-base placeholder:text-gray-400 font-semibold backdrop-blur-sm"
                type="password"
                required
                placeholder="confirmPassword"
              />
              <h3 className="text-base mb-2 font-semibold text-white">
                Vehicle Information
              </h3>
              <div className="flex gap-3 mb-5">
                <input
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-lg placeholder:text-gray-400 font-semibold w-1/2 backdrop-blur-sm"
                  required
                  type="text"
                  placeholder="Vehicle Color"
                />
                <div className="w-1/2 relative">
                  <input
                    value={vehiclePlate}
                    onChange={(e) => { const v = String(e.target.value || '').toUpperCase(); setVehiclePlate(v); setPlateError(''); }}
                    className={`bg-white/10 rounded-lg px-4 py-3 text-lg placeholder:text-gray-400 font-semibold w-full backdrop-blur-sm ${plateError ? 'border-red-500' : 'border-white/20'}`}
                    style={{ textTransform: 'uppercase' }}
                    required
                    type="text"
                    placeholder="Vehicle Plate"
                  />
                  {plateChecking && <span style={{ position: 'absolute', right: 10, top: 10, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Checking…</span>}
                  {plateError && <p className="text-sm text-red-400 mt-1">This vehicle plate is already in use. Please check your plate number.</p>}
                </div>
              </div>
              <div className="flex gap-3 mb-5">
                <input
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-lg placeholder:text-gray-400 font-semibold w-1/2 backdrop-blur-sm"
                  required
                  type="text"
                  placeholder="Make"
                />
                <input
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-lg placeholder:text-gray-400 font-semibold w-1/2 backdrop-blur-sm"
                  required
                  type="number"
                  placeholder="Year"
                />
              </div>
              <div className="flex gap-3 mb-10">
                <input
                  value={vehicleCapacity}
                  onChange={(e) => setVehicleCapacity(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-lg placeholder:text-gray-400 font-semibold w-1/2 backdrop-blur-sm"
                  required
                  type="number"
                  placeholder="Vehicle Capacity"
                />
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="bg-white/10 rounded-lg px-4 py-3 border border-white/20 text-base placeholder:text-gray-400 font-semibold w-1/2 backdrop-blur-sm"
                  required
                >
                  <option value="" disabled>
                    Select Vehicle Type
                  </option>
                  <option value="car">Car</option>
                  <option value="car">Seven Sitter</option>
                  <option value="auto">Taxi</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-lg hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-300 mt-2" onClick={(e) => submitHandler(e)}>
                  Create Account
                </button>
              </div>
              {/* Verification modal for signup OTP */}
              {showVerifyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                  <div className="bg-[#071024] p-6 rounded-lg w-[420px] max-w-[92%]">
                    <h4 className="text-white font-semibold mb-2">Verify your email</h4>
                    <p className="text-sm text-gray-300 mb-4">Enter the code sent to <strong className="text-indigo-300">{pendingCaptainData?.email}</strong></p>
                    <input value={signupOtp} onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="w-full p-3 rounded-md mb-4 bg-white/5 text-white" />
                    <div className="flex gap-3">
                      <button type="button" onClick={() => { setShowVerifyModal(false); setPendingCaptainData(null); setSignupOtp(''); }} className="flex-1 py-2 rounded bg-transparent border border-white/10 text-white">Cancel</button>
                      <button type="button" onClick={verifyAndCreate} disabled={verifyLoading} className="flex-1 py-2 rounded bg-indigo-600 text-white">{verifyLoading ? 'Verifying…' : 'Verify & Create'}</button>
                    </div>
                  </div>
                </div>
              )}
              {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <style>{`
                    @keyframes modalEnter {
                      from { transform: scale(0.96); opacity: 0; }
                      to { transform: scale(1); opacity: 1; }
                    }
                    @keyframes modalExit {
                      from { transform: scale(1); opacity: 1; }
                      to { transform: scale(0.96); opacity: 0; }
                    }
                  `}</style>
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeReviewModal} />
                  <div className="relative bg-gradient-to-br from-[#071024] to-[#081126] p-6 rounded-xl w-[520px] max-w-[92%] shadow-2xl border border-white/6 transform transition-all duration-300"
                    style={{ animation: reviewClosing ? 'modalExit 200ms cubic-bezier(.2,.9,.25,1) forwards' : 'modalEnter 200ms cubic-bezier(.2,.9,.25,1) forwards', transformOrigin: 'center' }}>
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400 text-xl">ℹ️</div>
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1 text-lg">Account Under Review</h4>
                        <p className="text-sm text-gray-300 mb-3 leading-relaxed">Your account is under review by an administrator. We'll notify you by email when your account is approved. Please wait for admin approval.</p>
                        {pendingCaptainData?.email && (
                          <p className="text-xs text-gray-400">Email: <span className="text-indigo-300">{pendingCaptainData.email}</span></p>
                        )}
                      </div>
                      <button aria-label="Close" onClick={closeReviewModal} className="ml-2 text-gray-300 hover:text-white text-2xl">✕</button>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button onClick={closeReviewModal} className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold shadow hover:opacity-95">Close</button>
                    </div>
                  </div>
                </div>
              )}
              <p className="text-center text-gray-300 mt-4">
                Already a captain?{" "}
                <Link to="/captain-login" className="text-indigo-400 hover:text-indigo-300">
                  Login here.
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default CaptainSignup;

