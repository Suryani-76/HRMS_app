import type { Document, Project } from '@/lib/database.types'

export const PROJECT_DOC_TYPES = [
  'Project Specification',
  'BRD / Business Requirements',
  'FRD / Functional Design',
  'System Architecture Diagram',
  'API Documentation',
  'UI / UX Design Asset',
  'Sprint Deliverable',
  'QA / Test Report',
  'Deployment & Release Notes',
  'Meeting Minutes / Handover',
  'Source Code / Patch',
  'Client Deliverable',
  'Other Project Document',
]

export const GENERAL_DOC_TYPES = [
  'Resume',
  'ID Proof',
  'Address Proof',
  'Education',
  'Experience Letter',
  'Offer Letter',
  'Contract',
  'Other Personal Document',
]

const LOCAL_PROJECT_DOCS_KEY = 'hrms_project_documents_v1'

export interface ProjectDocumentGroup {
  projectId: string
  projectCode: string
  projectName: string
  clientName?: string | null
  status?: string | null
  documents: Document[]
  totalSize: number
  lastUpdated: string
}

export function extractDocumentProject(doc: Document): {
  cleanName: string
  projectId?: string
  projectCode?: string
  projectName?: string
} {
  let cleanName = doc.name || 'Untitled Document'
  let projectId = doc.project_id || undefined
  let projectCode = doc.project_code || undefined
  let projectName = doc.project_name || undefined

  // Check if name has embedded [PRJ:{...}] metadata tag
  const match = cleanName.match(/\[PRJ:(\{.*?\})\]/)
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.id && !projectId) projectId = parsed.id
      if (parsed.code && !projectCode) projectCode = parsed.code
      if (parsed.name && !projectName) projectName = parsed.name
      cleanName = cleanName.replace(/\[PRJ:(\{.*?\})\]/g, '').trim()
    } catch (e) {
      console.warn('Failed to parse embedded project metadata:', e)
    }
  }

  return { cleanName, projectId, projectCode, projectName }
}

export function enrichDocument(doc: Document): Document {
  const meta = extractDocumentProject(doc)
  return {
    ...doc,
    name: meta.cleanName,
    project_id: meta.projectId || doc.project_id,
    project_code: meta.projectCode || doc.project_code,
    project_name: meta.projectName || doc.project_name,
  }
}

export function getLocalProjectDocs(): Document[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECT_DOCS_KEY)
    if (raw) {
      const items: Document[] = JSON.parse(raw)
      return items.map(enrichDocument)
    }
  } catch (err) {
    console.warn('Failed to load local project documents:', err)
  }
  return []
}

export function saveLocalProjectDoc(doc: Document) {
  try {
    const existing = getLocalProjectDocs().filter((d) => d.id !== doc.id)
    existing.unshift(enrichDocument(doc))
    localStorage.setItem(LOCAL_PROJECT_DOCS_KEY, JSON.stringify(existing))
  } catch (err) {
    console.warn('Failed to save local project document:', err)
  }
}

export function removeLocalProjectDoc(id: string) {
  try {
    const existing = getLocalProjectDocs().filter((d) => d.id !== id)
    localStorage.setItem(LOCAL_PROJECT_DOCS_KEY, JSON.stringify(existing))
  } catch (err) {
    console.warn('Failed to remove local project document:', err)
  }
}

export function mergeAndEnrichDocuments(remoteDocs: Document[], employeeId?: string): Document[] {
  const localDocs = getLocalProjectDocs()
  const map = new Map<string, Document>()

  // Add remote docs
  for (const doc of remoteDocs) {
    const enriched = enrichDocument(doc)
    map.set(enriched.id, enriched)
  }

  // Add local docs
  for (const doc of localDocs) {
    if (!employeeId || doc.employee_id === employeeId) {
      if (!map.has(doc.id)) {
        map.set(doc.id, enrichDocument(doc))
      } else {
        // Merge project metadata if remote lacked it
        const cur = map.get(doc.id)!
        map.set(doc.id, {
          ...cur,
          project_id: cur.project_id || doc.project_id,
          project_code: cur.project_code || doc.project_code,
          project_name: cur.project_name || doc.project_name,
        })
      }
    }
  }

  const list = Array.from(map.values())
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return list
}

export function groupDocumentsByProject(
  documents: Document[],
  projects: Project[]
): {
  projectGroups: ProjectDocumentGroup[]
  generalDocuments: Document[]
} {
  const projectMap = new Map<string, ProjectDocumentGroup>()

  // Initialize groups for all known projects so empty projects are also discoverable in the directory
  for (const p of projects) {
    projectMap.set(p.id, {
      projectId: p.id,
      projectCode: p.project_code,
      projectName: p.project_name,
      clientName: p.client_name,
      status: p.status,
      documents: [],
      totalSize: 0,
      lastUpdated: p.updated_at || p.created_at,
    })
  }

  const generalDocuments: Document[] = []

  for (const doc of documents) {
    const enriched = enrichDocument(doc)
    const pId = enriched.project_id
    const pCode = enriched.project_code
    const pName = enriched.project_name

    if (pId && projectMap.has(pId)) {
      const group = projectMap.get(pId)!
      group.documents.push(enriched)
      group.totalSize += enriched.file_size || 0
      if (new Date(enriched.created_at).getTime() > new Date(group.lastUpdated).getTime()) {
        group.lastUpdated = enriched.created_at
      }
    } else if (pCode || pName) {
      // Find matching project by code or name
      const matchedProject = projects.find(
        (p) =>
          (pCode && p.project_code.toLowerCase() === pCode.toLowerCase()) ||
          (pName && p.project_name.toLowerCase() === pName.toLowerCase())
      )

      if (matchedProject && projectMap.has(matchedProject.id)) {
        const group = projectMap.get(matchedProject.id)!
        group.documents.push(enriched)
        group.totalSize += enriched.file_size || 0
      } else {
        // Create custom group for this project code/name
        const customKey = pCode || pName || 'custom-project'
        if (!projectMap.has(customKey)) {
          projectMap.set(customKey, {
            projectId: customKey,
            projectCode: pCode || 'PRJ-SPEC',
            projectName: pName || pCode || 'Project Deliverables',
            documents: [],
            totalSize: 0,
            lastUpdated: enriched.created_at,
          })
        }
        const group = projectMap.get(customKey)!
        group.documents.push(enriched)
        group.totalSize += enriched.file_size || 0
      }
    } else {
      generalDocuments.push(enriched)
    }
  }

  // Convert to array and sort groups: projects with documents first, then alphabetically by code
  const projectGroups = Array.from(projectMap.values()).sort((a, b) => {
    if (a.documents.length > 0 && b.documents.length === 0) return -1
    if (a.documents.length === 0 && b.documents.length > 0) return 1
    return a.projectCode.localeCompare(b.projectCode)
  })

  return { projectGroups, generalDocuments }
}

export function filterProjectGroups(
  groups: ProjectDocumentGroup[],
  query: string,
  selectedCode?: string
): ProjectDocumentGroup[] {
  let filtered = groups

  if (selectedCode && selectedCode !== 'all') {
    filtered = filtered.filter(
      (g) =>
        g.projectCode.toLowerCase() === selectedCode.toLowerCase() ||
        g.projectId.toLowerCase() === selectedCode.toLowerCase()
    )
  }

  if (query.trim()) {
    const q = query.toLowerCase().trim()
    filtered = filtered.filter(
      (g) =>
        g.projectCode.toLowerCase().includes(q) ||
        g.projectName.toLowerCase().includes(q) ||
        (g.clientName && g.clientName.toLowerCase().includes(q)) ||
        g.documents.some(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            (d.doc_type && d.doc_type.toLowerCase().includes(q)) ||
            (d.employee && `${d.employee.first_name} ${d.employee.last_name}`.toLowerCase().includes(q))
        )
    )
  }

  return filtered
}
