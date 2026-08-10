import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/page-header'
import { useAuth } from '@/features/auth/auth-context'
import type { RecruiterIncentive, UserProfile } from '@/lib/database.types'
import { TableSkeleton } from '@/components/shared/skeletons'
import { EmptyState } from '@/components/shared/empty-state'
import { Award } from 'lucide-react'
import { formatCurrency } from '@/lib/format'

export default function IncentivesDashboardPage() {
  const { isManager } = useAuth()
  const [incentives, setIncentives] = useState<(RecruiterIncentive & { recruiter: UserProfile })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data, error } = await supabase
        .from('recruiter_incentives')
        .select('*, recruiter:users(*)')
        .order('month', { ascending: false })
      
      if (!error && data) {
        setIncentives(data as any[])
      }
      setLoading(false)
    }
    loadData()
  }, [])

  if (!isManager) {
    return <PageHeader title="Incentives" description="Only managers can view the incentives dashboard." />
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Recruiter Incentives" 
        description="Track monthly targets and incentives for the recruitment team." 
      />

      {loading ? (
        <TableSkeleton rows={5} />
      ) : incentives.length === 0 ? (
        <EmptyState 
          title="No incentives data" 
          description="Incentives will appear here once calculated for the month." 
          icon={Award} 
        />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3">Recruiter</th>
                  <th className="px-4 py-3 text-center">IT Hires</th>
                  <th className="px-4 py-3 text-center">Non-IT Hires</th>
                  <th className="px-4 py-3 text-right">Points Earned</th>
                  <th className="px-4 py-3 text-right">Salary Bonus</th>
                </tr>
              </thead>
              <tbody>
                {incentives.map((inc) => (
                  <tr key={inc.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{inc.month}</td>
                    <td className="px-4 py-3">{inc.recruiter?.email || 'Unknown'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{inc.it_hires}</td>
                    <td className="px-4 py-3 text-center font-semibold text-purple-600">{inc.non_it_hires}</td>
                    <td className="px-4 py-3 text-right font-medium">{inc.gift_points}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatCurrency(inc.salary_bonus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
