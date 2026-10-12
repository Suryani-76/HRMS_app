import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function checkEmployees() {
  const { data: emps, error } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, email, user_id, status')
    .order('created_at', { ascending: true })

  console.log('Total employees in DB:', emps?.length, 'Error:', error)
  console.log('Sample employees:', emps?.slice(0, 5))
}

checkEmployees().catch(console.error)
