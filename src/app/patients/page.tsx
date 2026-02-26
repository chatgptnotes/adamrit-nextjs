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
          {row.full_name || `${row.patient_id || ''}`}
        </Link>
      )
    },
    { key: 'sex', label: 'Gender' },
    { key: 'patient_id', label: 'Patient ID' },
    { key: 'claim_status', label: 'Claim Status',
      render: (row: any) => {
        const s = row.claim_status || '—'
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{s}</span>
      }
    },
    { key: 'location_id', label: 'Location' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <p className="text-sm text-gray-500 mt-1">{loading ? '...' : data.length.toLocaleString()} registered patients (showing top 500)</p>
      </div>
      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search patients..." searchKey="full_name" />
    </div>
  )
}
