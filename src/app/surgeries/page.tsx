'use client'
import { useSurgeries } from '@/hooks/useSupabase'
import DataTable from '@/components/DataTable'
import { Syringe } from 'lucide-react'

export default function SurgeriesPage() {
  const { data, loading } = useSurgeries()

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Surgery Name', render: (r: any) => <span className="font-medium">{r.name || '—'}</span> },
    { key: 'charges', label: 'Charges', render: (r: any) => r.charges ? `₹${Number(r.charges).toLocaleString()}` : '—' },
    { key: 'service_group', label: 'Service Group' },
    { key: 'surgery_category_id', label: 'Category ID' },
    { key: 'description', label: 'Description', render: (r: any) => <span className="text-gray-500 text-xs truncate max-w-[200px] block">{r.description || '—'}</span> },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600"><Syringe className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Surgeries</h1>
          <p className="text-sm text-gray-500">{loading ? '...' : data.length} surgery types</p>
        </div>
      </div>
      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search surgeries..." searchKey="name" />
    </div>
  )
}
