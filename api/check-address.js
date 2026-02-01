// api/check-address.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Your specific Howard County / Maryland ZIP codes
const ALLOWED_ZIPS = [
  '21044', '21045', '21046', '21042', '21043', 
  '21075', '20723', '20794', '20701', '21029', '20759'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'No address provided' });

  // 1. THE ZIP CODE VIBE CHECK
  // We check if the Google address contains any of our allowed ZIPs
  const hasValidZip = ALLOWED_ZIPS.some(zip => address.includes(zip));
  
  if (!hasValidZip) {
    return res.status(200).json({ 
      matched: false, 
      message: "Address is outside of our service area (ZIP check)." 
    });
  }

  // 2. CLEAN THE STREET NAME
  // "6345 Dobbin Rd, Columbia, MD 21045" -> "6345 DOBBIN RD"
  const searchStreet = address.split(',')[0].trim().toUpperCase();

  try {
    // 3. DATABASE LOOKUP
    // We search the 'street_address' column in Supabase for a match
    const { data, error } = await supabase
      .from('addresses')
      .select('street_address')
      .ilike('street_address', `%${searchStreet}%`)
      .limit(1);

    if (error) throw error;

    return res.status(200).json({
      matched: data && data.length > 0,
      searchStreet,
      zipConfirmed: true
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Database check failed' });
  }
}
