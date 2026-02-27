'use client'
import { useState, useEffect } from 'react'
import { createContraVoucher, getChartOfAccounts } from '@/lib/accounting-engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CreditCard, ArrowLeftRight, Printer, Save, DollarSign } from 'lucide-react'

interface Account {
  id: number
  name: string
  account_type: string
  account_code?: string
}

interface ContraForm {
  from_account_id: number
  from_account_name: string
  to_account_id: number
  to_account_name: string
  amount: number
  narration: string
  voucher_date: string
  location_id: number
}

export default function ContraEntry() {
  const [form, setForm] = useState<ContraForm>({
    from_account_id: 0,
    from_account_name: '',
    to_account_id: 0,
    to_account_name: '',
    amount: 0,
    narration: '',
    voucher_date: new Date().toISOString().split('T')[0],
    location_id: 1
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
      // Filter to only Cash and Bank accounts for contra entries
      const contraAccounts = accountsData.filter(acc => 
        acc.account_type === 'Cash' || 
        acc.account_type === 'Bank' ||
        acc.name.toLowerCase().includes('cash') ||
        acc.name.toLowerCase().includes('bank')
      )
      setAccounts(contraAccounts)
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const handleAccountChange = (field: 'from_account_id' | 'to_account_id', accountId: number) => {
    const account = accounts.find(acc => acc.id === accountId)
    setForm(prev => ({
      ...prev,
      [field]: accountId,
      [`${field.replace('_id', '_name')}`]: account ? account.name : ''
    }))
  }

  const swapAccounts = () => {
    setForm(prev => ({
      ...prev,
      from_account_id: prev.to_account_id,
      from_account_name: prev.to_account_name,
      to_account_id: prev.from_account_id,
      to_account_name: prev.from_account_name
    }))
  }

  const getTransferType = () => {
    const fromAccount = accounts.find(acc => acc.id === form.from_account_id)
    const toAccount = accounts.find(acc => acc.id === form.to_account_id)
    
    if (!fromAccount || !toAccount) return 'Transfer'
    
    if (fromAccount.name.toLowerCase().includes('cash') && toAccount.name.toLowerCase().includes('bank')) {
      return 'Cash Deposit to Bank'
    } else if (fromAccount.name.toLowerCase().includes('bank') && toAccount.name.toLowerCase().includes('cash')) {
      return 'Cash Withdrawal from Bank'
    } else {
      return 'Fund Transfer'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.from_account_id || !form.to_account_id || !form.amount || !form.narration) {
      alert('Please fill all required fields')
      return
    }

    if (form.from_account_id === form.to_account_id) {
      alert('From and To accounts cannot be the same')
      return
    }

    setLoading(true)
    try {
      const result = await createContraVoucher({
        from_account_id: form.from_account_id,
        to_account_id: form.to_account_id,
        amount: form.amount,
        narration: form.narration,
        voucher_date: form.voucher_date,
        location_id: form.location_id
      })

      if (result.success) {
        setLastVoucherNumber(result.voucher_number)
        setShowSuccess(true)
        
        // Reset form
        setForm({
          from_account_id: 0,
          from_account_name: '',
          to_account_id: 0,
          to_account_name: '',
          amount: 0,
          narration: '',
          voucher_date: new Date().toISOString().split('T')[0],
          location_id: form.location_id
        })
        
        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error creating contra voucher:', error)
      alert('Error creating contra voucher. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!lastVoucherNumber) return
    
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0;">${form.location_id === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}</h2>
          <h3 style="margin: 5px 0;">CONTRA VOUCHER</h3>
          <p style="margin: 5px 0;">Voucher No: ${lastVoucherNumber}</p>
          <p style="margin: 5px 0;">Date: ${formatDate(form.voucher_date)}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Transfer Type:</strong> ${getTransferType()}</p>
          <p><strong>From Account:</strong> ${form.from_account_name}</p>
          <p><strong>To Account:</strong> ${form.to_account_name}</p>
          <p><strong>Amount:</strong> ${formatCurrency(form.amount)}</p>
          <p><strong>Narration:</strong> ${form.narration}</p>
        </div>
        
        <div style="border: 1px solid #000; margin: 20px 0; padding: 15px;">
          <h4 style="margin: 0 0 10px 0;">ACCOUNTING ENTRY</h4>
          <table style="width: 100%; font-size: 12px;">
            <tr>
              <td><strong>Dr.</strong> ${form.to_account_name}</td>
              <td style="text-align: right;">${formatCurrency(form.amount)}</td>
            </tr>
            <tr>
              <td style="padding-left: 20px;"><strong>Cr.</strong> ${form.from_account_name}</td>
              <td style="text-align: right;">${formatCurrency(form.amount)}</td>
            </tr>
          </table>
        </div>
        
        <div style="border-top: 1px solid #000; margin-top: 30px; padding-top: 20px;">
          <div style="display: flex; justify-content: space-between;">
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
          <CreditCard className="w-7 h-7 text-purple-600" />
          Contra Entry
        </h1>
        {lastVoucherNumber && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Voucher
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ArrowLeftRight className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-purple-900">What is a Contra Entry?</h3>
            <p className="text-purple-700 text-sm mt-1">
              A contra entry records the transfer of funds between Cash and Bank accounts. 
              For example: depositing cash into bank, withdrawing cash from bank, or transferring between bank accounts.
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Contra voucher created successfully! Voucher No: {lastVoucherNumber}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Create Fund Transfer</h3>
            
            {/* Location and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Transfer Accounts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Account *</label>
                <select
                  value={form.from_account_id}
                  onChange={(e) => handleAccountChange('from_account_id', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value={0}>Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} disabled={account.id === form.to_account_id}>
                      {account.name} ({account.account_type})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={swapAccounts}
                  disabled={!form.from_account_id || !form.to_account_id}
                  className="p-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  title="Swap accounts"
                >
                  <ArrowLeftRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Account *</label>
                <select
                  value={form.to_account_id}
                  onChange={(e) => handleAccountChange('to_account_id', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value={0}>Select Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} disabled={account.id === form.from_account_id}>
                      {account.name} ({account.account_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfer Type Display */}
            {form.from_account_id > 0 && form.to_account_id > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 font-medium">
                  Transfer Type: {getTransferType()}
                </p>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Transfer Amount *
              </label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Narration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Narration *</label>
              <textarea
                value={form.narration}
                onChange={(e) => setForm(prev => ({ ...prev, narration: e.target.value }))}
                placeholder="Fund transfer from [From Account] to [To Account]"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Contra Entry'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfer Preview</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
              <div className="text-center">
                <h4 className="font-bold">
                  {form.location_id === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}
                </h4>
                <p className="text-sm text-gray-600">CONTRA VOUCHER</p>
              </div>
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span>{formatDate(form.voucher_date)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transfer Type:</span>
                  <span className="text-right">{getTransferType()}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">From:</span>
                  <span className="text-right">{form.from_account_name || 'Not selected'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">To:</span>
                  <span className="text-right">{form.to_account_name || 'Not selected'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-purple-600">{formatCurrency(form.amount)}</span>
                </div>
                
                {form.narration && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">For: {form.narration}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Accounting Entry Preview */}
            {form.amount > 0 && form.from_account_name && form.to_account_name && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Accounting Entry:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-green-600">Dr. {form.to_account_name}</span>
                    <span className="text-green-600">{formatCurrency(form.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 pl-4">Cr. {form.from_account_name}</span>
                    <span className="text-red-600">{formatCurrency(form.amount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Transfer Options */}
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Quick Options:</h4>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ 
                    ...prev, 
                    narration: `Cash deposit to bank - ${formatCurrency(form.amount)}` 
                  }))}
                  className="w-full text-xs text-left px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cash deposit to bank
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ 
                    ...prev, 
                    narration: `Cash withdrawal from bank - ${formatCurrency(form.amount)}` 
                  }))}
                  className="w-full text-xs text-left px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  Cash withdrawal from bank
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ 
                    ...prev, 
                    narration: `Fund transfer - ${formatCurrency(form.amount)}` 
                  }))}
                  className="w-full text-xs text-left px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  General fund transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}