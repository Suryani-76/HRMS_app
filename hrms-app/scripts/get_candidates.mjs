import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function fetchCandidateLogins() {
  const { data: candidates, error } = await supabase
    .from('candidates')
    .select('*')

  if (error) {
    console.error('Error fetching candidates:', error)
    return
  }

  console.log(`\n=== CANDIDATE PORTAL LOGIN DETAILS (${candidates.length} CANDIDATES FOUND) ===\n`)
  
  for (const [idx, c] of candidates.entries()) {
    console.log(`[#${idx + 1}] Candidate: ${c.name || (c.first_name ? `${c.first_name} ${c.last_name || ''}` : 'N/A')}`)
    console.log(`  📧 Email: ${c.email || 'N/A'}`)
    console.log(`  📱 Phone: ${c.phone || 'N/A'}`)
    console.log(`  🔑 Reference ID (Username): ${c.reference_id || c.temp_id || c.id}`)
    console.log(`  🔒 Date of Birth (Password): ${c.date_of_birth || c.dob || 'Not set'}`)
    console.log(`  📌 Stage / Status: ${c.status || 'applied'}`)
    if (c.applied_at || c.updated_at) {
      console.log(`  🕒 Applied/Updated: ${c.applied_at || c.updated_at}`)
    }
    if (c.meeting_link) {
      console.log(`  🔗 Meeting Link: ${c.meeting_link}`)
    }
    console.log('------------------------------------------------------------')
  }
}

fetchCandidateLogins().catch(console.error)
