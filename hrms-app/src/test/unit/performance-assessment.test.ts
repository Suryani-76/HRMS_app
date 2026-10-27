import { describe, it, expect, beforeEach } from 'vitest'
import {
  IT_ASSESSMENT_TEMPLATE,
  NON_IT_ASSESSMENT_TEMPLATE,
  getTemplateForTrack,
  calculateAssessmentMetrics,
  getEmployeeAssessment,
  saveAssessmentDraft,
  submitAssessmentForReview,
  submitReviewerGrading,
  type AssessmentItem,
} from '@/lib/api/performanceAssessment'

describe('Performance Assessment Templates & Calculations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('IT assessment template has 14 KPI items with total weight matching the sheet (105%)', () => {
    expect(IT_ASSESSMENT_TEMPLATE).toHaveLength(14)
    const totalWeight = IT_ASSESSMENT_TEMPLATE.reduce((sum, item) => sum + item.weight, 0)
    expect(totalWeight).toBe(105)

    // Verify key IT items exist
    const names = IT_ASSESSMENT_TEMPLATE.map((i) => i.successFactor)
    expect(names).toContain('Code Quality & Best Practices')
    expect(names).toContain('Delivery & Productivity')
    expect(names).toContain('Quality / Defect Management')
    expect(names).toContain('Documentation')
  })

  it('Non-IT assessment template has 14 KPI items with total weight matching the sheet (106%)', () => {
    expect(NON_IT_ASSESSMENT_TEMPLATE).toHaveLength(14)
    const totalWeight = NON_IT_ASSESSMENT_TEMPLATE.reduce((sum, item) => sum + item.weight, 0)
    expect(totalWeight).toBe(106)

    // Verify key Non-IT items exist
    const names = NON_IT_ASSESSMENT_TEMPLATE.map((i) => i.successFactor)
    expect(names).toContain('Business / Functional Knowledge')
    expect(names).toContain('Goal & Target Achievement')
    expect(names).toContain('Digital Markets / Business Performance')
    expect(names).toContain('Analytics & Data-driven Decisions')
  })

  it('calculates metrics accurately for checked goals and unrated items', () => {
    const items = getTemplateForTrack('IT')
    expect(items).toHaveLength(14)

    // Check 3 goals
    items[0].goalReached = true // 10%
    items[1].goalReached = true // 10%
    items[4].goalReached = true // 5%

    const metrics = calculateAssessmentMetrics(items)
    expect(metrics.totalGoalsReached).toBe(3)
    expect(metrics.totalGoalsCount).toBe(14)
    expect(metrics.reachedWeight).toBe(24) // 25 / 105 normalized = 24%
    expect(metrics.overallScore).toBe(0)
    expect(metrics.performanceBand).toBe('Needs Assessment')
  })

  it('calculates weighted scores correctly when HR rates responses', () => {
    const items = getTemplateForTrack('IT')

    // Mark and rate all items with 5 stars
    items.forEach((item) => {
      item.goalReached = true
      item.reviewerRating = 5
    })

    const metrics = calculateAssessmentMetrics(items)
    expect(metrics.totalGoalsReached).toBe(14)
    expect(metrics.reachedWeight).toBe(100)
    expect(metrics.overallScore).toBe(5)
    expect(metrics.overallPercentage).toBe(100)
    expect(metrics.performanceBand).toContain('Outstanding')
  })

  it('correctly maps 4-star ratings to Exceeds Expectations band', () => {
    const items = getTemplateForTrack('NON_IT')

    // Rate with 4 stars
    items.forEach((item) => {
      item.reviewerRating = 4
    })

    const metrics = calculateAssessmentMetrics(items)
    expect(metrics.overallScore).toBe(4)
    expect(metrics.overallPercentage).toBe(80)
    expect(metrics.performanceBand).toContain('Exceeds Expectations')
  })

  it('creates, saves draft, submits to HR, and finalizes review with persistence', async () => {
    const empId = 'emp-test-123'
    const assessment = getEmployeeAssessment(empId, 'IT', 'Q4 2026', {
      name: 'Priya Sharma',
      code: 'EMP-001',
      role: 'Full Stack Engineer',
      department: 'Technology',
    })

    expect(assessment.status).toBe('draft')
    expect(assessment.items).toHaveLength(14)

    // Candidate checks 5 goals
    assessment.items[0].goalReached = true
    assessment.items[0].employeeComment = 'Delivered payment gateway module on time'
    assessment.items[1].goalReached = true
    assessment.items[2].goalReached = true

    const draft = await saveAssessmentDraft(assessment)
    expect(draft.totalGoalsReached).toBe(3)

    // Submit to HR
    const submitted = await submitAssessmentForReview(draft)
    expect(submitted.status).toBe('submitted')
    expect(submitted.submittedAt).toBeDefined()

    // HR reviews and grades
    submitted.items[0].reviewerRating = 5
    submitted.items[0].reviewerComment = 'Excellent quality and clean architecture'
    submitted.items[1].reviewerRating = 4
    submitted.items[2].reviewerRating = 4

    const finalized = await submitReviewerGrading(
      submitted,
      'reviewer-hr-1',
      'HR Manager',
      'Strong technical performance this quarter'
    )

    expect(finalized.status).toBe('reviewed')
    expect(finalized.reviewerName).toBe('HR Manager')
    expect(finalized.reviewedAt).toBeDefined()
    expect(finalized.overallScore).toBeGreaterThan(0)

    // Verify retrieving again yields the saved reviewed state
    const reloaded = getEmployeeAssessment(empId, 'IT', 'Q4 2026')
    expect(reloaded.status).toBe('reviewed')
    expect(reloaded.totalGoalsReached).toBe(3)
    expect(reloaded.reviewerFeedback).toBe('Strong technical performance this quarter')
  })
})
