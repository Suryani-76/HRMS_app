import tls from 'tls';
import fs from 'fs';

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII';
const SMTP_HOST = 'kindle.herosite.pro';
const SMTP_PORT = 465;
const SMTP_USER = 'hr@oklut.com';
const SMTP_PASS = 'Hr@oklut25$';

const logs = [];
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logs.push(line);
}

async function fetchSupabaseLogs() {
  const url = `${SUPABASE_URL}/rest/v1/audit_logs?select=id,action,entity_type,details,created_at&order=created_at.desc&limit=30`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const data = await res.json();
  return data;
}

async function insertPendingLog(scenario, to, subject) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      action: 'EMAIL_PENDING',
      entity_type: 'email_trigger_test',
      details: { scenario, to, subject, triggered_at: new Date().toISOString() }
    })
  });
  const data = await res.json();
  return Array.isArray(data) && data[0] ? data[0].id : null;
}

async function markSent(id, subject, smtpResp, ms) {
  if (!id) return;
  await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'EMAIL_SENT',
      details: { subject, to: SMTP_USER, delivered_at: new Date().toISOString(), elapsed_ms: ms, smtp_response: smtpResp }
    })
  });
}

async function markFailed(id, subject, error) {
  if (!id) return;
  await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'EMAIL_FAILED',
      details: { subject, to: SMTP_USER, failed_at: new Date().toISOString(), last_error: error }
    })
  });
}

function sendEmailSmtp({ subject, html }) {
  return new Promise((resolve, reject) => {
    log(`  [TLS] Connecting to ${SMTP_HOST}:${SMTP_PORT}...`);
    const socket = tls.connect(SMTP_PORT, SMTP_HOST, { rejectUnauthorized: false }, () => {
      log(`  [TLS] TLS Handshake complete. Connected!`);
    });
    socket.setEncoding('utf8');
    let step = 0, buf = '';
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('SMTP timeout after 20s')); }, 20000);

    socket.on('data', chunk => {
      buf += chunk;
      const lines = buf.split('\r\n'); buf = lines.pop() || '';
      for (const line of lines) {
        if (!line) continue;
        log(`  S: ${line}`);
        const code = line.substring(0, 3), cont = line[3] === '-';
        if (code === '220' && step === 0 && !cont) { step=1; socket.write('EHLO localhost\r\n'); log(`  C: EHLO localhost`); }
        else if (code === '250' && step === 1 && !cont) { step=2; socket.write('AUTH LOGIN\r\n'); log(`  C: AUTH LOGIN`); }
        else if (code === '334' && step === 2) { step=3; socket.write(Buffer.from(SMTP_USER).toString('base64')+'\r\n'); log(`  C: <user b64>`); }
        else if (code === '334' && step === 3) { step=4; socket.write(Buffer.from(SMTP_PASS).toString('base64')+'\r\n'); log(`  C: <pass b64>`); }
        else if (code === '235' && step === 4) { step=5; socket.write(`MAIL FROM:<${SMTP_USER}>\r\n`); log(`  C: MAIL FROM:<${SMTP_USER}>`); }
        else if (code === '250' && step === 5) { step=6; socket.write(`RCPT TO:<${SMTP_USER}>\r\n`); log(`  C: RCPT TO:<${SMTP_USER}>`); }
        else if (code === '250' && step === 6) { step=7; socket.write('DATA\r\n'); log(`  C: DATA`); }
        else if (code === '354' && step === 7) {
          step=8;
          const msgId = `<${Date.now()}@oklut.com>`;
          const body = [
            `From: "OKLUT HR" <${SMTP_USER}>`,
            `To: <${SMTP_USER}>`,
            `Subject: ${subject}`,
            `Date: ${new Date().toUTCString()}`,
            `Message-ID: ${msgId}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            '', html, '', '.', ''
          ].join('\r\n');
          socket.write(body);
          log(`  C: [Body sent + CRLF.CRLF]`);
        }
        else if (code === '250' && step === 8) {
          clearTimeout(timer); step=9;
          socket.write('QUIT\r\n'); log(`  C: QUIT`);
          resolve({ success: true, response: line });
        }
        else if (code.startsWith('4') || code.startsWith('5')) {
          clearTimeout(timer); socket.destroy(); reject(new Error(`SMTP error: ${line}`));
        }
      }
    });
    socket.on('error', e => { clearTimeout(timer); reject(e); });
    socket.on('close', () => { clearTimeout(timer); if (step < 8) reject(new Error(`Closed at step ${step}`)); });
  });
}

async function main() {
  log('='.repeat(60));
  log('OKLUT HRMS — SMTP & Supabase Email Trigger Diagnostic Audit');
  log('='.repeat(60));

  // --- STEP 1: Read existing Supabase logs ---
  log('\n[STEP 1] Fetching existing Supabase audit_logs...');
  try {
    const existingLogs = await fetchSupabaseLogs();
    log(`Found ${existingLogs.length} records in audit_logs (most recent 30):`);
    for (const l of existingLogs) {
      const to = l.details?.to || 'N/A';
      const subj = l.details?.subject || 'N/A';
      const err = l.details?.last_error || l.details?.error || 'None';
      log(`  [${l.action}] ${l.entity_type} | To: ${to} | Subj: "${subj.slice(0,60)}" | Error: ${err}`);
    }
  } catch (e) {
    log(`  ERROR fetching logs: ${e.message}`);
  }

  // --- STEP 2: Run all 8 trigger scenarios ---
  log('\n[STEP 2] Running all 8 email trigger scenarios...');
  const results = [];
  const scenarios = [
    { name: 'Scenario 1: Candidate Application & Portal Credentials', subject: 'Application Received - Full Stack Developer (Ref: CAND-8891)', html: '<h2>Application Received</h2><p>Dear Candidate, your application for Full Stack Developer has been received. Your Ref ID: CAND-8891. Login at https://hrm.oklut.com/candidate-portal using your Date of Birth.</p>' },
    { name: 'Scenario 2: Candidate Shortlisted', subject: 'You Are Shortlisted - Full Stack Developer at OKLUT', html: '<h2>Shortlisted!</h2><p>Dear Candidate, congratulations! You have been shortlisted for the Full Stack Developer role. Our team will contact you shortly.</p>' },
    { name: 'Scenario 3: Interview Scheduled (Technical Round 1)', subject: 'Interview Invitation: Technical Round 1 - OKLUT', html: '<h2>Interview Scheduled</h2><p>Dear Candidate, your Technical Round 1 is scheduled for tomorrow at 11:00 AM IST. Meet link: https://meet.google.com/test-okl-hr</p>' },
    { name: 'Scenario 4: Face-to-Face Interview at OKLUT Office', subject: 'Face-to-Face Discussion - OKLUT Headquarters', html: '<h2>In-Person Interview</h2><p>Dear Candidate, please visit OKLUT Corporate Headquarters for a face-to-face interview. Carry original documents.</p>' },
    { name: 'Scenario 5: Pre-Offer Doc Collection Request', subject: 'Action Required: Upload Verification Documents - OKLUT', html: '<h2>Documents Required</h2><p>Dear Candidate, congratulations on completing the rounds! Please upload your softcopies (Aadhaar, Degree, Payslips) to the Candidate Portal for pre-offer verification.</p>' },
    { name: 'Scenario 6: Documents Verified by HR', subject: 'Documents Verified & Approved - OKLUT Recruitment', html: '<h2>Documents Approved</h2><p>Dear Candidate, all your submitted verification documents have been approved by HR. Your offer letter is being prepared.</p>' },
    { name: 'Scenario 7: Formal Offer Letter Released', subject: 'Offer of Employment - OKLUT Human Resources', html: '<h2>Job Offer Extended</h2><p>Dear Candidate, we are pleased to offer you the position of Full Stack Developer at OKLUT. Please review and accept your offer in the portal.</p>' },
    { name: 'Scenario 8: Internal Job Broadcast to Employees', subject: 'New Opening: Senior Backend Engineer (JOB-BE-2026)', html: '<h2>Internal Job Opening</h2><p>Team OKLUT, a new position is now open for Senior Backend Engineer. Refer eligible candidates using code REF-OKL-2026.</p>' },
  ];

  for (const sc of scenarios) {
    log(`\n>>> ${sc.name}`);
    const t0 = Date.now();
    const logId = await insertPendingLog(sc.name, SMTP_USER, sc.subject).catch(() => null);
    log(`  [Supabase] Created EMAIL_PENDING record (ID: ${logId || 'N/A'})`);
    try {
      const r = await sendEmailSmtp({ subject: `[HRMS TEST] ${sc.subject}`, html: sc.html });
      const ms = Date.now() - t0;
      await markSent(logId, sc.subject, r.response, ms);
      log(`  ✅ DELIVERED in ${ms}ms. Supabase updated -> EMAIL_SENT`);
      results.push({ scenario: sc.name, status: 'SUCCESS', ms });
    } catch (e) {
      const ms = Date.now() - t0;
      await markFailed(logId, sc.subject, e.message);
      log(`  ❌ FAILED: ${e.message}. Supabase updated -> EMAIL_FAILED`);
      results.push({ scenario: sc.name, status: 'FAILED', error: e.message, ms });
    }
  }

  // --- STEP 3: Post-run Supabase log verification ---
  log('\n[STEP 3] Verifying Supabase audit_logs after trigger runs...');
  try {
    const finalLogs = await fetchSupabaseLogs();
    log(`Current audit_logs (most recent 20):`);
    for (const l of finalLogs.slice(0, 20)) {
      const to = l.details?.to || 'N/A';
      const subj = l.details?.subject || 'N/A';
      const err = l.details?.last_error || 'None';
      log(`  [${l.action}] ${l.entity_type} | To: ${to} | Subj: "${subj.slice(0,55)}" | Err: ${err}`);
    }
  } catch (e) {
    log(`  ERROR: ${e.message}`);
  }

  // --- SUMMARY ---
  log('\n' + '='.repeat(60));
  log('SUMMARY:');
  const ok = results.filter(r => r.status === 'SUCCESS');
  const fail = results.filter(r => r.status === 'FAILED');
  log(`  Total Scenarios: ${results.length}`);
  log(`  ✅ Successful SMTP Deliveries: ${ok.length}`);
  log(`  ❌ Failed SMTP Deliveries: ${fail.length}`);
  for (const r of results) {
    log(`  [${r.status}] ${r.scenario}${r.error ? ' — Error: ' + r.error : ' — ' + r.ms + 'ms'}`);
  }
  log('='.repeat(60));

  // Write full log to file
  const outPath = './scripts/smtp-audit-test.log';
  fs.writeFileSync(outPath, logs.join('\n'));
  console.log(`\nFull log saved to ${outPath}`);
}

main().catch(e => { console.error('Fatal:', e); });
