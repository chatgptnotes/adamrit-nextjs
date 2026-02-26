'use client'
import { usePharmacyItems, usePharmacySales } from '@/hooks/useSupabase'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { Pill, ShoppingCart, Package } from 'lucide-react'

export default function PharmacyPage() {
  const { data: items, loading: itemsLoading } = usePharmacyItems()
  const { data: sales, loading: salesLoading } = usePharmacySales()

  const itemCols = [
    { key: 'id', label: 'ID' },
    { key: 'product_name', label: 'Product Name', render: (r: any) => <span className="font-medium">{r.product_name || r.name || '—'}</span> },
    { key: 'code', label: 'Code' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'pack', label: 'Pack Size' },
    { key: 'stock', label: 'Stock', render: (r: any) => {
      const s = r.stock || 0
      return <span className={s < 10 ? 'text-red-600 font-semibold' : 'text-green-600'}>{s}</span>
    }},
  ]

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-teal-50 rounded-lg text-teal-600"><Pill className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
          <p className="text-sm text-gray-500">Medicine inventory and sales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Medicine Items" value={itemsLoading ? '...' : items.length.toLocaleString()} icon={Package} color="green" />
        <StatCard title="Sales Bills" value={salesLoading ? '...' : sales.length.toLocaleString()} icon={ShoppingCart} color="blue" />
        <StatCard title="Total Revenue" value={salesLoading ? '...' : `₹${Math.round(sales.reduce((s: number, r: any) => s + (r.total || 0), 0)).toLocaleString()}`} icon={Pill} color="purple" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-3">Medicine Inventory (Top 500)</h3>
      <DataTable data={items} columns={itemCols} loading={itemsLoading} searchPlaceholder="Search medicines..." searchKey="product_name" />
    </div>
  )
}
