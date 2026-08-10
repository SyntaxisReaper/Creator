const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify the webhook secret so this endpoint can't be triggered by anyone else
    if (req.headers['x-webhook-secret'] !== process.env.SUPABASE_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const post = req.body.record; // Supabase sends the changed row as `record`

    // Only act when a post transitions TO published, and hasn't been notified yet
    if (!post.published || post.notified_at) {
      return res.status(200).json({ skipped: true });
    }

    if (!supabaseUrl || !supabaseServiceKey || !resendKey) {
      return res.status(500).json({ error: 'Services not configured properly.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendKey);

    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('email, unsubscribe_token')
      .eq('confirmed', true);

    const markNotified = async (postId) => {
      await supabase
        .from('posts')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', postId);
    };

    if (!subscribers || subscribers.length === 0) {
      await markNotified(post.id);
      return res.status(200).json({ sent: 0 });
    }

    // Attempt to automatically derive domain on Vercel or use an env variable
    const domain = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://fluxipher.me');

    // Resend batch send — one call, one email per subscriber
    await resend.batch.send(
      subscribers.map(sub => ({
        from: 'Ritesh <newsletter@fluxipher.me>',
        to: sub.email,
        subject: `New post: ${post.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #6ee7f9;">${post.title}</h2>
            <p>${post.excerpt || ''}</p>
            <p><a href="${domain}/blog?slug=${post.slug}" style="display: inline-block; padding: 10px 20px; background: #6ee7f9; color: #111; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Read the full post →</a></p>
            <hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size:12px;color:#888; text-align: center;">
              <a href="${domain}/api/unsubscribe?token=${sub.unsubscribe_token}" style="color: #888;">Unsubscribe</a>
            </p>
          </div>
        `
      }))
    );

    await markNotified(post.id);

    return res.status(200).json({ sent: subscribers.length });

  } catch (err) {
    console.error('Notify subscribers error:', err);
    return res.status(500).json({ error: 'Failed to notify subscribers' });
  }
};
