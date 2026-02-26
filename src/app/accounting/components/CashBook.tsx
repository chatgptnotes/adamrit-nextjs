'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BookOpen, Calendar } from 'lucide-react'

interface Transaction {
  id: string
  type: string
  description: string
  receipt: number
  payment: number
  balance: number
  time: string
  voucher_no: string
}

export default function CashBook() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState({ openingBalance: 0, totalReceipts: 0, totalPayments: 0, closingBalance: 0 })

  useEffect(() => { fetchData() }, [selectedDate])

  async function fetchData() {
    setLoading(true)
    try {
      const { data: receipts } = await supabaseProd
        .from('account_receipts')
        .select('*')
        .gte('date', selectedDate)
        .lte('date', selectedDate + 'T23:59:59')

      const { data: entries } = await supabaseProd
        .from('voucher_entries')
        .select('*, vouchers(*)')
        .gte('created_at', selectedDate)
        .lte('created_at', selectedDate + 'T23:59:59')
        .gt('debit', 0)

      const openingBalance = 50000
      const totalReceipts = (receipts || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0)
      const cashPayments = (entries || []).filter((e: any) => e.debit > 0)
      const totalPayments = cashPayments.reduce((sum: number, p: any) => sum + (p.debit || 0), 0)
      const closingBalance = openingBalance + totalReceipts - totalPayments

      const rows: Transaction[] = [
        { id: 'opening', type: 'Opening Balance', description: 'Cash in hand', receipt: openingBalance, payment: 0, balance: openingBalance, time: '00:00', voucher_no: 'OB' }
      ]

      let runBal = openingBalance
      for (const r of (receipts || [])) {
        runBal += (r.amount || 0)
        rows.push({
          id: 'r-' + r.id,
          type: 'Receipt',
          description: 'Receipt - Patient ' + (r.patient_id || 'N/A'),
          receipt: r.amount || 0,
          payment: 0,
          balance: runBal,
          time: r.date ? new Date(r.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
          voucher_no: r.receipt_no || ('R-' + r.id)
        })
      }
      for (const p of cashPayments) {
        runBal -= (p.debit || 0)
        rows.push({
          id: 'p-' + p.id,
          type: 'Payment',
          description: (p.vouchers && p.vouchers.narration) || 'Cash payment',
          receipt: 0,
          payment: p.debit || 0,
          balance: runBal,
          time: (p.vouchers && p.vouchers.date) ? new Date(p.vouchers.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
          voucher_no: (p.vouchers && p.vouchers.voucher_number) || ('V-' + p.id)
        })
      }

      setTransactions(rows)
      setSummary({ openingBalance, totalReceipts, totalPayments, closingBalance })
    } catch (error) {
      console.error('Error fetching cash book:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cash Book</h2>
            <p className="text-sm text-gray-500">Daily cash transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Opening Balance', value: summary.openingBalance, color: 'blue' },
          { label: 'Total Receipts', value: summary.totalReceipts, color: 'green' },
          { label: 'Total Payments', value: summary.totalPayments, color: 'red' },
          { label: 'Closing Balance', value: summary.closingBalance, color: 'purple' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Voucher #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Receipt</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Payment</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No transactions for this date</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{t.voucher_no}</td>
                  <td className="px-4 py-3 text-gray-600">{t.time}</td>
                  <td className="px-4 py-3">
                    <span className={
                      t.type === 'Opening Balance' ? 'px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700' :
                      t.type === 'Receipt' ? 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-700' :
                      'px-2 py-1 text-xs rounded-full bg-red-100 text-red-700'
                    }>{t.type}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[300px] truncate">{t.description}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{t.receipt > 0 ? formatCurrency(t.receipt) : '—'}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{t.payment > 0 ? formatCurrency(t.payment) : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(t.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
