'use client'
import { useDashboardStats } from '@/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import { Users, Bed, CalendarDays, Receipt, IndianRupee, FileCheck, Stethoscope, Syringe, TestTube, Pill } from 'lucide-react'

export default function Dashboard() {
  const { stats, loading } = useDashboardStats()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">adamrit.com — Hope Hospital, Nagpur — Full CakePHP Data Migration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        <StatCard title="Patients" value={loading ? '...' : stats.patients.toLocaleString()} icon={Users} color="blue" subtitle="Registered" />
        <StatCard title="IPD Admissions" value={loading ? '...' : stats.admitted.toLocaleString()} icon={Bed} color="green" subtitle="Ward patients" />
        <StatCard title="Appointments" value={loading ? '...' : stats.appointments.toLocaleString()} icon={CalendarDays} color="purple" subtitle="OPD bookings" />
        <StatCard title="Bills" value={loading ? '...' : stats.billings.toLocaleString()} icon={Receipt} color="orange" subtitle="Billing records" />
        <StatCard title="Revenue" value={loading ? '...' : formatCurrency(stats.revenue)} icon={IndianRupee} color="green" subtitle="Total billed" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Discharged" value={loading ? '...' : stats.discharged.toLocaleString()} icon={FileCheck} color="red" subtitle="Summaries" />
        <StatCard title="Doctors" value={loading ? '...' : stats.doctors.toLocaleString()} icon={Stethoscope} color="blue" subtitle="On panel" />
        <StatCard title="Surgeries" value={loading ? '...' : stats.surgeries.toLocaleString()} icon={Syringe} color="purple" subtitle="Surgery types" />
        <StatCard title="Lab Orders" value={loading ? '...' : stats.labOrders.toLocaleString()} icon={TestTube} color="orange" subtitle="Test orders" />
        <StatCard title="Pharmacy" value={loading ? '...' : stats.pharmacyItems.toLocaleString()} icon={Pill} color="green" subtitle="Medicine items" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/patients', label: 'View Patients', color: 'bg-blue-500' },
              { href: '/ipd', label: 'IPD Dashboard', color: 'bg-emerald-500' },
              { href: '/billing', label: 'Billing', color: 'bg-orange-500' },
              { href: '/lab', label: 'Lab Orders', color: 'bg-purple-500' },
              { href: '/pharmacy', label: 'Pharmacy', color: 'bg-teal-500' },
              { href: '/reports', label: 'Reports', color: 'bg-indigo-500' },
            ].map(a => (
              <a key={a.href} href={a.href} className={`${a.color} text-white rounded-lg px-4 py-3 text-sm font-medium hover:opacity-90 transition-opacity text-center`}>
                {a.label}
              </a>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Migration Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Source</dt><dd className="font-medium">CakePHP MySQL (db_hope.sql)</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Dump Size</dt><dd className="font-medium">360 MB (556 tables)</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Records Migrated</dt><dd className="font-medium text-emerald-600">200,044</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Tables Migrated</dt><dd className="font-medium">14 key tables</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Target</dt><dd className="font-medium">Supabase PostgreSQL</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Frontend</dt><dd className="font-medium">Next.js 14 + TypeScript</dd></div>
          </dl>
        </div>
      </div>
    </div>
  )
}
