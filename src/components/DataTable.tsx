'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'

interface Column {
  key: string
  label: string
  render?: (row: any) => React.ReactNode
}

interface DataTableProps {
  data: any[]
  columns: Column[]
  loading?: boolean
  searchPlaceholder?: string
  searchKey?: string
}

export default function DataTable({ data, columns, loading, searchPlaceholder = 'Search...', searchKey }: DataTableProps) {
  const [search, setSearch] = useState('')

  const filtered = searchKey
    ? data.filter(row => {
        const val = row[searchKey]
        return val && String(val).toLowerCase().includes(search.toLowerCase())
      })
    : data

  return (
    <div>
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder={searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map(col => (
                  <th key={col.key} className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{columns.map(col => <td key={col.key} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">No records found</td></tr>
              ) : filtered.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  {columns.map(col => <td key={col.key} className="px-4 py-3 text-gray-700">{col.render ? col.render(row) : String(row[col.key] ?? '—')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Showing {filtered.length} of {data.length} records</div>
      </div>
    </div>
  )
}
