import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { address } = req.body;
  
  // 1. Clean the Google Address
  // Example: "5535 Green Mountain Circle, Columbia, MD 21044, USA"
  const upperAddress = address.toUpperCase();
  const addressWithoutCity = upperAddress.split(',')[0].trim(); // "5535 GREEN MOUNTAIN CIRCLE"
  
  // 2. Extract Parts for a more specific search
  const parts = addressWithoutCity.split(' ');
  const houseNumber = parts[0]; // "5535"
  const streetFirstWord = parts[1]; // "GREEN"
  const streetSecondWord = parts[2] || ''; // "MOUNTAIN"

  try {
    // 3. THE "SPECIFIC" SEARCH
    // We search for the house number AND the first two words of the street.
    // This distinguishes "Green Mountain" from "Green Dory".
    const { data, error } = await supabase
      .from('addresses')
      .select('street_address, Village')
      .ilike('street_address', `${houseNumber} %`) // Exact number followed by space
      .ilike('street_address', `% ${streetFirstWord} %`) // Exact first word
      .ilike('street_address', `% ${streetSecondWord}%`) // Exact second word
      .limit(1);

    if (error) throw error;

    const matched = data && data.length > 0;

    return res.status(200).json({
      matched: matched,
      village: matched ? data[0].Village : null
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
