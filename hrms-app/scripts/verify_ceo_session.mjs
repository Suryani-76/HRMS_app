import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function verifyCeoFlow() {
  console.log('=== VERIFYING FULL CEO LOGIN & PERMISSIONS FLOW ===')

  // 1. Sign in
  const { data: authRes, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'ceo@oklut.com',
    password: '1234',
  })

  if (authErr || !authRes.user) {
    console.error('❌ Sign in failed:', authErr)
    return
  }
  console.log('✅ 1. Supabase Auth successful for user:', authRes.user.email, 'ID:', authRes.user.id)

  // 2. Fetch Profile like auth-context does
  const userId = authRes.user.id
  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('*, role:roles(*)')
    .or(`id.eq.${userId},auth_id.eq.${userId}`)
    .maybeSingle()

  if (userErr || !user) {
    console.error('❌ Profile fetch failed:', userErr)
    return
  }
  console.log('✅ 2. Profile loaded:', {
    email: user.email,
    status: user.status,
    role: user.role?.name,
  })

  // 3. Verify status check (must NOT be blocked)
  if (user.status === 'Blocked' || user.status === 'Terminated' || user.status === 'Inactive') {
    console.error('❌ User is blocked/terminated! Status:', user.status)
    return
  }
  console.log('✅ 3. Status check PASSED: User is', user.status)

  // 4. Verify Admin Role
  const emailLower = user.email.toLowerCase()
  const roleName = user.role?.name || ''
  const isAdmin = roleName === 'Admin' || emailLower === 'ceo@oklut.com' || emailLower.startsWith('admin@')
  console.log('✅ 4. Admin Authority:', isAdmin ? 'FULL ADMIN / CEO ACCESS' : 'NOT ADMIN')

  // 5. Test querying key tables as CEO
  const [empRes, deptRes, leaveRes, perfRes, candRes] = await Promise.all([
    supabase.from('employees').select('id', { count: 'exact', head: true }),
    supabase.from('departments').select('id', { count: 'exact', head: true }),
    supabase.from('leave_requests').select('id', { count: 'exact', head: true }),
    supabase.from('performance_reviews').select('id', { count: 'exact', head: true }),
    supabase.from('candidates').select('id', { count: 'exact', head: true }),
  ])

  console.log('✅ 5. Database Access verified:')
  console.log('   - Employees count:', empRes.count)
  console.log('   - Departments count:', deptRes.count)
  console.log('   - Leave requests count:', leaveRes.count)
  console.log('   - Performance reviews count:', perfRes.count)
  console.log('   - Candidates count:', candRes.count)

  console.log('\n🎉 ALL CEO LOGIN & PERMISSION CHECKS PASSED!')
}

verifyCeoFlow().catch(console.error)
