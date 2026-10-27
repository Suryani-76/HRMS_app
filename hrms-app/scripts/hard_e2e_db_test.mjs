import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

const results = []

function logPass(suite, msg, extra = '') {
  const line = `  [PASS] ${msg}${extra ? ` -> ${extra}` : ''}`
  console.log(`\x1b[32m${line}\x1b[0m`)
  results.push({ suite, msg, status: 'PASS', extra })
}

function logFail(suite, msg, error) {
  const line = `  [FAIL] ${msg} -> ${error?.message || error}`
  console.error(`\x1b[31m${line}\x1b[0m`)
  results.push({ suite, msg, status: 'FAIL', error: error?.message || String(error) })
}

function printSection(title) {
  console.log(`\n\x1b[36m=== ${title} ===\x1b[0m`)
}

async function runHardTests() {
  console.log(`\x1b[35mStarting Comprehensive End-to-End Live Database Reflection Tests...\x1b[0m`)
  console.log(`Target Supabase: ${SUPABASE_URL}`)
  console.log(`Timestamp: ${new Date().toISOString()}\n`)

  let adminAuthClient = supabase
  let testEmployee = null
  let testDepartment = null

  // -------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & LOGIN REFLECTION
  // -------------------------------------------------------------
  printSection('SUITE 1: Auth & User Profile Reflection')
  try {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'ceo@oklut.com',
      password: '1234',
    })
    if (authErr) throw authErr
    logPass('Auth', 'Admin login successful', `User ID: ${authData.user.id}`)

    // Create client with authenticated session
    adminAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${authData.session.access_token}`,
        },
      },
    })

    // Verify user profile directly in DB
    const { data: dbUser, error: userErr } = await adminAuthClient
      .from('users')
      .select('*, role:roles(*), employee:employees(*)')
      .eq('email', 'ceo@oklut.com')
      .single()

    if (userErr) throw userErr
    if (!dbUser) throw new Error('User not found in DB users table')
    logPass('Auth', 'User profile exists in DB users table', `Role: ${dbUser.role?.name || 'Admin'}`)
  } catch (err) {
    logFail('Auth', 'Admin authentication / profile check', err)
  }

  // -------------------------------------------------------------
  // SUITE 2: DEPARTMENTS & DESIGNATIONS
  // -------------------------------------------------------------
  printSection('SUITE 2: Departments & Designations')
  try {
    const { data: depts, error: deptErr } = await adminAuthClient
      .from('departments')
      .select('*')
      .order('name')
    if (deptErr) throw deptErr
    logPass('Departments', `Queried departments from DB`, `Count: ${depts.length}`)
    testDepartment = depts[0]

    const { data: desigs, error: desigErr } = await adminAuthClient
      .from('designations')
      .select('*, department:departments(*)')
    if (desigErr) throw desigErr
    logPass('Designations', `Queried designations from DB`, `Count: ${desigs.length}`)

    // INSERT test designation
    const testDesigName = `TestDesig_${Date.now()}`
    const { data: newDesig, error: insDesigErr } = await adminAuthClient
      .from('designations')
      .insert({
        name: testDesigName,
        department_id: testDepartment?.id,
        level: 99,
      })
      .select()
      .single()
    if (insDesigErr) throw insDesigErr

    // READ back to verify DB reflection
    const { data: checkDesig, error: chkErr } = await adminAuthClient
      .from('designations')
      .select('*')
      .eq('id', newDesig.id)
      .single()
    if (chkErr || checkDesig.name !== testDesigName) {
      throw new Error('Designation not reflected in DB after INSERT')
    }
    logPass('Designations', 'INSERT reflected in DB', `ID: ${newDesig.id}`)

    // UPDATE test designation
    const updatedName = `${testDesigName}_Updated`
    const { error: updDesigErr } = await adminAuthClient
      .from('designations')
      .update({ name: updatedName, level: 100 })
      .eq('id', newDesig.id)
    if (updDesigErr) throw updDesigErr

    const { data: checkUpd } = await adminAuthClient
      .from('designations')
      .select('*')
      .eq('id', newDesig.id)
      .single()
    if (checkUpd?.name !== updatedName || checkUpd?.level !== 100) {
      throw new Error('Designation UPDATE not reflected in DB')
    }
    logPass('Designations', 'UPDATE reflected in DB', `New name: ${checkUpd.name}`)

    // DELETE and verify cleanup
    const { error: delErr } = await adminAuthClient
      .from('designations')
      .delete()
      .eq('id', newDesig.id)
    if (delErr) throw delErr

    const { data: checkDel } = await adminAuthClient
      .from('designations')
      .select('*')
      .eq('id', newDesig.id)
      .maybeSingle()
    if (checkDel) throw new Error('Designation still exists after DELETE')
    logPass('Designations', 'DELETE confirmed; cleaned up successfully')
  } catch (err) {
    logFail('Departments/Designations', 'CRUD reflection check', err)
  }

  // -------------------------------------------------------------
  // SUITE 3: EMPLOYEES DIRECTORY & RELATIONS
  // -------------------------------------------------------------
  printSection('SUITE 3: Employees Master Table')
  try {
    const { data: emps, error: empErr } = await adminAuthClient
      .from('employees')
      .select('id, employee_code, first_name, last_name, email, department_id, designation_id, department:departments(*), designation:designations(*)')
      .order('created_at', { ascending: true })
    if (empErr) throw empErr
    if (!emps || emps.length === 0) throw new Error('No employees returned')

    testEmployee = emps.find((e) => e.email === 'c.poosa@oklut.com') || emps[0]
    logPass('Employees', `Fetched active employees with foreign relations`, `Total: ${emps.length}`)
    logPass('Employees', `Verified test subject employee`, `${testEmployee.first_name} ${testEmployee.last_name} (${testEmployee.employee_code})`)
  } catch (err) {
    logFail('Employees', 'Query employees check', err)
  }

  // -------------------------------------------------------------
  // SUITE 4: ATTENDANCE SYSTEM (Check-In -> Update Sessions -> Punch Out -> Delete)
  // -------------------------------------------------------------
  printSection('SUITE 4: Attendance System')
  try {
    if (!testEmployee) throw new Error('No test employee available')

    const testDate = '2099-12-31' // Far future date to guarantee isolation
    const checkInTime = '09:00:00'

    // 1. Check-In (INSERT)
    const { data: attRecord, error: attErr } = await adminAuthClient
      .from('attendance')
      .insert({
        employee_id: testEmployee.id,
        date: testDate,
        check_in: checkInTime,
        status: 'present',
        notes: '[HardTest-E2E]',
        working_hours: 0,
        overtime_hours: 0,
      })
      .select()
      .single()
    if (attErr) throw attErr

    // 2. Query back to verify insertion reflection
    const { data: readAtt1, error: rAttErr1 } = await adminAuthClient
      .from('attendance')
      .select('*')
      .eq('id', attRecord.id)
      .single()
    if (rAttErr1 || readAtt1.status !== 'present' || readAtt1.check_in !== checkInTime) {
      throw new Error('Attendance check-in not accurately reflected in DB')
    }
    logPass('Attendance', 'Punch In reflected in DB', `ID: ${attRecord.id}, Status: ${readAtt1.status}`)

    // 3. Update Punch-Out and Working Hours (UPDATE)
    const checkOutTime = '17:30:00'
    const workingHours = 8.5
    const { error: updAttErr } = await adminAuthClient
      .from('attendance')
      .update({
        check_out: checkOutTime,
        working_hours: workingHours,
        notes: '[HardTest-E2E] Completed session',
      })
      .eq('id', attRecord.id)
    if (updAttErr) throw updAttErr

    // 4. Query back to verify update reflection
    const { data: readAtt2 } = await adminAuthClient
      .from('attendance')
      .select('*')
      .eq('id', attRecord.id)
      .single()
    if (readAtt2.check_out !== checkOutTime || readAtt2.working_hours !== workingHours) {
      throw new Error('Attendance punch-out/hours not reflected in DB')
    }
    logPass('Attendance', 'Punch Out & Hours reflected in DB', `Check-out: ${readAtt2.check_out}, Hours: ${readAtt2.working_hours}`)

    // 5. Delete and clean up
    await adminAuthClient.from('attendance').delete().eq('id', attRecord.id)
    const { data: readAtt3 } = await adminAuthClient
      .from('attendance')
      .select('*')
      .eq('id', attRecord.id)
      .maybeSingle()
    if (readAtt3) throw new Error('Attendance record still exists after cleanup')
    logPass('Attendance', 'Attendance test record cleaned up successfully')
  } catch (err) {
    logFail('Attendance', 'Attendance reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 5: LEAVE MANAGEMENT (Apply -> Approve -> Verify -> Delete)
  // -------------------------------------------------------------
  printSection('SUITE 5: Leave Management')
  try {
    if (!testEmployee) throw new Error('No test employee available')

    const { data: leaveTypes, error: ltErr } = await adminAuthClient
      .from('leave_types')
      .select('*')
    if (ltErr) throw ltErr
    logPass('Leave', 'Fetched leave types from DB', `Types: ${leaveTypes.length}`)
    const lt = leaveTypes[0]

    // 1. Insert pending leave request
    const { data: newLeave, error: nlErr } = await adminAuthClient
      .from('leave_requests')
      .insert({
        employee_id: testEmployee.id,
        leave_type_id: lt.id,
        start_date: '2099-11-01',
        end_date: '2099-11-02',
        days: 2,
        reason: 'E2E Live DB Reflection Test',
        status: 'pending',
      })
      .select()
      .single()
    if (nlErr) throw nlErr

    // 2. Verify reflection in DB
    const { data: readLeave1 } = await adminAuthClient
      .from('leave_requests')
      .select('*')
      .eq('id', newLeave.id)
      .single()
    if (!readLeave1 || readLeave1.status !== 'pending' || readLeave1.days !== 2) {
      throw new Error('Leave application not reflected in DB')
    }
    logPass('Leave', 'Leave Request INSERT reflected in DB', `Status: ${readLeave1.status}, Days: ${readLeave1.days}`)

    // 3. Approve leave request
    const adminComment = 'Approved by HR HardTest System'
    const { error: appErr } = await adminAuthClient
      .from('leave_requests')
      .update({
        status: 'approved',
        admin_comment: adminComment,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', newLeave.id)
    if (appErr) throw appErr

    // 4. Verify approval reflection in DB
    const { data: readLeave2 } = await adminAuthClient
      .from('leave_requests')
      .select('*')
      .eq('id', newLeave.id)
      .single()
    if (readLeave2.status !== 'approved' || readLeave2.admin_comment !== adminComment) {
      throw new Error('Leave approval state not reflected in DB')
    }
    logPass('Leave', 'Leave Approval UPDATE reflected in DB', `Status: ${readLeave2.status}`)

    // 5. Clean up
    await adminAuthClient.from('leave_requests').delete().eq('id', newLeave.id)
    const { data: readLeave3 } = await adminAuthClient
      .from('leave_requests')
      .select('*')
      .eq('id', newLeave.id)
      .maybeSingle()
    if (readLeave3) throw new Error('Leave record still exists after cleanup')
    logPass('Leave', 'Leave test record cleaned up successfully')
  } catch (err) {
    logFail('Leave', 'Leave reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 6: TASKS & KANBAN
  // -------------------------------------------------------------
  printSection('SUITE 6: Tasks Management')
  try {
    if (!testEmployee) throw new Error('No test employee available')

    const taskTitle = `E2E Hard Test Task - ${Date.now()}`
    const { data: newTask, error: tErr } = await adminAuthClient
      .from('tasks')
      .insert({
        title: taskTitle,
        description: 'Testing task persistence in database',
        assignee_id: testEmployee.id,
        priority: 'high',
        status: 'todo',
        due_date: '2099-12-31',
      })
      .select()
      .single()
    if (tErr) throw tErr

    const { data: readTask1 } = await adminAuthClient
      .from('tasks')
      .select('*')
      .eq('id', newTask.id)
      .single()
    if (!readTask1 || readTask1.title !== taskTitle) {
      throw new Error('Task not reflected in DB')
    }
    logPass('Tasks', 'Task INSERT reflected in DB', `Title: ${readTask1.title}, Status: ${readTask1.status}`)

    // Update status to 'completed'
    await adminAuthClient
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', newTask.id)

    const { data: readTask2 } = await adminAuthClient
      .from('tasks')
      .select('*')
      .eq('id', newTask.id)
      .single()
    if (readTask2.status !== 'completed') {
      throw new Error('Task status update not reflected in DB')
    }
    logPass('Tasks', 'Task status UPDATE reflected in DB', `Status: ${readTask2.status}`)

    // Clean up
    await adminAuthClient.from('tasks').delete().eq('id', newTask.id)
    const { data: readTask3 } = await adminAuthClient
      .from('tasks')
      .select('*')
      .eq('id', newTask.id)
      .maybeSingle()
    if (readTask3) throw new Error('Task still exists after delete')
    logPass('Tasks', 'Task cleaned up successfully')
  } catch (err) {
    logFail('Tasks', 'Task reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 7: PROJECTS MANAGEMENT
  // -------------------------------------------------------------
  printSection('SUITE 7: Projects Management')
  try {
    const projectCode = `PRJ-E2E-${Date.now().toString().slice(-4)}`
    const projectName = 'E2E Reflection Engine Project'

    const { data: newProj, error: pErr } = await adminAuthClient
      .from('projects')
      .insert({
        project_code: projectCode,
        project_name: projectName,
        priority: 'High',
        status: 'Planning',
        progress_percentage: 20,
        start_date: '2026-10-01',
        expected_end_date: '2027-04-01',
      })
      .select()
      .single()
    if (pErr) throw pErr

    const { data: readProj1 } = await adminAuthClient
      .from('projects')
      .select('*')
      .eq('id', newProj.id)
      .single()
    if (!readProj1 || readProj1.project_code !== projectCode) {
      throw new Error('Project not reflected in DB')
    }
    logPass('Projects', 'Project INSERT reflected in DB', `Code: ${readProj1.project_code}, Progress: ${readProj1.progress_percentage}%`)

    // Update progress
    await adminAuthClient
      .from('projects')
      .update({ progress_percentage: 75, status: 'In Progress' })
      .eq('id', newProj.id)

    const { data: readProj2 } = await adminAuthClient
      .from('projects')
      .select('*')
      .eq('id', newProj.id)
      .single()
    if (readProj2.progress_percentage !== 75 || readProj2.status !== 'In Progress') {
      throw new Error('Project update not reflected in DB')
    }
    logPass('Projects', 'Project progress & status UPDATE reflected in DB', `New Status: ${readProj2.status}, Progress: ${readProj2.progress_percentage}%`)

    // Clean up
    await adminAuthClient.from('projects').delete().eq('id', newProj.id)
    const { data: readProj3 } = await adminAuthClient
      .from('projects')
      .select('*')
      .eq('id', newProj.id)
      .maybeSingle()
    if (readProj3) throw new Error('Project still exists after delete')
    logPass('Projects', 'Project cleaned up successfully')
  } catch (err) {
    logFail('Projects', 'Projects reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 8: ASSETS & INVENTORY
  // -------------------------------------------------------------
  printSection('SUITE 8: Assets Management')
  try {
    const serial = `SN-E2E-${Date.now()}`
    const barcode = `BAR-${Date.now().toString().slice(-6)}`

    const { data: newAsset, error: aErr } = await adminAuthClient
      .from('assets')
      .insert({
        type: 'Laptop',
        serial_number: serial,
        barcode_code: barcode,
        status: 'Available',
      })
      .select()
      .single()
    if (aErr) throw aErr

    const { data: readAsset1 } = await adminAuthClient
      .from('assets')
      .select('*')
      .eq('id', newAsset.id)
      .single()
    if (!readAsset1 || readAsset1.serial_number !== serial) {
      throw new Error('Asset not reflected in DB')
    }
    logPass('Assets', 'Asset INSERT reflected in DB', `Barcode: ${readAsset1.barcode_code}, Status: ${readAsset1.status}`)

    // Update seating & assign
    await adminAuthClient
      .from('assets')
      .update({ status: 'Assigned', seating_number: 'DESK-A1-04' })
      .eq('id', newAsset.id)

    const { data: readAsset2 } = await adminAuthClient
      .from('assets')
      .select('*')
      .eq('id', newAsset.id)
      .single()
    if (readAsset2.seating_number !== 'DESK-A1-04' || readAsset2.status !== 'Assigned') {
      throw new Error('Asset assignment not reflected in DB')
    }
    logPass('Assets', 'Asset assignment UPDATE reflected in DB', `Seating: ${readAsset2.seating_number}`)

    // Clean up
    await adminAuthClient.from('assets').delete().eq('id', newAsset.id)
    const { data: readAsset3 } = await adminAuthClient
      .from('assets')
      .select('*')
      .eq('id', newAsset.id)
      .maybeSingle()
    if (readAsset3) throw new Error('Asset still exists after delete')
    logPass('Assets', 'Asset cleaned up successfully')
  } catch (err) {
    logFail('Assets', 'Assets reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 9: PARKING PASSES
  // -------------------------------------------------------------
  printSection('SUITE 9: Parking Passes')
  try {
    const vehicleNum = `TS-E2E-${Date.now().toString().slice(-4)}`
    const { data: newPass, error: pkErr } = await adminAuthClient
      .from('parking_passes')
      .insert({
        employee_id: testEmployee?.id || '00000000-0000-0000-0000-000000000000',
        employee_code: testEmployee?.employee_code || 'OKIN260009',
        employee_name: testEmployee ? `${testEmployee.first_name} ${testEmployee.last_name}` : 'Test Emp',
        employee_email: testEmployee?.email || 'test@oklut.com',
        vehicle_type: '4-Wheeler',
        vehicle_number: vehicleNum,
        vehicle_model: 'Hyundai Creta',
        status: 'Pending',
        is_checked_in: false,
      })
      .select()
      .single()
    if (pkErr) throw pkErr

    const { data: readPass1 } = await adminAuthClient
      .from('parking_passes')
      .select('*')
      .eq('id', newPass.id)
      .single()
    if (!readPass1 || readPass1.vehicle_number !== vehicleNum) {
      throw new Error('Parking pass not reflected in DB')
    }
    logPass('Parking', 'Parking Pass INSERT reflected in DB', `Vehicle: ${readPass1.vehicle_number}, Status: ${readPass1.status}`)

    // Update status to Approved with allocated slot
    await adminAuthClient
      .from('parking_passes')
      .update({
        status: 'Approved',
        allocated_slot: 'SLOT-42',
        allocated_sector: 'Sector C',
        approved_at: new Date().toISOString(),
      })
      .eq('id', newPass.id)

    const { data: readPass2 } = await adminAuthClient
      .from('parking_passes')
      .select('*')
      .eq('id', newPass.id)
      .single()
    if (readPass2.status !== 'Approved' || readPass2.allocated_slot !== 'SLOT-42') {
      throw new Error('Parking pass approval not reflected in DB')
    }
    logPass('Parking', 'Parking Pass approval UPDATE reflected in DB', `Slot: ${readPass2.allocated_slot}, Sector: ${readPass2.allocated_sector}`)

    // Clean up
    await adminAuthClient.from('parking_passes').delete().eq('id', newPass.id)
    const { data: readPass3 } = await adminAuthClient
      .from('parking_passes')
      .select('*')
      .eq('id', newPass.id)
      .maybeSingle()
    if (readPass3) throw new Error('Parking pass still exists after delete')
    logPass('Parking', 'Parking pass cleaned up successfully')
  } catch (err) {
    logFail('Parking', 'Parking reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 10: COMPLAINTS / GRIEVANCE REDRESSAL
  // -------------------------------------------------------------
  printSection('SUITE 10: Complaints / Grievance Redressal')
  try {
    const ticketNo = `CMP-E2E-${Date.now().toString().slice(-4)}`
    const { data: newCmp, error: cmpErr } = await adminAuthClient
      .from('complaints')
      .insert({
        ticket_number: ticketNo,
        employee_id: testEmployee?.id,
        employee_name: testEmployee ? `${testEmployee.first_name} ${testEmployee.last_name}` : 'Test Emp',
        employee_code: testEmployee?.employee_code,
        employee_email: testEmployee?.email,
        department: 'Engineering',
        is_anonymous: false,
        category: 'IT Hardware & Equipment Failure',
        description: 'Hard test complaint verification in live PostgreSQL database.',
        word_count: 9,
        priority: 'high',
        status: 'pending',
      })
      .select()
      .single()
    if (cmpErr) throw cmpErr

    const { data: readCmp1 } = await adminAuthClient
      .from('complaints')
      .select('*')
      .eq('id', newCmp.id)
      .single()
    if (!readCmp1 || readCmp1.ticket_number !== ticketNo) {
      throw new Error('Complaint not reflected in DB')
    }
    logPass('Complaints', 'Complaint INSERT reflected in DB', `Ticket: ${readCmp1.ticket_number}, Status: ${readCmp1.status}`)

    // Update status to resolved
    await adminAuthClient
      .from('complaints')
      .update({
        status: 'resolved',
        resolution_note: 'Resolved by HR IT team during automated hard test.',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', newCmp.id)

    const { data: readCmp2 } = await adminAuthClient
      .from('complaints')
      .select('*')
      .eq('id', newCmp.id)
      .single()
    if (readCmp2.status !== 'resolved' || !readCmp2.resolution_note) {
      throw new Error('Complaint resolution not reflected in DB')
    }
    logPass('Complaints', 'Complaint resolution UPDATE reflected in DB', `Status: ${readCmp2.status}`)

    // Clean up
    await adminAuthClient.from('complaints').delete().eq('id', newCmp.id)
    const { data: readCmp3 } = await adminAuthClient
      .from('complaints')
      .select('*')
      .eq('id', newCmp.id)
      .maybeSingle()
    if (readCmp3) throw new Error('Complaint still exists after delete')
    logPass('Complaints', 'Complaint cleaned up successfully')
  } catch (err) {
    logFail('Complaints', 'Complaints reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 11: SERVICE REQUESTS / SUPPORT TICKETS
  // -------------------------------------------------------------
  printSection('SUITE 11: Service Requests / IT Tickets')
  try {
    const srNo = `SR-E2E-${Date.now().toString().slice(-4)}`
    const { data: newSr, error: srErr } = await adminAuthClient
      .from('service_requests')
      .insert({
        ticket_number: srNo,
        employee_id: testEmployee?.id || '00000000-0000-0000-0000-000000000000',
        employee_name: testEmployee ? `${testEmployee.first_name} ${testEmployee.last_name}` : 'Test Emp',
        employee_email: testEmployee?.email,
        department: 'Operations',
        category: 'IT Hardware & Laptop Issue',
        priority: 'urgent',
        subject: 'E2E Ticket Subject Verification',
        description: 'Verifying service requests table persistence in DB.',
        status: 'pending',
        attachments: [],
        action_attachments: [],
      })
      .select()
      .single()
    if (srErr) throw srErr

    const { data: readSr1 } = await adminAuthClient
      .from('service_requests')
      .select('*')
      .eq('id', newSr.id)
      .single()
    if (!readSr1 || readSr1.ticket_number !== srNo) {
      throw new Error('Service request not reflected in DB')
    }
    logPass('ServiceRequests', 'Ticket INSERT reflected in DB', `Ticket: ${readSr1.ticket_number}`)

    // Resolve ticket
    await adminAuthClient
      .from('service_requests')
      .update({
        status: 'resolved',
        action_notes: 'Ticket addressed and verified in live DB test.',
        action_at: new Date().toISOString(),
      })
      .eq('id', newSr.id)

    const { data: readSr2 } = await adminAuthClient
      .from('service_requests')
      .select('*')
      .eq('id', newSr.id)
      .single()
    if (readSr2.status !== 'resolved' || !readSr2.action_notes) {
      throw new Error('Service request status update not reflected in DB')
    }
    logPass('ServiceRequests', 'Ticket resolution UPDATE reflected in DB', `Status: ${readSr2.status}`)

    // Clean up
    await adminAuthClient.from('service_requests').delete().eq('id', newSr.id)
    const { data: readSr3 } = await adminAuthClient
      .from('service_requests')
      .select('*')
      .eq('id', newSr.id)
      .maybeSingle()
    if (readSr3) throw new Error('Ticket still exists after delete')
    logPass('ServiceRequests', 'Ticket cleaned up successfully')
  } catch (err) {
    logFail('ServiceRequests', 'Service request reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 12: RECRUITMENT & ATS PIPELINE
  // -------------------------------------------------------------
  printSection('SUITE 12: Recruitment & ATS Pipeline')
  try {
    const { data: jobs, error: jErr } = await adminAuthClient
      .from('job_openings')
      .select('*')
    if (jErr) throw jErr
    logPass('Recruitment', 'Fetched Job Openings from DB', `Count: ${jobs?.length || 0}`)

    const candEmail = `e2e.cand.${Date.now()}@testdomain.com`
    const { data: newCand, error: cErr } = await adminAuthClient
      .from('candidates')
      .insert({
        name: 'E2E Candidate Test',
        email: candEmail,
        phone: '+91 9999988888',
        job_opening_id: jobs?.[0]?.id || null,
        status: 'Applied',
      })
      .select()
      .single()
    if (cErr) throw cErr

    const { data: readCand1 } = await adminAuthClient
      .from('candidates')
      .select('*')
      .eq('id', newCand.id)
      .single()
    if (!readCand1 || readCand1.email !== candEmail) {
      throw new Error('Candidate not reflected in DB')
    }
    logPass('Recruitment', 'Candidate INSERT reflected in DB', `Candidate ID: ${readCand1.id}, Status: ${readCand1.status}`)

    // Advance candidate to Technical Interview
    await adminAuthClient
      .from('candidates')
      .update({
        status: 'Technical Interview',
        technical_interview_status: 'Cleared',
        technical_interview_feedback: 'Strong coding fundamentals tested via E2E.',
      })
      .eq('id', newCand.id)

    const { data: readCand2 } = await adminAuthClient
      .from('candidates')
      .select('*')
      .eq('id', newCand.id)
      .single()
    if (readCand2.status !== 'Technical Interview' || readCand2.technical_interview_status !== 'Cleared') {
      throw new Error('Candidate status advance not reflected in DB')
    }
    logPass('Recruitment', 'Candidate status UPDATE reflected in DB', `Status: ${readCand2.status}, Feedback: ${readCand2.technical_interview_feedback}`)

    // Clean up
    await adminAuthClient.from('candidates').delete().eq('id', newCand.id)
    const { data: readCand3 } = await adminAuthClient
      .from('candidates')
      .select('*')
      .eq('id', newCand.id)
      .maybeSingle()
    if (readCand3) throw new Error('Candidate still exists after delete')
    logPass('Recruitment', 'Candidate cleaned up successfully')
  } catch (err) {
    logFail('Recruitment', 'Recruitment reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 13: ANNOUNCEMENTS & HOLIDAYS
  // -------------------------------------------------------------
  printSection('SUITE 13: Announcements & Holidays')
  try {
    const { data: hols, error: hErr } = await adminAuthClient
      .from('holidays')
      .select('*')
    if (hErr) throw hErr
    logPass('Holidays', 'Fetched official holidays from DB', `Total: ${hols.length}`)

    const annTitle = `E2E Announcement - ${Date.now()}`
    const { data: newAnn, error: annErr } = await adminAuthClient
      .from('announcements')
      .insert({
        title: annTitle,
        content: 'Testing announcements real-time write in PostgreSQL DB.',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()
    if (annErr) throw annErr

    const { data: readAnn1 } = await adminAuthClient
      .from('announcements')
      .select('*')
      .eq('id', newAnn.id)
      .single()
    if (!readAnn1 || readAnn1.title !== annTitle) {
      throw new Error('Announcement not reflected in DB')
    }
    logPass('Announcements', 'Announcement INSERT reflected in DB', `Title: ${readAnn1.title}`)

    // Clean up
    await adminAuthClient.from('announcements').delete().eq('id', newAnn.id)
    const { data: readAnn2 } = await adminAuthClient
      .from('announcements')
      .select('*')
      .eq('id', newAnn.id)
      .maybeSingle()
    if (readAnn2) throw new Error('Announcement still exists after delete')
    logPass('Announcements', 'Announcement cleaned up successfully')
  } catch (err) {
    logFail('Announcements', 'Announcements reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUITE 14: AUDIT LOGS
  // -------------------------------------------------------------
  printSection('SUITE 14: Audit Logs')
  try {
    const testAction = `E2E_HARD_TEST_${Date.now()}`
    const { data: newLog, error: logErr } = await adminAuthClient
      .from('audit_logs')
      .insert({
        action: testAction,
        entity_type: 'system_test',
        details: { mode: 'full_e2e_verification', passed: true },
      })
      .select()
      .single()
    if (logErr) throw logErr

    const { data: readLog1 } = await adminAuthClient
      .from('audit_logs')
      .select('*')
      .eq('id', newLog.id)
      .single()
    if (!readLog1 || readLog1.action !== testAction) {
      throw new Error('Audit log not reflected in DB')
    }
    logPass('AuditLogs', 'Audit log INSERT reflected in DB', `Action: ${readLog1.action}`)

    // Clean up
    await adminAuthClient.from('audit_logs').delete().eq('id', newLog.id)
    logPass('AuditLogs', 'Audit log cleaned up successfully')
  } catch (err) {
    logFail('AuditLogs', 'Audit log reflection flow', err)
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  printSection('FINAL E2E HARD TEST SUMMARY')
  const total = results.length
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length

  console.log(`\nTotal Verifications: ${total}`)
  console.log(`\x1b[32mPassed: ${passed}\x1b[0m`)
  if (failed > 0) {
    console.log(`\x1b[31mFailed: ${failed}\x1b[0m`)
  } else {
    console.log(`\x1b[32mALL LIVE DATABASE CRUD & REFLECTION TESTS PASSED PERFECTLY!\x1b[0m`)
  }
}

runHardTests().catch((e) => {
  console.error('Fatal test error:', e)
  process.exit(1)
})

