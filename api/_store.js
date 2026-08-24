const { Redis } = require('@upstash/redis');

let redis;

function getRedis() {
    if (!redis) {
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (!url || !token) {
            throw new Error('Database is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your project environment variables.');
        }
        redis = new Redis({ url, token });
    }
    return redis;
}

const SUBSCRIBERS_KEY = 'gsc:subscribers';
const NOTIFY_EMAIL_KEY = 'gsc:notify_email';
// Sourced from the environment so no real address sits in public source.
// Falls back to SMTP_USER (the sending account) if NOTIFY_EMAIL is unset.
const DEFAULT_NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || process.env.SMTP_USER || '';

function parseEntry(item) {
    if (item && typeof item === 'object') return item;
    try {
        return JSON.parse(item);
    } catch (e) {
        return { phone: String(item), source: '', created_at: null };
    }
}

async function addSubscriber(phone, source) {
    const db = getRedis();
    const entry = {
        phone,
        source: source || 'website',
        created_at: new Date().toISOString()
    };
    await db.lpush(SUBSCRIBERS_KEY, JSON.stringify(entry));
}

async function getSubscribers() {
    const db = getRedis();
    const raw = await db.lrange(SUBSCRIBERS_KEY, 0, -1);
    return raw.map(parseEntry);
}

async function getNotifyEmail() {
    const db = getRedis();
    const value = await db.get(NOTIFY_EMAIL_KEY);
    return value || DEFAULT_NOTIFY_EMAIL;
}

async function setNotifyEmail(email) {
    const db = getRedis();
    await db.set(NOTIFY_EMAIL_KEY, email);
}

module.exports = {
    addSubscriber,
    getSubscribers,
    getNotifyEmail,
    setNotifyEmail,
    DEFAULT_NOTIFY_EMAIL
};
