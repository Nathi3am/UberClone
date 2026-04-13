import React, { useState } from 'react';
import MobileHeader from '../components/MobileHeader';

const faqs = [
  {
    q: 'How do I cancel a ride?',
    a: 'Tap your active booking, then press "Cancel Ride". Cancellations made within 2 minutes of booking are free.',
  },
  {
    q: 'My driver never arrived — what do I do?',
    a: "If your driver doesn't arrive, tap 'Contact Driver' to call them. If unreachable, cancel the trip — you won't be charged.",
  },
  {
    q: 'How do I get a refund?',
    a: 'Contact us via email or phone below with your trip ID. Refunds are processed within 3–5 business days.',
  },
  {
    q: 'I left something in the car',
    a: "Go to your Ride History, select the trip, and tap 'Report Lost Item'. We'll connect you with the driver.",
  },
  {
    q: 'How do I update my payment method?',
    a: 'Go to Payments in your profile and tap "Add Payment Method" to update your card or wallet details.',
  },
];

const Support = () => {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <MobileHeader title="Support" showBack={true} />

      <div className="pt-20 p-4 pb-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎧</div>
          <h1 className="text-2xl font-bold text-white mb-2">We're Here to Help</h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Reach out to the VexoMove support team anytime.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="flex flex-col gap-3 mb-8">
          <a
            href="mailto:support@vexomove.co.za"
            className="flex gap-4 items-center bg-white/5 border border-white/10 rounded-2xl p-4"
          >
            <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center text-xl flex-shrink-0">
              ✉️
            </div>
            <div className="flex-1">
              <p className="text-white/50 text-xs mb-0.5">Email Us</p>
              <p className="text-white font-semibold text-sm">support@vexomove.co.za</p>
            </div>
            <span className="text-white/30 text-lg">›</span>
          </a>

          <a
            href="tel:0714377884"
            className="flex gap-4 items-center bg-white/5 border border-white/10 rounded-2xl p-4"
          >
            <div className="w-11 h-11 rounded-full bg-green-500/20 flex items-center justify-center text-xl flex-shrink-0">
              📞
            </div>
            <div className="flex-1">
              <p className="text-white/50 text-xs mb-0.5">Call Us</p>
              <p className="text-white font-semibold text-sm">071 437 7884</p>
            </div>
            <span className="text-white/30 text-lg">›</span>
          </a>
        </div>

        {/* Support Hours */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
          <p className="text-white font-semibold text-sm mb-3">🕐 Support Hours</p>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/55">Monday – Friday</span>
            <span className="text-white font-medium">07:00 – 20:00</span>
          </div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white/55">Saturday</span>
            <span className="text-white font-medium">08:00 – 17:00</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-white/55">Sunday &amp; Public Holidays</span>
            <span className="text-white font-medium">09:00 – 14:00</span>
          </div>
        </div>

        {/* FAQs */}
        <h2 className="text-white font-bold text-base mb-3">Frequently Asked Questions</h2>
        <div className="flex flex-col gap-2">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex justify-between items-center p-4 text-left"
              >
                <span className="text-white text-sm font-medium pr-4">{faq.q}</span>
                <span className="text-white/40 text-lg flex-shrink-0">
                  {openFaq === i ? '−' : '+'}
                </span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4">
                  <p className="text-white/60 text-xs leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Support;
