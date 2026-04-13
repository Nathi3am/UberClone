import React, { useState } from 'react';
import MobileHeader from '../components/MobileHeader';

const articles = {
  Booking: [
    {
      icon: '📍',
      title: 'How to book a ride',
      steps: [
        'Open VexoMove and tap "Add a pick-up location".',
        'Enter your destination in "Enter your destination".',
        'Select the number of passengers.',
        'Tap "Find a Ride" and wait for a driver to accept.',
        'Track your driver in real time on the map.',
      ],
    },
    {
      icon: '❌',
      title: 'How to cancel a ride',
      steps: [
        'Tap the active trip card at the bottom of the screen.',
        'Press "Cancel Ride".',
        'Select a reason for cancellation.',
        'Confirm — cancellations within 2 minutes are free.',
      ],
    },
    {
      icon: '📅',
      title: 'Schedule a ride in advance',
      steps: [
        'On the home screen, tap the calendar icon next to the destination field.',
        'Choose your preferred date and time.',
        'Complete your booking as normal.',
        "You'll receive a reminder before your trip.",
      ],
    },
  ],
  Payment: [
    {
      icon: '💳',
      title: 'How to add a payment method',
      steps: [
        'Go to your Profile and tap "Payments".',
        'Tap "Add Payment Method".',
        'Enter your card details or select a wallet option.',
        'Save and set as default if preferred.',
      ],
    },
    {
      icon: '💰',
      title: 'How to request a refund',
      steps: [
        'Go to "Ride History" and select the relevant trip.',
        'Tap "Report an Issue".',
        'Select "Request Refund" and describe the issue.',
        'Our team will review and process within 3–5 business days.',
      ],
    },
  ],
  Account: [
    {
      icon: '👤',
      title: 'How to update your profile',
      steps: [
        'Tap your avatar icon in the top right.',
        'Select "Edit Profile".',
        'Update your name, phone number, or profile photo.',
        'Tap "Save Changes".',
      ],
    },
    {
      icon: '🔑',
      title: 'Reset your password',
      steps: [
        'On the login screen, tap "Forgot Password?".',
        'Enter your registered email address.',
        'Check your email for a reset link.',
        'Follow the link to create a new password.',
      ],
    },
  ],
  Driver: [
    {
      icon: '🚗',
      title: 'Contacting your driver',
      steps: [
        'After booking, tap the driver card that appears at the bottom.',
        'Tap the phone icon to call or the chat icon to message.',
        'You can also share your exact location via the chat.',
      ],
    },
    {
      icon: '⭐',
      title: 'Rating your driver',
      steps: [
        'At the end of every trip, a rating screen appears automatically.',
        'Tap the number of stars (1–5) to rate your experience.',
        'Add optional written feedback.',
        'Tap "Submit Rating".',
      ],
    },
  ],
};

const Help = () => {
  const [activeCategory, setActiveCategory] = useState('Booking');
  const categories = Object.keys(articles);

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <MobileHeader title="Help" showBack={true} />

      <div className="pt-20 p-4 pb-10">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">❓</div>
          <h1 className="text-2xl font-bold text-white mb-2">Help Centre</h1>
          <p className="text-white/60 text-sm">Step-by-step guides for using VexoMove.</p>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-white text-[#0B0F1A]'
                  : 'bg-white/10 text-white/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles */}
        <div className="flex flex-col gap-4">
          {articles[activeCategory].map((article, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex gap-3 items-center mb-4">
                <span className="text-2xl">{article.icon}</span>
                <h3 className="text-white font-semibold text-sm">{article.title}</h3>
              </div>
              <ol className="flex flex-col gap-2">
                {article.steps.map((step, j) => (
                  <li key={j} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {j + 1}
                    </span>
                    <p className="text-white/65 text-xs leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* Still need help */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/25 rounded-2xl p-4 text-center">
          <p className="text-white font-semibold text-sm mb-1">Still need help?</p>
          <p className="text-white/55 text-xs mb-3">Our support team is ready to assist you.</p>
          <a
            href="tel:0714377884"
            className="inline-block bg-white text-[#0B0F1A] text-sm font-bold px-6 py-2 rounded-full"
          >
            📞 Call Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default Help;
