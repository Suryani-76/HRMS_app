import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  const employeeId = '97c461a8-cf2b-44a3-b2ce-29433504e910' // Mark1
  const leaveTypeId = '00000000-0000-4000-8000-0000000000f2' // Sick Leave
  const year = 2026

  // 1. Get initial balance
  const { data: initialBal } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', year)
    .single()
  console.log('Initial used days:', initialBal.used)

  // 2. Apply for a 1-day leave (pending)
  const { data: newReq, error: reqErr } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      start_date: '2026-11-10',
      end_date: '2026-11-10',
      days: 1,
      reason: '1-day test deduction verification',
      status: 'pending',
    })
    .select()
    .single()
  console.log('Applied 1-day pending request:', newReq.id, 'Error:', reqErr)

  // 3. Approve the request (as reviewLeave does)
  const { data: approvedReq, error: appErr } = await supabase
    .from('leave_requests')
    .update({
      status: 'approved',
      admin_comment: 'Approved by HR',
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', newReq.id)
    .select()
    .single()
  console.log('Approved request:', approvedReq.id, 'Status:', approvedReq.status, 'Error:', appErr)

  // 4. Verify the balance after approval
  const { data: finalBal } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('id', initialBal.id)
    .single()
  console.log('Final used days after 1-day approval:', finalBal.used)
  const diff = finalBal.used - initialBal.used
  console.log(`Difference in used days: ${diff} day(s) (Expected: 1)`)

  if (diff === 1) {
    console.log('✅ TEST PASSED: Exactly 1 day was deducted for 1 day leave!')
  } else {
    console.error(`❌ TEST FAILED: ${diff} days were deducted instead of 1!`)
  }

  // 5. Clean up test request & restore balance
  await supabase.from('leave_requests').delete().eq('id', newReq.id)
  await supabase.from('leave_balances').update({ used: initialBal.used }).eq('id', initialBal.id)
  console.log('Cleaned up test request and restored balance.')
}

test().catch(console.error)
