// api/check-address.js
// ---------------------------------------------------------------------------
// Vercel Serverless Function
// Called by the frontend when the user clicks Confirm.
// Receives the full Google-formatted address, extracts the street portion,
// and looks it up in the Supabase addresses table.
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Extracts just the street address from a Google formatted_address.
 * Google returns: "6308 Mellow Twilight Court, Columbia, MD 21044, USA"
 * We want:        "6308 MELLOW TWILIGHT COURT"
 *
 * Strategy: split on the first comma, take the first part, uppercase it.
 */
function extractStreet(fullAddress) {
  const street = fullAddress.split(',')[0].trim().toUpperCase();
  return street;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid address' });
  }

  const street = extractStreet(address);

  try {
    // Query Supabase: look for an exact match on street_address
    const { data, error } = await supabase
      .from('addresses')
      .select('street_address')
      .eq('street_address', street)
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const matched = data && data.length > 0;

    return res.status(200).json({
      matched,
      street,          // echo back so frontend can show/debug it
      fullAddress: address
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
