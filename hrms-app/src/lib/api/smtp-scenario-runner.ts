import { createClient } from '@supabase/supabase-js'
import {
  sendCandidateApplicationEmail,
  sendCandidateStatusAlertEmail,
  sendInterviewScheduledAlertEmail,
  sendInterviewRescheduledAlertEmail,
  sendDocsRequiredAlertEmail,
  sendDocsApprovedAlertEmail,
  sendOfferLetterReleasedAlertEmail,
  broadcastJobOpeningToEmployees,
} from '@/lib/api/email'

export interface ScenarioResult {
  scenario: string
  success: boolean
  message: string
  timestamp: string
}

export async function runAllEmailScenariosInBrowser(): Promise<{
  supabaseLogsBefore: any[]
  results: ScenarioResult[]
  supabaseLogsAfter: any[]
}> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qwygpcovmlobcmwcptvz.supabase.co'
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'
  const supabase = createClient(supabaseUrl, supabaseKey)

  // 1. Fetch Supabase audit logs before test
  const { data: logsBefore } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  const results: ScenarioResult[] = []
  const testCandidateEmail = 'hr@oklut.com'

  // Helper
  const record = (scenario: string, res: { success: boolean; message: string }) => {
    results.push({
      scenario,
      success: res.success,
      message: res.message,
      timestamp: new Date().toISOString(),
    })
  }

  // Scenario 1: Candidate Application Received & Credentials
  try {
    const res = await sendCandidateApplicationEmail({
      candidateName: 'Test Candidate',
      candidateEmail: testCandidateEmail,
      jobTitle: 'Senior Full Stack Engineer',
      referenceId: 'CAND-TEST-8891',
      dateOfBirth: '1998-05-15',
    })
    record('Scenario 1: Candidate Application & Portal Credentials', res)
  } catch (e: any) {
    record('Scenario 1: Candidate Application & Portal Credentials', { success: false, message: e.message })
  }

  // Scenario 2: Candidate Status Update (Shortlisted)
  try {
    const res = await sendCandidateStatusAlertEmail({
      candidateName: 'Test Candidate',
      candidateEmail: testCandidateEmail,
      jobTitle: 'Senior Full Stack Engineer',
      referenceId: 'CAND-TEST-8891',
      status: 'Shortlisted',
    })
    record('Scenario 2: Recruitment Update - Candidate Shortlisted', res)
  } catch (e: any) {
    record('Scenario 2: Recruitment Update - Candidate Shortlisted', { success: false, message: e.message })
  }

  // Scenario 3: Interview Scheduled (Virtual)
  try {
    const res = await sendInterviewScheduledAlertEmail({
      candidateName: 'Test Candidate',
      candidateEmail: testCandidateEmail,
      jobTitle: 'Senior Full Stack Engineer',
      roundName: 'Technical Round 1',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      meetingLink: 'https://meet.google.com/test-room',
      interviewerName: 'Lead Architect',
    })
    record('Scenario 3: Virtual Interview Scheduled', res)
  } catch (e: any) {
    record('Scenario 3: Virtual Interview Scheduled', { success: false, message: e.message })
  }

  // Scenario 4: Interview Rescheduled
  try {
    const res = await sendInterviewRescheduledAlertEmail({
      candidateName: 'Test Candidate',
      candidateEmail: testCandidateEmail,
      jobTitle: 'Senior Full Stack Engineer',
      roundName: 'Technical Round 1 (Rescheduled)',
      scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      meetingLink: 'https://meet.google.com/test-room-2',
      rescheduleReason: 'Panel availability updated',
    })
    record('Scenario 4: Interview Rescheduled Alert', res)
  } catch (e: any) {
    record('Scenario 4: Interview Rescheduled Alert', { success: false, message: e.message })
  }

  // Scenario 5: Document Collection Request (Pre-Offer)
  try {
    const res = await sendDocsRequiredAlertEmail({
      candidateName: 'Test Candidate',
      candidateEmail: testCandidateEmail,
      referenceId: 'CAND-TEST-8891',
      jobTitle: 'Senior Full Stack Engineer',
    })
    record('Scenario 5: Pre-Offer Document Collection Request', res)
  } catch (e: any) {
    record('Scenario 5: Pre-Offer Document Collection Request', { success: false, message: e.message })
  }

  // Scenario 6: Documents Verified by HR
  try {
    const res = await sendDocsApprovedAlertEmail({
      candidateName: 'Test Candidate',
      candidateEmail: testCandidateEmail,
      referenceId: 'CAND-TEST-8891',
      jobTitle: 'Senior Full Stack Engineer',
    })
    record('Scenario 6: Documents Verified and Approved by HR', res)
  } catch (e: any) {
    record('Scenario 6: Documents Verified and Approved by HR', { success: false, message: e.message })
  }

  // Scenario 7: Offer Letter Released
  try {
    const res = await sendOfferLetterReleasedAlertEmail({
      candidateName: 'Test Candidate',
      candidateEmail: testCandidateEmail,
      referenceId: 'CAND-TEST-8891',
      jobTitle: 'Senior Full Stack Engineer',
    })
    record('Scenario 7: Formal Offer of Employment Released', res)
  } catch (e: any) {
    record('Scenario 7: Formal Offer of Employment Released', { success: false, message: e.message })
  }

  // Scenario 8: Job Opening Internal Broadcast
  try {
    const res = await broadcastJobOpeningToEmployees({
      id: 'job-test-broadcast',
      title: 'Senior Full Stack Engineer',
      department_id: '',
      employment_type: 'Full-time',
      location: 'Hyderabad',
      openings_count: 2,
    })
    record('Scenario 8: Internal Job Opening Broadcast', {
      success: res.success,
      message: `${res.message} (Job Code: ${res.jobCode}, Referral Code: ${res.referralCode})`,
    })
  } catch (e: any) {
    record('Scenario 8: Internal Job Opening Broadcast', { success: false, message: e.message })
  }

  // 2. Fetch Supabase audit logs after test
  const { data: logsAfter } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return {
    supabaseLogsBefore: logsBefore || [],
    results,
    supabaseLogsAfter: logsAfter || [],
  }
}

