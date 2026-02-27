'use client'
import { useState, useEffect } from 'react'
import { createReceiptVoucher, searchPatients } from '@/lib/accounting-engine'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt, Search, Printer, Save, User, DollarSign } from 'lucide-react'

interface Patient {
  id: string
  name: string
  phone?: string
  address?: string
}

interface ReceiptForm {
  patient_id: string
  patient_name: string
  amount: number
  payment_mode: string
  narration: string
  voucher_date: string
  location_id: number
}

export default function ReceiptVoucher() {
  const [form, setForm] = useState<ReceiptForm>({
    patient_id: '',
    patient_name: '',
    amount: 0,
    payment_mode: 'Cash',
    narration: '',
    voucher_date: new Date().toISOString().split('T')[0],
    location_id: 1
  })
  
  const [patients, setPatients] = useState<Patient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showPatientSearch, setShowPatientSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastVoucherNumber, setLastVoucherNumber] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const handlePatientSearch = async (term: string) => {
    setSearchTerm(term)
    if (term.length > 2) {
      try {
        const results = await searchPatients(term)
        setPatients(results)
        setShowPatientSearch(true)
      } catch (error) {
        console.error('Error searching patients:', error)
      }
    } else {
      setShowPatientSearch(false)
      setPatients([])
    }
  }

  const selectPatient = (patient: Patient) => {
    setForm(prev => ({
      ...prev,
      patient_id: patient.id,
      patient_name: patient.name
    }))
    setSearchTerm(patient.name)
    setShowPatientSearch(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.patient_id || !form.amount || !form.narration) {
      alert('Please fill all required fields')
      return
    }

    setLoading(true)
    try {
      const result = await createReceiptVoucher({
        patient_id: form.patient_id,
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
          patient_id: '',
          patient_name: '',
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
      console.error('Error creating receipt voucher:', error)
      alert('Error creating receipt voucher. Please try again.')
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
          <h3 style="margin: 5px 0;">RECEIPT VOUCHER</h3>
          <p style="margin: 5px 0;">Voucher No: ${lastVoucherNumber}</p>
          <p style="margin: 5px 0;">Date: ${formatDate(form.voucher_date)}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Received from:</strong> ${form.patient_name} (ID: ${form.patient_id})</p>
          <p><strong>Amount:</strong> ${formatCurrency(form.amount)}</p>
          <p><strong>Payment Mode:</strong> ${form.payment_mode}</p>
          <p><strong>Being payment for:</strong> ${form.narration}</p>
        </div>
        
        <div style="border-top: 1px solid #000; margin-top: 30px; padding-top: 20px;">
          <div style="float: right;">
            <p style="margin: 0;">Received by</p>
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
          <Receipt className="w-7 h-7 text-green-600" />
          Receipt Voucher
        </h1>
        {lastVoucherNumber && (
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        )}
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">
              Receipt voucher created successfully! Voucher No: {lastVoucherNumber}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Create New Receipt</h3>
            
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

            {/* Patient Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Patient *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                  placeholder="Search patient by name, phone, or ID..."
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
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
                      <div className="text-xs text-gray-500">ID: {patient.id} {patient.phone && `• ${patient.phone}`}</div>
                    </button>
                  ))}
                </div>
              )}
              
              {form.patient_id && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  Selected: {form.patient_name} (ID: {form.patient_id})
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
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            {/* Narration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Narration *</label>
              <textarea
                value={form.narration}
                onChange={(e) => setForm(prev => ({ ...prev, narration: e.target.value }))}
                placeholder="Payment received for..."
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
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Receipt'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Preview</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
              <div className="text-center">
                <h4 className="font-bold">
                  {form.location_id === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}
                </h4>
                <p className="text-sm text-gray-600">RECEIPT VOUCHER</p>
              </div>
              
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Date:</span>
                  <span>{formatDate(form.voucher_date)}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Patient:</span>
                  <span>{form.patient_name || 'Not selected'}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">{formatCurrency(form.amount)}</span>
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
            
            {form.amount > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Amount in words:</p>
                <p className="text-sm font-medium">
                  {/* You can add a number-to-words conversion function here */}
                  {formatCurrency(form.amount)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}