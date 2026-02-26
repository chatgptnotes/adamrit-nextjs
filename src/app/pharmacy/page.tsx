'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { Pill, ShoppingCart, Package, Tag } from 'lucide-react'

export default function PharmacyPage() {
  const [items, setItems] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [details, setDetails] = useState<any[]>([])
  const [rates, setRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'items' | 'sales' | 'details' | 'rates'>('items')

  useEffect(() => {
    async function fetch() {
      const [i, s, d, r] = await Promise.all([
        supabase.from('pharmacy_items_full').select('*').order('product_name').limit(500),
        supabase.from('pharmacy_sales_bills').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('pharmacy_sales_bill_details').select('*').order('id', { ascending: false }).limit(500),
        supabase.from('pharmacy_item_rates').select('*').order('id', { ascending: false }).limit(500),
      ])
      setItems(i.data || [])
      setSales(s.data || [])
      setDetails(d.data || [])
      setRates(r.data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const totalRevenue = sales.reduce((s, r) => s + (r.total || 0), 0)

  const itemCols = [
    { key: 'id', label: 'ID' },
    { key: 'product_name', label: 'Product', render: (r: any) => <span className="font-medium">{r.product_name || r.name || '—'}</span> },
    { key: 'code', label: 'Code' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'pack', label: 'Pack' },
    { key: 'stock', label: 'Stock', render: (r: any) => {
      const s = r.stock || 0
      return <span className={s < 10 ? 'text-red-600 font-semibold' : 'text-green-600'}>{s}</span>
    }},
  ]

  const salesCols = [
    { key: 'id', label: 'ID' },
    { key: 'patient_id', label: 'Patient' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'total', label: 'Total', render: (r: any) => <span className="font-semibold">{formatCurrency(r.total)}</span> },
    { key: 'discount', label: 'Discount' },
    { key: 'payment_mode', label: 'Mode' },
    { key: 'bill_code', label: 'Bill Code' },
  ]

  const detailCols = [
    { key: 'id', label: 'ID' },
    { key: 'pharmacy_sales_bill_id', label: 'Bill ID' },
    { key: 'pharmacy_item_id', label: 'Item ID' },
    { key: 'quantity', label: 'Qty', render: (r: any) => <span className="font-medium">{r.quantity}</span> },
    { key: 'rate', label: 'Rate', render: (r: any) => r.rate ? `₹${r.rate}` : '—' },
    { key: 'amount', label: 'Amount', render: (r: any) => <span className="font-semibold">{r.amount ? `₹${r.amount}` : '—'}</span> },
    { key: 'batch_no', label: 'Batch' },
    { key: 'expiry_date', label: 'Expiry' },
  ]

  const rateCols = [
    { key: 'id', label: 'ID' },
    { key: 'pharmacy_item_id', label: 'Item ID' },
    { key: 'mrp', label: 'MRP', render: (r: any) => r.mrp ? `₹${r.mrp}` : '—' },
    { key: 'purchase_rate', label: 'Purchase', render: (r: any) => r.purchase_rate ? `₹${r.purchase_rate}` : '—' },
    { key: 'selling_rate', label: 'Selling', render: (r: any) => r.selling_rate ? `₹${r.selling_rate}` : '—' },
    { key: 'batch_no', label: 'Batch' },
    { key: 'stock', label: 'Stock' },
    { key: 'expiry_date', label: 'Expiry' },
  ]

  const tabs = [
    { key: 'items', label: `Items (${items.length})` },
    { key: 'sales', label: `Sales (${sales.length})` },
    { key: 'details', label: `Line Items (${details.length})` },
    { key: 'rates', label: `Rates (${rates.length})` },
  ] as const

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-teal-50 rounded-lg text-teal-600"><Pill className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
          <p className="text-sm text-gray-500">Inventory, sales, rates & billing details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Medicine Items" value={loading ? '...' : items.length.toLocaleString()} icon={Package} color="green" />
        <StatCard title="Sales Bills" value={loading ? '...' : sales.length.toLocaleString()} icon={ShoppingCart} color="blue" />
        <StatCard title="Revenue" value={loading ? '...' : formatCurrency(totalRevenue)} icon={Pill} color="purple" />
        <StatCard title="Item Rates" value={loading ? '...' : rates.length.toLocaleString()} icon={Tag} color="orange" />
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'items' && <DataTable data={items} columns={itemCols} loading={loading} searchPlaceholder="Search medicines..." searchKey="product_name" />}
      {tab === 'sales' && <DataTable data={sales} columns={salesCols} loading={loading} searchPlaceholder="Search sales..." searchKey="customer_name" />}
      {tab === 'details' && <DataTable data={details} columns={detailCols} loading={loading} searchPlaceholder="Search line items..." searchKey="batch_no" />}
      {tab === 'rates' && <DataTable data={rates} columns={rateCols} loading={loading} searchPlaceholder="Search rates..." searchKey="batch_no" />}
    </div>
  )
}
