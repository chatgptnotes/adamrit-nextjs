'use client'
import { useBillings } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { Receipt } from 'lucide-react'

export default function BillingPage() {
  const { data, loading } = useBillings()
  const totalRevenue = data.reduce((s, b) => s + (b.total_amount || 0), 0)

  const columns = [
    { key: 'id', label: 'Bill #' },
    { key: 'patient_id', label: 'Patient ID' },
    {
      key: 'name', label: 'Patient',
      render: (row: any) => <span className="font-medium">{row.first_name || ''} {row.last_name || ''}</span>
    },
    { key: 'total_amount', label: 'Amount', render: (row: any) => <span className="font-semibold">{formatCurrency(row.total_amount as number)}</span> },
    { key: 'paid_amount', label: 'Paid', render: (row: any) => formatCurrency(row.paid_amount as number) },
    { key: 'billing_date', label: 'Date', render: (row: any) => formatDate(row.billing_date as string) },
    {
      key: 'status', label: 'Status',
      render: (row: any) => {
        const s = (row.status as string) || 'billed'
        const colors: Record<string, string> = { paid: 'bg-green-100 text-green-700', billed: 'bg-yellow-100 text-yellow-700', partial: 'bg-orange-100 text-orange-700' }
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[s] || colors.billed}`}>{s}</span>
      }
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600"><Receipt className="w-5 h-5" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
            <p className="text-sm text-gray-500">{data.length} bills &middot; Total Revenue: {formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>
      <DataTable data={data} columns={columns} loading={loading} searchPlaceholder="Search bills..." searchKey="first_name" />
    </div>
  )
}
