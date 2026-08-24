const crypto = require('crypto');
const { checkRateLimit } = require('./_ratelimit');

function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

/* Returns true when the request carries a valid admin key.
   Writes the 401/429 response itself when it does not. */
async function requireAdmin(req, res) {
    const rate = await checkRateLimit(req, { name: 'admin', limit: 20, windowSeconds: 600 });
    if (!rate.allowed) {
        res.setHeader('Retry-After', String(rate.retryAfter));
        res.status(429).json({ error: 'Too many attempts. Please try again later.' });
        return false;
    }

    const adminKey = process.env.ADMIN_KEY;
    const providedKey = req.headers['x-admin-key'];

    if (!adminKey || !providedKey || !safeEqual(providedKey, adminKey)) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }

    return true;
}

module.exports = { requireAdmin };
