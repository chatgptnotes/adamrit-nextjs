'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { ArrowDownCircle, Calendar, Calculator, Printer, BarChart3 } from 'lucide-react'

export default function TrialBalance() {
  const [trialBalanceData, setTrialBalanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  const [asOnDate, setAsOnDate] = useState(new Date().toISOString().split('T')[0])
  const [totals, setTotals] = useState({
    totalDebit: 0,
    totalCredit: 0,
    isBalanced: false
  })

  useEffect(() => {
    generateTrialBalance()
  }, [selectedLocation, asOnDate])

  const generateTrialBalance = async () => {
    setLoading(true)
    try {
      // Fetch all chart of accounts
      const { data: accounts } = await supabaseProd
        .from('chart_of_accounts')
        .select('*')
        .order('name', { ascending: true })

      // Fetch all voucher entries up to the selected date
      const { data: entries } = await supabaseProd
        .from('voucher_entries')
        .select(`
          *,
          vouchers (location_id),
          chart_of_accounts (name, account_type)
        `)
        .lte('date', asOnDate)

      // Filter entries by location
      const locationEntries = entries?.filter(entry => 
        entry.vouchers?.location_id === selectedLocation
      ) || []

      // Fetch account receipts up to the selected date
      const { data: receipts } = await supabaseProd
        .from('account_receipts')
        .select('*')
        .eq('location_id', selectedLocation)
        .lte('date', asOnDate)

      // Calculate balances for each account
      const accountBalances = new Map()

      // Process voucher entries
      locationEntries.forEach(entry => {
        const accountId = entry.account_id
        const existing = accountBalances.get(accountId) || {
          id: accountId,
          name: entry.chart_of_accounts?.name || `Account ${accountId}`,
          account_type: entry.chart_of_accounts?.account_type || 'Other',
          debit: 0,
          credit: 0,
          balance: 0
        }

        existing.debit += entry.debit || 0
        existing.credit += entry.credit || 0
        accountBalances.set(accountId, existing)
      })

      // Add cash receipts to appropriate accounts (assuming cash account or sales account)
      if (receipts && receipts.length > 0) {
        const cashReceiptTotal = receipts.reduce((sum, r) => sum + (r.amount || 0), 0)
        
        // Find cash account or create a default one
        const cashAccount = accounts?.find(acc => 
          acc.name?.toLowerCase().includes('cash')
        )

        if (cashAccount) {
          const existing = accountBalances.get(cashAccount.id) || {
            id: cashAccount.id,
            name: cashAccount.name,
            account_type: cashAccount.account_type,
            debit: 0,
            credit: 0,
            balance: 0
          }
          existing.debit += cashReceiptTotal
          accountBalances.set(cashAccount.id, existing)

          // Also add to income/sales account
          const salesAccount = accounts?.find(acc => 
            acc.name?.toLowerCase().includes('sales') || 
            acc.name?.toLowerCase().includes('income')
          )

          if (salesAccount) {
            const salesExisting = accountBalances.get(salesAccount.id) || {
              id: salesAccount.id,
              name: salesAccount.name,
              account_type: salesAccount.account_type,
              debit: 0,
              credit: 0,
              balance: 0
            }
            salesExisting.credit += cashReceiptTotal
            accountBalances.set(salesAccount.id, salesExisting)
          }
        }
      }

      // Calculate net balance for each account
      const trialBalanceEntries = Array.from(accountBalances.values())
        .map(acc => {
          const netBalance = acc.debit - acc.credit
          return {
            ...acc,
            balance: netBalance,
            debitBalance: netBalance > 0 ? netBalance : 0,
            creditBalance: netBalance < 0 ? Math.abs(netBalance) : 0
          }
        })
        .filter(acc => acc.debitBalance > 0 || acc.creditBalance > 0) // Only show accounts with balances
        .sort((a, b) => a.name.localeCompare(b.name))

      // Calculate totals
      const totalDebit = trialBalanceEntries.reduce((sum, acc) => sum + acc.debitBalance, 0)
      const totalCredit = trialBalanceEntries.reduce((sum, acc) => sum + acc.creditBalance, 0)
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

      setTrialBalanceData(trialBalanceEntries)
      setTotals({
        totalDebit,
        totalCredit,
        isBalanced
      })

    } catch (error) {
      console.error('Error generating trial balance:', error)
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { 
      key: 'name', 
      label: 'Account Name',
      render: (r: any) => (
        <div>
          <span className="font-medium">{r.name}</span>
          <div className="text-xs text-gray-500">{r.account_type}</div>
        </div>
      )
    },
    { 
      key: 'debitBalance', 
      label: 'Debit Balance',
      render: (r: any) => r.debitBalance > 0 ? 
        <span className="font-medium text-red-600">{formatCurrency(r.debitBalance)}</span> : '—'
    },
    { 
      key: 'creditBalance', 
      label: 'Credit Balance',
      render: (r: any) => r.creditBalance > 0 ? 
        <span className="font-medium text-green-600">{formatCurrency(r.creditBalance)}</span> : '—'
    }
  ]

  const printTrialBalance = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Trial Balance - ${formatDate(asOnDate)}</title>
          <style>
            @media print {
              body { margin: 0; font-family: Arial, sans-serif; font-size: 12px; }
              .trial-balance { max-width: 800px; margin: 20px auto; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #333; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .number { text-align: right; }
              .total { font-weight: bold; border-top: 2px solid #333; }
              .balanced { color: green; }
              .unbalanced { color: red; }
              @page { size: A4 portrait; margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="trial-balance">
            <div class="header">
              <h2>${selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}</h2>
              <h3>Trial Balance</h3>
              <p>As on ${formatDate(asOnDate)}</p>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Account Name</th>
                  <th>Account Type</th>
                  <th class="number">Debit Balance</th>
                  <th class="number">Credit Balance</th>
                </tr>
              </thead>
              <tbody>
                ${trialBalanceData.map(acc => `
                  <tr>
                    <td>${acc.name}</td>
                    <td>${acc.account_type}</td>
                    <td class="number">${acc.debitBalance > 0 ? formatCurrency(acc.debitBalance) : '—'}</td>
                    <td class="number">${acc.creditBalance > 0 ? formatCurrency(acc.creditBalance) : '—'}</td>
                  </tr>
                `).join('')}
                <tr class="total">
                  <td colspan="2"><strong>TOTAL</strong></td>
                  <td class="number"><strong>${formatCurrency(totals.totalDebit)}</strong></td>
                  <td class="number"><strong>${formatCurrency(totals.totalCredit)}</strong></td>
                </tr>
              </tbody>
            </table>
            
            <div style="text-align: center; margin-top: 20px;">
              <p class="${totals.isBalanced ? 'balanced' : 'unbalanced'}">
                <strong>
                  ${totals.isBalanced ? 
                    '✓ Trial Balance is BALANCED' : 
                    '⚠ Trial Balance is NOT BALANCED'
                  }
                </strong>
              </p>
              ${!totals.isBalanced ? `
                <p style="color: red; font-size: 11px;">
                  Difference: ${formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
                </p>
              ` : ''}
            </div>
            
            <div style="margin-top: 40px; font-size: 10px; text-align: center; color: #666;">
              Generated on ${new Date().toLocaleString('en-IN')}
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
          <ArrowDownCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Trial Balance</h2>
          <p className="text-sm text-gray-500">All accounts with debit/credit totals</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>Hope Hospital</option>
              <option value={2}>Ayushman Hospital</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              As on Date
            </label>
            <input
              type="date"
              value={asOnDate}
              onChange={(e) => setAsOnDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={generateTrialBalance}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Calculator className="w-4 h-4" />
            Generate
          </button>

          <button
            onClick={printTrialBalance}
            disabled={trialBalanceData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Balance Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-700">Total Debit</span>
          </div>
          <span className="text-xl font-semibold text-red-900">
            {formatCurrency(totals.totalDebit)}
          </span>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownCircle className="w-4 h-4 text-green-600 rotate-180" />
            <span className="text-sm font-medium text-green-700">Total Credit</span>
          </div>
          <span className="text-xl font-semibold text-green-900">
            {formatCurrency(totals.totalCredit)}
          </span>
        </div>

        <div className={`p-4 rounded-lg border ${
          totals.isBalanced 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className={`w-4 h-4 ${
              totals.isBalanced ? 'text-blue-600' : 'text-yellow-600'
            }`} />
            <span className={`text-sm font-medium ${
              totals.isBalanced ? 'text-blue-700' : 'text-yellow-700'
            }`}>
              Balance Status
            </span>
          </div>
          <div>
            <span className={`text-lg font-semibold ${
              totals.isBalanced ? 'text-blue-900' : 'text-yellow-900'
            }`}>
              {totals.isBalanced ? '✓ Balanced' : '⚠ Not Balanced'}
            </span>
            {!totals.isBalanced && (
              <div className="text-sm text-yellow-700 mt-1">
                Diff: {formatCurrency(Math.abs(totals.totalDebit - totals.totalCredit))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trial Balance Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Trial Balance as on {formatDate(asOnDate)} - {selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}
          </h3>
        </div>

        <DataTable 
          data={trialBalanceData}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search accounts..."
          searchKey="name"
        />

        {/* Totals Row */}
        {trialBalanceData.length > 0 && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg border-t-2 border-gray-300">
            <div className="grid grid-cols-3 gap-4 font-semibold">
              <div>
                <span className="text-gray-900">TOTAL</span>
              </div>
              <div className="text-right">
                <span className="text-red-600">{formatCurrency(totals.totalDebit)}</span>
              </div>
              <div className="text-right">
                <span className="text-green-600">{formatCurrency(totals.totalCredit)}</span>
              </div>
            </div>
          </div>
        )}

        {trialBalanceData.length === 0 && !loading && (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No account balances found for the selected date and location.</p>
          </div>
        )}
      </div>

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">About Trial Balance</h4>
        <p className="text-sm text-blue-700">
          Trial Balance is a statement that shows the total of debit and credit balances of all accounts in the ledger. 
          It helps verify that the total of all debit balances equals the total of all credit balances, ensuring the 
          accuracy of the double-entry bookkeeping system. If they don't match, there might be an error in the entries.
        </p>
      </div>
    </div>
  )
}