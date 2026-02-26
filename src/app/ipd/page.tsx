'use client'
import { useWardPatients } from '@/hooks/useSupabase'
import { formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { Bed } from 'lucide-react'

export default function IPDPage() {
  const { data, loading } = useWardPatients()

  const columns = [
    { key: 'patient_id', label: 'Patient ID' },
    {
      key: 'name', label: 'Patient',
      render: (row: any) => <span className="font-medium">{row.first_name || ''} {row.last_name || ''}</span>
    },
    { key: 'ward_id', label: 'Ward', render: (row: any) => `Ward ${row.ward_id}` },
    { key: 'bed_number', label: 'Bed' },
    { key: 'doctor_name', label: 'Doctor' },
    { key: 'admission_date', label: 'Admitted', render: (row: any) => formatDate(row.admission_date as string) },
    {
      key: 'status', label: 'Status',
      render: (row: any) => {
        const s = (row.status as string) || 'admitted'
        const c = s === 'discharged' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700'
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c}`}>{s}</span>
      }
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600"><Bed className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IPD Dashboard</h1>
          <p className="text-sm text-gray-500">{data.length} admission records</p>
        </div>
      </div>
      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search admissions..." searchKey="first_name" />
    </div>
  )
}
