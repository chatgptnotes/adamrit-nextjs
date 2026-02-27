'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculateTotalBill, getAdvancePayments, type BillBreakdown } from '@/lib/billing-engine'
import { saveFinalBill, generateReceipt, type FinalBillData, type PaymentMode } from '@/lib/billing-actions'
import { usePatients } from '@/hooks/useSupabase'
import ChargesBreakdown from '@/components/billing/ChargesBreakdown'
import PrintReceipt from '@/components/billing/PrintReceipt'
import { 
  Search, 
  User, 
  CreditCard, 
  Receipt,
  Printer,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Calculator
} from 'lucide-react'
import Link from 'next/link'
import { useReactToPrint } from 'react-to-print'

export default function DischargeBillPage() {
  const searchParams = useSearchParams()
  const { data: patients } = usePatients()
  const printRef = useRef<HTMLDivElement>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [chargesBreakdown, setChargesBreakdown] = useState<BillBreakdown | null>(null)
  const [advanceAmount, setAdvanceAmount] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [calculatingCharges, setCalculatingCharges] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([
    { mode: 'Cash', amount: 0 }
  ])

  const [remarks, setRemarks] = useState('')

  // Pre-select patient from URL params
  useEffect(() => {
    const patientId = searchParams.get('patient')
    if (patientId && patients.length > 0) {
      const patient = patients.find(p => p.id === parseInt(patientId))
      if (patient) {
        setSelectedPatient(patient)
        handlePatientSelect(patient)
      }
    }
  }, [searchParams, patients])

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return []
    return patients.filter(patient => {
      const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase()
      const ipd = patient.ipd_number || ''
      const id = patient.id.toString()
      return fullName.includes(searchTerm.toLowerCase()) || 
             ipd.toLowerCase().includes(searchTerm.toLowerCase()) ||
             id.includes(searchTerm)
    }).slice(0, 10)
  }, [patients, searchTerm])

  const totalPayment = useMemo(() => {
    return paymentModes.reduce((sum, mode) => sum + (mode.amount || 0), 0)
  }, [paymentModes])

  const netPayable = useMemo(() => {
    if (!chargesBreakdown) return 0
    return Math.max(0, chargesBreakdown.totalCharges - advanceAmount - discount)
  }, [chargesBreakdown, advanceAmount, discount])

  const balanceDue = useMemo(() => {
    return Math.max(0, netPayable - totalPayment)
  }, [netPayable, totalPayment])

  const handlePatientSelect = async (patient: any) => {
    setSelectedPatient(patient)
    setSearchTerm(`${patient.first_name} ${patient.last_name}`)
    setCalculatingCharges(true)

    try {
      // Calculate current charges
      const breakdown = await calculateTotalBill(patient.id)
      setChargesBreakdown(breakdown)
      
      // Get current advance payments
      const advance = await getAdvancePayments(patient.id)
      setAdvanceAmount(advance)
      
      // Set initial payment amount to net payable
      const netAmount = Math.max(0, breakdown.totalCharges - advance)
      setPaymentModes([{ mode: 'Cash', amount: netAmount }])
    } catch (error) {
      console.error('Error calculating charges:', error)
      setAlert({ type: 'error', message: 'Failed to calculate patient charges' })
    } finally {
      setCalculatingCharges(false)
    }
  }

  const addPaymentMode = () => {
    setPaymentModes(prev => [...prev, { mode: 'Cash', amount: 0 }])
  }

  const removePaymentMode = (index: number) => {
    if (paymentModes.length > 1) {
      setPaymentModes(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updatePaymentMode = (index: number, field: keyof PaymentMode, value: any) => {
    setPaymentModes(prev => prev.map((mode, i) => 
      i === index ? { ...mode, [field]: value } : mode
    ))
  }

  const distributePaymentEqually = () => {
    const amountPerMode = Math.floor(netPayable / paymentModes.length)
    const remainder = netPayable % paymentModes.length
    
    setPaymentModes(prev => prev.map((mode, i) => ({
      ...mode,
      amount: amountPerMode + (i < remainder ? 1 : 0)
    })))
  }

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient || !chargesBreakdown) return

    if (totalPayment !== netPayable) {
      setAlert({ 
        type: 'error', 
        message: `Payment amount (${formatCurrency(totalPayment)}) must equal net payable (${formatCurrency(netPayable)})` 
      })
      return
    }

    setLoading(true)
    try {
      const billData: FinalBillData = {
        patient_id: selectedPatient.id,
        total_amount: chargesBreakdown.totalCharges,
        discount,
        payments: paymentModes.filter(mode => mode.amount > 0),
        remarks
      }

      const result = await saveFinalBill(selectedPatient.id, billData)
      
      if (result.success && result.billNumber) {
        // Find the billing record to generate receipt
        // This is simplified - in real app, you'd get the billing ID from the response
        setAlert({ type: 'success', message: `Final bill saved successfully! Bill #: ${result.billNumber}` })
        
        // Reset form
        setSelectedPatient(null)
        setSearchTerm('')
        setChargesBreakdown(null)
        setPaymentModes([{ mode: 'Cash', amount: 0 }])
        setDiscount(0)
        setRemarks('')
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to save final bill' })
      }
    } catch (error) {
      console.error('Discharge bill error:', error)
      setAlert({ type: 'error', message: 'An error occurred while saving the bill' })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Discharge Bill - ${selectedPatient?.first_name} ${selectedPatient?.last_name}`
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discharge Bill</h1>
          <p className="text-gray-600">Generate final bill for patient discharge</p>
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          alert.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {alert.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{alert.message}</span>
          <button 
            onClick={() => setAlert(null)}
            className="ml-auto text-lg font-semibold"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Patient Search & Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Select Patient
          </h3>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {searchTerm && !selectedPatient && filteredPatients.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredPatients.map(patient => (
                <button
                  key={patient.id}
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    IPD: {patient.ipd_number || 'N/A'} | ID: {patient.id}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedPatient && (
            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-3 mb-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    IPD: {selectedPatient.ipd_number || 'N/A'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setSelectedPatient(null)
                  setSearchTerm('')
                  setChargesBreakdown(null)
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Change Patient
              </button>
            </div>
          )}
        </div>

        {/* Payment Modes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Modes
            </h3>
            <button
              type="button"
              onClick={addPaymentMode}
              disabled={!selectedPatient}
              className="p-1 text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {paymentModes.map((payment, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Payment {index + 1}</span>
                  {paymentModes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentMode(index)}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <select
                    value={payment.mode}
                    onChange={(e) => updatePaymentMode(index, 'mode', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    disabled={!selectedPatient}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="NEFT">NEFT</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Deposit">Bank Deposit</option>
                  </select>
                  
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payment.amount || ''}
                    onChange={(e) => updatePaymentMode(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    placeholder="Amount"
                    disabled={!selectedPatient}
                  />

                  {['Cheque', 'NEFT', 'Bank Deposit'].includes(payment.mode) && (
                    <input
                      type="text"
                      value={payment.bank_name || ''}
                      onChange={(e) => updatePaymentMode(index, 'bank_name', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="Bank name"
                    />
                  )}

                  {payment.mode === 'Cheque' && (
                    <input
                      type="text"
                      value={payment.cheque_number || ''}
                      onChange={(e) => updatePaymentMode(index, 'cheque_number', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="Cheque number"
                    />
                  )}

                  {['NEFT', 'Card', 'UPI'].includes(payment.mode) && (
                    <input
                      type="text"
                      value={payment.transaction_id || ''}
                      onChange={(e) => updatePaymentMode(index, 'transaction_id', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="Transaction ID"
                    />
                  )}
                </div>
              </div>
            ))}
            
            {paymentModes.length > 1 && selectedPatient && (
              <button
                type="button"
                onClick={distributePaymentEqually}
                className="w-full p-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Distribute Equally
              </button>
            )}
          </div>

          {/* Payment Summary */}
          {selectedPatient && chargesBreakdown && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm space-y-2">
              <div className="flex justify-between">
                <span>Total Bill:</span>
                <span className="font-medium">{formatCurrency(chargesBreakdown.totalCharges)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Advance Paid:</span>
                <span className="font-medium">- {formatCurrency(advanceAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="font-medium">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={chargesBreakdown.totalCharges}
                    value={discount || ''}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 px-1 py-0.5 text-right border border-gray-300 rounded text-xs"
                  />
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Net Payable:</span>
                <span>{formatCurrency(netPayable)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Total:</span>
                <span className="font-medium">{formatCurrency(totalPayment)}</span>
              </div>
              <div className={`flex justify-between font-semibold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                <span>Balance Due:</span>
                <span>{formatCurrency(balanceDue)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions & Remarks */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                rows={3}
                placeholder="Optional remarks..."
                disabled={!selectedPatient}
              />
            </div>

            <button
              onClick={handleDischargeSubmit}
              disabled={!selectedPatient || !chargesBreakdown || balanceDue !== 0 || loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Generate Final Bill'}
            </button>

            {lastReceipt && (
              <button
                onClick={handlePrint}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium"
              >
                <Printer className="w-4 h-4" />
                Print Bill
              </button>
            )}
          </div>
        </div>

        {/* Charges Breakdown */}
        <div>
          <ChargesBreakdown
            breakdown={chargesBreakdown}
            loading={calculatingCharges}
            showAdvance={true}
            advanceAmount={advanceAmount}
            discount={discount}
          />
        </div>
      </div>

      {/* Hidden Print Component */}
      {lastReceipt && (
        <div style={{ display: 'none' }}>
          <PrintReceipt ref={printRef} receipt={lastReceipt} type="final" />
        </div>
      )}
    </div>
  )
}