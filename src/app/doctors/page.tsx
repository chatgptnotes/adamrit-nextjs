'use client'
import { useDoctors } from '@/hooks/useSupabase'
import DataTable from '@/components/DataTable'
import { Stethoscope } from 'lucide-react'

export default function DoctorsPage() {
  const { data, loading } = useDoctors()

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'doctor_name', label: 'Name', render: (r: any) => <span className="font-medium text-emerald-700">{r.doctor_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '—'}</span> },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'charges', label: 'Consultation', render: (r: any) => r.charges ? `₹${r.charges}` : '—' },
    { key: 'surgery_charges', label: 'Surgery Charges', render: (r: any) => r.surgery_charges ? `₹${r.surgery_charges}` : '—' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600"><Stethoscope className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
          <p className="text-sm text-gray-500">{loading ? '...' : data.length} doctors on panel</p>
        </div>
      </div>
      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search doctors..." searchKey="doctor_name" />
    </div>
  )
}
