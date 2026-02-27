'use client'
import { useState, useEffect } from 'react'
import { getPatientAccountStatement, searchPatients } from '@/lib/accounting-engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import { User, Search, Calendar, Printer, Download, DollarSign, Receipt } from 'lucide-react'

interface Patient {
  id: string
  name: string
  phone?: string
  address?: string
}

interface PatientStatement {
  billings: Array<{
    id: number
    date: string
    total_amount: number
    description?: string
  }>
  payments: Array<{
    id: number
    voucher_date: string
    credit: number
    voucher_logs: {
      voucher_number: string
      type: string
    }
    narration: string
  }>
  total_billed: number
  total_paid: number
  outstanding: number
}

export default function PatientAccount() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [statement, setStatement] = useState<PatientStatement | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPatientSearch, setShowPatientSearch] = useState(false)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setMonth(date.getMonth() - 3) // Last 3 months
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])

  const handlePatientSearch = async (term: string) => {
    setSearchTerm(term)
    if (term.length > 2) {
      try {
        const results = await searchPatients(term)
        setPatients(results)
        setShowPatientSearch(true)
      } catch (error) {
        console.error('Error searching patients:', error)
        setPatients([])
      }
    } else {
      setShowPatientSearch(false)
      setPatients([])
    }
  }

  const selectPatient = async (patient: Patient) => {
    setSelectedPatient(patient)
    setSearchTerm(patient.name)
    setShowPatientSearch(false)
    await loadPatientStatement(patient.id)
  }

  const loadPatientStatement = async (patientId: string) => {
    if (!patientId) return
    
    setLoading(true)
    try {
      const statementData = await getPatientAccountStatement(patientId, fromDate, toDate)
      setStatement(statementData)
    } catch (error) {
      console.error('Error loading patient statement:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    if (selectedPatient) {
      loadPatientStatement(selectedPatient.id)
    }
  }

  const handlePrint = () => {
    if (!selectedPatient || !statement) return
    
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0;">PATIENT ACCOUNT STATEMENT</h2>
          <h3 style="margin: 5px 0;">${selectedPatient.name}</h3>
          <p style="margin: 5px 0;">Patient ID: ${selectedPatient.id}</p>
          <p style="margin: 5px 0;">From ${formatDate(fromDate)} to ${formatDate(toDate)}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h4>BILLING SUMMARY</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Date</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Description</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${statement.billings.map(billing => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${formatDate(billing.date)}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${billing.description || 'Medical Services'}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(billing.total_amount)}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f9f9f9; font-weight: bold;">
                <td colspan="2" style="border: 1px solid #000; padding: 8px;">TOTAL BILLED</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(statement.total_billed)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h4>PAYMENT HISTORY</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Date</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Voucher No.</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Narration</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${statement.payments.map(payment => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px;">${formatDate(payment.voucher_date)}</td>
                  <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${payment.voucher_logs.voucher_number}</td>
                  <td style="border: 1px solid #000; padding: 8px;">${payment.narration}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(payment.credit)}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f9f9f9; font-weight: bold;">
                <td colspan="3" style="border: 1px solid #000; padding: 8px;">TOTAL PAID</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">${formatCurrency(statement.total_paid)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style="margin-top: 30px; border: 2px solid #000; padding: 15px;">
          <table style="width: 100%;">
            <tr>
              <td style="font-weight: bold; font-size: 14px;">Total Billed:</td>
              <td style="text-align: right; font-size: 14px;">${formatCurrency(statement.total_billed)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; font-size: 14px;">Total Paid:</td>
              <td style="text-align: right; font-size: 14px;">${formatCurrency(statement.total_paid)}</td>
            </tr>
            <tr style="border-top: 1px solid #000;">
              <td style="font-weight: bold; font-size: 16px; color: ${statement.outstanding > 0 ? 'red' : 'green'};">
                ${statement.outstanding > 0 ? 'Outstanding Balance:' : 'Advance/Credit:'}
              </td>
              <td style="text-align: right; font-weight: bold; font-size: 16px; color: ${statement.outstanding > 0 ? 'red' : 'green'};">
                ${formatCurrency(Math.abs(statement.outstanding))}
              </td>
            </tr>
          </table>
        </div>
        
        <div style="margin-top: 40px; text-align: right;">
          <p>Generated on: ${formatDate(new Date().toISOString().split('T')[0])}</p>
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
    if (!selectedPatient || !statement) return
    
    const csvData = [
      ['Patient Account Statement'],
      ['Patient Name', selectedPatient.name],
      ['Patient ID', selectedPatient.id],
      ['From Date', fromDate],
      ['To Date', toDate],
      [''],
      ['BILLING DETAILS'],
      ['Date', 'Description', 'Amount']
    ]
    
    statement.billings.forEach(billing => {
      csvData.push([
        billing.date,
        billing.description || 'Medical Services',
        billing.total_amount.toString()
      ])
    })
    
    csvData.push(['', 'TOTAL BILLED', statement.total_billed.toString()])
    csvData.push([''])
    csvData.push(['PAYMENT HISTORY'])
    csvData.push(['Date', 'Voucher No.', 'Narration', 'Amount'])
    
    statement.payments.forEach(payment => {
      csvData.push([
        payment.voucher_date,
        payment.voucher_logs.voucher_number,
        payment.narration.replace(/"/g, '""'),
        payment.credit.toString()
      ])
    })
    
    csvData.push(['', '', 'TOTAL PAID', statement.total_paid.toString()])
    csvData.push([''])
    csvData.push(['SUMMARY'])
    csvData.push(['Total Billed', statement.total_billed.toString()])
    csvData.push(['Total Paid', statement.total_paid.toString()])
    csvData.push([statement.outstanding > 0 ? 'Outstanding Balance' : 'Advance/Credit', Math.abs(statement.outstanding).toString()])
    
    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `patient-account-${selectedPatient.name.replace(/\s+/g, '-')}-${fromDate}-to-${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <User className="w-7 h-7 text-blue-600" />
          Patient Account
        </h1>
        {selectedPatient && statement && (
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Statement
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Patient Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Patient Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient *</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handlePatientSearch(e.target.value)}
                placeholder="Search by name, phone, or ID..."
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
            
            {/* Patient Search Results */}
            {showPatientSearch && patients.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => selectPatient(patient)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-xs text-gray-500">
                      ID: {patient.id} {patient.phone && ` • ${patient.phone}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {selectedPatient && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                Selected: {selectedPatient.name} (ID: {selectedPatient.id})
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
              onClick={handleRefresh}
              disabled={!selectedPatient}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Load Statement
            </button>
          </div>
        </div>
      </div>

      {/* Account Statement */}
      {selectedPatient && statement && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Billed</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {formatCurrency(statement.total_billed)}
                  </p>
                </div>
                <Receipt className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-xl border-2 border-green-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Total Paid</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {formatCurrency(statement.total_paid)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className={`rounded-xl border-2 p-6 ${
              statement.outstanding > 0 
                ? 'bg-red-50 border-red-200' 
                : 'bg-purple-50 border-purple-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    statement.outstanding > 0 ? 'text-red-700' : 'text-purple-700'
                  }`}>
                    {statement.outstanding > 0 ? 'Outstanding' : 'Advance/Credit'}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${
                    statement.outstanding > 0 ? 'text-red-900' : 'text-purple-900'
                  }`}>
                    {formatCurrency(Math.abs(statement.outstanding))}
                  </p>
                </div>
                <DollarSign className={`w-8 h-8 ${
                  statement.outstanding > 0 ? 'text-red-600' : 'text-purple-600'
                }`} />
              </div>
            </div>
          </div>

          {/* Billing Details */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Details</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Description</th>
                    <th className="text-right py-3 px-6 font-medium text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-500">Loading billing details...</td>
                    </tr>
                  ) : statement.billings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-500">No billings found</td>
                    </tr>
                  ) : (
                    statement.billings.map((billing, index) => (
                      <tr key={billing.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                      }`}>
                        <td className="py-3 px-6">{formatDate(billing.date)}</td>
                        <td className="py-3 px-6">{billing.description || 'Medical Services'}</td>
                        <td className="py-3 px-6 text-right font-semibold text-blue-600">
                          {formatCurrency(billing.total_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                  {statement.billings.length > 0 && (
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td colSpan={2} className="py-4 px-6 font-bold text-blue-700">Total Billed</td>
                      <td className="py-4 px-6 text-right font-bold text-blue-700 text-lg">
                        {formatCurrency(statement.total_billed)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Voucher No.</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-700">Narration</th>
                    <th className="text-right py-3 px-6 font-medium text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.payments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">No payments found</td>
                    </tr>
                  ) : (
                    statement.payments.map((payment, index) => (
                      <tr key={payment.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25'
                      }`}>
                        <td className="py-3 px-6">{formatDate(payment.voucher_date)}</td>
                        <td className="py-3 px-6 font-mono text-xs">{payment.voucher_logs.voucher_number}</td>
                        <td className="py-3 px-6 max-w-xs">{payment.narration}</td>
                        <td className="py-3 px-6 text-right font-semibold text-green-600">
                          {formatCurrency(payment.credit)}
                        </td>
                      </tr>
                    ))
                  )}
                  {statement.payments.length > 0 && (
                    <tr className="bg-green-50 border-t-2 border-green-200">
                      <td colSpan={3} className="py-4 px-6 font-bold text-green-700">Total Paid</td>
                      <td className="py-4 px-6 text-right font-bold text-green-700 text-lg">
                        {formatCurrency(statement.total_paid)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* No Patient Selected */}
      {!selectedPatient && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Patient Selected</h3>
          <p className="text-gray-500">Search and select a patient to view their account statement</p>
        </div>
      )}
    </div>
  )
}