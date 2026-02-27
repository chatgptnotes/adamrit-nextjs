'use client'
import { useState, useEffect } from 'react'
import { createJournalEntry, getChartOfAccounts } from '@/lib/accounting-engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Plus, Trash2, Save, AlertCircle, CheckCircle } from 'lucide-react'

interface Account {
  id: number
  name: string
  account_type: string
  account_code?: string
}

interface JournalEntryRow {
  id: string
  account_id: number
  account_name: string
  debit: number
  credit: number
  narration: string
}

interface JournalForm {
  narration: string
  voucher_date: string
  location_id: number
  entries: JournalEntryRow[]
}

export default function JournalEntry() {
  const [form, setForm] = useState<JournalForm>({
    narration: '',
    voucher_date: new Date().toISOString().split('T')[0],
    location_id: 1,
    entries: [
      {
        id: '1',
        account_id: 0,
        account_name: '',
        debit: 0,
        credit: 0,
        narration: ''
      }
    ]
  })
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [lastVoucherNumber, setLastVoucherNumber] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const accountsData = await getChartOfAccounts()
      setAccounts(accountsData)
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const addEntry = () => {
    const newEntry: JournalEntryRow = {
      id: Date.now().toString(),
      account_id: 0,
      account_name: '',
      debit: 0,
      credit: 0,
      narration: ''
    }
    setForm(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry]
    }))
  }

  const removeEntry = (entryId: string) => {
    if (form.entries.length > 1) {
      setForm(prev => ({
        ...prev,
        entries: prev.entries.filter(entry => entry.id !== entryId)
      }))
    }
  }

  const updateEntry = (entryId: string, field: keyof JournalEntryRow, value: any) => {
    setForm(prev => ({
      ...prev,
      entries: prev.entries.map(entry => {
        if (entry.id === entryId) {
          const updated = { ...entry, [field]: value }
          
          // If account is selected, update account name
          if (field === 'account_id') {
            const account = accounts.find(acc => acc.id === Number(value))
            updated.account_name = account ? account.name : ''
          }
          
          // Ensure only debit OR credit has value (not both)
          if (field === 'debit' && Number(value) > 0) {
            updated.credit = 0
          }
          if (field === 'credit' && Number(value) > 0) {
            updated.debit = 0
          }
          
          return updated
        }
        return entry
      })
    }))
  }

  const getTotalDebit = () => {
    return form.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0)
  }

  const getTotalCredit = () => {
    return form.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0)
  }

  const isBalanced = () => {
    const debitTotal = getTotalDebit()
    const creditTotal = getTotalCredit()
    return Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0
  }

  const isValidEntry = () => {
    const hasAllAccounts = form.entries.every(entry => entry.account_id > 0)
    const hasAmounts = form.entries.every(entry => (entry.debit > 0) || (entry.credit > 0))
    const hasNarration = form.narration.trim().length > 0
    
    return hasAllAccounts && hasAmounts && hasNarration && isBalanced()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValidEntry()) {
      alert('Please ensure all entries are complete and debits equal credits')
      return
    }

    setLoading(true)
    try {
      // Prepare entries for the accounting engine
      const entriesData = form.entries.map(entry => ({
        account_id: entry.account_id,
        debit: entry.debit > 0 ? entry.debit : undefined,
        credit: entry.credit > 0 ? entry.credit : undefined,
        narration: entry.narration || form.narration
      }))

      const result = await createJournalEntry({
        narration: form.narration,
        voucher_date: form.voucher_date,
        location_id: form.location_id,
        entries: entriesData
      })

      if (result.success) {
        setLastVoucherNumber(result.voucher_number)
        setShowSuccess(true)
        
        // Reset form
        setForm({
          narration: '',
          voucher_date: new Date().toISOString().split('T')[0],
          location_id: form.location_id,
          entries: [
            {
              id: '1',
              account_id: 0,
              account_name: '',
              debit: 0,
              credit: 0,
              narration: ''
            }
          ]
        })
        
        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error creating journal entry:', error)
      alert('Error creating journal entry. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!lastVoucherNumber) return
    
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0;">${form.location_id === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}</h2>
          <h3 style="margin: 5px 0;">JOURNAL VOUCHER</h3>
          <p style="margin: 5px 0;">Voucher No: ${lastVoucherNumber}</p>
          <p style="margin: 5px 0;">Date: ${formatDate(form.voucher_date)}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Account</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Narration</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Debit</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right;">Credit</th>
            </tr>
          </thead>
          <tbody>
            ${form.entries.map(entry => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px;">${entry.account_name}</td>
                <td style="border: 1px solid #000; padding: 8px;">${entry.narration || form.narration}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                  ${entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">
                  ${entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                </td>
              </tr>
            `).join('')}
            <tr style="background-color: #f9f9f9; font-weight: bold;">
              <td colspan="2" style="border: 1px solid #000; padding: 8px; text-align: center;">Total</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(getTotalDebit())}</td>
              <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(getTotalCredit())}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 40px;">
          <p><strong>Narration:</strong> ${form.narration}</p>
        </div>
        
        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
          <div>
            <p style="margin: 0;">Prepared by</p>
            <br><br>
            <p style="margin: 0; border-top: 1px solid #000; padding-top: 5px;">Signature</p>
          </div>
          <div>
            <p style="margin: 0;">Approved by</p>
            <br><br>
            <p style="margin: 0; border-top: 1px solid #000; padding-top: 5px;">Signature</p>
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-600" />
          Journal Entry
        </h1>
        {lastVoucherNumber && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Print Voucher
          </button>
        )}
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Journal entry created successfully! Voucher No: {lastVoucherNumber}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
              <select
                value={form.location_id}
                onChange={(e) => setForm(prev => ({ ...prev, location_id: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value={1}>Hope Hospital</option>
                <option value={2}>Ayushman Hospital</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <input
                type="date"
                value={form.voucher_date}
                onChange={(e) => setForm(prev => ({ ...prev, voucher_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overall Narration *</label>
              <input
                type="text"
                value={form.narration}
                onChange={(e) => setForm(prev => ({ ...prev, narration: e.target.value }))}
                placeholder="Brief description of the transaction"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>
        </div>

        {/* Journal Entries */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Journal Entries</h3>
              <button
                type="button"
                onClick={addEntry}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Account</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Narration</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Debit</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Credit</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {form.entries.map((entry, index) => (
                    <tr key={entry.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <select
                          value={entry.account_id}
                          onChange={(e) => updateEntry(entry.id, 'account_id', Number(e.target.value))}
                          className="w-full min-w-[200px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        >
                          <option value={0}>Select Account</option>
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} ({account.account_type})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={entry.narration}
                          onChange={(e) => updateEntry(entry.id, 'narration', e.target.value)}
                          placeholder="Entry description (optional)"
                          className="w-full min-w-[150px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={entry.debit || ''}
                          onChange={(e) => updateEntry(entry.id, 'debit', Number(e.target.value) || 0)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          value={entry.credit || ''}
                          onChange={(e) => updateEntry(entry.id, 'credit', Number(e.target.value) || 0)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full min-w-[100px] px-3 py-2 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {form.entries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 font-semibold text-gray-700">Total</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">
                      {formatCurrency(getTotalDebit())}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600">
                      {formatCurrency(getTotalCredit())}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isBalanced() ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Validation Messages */}
        {!isBalanced() && getTotalDebit() > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700 font-medium">
                Entries are not balanced! Debit: {formatCurrency(getTotalDebit())}, 
                Credit: {formatCurrency(getTotalCredit())}, 
                Difference: {formatCurrency(Math.abs(getTotalDebit() - getTotalCredit()))}
              </span>
            </div>
          </div>
        )}

        {isBalanced() && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">
                Entries are balanced! Total amount: {formatCurrency(getTotalDebit())}
              </span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !isValidEntry()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : 'Post Journal Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}