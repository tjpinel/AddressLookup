// api/check-address.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'No address provided' });

  // 1. THE MARYLAND VIBE CHECK
  // If the Google address doesn't contain "MD" or "Maryland", it's an automatic "No."
  const isMaryland = address.includes(', MD') || address.includes('Maryland');
  
  if (!isMaryland) {
    return res.status(200).json({ matched: false, message: "Outside of Maryland" });
  }

  // 2. CLEAN THE STREET
  const searchStreet = address.split(',')[0].trim().toUpperCase();

  try {
    // 3. DATABASE LOOKUP
    const { data, error } = await supabase
      .from('addresses')
      .select('street_address')
      .ilike('street_address', `%${searchStreet}%`)
      .limit(1);

    if (error) throw error;

    return res.status(200).json({
      matched: data && data.length > 0,
      searchStreet
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Database check failed' });
  }
}
