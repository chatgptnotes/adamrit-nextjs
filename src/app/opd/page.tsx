'use client'
import { useAppointments } from '@/hooks/useSupabase'
import { formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { ClipboardList } from 'lucide-react'

export default function OPDPage() {
  const { data, loading } = useAppointments()

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'name', label: 'Patient',
      render: (row: any) => <span className="font-medium">{row.first_name || ''} {row.last_name || ''}</span>
    },
    { key: 'doctor_name', label: 'Doctor' },
    { key: 'appointment_date', label: 'Date', render: (row: any) => formatDate(row.appointment_date as string) },
    { key: 'start_time', label: 'Time' },
    {
      key: 'status', label: 'Status',
      render: (row: any) => {
        const s = (row.status as string) || 'scheduled'
        const colors: Record<string, string> = { scheduled: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' }
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || colors.scheduled}`}>{s}</span>
      }
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600"><ClipboardList className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OPD — Appointments</h1>
          <p className="text-sm text-gray-500">{data.length} appointments</p>
        </div>
      </div>
      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search appointments..." searchKey="first_name" />
    </div>
  )
}
