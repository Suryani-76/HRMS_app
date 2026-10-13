/**
 * UNIT & INTEGRATION TESTS — Project Management Module
 * Tests:
 * 1. Safe, sequential Project Code generation (ok-ind-NNN format)
 * 2. Mandatory field validations (Name, Dates, Head, Lead)
 * 3. Employee assignments (Head, Lead, Members with unique roles)
 * 4. Project Head official status update rules (Completed requires 100%, delay reasons)
 * 5. Team Lead progress report (preserves official status without overwrite)
 * 6. Audit trail & historical timeline retention
 * 7. Dashboard statistics calculation
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getNextProjectCode,
  createProject,
  updateProject,
  submitProjectStatusUpdate,
  fetchProjects,
  fetchProjectById,
  deleteProject,
  fetchProjectDashboardStats,
} from '@/lib/api/projects'

describe('Project Management Module', () => {
  const currentYear = new Date().getFullYear()

  beforeEach(() => {
    // Clear local storage keys to ensure clean state
    localStorage.removeItem('oklut_db_projects')
    localStorage.removeItem('oklut_db_project_members')
    localStorage.removeItem('oklut_db_project_status_updates')
  })

  describe('1. Project Code Auto-Generation (ok-ind-NNN)', () => {
    it('generates a valid code matching ok-ind-NNN format', async () => {
      const code = await getNextProjectCode()
      expect(code).toMatch(/^ok-ind-\d{3}$/)
    })

    it('generates sequential non-colliding codes after each creation', async () => {
      const p1 = await createProject({
        project_name: 'Core System Upgrade',
        priority: 'Medium',
        project_head_id: 'emp-head-1',
        team_lead_id: 'emp-lead-1',
        start_date: `${currentYear}-01-01`,
        expected_end_date: `${currentYear}-06-30`,
      })
      expect(p1.project_code).toContain('ok-ind-')

      const codeNext = await getNextProjectCode()
      expect(codeNext).not.toBe(p1.project_code)
      expect(codeNext).toMatch(/^ok-ind-\d{3}$/)
    })
  })

  describe('2. Validation & Mandatory Fields', () => {
    it('rejects project creation if name is too short', async () => {
      await expect(
        createProject({
          project_name: 'AB',
          priority: 'Low',
          project_head_id: 'emp-head-1',
          team_lead_id: 'emp-lead-1',
          start_date: `${currentYear}-01-01`,
          expected_end_date: `${currentYear}-06-30`,
        })
      ).rejects.toThrow('Project Name is required and must be at least 3 characters.')
    })

    it('rejects project creation if end date is before start date', async () => {
      await expect(
        createProject({
          project_name: 'Invalid Timeline Project',
          priority: 'High',
          project_head_id: 'emp-head-1',
          team_lead_id: 'emp-lead-1',
          start_date: `${currentYear}-05-01`,
          expected_end_date: `${currentYear}-02-01`,
        })
      ).rejects.toThrow('Expected End Date cannot be earlier than Start Date.')
    })

    it('rejects project creation if Project Head is missing', async () => {
      await expect(
        createProject({
          project_name: 'Headless Project',
          priority: 'High',
          project_head_id: '',
          team_lead_id: 'emp-lead-1',
          start_date: `${currentYear}-01-01`,
          expected_end_date: `${currentYear}-06-30`,
        })
      ).rejects.toThrow('Project Head is mandatory.')
    })

    it('rejects project creation if Team Lead is missing', async () => {
      await expect(
        createProject({
          project_name: 'Leadless Project',
          priority: 'High',
          project_head_id: 'emp-head-1',
          team_lead_id: '',
          start_date: `${currentYear}-01-01`,
          expected_end_date: `${currentYear}-06-30`,
        })
      ).rejects.toThrow('Team Lead is mandatory.')
    })
  })

  describe('3. Employee Leadership & Team Member Assignments', () => {
    it('assigns Project Head as Head and Team Lead as Lead without duplicate entries', async () => {
      const created = await createProject({
        project_name: 'Analytics Dashboard',
        priority: 'High',
        project_head_id: 'emp-head-1',
        team_lead_id: 'emp-lead-1',
        member_ids: ['emp-head-1', 'emp-lead-1', 'emp-dev-1', 'emp-qa-1'],
        start_date: `${currentYear}-01-01`,
        expected_end_date: `${currentYear}-12-31`,
      })

      const projectWithMembers = await fetchProjectById(created.id)
      expect(projectWithMembers).toBeDefined()
      expect(projectWithMembers?.members).toBeDefined()

      const headMember = projectWithMembers?.members?.find((m) => m.employee_id === 'emp-head-1')
      expect(headMember?.project_role).toBe('Head')

      const leadMember = projectWithMembers?.members?.find((m) => m.employee_id === 'emp-lead-1')
      expect(leadMember?.project_role).toBe('Lead')

      // Ensure no duplicate employee assignments
      const empIds = projectWithMembers?.members?.map((m) => m.employee_id)
      const uniqueIds = new Set(empIds)
      expect(empIds?.length).toBe(uniqueIds.size)
    })
  })

  describe('4. Status Update Rules & Project Head Responsibilities', () => {
    it('enforces 100% progress when status is Completed', async () => {
      const p = await createProject({
        project_name: 'Feature Release X',
        priority: 'Medium',
        project_head_id: 'emp-head-1',
        team_lead_id: 'emp-lead-1',
        start_date: `${currentYear}-01-01`,
        expected_end_date: `${currentYear}-06-30`,
      })

      await expect(
        submitProjectStatusUpdate({
          project_id: p.id,
          new_status: 'Completed',
          new_progress: 90,
          update_type: 'Official',
        })
      ).rejects.toThrow('A project marked as Completed must have 100% progress.')
    })

    it('requires a reason for delay when marked On Hold or At Risk', async () => {
      const p = await createProject({
        project_name: 'Migration Pipeline',
        priority: 'High',
        project_head_id: 'emp-head-1',
        team_lead_id: 'emp-lead-1',
        start_date: `${currentYear}-01-01`,
        expected_end_date: `${currentYear}-06-30`,
      })

      await expect(
        submitProjectStatusUpdate({
          project_id: p.id,
          new_status: 'At Risk',
          new_progress: 40,
          update_type: 'Official',
          delay_reason: '',
          blockers: '',
        })
      ).rejects.toThrow('A detailed Reason for Delay or Blocker is required')
    })

    it('successfully updates official status when Project Head submits valid update', async () => {
      const p = await createProject({
        project_name: 'Security Hardening',
        priority: 'Critical',
        project_head_id: 'emp-head-1',
        team_lead_id: 'emp-lead-1',
        start_date: `${currentYear}-01-01`,
        expected_end_date: `${currentYear}-06-30`,
      })

      const update = await submitProjectStatusUpdate({
        project_id: p.id,
        new_status: 'In Progress',
        new_progress: 55,
        work_completed: 'Completed IAM role refactoring',
        work_in_progress: 'Auditing S3 bucket ACL policies',
        update_type: 'Official',
        updated_by: 'emp-head-1',
      })

      expect(update.new_status).toBe('In Progress')
      expect(update.new_progress).toBe(55)

      const refreshed = await fetchProjectById(p.id)
      expect(refreshed?.status).toBe('In Progress')
      expect(refreshed?.progress_percentage).toBe(55)
    })
  })

  describe('5. Team Lead Progress Reports (Advisory - does not overwrite official status)', () => {
    it('records progress report in audit trail without changing official status', async () => {
      const p = await createProject({
        project_name: 'Mobile App Beta',
        priority: 'High',
        project_head_id: 'emp-head-1',
        team_lead_id: 'emp-lead-1',
        start_date: `${currentYear}-01-01`,
        expected_end_date: `${currentYear}-06-30`,
        status: 'In Progress',
        progress_percentage: 50,
      })

      // Team Lead submits report with suggested status 'At Risk'
      const report = await submitProjectStatusUpdate({
        project_id: p.id,
        new_status: 'At Risk',
        new_progress: 50,
        delay_reason: 'Waiting on Apple App Store certificate verification',
        update_type: 'Team Lead Report',
        updated_by: 'emp-lead-1',
      })

      expect(report.update_type).toBe('Team Lead Report')

      // Official project status should STILL be 'In Progress' (not overwritten)
      const refreshed = await fetchProjectById(p.id)
      expect(refreshed?.status).toBe('In Progress')

      // But update history contains the Team Lead Report
      const foundReport = refreshed?.status_updates?.find((u) => u.id === report.id)
      expect(foundReport).toBeDefined()
      expect(foundReport?.update_type).toBe('Team Lead Report')
    })
  })

  describe('6. Dashboard Statistics Calculation', () => {
    it('aggregates project metrics accurately', async () => {
      const stats = await fetchProjectDashboardStats()
      expect(stats.total).toBeGreaterThanOrEqual(4)
      expect(stats.inProgress).toBeGreaterThanOrEqual(1)
      expect(stats.atRisk).toBeGreaterThanOrEqual(1)
      expect(stats.completed).toBeGreaterThanOrEqual(1)
    })
  })

  describe('7. Project Updates and Deletion', () => {
    it('updates project metadata and members correctly', async () => {
      const p = await createProject({
        project_name: 'Initial Name',
        priority: 'Low',
        project_head_id: 'emp-head-1',
        team_lead_id: 'emp-lead-1',
        start_date: `${currentYear}-01-01`,
        expected_end_date: `${currentYear}-06-30`,
      })

      const updated = await updateProject(p.id, {
        project_name: 'Updated Name',
        priority: 'Critical',
      })

      expect(updated.project_name).toBe('Updated Name')
      expect(updated.priority).toBe('Critical')
    })

    it('deletes project and its references', async () => {
      const p = await createProject({
        project_name: 'Temporary Project',
        priority: 'Low',
        project_head_id: 'emp-head-1',
        team_lead_id: 'emp-lead-1',
        start_date: `${currentYear}-01-01`,
        expected_end_date: `${currentYear}-06-30`,
      })

      await deleteProject(p.id)
      const found = await fetchProjectById(p.id)
      expect(found).toBeNull()
    })
  })
})
