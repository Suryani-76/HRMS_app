import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  console.log('Testing update on existing interview in Supabase...')
  const { data: interviews, error: iErr } = await supabase
    .from('interviews')
    .select('*')
    .limit(1)

  if (interviews && interviews.length > 0) {
    const testId = interviews[0].id
    console.log('Found interview ID:', testId)
    const metaTag = `[RESCHEDULE_REQ: preferred=2026-08-30T10:00:00.000Z|reason=Medical appointment conflict]`
    const { data: updated, error: uErr } = await supabase
      .from('interviews')
      .update({
        reschedule_requested: true,
        reschedule_status: 'pending',
        feedback: metaTag,
      })
      .eq('id', testId)
      .select()

    console.log('Update success:', updated, 'Error:', uErr)
  }
}

test().catch(console.error)
