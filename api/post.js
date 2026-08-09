const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const slug = req.query && req.query.slug;
    if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid slug parameter' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials missing.');
        return res.status(500).json({ error: 'Database service is not configured' });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', slug)
            .eq('published', true)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Cache individual posts for 60 seconds
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({ post: data });
    } catch (err) {
        console.error('Post API error:', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
