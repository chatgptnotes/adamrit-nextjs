'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { User, Search, FileText, CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react'

interface PatientAccountData {
  patient_id: string
  total_billed: number
  total_received: number
  outstanding: number
  last_payment: string
  receipts: any[]
  bills: any[]
}

export default function PatientAccount() {
  const [patientData, setPatientData] = useState<PatientAccountData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchPatientId, setSearchPatientId] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  const searchPatient = async () => {
    if (!searchPatientId.trim()) {
      alert('Please enter a Patient ID')
      return
    }

    setLoading(true)
    try {
      // Fetch patient receipts
      const { data: receipts } = await supabaseProd
        .from('account_receipts')
        .select('*')
        .eq('patient_id', searchPatientId.trim())
        .eq('location_id', selectedLocation)
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
        .order('date', { ascending: false })

      // Fetch patient bills (from final_billings table)
      const { data: bills } = await supabaseProd
        .from('final_billings')
        .select('*')
        .eq('patient_id', searchPatientId.trim())
        .gte('bill_date', dateRange.from)
        .lte('bill_date', dateRange.to)
        .order('bill_date', { ascending: false })

      // Calculate totals
      const totalReceived = receipts?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const totalBilled = bills?.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0) || 0
      const outstanding = totalBilled - totalReceived

      // Find last payment date
      const lastPayment = receipts && receipts.length > 0 ? receipts[0].date : null

      setPatientData({
        patient_id: searchPatientId.trim(),
        total_billed: totalBilled,
        total_received: totalReceived,
        outstanding: outstanding,
        last_payment: lastPayment,
        receipts: receipts || [],
        bills: bills || []
      })

    } catch (error) {
      console.error('Error searching patient account:', error)
      alert('Error searching patient account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchPatient()
    }
  }

  const receiptColumns = [
    { key: 'receipt_no', label: 'Receipt #' },
    { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (r: any) => <span className="font-semibold text-green-600">{formatCurrency(r.amount)}</span>
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
    { key: 'bank_name', label: 'Bank' }
  ]

  const billColumns = [
    { key: 'id', label: 'Bill ID' },
    { key: 'bill_date', label: 'Bill Date', render: (r: any) => formatDate(r.bill_date) },
    { 
      key: 'total_amount', 
      label: 'Total Amount',
      render: (r: any) => <span className="font-semibold">{formatCurrency(parseFloat(r.total_amount) || 0)}</span>
    },
    { 
      key: 'amount_paid', 
      label: 'Amount Paid',
      render: (r: any) => <span className="text-green-600">{formatCurrency(parseFloat(r.amount_paid) || 0)}</span>
    },
    { 
      key: 'amount_pending', 
      label: 'Amount Pending',
      render: (r: any) => {
        const pending = parseFloat(r.amount_pending) || 0
        return (
          <span className={pending > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
            {formatCurrency(pending)}
          </span>
        )
      }
    },
    { 
      key: 'discount', 
      label: 'Discount',
      render: (r: any) => formatCurrency(parseFloat(r.discount) || 0)
    }
  ]

  const generateStatement = () => {
    if (!patientData) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Patient Statement - ${patientData.patient_id}</title>
          <style>
            @media print {
              body { margin: 0; font-family: Arial, sans-serif; font-size: 12px; }
              .statement { max-width: 800px; margin: 20px auto; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
              .patient-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border: 1px solid #ddd; }
              .summary { display: flex; justify-content: space-between; margin-bottom: 20px; }
              .summary-box { border: 1px solid #ddd; padding: 10px; text-align: center; width: 30%; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid #333; padding: 6px; text-align: left; font-size: 11px; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .number { text-align: right; }
              .outstanding { color: red; font-weight: bold; }
              .paid { color: green; }
              @page { size: A4 portrait; margin: 0.5in; }
            }
          </style>
        </head>
        <body>
          <div class="statement">
            <div class="header">
              <h2>${selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}</h2>
              <h3>Patient Account Statement</h3>
              <p>From ${formatDate(dateRange.from)} to ${formatDate(dateRange.to)}</p>
            </div>
            
            <div class="patient-info">
              <h3>Patient Information</h3>
              <p><strong>Patient ID:</strong> ${patientData.patient_id}</p>
              <p><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
              <p><strong>Last Payment:</strong> ${patientData.last_payment ? formatDate(patientData.last_payment) : 'No payments found'}</p>
            </div>

            <div class="summary">
              <div class="summary-box">
                <h4>Total Billed</h4>
                <p style="font-size: 16px; font-weight: bold;">${formatCurrency(patientData.total_billed)}</p>
              </div>
              <div class="summary-box">
                <h4>Total Received</h4>
                <p style="font-size: 16px; font-weight: bold;" class="paid">${formatCurrency(patientData.total_received)}</p>
              </div>
              <div class="summary-box">
                <h4>Outstanding</h4>
                <p style="font-size: 16px; font-weight: bold;" class="outstanding">${formatCurrency(patientData.outstanding)}</p>
              </div>
            </div>

            ${patientData.bills.length > 0 ? `
            <h3>Bills</h3>
            <table>
              <thead>
                <tr>
                  <th>Bill Date</th>
                  <th>Bill ID</th>
                  <th class="number">Total Amount</th>
                  <th class="number">Amount Paid</th>
                  <th class="number">Amount Pending</th>
                  <th class="number">Discount</th>
                </tr>
              </thead>
              <tbody>
                ${patientData.bills.map(bill => `
                  <tr>
                    <td>${formatDate(bill.bill_date)}</td>
                    <td>${bill.id}</td>
                    <td class="number">${formatCurrency(parseFloat(bill.total_amount) || 0)}</td>
                    <td class="number paid">${formatCurrency(parseFloat(bill.amount_paid) || 0)}</td>
                    <td class="number ${parseFloat(bill.amount_pending) > 0 ? 'outstanding' : 'paid'}">${formatCurrency(parseFloat(bill.amount_pending) || 0)}</td>
                    <td class="number">${formatCurrency(parseFloat(bill.discount) || 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : ''}

            ${patientData.receipts.length > 0 ? `
            <h3>Payments Received</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt #</th>
                  <th class="number">Amount</th>
                  <th>Payment Mode</th>
                  <th>Cheque #</th>
                  <th>Bank</th>
                </tr>
              </thead>
              <tbody>
                ${patientData.receipts.map(receipt => `
                  <tr>
                    <td>${formatDate(receipt.date)}</td>
                    <td>${receipt.receipt_no}</td>
                    <td class="number paid">${formatCurrency(receipt.amount)}</td>
                    <td>${receipt.payment_mode}</td>
                    <td>${receipt.cheque_no || '—'}</td>
                    <td>${receipt.bank_name || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : ''}

            <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #666;">
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
        <div className="p-2.5 bg-cyan-50 rounded-lg text-cyan-600">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Patient Account</h2>
          <p className="text-sm text-gray-500">Search patient, view receivable/payable/statement</p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Patient Account</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient ID *
            </label>
            <input
              type="text"
              value={searchPatientId}
              onChange={(e) => setSearchPatientId(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Enter Patient ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value={1}>Hope Hospital</option>
              <option value={2}>Ayushman Hospital</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <button
            onClick={searchPatient}
            disabled={loading || !searchPatientId.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Patient Account Summary */}
      {patientData && (
        <>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Patient Account: {patientData.patient_id}
              </h3>
              <button
                onClick={generateStatement}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Print Statement
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Total Billed</span>
                </div>
                <span className="text-xl font-semibold text-blue-900">
                  {formatCurrency(patientData.total_billed)}
                </span>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Total Received</span>
                </div>
                <span className="text-xl font-semibold text-green-900">
                  {formatCurrency(patientData.total_received)}
                </span>
              </div>

              <div className={`p-4 rounded-lg border ${
                patientData.outstanding > 0 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className={`w-4 h-4 ${
                    patientData.outstanding > 0 ? 'text-red-600' : 'text-green-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    patientData.outstanding > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    Outstanding
                  </span>
                </div>
                <span className={`text-xl font-semibold ${
                  patientData.outstanding > 0 ? 'text-red-900' : 'text-green-900'
                }`}>
                  {formatCurrency(Math.abs(patientData.outstanding))}
                </span>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Last Payment</span>
                </div>
                <span className="text-lg font-semibold text-purple-900">
                  {patientData.last_payment ? formatDate(patientData.last_payment) : 'No payments'}
                </span>
              </div>
            </div>

            {/* Account Status */}
            <div className={`p-4 rounded-lg ${
              patientData.outstanding > 0
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <p className={`font-medium ${
                patientData.outstanding > 0 ? 'text-red-900' : 'text-green-900'
              }`}>
                {patientData.outstanding > 0 
                  ? `⚠ Patient has an outstanding balance of ${formatCurrency(patientData.outstanding)}` 
                  : '✓ Patient account is fully paid up'
                }
              </p>
            </div>
          </div>

          {/* Bills and Receipts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bills */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Bills ({patientData.bills.length})
              </h3>
              <DataTable 
                data={patientData.bills}
                columns={billColumns}
                loading={false}
                searchPlaceholder="Search bills..."
                searchKey="id"
              />
            </div>

            {/* Receipts */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Payments ({patientData.receipts.length})
              </h3>
              <DataTable 
                data={patientData.receipts}
                columns={receiptColumns}
                loading={false}
                searchPlaceholder="Search receipts..."
                searchKey="receipt_no"
              />
            </div>
          </div>
        </>
      )}

      {/* Instructions */}
      {!patientData && !loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">Search Patient Account</h3>
          <p className="text-gray-500">
            Enter a Patient ID to view their complete account statement including all bills, 
            payments, and outstanding balances.
          </p>
        </div>
      )}
    </div>
  )
}