import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'No address provided' });

  // 1. Maryland Gatekeeper
  const upperAddress = address.toUpperCase();
  if (!upperAddress.includes('MD') && !upperAddress.includes('MARYLAND')) {
    return res.status(200).json({ matched: false, reason: 'Outside Maryland' });
  }

  // 2. Extract House Number and Street Name
  // Example: "8834 Sandrope Ct, Columbia..." -> ["8834", "SANDROPE"]
  const parts = address.split(' ');
  const houseNumber = parts[0]; 
  const streetName = parts[1] ? parts[1].replace(',', '').toUpperCase() : "";

  try {
    // 3. The Wildcard Search
    // Searches for "8834 SANDROPE%" 
    // This matches "8834 SANDROPE CT" or "8834 SANDROPE COURT"
    const { data, error } = await supabase
      .from('addresses')
      .select('street_address, Village')
      .ilike('street_address', `${houseNumber} ${streetName}%`)
      .limit(1);

    if (error) throw error;

    const matched = data && data.length > 0;

    return res.status(200).json({
      matched: matched,
      village: matched ? data[0].Village : null,
      debug: `Found house ${houseNumber} on ${streetName}`
    });

  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: 'Database check failed' });
  }
}
