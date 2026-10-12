import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testFix() {
  console.log('=== FIXING CEO ACCOUNT STATUS IN DB ===')

  // 1. Update public.users status to active for ceo@oklut.com
  const { data: updateData, error: updateErr } = await supabase
    .from('users')
    .update({ status: 'active' })
    .eq('email', 'ceo@oklut.com')
    .select()

  console.log('Updated ceo@oklut.com status in public.users:', updateData, 'Error:', updateErr)

  // 2. Check if CEO exists in public.employees or if an employee row should be linked
  const { data: ceoEmp, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .ilike('email', 'ceo@oklut.com')
  console.log('CEO in public.employees:', ceoEmp)

  // 3. Test RPC provision_employee_login for password '1234' or '123456'
  const { data: rpc1, error: rpcErr1 } = await supabase.rpc('provision_employee_login', {
    p_employee_id: '00000000-0000-0000-0000-000000000001',
    p_email: 'ceo@oklut.com',
    p_password: '1234',
    p_role_name: 'Admin',
  })
  console.log('provision_employee_login with 1234:', rpc1, 'Error:', rpcErr1)

  // 4. Test login with 1234
  const { data: log1, error: logErr1 } = await supabase.auth.signInWithPassword({
    email: 'ceo@oklut.com',
    password: '1234',
  })
  console.log('Login with 1234:', log1?.user ? `SUCCESS (ID: ${log1.user.id})` : 'FAILED', logErr1?.message)

  // 5. Test login with 123456
  const { data: log2, error: logErr2 } = await supabase.auth.signInWithPassword({
    email: 'ceo@oklut.com',
    password: '123456',
  })
  console.log('Login with 123456:', log2?.user ? `SUCCESS (ID: ${log2.user.id})` : 'FAILED', logErr2?.message)

  // 6. Test full profile fetch as done by auth-context
  const userId = log1?.user?.id || log2?.user?.id
  if (userId) {
    const { data: userProfile, error: profErr } = await supabase
      .from('users')
      .select('*, role:roles(*), employee:employees(*, department:departments!employees_department_id_fkey(*), designation:designations(*))')
      .or(`id.eq.${userId},auth_id.eq.${userId}`)
      .maybeSingle()
    console.log('Fetched User Profile for CEO:', userProfile, 'Error:', profErr)
  }
}

testFix().catch(console.error)
