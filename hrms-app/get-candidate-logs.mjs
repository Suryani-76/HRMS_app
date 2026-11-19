import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function retrieveLatestCandidateAndLogs() {
  console.log('========================================================');
  console.log('  RETRIEVING LATEST CANDIDATE & EMAIL LOGS');
  console.log('========================================================\n');

  try {
    const { data: candidates, error: candError } = await supabase
      .from('candidates')
      .select('id, name, email, status, reference_id, created_at, notes')
      .order('created_at', { ascending: false })
      .limit(3);

    if (candError) {
      console.error('Error fetching candidates:', candError.message);
    } else {
      console.log('--- LATEST 3 CANDIDATES IN SUPABASE ---');
      candidates.forEach((c, idx) => {
        console.log(`[${idx + 1}] Name: ${c.name} | Email: ${c.email} | Status: ${c.status} | Ref: ${c.reference_id} | Added At: ${c.created_at}`);
      });
    }

    console.log('\n--- LATEST 10 AUDIT / EMAIL LOGS IN SUPABASE ---');
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select('id, action, entity_type, details, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (logsError) {
      console.error('Error fetching audit logs:', logsError.message);
    } else {
      logs.forEach((log) => {
        const d = log.details || {};
        console.log(`[${log.created_at}] Action: ${log.action} | Entity: ${log.entity_type} | To: ${d.to || 'N/A'} | Subject: ${d.subject || 'N/A'}`);
      });
    }

  } catch (err) {
    console.error('Retrieval error:', err.message);
  }
}

retrieveLatestCandidateAndLogs();

