import { Link, useLocation } from "react-router-dom";
import { FaHome, FaCar, FaUser } from "react-icons/fa";

export default function DriverBottomNav() {
  const location = useLocation();

  const items = [
    { to: "/captain-home", label: "Home", icon: <FaHome className="w-5 h-5" /> },
    { to: "/captain-rides", label: "Rides", icon: <FaCar className="w-5 h-5" /> },
    { to: "/captain-profile", label: "Profile", icon: <FaUser className="w-5 h-5" /> },
  ];

  const activeIndex = items.findIndex((item) => item.to === location.pathname);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#060b19]/90 backdrop-blur-xl border-t border-white/[0.06] py-2 z-50">
      <div className="relative mx-3 rounded-3xl bg-black/40 px-2 py-2 shadow-[0_0_24px_-6px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        <div className="flex">
          {items.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all duration-200 ${
                  active
                    ? "bg-blue-500/25 text-blue-300 shadow-lg shadow-blue-500/20"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="p-2 rounded-full bg-black/30">{item.icon}</div>
                <span className="text-[11px] font-medium uppercase tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
