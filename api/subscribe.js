const { addSubscriber } = require('./_store');
const { checkRateLimit } = require('./_ratelimit');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (err) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
    }

    const phone = String(body.phone || '').trim();
    const source = String(body.source || 'website').slice(0, 200);

    if (!/^[0-9]{10}$/.test(phone)) {
        res.status(400).json({ error: 'Invalid phone number' });
        return;
    }

    const rate = await checkRateLimit(req, { name: 'subscribe', limit: 10, windowSeconds: 600 });
    if (!rate.allowed) {
        res.setHeader('Retry-After', String(rate.retryAfter));
        res.status(429).json({ error: 'Too many submissions. Please try again shortly.' });
        return;
    }

    try {
        await addSubscriber(phone, source);
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('subscribe error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
