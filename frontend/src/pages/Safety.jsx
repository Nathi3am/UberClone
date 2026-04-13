import React from 'react';
import MobileHeader from '../components/MobileHeader';

const tips = [
  {
    icon: '🔒',
    title: 'Verify Your Driver',
    desc: "Always check the driver's name, photo, and vehicle plate number before getting in. These are shown in the app after booking.",
  },
  {
    icon: '📍',
    title: 'Share Your Trip',
    desc: "Use the 'Share Trip' feature to send your live location and trip details to a trusted friend or family member.",
  },
  {
    icon: '🚨',
    title: 'Emergency Button',
    desc: 'In any emergency, tap the red SOS button in the app to alert our safety team and share your location instantly.',
  },
  {
    icon: '🎥',
    title: 'In-Trip Tracking',
    desc: 'All VexoMove trips are GPS-tracked and logged for your protection. Trip data is stored securely for 30 days.',
  },
  {
    icon: '⭐',
    title: 'Rate Your Trip',
    desc: 'After every ride, please rate your driver. Your feedback helps us maintain high safety standards on our platform.',
  },
  {
    icon: '🚗',
    title: 'Ride Only Your Booked Car',
    desc: 'Never get into an unbooked vehicle. Always confirm the car matches the details shown in your app.',
  },
];

const Safety = () => {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <MobileHeader title="Safety" showBack={true} />

      <div className="pt-20 p-4 pb-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛡️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Your Safety Matters</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            VexoMove is committed to keeping every rider safe on every trip.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {tips.map((tip, i) => (
            <div key={i} className="flex gap-4 items-start bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-2xl mt-0.5 flex-shrink-0">{tip.icon}</div>
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">{tip.title}</h3>
                <p className="text-white/55 text-xs leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-red-600/20 border border-red-500/40 rounded-2xl p-4 flex gap-3 items-start">
          <div className="text-2xl flex-shrink-0">🚨</div>
          <div>
            <p className="text-red-400 font-bold text-sm mb-1">Emergency?</p>
            <p className="text-white/70 text-xs leading-relaxed">
              Call <span className="text-white font-semibold">10111</span> (SA Police) or use the{' '}
              <span className="text-white font-semibold">SOS button</span> in your active trip screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Safety;
