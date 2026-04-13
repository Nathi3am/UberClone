import React, { useState } from 'react';
import MobileHeader from '../components/MobileHeader';

const sections = [
  {
    icon: '📋',
    title: 'Information We Collect',
    content:
      'We collect information you provide when registering, such as your name, phone number, and email address. We also collect trip data including pick-up and drop-off locations, trip duration, and route history. Device information such as your IP address and app usage data may also be collected to improve our services.',
  },
  {
    icon: '🔍',
    title: 'How We Use Your Information',
    content:
      'Your information is used to provide and improve the VexoMove service, match you with available drivers, process payments, and communicate with you about your trips. We may also use data to detect fraud, ensure safety, and comply with legal obligations.',
  },
  {
    icon: '🤝',
    title: 'Sharing Your Information',
    content:
      'We share your name and pick-up location with your assigned driver to complete your trip. We do not sell your personal information to third parties. We may share data with trusted service providers (e.g. payment processors) strictly to operate our platform, and with law enforcement if required by law.',
  },
  {
    icon: '📍',
    title: 'Location Data',
    content:
      'VexoMove requires access to your device location to show nearby drivers and track your trip. Location data is only active during a trip and is not stored beyond 30 days. You can disable location access in your device settings, but this will prevent you from using the app.',
  },
  {
    icon: '🔐',
    title: 'Data Security',
    content:
      'We use industry-standard encryption to protect your personal data in transit and at rest. Access to personal data is strictly limited to authorised VexoMove staff. However, no system is 100% secure — we encourage you to use a strong password and keep your app updated.',
  },
  {
    icon: '🗑️',
    title: 'Your Rights',
    content:
      'You have the right to access, correct, or delete your personal data at any time. To make a request, contact us at support@vexomove.co.za. You may also request a copy of the data we hold about you. We will respond to all requests within 30 days.',
  },
  {
    icon: '🍪',
    title: 'Cookies & Analytics',
    content:
      'Our app uses anonymous analytics tools to understand how users interact with VexoMove. This helps us fix bugs and improve features. No personally identifiable information is used in analytics. You can opt out of analytics in your app settings.',
  },
  {
    icon: '🔄',
    title: 'Changes to This Policy',
    content:
      'We may update this Privacy Policy from time to time. We will notify you of any significant changes via the app or email. Continued use of VexoMove after changes are posted means you accept the updated policy.',
  },
];

const Privacy = () => {
  const [openSection, setOpenSection] = useState(null);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <MobileHeader title="Privacy" showBack={true} />

      <div className="pt-20 p-4 pb-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-white/45 text-xs mb-2">Last updated: January 2025</p>
          <p className="text-white/60 text-sm leading-relaxed">
            VexoMove respects your privacy. Here's how we collect, use, and protect your data.
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-2 mb-8">
          {sections.map((section, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenSection(openSection === i ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <span className="text-xl flex-shrink-0">{section.icon}</span>
                <span className="text-white font-medium text-sm flex-1">{section.title}</span>
                <span className="text-white/35 text-lg flex-shrink-0">
                  {openSection === i ? '−' : '+'}
                </span>
              </button>
              {openSection === i && (
                <div className="px-4 pb-4">
                  <p className="text-white/60 text-xs leading-relaxed">{section.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-white font-semibold text-sm mb-1">Privacy Concerns?</p>
          <p className="text-white/55 text-xs mb-3">
            Contact our team and we'll respond within 30 days.
          </p>
          <a
            href="mailto:support@vexomove.co.za"
            className="inline-block bg-white text-[#0B0F1A] text-sm font-bold px-6 py-2 rounded-full"
          >
            ✉️ Email Us
          </a>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
