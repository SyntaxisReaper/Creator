const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
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
            .select('id, title, slug, excerpt, tags, published_at')
            .eq('published', true)
            .order('published_at', { ascending: false });

        if (error) {
            console.error('Posts fetch error:', error);
            return res.status(500).json({ error: 'Failed to load posts' });
        }

        // Cache for 60 seconds to reduce Supabase calls
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({ posts: data || [] });
    } catch (err) {
        console.error('Posts API error:', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
