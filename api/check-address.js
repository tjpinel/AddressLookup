// api/check-address.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Extracts the street part and cleans it for the best chance of a match.
 */
function cleanStreet(fullAddress) {
  if (!fullAddress) return "";
  // Take everything before the first comma, trim spaces, and make it uppercase
  return fullAddress.split(',')[0].trim().toUpperCase();
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid address' });
  }

  // Clean the input (e.g., "6345 Dobbin Rd, Columbia, MD" -> "6345 DOBBIN RD")
  const searchStreet = cleanStreet(address);

  try {
    /**
     * DATABASE LOOKUP LOGIC
     * We use .ilike() with % wildcards.
     * This checks if the street_address in Supabase is contained within 
     * the cleaned street name from Google.
     */
    const { data, error } = await supabase
      .from('addresses')
      .select('street_address')
      .ilike('street_address', `%${searchStreet}%`)
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // If data has items, we found a match!
    const matched = data && data.length > 0;

    return res.status(200).json({
      matched,
      searchStreet,    // Helps you see what was actually searched
      fullAddress: address
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
