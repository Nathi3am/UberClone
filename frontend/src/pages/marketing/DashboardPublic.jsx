import React from 'react';
import { Link } from 'react-router-dom';

const DashboardPublic = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Peak — Demo Dashboard</h2>
          <nav className="space-x-3">
            <Link to="/" className="text-sm text-slate-300 hover:underline">Home</Link>
            <Link to="/login" className="text-sm text-slate-300 hover:underline">Sign in</Link>
          </nav>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 p-4 rounded"> 
            <div className="text-sm text-slate-400">Active Rides</div>
            <div className="text-3xl font-semibold">12</div>
          </div>
          <div className="bg-slate-800 p-4 rounded">
            <div className="text-sm text-slate-400">Drivers Online</div>
            <div className="text-3xl font-semibold">48</div>
          </div>
          <div className="bg-slate-800 p-4 rounded">
            <div className="text-sm text-slate-400">Vendors</div>
            <div className="text-3xl font-semibold">23</div>
          </div>
        </section>

        <section className="bg-slate-800 p-4 rounded">
          <h3 className="font-semibold mb-2">Recent Events</h3>
          <ul className="text-slate-300 space-y-2">
            <li>Ride #R1024 started near Downtown</li>
            <li>New vendor added: The Corner Deli</li>
            <li>Driver payout processed for March 24</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default DashboardPublic;
