import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function diagnose() {
  console.log('=== DIAGNOSING CEO ACCOUNT ===')

  // 1. Check public.users
  const { data: users, error: userErr } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .ilike('email', '%ceo%')
  console.log('public.users matching ceo:', users, 'Error:', userErr)

  // 2. Check public.employees
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, email, user_id, status')
    .ilike('email', '%ceo%')
  console.log('public.employees matching ceo:', emps, 'Error:', empErr)

  // 3. Try logging in with various passwords
  const testPasswords = ['1234', '123456', 'Admin@123', 'admin123', 'Ceo@123', 'Ceo@oklut25$', 'Hr@oklut25$', 'password', '12345678']
  for (const pwd of testPasswords) {
    const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
      email: 'ceo@oklut.com',
      password: pwd,
    })
    if (!signErr && signData?.user) {
      console.log(`✅ Login SUCCEEDED with password: "${pwd}"! User ID:`, signData.user.id, 'Email confirmed:', signData.user.email_confirmed_at)
    } else {
      console.log(`❌ Login failed with password "${pwd}":`, signErr?.message)
    }
  }

  // 4. Also check all public.users
  const { data: allUsers } = await supabase.from('users').select('id, email, role_id, status').limit(20)
  console.log('All public.users (first 20):', allUsers)
}

diagnose().catch(console.error)
