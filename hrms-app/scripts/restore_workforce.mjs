import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  console.log('Restoring Departments...')
  const depts = [
    { name: 'Engineering', code: 'ENG' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance', code: 'FIN' },
    { name: 'Marketing', code: 'MKT' },
    { name: 'Sales', code: 'SLS' },
    { name: 'Design', code: 'DES' },
    { name: 'AI/ML', code: 'AI/ML' }
  ]

  for (const d of depts) {
    const { error } = await supabase.from('departments').insert(d)
    if (error && !error.message.includes('duplicate')) console.log('Dept notice:', d.name, error.message)
  }

  const { data: allDepts } = await supabase.from('departments').select('id, name')
  const dMap = {}
  allDepts?.forEach(d => { dMap[d.name] = d.id })
  console.log('Active Departments:', Object.keys(dMap))

  console.log('\nRestoring Employees...')
  const emps = [
    { first_name: 'Vinithri', last_name: 'K', email: 'vinithri@oklut.com', phone: '+919701051234', employee_code: 'OKL-ENG-2026-001', joining_date: '2026-08-24', status: 'Active', department_id: dMap['Engineering'] },
    { first_name: 'Rishi', last_name: 'H', email: 'rishi@oklut.com', phone: '+919701054567', employee_code: 'OKL-AI-2026-002', joining_date: '2026-08-24', status: 'Active', department_id: dMap['AI/ML'] },
    { first_name: 'Manu', last_name: 'G', email: 'manu@oklut.com', phone: '+919701059876', employee_code: 'OKL-FIN-2026-003', joining_date: '2026-08-24', status: 'Active', department_id: dMap['Finance'] },
    { first_name: 'Surya', last_name: 'HR', email: 'suryahr@oklut.com', phone: '+919701058436', employee_code: 'OKL-HR-2026-004', joining_date: '2026-08-25', status: 'Active', department_id: dMap['Human Resources'] },
    { first_name: 'Suryani', last_name: 'Gouda', email: 'goudasuryani@oklut.com', phone: '+919876543210', employee_code: 'OKL-ENG-2026-005', joining_date: '2026-08-13', status: 'Active', department_id: dMap['Engineering'] },
    { first_name: 'Poojitha', last_name: 'R', email: 'poojitha@oklut.com', phone: '+919876500123', employee_code: 'OKL-DES-2026-006', joining_date: '2026-08-14', status: 'Active', department_id: dMap['Design'] }
  ]

  for (const emp of emps) {
    const { data: usr } = await supabase.from('users').select('id').ilike('email', emp.email).maybeSingle()
    const payload = { ...emp, user_id: usr?.id || null }
    const { data: created, error } = await supabase.from('employees').upsert(payload, { onConflict: 'email' }).select().maybeSingle()
    if (error) {
      console.log('Error for', emp.email, error.message)
    } else {
      console.log('✅ Restored:', emp.first_name, emp.last_name, `(${emp.employee_code})`)
    }
  }

  const { data: list } = await supabase.from('employees').select('id, employee_code, first_name, last_name, email, status, department:departments(name)')
  console.log('\n=== CURRENT DIRECTORY IN DB (' + (list?.length || 0) + ' Employees) ===')
  list?.forEach(e => console.log(e.employee_code, '|', (e.first_name + ' ' + e.last_name).padEnd(18), '|', e.email.padEnd(25), '|', e.department?.name || 'General', '|', e.status))
}

run().catch(console.error)
