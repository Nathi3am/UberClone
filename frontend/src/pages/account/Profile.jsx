import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserDataContext } from "../../context/UserContext";
import { toast } from "react-toastify";
import API from '../../config/api';

const Profile = () => {
  const { user, setUser } = useContext(UserDataContext);
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.profileImage || null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || "",
  });
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState(null); // 'delete' | 'emailChange'
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [tripsLoading, setTripsLoading] = useState(true);
  const [totalTrips, setTotalTrips] = useState(null);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
        toast.error("Only JPG and PNG images are allowed");
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    // open confirmation modal
    setConfirmLogout(true);
  };

  const performLogout = () => {
    try {
      localStorage.removeItem("token");
      setUser(null);
      toast.info("Logged out", { position: "top-center" });
      navigate("/login");
    } catch (e) {
      console.error("Logout error", e);
      toast.error("Failed to logout");
    } finally {
      setConfirmLogout(false);
    }
  };

  const cancelLogout = () => setConfirmLogout(false);

  const handleDeleteClick = () => setConfirmDelete(true);

  const performDelete = async () => {
    // send OTP to user's email and show verification modal
    if (!user || !user.email) {
      toast.error('No email available for verification');
      return;
    }
    setOtpSending(true);
    const base = API || '';
    try {
      const res = await fetch(`${base}/api/otp/send-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        setOtpPurpose('delete');
        setOtpTargetEmail(user.email);
        setOtpSent(true);
        toast.info('Verification code sent to your email');
      } else {
        const e = await res.json().catch(() => ({}));
        toast.error(e.message || 'Failed to send verification code');
      }
    } catch (err) {
      console.error('OTP send error', err);
      toast.error('Could not send verification code');
    } finally {
      setOtpSending(false);
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  };

  const cancelDelete = () => setConfirmDelete(false);

  const resendOtp = async () => {
    const target = otpPurpose === 'emailChange' ? otpTargetEmail : (user && user.email);
    if (!target) return;
    setOtpSending(true);
    try {
      const base = API || '';
      const res = await fetch(`${base}/api/otp/send-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target })
      });
      if (res.ok) {
        toast.info('Verification code resent');
        setOtpError('');
      } else {
        const e = await res.json().catch(() => ({}));
        setOtpError(e.message || 'Failed to resend code');
      }
    } catch (e) {
      setOtpError('Network error');
    } finally {
      setOtpSending(false);
    }
  };

  // Verify OTP for email change and perform update
  const verifyOtpAndUpdate = async () => {
    if (!otpTargetEmail) return setOtpError('No target email to verify');
    if (!otpCode || otpCode.trim().length === 0) { setOtpError('Enter the code'); return; }
    setOtpVerifying(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { email: otpTargetEmail, code: otpCode.trim() };
      const res = await fetch(`${API}/users/update-profile`, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const updatedUser = data.user || { ...user, email: otpTargetEmail };
        setUser(updatedUser);
        toast.success('Email updated successfully');
        setOtpSent(false);
        setOtpCode('');
        setOtpPurpose(null);
        setOtpTargetEmail('');
        setIsEditing(false);
      } else {
        const e = await res.json().catch(() => ({}));
        setOtpError(e.message || 'Failed to verify code');
      }
    } catch (e) {
      console.error('verify+update error', e);
      setOtpError('Failed to contact server');
    } finally {
      setOtpVerifying(false);
    }
  };

  const verifyOtpAndDelete = async () => {
    if (!user || !user.email) return;
    if (!otpCode || otpCode.trim().length === 0) { setOtpError('Enter the code'); return; }
    setOtpVerifying(true);
    try {
      const base = API || '';
      // Send OTP code to backend delete endpoint; backend will verify and delete
      try {
        const token = localStorage.getItem('token');
        const delRes = await fetch(`${API}/users/delete`, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: `Bearer ${token}` } : {}),
          body: JSON.stringify({ code: otpCode.trim() })
        });

        if (delRes.ok) {
          localStorage.removeItem('token');
          setUser(null);
          toast.success('Account deleted');
          setOtpSent(false);
          navigate('/signup');
        } else {
          const e = await delRes.json().catch(() => ({}));
          setOtpError(e.message || 'Failed to delete account');
        }
      } catch (e) {
        console.error('delete request error', e);
        setOtpError('Failed to contact server');
      }
    } catch (err) {
      console.error('verify+delete error', err);
      setOtpError('Verification failed');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleUploadImage = async () => {
    if (!profileImage) {
      toast.warning("Please select an image first");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("profileImage", profileImage);

      const response = await fetch(
        `${API}/users/upload-profile-image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        // backend returns { profileImage: '/uploads/xxx', user }
        const updatedUser = data.user || { ...user, profileImage: data.profileImage };
        // ensure profileImage is a full URL for preview
        const base = API || '';
        const fullImage = data.profileImage ? `${base}${data.profileImage}` : updatedUser.profileImage;
        setUser({ ...updatedUser, profileImage: fullImage });
        setPreviewUrl(fullImage);
        setProfileImage(null);
        toast.success("Profile picture updated successfully");
      } else {
        toast.error("Failed to upload profile picture");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading profile picture");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "email") setEmailError("");
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        email: formData.email,
      };
      // If the email changed, send OTP to the new address and require verification
      const newEmail = formData.email || '';
      if (newEmail && newEmail.trim().toLowerCase() !== (user && user.email)) {
        // trigger OTP send to new email and show verification modal
        const base = API || '';
        try {
          setOtpSending(true);
          const sendRes = await fetch(`${base}/api/otp/send-email`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: newEmail.trim().toLowerCase() })
          });
          if (sendRes.ok) {
            setOtpPurpose('emailChange');
            setOtpTargetEmail(newEmail.trim().toLowerCase());
            setOtpSent(true);
            toast.info('Verification code sent to new email');
            return;
          } else {
            const e = await sendRes.json().catch(() => ({}));
            const msg = e.message || 'Failed to send verification code';
            setEmailError(msg);
            return;
          }
        } catch (e) {
          console.error('send otp error', e);
          setEmailError('Failed to send verification code');
          return;
        } finally {
          setOtpSending(false);
        }
      }

      // no email change — proceed with immediate update
      const res = await fetch(`${API}/users/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUser = data.user || { ...user, phone: payload.phone, email: payload.email };
        setUser(updatedUser);
        setEmailError("");
        toast.success("Profile updated successfully");
        setIsEditing(false);
      } else {
        const err = await res.json().catch(() => ({}));
        // handle express-validator style errors
        if (err && Array.isArray(err.errors) && err.errors.length) {
          const emailErr = err.errors.find((e) => e.param === 'email');
          if (emailErr) {
            setEmailError(emailErr.msg || 'Invalid email');
            return;
          }
        }
        // handle custom duplicate email message
        if (err && err.message && /email/i.test(err.message)) {
          setEmailError(err.message);
          return;
        }

        toast.error(err.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save error", err);
      toast.error("Error updating profile");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch authoritative trip history count for the current user
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setTripsLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API}/rides/count`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const count = (data && typeof data.count === 'number') ? data.count : null;
          setTotalTrips(count);
        } else {
          setTotalTrips(null);
        }
      } catch (e) {
        setTotalTrips(null);
      } finally {
        if (mounted) setTripsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Personal Information</h2>
        <p className="text-gray-400">Manage your account details and profile</p>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-6">Profile Picture</h3>

        <div className="flex gap-8 items-start">
          {/* Preview */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 p-1 mb-4 overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#0B0F1A] rounded-full flex items-center justify-center text-4xl">
                  👤
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 text-center">Current profile picture</p>
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <label className="block mb-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleImageChange}
                  className="hidden"
                  id="profileImageInput"
                />
                <label
                  htmlFor="profileImageInput"
                  className="block w-full py-3 px-4 bg-white/10 border-2 border-dashed border-white/20 rounded-lg text-center cursor-pointer hover:border-indigo-400 hover:bg-white/20 transition-all duration-300"
                >
                  <span className="text-gray-300 hover:text-indigo-300">
                    Click to select image (JPG, PNG)
                  </span>
                </label>
              </div>
            </label>

            {profileImage && (
              <p className="text-sm text-indigo-400 mb-4">
                File selected: {profileImage.name}
              </p>
            )}

            <button
              onClick={handleUploadImage}
              disabled={!profileImage || isLoading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-lg hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Uploading..." : "Upload Picture"}
            </button>
          </div>
        </div>
      </div>

      {/* User Information */}
      <div className="bg-[#121826]/70 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-6">Account Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={user?.fullname?.firstname || ""}
              disabled
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Contact support to change</p>
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              value={user?.fullname?.lastname || ""}
              disabled
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-semibold cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Contact support to change</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={isEditing ? formData.email : (user?.email || "")}
              onChange={isEditing ? handleChange : undefined}
              disabled={!isEditing}
              className={`w-full px-4 py-3 bg-white/5 border ${emailError ? 'border-red-500' : 'border-white/10'} rounded-lg text-white font-semibold`}
            />
            {emailError ? (
              <p className="text-xs text-red-400 mt-1">{emailError}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">{isEditing ? 'You can edit this field' : 'Verified'}</p>
            )}
          </div>
          {/* Phone removed per UI update */}
        </div>
        {/* Edit / Save button */}
        <div className="flex justify-end mt-6">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true) || setFormData({ email: user?.email || "" })}
              className="px-6 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 font-semibold"
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => { setIsEditing(false); setFormData({ email: user?.email || "" }); }}
                className="px-6 py-2 rounded-xl bg-gray-700 text-gray-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow-lg disabled:opacity-50"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Account Created</p>
          <p className="text-white font-semibold">
            {new Date(user?.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Account Status</p>
          <p className="text-white font-semibold">Active</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Verification</p>
          <p className="text-white font-semibold">Complete</p>
        </div>
        {/* Total Trips - positioned under Verification on medium+ screens */}
        <div className="bg-gradient-to-br from-yellow-400/20 to-orange-400/20 border border-yellow-400/30 rounded-xl p-4 md:col-start-3">
          <p className="text-gray-400 text-sm mb-1">Total Trips</p>
          <p className="text-white font-semibold">
            {tripsLoading ? (
              <span className="text-gray-300">Loading...</span>
            ) : (
              (typeof totalTrips === 'number' ? totalTrips : (user && (user.totalTrips || user.tripsCount || user.completedRides) ? (user.totalTrips || user.tripsCount || user.completedRides) : 0))
            )}
          </p>
        </div>
      </div>
      {/* Logout Button */}
      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold shadow-lg hover:shadow-red-400/30 hover:scale-[1.02] active:scale-95 transition-all duration-300"
        >
          Log Out
        </button>
      </div>
      <div className="mt-4">
        <button
          onClick={handleDeleteClick}
          className="w-full py-3 rounded-xl bg-transparent border border-red-600 text-red-500 font-semibold shadow-sm hover:bg-red-600/5 transition-all duration-200"
        >
          Delete Account
        </button>
      </div>
      {/* Logout confirmation modal */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={cancelLogout} />
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 w-[90%] max-w-md text-center">
            <h3 className="text-lg font-semibold text-white mb-4">Logging out?</h3>
            <p className="text-sm text-gray-300 mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={performLogout}
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold"
              >
                Yes
              </button>
              <button
                onClick={cancelLogout}
                className="px-5 py-2 rounded-lg bg-gray-700 text-white font-semibold"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={cancelDelete} />
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 w-[90%] max-w-md text-center">
            <h3 className="text-lg font-semibold text-white mb-4">Delete account?</h3>
            <p className="text-sm text-gray-300 mb-6">This action is irreversible. Are you sure you want to permanently delete your account?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={performDelete}
                disabled={deleteLoading || otpSending}
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold"
              >
                {deleteLoading ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                onClick={cancelDelete}
                className="px-5 py-2 rounded-lg bg-gray-700 text-white font-semibold"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      {/* OTP verification modal (after sending) */}
      {otpSent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOtpSent(false)} />
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 w-[90%] max-w-md text-center">
            <h3 className="text-lg font-semibold text-white mb-4">Enter verification code</h3>
                  <p className="text-sm text-gray-300 mb-4">{
                    otpPurpose === 'emailChange' ? (
                      <>We sent a verification code to <strong>{otpTargetEmail}</strong>. Enter it below to confirm email change.</>
                    ) : (
                      <>We sent a verification code to <strong>{user?.email}</strong>. Enter it below to confirm account deletion.</>
                    )
                  }</p>
            <input
              value={otpCode}
              onChange={e => { setOtpCode(e.target.value); setOtpError(''); }}
              placeholder="Enter code"
              className="w-full px-4 py-2 rounded-lg mb-3 bg-black/40 text-white text-center"
            />
            {otpError && <div className="text-sm text-red-400 mb-3">{otpError}</div>}
            <div className="flex justify-center gap-4">
              <button
                onClick={otpPurpose === 'emailChange' ? verifyOtpAndUpdate : verifyOtpAndDelete}
                disabled={otpVerifying}
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold"
              >
                {otpVerifying ? 'Verifying…' : (otpPurpose === 'emailChange' ? 'Verify & Update' : 'Verify & Delete')}
              </button>
              <button
                onClick={() => { setOtpSent(false); setOtpCode(''); setOtpError(''); }}
                className="px-5 py-2 rounded-lg bg-gray-700 text-white font-semibold"
              >
                Cancel
              </button>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              <button onClick={resendOtp} disabled={otpSending} className="underline">Resend code</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
