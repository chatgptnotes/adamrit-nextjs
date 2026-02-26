'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { CreditCard, Plus, Save, ArrowRightLeft } from 'lucide-react'

export default function ContraEntry() {
  const [entries, setEntries] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    from_account_id: '',
    to_account_id: '',
    amount: '',
    narration: '',
    reference: '',
    location_id: 1
  })

  useEffect(() => {
    fetchData()
  }, [selectedLocation])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch contra entries (voucher type = 'Contra')
      const { data: contraData } = await supabaseProd
        .from('vouchers')
        .select(`
          *,
          voucher_entries (
            *,
            chart_of_accounts (name)
          )
        `)
        .eq('location_id', selectedLocation)
        .eq('voucher_type', 'Contra')
        .order('date', { ascending: false })
        .limit(100)

      // Fetch chart of accounts (filter for cash and bank accounts)
      const { data: accountData } = await supabaseProd
        .from('chart_of_accounts')
        .select('*')
        .order('name', { ascending: true })

      setEntries(contraData || [])
      setAccounts(accountData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
      location_id: selectedLocation
    }))
  }

  const generateVoucherNumber = () => {
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    const location = selectedLocation === 1 ? 'H' : 'A'
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `CV${location}${dateStr}${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.from_account_id === formData.to_account_id) {
      alert('From and To accounts cannot be the same!')
      return
    }

    setSaving(true)
    try {
      const amount = parseFloat(formData.amount)
      
      // Create voucher
      const voucherData = {
        voucher_number: generateVoucherNumber(),
        voucher_type: 'Contra',
        date: formData.date,
        narration: formData.narration || `Transfer from account to account`,
        reference: formData.reference,
        location_id: selectedLocation,
        status: 'Posted',
        total_amount: amount,
        created_at: new Date().toISOString()
      }

      const { data: voucher, error: voucherError } = await supabaseProd
        .from('vouchers')
        .insert([voucherData])
        .select()
        .single()

      if (voucherError) throw voucherError

      // Create voucher entries for contra (two entries: debit to-account, credit from-account)
      const entries = [
        // Debit the To account (money coming in)
        {
          voucher_id: voucher.id,
          account_id: parseInt(formData.to_account_id),
          debit: amount,
          credit: 0,
          narration: formData.narration || `Transfer received`,
          date: formData.date,
          location_id: selectedLocation
        },
        // Credit the From account (money going out)
        {
          voucher_id: voucher.id,
          account_id: parseInt(formData.from_account_id),
          debit: 0,
          credit: amount,
          narration: formData.narration || `Transfer sent`,
          date: formData.date,
          location_id: selectedLocation
        }
      ]

      await supabaseProd
        .from('voucher_entries')
        .insert(entries)

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        from_account_id: '',
        to_account_id: '',
        amount: '',
        narration: '',
        reference: '',
        location_id: selectedLocation
      })
      setShowForm(false)
      fetchData()

      alert('Contra entry created successfully!')
    } catch (error) {
      console.error('Error creating contra entry:', error)
      alert('Error creating contra entry. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'voucher_number', label: 'Voucher #' },
    { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) },
    { 
      key: 'from_account', 
      label: 'From Account',
      render: (r: any) => {
        const creditEntry = r.voucher_entries?.find((e: any) => e.credit > 0)
        return creditEntry?.chart_of_accounts?.name || 'N/A'
      }
    },
    { 
      key: 'to_account', 
      label: 'To Account',
      render: (r: any) => {
        const debitEntry = r.voucher_entries?.find((e: any) => e.debit > 0)
        return debitEntry?.chart_of_accounts?.name || 'N/A'
      }
    },
    { 
      key: 'total_amount', 
      label: 'Amount',
      render: (r: any) => <span className="font-semibold text-blue-600">{formatCurrency(r.total_amount)}</span>
    },
    { 
      key: 'narration', 
      label: 'Narration',
      render: (r: any) => <span className="text-sm max-w-[300px] truncate block">{r.narration}</span>
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (r: any) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          r.status === 'Posted' ? 'bg-green-100 text-green-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {r.status}
        </span>
      )
    }
  ]

  // Filter accounts to show primarily cash/bank accounts for contra entries
  const cashBankAccounts = accounts.filter(acc => 
    acc.name?.toLowerCase().includes('cash') || 
    acc.name?.toLowerCase().includes('bank') ||
    acc.name?.toLowerCase().includes('current') ||
    acc.name?.toLowerCase().includes('savings')
  )

  const fromAccount = accounts.find(acc => acc.id.toString() === formData.from_account_id)
  const toAccount = accounts.find(acc => acc.id.toString() === formData.to_account_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Contra Entry</h2>
            <p className="text-sm text-gray-500">Bank-to-cash transfers and account transfers</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Contra Entry
        </button>
      </div>

      {/* Location Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <label className="text-sm font-medium text-gray-700">Location:</label>
        <select 
          value={selectedLocation} 
          onChange={(e) => setSelectedLocation(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value={1}>Hope Hospital</option>
          <option value={2}>Ayushman Hospital</option>
        </select>
      </div>

      {/* Contra Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Contra Entry</h3>
          
          {/* Visual Transfer Indicator */}
          {fromAccount && toAccount && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="font-medium text-blue-900">{fromAccount.name}</div>
                  <div className="text-sm text-blue-600">From Account</div>
                </div>
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                <div className="text-center">
                  <div className="font-medium text-blue-900">{toAccount.name}</div>
                  <div className="text-sm text-blue-600">To Account</div>
                </div>
              </div>
              {formData.amount && (
                <div className="text-center mt-2">
                  <span className="text-lg font-semibold text-blue-900">
                    {formatCurrency(parseFloat(formData.amount))}
                  </span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Transfer amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Account * <span className="text-red-500">(Credit)</span>
                </label>
                <select
                  name="from_account_id"
                  value={formData.from_account_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select source account</option>
                  {cashBankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.id.toString() === formData.to_account_id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Money will be deducted from this account</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Account * <span className="text-green-500">(Debit)</span>
                </label>
                <select
                  name="to_account_id"
                  value={formData.to_account_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select destination account</option>
                  {cashBankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.id.toString() === formData.from_account_id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Money will be added to this account</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Transaction reference or cheque number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Narration
              </label>
              <textarea
                name="narration"
                value={formData.narration}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Description or purpose of the transfer"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Contra Entry'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contra Entries Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Contra Entries</h3>
        <DataTable 
          data={entries}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search contra entries..."
          searchKey="voucher_number"
        />
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">About Contra Entries</h4>
        <p className="text-sm text-blue-700">
          Contra entries are used for transfers between cash and bank accounts or between different bank accounts. 
          They don't affect your profit/loss but show movement of funds between accounts. Common examples include:
          cash deposits to bank, cash withdrawals from bank, and transfers between different bank accounts.
        </p>
      </div>
    </div>
  )
}