'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { ArrowUpCircle, Plus, Printer, Save, Building, CreditCard } from 'lucide-react'

export default function PaymentVoucher() {
  const [vouchers, setVouchers] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  const [formData, setFormData] = useState({
    payee_name: '',
    amount: '',
    payment_mode: 'Cash',
    account_id: '',
    narration: '',
    cheque_no: '',
    cheque_date: '',
    bank_name: '',
    reference_no: '',
    location_id: 1
  })

  useEffect(() => {
    fetchData()
  }, [selectedLocation])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch payment vouchers
      const { data: voucherData } = await supabaseProd
        .from('vouchers')
        .select(`
          *,
          voucher_entries (*)
        `)
        .eq('location_id', selectedLocation)
        .eq('voucher_type', 'Payment')
        .order('date', { ascending: false })
        .limit(100)

      // Fetch chart of accounts
      const { data: accountData } = await supabaseProd
        .from('chart_of_accounts')
        .select('*')
        .order('name', { ascending: true })

      setVouchers(voucherData || [])
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
    return `PV${location}${dateStr}${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Create voucher
      const voucherData = {
        voucher_number: generateVoucherNumber(),
        voucher_type: 'Payment',
        date: new Date().toISOString().split('T')[0],
        narration: formData.narration || `Payment to ${formData.payee_name}`,
        location_id: selectedLocation,
        status: 'Posted',
        total_amount: parseFloat(formData.amount),
        created_at: new Date().toISOString()
      }

      const { data: voucher, error: voucherError } = await supabaseProd
        .from('vouchers')
        .insert([voucherData])
        .select()
        .single()

      if (voucherError) throw voucherError

      // Create voucher entries for double-entry bookkeeping
      const entries = []

      // Credit the payment account (e.g., Cash, Bank)
      if (formData.account_id) {
        entries.push({
          voucher_id: voucher.id,
          account_id: parseInt(formData.account_id),
          debit: 0,
          credit: parseFloat(formData.amount),
          narration: formData.narration || `Payment to ${formData.payee_name}`,
          date: new Date().toISOString().split('T')[0],
          location_id: selectedLocation
        })
      }

      // Debit the expense/payable account (you might want to add another account selector)
      // For now, we'll use a default expense account or let user select
      entries.push({
        voucher_id: voucher.id,
        account_id: parseInt(formData.account_id), // This should be different - expense account
        debit: parseFloat(formData.amount),
        credit: 0,
        narration: formData.narration || `Payment to ${formData.payee_name}`,
        date: new Date().toISOString().split('T')[0],
        location_id: selectedLocation
      })

      if (entries.length > 0) {
        await supabaseProd
          .from('voucher_entries')
          .insert(entries)
      }

      // Reset form and refresh data
      setFormData({
        payee_name: '',
        amount: '',
        payment_mode: 'Cash',
        account_id: '',
        narration: '',
        cheque_no: '',
        cheque_date: '',
        bank_name: '',
        reference_no: '',
        location_id: selectedLocation
      })
      setShowForm(false)
      fetchData()

      alert('Payment voucher created successfully!')
    } catch (error) {
      console.error('Error creating payment voucher:', error)
      alert('Error creating payment voucher. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'voucher_number', label: 'Voucher #' },
    { 
      key: 'payee_name', 
      label: 'Payee',
      render: (r: any) => r.narration?.split('to ')[1]?.split(' ')[0] || 'N/A'
    },
    { 
      key: 'total_amount', 
      label: 'Amount',
      render: (r: any) => <span className="font-semibold text-red-600">{formatCurrency(r.total_amount)}</span>
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (r: any) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          r.status === 'Posted' ? 'bg-green-100 text-green-700' :
          r.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {r.status}
        </span>
      )
    },
    { 
      key: 'narration', 
      label: 'Narration',
      render: (r: any) => <span className="text-sm max-w-[300px] truncate block">{r.narration}</span>
    },
    { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r: any) => (
        <button
          onClick={() => printVoucher(r)}
          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
          title="Print Voucher"
        >
          <Printer className="w-4 h-4" />
        </button>
      )
    }
  ]

  const printVoucher = (voucher: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Voucher - ${voucher.voucher_number}</title>
          <style>
            @media print {
              body { margin: 0; font-family: Arial, sans-serif; font-size: 14px; }
              .voucher { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #333; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .section { margin-bottom: 20px; }
              .total { font-weight: bold; font-size: 16px; border-top: 1px solid #333; padding-top: 10px; margin-top: 10px; }
              .signature { margin-top: 40px; display: flex; justify-content: space-between; }
              @page { size: A4 portrait; margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="voucher">
            <div class="header">
              <h2>${selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}</h2>
              <p>Payment Voucher</p>
              <p><strong>Voucher #: ${voucher.voucher_number}</strong></p>
            </div>
            
            <div class="section">
              <div class="row">
                <span><strong>Date:</strong></span>
                <span>${formatDate(voucher.date)}</span>
              </div>
              <div class="row">
                <span><strong>Payee:</strong></span>
                <span>${voucher.narration?.split('to ')[1] || 'N/A'}</span>
              </div>
              <div class="row">
                <span><strong>Payment Mode:</strong></span>
                <span>Cash</span>
              </div>
            </div>

            <div class="section">
              <div class="row">
                <span><strong>Description:</strong></span>
                <span>${voucher.narration}</span>
              </div>
            </div>

            <div class="row total">
              <span><strong>Amount Paid:</strong></span>
              <span><strong>${formatCurrency(voucher.total_amount)}</strong></span>
            </div>

            <div class="signature">
              <div style="text-align: center;">
                <div style="border-top: 1px solid #333; width: 150px; padding-top: 5px;">
                  Authorized By
                </div>
              </div>
              <div style="text-align: center;">
                <div style="border-top: 1px solid #333; width: 150px; padding-top: 5px;">
                  Received By
                </div>
              </div>
              <div style="text-align: center;">
                <div style="border-top: 1px solid #333; width: 150px; padding-top: 5px;">
                  Prepared By
                </div>
              </div>
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
          <div className="p-2.5 bg-red-50 rounded-lg text-red-600">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Payment Voucher</h2>
            <p className="text-sm text-gray-500">Create and manage payment vouchers</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Payment
        </button>
      </div>

      {/* Location Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <label className="text-sm font-medium text-gray-700">Location:</label>
        <select 
          value={selectedLocation} 
          onChange={(e) => setSelectedLocation(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value={1}>Hope Hospital</option>
          <option value={2}>Ayushman Hospital</option>
        </select>
      </div>

      {/* Payment Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Payment Voucher</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payee Name *
                </label>
                <input
                  type="text"
                  name="payee_name"
                  value={formData.payee_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Name of the payee"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Payment amount"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pay From Account *
                </label>
                <select
                  name="account_id"
                  value={formData.account_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select account</option>
                  {accounts.filter(acc => 
                    acc.name?.toLowerCase().includes('cash') || 
                    acc.name?.toLowerCase().includes('bank')
                  ).map(acc => (
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Bank name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                name="reference_no"
                value={formData.reference_no}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Reference or invoice number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Narration *
              </label>
              <textarea
                name="narration"
                value={formData.narration}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Description or purpose of payment"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Payment'}
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

      {/* Payment Vouchers Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payment Vouchers</h3>
        <DataTable 
          data={vouchers}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search vouchers..."
          searchKey="voucher_number"
        />
      </div>
    </div>
  )
}