const { createClient } = require('@supabase/supabase-js');

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

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials missing.');
        return res.status(500).json({ message: 'Database service is not configured' });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
            .from('contacts')
            .insert([
                { name, email, message }
            ]);

        if (error) {
            console.error('Supabase Insert Error:', error);
            throw error;
        }

        return res.status(200).json({ message: 'Message saved successfully!' });
    } catch (error) {
        console.error('Error saving contact:', error);
        return res.status(500).json({ message: 'Failed to save message. Please try again later.' });
    }
};
