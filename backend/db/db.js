const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const URI = process.env.MONGO_URI;
const LOCAL_URI = process.env.MONGO_LOCAL_URI || 'mongodb://127.0.0.1:27017/peakuber';

async function connectToDb() {
    const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
    };

    try {
        await mongoose.connect(URI, options);
        console.log('Connected to peakuber database (primary)');
        return;
    } catch (err) {
        console.error('Primary MongoDB connection error:', err && err.message ? err.message : err);

        // If SRV lookup / network to Atlas fails, attempt a local fallback in development
        const isDev = process.env.NODE_ENV !== 'production';
        const message = err && err.message ? err.message.toLowerCase() : '';
        const isSrvError = err && (
            err.code === 'ENOTFOUND' ||
            err.code === 'ECONNREFUSED' ||
            message.includes('querysrv') ||
            message.includes(' srv ') ||
            message.includes('could not connect to any servers') ||
            message.includes('atlas cluster')
        );

        if (isDev && isSrvError) {
            console.warn('Atlas SRV lookup failed; attempting local MongoDB fallback:', LOCAL_URI);
            try {
                await mongoose.connect(LOCAL_URI, options);
                console.log('Connected to peakuber database (fallback local)');
                return;
            } catch (err2) {
                console.error('Fallback local MongoDB connection failed:', err2 && err2.message ? err2.message : err2);
            }
        }

        // Keep the API process alive in development even if DB is unavailable.
        if (isDev) {
            console.error('[db] Development mode: continuing without database connection');
            return;
        }

        // In production, fail fast.
        throw err;
    }
}

module.exports = connectToDb;