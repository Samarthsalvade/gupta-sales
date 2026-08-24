const { sendMail } = require('./_mailer');
const { getNotifyEmail } = require('./_store');
const { checkRateLimit } = require('./_ratelimit');

/* Strips CR/LF so user input can never inject extra SMTP headers via the subject */
function singleLine(str) {
    return str.replace(/[\r\n]+/g, ' ').trim();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    } catch (err) {
        res.status(400).json({ error: 'Invalid request body.' });
        return;
    }

    const name = singleLine(String(body.name || '').trim().slice(0, 120));
    const contact = singleLine(String(body.contact || '').trim().slice(0, 120));
    const category = singleLine(String(body.category || 'General Enquiry').trim().slice(0, 60));
    const message = String(body.message || '').trim().slice(0, 3000);

    if (!name || !contact || !message) {
        res.status(400).json({ error: 'Please fill in your name, contact detail, and enquiry message.' });
        return;
    }

    const rate = await checkRateLimit(req, { name: 'enquiry', limit: 5, windowSeconds: 600 });
    if (!rate.allowed) {
        res.setHeader('Retry-After', String(rate.retryAfter));
        res.status(429).json({ error: 'Too many enquiries sent. Please try again in a few minutes, or call us directly.' });
        return;
    }

    try {
        const to = await getNotifyEmail();
        const subject = `New Website Enquiry from ${name} — ${category}`;
        const text = [
            'New enquiry received through the Gupta Sales Corporation website.',
            '',
            `Name: ${name}`,
            `Contact: ${contact}`,
            `Category: ${category}`,
            '',
            'Message:',
            message
        ].join('\n');
        const html = `
            <div style="font-family: Arial, sans-serif; color: #1c2530;">
                <h2 style="color:#0f2a52;">New Website Enquiry</h2>
                <p><strong>Name:</strong> ${escapeHtml(name)}</p>
                <p><strong>Contact:</strong> ${escapeHtml(contact)}</p>
                <p><strong>Category:</strong> ${escapeHtml(category)}</p>
                <p><strong>Message:</strong></p>
                <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
                <hr>
                <p style="font-size:12px;color:#5b6778;">Sent automatically from the enquiry form on the Gupta Sales Corporation website.</p>
            </div>
        `;

        await sendMail({ to, subject, text, html });
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('enquiry error:', err);
        res.status(500).json({ error: 'Something went wrong while sending your enquiry.' });
    }
};

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}
