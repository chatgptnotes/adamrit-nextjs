'use client'
import { useState, useEffect } from 'react'
import { createPaymentVoucher, getChartOfAccounts } from '@/lib/accounting-engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowUpCircle, Search, Printer, Save, Building, DollarSign } from 'lucide-react'

interface Account {
  id: number
  name: string
  account_type: string
  account_code?: string
}

interface PaymentForm {
  account_id: number
  account_name: string
  amount: number
  payment_mode: string
  narration: string
  voucher_date: string
  location_id: number
}

export default function PaymentVoucher() {
  const [form, setForm] = useState<PaymentForm>({
    account_id: 0,
    account_name: '',
    amount: 0,
    payment_mode: 'Cash',
    narration: '',
    voucher_date: new Date().toISOString().split('T')[0],
    location_id: 1
  })
  
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showAccountSearch, setShowAccountSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastVoucherNumber, setLastVoucherNumber] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const accountsData = await getChartOfAccounts()
      // Filter out Cash and Bank accounts from payee selection (as they're the source accounts)
      const payeeAccounts = accountsData.filter(acc => 
        !['Cash', 'Bank', 'Cash in Hand', 'Bank Account'].includes(acc.name)
      )
      setAccounts(payeeAccounts)
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const handleAccountSearch = (term: string) => {
    setSearchTerm(term)
    if (term.length > 1) {
      const filtered = accounts.filter(account =>
        account.name.toLowerCase().includes(term.toLowerCase()) ||
        (account.account_code && account.account_code.toLowerCase().includes(term.toLowerCase()))
      )
      setFilteredAccounts(filtered)
      setShowAccountSearch(true)
    } else {
      setShowAccountSearch(false)
      setFilteredAccounts([])
    }
  }

  const selectAccount = (account: Account) => {
    setForm(prev => ({
      ...prev,
      account_id: account.id,
      account_name: account.name
    }))
    setSearchTerm(account.name)
    setShowAccountSearch(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.account_id || !form.amount || !form.narration) {
      alert('Please fill all required fields')
      return
    }

    setLoading(true)
    try {
      const result = await createPaymentVoucher({
        account_id: form.account_id,
        amount: form.amount,
        payment_mode: form.payment_mode,
        narration: form.narration,
        voucher_date: form.voucher_date,
        location_id: form.location_id
      })

      if (result.success) {
        setLastVoucherNumber(result.voucher_number)
        setShowSuccess(true)
        
        // Reset form
        setForm({
          account_id: 0,
          account_name: '',
          amount: 0,
          payment_mode: 'Cash',
          narration: '',
          voucher_date: new Date().toISOString().split('T')[0],
          location_id: form.location_id
        })
        setSearchTerm('')
        
        // Hide success message after 3 seconds
        setTimeout(() => setShowSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error creating payment voucher:', error)
      alert('Error creating payment voucher. Please try again.')
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
          <h3 style="margin: 5px 0;">PAYMENT VOUCHER</h3>
          <p style="margin: 5px 0;">Voucher No: ${lastVoucherNumber}</p>
          <p style="margin: 5px 0;">Date: ${formatDate(form.voucher_date)}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Paid to:</strong> ${form.account_name}</p>
          <p><strong>Amount:</strong> ${formatCurrency(form.amount)}</p>
          <p><strong>Payment Mode:</strong> ${form.payment_mode}</p>
          <p><strong>Being payment for:</strong> ${form.narration}</p>
        </div>
        
        <div style="border-top: 1px solid #000; margin-top: 30px; padding-top: 20px;">
          <div style="display: flex; justify-content: space-between;">
            <div>
              <p style="margin: 0;">Paid by</p>
              <br><br>
              <p style="margin: 0; border-top: 1px solid #000; padding-top: 5px;">Signature</p>
            </div>
            <div>
              <p style="margin: 0;">Received by</p>
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
          <ArrowUpCircle className="w-7 h-7 text-red-600" />
          Payment Voucher
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

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Payment voucher created successfully! Voucher No: {lastVoucherNumber}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Create New Payment</h3>
            
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

            {/* Account Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Pay To (Account) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleAccountSearch(e.target.value)}
                  placeholder="Search account by name or code..."
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
              
              {/* Account Search Results */}
              {showAccountSearch && filteredAccounts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredAccounts.map((account) => (
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
              
              {form.account_id > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  Selected: {form.account_name}
                </div>
              )}
            </div>

            {/* Amount and Payment Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Amount *
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                <select
                  value={form.payment_mode}
                  onChange={(e) => setForm(prev => ({ ...prev, payment_mode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                </select>
              </div>
            </div>

            {/* Narration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Narration *</label>
              <textarea
                value={form.narration}
                onChange={(e) => setForm(prev => ({ ...prev, narration: e.target.value }))}
                placeholder="Payment made for..."
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
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Payment'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Preview</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
              <div className="text-center">
                <h4 className="font-bold">
                  {form.location_id === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}
                </h4>
                <p className="text-sm text-gray-600">PAYMENT VOUCHER</p>
              </div>
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span>{formatDate(form.voucher_date)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pay To:</span>
                  <span className="text-right">{form.account_name || 'Not selected'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-red-600">{formatCurrency(form.amount)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Mode:</span>
                  <span>{form.payment_mode}</span>
                </div>
                
                {form.narration && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">For: {form.narration}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Accounting Entry Preview */}
            {form.amount > 0 && form.account_name && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Accounting Entry:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-red-600">Dr. {form.account_name}</span>
                    <span className="text-red-600">{formatCurrency(form.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600 pl-4">
                      Cr. {form.payment_mode === 'Cash' ? 'Cash' : 'Bank Account'}
                    </span>
                    <span className="text-green-600">{formatCurrency(form.amount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}