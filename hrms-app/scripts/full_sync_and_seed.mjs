import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function seed() {
  console.log('=== 1. ENSURING DEPARTMENTS ===')
  const depts = [
    { name: 'Engineering', code: 'ENG', description: 'Software & Technology Development' },
    { name: 'Human Resources', code: 'HR', description: 'People Operations & Recruitment' },
    { name: 'Finance', code: 'FIN', description: 'Financial Planning & Accounting' },
    { name: 'Marketing', code: 'MKT', description: 'Brand Strategy & Growth' },
    { name: 'Sales', code: 'SLS', description: 'Enterprise Accounts & Sales' },
    { name: 'Design', code: 'DES', description: 'UI/UX & Product Design' },
    { name: 'AI/ML', code: 'AI/ML', description: 'AI & Machine Learning Research' },
    { name: 'Operations', code: 'OPS', description: 'Company Logistics & Infrastructure' }
  ]

  for (const d of depts) {
    await supabase.from('departments').upsert(d, { onConflict: 'name' })
  }

  const { data: allDepts } = await supabase.from('departments').select('id, name')
  const dMap = {}
  allDepts?.forEach(d => { dMap[d.name] = d.id })
  console.log('Departments:', Object.keys(dMap))

  console.log('\n=== 2. ENSURING DESIGNATIONS ===')
  const designations = [
    { name: 'Senior Software Engineer', department_id: dMap['Engineering'], level: 3 },
    { name: 'Engineering Manager', department_id: dMap['Engineering'], level: 4 },
    { name: 'HR Manager', department_id: dMap['Human Resources'], level: 4 },
    { name: 'HR Executive', department_id: dMap['Human Resources'], level: 2 },
    { name: 'Recruiter', department_id: dMap['Human Resources'], level: 2 },
    { name: 'UI Designer', department_id: dMap['Design'], level: 2 },
    { name: 'Accountant', department_id: dMap['Finance'], level: 2 },
    { name: 'Marketing Lead', department_id: dMap['Marketing'], level: 3 },
    { name: 'AI Engineer', department_id: dMap['AI/ML'], level: 3 }
  ]

  for (const des of designations) {
    await supabase.from('designations').upsert(des, { onConflict: 'name' })
  }

  const { data: allDesigs } = await supabase.from('designations').select('id, name')
  const desigMap = {}
  allDesigs?.forEach(d => { desigMap[d.name] = d.id })
  console.log('Designations count:', allDesigs?.length)

  console.log('\n=== 3. ENSURING LEAVE TYPES ===')
  const leaveTypes = [
    { name: 'Casual Leave', code: 'CL', days_allowed: 12, is_paid: true, description: 'Personal or urgent leave' },
    { name: 'Sick Leave', code: 'SL', days_allowed: 10, is_paid: true, description: 'Medical or sick leave' },
    { name: 'Paid Leave', code: 'PL', days_allowed: 15, is_paid: true, description: 'Earned / annual paid leave' },
    { name: 'Maternity Leave', code: 'ML', days_allowed: 180, is_paid: true, description: 'Maternity support leave' },
    { name: 'Paternity Leave', code: 'PTL', days_allowed: 15, is_paid: true, description: 'Paternity support leave' }
  ]

  for (const lt of leaveTypes) {
    await supabase.from('leave_types').upsert(lt, { onConflict: 'name' })
  }

  const { data: allLeaveTypes } = await supabase.from('leave_types').select('id, name, days_allowed')
  console.log('Leave Types:', allLeaveTypes?.map(l => l.name))

  console.log('\n=== 4. ENSURING CORE EMPLOYEES & USERS ===')
  const employeesToSeed = [
    {
      first_name: 'Vinithri',
      last_name: 'K',
      email: 'vinithri@oklut.com',
      phone: '+919701051234',
      employee_code: 'OKL-ENG-2026-001',
      joining_date: '2026-08-24',
      employment_type: 'Full-time',
      status: 'Active',
      branch: 'HQ',
      department_id: dMap['Engineering'],
      designation_id: desigMap['Senior Software Engineer']
    },
    {
      first_name: 'Rishi',
      last_name: 'H',
      email: 'rishi@oklut.com',
      phone: '+919701054567',
      employee_code: 'OKL-AI-2026-002',
      joining_date: '2026-08-24',
      employment_type: 'Full-time',
      status: 'Active',
      branch: 'HQ',
      department_id: dMap['AI/ML'],
      designation_id: desigMap['AI Engineer']
    },
    {
      first_name: 'Manu',
      last_name: 'G',
      email: 'manu@oklut.com',
      phone: '+919701059876',
      employee_code: 'OKL-FIN-2026-003',
      joining_date: '2026-08-24',
      employment_type: 'Full-time',
      status: 'Active',
      branch: 'HQ',
      department_id: dMap['Finance'],
      designation_id: desigMap['Accountant']
    },
    {
      first_name: 'Surya',
      last_name: 'HR',
      email: 'suryahr@oklut.com',
      phone: '+919701058436',
      employee_code: 'OKL-HR-2026-004',
      joining_date: '2026-08-25',
      employment_type: 'Full-time',
      status: 'Active',
      branch: 'HQ',
      department_id: dMap['Human Resources'],
      designation_id: desigMap['HR Manager']
    },
    {
      first_name: 'Suryani',
      last_name: 'Gouda',
      email: 'goudasuryani@oklut.com',
      phone: '+919876543210',
      employee_code: 'OKL-ENG-2026-005',
      joining_date: '2026-08-13',
      employment_type: 'Full-time',
      status: 'Active',
      branch: 'HQ',
      department_id: dMap['Engineering'],
      designation_id: desigMap['Engineering Manager']
    },
    {
      first_name: 'Jane',
      last_name: 'D',
      email: 'jane@oklut.com',
      phone: '+919876500123',
      employee_code: 'OKL-GEN-2026-023',
      joining_date: '2026-08-14',
      employment_type: 'Full-time',
      status: 'Active',
      branch: 'HQ',
      department_id: dMap['Engineering'],
      designation_id: desigMap['Senior Software Engineer']
    }
  ]

  for (const emp of employeesToSeed) {
    const { data: usr } = await supabase.from('users').select('id').ilike('email', emp.email).maybeSingle()
    const payload = { ...emp, user_id: usr?.id || null }

    const { data: savedEmp, error } = await supabase
      .from('employees')
      .upsert(payload, { onConflict: 'email' })
      .select('*')
      .single()

    if (!error && savedEmp) {
      console.log('✓ Employee active:', savedEmp.first_name, savedEmp.last_name, `(${savedEmp.employee_code})`)

      // Ensure leave balances exist for this employee for current year
      if (allLeaveTypes) {
        const year = new Date().getFullYear()
        for (const lt of allLeaveTypes) {
          await supabase.from('leave_balances').upsert({
            employee_id: savedEmp.id,
            leave_type_id: lt.id,
            year,
            allocated: lt.days_allowed || 12,
            used: 0
          }, { onConflict: 'employee_id,leave_type_id,year' })
        }
      }

      // Link back employee_id to users row
      if (usr?.id) {
        await supabase.from('users').update({ employee_id: savedEmp.id, status: 'active' }).eq('id', usr.id)
      }
    } else {
      console.error('Emp notice:', emp.email, error?.message)
    }
  }

  // Ensure admin and hr users are unblocked and active
  await supabase.from('users').update({ status: 'active' }).in('email', [
    'ceo@oklut.com', 'hr@oklut.com', 'suryahr@oklut.com', 'vinithri@oklut.com',
    'rishi@oklut.com', 'manu@oklut.com', 'jane@oklut.com', 'employee@oklut.com'
  ])

  console.log('\n=== SEED & RESTORATION COMPLETED SUCCESSFULLY ===')
}

seed().catch(console.error)
