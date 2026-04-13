const express = require('express');
const cors = require('cors');
const json = require('body-parser').json;
const urlencoded = require('body-parser').urlencoded;
const dotenv = require('dotenv');
dotenv.config();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const connectToDb = require('./db/db');
const userRoutes = require('./routes/user.routes');
const captainRoutes = require('./routes/captain.routes');
const cookieParser = require('cookie-parser');
const mapRoutes = require('./routes/maps.routes');
const rideRoutes = require('./routes/ride.routes');
const adminRoutes = require('./routes/admin.routes');
const specialTripsDriverRoutes = require('./routes/specialTripsDriver.routes');
const vendorsRoutes = require('./routes/vendors.routes');
// dev routes (testing only)
let devRoutes = null;
try { devRoutes = require('./routes/dev.routes'); } catch (e) { devRoutes = null; }
connectToDb().catch(err => {
    console.error('[db] Fatal: could not connect to any MongoDB instance. Backend running without DB.');
    console.error('[db]', err && err.message ? err.message : err);
});

// Allow CORS for frontend and admin apps and enable credentials
// Add any dev origins used by the frontends (vite dev servers)
// include common dev ports (5173-5176) and allow localhost variations
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost',
    'https://localhost',
    'https://127.0.0.1',
    'capacitor://localhost',
    'ionic://localhost',
    'app://localhost'
];
// Allow dev access from local network (your phone/emulator)
// Replace with your machine's LAN IP and any ports Vite may use.
allowedOrigins.push('http://192.168.0.24:5174');
allowedOrigins.push('http://192.168.0.24:5176');
// Add current Vite network URL so mobile devices on the same LAN can access the dev frontend
allowedOrigins.push('http://192.168.0.24:5177');
// Allow the admin site hosted on Render
allowedOrigins.push('https://vexomoveadmin.onrender.com');

const isAllowedOrigin = (origin) => {
    if (!origin) return true; // non-browser clients / some webview requests
    if (allowedOrigins.includes(origin)) return true;

    const isLocalhost =
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('https://127.0.0.1');
    if (isLocalhost) return true;

    const isAppLocalhost =
        origin.startsWith('capacitor://localhost') ||
        origin.startsWith('ionic://localhost') ||
        origin.startsWith('app://localhost');
    if (isAppLocalhost) return true;

    const isLan = /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(origin);
    if (isLan) return true;

    return false;
};

app.use(
    cors({
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) return callback(null, true);
            console.warn('[cors] blocked origin', origin || '(no origin)');
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    })
);

// Make Access-Control-Allow-Origin dynamic based on request origin (for credentialed requests)
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.use('/users', userRoutes);
app.use('/captain', captainRoutes);
app.use('/maps', mapRoutes);
app.use('/rides', rideRoutes);
app.use('/admin', adminRoutes);
app.use('/vendors', vendorsRoutes);
app.use('/admin/special-trips-drivers', specialTripsDriverRoutes);
// Proxy OTP routes to the internal OTP server (keeps frontend using single backend URL)
try {
    const otpProxy = require('./routes/otp.routes');
    app.use('/api/otp', otpProxy);
    console.log('OTP proxy mounted at /api/otp');
} catch (e) {
    // ignore if proxy route missing
}
// Email / availability helpers
try {
    const availability = require('./routes/availability.routes');
    app.use('/api', availability);
    console.log('Availability routes mounted at /api');
} catch (e) {}
// Forgot-password / reset routes
try {
    const forgot = require('./routes/forgot-password.routes');
    app.use('/api/auth', forgot);
    console.log('Forgot-password routes mounted at /api/auth');
} catch (e) {
    // ignore if missing
}
if (devRoutes) app.use('/dev', devRoutes);

// If a built frontend exists, serve it as static assets from the backend
try {
    const distPath = path.join(__dirname, '..', 'frontend', 'dist');
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
        console.log('Serving frontend from', distPath);
    }
} catch (e) {
    // ignore if filesystem check fails
}

module.exports = app;

// Global error handler - catch Multer file-size errors and other unhandled errors.
app.use((err, req, res, next) => {
    if (!err) return next();

    // Multer file size / limit errors
    const isMulterError = err instanceof multer.MulterError || (err && (err.code === 'LIMIT_FILE_SIZE' || /file too large/i.test(err.message || '')));
    if (isMulterError) {
        console.warn('[error] Multer file size limit:', err && err.message ? err.message : err);
        return res.status(413).json({ message: err && err.message ? err.message : 'Uploaded file too large. Maximum allowed size is 100MB.' });
    }

    // Known invalid file type from our fileFilter
    if (err && err.code === 'INVALID_FILE_TYPE') {
        console.warn('[error] Invalid file type:', err.message);
        return res.status(415).json({ message: err.message });
    }

    // For other errors, log and return the error message to help debugging (non-production)
    console.error('[error] Unhandled error:', err && err.stack ? err.stack : err);
    const message = (err && err.message) ? err.message : 'Internal server error';
    return res.status(500).json({ message });
});