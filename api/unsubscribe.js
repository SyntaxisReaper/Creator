const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Invalid unsubscribe link.');
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).send('Database service is not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase
    .from('subscribers')
    .delete()
    .eq('unsubscribe_token', token);

  res.writeHead(302, { Location: '/unsubscribed' });
  res.end();
};
