import * as React from 'react'
import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmployeeOption {
  id: string
  first_name: string
  last_name: string
  email?: string
  employee_code?: string | null
  designation?: { name: string } | null
  department?: { name: string } | null
}

interface SearchableEmployeeSelectProps {
  employees: EmployeeOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Allow clearing the selection */
  allowClear?: boolean
  /** Optional label suffix or full string displayed in trigger */
  renderLabel?: (emp: EmployeeOption) => string
  /** Optional custom rendering of each employee item in the dropdown list */
  renderItem?: (emp: EmployeeOption, isSelected: boolean) => React.ReactNode
}

/**
 * A searchable dropdown for selecting a single employee.
 * Replaces the plain <Select> whenever the employee list is long.
 *
 * Usage:
 *   <SearchableEmployeeSelect
 *     employees={employees}
 *     value={formHeadId}
 *     onValueChange={setFormHeadId}
 *     placeholder="Designate Project Head..."
 *   />
 */
export function SearchableEmployeeSelect({
  employees,
  value,
  onValueChange,
  placeholder = 'Select employee...',
  className,
  disabled = false,
  allowClear = false,
  renderLabel,
  renderItem,
}: SearchableEmployeeSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === value) ?? null,
    [employees, value]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
        (e.designation?.name && e.designation.name.toLowerCase().includes(q)) ||
        (e.department?.name && e.department.name.toLowerCase().includes(q))
    )
  }, [employees, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleSelect = (emp: EmployeeOption) => {
    onValueChange(emp.id)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange('')
    setSearch('')
  }

  const getLabel = (emp: EmployeeOption): string => {
    if (renderLabel) return renderLabel(emp)
    const designationPart = emp.designation?.name ? ` (${emp.designation.name})` : ''
    return `${emp.first_name} ${emp.last_name}${designationPart}`
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-1 ring-ring',
          !selectedEmployee && 'text-muted-foreground'
        )}
      >
        <span className="line-clamp-1 text-left">
          {selectedEmployee ? getLabel(selectedEmployee) : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-1">
          {allowClear && selectedEmployee && (
            <span
              role="button"
              onClick={handleClear}
              className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')}
          />
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-md border bg-popover text-popover-foreground shadow-md">
          {/* Search input */}
          <div className="flex items-center border-b px-3 py-2 gap-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, role..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  setSearch('')
                } else if (e.key === 'Enter' && filtered.length === 1) {
                  handleSelect(filtered[0])
                }
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No employees found
              </div>
            ) : (
              filtered.map((emp) => {
                const isSelected = emp.id === value
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelect(emp)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2.5 py-1.5 text-xs outline-none transition-colors text-left',
                      'hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent/70 font-medium'
                    )}
                  >
                    {renderItem ? (
                      renderItem(emp, isSelected)
                    ) : (
                      <>
                        <span className="flex-1 text-left">
                          <span className="font-medium text-foreground">
                            {emp.first_name} {emp.last_name}
                          </span>
                          {emp.employee_code && (
                            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                              {emp.employee_code}
                            </span>
                          )}
                          {(emp.designation?.name || emp.department?.name) && (
                            <span className="block text-[11px] text-muted-foreground mt-0.5">
                              {[emp.designation?.name, emp.department?.name]
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          )}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0 ml-2 text-primary" />
                        )}
                      </>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer hint */}
          {employees.length > 10 && (
            <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground">
              {filtered.length} of {employees.length} employees
            </div>
          )}
        </div>
      )}
    </div>
  )
}

