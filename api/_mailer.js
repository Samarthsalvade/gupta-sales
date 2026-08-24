const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
    if (!transporter) {
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = Number(process.env.SMTP_PORT || 465);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        if (!user || !pass) {
            throw new Error('SMTP is not configured. Set SMTP_USER and SMTP_PASS in your project environment variables.');
        }

        transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass }
        });
    }
    return transporter;
}

async function sendMail({ to, subject, text, html }) {
    const t = getTransporter();
    const from = process.env.SMTP_USER;
    await t.sendMail({
        from: `"Gupta Sales Corporation Website" <${from}>`,
        to,
        subject,
        text,
        html
    });
}

module.exports = { sendMail };
