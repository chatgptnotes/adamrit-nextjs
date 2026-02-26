'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { BookOpen, Calendar, ArrowUpCircle, ArrowDownCircle, DollarSign } from 'lucide-react'

export default function CashBook() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  const [summary, setSummary] = useState({
    openingBalance: 0,
    totalReceipts: 0,
    totalPayments: 0,
    closingBalance: 0
  })

  useEffect(() => {
    fetchCashBookData()
  }, [selectedDate, selectedLocation])

  const fetchCashBookData = async () => {
    setLoading(true)
    try {
      // Fetch cash receipts for the selected date and location
      const { data: receipts } = await supabaseProd
        .from('account_receipts')
        .select('*')
        .eq('location_id', selectedLocation)
        .eq('payment_mode', 'Cash')
        .gte('date', selectedDate)
        .lt('date', new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('date', { ascending: true })

      // Fetch cash payments (voucher entries with cash account)
      const { data: payments } = await supabaseProd
        .from('voucher_entries')
        .select(`
          *,
          vouchers (
            voucher_number,
            date,
            narration,
            location_id,
            voucher_type
          )
        `)
        .order('created_at', { ascending: true })

      // Filter payments by location and date, and only cash-related transactions
      const cashPayments = payments?.filter(p => 
        p.vouchers?.location_id === selectedLocation &&
        p.vouchers?.date === selectedDate &&
        (p.vouchers?.voucher_type === 'Payment' || p.vouchers?.voucher_type === 'Contra') &&
        p.debit > 0  // Cash going out
      ) || []

      // Calculate opening balance (simplified - you might want to implement proper opening balance calculation)
      const openingBalance = 50000 // This would be calculated from previous day's closing or from a separate table

      // Calculate totals
      const totalReceipts = receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const totalPayments = cashPayments.reduce((sum, p) => sum + (p.debit || 0), 0)
      const closingBalance = openingBalance + totalReceipts - totalPayments

      // Combine and format transactions
      const allTransactions = [
        // Opening balance entry
        {
          id: 'opening',
          type: 'Opening Balance',
          description: 'Cash in hand - opening balance',
          receipt: openingBalance,
          payment: 0,
          balance: openingBalance,
          time: '00:00',
          voucher_no: 'OB'
        },
        // Cash receipts
        ...receipts?.map((r, index) => ({
          id: `receipt-${r.id}`,
          type: 'Receipt',
          description: `Receipt from Patient ID: ${r.patient_id || 'N/A'}`,
          receipt: r.amount,
          payment: 0,
          balance: openingBalance + receipts.slice(0, index + 1).reduce((sum, rec) => sum + (rec.amount || 0), 0) - totalPayments,
          time: new Date(r.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          voucher_no: r.receipt_no || `R-${r.id}`,
          reference: r
        })) || [],
        // Cash payments
        ...cashPayments.map((p, index) => ({
          id: `payment-${p.id}`,
          type: 'Payment',
          description: p.vouchers?.narration || 'Cash payment',
          receipt: 0,
          payment: p.debit,
          balance: openingBalance + totalReceipts - cashPayments.slice(0, index + 1).reduce((sum, pay) => sum + (pay.debit || 0), 0),
          time: new Date(p.vouchers?.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          voucher_no: p.vouchers?.voucher_number || `V-${p.id}`,
          reference: p
        }))
      ]

      // Sort by time
      allTransactions.sort((a, b) => {
        if (a.id === 'opening') return -1
        if (b.id === 'opening') return 1
        return a.time.localeCompare(b.time)
      })

      setTransactions(allTransactions)
      setSummary({
        openingBalance,
        totalReceipts,
        totalPayments,
        closingBalance
      })
    } catch (error) {
      console.error('Error fetching cash book data:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { 
      key: 'voucher_no', 
      label: 'Voucher #',
      render: (r: any) => <span className="font-mono text-sm">{r.voucher_no}</span>
    },
    { 
      key: 'time', 
      label: 'Time',
      render: (r: any) => <span className="text-sm text-gray-600">{r.time}</span>
    },
    { 
      key: 'type', 
      label: 'Type',
      render: (r: any) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          r.type === 'Opening Balance' ? 'bg-blue-100 text-blue-700' :
          r.type === 'Receipt' ? 'bg-green-100 text-green-700' :
          'bg-red-100 text-red-700'
        }`}>
          {r.type}
        </span>
      )
    },
    { 
      key: 'description', 
      label: 'Description',
      render: (r: any) => <span className="text-sm max-w-[300px] truncate block">{r.description}</span>
    },
    { 
      key: 'receipt', 
      label: 'Receipt',
      render: (r: any) => r.receipt > 0 ? 
        <span className="text-green-600 font-medium">{formatCurrency(r.receipt)}</span> : '—'
    },
    { 
      key: 'payment', 
      label: 'Payment',
      render: (r: any) => r.payment > 0 ? 
        <span className="text-red-600 font-medium">{formatCurrency(r.payment)}</span> : '—'
    },
    { 
      key: 'balance', 
      label: 'Balance',
      render: (r: any) => <span className="font-semibold">{formatCurrency(r.balance)}</span>
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Cash Book</h2>
          <p className="text-sm text-gray-500">Daily cash book with opening/closing balance</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">Date:</label>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Location:</label>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Hope Hospital</option>
            <option value={2}>Ayushman Hospital</option>
          </select>
        </div>
        <button
          onClick={fetchCashBookData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Opening Balance</span>
          </div>
          <span className="text-lg font-semibold text-blue-900">
            {formatCurrency(summary.openingBalance)}
          </span>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Total Receipts</span>
          </div>
          <span className="text-lg font-semibold text-green-900">
            {formatCurrency(summary.totalReceipts)}
          </span>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Total Payments</span>
          </span>
          <span className="text-lg font-semibold text-red-900">
            {formatCurrency(summary.totalPayments)}
          </span>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Closing Balance</span>
          </div>
          <span className="text-lg font-semibold text-purple-900">
            {formatCurrency(summary.closingBalance)}
          </span>
        </div>
      </div>

      {/* Cash Book Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Cash Book for {formatDate(selectedDate)} - {selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}
          </h3>
          <DataTable 
            data={transactions}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search transactions..."
            searchKey="description"
          />
        </div>
      </div>

      {/* Print Button */}
      <div className="flex justify-end">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Print Cash Book
        </button>
      </div>
    </div>
  )
}