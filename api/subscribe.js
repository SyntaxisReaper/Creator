const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (!supabaseUrl || !supabaseServiceKey || !resendKey) {
    console.error('Missing configuration for newsletter signup.');
    return res.status(500).json({ error: 'Newsletter service is not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const resend = new Resend(resendKey);

  try {
    // Upsert so re-subscribing with the same email doesn't error
    const { data: subscriber, error } = await supabase
      .from('subscribers')
      .upsert({ email }, { onConflict: 'email', ignoreDuplicates: false })
      .select()
      .single();

    if (error) throw error;

    // Already confirmed? Nothing to do.
    if (subscriber.confirmed) {
      return res.status(200).json({ message: "You're already subscribed!" });
    }

    const domain = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : process.env.SITE_URL);
    const confirmUrl = `${domain}/api/confirm?token=${subscriber.confirm_token}`;

    const { error: resendError } = await resend.emails.send({
      from: 'Ritesh <newsletter@fluxipher.me>', 
      to: email,
      subject: 'Confirm your subscription',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #6ee7f9;">Welcome!</h2>
            <p>Thanks for subscribing to my blog!</p>
            <p><a href="${confirmUrl}" style="display: inline-block; padding: 10px 20px; background: #6ee7f9; color: #111; text-decoration: none; border-radius: 5px; font-weight: bold;">Confirm Subscription</a></p>
            <p>Or click this link:<br/> <a href="${confirmUrl}">${confirmUrl}</a></p>
            <p style="color: #888; font-size: 12px; margin-top: 40px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    });

    if (resendError) {
      console.error('Resend API Error:', resendError);
      throw resendError;
    }

    return res.status(200).json({ message: 'Check your inbox to confirm your subscription.' });

  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
