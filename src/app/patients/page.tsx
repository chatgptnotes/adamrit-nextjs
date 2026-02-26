'use client'
import { usePatients } from '@/hooks/useSupabase'
import DataTable from '@/components/DataTable'
import Link from 'next/link'

export default function PatientsPage() {
  const { data, loading } = usePatients()

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'name', label: 'Patient Name',
      render: (row: any) => (
        <Link href={`/patients/${row.id}`} className="text-emerald-600 hover:underline font-medium">
          {row.first_name || ''} {row.last_name || ''}
        </Link>
      )
    },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'status', label: 'Status',
      render: (row: any) => {
        const s = (row.status as string) || 'active'
        const colors: Record<string, string> = { active: 'bg-green-100 text-green-700', discharged: 'bg-gray-100 text-gray-600', admitted: 'bg-blue-100 text-blue-700' }
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || colors.active}`}>{s}</span>
      }
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-1">{data.length} registered patients</p>
        </div>
      </div>
      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search patients..." searchKey="first_name" />
    </div>
  )
}
