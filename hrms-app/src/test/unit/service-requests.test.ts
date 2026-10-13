import { describe, it, expect, beforeEach } from 'vitest'
import {
  createServiceRequest,
  fetchAuthorizedServiceRequests,
  updateServiceRequestAction,
  deleteServiceRequest,
} from '@/lib/api/service-requests'

describe('Service Request Sector API & Access Control', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('allows an employee to create a service request with issue description and document attachments', async () => {
    const created = await createServiceRequest({
      employee_id: 'emp-101',
      employee_name: 'Ananya Sen',
      employee_code: 'EMP-0101',
      employee_email: 'ananya.s@oklut.com',
      department: 'Marketing',
      category: 'IT Hardware & Laptop Issue',
      priority: 'high',
      subject: 'Faulty charger causing laptop power shutdowns',
      description: 'The USB-C charging adapter sparking and not charging the laptop consistently.',
      attachments: [
        {
          name: 'adapter_issue_photo.jpg',
          size: 85200,
          type: 'image/jpeg',
          url: 'data:image/jpeg;base64,sample_photo_data',
          uploaded_at: new Date().toISOString(),
        },
      ],
    })

    expect(created.ticket_number).toMatch(/^SR-\d{4}-\d{4}$/)
    expect(created.subject).toBe('Faulty charger causing laptop power shutdowns')
    expect(created.status).toBe('pending')
    expect(created.attachments).toHaveLength(1)
    expect(created.attachments[0].name).toBe('adapter_issue_photo.jpg')
    expect(created.action_notes).toBeNull()
  })

  it('strictly limits regular employees to viewing only their own service requests', async () => {
    await createServiceRequest({
      employee_id: 'emp-alice',
      employee_name: 'Alice Wonder',
      employee_email: 'alice@oklut.com',
      category: 'Software, Email & System Access',
      priority: 'medium',
      subject: 'Access to Github Repository',
      description: 'Need access to the backend repo.',
      attachments: [],
    })

    await createServiceRequest({
      employee_id: 'emp-bob',
      employee_name: 'Bob Builder',
      employee_email: 'bob@oklut.com',
      category: 'Workplace, Desk & Facilities Maintenance',
      priority: 'low',
      subject: 'Ergonomic chair request',
      description: 'Requesting ergonomic lumbar chair.',
      attachments: [],
    })

    // Regular employee Alice querying
    const aliceData = await fetchAuthorizedServiceRequests({
      employeeId: 'emp-alice',
      employeeEmail: 'alice@oklut.com',
      canManage: false, // Not HR or Admin
    })

    expect(aliceData.accessible.length).toBe(1)
    expect(aliceData.accessible[0].employee_id).toBe('emp-alice')
    expect(aliceData.accessible[0].subject).toBe('Access to Github Repository')

    // Regular employee Bob querying
    const bobData = await fetchAuthorizedServiceRequests({
      employeeId: 'emp-bob',
      employeeEmail: 'bob@oklut.com',
      canManage: false,
    })

    expect(bobData.accessible.length).toBe(1)
    expect(bobData.accessible[0].employee_id).toBe('emp-bob')
    expect(bobData.accessible[0].subject).toBe('Ergonomic chair request')
  })

  it('allows HR and Admin to view all employee service requests across the company', async () => {
    await createServiceRequest({
      employee_id: 'emp-charlie',
      employee_name: 'Charlie Day',
      employee_email: 'charlie@oklut.com',
      category: 'General Workplace Request',
      priority: 'medium',
      subject: 'Keycard replacement',
      description: 'Lost keycard in transit.',
      attachments: [],
    })

    // HR Administrator querying
    const hrData = await fetchAuthorizedServiceRequests({
      employeeId: 'hr-manager',
      employeeEmail: 'hr@oklut.com',
      canManage: true, // HR & Admin access
    })

    expect(hrData.accessible.length).toBeGreaterThanOrEqual(1)
    expect(hrData.accessible.some((r) => r.employee_id === 'emp-charlie')).toBe(true)
  })

  it('allows HR or Admin to take action, write resolution notes, and upload resolution documents', async () => {
    const created = await createServiceRequest({
      employee_id: 'emp-david',
      employee_name: 'David Miller',
      employee_email: 'david@oklut.com',
      category: 'Payroll, Salary & Payout Discrepancy',
      priority: 'urgent',
      subject: 'Tax deduction calculation clarification',
      description: 'Requesting breakdown of Section 80C deductions.',
      attachments: [],
    })

    const updated = await updateServiceRequestAction(created.id, {
      status: 'resolved',
      action_notes: 'Reviewed and rectified with Finance team. Form 16 revised statement generated.',
      action_by_name: 'Senior HR Operations Lead',
      action_by_email: 'hr.ops@oklut.com',
      action_attachments: [
        {
          name: 'revised_form16_tax_statement.pdf',
          size: 165000,
          type: 'application/pdf',
          url: 'data:application/pdf;base64,sample_pdf_data',
          uploaded_at: new Date().toISOString(),
        },
      ],
    })

    expect(updated.status).toBe('resolved')
    expect(updated.action_notes).toContain('Reviewed and rectified with Finance team')
    expect(updated.action_by_name).toBe('Senior HR Operations Lead')
    expect(updated.action_attachments).toHaveLength(1)
    expect(updated.action_attachments[0].name).toBe('revised_form16_tax_statement.pdf')
  })
})
