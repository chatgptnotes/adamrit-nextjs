'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { Calculator, Calendar, Filter, TrendingUp, TrendingDown } from 'lucide-react'

export default function Ledger() {
  const [ledgerData, setLedgerData] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [summary, setSummary] = useState({
    openingBalance: 0,
    totalDebits: 0,
    totalCredits: 0,
    closingBalance: 0
  })

  useEffect(() => {
    fetchAccounts()
  }, [selectedLocation])

  useEffect(() => {
    if (selectedAccount) {
      fetchLedgerData()
    }
  }, [selectedAccount, dateRange, selectedLocation])

  const fetchAccounts = async () => {
    try {
      const { data } = await supabaseProd
        .from('chart_of_accounts')
        .select('*')
        .order('name', { ascending: true })
      
      setAccounts(data || [])
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchLedgerData = async () => {
    if (!selectedAccount) return

    setLoading(true)
    try {
      // Fetch voucher entries for the selected account and date range
      const { data: entries } = await supabaseProd
        .from('voucher_entries')
        .select(`
          *,
          vouchers (
            voucher_number,
            voucher_type,
            date,
            narration,
            location_id
          ),
          chart_of_accounts (name)
        `)
        .eq('account_id', selectedAccount)
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
        .order('date', { ascending: true })

      // Filter by location if voucher has location
      const filteredEntries = entries?.filter(entry => 
        entry.vouchers?.location_id === selectedLocation
      ) || []

      // Calculate opening balance (simplified - would need proper calculation in real scenario)
      const openingBalance = 0 // This would be calculated from previous periods

      // Calculate running balance
      let runningBalance = openingBalance
      const ledgerEntries = filteredEntries.map(entry => {
        const debit = entry.debit || 0
        const credit = entry.credit || 0
        runningBalance += debit - credit

        return {
          ...entry,
          balance: runningBalance,
          voucher_info: entry.vouchers,
          account_name: entry.chart_of_accounts?.name
        }
      })

      // Also fetch receipts if this is a receivable account
      const { data: receipts } = await supabaseProd
        .from('account_receipts')
        .select('*')
        .eq('location_id', selectedLocation)
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
        .order('date', { ascending: true })

      // Add receipts to ledger if account is related to receivables
      const accountName = accounts.find(acc => acc.id.toString() === selectedAccount)?.name?.toLowerCase()
      if (accountName?.includes('receivable') || accountName?.includes('patient') || accountName?.includes('debtor')) {
        receipts?.forEach(receipt => {
          runningBalance -= receipt.amount // Receipt reduces receivable
          ledgerEntries.push({
            id: `receipt-${receipt.id}`,
            date: receipt.date,
            debit: 0,
            credit: receipt.amount,
            narration: `Receipt #${receipt.receipt_no} from Patient ${receipt.patient_id}`,
            balance: runningBalance,
            voucher_info: {
              voucher_number: receipt.receipt_no,
              voucher_type: 'Receipt',
              date: receipt.date,
              narration: `Payment received`
            }
          })
        })
      }

      // Sort by date
      ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Recalculate balances after sorting
      let balance = openingBalance
      const finalEntries = ledgerEntries.map(entry => {
        balance += (entry.debit || 0) - (entry.credit || 0)
        return { ...entry, balance }
      })

      const totalDebits = ledgerEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0)
      const totalCredits = ledgerEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0)

      setLedgerData(finalEntries)
      setSummary({
        openingBalance,
        totalDebits,
        totalCredits,
        closingBalance: openingBalance + totalDebits - totalCredits
      })
    } catch (error) {
      console.error('Error fetching ledger data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const columns = [
    { 
      key: 'date', 
      label: 'Date',
      render: (r: any) => formatDate(r.date)
    },
    { 
      key: 'voucher_number', 
      label: 'Voucher #',
      render: (r: any) => (
        <div>
          <div className="font-mono text-sm">{r.voucher_info?.voucher_number || '—'}</div>
          <div className={`text-xs px-1 py-0.5 rounded ${
            r.voucher_info?.voucher_type === 'Receipt' ? 'bg-green-100 text-green-700' :
            r.voucher_info?.voucher_type === 'Payment' ? 'bg-red-100 text-red-700' :
            r.voucher_info?.voucher_type === 'Journal' ? 'bg-blue-100 text-blue-700' :
            r.voucher_info?.voucher_type === 'Contra' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {r.voucher_info?.voucher_type || 'Entry'}
          </div>
        </div>
      )
    },
    { 
      key: 'narration', 
      label: 'Description',
      render: (r: any) => (
        <span className="text-sm max-w-[300px] truncate block">
          {r.narration || r.voucher_info?.narration || '—'}
        </span>
      )
    },
    { 
      key: 'debit', 
      label: 'Debit',
      render: (r: any) => r.debit ? 
        <span className="font-medium text-red-600">{formatCurrency(r.debit)}</span> : '—'
    },
    { 
      key: 'credit', 
      label: 'Credit',
      render: (r: any) => r.credit ? 
        <span className="font-medium text-green-600">{formatCurrency(r.credit)}</span> : '—'
    },
    { 
      key: 'balance', 
      label: 'Balance',
      render: (r: any) => (
        <span className={`font-semibold ${r.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
          {formatCurrency(Math.abs(r.balance))} {r.balance < 0 ? 'Cr' : 'Dr'}
        </span>
      )
    }
  ]

  const selectedAccountInfo = accounts.find(acc => acc.id.toString() === selectedAccount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600">
          <Calculator className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Ledger</h2>
          <p className="text-sm text-gray-500">Account-wise transaction details with running balance</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={1}>Hope Hospital</option>
              <option value={2}>Ayushman Hospital</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account *
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <button
              onClick={fetchLedgerData}
              disabled={!selectedAccount}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Filter className="w-4 h-4" />
              Generate Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Account Info & Summary */}
      {selectedAccount && selectedAccountInfo && (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedAccountInfo.name}
            </h3>
            <p className="text-sm text-gray-500">
              Ledger for {formatDate(dateRange.from)} to {formatDate(dateRange.to)}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm font-medium text-blue-700">Opening Balance</span>
              </div>
              <span className="text-lg font-semibold text-blue-900">
                {formatCurrency(Math.abs(summary.openingBalance))} {summary.openingBalance < 0 ? 'Cr' : 'Dr'}
              </span>
            </div>

            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">Total Debits</span>
              </div>
              <span className="text-lg font-semibold text-red-900">
                {formatCurrency(summary.totalDebits)}
              </span>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Total Credits</span>
              </div>
              <span className="text-lg font-semibold text-green-900">
                {formatCurrency(summary.totalCredits)}
              </span>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Closing Balance</span>
              </div>
              <span className="text-lg font-semibold text-purple-900">
                {formatCurrency(Math.abs(summary.closingBalance))} {summary.closingBalance < 0 ? 'Cr' : 'Dr'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      {selectedAccount && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Ledger Entries</h3>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Print Ledger
            </button>
          </div>
          
          <DataTable 
            data={ledgerData}
            columns={columns}
            loading={loading}
            searchPlaceholder="Search entries..."
            searchKey="narration"
          />

          {ledgerData.length === 0 && !loading && (
            <div className="text-center py-8">
              <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No transactions found for the selected account and date range.</p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!selectedAccount && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Select an Account</h3>
          <p className="text-gray-500">
            Choose an account from the dropdown to view its detailed ledger with all transactions and running balance.
          </p>
        </div>
      )}
    </div>
  )
}