/**
 * Push Notification Service (FCM via firebase-admin)
 *
 * Requires:
 *  1. A Firebase service account key file downloaded from:
 *     Firebase Console → Project Settings → Service Accounts → Generate new private key
 *  2. Set FIREBASE_SERVICE_ACCOUNT_PATH in backend/.env to the absolute path of that file.
 *     Example: FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
 *
 * If the env var is not set or the file is missing, push notifications are
 * silently disabled and the app continues to work without them.
 */

let messaging = null;

try {
    const admin = require('firebase-admin');

    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (keyPath) {
        const path = require('path');
        const resolvedPath = path.resolve(keyPath);
        const serviceAccount = require(resolvedPath);

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }

        messaging = admin.messaging();
        console.log('[push] Firebase Admin initialized — push notifications enabled');
    } else {
        console.warn('[push] FIREBASE_SERVICE_ACCOUNT_PATH not set — push notifications disabled');
    }
} catch (err) {
    console.warn('[push] Firebase Admin init failed:', err && err.message ? err.message : err);
}

/**
 * Send a push notification to one or more FCM device tokens.
 * @param {string|string[]} tokens  - FCM registration token(s)
 * @param {string}          title
 * @param {string}          body
 * @param {object}          [data]  - extra key-value pairs (all values must be strings)
 */
const sendPush = async (tokens, title, body, data = {}) => {
    if (!messaging) return;

    const tokenList = (Array.isArray(tokens) ? tokens : [tokens])
        .filter(t => typeof t === 'string' && t.trim().length > 0);

    if (tokenList.length === 0) return;

    // FCM data payload values must all be strings
    const safeData = {};
    for (const [k, v] of Object.entries(data)) {
        safeData[k] = v === null || v === undefined ? '' : String(v);
    }

    const message = {
        notification: { title, body },
        data: safeData,
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: safeData.type === 'new-ride-request' ? 'ride_requests' : 'default',
            },
        },
        tokens: tokenList,
    };

    try {
        const response = await messaging.sendEachForMulticast(message);
        const failed = response.responses.filter(r => !r.success);
        if (failed.length > 0) {
            console.warn(`[push] ${failed.length}/${tokenList.length} FCM send(s) failed`);
        }
    } catch (err) {
        console.error('[push] FCM sendEachForMulticast error:', err && err.message ? err.message : err);
    }
};

module.exports = { sendPush };
