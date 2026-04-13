import React from 'react';
import MobileHeader from '../components/MobileHeader';

const features = [
  { icon: '⚡', label: 'Fast Booking', desc: 'Book a ride in seconds' },
  { icon: '📍', label: 'Live Tracking', desc: 'Real-time GPS tracking' },
  { icon: '🛡️', label: 'Safe Rides', desc: 'Verified drivers only' },
  { icon: '💳', label: 'Easy Payments', desc: 'Multiple payment options' },
];

const info = [
  { label: 'App Version', value: '1.0.0' },
  { label: 'Platform', value: 'iOS & Android' },
  { label: 'Region', value: 'South Africa' },
  { label: 'Company', value: 'VexoMove (Pty) Ltd' },
  { label: 'Support Email', value: 'support@vexomove.co.za' },
  { label: 'Support Phone', value: '071 437 7884' },
];

const About = () => {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <MobileHeader title="About" showBack={true} />

      <div className="pt-20 p-4 pb-10">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center text-4xl mx-auto mb-4">
            🚀
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">VexoMove</h1>
          <p className="text-white/50 text-sm mt-1">Version 1.0.0</p>
          <p className="text-white/60 text-sm mt-3 leading-relaxed max-w-xs mx-auto">
            Affordable, reliable ride-hailing built for South Africa. Get where you're going — safely and on time.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {features.map((f, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-3xl mb-2">{f.icon}</div>
              <p className="text-white font-semibold text-sm">{f.label}</p>
              <p className="text-white/50 text-xs mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* App Info Table */}
        <h2 className="text-white font-bold text-base mb-3">App Information</h2>
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
          {info.map((item, i) => (
            <div
              key={i}
              className={`flex justify-between items-center px-4 py-3 ${
                i < info.length - 1 ? 'border-b border-white/8' : ''
              }`}
            >
              <span className="text-white/55 text-sm">{item.label}</span>
              <span className="text-white text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <p className="text-white font-bold text-sm mb-2">Our Mission</p>
          <p className="text-white/60 text-xs leading-relaxed">
            VexoMove was built to make safe, affordable transportation accessible to everyone in South Africa.
            We connect riders with trusted, vetted drivers — making every journey smooth, transparent, and reliable.
          </p>
        </div>

        <p className="text-center text-white/25 text-xs">
          © {new Date().getFullYear()} VexoMove (Pty) Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default About;
