'use client'
import { useDischargeSummaries } from '@/hooks/useSupabase'
import { formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { FileText } from 'lucide-react'

export default function DischargePage() {
  const { data, loading } = useDischargeSummaries()

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'patient_id', label: 'Patient ID' },
    {
      key: 'name', label: 'Patient',
      render: (row: any) => <span className="font-medium">{row.first_name || ''} {row.last_name || ''}</span>
    },
    { key: 'discharge_date', label: 'Discharge Date', render: (row: any) => formatDate(row.discharge_date as string) },
    {
      key: 'diagnosis', label: 'Diagnosis',
      render: (row: any) => <span className="max-w-xs truncate block">{(row.diagnosis as string) || '—'}</span>
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-red-50 rounded-lg text-red-600"><FileText className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discharge Summaries</h1>
          <p className="text-sm text-gray-500">{data.length} discharge records</p>
        </div>
      </div>
      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search..." searchKey="first_name" />
    </div>
  )
}
