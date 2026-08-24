const { Redis } = require('@upstash/redis');

let redis;

function getRedis() {
    if (!redis) {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url || !token) return null;
        redis = new Redis({ url, token });
    }
    return redis;
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

/* Fixed-window counter per IP. Returns { allowed, retryAfter }.
   Fails open: if Redis is unreachable the request is allowed through rather
   than taking the whole form offline. */
async function checkRateLimit(req, { name, limit, windowSeconds }) {
    const db = getRedis();
    if (!db) return { allowed: true };

    const ip = getClientIp(req);
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `gsc:rl:${name}:${ip}:${bucket}`;

    try {
        const count = await db.incr(key);
        if (count === 1) await db.expire(key, windowSeconds);
        if (count > limit) {
            return { allowed: false, retryAfter: windowSeconds };
        }
        return { allowed: true };
    } catch (err) {
        console.error('rate limit check failed, allowing request:', err);
        return { allowed: true };
    }
}

module.exports = { checkRateLimit, getClientIp };
