'use client'
import React, { useState, useEffect } from 'react'
import { getTrialBalance } from '@/lib/accounting-engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Scale, Calendar, Printer, Download, AlertCircle, CheckCircle } from 'lucide-react'

interface TrialBalanceEntry {
  account_id: number
  account_name: string
  account_type: string
  total_debit: number
  total_credit: number
}

export default function TrialBalance() {
  const [entries, setEntries] = useState<TrialBalanceEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // First day of current month
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedLocation, setSelectedLocation] = useState<number>(1)

  useEffect(() => {
    loadTrialBalance()
  }, [fromDate, toDate, selectedLocation])

  const loadTrialBalance = async () => {
    setLoading(true)
    try {
      const trialBalanceData = await getTrialBalance(fromDate, toDate, selectedLocation)
      setEntries(trialBalanceData)
    } catch (error) {
      console.error('Error loading trial balance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalDebits = () => {
    return entries.reduce((sum, entry) => sum + entry.total_debit, 0)
  }

  const getTotalCredits = () => {
    return entries.reduce((sum, entry) => sum + entry.total_credit, 0)
  }

  const isBalanced = () => {
    const debitTotal = getTotalDebits()
    const creditTotal = getTotalCredits()
    return Math.abs(debitTotal - creditTotal) < 0.01
  }

  const getDifferenceAmount = () => {
    return Math.abs(getTotalDebits() - getTotalCredits())
  }

  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.account_type]) {
      acc[entry.account_type] = []
    }
    acc[entry.account_type].push(entry)
    return acc
  }, {} as Record<string, TrialBalanceEntry[]>)

  const handlePrint = () => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0;">${selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}</h2>
          <h3 style="margin: 5px 0;">TRIAL BALANCE</h3>
          <p style="margin: 5px 0;">From ${formatDate(fromDate)} to ${formatDate(toDate)}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left; width: 50%;">Account Name</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 25%;">Debit</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 25%;">Credit</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(groupedEntries).map(([accountType, typeEntries]) => `
              <tr style="background-color: #f9f9f9;">
                <td colspan="3" style="border: 1px solid #000; padding: 8px; font-weight: bold; text-transform: uppercase;">
                  ${accountType}
                </td>
              </tr>
              ${typeEntries.map((entry: any) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px; padding-left: 20px;">${entry.account_name}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                    ${entry.total_debit > 0 ? formatCurrency(entry.total_debit) : '—'}
                  </td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                    ${entry.total_credit > 0 ? formatCurrency(entry.total_credit) : '—'}
                  </td>
                </tr>
              `).join('')}
            `).join('')}
            <tr style="background-color: #e5e5e5; font-weight: bold; font-size: 16px;">
              <td style="border: 2px solid #000; padding: 12px; text-align: center;">TOTAL</td>
              <td style="border: 2px solid #000; padding: 12px; text-align: right;">${formatCurrency(getTotalDebits())}</td>
              <td style="border: 2px solid #000; padding: 12px; text-align: right;">${formatCurrency(getTotalCredits())}</td>
            </tr>
            ${!isBalanced() ? `
              <tr style="background-color: #ffe5e5; font-weight: bold;">
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">DIFFERENCE</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                  ${getTotalDebits() > getTotalCredits() ? '—' : formatCurrency(getDifferenceAmount())}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                  ${getTotalCredits() > getTotalDebits() ? '—' : formatCurrency(getDifferenceAmount())}
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
        
        <div style="margin-top: 20px;">
          <p><strong>Status:</strong> ${isBalanced() ? 'BALANCED' : 'NOT BALANCED'}</p>
          ${!isBalanced() ? `<p style="color: red;"><strong>Difference:</strong> ${formatCurrency(getDifferenceAmount())}</p>` : ''}
          <p><strong>Generated on:</strong> ${formatDate(new Date().toISOString().split('T')[0])}</p>
        </div>
      </div>
    `
    
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
      printWindow.close()
    }
  }

  const handleExportCSV = () => {
    if (entries.length === 0) {
      alert('No data to export')
      return
    }

    const headers = ['Account Type', 'Account Name', 'Debit', 'Credit']
    const csvData = [headers]
    
    Object.entries(groupedEntries).forEach(([accountType, typeEntries]) => {
      // Add account type header
      csvData.push([accountType.toUpperCase(), '', '', ''])
      
      // Add entries for this type
      typeEntries.forEach(entry => {
        csvData.push([
          '',
          entry.account_name,
          entry.total_debit > 0 ? entry.total_debit.toString() : '',
          entry.total_credit > 0 ? entry.total_credit.toString() : ''
        ])
      })
      
      // Add empty row for separation
      csvData.push(['', '', '', ''])
    })
    
    // Add totals
    csvData.push(['TOTAL', '', getTotalDebits().toString(), getTotalCredits().toString()])
    
    if (!isBalanced()) {
      csvData.push([
        'DIFFERENCE',
        '',
        getTotalDebits() > getTotalCredits() ? '' : getDifferenceAmount().toString(),
        getTotalCredits() > getTotalDebits() ? '' : getDifferenceAmount().toString()
      ])
    }
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trial-balance-${fromDate}-to-${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Scale className="w-7 h-7 text-indigo-600" />
          Trial Balance
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            disabled={entries.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportCSV}
            disabled={entries.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Balance Status */}
      {entries.length > 0 && (
        <div className={`rounded-lg border p-4 ${
          isBalanced() 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {isBalanced() ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-700 font-medium">
                  Trial Balance is BALANCED! Total: {formatCurrency(getTotalDebits())}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-700 font-medium">
                  Trial Balance is NOT BALANCED! Difference: {formatCurrency(getDifferenceAmount())}
                  (Debits: {formatCurrency(getTotalDebits())}, Credits: {formatCurrency(getTotalCredits())})
                </span>
              </>
            )}
          </div>
        </div>
      )}

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
              onClick={loadTrialBalance}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Trial Balance from {formatDate(fromDate)} to {formatDate(toDate)}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-700 w-1/2">Account Name</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-700 w-1/4">Debit</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-700 w-1/4">Credit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-500">Loading trial balance...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-gray-500">No transactions found for this period</td>
                </tr>
              ) : (
                Object.entries(groupedEntries).map(([accountType, typeEntries]) => (
                  <React.Fragment key={accountType}>
                    {/* Account Type Header */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={3} className="py-3 px-6 font-bold text-gray-800 uppercase text-sm">
                        {accountType}
                      </td>
                    </tr>
                    
                    {/* Accounts in this type */}
                    {typeEntries.map((entry, index) => (
                      <tr key={entry.account_id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                      }`}>
                        <td className="py-3 px-6 pl-12">{entry.account_name}</td>
                        <td className="py-3 px-6 text-right">
                          {entry.total_debit > 0 ? (
                            <span className="font-semibold text-green-600">{formatCurrency(entry.total_debit)}</span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-6 text-right">
                          {entry.total_credit > 0 ? (
                            <span className="font-semibold text-red-600">{formatCurrency(entry.total_credit)}</span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
              
              {/* Totals Row */}
              {entries.length > 0 && (
                <>
                  <tr className="border-t-2 border-gray-300 bg-gray-100">
                    <td className="py-4 px-6 font-bold text-gray-900 text-lg">TOTAL</td>
                    <td className="py-4 px-6 text-right font-bold text-lg text-green-600">
                      {formatCurrency(getTotalDebits())}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-lg text-red-600">
                      {formatCurrency(getTotalCredits())}
                    </td>
                  </tr>
                  
                  {/* Difference Row (if not balanced) */}
                  {!isBalanced() && (
                    <tr className="bg-red-50 border-b border-red-200">
                      <td className="py-3 px-6 font-semibold text-red-700">DIFFERENCE</td>
                      <td className="py-3 px-6 text-right font-semibold text-red-600">
                        {getTotalDebits() > getTotalCredits() ? '—' : formatCurrency(getDifferenceAmount())}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-red-600">
                        {getTotalCredits() > getTotalDebits() ? '—' : formatCurrency(getDifferenceAmount())}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {entries.length > 0 && (
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Debits</div>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(getTotalDebits())}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Total Credits</div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(getTotalCredits())}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Difference</div>
                <div className={`text-xl font-bold ${isBalanced() ? 'text-green-600' : 'text-red-600'}`}>
                  {isBalanced() ? 'BALANCED' : formatCurrency(getDifferenceAmount())}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}