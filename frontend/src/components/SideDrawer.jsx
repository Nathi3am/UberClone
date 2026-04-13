import React, { useContext, useEffect } from 'react';
import { DrawerContext } from '../context/DrawerContext';
import { useNavigate } from 'react-router-dom';

const menu = [
  { icon: '🛡️', label: 'Safety', path: '/safety' },
  { icon: '🎧', label: 'Support', path: '/support' },
  { icon: '❓', label: 'Help', path: '/help' },
  { icon: 'ℹ️', label: 'About', path: '/about' },
  { icon: '🔒', label: 'Privacy', path: '/privacy' },
];

const SideDrawer = () => {
  const { open, closeDrawer } = useContext(DrawerContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    // Push state so back button closes drawer first
    try {
      window.history.pushState({ __drawer: true }, '');
    } catch (e) {}

    const onPop = (e) => {
      // Close drawer when history back is pressed
      closeDrawer();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [open, closeDrawer]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeDrawer]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* overlay */}
      <div
        className="w-full h-full bg-black/60"
        onClick={() => closeDrawer()}
        aria-hidden
      />

      {/* drawer */}
      <aside className="w-72 max-w-[80%] bg-[#0B0F1A] text-white shadow-2xl border-r border-white/6 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Menu</div>
          <button onClick={() => closeDrawer()} className="text-white/80">✕</button>
        </div>

        <nav className="space-y-1 mt-2">
          {menu.map((m) => (
            <div
              key={m.path}
              onClick={() => { navigate(m.path); closeDrawer(); }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 cursor-pointer"
              role="button"
            >
              <div className="w-8 text-lg text-white/90">{m.icon}</div>
              <div className="text-white text-sm font-medium">{m.label}</div>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  );
};

export default SideDrawer;
