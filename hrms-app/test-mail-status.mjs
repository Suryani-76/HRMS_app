// Check recent Supabase audit logs and test Edge Function
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStatus() {
  console.log('--- 1. Testing Supabase send-email Edge Function Directly ---');
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        to: 'hr@oklut.com',
        subject: 'API Diagnostic Verification Check',
        html: '<p>Testing send-email edge function</p>',
        fromName: 'OKLUT Test'
      })
    });

    console.log('Edge Function HTTP Status:', res.status, res.statusText);
    const json = await res.json();
    console.log('Edge Function Response:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Edge Function Fetch Error:', e.message);
  }

  console.log('\n--- 2. Fetching Recent audit_logs from Supabase DB ---');
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, action, entity_type, details, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Audit logs query error:', error.message);
    } else {
      console.log(`Found ${data.length} recent audit logs:`);
      data.forEach(log => {
        console.log(`[${log.created_at}] Action: ${log.action} | Entity: ${log.entity_type} | Details: ${JSON.stringify(log.details)}`);
      });
    }
  } catch (e) {
    console.error('Audit logs exception:', e.message);
  }
}

checkStatus();

