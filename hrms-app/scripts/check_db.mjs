import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  console.log('Testing HR approve reschedule in Supabase...')
  const { data: interviews, error: iErr } = await supabase
    .from('interviews')
    .select('*, candidate:candidates(*)')
    .order('created_at', { ascending: false })
    .limit(1)

  if (interviews && interviews.length > 0) {
    const testId = interviews[0].id
    console.log('Target interview ID:', testId, 'Candidate:', interviews[0].candidate?.name)
    
    // Simulate HR clicking Approve & Update Schedule
    const newScheduledAt = '2026-08-31T10:00:00.000Z'
    const newMeetingLink = 'https://meet.google.com/rkj-hmku-awh'
    const adminNote = 'Reschedule confirmed by HR.'

    const updateFields = {
      scheduled_at: newScheduledAt,
      meeting_link: newMeetingLink,
      status: 'scheduled',
      reschedule_requested: false,
      reschedule_status: 'accepted',
      feedback: `[HR Note: ${adminNote}]`,
    }

    const { data: updated, error: uErr } = await supabase
      .from('interviews')
      .update(updateFields)
      .eq('id', testId)
      .select('*, candidate:candidates(*)')
      .single()

    if (uErr) {
      console.error('Update FAILED with error:', uErr)
    } else {
      console.log('✅ Interview Update SUCCESS! Saved in DB:', {
        id: updated.id,
        scheduled_at: updated.scheduled_at,
        meeting_link: updated.meeting_link,
        status: updated.status,
        reschedule_requested: updated.reschedule_requested,
        reschedule_status: updated.reschedule_status,
        feedback: updated.feedback,
      })

      // Sync candidate record notes
      if (updated.candidate_id) {
        const { data: candRow } = await supabase.from('candidates').select('notes').eq('id', updated.candidate_id).single()
        const noteEntry = `[HR Approved Reschedule: ${updated.round} to ${newScheduledAt}]`
        const updatedNotes = candRow?.notes ? `${candRow.notes}\n${noteEntry}` : noteEntry

        const { error: cErr } = await supabase
          .from('candidates')
          .update({
            notes: updatedNotes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updated.candidate_id)
        console.log('Candidate sync error:', cErr ? cErr.message : 'NONE (Success)')
      }
    }
  }
}

test().catch(console.error)
