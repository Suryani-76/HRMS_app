import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  const suryani = await supabase.from('employees').select('id, first_name, last_name').ilike('first_name', '%suryani%').maybeSingle()
  console.log('Suryani employee ID:', suryani.data?.id)

  if (suryani.data?.id) {
    const { data: updated, error } = await supabase
      .from('departments')
      .update({ head_id: suryani.data.id })
      .ilike('name', '%full stack%')
      .select('*, head:employees!departments_head_id_fkey(first_name, last_name)')

    console.log('Updated Full stack Developer department in DB:', updated, error)
  }
}

test().catch(console.error)
