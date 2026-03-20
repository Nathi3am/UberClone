import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CaptainDataContext } from "../../context/CaptainContext";
import DriverBottomNav from "../../components/navigation/DriverBottomNav";
import axios from "axios";
import { toast } from "react-toastify";
import API from "../../config/api";

export default function CaptainProfile() {
  const { captain, setCaptain } = useContext(CaptainDataContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      setCaptain({});
      toast.info("Logged out");
      navigate("/captain-logout");
    } catch (err) {
      console.error("Logout error", err);
      toast.error("Failed to logout");
    }
  };
  const fileInputRef = useRef(null);

  const [profilePic, setProfilePic] = useState(captain?.profileImage || null);
  const [preview, setPreview] = useState(captain?.profileImage || null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstname: captain?.fullname?.firstname || "",
    lastname: captain?.fullname?.lastname || "",
    // prefer `brand` or `make` (various shapes), fall back to `model` or legacy keys
    carModel:
      captain?.vehicle?.brand ||
      captain?.vehicle?.make ||
      captain?.vehicle?.model ||
      captain?.brand ||
      captain?.make ||
      captain?.carBrand ||
      captain?.carModel ||
      "",
    carColor: captain?.vehicle?.color || "",
    // prefer `year`, then `modelYear` or other common keys
    carYear:
      captain?.vehicle?.year ||
      captain?.vehicle?.modelYear ||
      captain?.vehicle?.vehicleYear ||
      captain?.year ||
      captain?.carYear ||
      "",
    vehicleCapacity: captain?.vehicle?.capacity || "",
    vehiclePlate: captain?.vehicle?.plate || "",
    vehicleType: captain?.vehicle?.vehicleType || captain?.vehicle?.type || "",
  });

  // keep formData in sync when `captain` loads/changes
  useEffect(() => {
    setProfilePic(captain?.profileImage || null);
    setPreview(captain?.profileImage || null);
      setFormData({
      firstname: captain?.fullname?.firstname || "",
      lastname: captain?.fullname?.lastname || "",
      carModel:
        captain?.vehicle?.brand ||
        captain?.vehicle?.make ||
        captain?.vehicle?.model ||
        captain?.brand ||
        captain?.make ||
        captain?.carBrand ||
        captain?.carModel ||
        "",
      carColor: captain?.vehicle?.color || "",
      carYear:
        captain?.vehicle?.year ||
        captain?.vehicle?.modelYear ||
        captain?.vehicle?.vehicleYear ||
        captain?.year ||
        captain?.carYear ||
        "",
      vehicleCapacity: captain?.vehicle?.capacity || "",
      vehiclePlate: captain?.vehicle?.plate || "",
      vehicleType: captain?.vehicle?.vehicleType || captain?.vehicle?.type || "",
    });
  }, [captain]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    // Create preview
    setPreview(URL.createObjectURL(file));

    const uploadFormData = new FormData();
    uploadFormData.append("profileImage", file);

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API}/captain/upload-profile-image`, uploadFormData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // backend returns a relative path like '/uploads/..' in res.data.imageUrl
      const imageUrl = res.data.imageUrl || (res.data.captain && res.data.captain.profileImage) || null;
      const fullUrl = imageUrl && imageUrl.startsWith("/") ? `${API}${imageUrl}` : imageUrl;

      if (fullUrl) {
        setProfilePic(fullUrl);
        setPreview(fullUrl);
        // update global captain context so it persists across refresh
        try {
          setCaptain((prev) => ({ ...(prev || {}), profileImage: fullUrl }));
        } catch (e) {}
      }

      toast.success("Profile picture updated successfully");
    } catch (error) {
      toast.error("Failed to upload profile picture");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      // No editable profile fields in this view currently
      toast.info("No editable fields to save", { position: "top-center" });
    } catch (error) {
      toast.error("Failed to update profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white p-6 pb-32">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="mb-4 w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className="rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-blue-400 shadow-xl">
            <img
              src={preview || profilePic || "/default-avatar.svg"}
              alt="Profile"
              className="w-44 h-44 rounded-full object-cover border-4 border-white/10 shadow-2xl"
            />
          </div>

          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="absolute -bottom-2 -right-2 bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm border border-white/10 shadow-md transition-transform hover:scale-105"
            aria-label="Change profile picture"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6L20 8M3 21v-3a4 4 0 0 1 4-4h3" />
            </svg>
            <span className="text-sm font-medium">Change</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              hidden
              onChange={handleUpload}
            />
          </button>
        </div>

        <h2 className="mt-6 text-3xl font-extrabold tracking-tight">
          {formData.firstname || "Captain"} {formData.lastname}
        </h2>

        <div className="flex items-center gap-4 mt-2">
          <div className="px-3 py-1 bg-white/6 rounded-full text-sm font-semibold text-blue-200">⭐ {captain?.rating || 0}</div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${captain?.status === "active" ? "bg-emerald-600/20 text-emerald-300" : "bg-white/6 text-gray-300"}`}>{captain?.status === "active" ? "Online" : "Offline"}</div>
          <div className="px-3 py-1 bg-white/6 rounded-full text-sm font-semibold text-gray-200">Trips: {captain?.trips || 0}</div>
        </div>
      </div>

      {/* Main Card */}
      <div className="max-w-3xl mx-auto bg-white/3 backdrop-blur-xl border border-white/6 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-2xl">
        {/* Left: Vehicle Card */}
        <div className="md:col-span-1 bg-white/5 rounded-2xl p-4 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-blue-400 rounded-lg flex items-center justify-center text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l2-3h14l2 3v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
              </svg>
            </div>
            <div>
              <div className="text-sm text-gray-200">{formData.carModel || "—"}</div>
              <div className="text-xs text-gray-400">{formData.carColor || "Color"} • {formData.carYear || "Year"}</div>
            </div>
          </div>

          <div className="w-full bg-white/6 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-300">Plate</div>
            <div className="text-lg font-semibold">{formData.vehiclePlate || "—"}</div>
          </div>

          <div className="w-full text-center">
            <button onClick={() => navigate('/captain-vehicles')} className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold shadow">Manage Vehicle</button>
          </div>
        </div>

        {/* Right: Details */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1">First Name</label>
              <div className="w-full bg-transparent border border-white/8 rounded-lg px-3 py-2 text-white">{formData.firstname || '—'}</div>
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Last Name</label>
              <div className="w-full bg-transparent border border-white/8 rounded-lg px-3 py-2 text-white">{formData.lastname || '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Vehicle Capacity</label>
              <div className="w-full bg-transparent border border-white/8 rounded-lg px-3 py-2 text-white">{formData.vehicleCapacity || '—'}</div>
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">Vehicle Type</label>
              <div className="w-full bg-transparent border border-white/8 rounded-lg px-3 py-2 text-white">{formData.vehicleType || '—'}</div>
            </div>
          </div>

          {captain?.license?.number && (
            <div>
              <label className="block text-xs text-gray-300 mb-1">License Number</label>
              <div className="w-full bg-transparent border border-white/8 rounded-lg px-3 py-2 text-white">{captain.license.number}</div>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button onClick={() => navigate('/captain-security')} className="flex-1 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-semibold shadow hover:scale-[1.01]">Change Password</button>
            <button onClick={handleLogout} className="flex-1 py-3 rounded-lg bg-red-600 text-white font-semibold shadow hover:scale-[1.01]">Log out</button>
          </div>
        </div>
      </div>

      <DriverBottomNav />
    </div>
  );
}
