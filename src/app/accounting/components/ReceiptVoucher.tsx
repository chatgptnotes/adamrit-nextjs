'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { Receipt, Plus, Printer, Save, User, CreditCard } from 'lucide-react'

export default function ReceiptVoucher() {
  const [receipts, setReceipts] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  const [formData, setFormData] = useState({
    patient_id: '',
    patient_name: '',
    amount: '',
    payment_mode: 'Cash',
    account_id: '',
    narration: '',
    cheque_no: '',
    cheque_date: '',
    bank_name: '',
    location_id: 1
  })

  useEffect(() => {
    fetchData()
  }, [selectedLocation])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch receipts
      const { data: receiptData } = await supabaseProd
        .from('account_receipts')
        .select('*')
        .eq('location_id', selectedLocation)
        .order('date', { ascending: false })
        .limit(100)

      // Fetch chart of accounts for dropdown
      const { data: accountData } = await supabaseProd
        .from('chart_of_accounts')
        .select('*')
        .order('name', { ascending: true })

      setReceipts(receiptData || [])
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

  const generateReceiptNumber = () => {
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    const location = selectedLocation === 1 ? 'H' : 'A'
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `R${location}${dateStr}${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const receiptData = {
        receipt_no: generateReceiptNumber(),
        patient_id: formData.patient_id || null,
        amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode,
        date: new Date().toISOString().split('T')[0],
        location_id: selectedLocation,
        cheque_no: formData.cheque_no || null,
        cheque_date: formData.cheque_date || null,
        bank_name: formData.bank_name || null,
        created_at: new Date().toISOString()
      }

      // Insert receipt
      const { data: receipt, error: receiptError } = await supabaseProd
        .from('account_receipts')
        .insert([receiptData])
        .select()
        .single()

      if (receiptError) throw receiptError

      // Create corresponding voucher entry for double-entry bookkeeping
      if (formData.account_id) {
        const voucherEntry = {
          account_id: parseInt(formData.account_id),
          debit: 0,
          credit: parseFloat(formData.amount),
          narration: formData.narration || `Receipt from ${formData.patient_name || formData.patient_id}`,
          date: new Date().toISOString().split('T')[0],
          location_id: selectedLocation,
          created_at: new Date().toISOString()
        }

        await supabaseProd
          .from('voucher_entries')
          .insert([voucherEntry])
      }

      // Reset form and refresh data
      setFormData({
        patient_id: '',
        patient_name: '',
        amount: '',
        payment_mode: 'Cash',
        account_id: '',
        narration: '',
        cheque_no: '',
        cheque_date: '',
        bank_name: '',
        location_id: selectedLocation
      })
      setShowForm(false)
      fetchData()

      alert('Receipt created successfully!')
    } catch (error) {
      console.error('Error creating receipt:', error)
      alert('Error creating receipt. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'receipt_no', label: 'Receipt #' },
    { key: 'patient_id', label: 'Patient ID' },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (r: any) => <span className="font-semibold text-emerald-700">{formatCurrency(r.amount)}</span>
    },
    { 
      key: 'payment_mode', 
      label: 'Payment Mode',
      render: (r: any) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          r.payment_mode === 'Cash' ? 'bg-green-100 text-green-700' :
          r.payment_mode === 'Card' ? 'bg-blue-100 text-blue-700' :
          r.payment_mode === 'Cheque' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {r.payment_mode}
        </span>
      )
    },
    { key: 'cheque_no', label: 'Cheque #' },
    { key: 'bank_name', label: 'Bank' },
    { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: any) => (
        <button
          onClick={() => printReceipt(r)}
          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
          title="Print Receipt"
        >
          <Printer className="w-4 h-4" />
        </button>
      )
    }
  ]

  const printReceipt = (receipt: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.receipt_no}</title>
          <style>
            @media print {
              body { margin: 0; font-family: Arial, sans-serif; font-size: 14px; }
              .receipt { max-width: 400px; margin: 20px auto; padding: 20px; border: 1px solid #333; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .total { font-weight: bold; font-size: 16px; border-top: 1px solid #333; padding-top: 10px; margin-top: 10px; }
              @page { size: A5 portrait; margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>${selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}</h2>
              <p>Payment Receipt</p>
              <p><strong>Receipt #: ${receipt.receipt_no}</strong></p>
            </div>
            <div class="row">
              <span>Date:</span>
              <span>${formatDate(receipt.date)}</span>
            </div>
            <div class="row">
              <span>Patient ID:</span>
              <span>${receipt.patient_id || 'N/A'}</span>
            </div>
            <div class="row">
              <span>Payment Mode:</span>
              <span>${receipt.payment_mode}</span>
            </div>
            ${receipt.cheque_no ? `
            <div class="row">
              <span>Cheque #:</span>
              <span>${receipt.cheque_no}</span>
            </div>
            <div class="row">
              <span>Bank:</span>
              <span>${receipt.bank_name || ''}</span>
            </div>
            ` : ''}
            <div class="row total">
              <span>Amount Received:</span>
              <span>${formatCurrency(receipt.amount)}</span>
            </div>
            <div style="margin-top: 30px; text-align: center; font-size: 12px;">
              <p>Thank you for your payment!</p>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-50 rounded-lg text-green-600">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Receipt Voucher</h2>
            <p className="text-sm text-gray-500">Create and manage payment receipts</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Receipt
        </button>
      </div>

      {/* Location Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <label className="text-sm font-medium text-gray-700">Location:</label>
        <select 
          value={selectedLocation} 
          onChange={(e) => setSelectedLocation(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value={1}>Hope Hospital</option>
          <option value={2}>Ayushman Hospital</option>
        </select>
      </div>

      {/* Receipt Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Receipt</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient ID
                </label>
                <input
                  type="text"
                  name="patient_id"
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter patient ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Name
                </label>
                <input
                  type="text"
                  name="patient_name"
                  value={formData.patient_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter patient name"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode *
                </label>
                <select
                  name="payment_mode"
                  value={formData.payment_mode}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account
                </label>
                <select
                  name="account_id"
                  value={formData.account_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cheque details (show only if payment mode is Cheque) */}
            {formData.payment_mode === 'Cheque' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-yellow-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cheque Number
                  </label>
                  <input
                    type="text"
                    name="cheque_no"
                    value={formData.cheque_no}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Cheque number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    name="cheque_date"
                    value={formData.cheque_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Bank name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Narration
              </label>
              <textarea
                name="narration"
                value={formData.narration}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Description or narration for this receipt"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Receipt'}
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

      {/* Receipts Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Receipts</h3>
        <DataTable 
          data={receipts}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search receipts..."
          searchKey="receipt_no"
        />
      </div>
    </div>
  )
}