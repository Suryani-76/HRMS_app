import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  console.log('=== HRMS Employee API & Login Test ===')

  // 1. Fetch current employees
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, user_id, status')
    .order('created_at', { ascending: false })
    .limit(5)

  if (empErr) {
    console.error('Failed to fetch employees:', empErr)
  } else {
    console.log('Recent 5 employees in DB:', employees)
  }

  // 2. Create a brand new employee with mandatory fields
  const uniqueId = Math.floor(Math.random() * 9000 + 1000)
  const testEmail = `emp_${uniqueId}@oklut.com`
  const testPassword = `EmpPass@${uniqueId}`
  const firstName = `TestEmp${uniqueId}`
  const lastName = 'Automation'

  console.log(`\n--- Creating new employee: ${testEmail} with password: ${testPassword} ---`)

  // Step A: Insert employee row
  const empPayload = {
    first_name: firstName,
    last_name: lastName,
    email: testEmail,
    phone: `+9198765${uniqueId}`,
    joining_date: new Date().toISOString().slice(0, 10),
    employment_type: 'Full-time',
    status: 'Active',
    branch: 'HQ',
    employee_code: `OKL-EMP-${uniqueId}`,
  }

  const { data: newEmp, error: createEmpErr } = await supabase
    .from('employees')
    .insert(empPayload)
    .select('*')
    .single()

  if (createEmpErr || !newEmp) {
    console.error('Failed to create employee in DB:', createEmpErr)
    return
  }
  console.log('✅ Employee row created successfully:', newEmp.id, newEmp.employee_code)

  // Step B: Call provision_employee_login RPC or auth.signUp
  console.log('\n--- Provisioning Auth Login Credentials ---')
  const { data: rpcData, error: rpcErr } = await supabase.rpc('provision_employee_login', {
    p_employee_id: newEmp.id,
    p_email: testEmail,
    p_password: testPassword,
    p_role_name: 'Employee',
  })

  let authUserId = null

  if (!rpcErr && rpcData?.success) {
    console.log('✅ RPC provision_employee_login succeeded:', rpcData)
    authUserId = rpcData.user_id
  } else {
    console.log('ℹ️ RPC notice:', rpcErr?.message || rpcData)
    console.log('Attempting auth.signUp fallback...')

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: `${firstName} ${lastName}`,
          employee_id: newEmp.id,
        },
      },
    })

    if (signUpErr) {
      console.error('❌ auth.signUp failed:', signUpErr)
    } else {
      console.log('✅ auth.signUp result. User ID:', signUpData.user?.id, 'Confirmed At:', signUpData.user?.email_confirmed_at)
      authUserId = signUpData.user?.id
    }
  }

  // Ensure public.users entry
  const { data: roleData } = await supabase.from('roles').select('id').ilike('name', 'Employee').maybeSingle()
  const { error: upsertErr } = await supabase.from('users').upsert({
    id: authUserId || newEmp.id,
    auth_id: authUserId || newEmp.id,
    email: testEmail.toLowerCase(),
    role_id: roleData?.id || null,
    employee_id: newEmp.id,
    status: 'active',
    name: `${firstName} ${lastName}`,
  }, { onConflict: 'email' })

  if (upsertErr) {
    console.warn('public.users upsert notice:', upsertErr)
  } else {
    console.log('✅ public.users entry ensured')
  }

  if (authUserId) {
    await supabase.from('employees').update({ user_id: authUserId }).eq('id', newEmp.id)
  }

  // Step C: Test Sign-in with the created credentials!
  console.log(`\n--- Testing Login with ${testEmail} / ${testPassword} ---`)
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  })

  if (loginErr) {
    console.error('❌ Login failed:', loginErr.message)
    console.log('Login error object:', loginErr)
  } else {
    console.log('🎉 SUCCESS! Employee logged in successfully!')
    console.log('Session User ID:', loginData.user?.id)
    console.log('Email:', loginData.user?.email)
  }

  // Step D: Also check manu@oklut.com
  console.log('\n--- Checking manu@oklut.com status ---')
  const { data: manuEmp } = await supabase
    .from('employees')
    .select('*')
    .ilike('email', 'manu@oklut.com')
    .maybeSingle()
  console.log('manu employee row:', manuEmp)

  const { data: manuUser } = await supabase
    .from('users')
    .select('*')
    .ilike('email', 'manu@oklut.com')
    .maybeSingle()
  console.log('manu public.users row:', manuUser)
}

run().catch(console.error)
