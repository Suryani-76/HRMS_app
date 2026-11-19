import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectCandidate() {
  const code = 'CAND-J3BQZX';
  console.log(`Searching for candidate code: ${code}...\n`);

  const { data: cand, error: candErr } = await supabase
    .from('candidates')
    .select('*, job_opening:job_openings(title)')
    .or(`reference_id.eq.${code},temp_id.eq.${code}`)
    .maybeSingle();

  if (candErr) {
    console.error('Error fetching candidate:', candErr.message);
    return;
  }

  if (!cand) {
    console.log(`No candidate found matching reference_id or temp_id = "${code}".`);
    return;
  }

  console.log('Candidate Details:');
  console.log('------------------');
  console.log(`ID:           ${cand.id}`);
  console.log(`Name:         ${cand.name}`);
  console.log(`Email:        ${cand.email}`);
  console.log(`Status:       ${cand.status}`);
  console.log(`Role:         ${cand.job_opening?.title || 'N/A'}`);
  console.log(`DOB:          ${cand.date_of_birth || cand.dob || 'N/A'}`);
  console.log(`Notes:        ${cand.notes || 'None'}`);
  console.log(`Created At:   ${cand.created_at}`);

  console.log('\nAudit Logs for this candidate:');
  console.log('------------------------------');
  const { data: logs, error: logsErr } = await supabase
    .from('audit_logs')
    .select('*')
    .or(`details->>to.eq.${cand.email},details->>refId.eq.${code}`)
    .order('created_at', { ascending: false });

  if (logsErr) {
    console.error('Error fetching logs:', logsErr.message);
  } else if (!logs || logs.length === 0) {
    console.log('No specific audit logs found for this candidate email / refId.');
  } else {
    logs.forEach(l => {
      console.log(`[${l.created_at}] Action: ${l.action} | To: ${l.details?.to} | Subject: ${l.details?.subject} | Status: ${l.details?.channel || 'sent'}`);
    });
  }

  console.log('\n--- Triggering Test Resend of Document Collection Email ---');
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to: cand.email,
        subject: `📄 Action Required: Upload Verification Documents for ${cand.job_opening?.title || 'Open Position'} — OKLUT`,
        html: `<h2>Pre-Offer Document Collection</h2><p>Dear ${cand.name},</p><p>Please upload your verification documents to the candidate portal (Reference ID: <b>${code}</b>).</p>`,
        fromName: 'OKLUT Human Resources'
      })
    });
    const result = await res.json();
    console.log('Direct Edge Function Send Result:', result);
  } catch (sendErr) {
    console.error('Send error:', sendErr.message);
  }
}

inspectCandidate();

