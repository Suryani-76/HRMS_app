import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import fs from 'fs'
import path from 'path'

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'pt',
  format: 'a4',
})

const PRIMARY_COLOR = [30, 41, 59] // Slate 800
const ACCENT_COLOR = [79, 70, 229] // Indigo 600
const SECONDARY_COLOR = [100, 116, 139] // Slate 500
const LIGHT_BG = [248, 250, 252] // Slate 50

const pageWidth = doc.internal.pageSize.getWidth()
const pageHeight = doc.internal.pageSize.getHeight()

// Helper: Add header & footer to every page
function addHeaderFooter(doc, title = 'OKLUT HRMS — Complete API Specification') {
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    // Top Bar
    doc.setFillColor(...ACCENT_COLOR)
    doc.rect(0, 0, pageWidth, 5, 'F')

    // Running Header (except page 1)
    if (i > 1) {
      doc.setFontSize(8)
      doc.setTextColor(...SECONDARY_COLOR)
      doc.setFont('helvetica', 'normal')
      doc.text(title, 40, 25)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(40, 30, pageWidth - 40, 30)
    }

    // Running Footer
    doc.setFontSize(8)
    doc.setTextColor(...SECONDARY_COLOR)
    doc.setFont('helvetica', 'normal')
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(40, pageHeight - 30, pageWidth - 40, pageHeight - 30)
    doc.text('Confidential & Proprietary — OKLUT Technologies Private Limited', 40, pageHeight - 18)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 18, { align: 'right' })
  }
}

// ==========================================
// COVER / TITLE SECTION
// ==========================================
let currentY = 50

doc.setFillColor(241, 245, 249)
doc.roundedRect(40, currentY, pageWidth - 80, 110, 8, 8, 'F')

doc.setFont('helvetica', 'bold')
doc.setFontSize(22)
doc.setTextColor(...ACCENT_COLOR)
doc.text('OKLUT HRMS', 60, currentY + 38)

doc.setFontSize(14)
doc.setTextColor(...PRIMARY_COLOR)
doc.text('Complete API Reference & Data Interface Specification', 60, currentY + 60)

doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(...SECONDARY_COLOR)
doc.text(`Project Architecture: React 18 SPA + Supabase PostgreSQL + Edge Functions + SMTP Gateway`, 60, currentY + 80)
doc.text(`Document Version: 1.0.0 | Production URL: https://hrm.oklut.com | Date: September 2026`, 60, currentY + 95)

currentY += 135

// Executive Summary
doc.setFont('helvetica', 'bold')
doc.setFontSize(12)
doc.setTextColor(...PRIMARY_COLOR)
doc.text('1. Architecture & Integration Overview', 40, currentY)
currentY += 15

doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(51, 65, 85)
const summaryText = 
  'This document provides an exhaustive reference of all APIs, services, and database interfaces implemented in the OKLUT ' +
  'Human Resource Management System (HRMS). The application connects directly to Supabase via TypeScript data client layers ' +
  'with Row-Level Security (RLS) enforcement, alongside custom HTTP endpoints for background SMTP dispatch and edge compute.\n' +
  'Total API interfaces documented: 64 unique methods spanning 12 business domains.'

const splitSummary = doc.splitTextToSize(summaryText, pageWidth - 80)
doc.text(splitSummary, 40, currentY)
currentY += splitSummary.length * 12 + 15

// Data definitions for all API modules
const apiModules = [
  {
    title: '2. Authentication & User Session Management',
    file: 'src/features/auth/ & public.users',
    apis: [
      {
        name: 'login',
        table: 'public.users, employees',
        op: 'SELECT / AUTH',
        params: 'email, password',
        returnType: 'Promise<UserSession>',
        desc: 'Validates user credentials, verifies active status (blocks deactivated users), resolves role and employee profile.'
      },
      {
        name: 'logout',
        table: 'Client Session',
        op: 'STATE CLEAR',
        params: 'None',
        returnType: 'void',
        desc: 'Clears active JWT tokens, resets local application state and cached employee permissions.'
      },
      {
        name: 'forgotPassword',
        table: 'audit_logs, users',
        op: 'SELECT + INSERT',
        params: 'email: string',
        returnType: 'Promise<{ success }>',
        desc: 'Verifies email existence, generates secure reset token, and queues a password reset email into audit_logs.'
      },
      {
        name: 'resetPassword',
        table: 'public.users',
        op: 'UPDATE',
        params: 'token, newPassword',
        returnType: 'Promise<{ success }>',
        desc: 'Validates token expiry, updates password hash in public.users, and revokes prior session tokens.'
      }
    ]
  },
  {
    title: '3. Employee Workforce Management',
    file: 'src/lib/api/employees.ts',
    apis: [
      {
        name: 'fetchEmployees',
        table: 'public.employees',
        op: 'SELECT',
        params: 'None',
        returnType: 'Promise<Employee[]>',
        desc: 'Retrieves all employees with joined department, designation, and user account status.'
      },
      {
        name: 'fetchEmployee',
        table: 'public.employees',
        op: 'SELECT',
        params: 'id: string',
        returnType: 'Promise<Employee>',
        desc: 'Fetches single employee details including personal, bank, statutory, and salary profile.'
      },
      {
        name: 'createEmployee',
        table: 'employees, users',
        op: 'INSERT (Transaction)',
        params: 'CreateEmployeePayload',
        returnType: 'Promise<Employee>',
        desc: 'Generates employee code (EMP-XXX), creates record in employees, and creates login account in public.users.'
      },
      {
        name: 'updateEmployee',
        table: 'public.employees',
        op: 'UPDATE',
        params: 'id: string, Partial<Employee>',
        returnType: 'Promise<Employee>',
        desc: 'Updates employee details including department, designation, salary profile, and personal records.'
      },
      {
        name: 'deleteEmployee',
        table: 'public.employees',
        op: 'DELETE / SOFT',
        params: 'id: string',
        returnType: 'Promise<void>',
        desc: 'Deactivates user login and removes employee from active directory.'
      },
      {
        name: 'deleteEmployeeByIdOrCode',
        table: 'employees, users',
        op: 'DELETE',
        params: 'identifier: string',
        returnType: 'Promise<void>',
        desc: 'Deletes employee by either primary key UUID or company employee code (EMP-XXX).'
      }
    ]
  },
  {
    title: '4. Attendance, Time Tracking & Real-Time Clocks',
    file: 'src/lib/api/attendance.ts',
    apis: [
      {
        name: 'fetchTodayAttendance',
        table: 'public.attendance',
        op: 'SELECT',
        params: 'employeeId: string',
        returnType: 'Promise<Attendance>',
        desc: 'Fetches current day punch status (check_in, check_out, total_hours, break_duration).'
      },
      {
        name: 'fetchAttendanceMonth',
        table: 'public.attendance',
        op: 'SELECT',
        params: 'employeeId, year, month',
        returnType: 'Promise<Attendance[]>',
        desc: 'Queries 30-day attendance record for monthly payroll calculation and calendar visualization.'
      },
      {
        name: 'fetchAttendanceLog',
        table: 'public.attendance',
        op: 'SELECT',
        params: 'employeeId, start, end',
        returnType: 'Promise<Attendance[]>',
        desc: 'Fetches filtered date-range attendance logs for manager reporting and audit verification.'
      },
      {
        name: 'checkIn',
        table: 'public.attendance',
        op: 'INSERT',
        params: 'employeeId, location?',
        returnType: 'Promise<Attendance>',
        desc: 'Records daily punch-in timestamp, location coordinates, and initializes shift tracking.'
      },
      {
        name: 'checkOut',
        table: 'public.attendance',
        op: 'UPDATE',
        params: 'employeeId: string',
        returnType: 'Promise<Attendance>',
        desc: 'Records punch-out time, computes total worked duration, and updates shift status.'
      },
      {
        name: 'setBreak',
        table: 'public.attendance',
        op: 'UPDATE',
        params: 'employeeId, isBreak',
        returnType: 'Promise<Attendance>',
        desc: 'Toggles active meal or rest break, tracking cumulative pause duration during shift.'
      }
    ]
  },
  {
    title: '5. Leave & Holiday Administration',
    file: 'src/lib/api/attendance.ts',
    apis: [
      {
        name: 'fetchLeaveTypes',
        table: 'public.leave_types',
        op: 'SELECT',
        params: 'None',
        returnType: 'Promise<LeaveType[]>',
        desc: 'Retrieves leave categories (Casual, Sick, Earned, Maternity) and annual quota allocations.'
      },
      {
        name: 'fetchLeaveRequests',
        table: 'public.leave_requests',
        op: 'SELECT',
        params: 'employeeId?: string',
        returnType: 'Promise<LeaveRequest[]>',
        desc: 'Fetches submitted leave requests with employee details, duration, status, and approval notes.'
      },
      {
        name: 'applyLeave',
        table: 'public.leave_requests',
        op: 'INSERT',
        params: 'LeaveRequestPayload',
        returnType: 'Promise<LeaveRequest>',
        desc: 'Submits new time-off application; validates sufficient remaining balance in leave_balances.'
      },
      {
        name: 'reviewLeave',
        table: 'leave_requests, balances',
        op: 'UPDATE (Transaction)',
        params: 'requestId, status, note',
        returnType: 'Promise<LeaveRequest>',
        desc: 'Approves or rejects request; upon approval, automatically deducts days from leave_balances.'
      },
      {
        name: 'cancelLeave',
        table: 'leave_requests, balances',
        op: 'UPDATE',
        params: 'requestId: string',
        returnType: 'Promise<void>',
        desc: 'Cancels pending or approved request and restores deducted days back to leave_balances.'
      },
      {
        name: 'fetchLeaveBalances',
        table: 'public.leave_balances',
        op: 'SELECT',
        params: 'employeeId, year',
        returnType: 'Promise<LeaveBalance[]>',
        desc: 'Retrieves total, used, and remaining day allowances across all leave types for specified year.'
      },
      {
        name: 'fetchHolidays',
        table: 'public.holidays',
        op: 'SELECT',
        params: 'year?: number',
        returnType: 'Promise<Holiday[]>',
        desc: 'Lists gazetted company holidays and optional floating observance days.'
      },
      {
        name: 'createHoliday',
        table: 'public.holidays',
        op: 'INSERT',
        params: 'HolidayPayload',
        returnType: 'Promise<Holiday>',
        desc: 'Adds new holiday date and title to company operational calendar.'
      },
      {
        name: 'deleteHoliday',
        table: 'public.holidays',
        op: 'DELETE',
        params: 'id: string',
        returnType: 'Promise<void>',
        desc: 'Removes designated holiday from public schedule.'
      }
    ]
  },
  {
    title: '6. Candidate Portal & Applicant Self-Service',
    file: 'src/lib/api/candidatePortal.ts',
    apis: [
      {
        name: 'candidateLogin',
        table: 'public.candidates',
        op: 'SELECT',
        params: 'referenceId, dateOfBirth',
        returnType: 'Promise<CandidateProfile>',
        desc: 'Authenticates candidate via Reference ID (e.g., CAND-XXXXXX) and Date of Birth password.'
      },
      {
        name: 'fetchCandidatePortal',
        table: 'candidates, interviews, offers',
        op: 'SELECT (Multi)',
        params: 'referenceId: string',
        returnType: 'Promise<CandidatePortalData>',
        desc: 'Loads applicant application progress, scheduled interview rounds, exam link, and offer letters.'
      },
      {
        name: 'bookInterviewSlot',
        table: 'interviews, candidates',
        op: 'UPDATE',
        params: 'slotId, candidateId',
        returnType: 'Promise<InterviewBooking>',
        desc: 'Reserves candidate interview timeslot and generates calendar confirmation entry.'
      },
      {
        name: 'cancelInterviewSlot',
        table: 'public.interviews',
        op: 'UPDATE',
        params: 'bookingId: string',
        returnType: 'Promise<void>',
        desc: 'Releases booked interview slot back to pool of open recruiter availability.'
      },
      {
        name: 'submitRescheduleRequest',
        table: 'interviews, audit_logs',
        op: 'UPDATE + INSERT',
        params: 'bookingId, reason, slots',
        returnType: 'Promise<void>',
        desc: 'Flags interview for reschedule and notifies hiring team with preferred time windows.'
      },
      {
        name: 'revertRescheduleRequest',
        table: 'public.interviews',
        op: 'UPDATE',
        params: 'bookingId: string',
        returnType: 'Promise<void>',
        desc: 'Reverts pending reschedule request and retains original meeting schedule.'
      },
      {
        name: 'startExam',
        table: 'candidates, audit_logs',
        op: 'UPDATE',
        params: 'examId, candidateId',
        returnType: 'Promise<ExamSession>',
        desc: 'Initializes online assessment session and records countdown start timestamp.'
      },
      {
        name: 'submitExam',
        table: 'candidates, audit_logs',
        op: 'UPDATE',
        params: 'examId, answers',
        returnType: 'Promise<ExamResult>',
        desc: 'Scores submitted exam answers, records ATS marks, and updates candidate stage.'
      },
      {
        name: 'acceptOfferTerms',
        table: 'public.offers',
        op: 'UPDATE',
        params: 'candidateId, terms',
        returnType: 'Promise<Offer>',
        desc: 'Records candidate agreement to employment bond, relocation, and background check terms.'
      },
      {
        name: 'respondToOffer',
        table: 'offers, candidates',
        op: 'UPDATE',
        params: 'candidateId, status, note',
        returnType: 'Promise<Offer>',
        desc: 'Candidate formally accepts or declines job offer letter; updates onboarding pipeline.'
      },
      {
        name: 'disqualifyCandidate',
        table: 'candidates, audit_logs',
        op: 'UPDATE',
        params: 'candidateId, reason',
        returnType: 'Promise<void>',
        desc: 'Marks candidate as Rejected with rejection code and logs action for talent compliance.'
      }
    ]
  },
  {
    title: '7. Recruitment Pipeline & ATS Management',
    file: 'src/lib/api/modules.ts',
    apis: [
      {
        name: 'fetchJobOpenings',
        table: 'public.job_openings',
        op: 'SELECT',
        params: 'None',
        returnType: 'Promise<JobOpening[]>',
        desc: 'Fetches open job positions with department, required skills, vacancy count, and status.'
      },
      {
        name: 'createJobOpening',
        table: 'public.job_openings',
        op: 'INSERT',
        params: 'JobOpeningPayload',
        returnType: 'Promise<JobOpening>',
        desc: 'Publishes new job requisition visible on internal dashboard and external /careers portal.'
      },
      {
        name: 'updateJobOpening',
        table: 'public.job_openings',
        op: 'UPDATE',
        params: 'id, Partial<JobOpening>',
        returnType: 'Promise<JobOpening>',
        desc: 'Edits job description, closing date, salary band, or toggles status (Active/Closed).'
      },
      {
        name: 'deleteJobOpening',
        table: 'public.job_openings',
        op: 'DELETE',
        params: 'id: string',
        returnType: 'Promise<void>',
        desc: 'Removes requisition and archives associated applicant submissions.'
      },
      {
        name: 'fetchCandidates',
        table: 'public.candidates',
        op: 'SELECT',
        params: 'jobOpeningId?: string',
        returnType: 'Promise<Candidate[]>',
        desc: 'Queries all applicants across pipeline stages (Applied, Screening, Interview, Offered).'
      },
      {
        name: 'createCandidate',
        table: 'public.candidates',
        op: 'INSERT',
        params: 'CandidatePayload',
        returnType: 'Promise<Candidate>',
        desc: 'Creates candidate profile, assigns unique reference ID, and sets ATS initial score.'
      },
      {
        name: 'updateCandidateStatus',
        table: 'public.candidates',
        op: 'UPDATE',
        params: 'id, status',
        returnType: 'Promise<Candidate>',
        desc: 'Updates hiring status (Under Review, Selected, Rejected, Hired).'
      },
      {
        name: 'updateCandidateStage',
        table: 'public.candidates',
        op: 'UPDATE',
        params: 'id, stage',
        returnType: 'Promise<Candidate>',
        desc: 'Transitions candidate across workflow stages (Screening, Round 1, Round 2, HR Round).'
      },
      {
        name: 'fetchInterviews',
        table: 'public.interviews',
        op: 'SELECT',
        params: 'candidateId?: string',
        returnType: 'Promise<Interview[]>',
        desc: 'Queries scheduled interview rounds with meeting links, interviewers, and feedback.'
      },
      {
        name: 'createInterview',
        table: 'public.interviews',
        op: 'INSERT',
        params: 'InterviewPayload',
        returnType: 'Promise<Interview>',
        desc: 'Schedules interview round, meeting link, date/time, and assigns interviewer.'
      },
      {
        name: 'updateInterviewStatus',
        table: 'public.interviews',
        op: 'UPDATE',
        params: 'id, status, feedback?',
        returnType: 'Promise<Interview>',
        desc: 'Records round completion status (Passed, Failed, Rescheduled) with reviewer remarks.'
      },
      {
        name: 'fetchOffers',
        table: 'public.offers',
        op: 'SELECT',
        params: 'candidateId?: string',
        returnType: 'Promise<Offer[]>',
        desc: 'Fetches formal offer records with CTC, joining dates, designation, and signing status.'
      },
      {
        name: 'createOffer',
        table: 'public.offers',
        op: 'INSERT',
        params: 'OfferPayload',
        returnType: 'Promise<Offer>',
        desc: 'Issues offer letter to candidate and activates offer review in candidate portal.'
      },
      {
        name: 'updateOfferStatus',
        table: 'public.offers',
        op: 'UPDATE',
        params: 'id, status',
        returnType: 'Promise<Offer>',
        desc: 'Updates offer acceptance status (Draft, Sent, Accepted, Declined).'
      }
    ]
  },
  {
    title: '8. Payroll & Statutory Compensation Engine',
    file: 'src/lib/api/core.ts',
    apis: [
      {
        name: 'fetchPayrollProfiles',
        table: 'public.payroll_profiles',
        op: 'SELECT',
        params: 'employeeId?: string',
        returnType: 'Promise<PayrollProfile[]>',
        desc: 'Fetches salary structures (Basic, HRA, Allowances, PF, ESI, Professional Tax, TDS).'
      },
      {
        name: 'fetchPayroll',
        table: 'public.payroll',
        op: 'SELECT',
        params: 'month: number, year: number',
        returnType: 'Promise<PayrollRecord[]>',
        desc: 'Retrieves calculated payslips for entire workforce for specified month and year.'
      },
      {
        name: 'generatePayroll',
        table: 'payroll, attendance, leaves',
        op: 'INSERT (Batch Calc)',
        params: 'month, year',
        returnType: 'Promise<PayrollRecord[]>',
        desc: 'Executes automated payroll run: computes payable days against attendance, calculates deductions and net pay.'
      },
      {
        name: 'updatePayrollStatus',
        table: 'public.payroll',
        op: 'UPDATE',
        params: 'payrollId, status',
        returnType: 'Promise<PayrollRecord>',
        desc: 'Transitions payroll batch through lifecycle: Draft -> Approved -> Processed -> Paid.'
      }
    ]
  },
  {
    title: '9. Department & Designation Hierarchy',
    file: 'src/lib/api/departments.ts',
    apis: [
      {
        name: 'fetchDepartments',
        table: 'public.departments',
        op: 'SELECT',
        params: 'None',
        returnType: 'Promise<Department[]>',
        desc: 'Retrieves all organization departments with headcount count and manager association.'
      },
      {
        name: 'createDepartment',
        table: 'public.departments',
        op: 'INSERT',
        params: 'DepartmentPayload',
        returnType: 'Promise<Department>',
        desc: 'Creates new operational department in corporate directory.'
      },
      {
        name: 'updateDepartment',
        table: 'public.departments',
        op: 'UPDATE',
        params: 'id, Partial<Department>',
        returnType: 'Promise<Department>',
        desc: 'Modifies department name, department head, or description.'
      },
      {
        name: 'deleteDepartment',
        table: 'public.departments',
        op: 'DELETE',
        params: 'id: string',
        returnType: 'Promise<void>',
        desc: 'Deletes department if no active employees are assigned.'
      },
      {
        name: 'fetchDesignations',
        table: 'public.designations',
        op: 'SELECT',
        params: 'None',
        returnType: 'Promise<Designation[]>',
        desc: 'Retrieves job titles, pay grade bands, and linked department references.'
      },
      {
        name: 'createDesignation',
        table: 'public.designations',
        op: 'INSERT',
        params: 'DesignationPayload',
        returnType: 'Promise<Designation>',
        desc: 'Defines new job title and attaches it to parent department.'
      },
      {
        name: 'updateDesignation',
        table: 'public.designations',
        op: 'UPDATE',
        params: 'id, Partial<Designation>',
        returnType: 'Promise<Designation>',
        desc: 'Updates designation title, minimum/maximum experience, and grade level.'
      },
      {
        name: 'deleteDesignation',
        table: 'public.designations',
        op: 'DELETE',
        params: 'id: string',
        returnType: 'Promise<void>',
        desc: 'Removes job title from organization roster.'
      }
    ]
  },
  {
    title: '10. Document Storage & Meeting Hall Reservations',
    file: 'src/lib/api/core.ts & modules.ts',
    apis: [
      {
        name: 'fetchDocuments',
        table: 'public.documents',
        op: 'SELECT',
        params: 'employeeId?: string',
        returnType: 'Promise<Document[]>',
        desc: 'Retrieves employee documents (Contracts, ID Proofs, Payslips, Educational Certs).'
      },
      {
        name: 'uploadDocument',
        table: 'storage.objects, documents',
        op: 'STORAGE + INSERT',
        params: 'file, metadata',
        returnType: 'Promise<Document>',
        desc: 'Uploads binary file to Supabase storage documents bucket and inserts record in documents.'
      },
      {
        name: 'deleteDocument',
        table: 'storage.objects, documents',
        op: 'STORAGE + DELETE',
        params: 'documentId: string',
        returnType: 'Promise<void>',
        desc: 'Deletes file from cloud bucket and removes database record.'
      },
      {
        name: 'fetchMeetingHallBookings',
        table: 'public.meeting_hall_bookings',
        op: 'SELECT',
        params: 'None',
        returnType: 'Promise<Booking[]>',
        desc: 'Retrieves conference room and meeting hall reservation schedule.'
      },
      {
        name: 'createMeetingHallBooking',
        table: 'public.meeting_hall_bookings',
        op: 'INSERT',
        params: 'BookingPayload',
        returnType: 'Promise<Booking>',
        desc: 'Reserves meeting room with start/end time, organizer, agenda, and attendee list.'
      },
      {
        name: 'updateMeetingHallBookingStatus',
        table: 'public.meeting_hall_bookings',
        op: 'UPDATE',
        params: 'bookingId, status',
        returnType: 'Promise<Booking>',
        desc: 'Confirms, checks in, or cancels meeting room reservation.'
      },
      {
        name: 'deleteMeetingHallBooking',
        table: 'public.meeting_hall_bookings',
        op: 'DELETE',
        params: 'bookingId: string',
        returnType: 'Promise<void>',
        desc: 'Removes reservation and frees hall on corporate calendar.'
      }
    ]
  },
  {
    title: '11. Task Workflow, Broadcasts & Notifications',
    file: 'src/lib/api/core.ts & notificationService.ts',
    apis: [
      {
        name: 'fetchTasks',
        table: 'public.tasks',
        op: 'SELECT',
        params: 'assignedTo?: string',
        returnType: 'Promise<Task[]>',
        desc: 'Retrieves operational employee tasks with priority, due dates, and completion status.'
      },
      {
        name: 'createTask',
        table: 'public.tasks',
        op: 'INSERT',
        params: 'TaskPayload',
        returnType: 'Promise<Task>',
        desc: 'Assigns new deliverable to employee with deadline and priority (Low/Med/High/Urgent).'
      },
      {
        name: 'updateTaskStatus',
        table: 'public.tasks',
        op: 'UPDATE',
        params: 'taskId, status',
        returnType: 'Promise<Task>',
        desc: 'Transitions task through workflow (Todo -> In Progress -> Under Review -> Completed).'
      },
      {
        name: 'deleteTask',
        table: 'public.tasks',
        op: 'DELETE',
        params: 'taskId: string',
        returnType: 'Promise<void>',
        desc: 'Removes task from board.'
      },
      {
        name: 'fetchAnnouncements',
        table: 'public.announcements',
        op: 'SELECT',
        params: 'None',
        returnType: 'Promise<Announcement[]>',
        desc: 'Retrieves active company-wide circulars, notices, and HR policy broadcasts.'
      },
      {
        name: 'createAnnouncement',
        table: 'public.announcements',
        op: 'INSERT',
        params: 'AnnouncementPayload',
        returnType: 'Promise<Announcement>',
        desc: 'Publishes organization-wide announcement displayed on employee dashboards.'
      },
      {
        name: 'deleteAnnouncement',
        table: 'public.announcements',
        op: 'DELETE',
        params: 'id: string',
        returnType: 'Promise<void>',
        desc: 'Archives broadcast notice.'
      },
      {
        name: 'fetchNotifications',
        table: 'public.notifications',
        op: 'SELECT',
        params: 'userId: string',
        returnType: 'Promise<Notification[]>',
        desc: 'Fetches in-app notification alerts for active user with read/unread flags.'
      },
      {
        name: 'markNotificationRead',
        table: 'public.notifications',
        op: 'UPDATE',
        params: 'notificationId: string',
        returnType: 'Promise<void>',
        desc: 'Marks single notification banner as read.'
      },
      {
        name: 'markAllNotificationsRead',
        table: 'public.notifications',
        op: 'UPDATE',
        params: 'userId: string',
        returnType: 'Promise<void>',
        desc: 'Clears all unread badge indicators for active user.'
      }
    ]
  },
  {
    title: '12. Performance Appraisal & KPI Goals',
    file: 'src/lib/api/modules.ts',
    apis: [
      {
        name: 'fetchPerformanceGoals',
        table: 'public.performance_goals',
        op: 'SELECT',
        params: 'employeeId?: string',
        returnType: 'Promise<Goal[]>',
        desc: 'Retrieves quarterly OKRs and KPIs with target metric and completion percentage.'
      },
      {
        name: 'createGoal',
        table: 'public.performance_goals',
        op: 'INSERT',
        params: 'GoalPayload',
        returnType: 'Promise<Goal>',
        desc: 'Sets new performance objective for employee with evaluation criteria.'
      },
      {
        name: 'updateGoalStatus',
        table: 'public.performance_goals',
        op: 'UPDATE',
        params: 'goalId, progress, status',
        returnType: 'Promise<Goal>',
        desc: 'Updates goal progress percentage (0-100%) and completion milestone.'
      },
      {
        name: 'fetchPerformanceReviews',
        table: 'public.performance_reviews',
        op: 'SELECT',
        params: 'employeeId?: string',
        returnType: 'Promise<Review[]>',
        desc: 'Retrieves annual/quarterly appraisal reviews including self-ratings and manager scores.'
      },
      {
        name: 'createReview',
        table: 'public.performance_reviews',
        op: 'INSERT',
        params: 'ReviewPayload',
        returnType: 'Promise<Review>',
        desc: 'Submits finalized performance review with rating (1-5), promotion advice, and bonus notes.'
      }
    ]
  },
  {
    title: '13. Transactional Mail, Background Daemons & System Services',
    file: 'src/lib/api/email.ts, vite.config.ts, Edge Functions',
    apis: [
      {
        name: 'sendCandidateApplicationEmail',
        table: 'audit_logs, SMTP Gateway',
        op: 'HTTP / QUEUE',
        params: 'CandidateApplicationEmailPayload',
        returnType: 'Promise<{ success }>',
        desc: 'Generates branded HTML confirmation, dispatches to local SMTP or queues in audit_logs.'
      },
      {
        name: 'POST /api/send-email',
        table: 'Vite Dev Server (Port 5174)',
        op: 'HTTP POST (SSL/TLS)',
        params: '{ to, subject, html, refId }',
        returnType: 'JSON: { success: true }',
        desc: 'Direct TLS connection to kindle.herosite.pro:465 via authenticated hr@oklut.com user.'
      },
      {
        name: 'Supabase Edge Function: send-email',
        table: 'Supabase Deno Deploy',
        op: 'HTTP POST (v1/send-email)',
        params: '{ to, subject, html, fromName }',
        returnType: 'JSON: { success: true }',
        desc: 'Cloud-native serverless transactional mail dispatcher connecting to SMTP host over TLS.'
      },
      {
        name: 'fetchDashboardStats',
        table: 'employees, leaves, candidates',
        op: 'AGGREGATE SELECT',
        params: 'None',
        returnType: 'Promise<DashboardMetrics>',
        desc: 'Aggregates workforce size, active leave count, open positions, and recruitment metrics.'
      },
      {
        name: 'fetchAuditLogs',
        table: 'public.audit_logs',
        op: 'SELECT',
        params: 'None',
        returnType: 'Promise<AuditLog[]>',
        desc: 'System event log recording authentication attempts, email delivery queues, and security actions.'
      }
    ]
  }
]

// Render tables for each module
apiModules.forEach((mod) => {
  // Check if we need a new page
  if (currentY > pageHeight - 120) {
    doc.addPage()
    currentY = 45
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...PRIMARY_COLOR)
  doc.text(mod.title, 40, currentY)
  
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...SECONDARY_COLOR)
  doc.text(`Source: ${mod.file}`, 40, currentY + 11)

  currentY += 18

  const tableBody = mod.apis.map(api => [
    api.name,
    api.table,
    api.op,
    api.params,
    api.returnType,
    api.desc
  ])

  doc.autoTable({
    startY: currentY,
    head: [['API / Function', 'Table / Target', 'Operation', 'Parameters', 'Return Type', 'Description & Business Logic']],
    body: tableBody,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 3.5,
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: 85, fontStyle: 'bold', textColor: ACCENT_COLOR },
      1: { cellWidth: 70 },
      2: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 85 },
      4: { cellWidth: 75, fontStyle: 'italic' },
      5: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: LIGHT_BG,
    },
    didDrawPage: (data) => {
      currentY = data.cursor.y
    }
  })

  currentY = doc.lastAutoTable.finalY + 22
})

// Add headers and footers to all pages
addHeaderFooter(doc)

const outputPath = path.resolve('OKLUT_HRMS_Complete_API_Documentation.pdf')
const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
fs.writeFileSync(outputPath, pdfBuffer)

console.log(`✅ PDF successfully generated: ${outputPath}`)
console.log(`Total Pages: ${doc.internal.getNumberOfPages()}`)
