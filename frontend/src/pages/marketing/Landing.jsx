import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 flex flex-col">
      <header className="container mx-auto px-4 py-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Peak — On-demand Transport</h1>
        <nav className="space-x-4">
          <Link to="/web-dashboard" className="text-sm hover:underline">Dashboard</Link>
          <Link to="/login" className="text-sm hover:underline">Sign in</Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <section>
            <h2 className="text-4xl font-extrabold leading-tight mb-4">Reliable rides, local vendors, and on-demand delivery</h2>
            <p className="text-slate-300 mb-6">Peak connects riders, drivers, and local businesses with a focus on speed, safety, and fair pricing. Get started in minutes.</p>
            <div className="flex gap-3">
              <Link to="/signup" className="px-5 py-3 bg-emerald-500 text-slate-900 rounded-md font-semibold">Get the app</Link>
              <Link to="/web-dashboard" className="px-5 py-3 border border-slate-600 rounded-md">View demo dashboard</Link>
            </div>
          </section>

          <section className="hidden md:block">
            <div className="bg-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-3">Why Peak?</h3>
              <ul className="text-slate-300 space-y-2">
                <li>Fast matching with nearby drivers</li>
                <li>Integrated vendor listings and local perks</li>
                <li>Transparent fares and safety features</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-slate-900 border-t border-slate-700 py-6">
        <div className="container mx-auto px-4 text-sm text-slate-400">© {new Date().getFullYear()} Peak — Built for local communities</div>
      </footer>
    </div>
  );
};

export default Landing;
