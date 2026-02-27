'use client'
import { useState, useEffect } from 'react'
import { getCashBook, getAccountBalance } from '@/lib/accounting-engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, Printer, Download, DollarSign } from 'lucide-react'

interface CashBookEntry {
  id: number
  voucher_date: string
  voucher_logs: {
    voucher_number: string
    type: string
  }
  debit?: number
  credit?: number
  narration: string
  running_balance: number
}

export default function CashBook() {
  const [entries, setEntries] = useState<CashBookEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedLocation, setSelectedLocation] = useState<number>(1)

  useEffect(() => {
    fetchCashBookData()
  }, [fromDate, toDate, selectedLocation])

  const fetchCashBookData = async () => {
    setLoading(true)
    try {
      // Get opening balance (balance before fromDate)
      const prevDate = new Date(fromDate)
      prevDate.setDate(prevDate.getDate() - 1)
      const prevDateStr = prevDate.toISOString().split('T')[0]
      
      // Get current cash balance
      const currentBalance = await getAccountBalance(1) // Cash account ID = 1
      
      // Get cash book entries for the date range
      const cashEntries = await getCashBook(fromDate, toDate, selectedLocation)
      
      // Calculate opening balance by working backwards
      const totalPeriodMovement = cashEntries.reduce((sum, entry) => 
        sum + (entry.debit || 0) - (entry.credit || 0), 0
      )
      const calculatedOpeningBalance = currentBalance - totalPeriodMovement
      
      setOpeningBalance(calculatedOpeningBalance)
      setEntries(cashEntries)
    } catch (error) {
      console.error('Error fetching cash book data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateClosingBalance = () => {
    if (entries.length === 0) return openingBalance
    return entries[entries.length - 1].running_balance
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Voucher No.', 'Type', 'Particulars', 'Debit', 'Credit', 'Balance']
    const csvData = [headers]
    
    // Add opening balance row
    csvData.push([
      fromDate,
      '',
      '',
      'Opening Balance',
      '',
      '',
      openingBalance.toString()
    ])
    
    // Add all entries
    entries.forEach(entry => {
      csvData.push([
        entry.voucher_date,
        entry.voucher_logs.voucher_number,
        entry.voucher_logs.type,
        entry.narration,
        entry.debit?.toString() || '',
        entry.credit?.toString() || '',
        entry.running_balance.toString()
      ])
    })
    
    // Add closing balance row
    csvData.push([
      toDate,
      '',
      '',
      'Closing Balance',
      '',
      '',
      calculateClosingBalance().toString()
    ])
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cash-book-${fromDate}-to-${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <DollarSign className="w-7 h-7 text-green-600" />
          Cash Book
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={1}>Hope Hospital</option>
              <option value={2}>Ayushman Hospital</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchCashBookData}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Cash Book Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Cash Book from {formatDate(fromDate)} to {formatDate(toDate)}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Date</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Voucher No.</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-700">Particulars</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-700">Receipts (Dr)</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-700">Payments (Cr)</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-700">Balance</th>
              </tr>
            </thead>
            <tbody>
              {/* Opening Balance */}
              <tr className="border-b border-gray-200 bg-blue-50">
                <td className="py-4 px-6">{formatDate(fromDate)}</td>
                <td className="py-4 px-6">—</td>
                <td className="py-4 px-6">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    Opening
                  </span>
                </td>
                <td className="py-4 px-6 font-medium">Opening Balance</td>
                <td className="py-4 px-6 text-right">—</td>
                <td className="py-4 px-6 text-right">—</td>
                <td className="py-4 px-6 text-right font-semibold">{formatCurrency(openingBalance)}</td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Loading transactions...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">No transactions found for this period</td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={entry.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                  }`}>
                    <td className="py-4 px-6">{formatDate(entry.voucher_date)}</td>
                    <td className="py-4 px-6 font-mono text-xs">{entry.voucher_logs.voucher_number}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        entry.voucher_logs.type === 'Receipt' ? 'bg-green-100 text-green-700' :
                        entry.voucher_logs.type === 'Payment' ? 'bg-red-100 text-red-700' :
                        entry.voucher_logs.type === 'Journal' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {entry.voucher_logs.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate">{entry.narration}</td>
                    <td className="py-4 px-6 text-right">
                      {entry.debit ? (
                        <span className="font-semibold text-green-600">{formatCurrency(entry.debit)}</span>
                      ) : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {entry.credit ? (
                        <span className="font-semibold text-red-600">{formatCurrency(entry.credit)}</span>
                      ) : '—'}
                    </td>
                    <td className="py-4 px-6 text-right font-semibold">
                      {formatCurrency(entry.running_balance)}
                    </td>
                  </tr>
                ))
              )}

              {/* Closing Balance */}
              <tr className="border-b border-gray-200 bg-green-50">
                <td className="py-4 px-6">{formatDate(toDate)}</td>
                <td className="py-4 px-6">—</td>
                <td className="py-4 px-6">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    Closing
                  </span>
                </td>
                <td className="py-4 px-6 font-medium">Closing Balance</td>
                <td className="py-4 px-6 text-right">—</td>
                <td className="py-4 px-6 text-right">—</td>
                <td className="py-4 px-6 text-right font-bold text-lg">
                  {formatCurrency(calculateClosingBalance())}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm text-gray-600">Opening Balance</div>
              <div className="text-lg font-semibold text-blue-600">
                {formatCurrency(openingBalance)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Receipts</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(entries.reduce((sum, entry) => sum + (entry.debit || 0), 0))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Payments</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(entries.reduce((sum, entry) => sum + (entry.credit || 0), 0))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}