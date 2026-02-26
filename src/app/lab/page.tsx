'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { TestTube, ClipboardList, Beaker, FlaskConical } from 'lucide-react'

export default function LabPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [results, setResults] = useState<any[]>([])
  const [params, setParams] = useState<any[]>([])
  const [labs, setLabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'orders' | 'results' | 'parameters' | 'labs'>('orders')

  useEffect(() => {
    async function fetch() {
      const [o, r, p, l] = await Promise.all([
        supabase.from('laboratory_test_orders').select('*').order('start_date', { ascending: false }).limit(500),
        supabase.from('laboratory_results').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('laboratory_parameters').select('*').order('name').limit(500),
        supabase.from('laboratories').select('*').order('name'),
      ])
      setOrders(o.data || [])
      setResults(r.data || [])
      setParams(p.data || [])
      setLabs(l.data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const orderCols = [
    { key: 'id', label: 'ID' },
    { key: 'patient_id', label: 'Patient ID' },
    { key: 'laboratory_id', label: 'Lab ID' },
    { key: 'order_id', label: 'Order Ref' },
    { key: 'start_date', label: 'Date', render: (r: any) => formatDate(r.start_date) },
  ]

  const resultCols = [
    { key: 'id', label: 'ID' },
    { key: 'patient_id', label: 'Patient' },
    { key: 'result_value', label: 'Result', render: (r: any) => <span className="font-semibold">{r.result_value || '—'}</span> },
    { key: 'unit', label: 'Unit' },
    { key: 'normal_range', label: 'Normal Range' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date', render: (r: any) => formatDate(r.created_at) },
  ]

  const paramCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Parameter', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'unit', label: 'Unit' },
    { key: 'normal_range', label: 'Normal Range' },
    { key: 'laboratory_id', label: 'Lab ID' },
  ]

  const labCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Lab Name', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'code', label: 'Code' },
    { key: 'department', label: 'Department' },
  ]

  const tabs = [
    { key: 'orders', label: `Orders (${orders.length})` },
    { key: 'results', label: `Results (${results.length})` },
    { key: 'parameters', label: `Parameters (${params.length})` },
    { key: 'labs', label: `Labs (${labs.length})` },
  ] as const

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600"><TestTube className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laboratory</h1>
          <p className="text-sm text-gray-500">Test orders, results, parameters & labs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Test Orders" value={loading ? '...' : orders.length.toLocaleString()} icon={ClipboardList} color="purple" />
        <StatCard title="Results" value={loading ? '...' : results.length.toLocaleString()} icon={Beaker} color="blue" />
        <StatCard title="Parameters" value={loading ? '...' : params.length.toLocaleString()} icon={FlaskConical} color="green" />
        <StatCard title="Labs" value={loading ? '...' : labs.length.toLocaleString()} icon={TestTube} color="orange" />
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <DataTable data={orders} columns={orderCols} loading={loading} searchPlaceholder="Search orders..." searchKey="order_id" />}
      {tab === 'results' && <DataTable data={results} columns={resultCols} loading={loading} searchPlaceholder="Search results..." searchKey="result_value" />}
      {tab === 'parameters' && <DataTable data={params} columns={paramCols} loading={loading} searchPlaceholder="Search parameters..." searchKey="name" />}
      {tab === 'labs' && <DataTable data={labs} columns={labCols} loading={loading} searchPlaceholder="Search labs..." searchKey="name" />}
    </div>
  )
}
