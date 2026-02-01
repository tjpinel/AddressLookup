// api/check-address.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ALLOWED_ZIPS = ['21044', '21045', '21046', '21042', '21043', '21075', '20723', '20794', '20701', '21029', '20759'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'No address provided' });

  const upperAddress = address.toUpperCase();

  // 1. MARYLAND GATEKEEPER
  if (!upperAddress.includes('MD') && !upperAddress.includes('MARYLAND')) {
    return res.status(200).json({ matched: false, reason: 'Outside Maryland' });
  }

  // 2. CLEAN STREET LOGIC (The "Suffix Stripper")
  // Takes "6345 Dobbin Rd, Columbia..." -> "6345 DOBBIN"
  // We strip " RD", " ST", " LN", " DR", " CT" etc. to avoid formatting fails.
  let searchStreet = address.split(',')[0].trim().toUpperCase();
  searchStreet = searchStreet.replace(/\b(RD|ROAD|ST|STREET|LN|LANE|DR|DRIVE|CT|COURT|CIR|CIRCLE|WAY|AVE|AVENUE)\b/g, "").trim();

  try {
    // 3. DATABASE LOOKUP
    // We search for a row where our street_address STARTS WITH the numbers and name
    const { data, error } = await supabase
      .from('addresses')
      .select('street_address')
      .ilike('street_address', `%${searchStreet}%`)
      .limit(1);

    if (error) throw error;

    return res.status(200).json({
      matched: data && data.length > 0,
      cleanedSearchTerm: searchStreet,
      originalInput: address
    });

  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
