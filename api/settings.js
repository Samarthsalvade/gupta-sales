const { getNotifyEmail, setNotifyEmail } = require('./_store');
const { requireAdmin } = require('./_auth');

module.exports = async (req, res) => {
    if (!(await requireAdmin(req, res))) return;

    if (req.method === 'GET') {
        try {
            const email = await getNotifyEmail();
            res.status(200).json({ email });
        } catch (err) {
            console.error('settings get error:', err);
            res.status(500).json({ error: 'Something went wrong' });
        }
        return;
    }

    if (req.method === 'POST') {
        let body;
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
        } catch (err) {
            res.status(400).json({ error: 'Invalid request body' });
            return;
        }
        const email = String(body.email || '').trim().slice(0, 254);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ error: 'Invalid email address' });
            return;
        }

        try {
            await setNotifyEmail(email);
            res.status(200).json({ ok: true });
        } catch (err) {
            console.error('settings post error:', err);
            res.status(500).json({ error: 'Something went wrong' });
        }
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
};
