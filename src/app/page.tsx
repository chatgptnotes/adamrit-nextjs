'use client'
import { useDashboardStats } from '@/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import { Users, Bed, CalendarDays, Receipt, IndianRupee, FileCheck } from 'lucide-react'

export default function Dashboard() {
  const { stats, loading } = useDashboardStats()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome to Adamrit HMS — Hope Hospital, Nagpur</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Patients" value={loading ? '...' : stats.patients} icon={Users} color="blue" subtitle="All registered" />
        <StatCard title="Currently Admitted" value={loading ? '...' : stats.admitted} icon={Bed} color="green" subtitle="IPD patients" />
        <StatCard title="Appointments" value={loading ? '...' : stats.appointments} icon={CalendarDays} color="purple" subtitle="Total booked" />
        <StatCard title="Total Bills" value={loading ? '...' : stats.billings} icon={Receipt} color="orange" subtitle="Generated" />
        <StatCard title="Revenue" value={loading ? '...' : formatCurrency(stats.revenue)} icon={IndianRupee} color="green" subtitle="Total billed" />
        <StatCard title="Discharged" value={loading ? '...' : stats.discharged} icon={FileCheck} color="red" subtitle="Summaries" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/patients', label: 'View Patients', color: 'bg-blue-500' },
              { href: '/ipd', label: 'IPD Dashboard', color: 'bg-emerald-500' },
              { href: '/billing', label: 'Billing', color: 'bg-orange-500' },
              { href: '/reports', label: 'Reports', color: 'bg-purple-500' },
            ].map(a => (
              <a key={a.href} href={a.href} className={`${a.color} text-white rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity text-center`}>
                {a.label}
              </a>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">System Info</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Platform</dt><dd className="font-medium">Next.js 14 + Supabase</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Database</dt><dd className="font-medium">PostgreSQL (Supabase)</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Hospital</dt><dd className="font-medium">Hope Hospital, Nagpur</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Data Source</dt><dd className="font-medium">Migrated from CakePHP</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Records</dt><dd className="font-medium">236 patients, 1466 bills</dd></div>
          </dl>
        </div>
      </div>
    </div>
  )
}
