// Real exam-attempt submission — persists the attempt through Supabase.
// No fabricated scores: the interview row is recorded as 'submitted' and the
// candidate is left in "awaiting evaluation" until the admin publishes results.

import { supabase } from '@/lib/supabase'
import type { Candidate, Interview } from '@/lib/database.types'

export interface ExamSubmitResult {
  candidate: Candidate
  interview: Interview
}

export async function submitExamAttempt(
  candidateId: string,
  jobOpeningId: string | null | undefined
): Promise<ExamSubmitResult> {
  const now = new Date().toISOString()

  const { data: cand, error } = await supabase
    .from('candidates')
    .update({ exam_completed_at: now, status: 'exam_submitted', updated_at: now })
    .eq('id', candidateId)
    .select()
    .single()
  if (error) throw error

  const { data: interview, error: iErr } = await supabase
    .from('interviews')
    .insert({
      candidate_id: candidateId,
      job_opening_id: jobOpeningId ?? null,
      round: 'Online Exam',
      scheduled_at: now,
      mode: 'online',
      status: 'submitted',
      candidate_confirmed: true,
    })
    .select()
    .single()
  if (iErr) throw iErr

  return { candidate: cand as Candidate, interview: interview as Interview }
}