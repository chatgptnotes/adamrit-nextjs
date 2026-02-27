'use client'
import { useState, useEffect } from 'react'
import { getLedger, getChartOfAccounts, getAccountBalance } from '@/lib/accounting-engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BookOpen, Search, Calendar, Printer, Download } from 'lucide-react'

interface Account {
  id: number
  name: string
  account_type: string
  account_code?: string
}

interface LedgerEntry {
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

export default function Ledger() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number>(0)
  const [selectedAccountName, setSelectedAccountName] = useState<string>('')
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // First day of current month
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [openingBalance, setOpeningBalance] = useState<number>(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccountId > 0) {
      loadLedgerData()
    }
  }, [selectedAccountId, fromDate, toDate])

  const loadAccounts = async () => {
    try {
      const accountsData = await getChartOfAccounts()
      setAccounts(accountsData)
      setFilteredAccounts(accountsData)
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const handleAccountSearch = (term: string) => {
    setSearchTerm(term)
    if (term.length > 0) {
      const filtered = accounts.filter(account =>
        account.name.toLowerCase().includes(term.toLowerCase()) ||
        (account.account_code && account.account_code.toLowerCase().includes(term.toLowerCase()))
      )
      setFilteredAccounts(filtered)
      setShowAccountDropdown(true)
    } else {
      setFilteredAccounts(accounts)
      setShowAccountDropdown(false)
    }
  }

  const selectAccount = (account: Account) => {
    setSelectedAccountId(account.id)
    setSelectedAccountName(account.name)
    setSearchTerm(account.name)
    setShowAccountDropdown(false)
  }

  const loadLedgerData = async () => {
    setLoading(true)
    try {
      // Get current account balance
      const currentBalance = await getAccountBalance(selectedAccountId)
      
      // Get ledger entries for the period
      const ledgerEntries = await getLedger(selectedAccountId, fromDate, toDate)
      
      // Calculate opening balance by working backwards
      const totalPeriodMovement = ledgerEntries.reduce((sum, entry) => 
        sum + (entry.debit || 0) - (entry.credit || 0), 0
      )
      const calculatedOpeningBalance = currentBalance - totalPeriodMovement
      
      setOpeningBalance(calculatedOpeningBalance)
      setEntries(ledgerEntries)
    } catch (error) {
      console.error('Error loading ledger data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateClosingBalance = () => {
    if (entries.length === 0) return openingBalance
    return entries[entries.length - 1].running_balance
  }

  const handlePrint = () => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0;">Account Ledger</h2>
          <h3 style="margin: 5px 0;">${selectedAccountName}</h3>
          <p style="margin: 5px 0;">From ${formatDate(fromDate)} to ${formatDate(toDate)}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Date</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Voucher No.</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Type</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Particulars</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Debit</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Credit</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background-color: #f0f0f0;">
              <td style="border: 1px solid #000; padding: 8px;">${formatDate(fromDate)}</td>
              <td style="border: 1px solid #000; padding: 8px;">—</td>
              <td style="border: 1px solid #000; padding: 8px;">Opening</td>
              <td style="border: 1px solid #000; padding: 8px;">Opening Balance</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">—</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">—</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(openingBalance)}</td>
            </tr>
            ${entries.map(entry => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px;">${formatDate(entry.voucher_date)}</td>
                <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${entry.voucher_logs.voucher_number}</td>
                <td style="border: 1px solid #000; padding: 8px;">${entry.voucher_logs.type}</td>
                <td style="border: 1px solid #000; padding: 8px;">${entry.narration}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                  ${entry.debit ? formatCurrency(entry.debit) : '—'}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                  ${entry.credit ? formatCurrency(entry.credit) : '—'}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(entry.running_balance)}</td>
              </tr>
            `).join('')}
            <tr style="background-color: #f0f0f0; font-weight: bold;">
              <td style="border: 1px solid #000; padding: 8px;">${formatDate(toDate)}</td>
              <td style="border: 1px solid #000; padding: 8px;">—</td>
              <td style="border: 1px solid #000; padding: 8px;">Closing</td>
              <td style="border: 1px solid #000; padding: 8px;">Closing Balance</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">—</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">—</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(calculateClosingBalance())}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 30px;">
          <div style="display: flex; justify-content: space-between;">
            <div>
              <p>Opening Balance: ${formatCurrency(openingBalance)}</p>
              <p>Total Debits: ${formatCurrency(entries.reduce((sum, entry) => sum + (entry.debit || 0), 0))}</p>
              <p>Total Credits: ${formatCurrency(entries.reduce((sum, entry) => sum + (entry.credit || 0), 0))}</p>
              <p><strong>Closing Balance: ${formatCurrency(calculateClosingBalance())}</strong></p>
            </div>
          </div>
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
    if (!selectedAccountName || entries.length === 0) {
      alert('Please select an account and load data first')
      return
    }

    const headers = ['Date', 'Voucher No.', 'Type', 'Particulars', 'Debit', 'Credit', 'Balance']
    const csvData = [headers]
    
    // Add opening balance row
    csvData.push([
      fromDate,
      '',
      'Opening',
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
        entry.narration.replace(/"/g, '""'), // Escape quotes
        entry.debit?.toString() || '',
        entry.credit?.toString() || '',
        entry.running_balance.toString()
      ])
    })
    
    // Add closing balance row
    csvData.push([
      toDate,
      '',
      'Closing',
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
    a.download = `ledger-${selectedAccountName.replace(/\s+/g, '-')}-${fromDate}-to-${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-purple-600" />
          Account Ledger
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            disabled={!selectedAccountId || entries.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!selectedAccountId || entries.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Account Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Account *</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleAccountSearch(e.target.value)}
                onFocus={() => setShowAccountDropdown(true)}
                placeholder="Search account..."
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            
            {/* Account Dropdown */}
            {showAccountDropdown && filteredAccounts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredAccounts.slice(0, 10).map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => selectAccount(account)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{account.name}</div>
                    <div className="text-xs text-gray-500">
                      {account.account_code && `Code: ${account.account_code} • `}
                      Type: {account.account_type}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {selectedAccountId > 0 && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                Selected: {selectedAccountName}
              </div>
            )}
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
              onClick={loadLedgerData}
              disabled={!selectedAccountId}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Load Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {selectedAccountId > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ledger: {selectedAccountName} ({formatDate(fromDate)} to {formatDate(toDate)})
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
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">Debit</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">Credit</th>
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
                      <td className="py-4 px-6 max-w-xs">{entry.narration}</td>
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
                {entries.length > 0 && (
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
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {entries.length > 0 && (
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Opening Balance</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(openingBalance)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Debits</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(entries.reduce((sum, entry) => sum + (entry.debit || 0), 0))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Credits</div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatCurrency(entries.reduce((sum, entry) => sum + (entry.credit || 0), 0))}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Closing Balance</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {formatCurrency(calculateClosingBalance())}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}