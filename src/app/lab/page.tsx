'use client'
import { useLabOrders } from '@/hooks/useSupabase'
import { formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { TestTube, ClipboardList, Clock } from 'lucide-react'

export default function LabPage() {
  const { data, loading } = useLabOrders()

  const columns = [
    { key: 'id', label: 'Order ID' },
    { key: 'patient_id', label: 'Patient ID' },
    { key: 'laboratory_id', label: 'Lab ID' },
    { key: 'order_id', label: 'Order Ref' },
    { key: 'start_date', label: 'Date', render: (r: any) => formatDate(r.start_date) },
    { key: 'location_id', label: 'Location' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600"><TestTube className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laboratory</h1>
          <p className="text-sm text-gray-500">Lab test orders and results</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Lab Orders" value={loading ? '...' : data.length.toLocaleString()} icon={ClipboardList} color="purple" />
        <StatCard title="Unique Patients" value={loading ? '...' : new Set(data.map((d: any) => d.patient_id)).size.toLocaleString()} icon={TestTube} color="blue" />
        <StatCard title="Latest Order" value={loading ? '...' : formatDate(data[0]?.start_date)} icon={Clock} color="green" />
      </div>

      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search lab orders..." searchKey="order_id" />
    </div>
  )
}
