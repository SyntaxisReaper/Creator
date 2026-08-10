const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
    // Admin secret verification
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
        console.error('ADMIN_SECRET not configured.');
        return res.status(500).json({ error: 'Admin service is not configured' });
    }

    const authHeader = req.headers['x-admin-secret'];
    if (!authHeader || authHeader !== adminSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase credentials missing.');
        return res.status(500).json({ error: 'Database service is not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // GET — list all posts (including drafts)
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('posts')
                .select('id, title, slug, excerpt, tags, published, published_at, created_at, updated_at, content_markdown')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return res.status(200).json({ posts: data || [] });
        }

        // POST — create a new post
        if (req.method === 'POST') {
            const { title, slug, content_markdown, excerpt, tags, published } = req.body || {};

            if (!title || !slug || !content_markdown) {
                return res.status(400).json({ error: 'Title, slug, and content are required' });
            }

            // Validate slug format
            const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
            if (!slugRegex.test(slug)) {
                return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens (e.g., my-first-post)' });
            }

            const postData = {
                title: title.trim(),
                slug: slug.trim().toLowerCase(),
                content_markdown: content_markdown,
                excerpt: excerpt ? excerpt.trim() : null,
                tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
                published: published === true,
                published_at: published === true ? new Date().toISOString() : null,
            };

            const { data, error } = await supabase
                .from('posts')
                .insert(postData)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({ error: 'A post with this slug already exists' });
                }
                throw error;
            }

            return res.status(201).json({ post: data });
        }

        // PUT — update an existing post
        if (req.method === 'PUT') {
            const { id, title, slug, content_markdown, excerpt, tags, published } = req.body || {};

            if (!id) {
                return res.status(400).json({ error: 'Post ID is required' });
            }

            const updateData = { updated_at: new Date().toISOString() };

            if (title !== undefined) updateData.title = title.trim();
            if (slug !== undefined) {
                const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
                if (!slugRegex.test(slug)) {
                    return res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens' });
                }
                updateData.slug = slug.trim().toLowerCase();
            }
            if (content_markdown !== undefined) updateData.content_markdown = content_markdown;
            if (excerpt !== undefined) updateData.excerpt = excerpt ? excerpt.trim() : null;
            if (tags !== undefined) {
                updateData.tags = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);
            }
            if (published !== undefined) {
                updateData.published = published === true;
                // Set published_at only when first publishing
                if (published === true) {
                    const { data: existing } = await supabase
                        .from('posts')
                        .select('published_at')
                        .eq('id', id)
                        .single();
                    if (!existing?.published_at) {
                        updateData.published_at = new Date().toISOString();
                    }
                }
            }

            const { data, error } = await supabase
                .from('posts')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    return res.status(409).json({ error: 'A post with this slug already exists' });
                }
                throw error;
            }

            if (!data) {
                return res.status(404).json({ error: 'Post not found' });
            }

            return res.status(200).json({ post: data });
        }

        // DELETE — delete a post
        if (req.method === 'DELETE') {
            const id = req.query?.id || req.body?.id;

            if (!id) {
                return res.status(400).json({ error: 'Post ID is required' });
            }

            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return res.status(200).json({ message: 'Post deleted' });
        }

        res.setHeader('Allow', 'GET, POST, PUT, DELETE');
        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        console.error('Admin posts API error:', err);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
