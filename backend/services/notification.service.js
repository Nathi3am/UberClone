/**
 * Push Notification Service (FCM via firebase-admin)
 *
 * Requires ONE of:
 *  1. FIREBASE_SERVICE_ACCOUNT env var containing the full JSON string of the
 *     service account key (recommended for cloud hosts like Render).
 *  2. FIREBASE_SERVICE_ACCOUNT_PATH env var pointing to a local JSON file.
 *
 * If neither is set, push notifications are silently disabled.
 */

let messaging = null;

try {
    const admin = require('firebase-admin');

    let serviceAccount = null;

    // Option 1: JSON string in env var (for Render / cloud deploys)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    // Option 2: Local file path (for local dev)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const path = require('path');
        const fs = require('fs');
        const resolvedPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        if (fs.existsSync(resolvedPath)) {
            try {
                const raw = fs.readFileSync(resolvedPath, 'utf8');
                serviceAccount = JSON.parse(raw);
            } catch (e) {
                console.warn('[push] Failed to load/parse Firebase service account file:', e && e.message ? e.message : e);
            }
        } else {
            console.warn('[push] Firebase service account file not found at', resolvedPath);
        }
    }

    if (serviceAccount && typeof serviceAccount === 'object') {
        try {
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            }

            messaging = admin.messaging();
            console.log('[push] Firebase Admin initialized — push notifications enabled');
        } catch (e) {
            console.warn('[push] Firebase Admin init failed during initializeApp:', e && e.message ? e.message : e);
            messaging = null;
        }
    } else {
        console.warn('[push] No valid Firebase credentials found — push notifications disabled');
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
        console.log(`[push] Sending to ${tokenList.length} token(s): title="${title}"`);
        const response = await messaging.sendEachForMulticast(message);
        const succeeded = response.responses.filter(r => r.success).length;
        const failed = response.responses.filter(r => !r.success);
        console.log(`[push] Result: ${succeeded} succeeded, ${failed.length} failed out of ${tokenList.length}`);
        if (failed.length > 0) {
            failed.forEach((f, i) => {
                const errCode = f.error?.code || f.error?.message || 'unknown';
                console.warn(`[push]   failed[${i}]: ${errCode}`);
            });
        }
    } catch (err) {
        console.error('[push] FCM sendEachForMulticast error:', err && err.message ? err.message : err);
    }
};

module.exports = { sendPush };
