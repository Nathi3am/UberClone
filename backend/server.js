const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket');
const port = process.env.PORT || 5000;

process.on('unhandledRejection', (reason) => {
    console.error('[process] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[process] Uncaught exception:', error);
});

const server = http.createServer(app);

// ensure settings document exists on startup
try {
    const Settings = require('./models/settings.model');
    const initializeSettings = async () => {
        try {
            const existing = await Settings.findOne();
            if (!existing) {
                await Settings.create({ pricePerKm: 10, baseFare: 5, commissionRate: 20 });
                console.log('Initialized default Settings document');
            }
        } catch (e) {
            console.error('Failed to initialize settings', e);
        }
    };
    initializeSettings();
} catch (e) {
    // ignore if model not present or db not ready
}

// initialize socket and expose io on the express app for controllers
const io = initializeSocket(server);
if (io && app && typeof app.set === 'function') {
    app.set('io', io);
}

// attach io to requests for controllers to emit events
app.use((req, res, next) => {
    req.io = io;
    next();
});

// register directions routes
try {
    const directionsRoutes = require('./routes/directions.routes');
    app.use('/directions', directionsRoutes);
} catch (e) {
    // ignore if not available
}

// register payments routes
try {
    const paymentRoutes = require('./routes/payment.routes');
    app.use('/payments', paymentRoutes);
} catch (e) {
    // ignore if not available
}

// register admin routes
try {
    const adminRoutes = require('./routes/admin.routes');
    app.use('/admin', adminRoutes);
} catch (e) {
    // ignore if not available
}

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});