const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Invalid confirmation link.');
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).send('Database service is not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('subscribers')
    .update({ confirmed: true, confirmed_at: new Date().toISOString() })
    .eq('confirm_token', token)
    .select()
    .single();

  if (error || !data) {
    return res.status(404).send('Confirmation link expired or invalid.');
  }

  // Redirect to a friendly "you're subscribed" page on the site
  res.writeHead(302, { Location: '/subscribed' });
  res.end();
};
