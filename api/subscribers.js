const { getSubscribers } = require('./_store');
const { requireAdmin } = require('./_auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    if (!(await requireAdmin(req, res))) return;

    try {
        const subscribers = await getSubscribers();
        res.status(200).json({ count: subscribers.length, subscribers });
    } catch (err) {
        console.error('subscribers error:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
};
