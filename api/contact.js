const nodemailer = require('nodemailer');

function readField(value) {
    return typeof value === 'string' ? value.trim() : '';
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const name = readField(req.body && req.body.name);
    const email = readField(req.body && req.body.email);
    const message = readField(req.body && req.body.message);

    if (!name || !email || !message) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email address' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.EMAIL_USER;
    const smtpPass = process.env.EMAIL_PASS;
    const recipient = process.env.EMAIL_TO || smtpUser;

    if (!smtpUser || !smtpPass || !recipient) {
        return res.status(500).json({ message: 'Email service is not configured' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number.isFinite(smtpPort) ? smtpPort : 587,
            secure: Number.isFinite(smtpPort) ? smtpPort === 465 : false,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        await transporter.sendMail({
            from: smtpUser,
            to: recipient,
            replyTo: email,
            subject: `Portfolio Contact from ${name}`,
            text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        });

        return res.status(200).json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Failed to send message. Please try again later.' });
    }
};
