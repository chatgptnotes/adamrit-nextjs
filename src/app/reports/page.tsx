'use client'
import { useDashboardStats, useWards } from '@/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import { BarChart3, Users, Bed, Receipt, IndianRupee, Building } from 'lucide-react'

export default function ReportsPage() {
  const { stats, loading } = useDashboardStats()
  const { data: wards, loading: wardsLoading } = useWards()

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600"><BarChart3 className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Hospital analytics and summaries</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Patients" value={loading ? '...' : stats.patients} icon={Users} color="blue" />
        <StatCard title="Admissions" value={loading ? '...' : stats.admitted} icon={Bed} color="green" />
        <StatCard title="Total Bills" value={loading ? '...' : stats.billings} icon={Receipt} color="orange" />
        <StatCard title="Revenue" value={loading ? '...' : formatCurrency(stats.revenue)} icon={IndianRupee} color="green" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building className="w-4 h-4 text-gray-400" /> Wards
        </h3>
        {wardsLoading ? (
          <div className="animate-pulse space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="h-10 bg-gray-100 rounded" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Ward</th><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Floor</th><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Total Beds</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {wards.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{w.name}</td>
                    <td className="px-4 py-3">{w.floor || '—'}</td>
                    <td className="px-4 py-3">{w.total_beds || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
