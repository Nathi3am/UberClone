import { useState, useContext, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CaptainDataContext } from "../../context/CaptainContext";
import axios from "axios";
import { toast } from "react-toastify";
import API from "../../config/api";

export default function CaptainVehicles() {
  const { captain, setCaptain } = useContext(CaptainDataContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(captain?.vehicle?.image ? (captain.vehicle.image.startsWith('/') ? `${API}${captain.vehicle.image}` : captain.vehicle.image) : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPreview(captain?.vehicle?.image ? (captain.vehicle.image.startsWith('/') ? `${API}${captain.vehicle.image}` : captain.vehicle.image) : null);
  }, [captain]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) return toast.error('File must be < 6MB');

    setPreview(URL.createObjectURL(file));

    const fd = new FormData();
    fd.append('vehicleImage', file);

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/captain/upload-vehicle-image`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const imageUrl = res.data.imageUrl || (res.data.captain && res.data.captain.vehicle && res.data.captain.vehicle.image) || null;
      const fullUrl = imageUrl && imageUrl.startsWith('/') ? `${API}${imageUrl}` : imageUrl;

      if (fullUrl) {
        setPreview(fullUrl);
        try { setCaptain(prev => ({ ...(prev||{}), vehicle: { ...(prev?.vehicle||{}), image: imageUrl } })); } catch (e) {}
      }

      toast.success('Vehicle image uploaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload vehicle image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white p-6 pb-32">
      <div className="max-w-3xl mx-auto bg-white/3 backdrop-blur-xl border border-white/6 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h3 className="text-2xl font-bold">Vehicle</h3>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/3 flex flex-col items-center">
            <div className="rounded-xl p-2 bg-white/5">
              <img src={preview || '/vehicle-placeholder.png'} alt="Vehicle" className="w-64 h-40 object-cover rounded-lg shadow-md" />
            </div>

            <div className="mt-4 w-full">
              <button onClick={() => fileInputRef.current && fileInputRef.current.click()} className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold shadow">Upload Vehicle Picture</button>
              <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" hidden onChange={handleUpload} />
            </div>
          </div>

          <div className="md:flex-1 space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Make / Model</label>
              <div className="px-3 py-2 rounded-lg bg-white/6">{captain?.vehicle?.brand || captain?.vehicle?.model || '—'}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Color</label>
                <div className="px-3 py-2 rounded-lg bg-white/6">{captain?.vehicle?.color || '—'}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Year</label>
                <div className="px-3 py-2 rounded-lg bg-white/6">{captain?.vehicle?.year || '—'}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Plate</label>
              <div className="px-3 py-2 rounded-lg bg-white/6">{captain?.vehicle?.plate || '—'}</div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => navigate('/captain-profile')} className="py-2 px-4 rounded-lg bg-white/6">Back</button>
              <button onClick={() => window.dispatchEvent(new CustomEvent('show-global-modal', { detail: { title: 'Note', message: 'Vehicle image will be used in driver listings.' } }))} className="py-2 px-4 rounded-lg bg-indigo-600">Help</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
