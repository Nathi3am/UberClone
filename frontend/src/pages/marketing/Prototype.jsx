import React from 'react';
import { Link } from 'react-router-dom';
import { FaApple, FaGooglePlay, FaStar, FaMapMarkerAlt, FaUsers, FaShieldAlt, FaHandshake } from 'react-icons/fa';
import logo from '../../assets/Vexo.png';
import mapBanner from '../../assets/mapBanner.png';

const Section = ({ id, title, children }) => (
  <section id={id} className="py-16 px-4">
    <div className="max-w-4xl mx-auto bg-slate-800/50 p-8 rounded-lg">
      <h3 className="text-2xl font-semibold mb-4">{title}</h3>
      <div className="text-slate-300">{children}</div>
    </div>
  </section>
);

const Prototype = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="vexomove" className="h-10 w-10 object-contain" />
            <div className="text-xl font-bold">vexomove</div>
          </div>
          <nav className="space-x-4 text-sm text-slate-300">
            <a href="#hero" className="hover:underline">Home</a>
            <a href="#features" className="hover:underline">App Download</a>
            <a href="#pricing" className="hover:underline">Pricing</a>
            <a href="#service-area" className="hover:underline">Service Area</a>
            <a href="#testimonials" className="hover:underline">Testimonials</a>
            <a href="#contact" className="hover:underline">Contact</a>
          </nav>
        </div>
      </header>

      <main>
        <section id="hero" className="py-24 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Reliable rides. Local vendors. Safer trips.</h1>
              <p className="text-slate-300 mb-6">Peak connects riders, drivers, and local businesses with fast matching and transparent pricing.</p>
              <div className="flex gap-3">
                <Link to="/signup" className="px-5 py-3 bg-emerald-500 text-slate-900 rounded-md font-semibold">Get the app</Link>
                <a href="#driver" className="px-5 py-3 border border-slate-600 rounded-md">Driver signup</a>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="h-64 rounded-lg overflow-hidden shadow-lg">
                <img src={mapBanner} alt="map" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <Section id="features" title="App Download">
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <div className="mb-2 text-slate-300">Get vexomove on your phone</div>
              <div className="flex gap-3">
                <a className="inline-flex items-center gap-2 bg-slate-700 px-4 py-2 rounded hover:bg-slate-600"><FaApple /> <span>App Store</span></a>
                <a className="inline-flex items-center gap-2 bg-slate-700 px-4 py-2 rounded hover:bg-slate-600"><FaGooglePlay /> <span>Google Play</span></a>
              </div>
            </div>
            <div className="flex-1">
              <div className="mb-2 text-slate-300">Driver Signup</div>
              <a href="#driver" className="inline-block bg-amber-500 text-slate-900 px-4 py-2 rounded">Become a driver</a>
            </div>
          </div>
        </Section>

        <Section id="driver" title="Driver Signup">
          <p>Short pitch for drivers with benefits: flexible hours, fast payouts, support.</p>
          <div className="mt-4">
            <Link to="/captain-signup" className="bg-emerald-500 text-slate-900 px-4 py-2 rounded">Driver signup form</Link>
          </div>
        </Section>

        <Section id="about" title="About">
          <p>vexomove's mission is to connect communities by providing reliable transport and supporting local businesses.</p>
        </Section>

        <Section id="safety" title="Safety">
          <ul className="space-y-3">
            <li className="flex items-start gap-3"><FaShieldAlt className="text-amber-400 mt-1" /> <span>Driver verification and background checks</span></li>
            <li className="flex items-start gap-3"><FaUsers className="text-emerald-400 mt-1" /> <span>Real-time trip sharing and trusted contacts</span></li>
            <li className="flex items-start gap-3"><FaHandshake className="text-sky-400 mt-1" /> <span>24/7 support and incident reporting</span></li>
          </ul>
        </Section>

        <Section id="pricing" title="Pricing">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 p-4 rounded shadow"> <div className="font-semibold">Short</div><div className="text-2xl font-bold">R25</div><div className="text-sm text-slate-400">Up to 3 km</div></div>
            <div className="bg-slate-800 p-4 rounded shadow"> <div className="font-semibold">Medium</div><div className="text-2xl font-bold">R45</div><div className="text-sm text-slate-400">3–10 km</div></div>
            <div className="bg-slate-800 p-4 rounded shadow"> <div className="font-semibold">Long</div><div className="text-2xl font-bold">R95</div><div className="text-sm text-slate-400">10+ km</div></div>
          </div>
        </Section>

        <Section id="service-area" title="Service Area">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1">
              <p>We currently operate in select areas — scroll the map or check city list.</p>
              <ul className="mt-3 space-y-1 text-slate-300">
                <li><FaMapMarkerAlt className="inline mr-2 text-amber-400"/> Cape Town</li>
                <li><FaMapMarkerAlt className="inline mr-2 text-amber-400"/> Johannesburg</li>
                <li><FaMapMarkerAlt className="inline mr-2 text-amber-400"/> Durban</li>
              </ul>
            </div>
            <div className="flex-1">
              <div className="rounded overflow-hidden shadow"><img src={mapBanner} alt="service area map" className="w-full h-48 object-cover"/></div>
            </div>
          </div>
        </Section>

        <Section id="testimonials" title="Testimonials">
          <div className="space-y-4">
            <blockquote className="p-4 bg-slate-700/40 rounded flex items-center gap-3"><FaStar className="text-amber-400"/> <span>"Fast, reliable — I love vexomove!" — Sarah</span></blockquote>
            <blockquote className="p-4 bg-slate-700/40 rounded flex items-center gap-3"><FaStar className="text-amber-400"/> <span>"Great earnings for drivers." — Themba</span></blockquote>
          </div>
        </Section>

        <Section id="contact" title="Contact">
          <p>Contact form (demo):</p>
          <form className="mt-4 space-y-3" onSubmit={(e)=>{e.preventDefault(); alert('Demo form submitted');}}>
            <input className="w-full p-2 rounded bg-slate-800 border border-slate-700" placeholder="Name" />
            <input className="w-full p-2 rounded bg-slate-800 border border-slate-700" placeholder="Email" />
            <textarea className="w-full p-2 rounded bg-slate-800 border border-slate-700" placeholder="Message" />
            <button className="px-4 py-2 bg-emerald-500 text-slate-900 rounded">Send</button>
          </form>
        </Section>

        <Section id="partnerships" title="Partnerships">
          <p>Logos and partner benefits; CTA to partner with us.</p>
        </Section>
      </main>

      <footer className="border-t border-slate-700 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-sm text-slate-400">© {new Date().getFullYear()} vexomove — Prototype</div>
      </footer>
    </div>
  );
};

export default Prototype;
