'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculateTotalBill, getAdvancePayments, type BillBreakdown } from '@/lib/billing-engine'
import { saveAdvancePayment, generateReceipt, type AdvancePaymentData } from '@/lib/billing-actions'
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
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useReactToPrint } from 'react-to-print'

export default function AdvancePaymentPage() {
  const searchParams = useSearchParams()
  const { data: patients } = usePatients()
  const printRef = useRef<HTMLDivElement>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [chargesBreakdown, setChargesBreakdown] = useState<BillBreakdown | null>(null)
  const [advanceAmount, setAdvanceAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [calculatingCharges, setCalculatingCharges] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [paymentData, setPaymentData] = useState<AdvancePaymentData>({
    patient_id: 0,
    amount: 0,
    payment_mode: 'Cash',
    bank_name: '',
    cheque_number: '',
    transaction_id: '',
    remarks: ''
  })

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

  const handlePatientSelect = async (patient: any) => {
    setSelectedPatient(patient)
    setSearchTerm(`${patient.first_name} ${patient.last_name}`)
    setPaymentData(prev => ({ ...prev, patient_id: patient.id }))
    setCalculatingCharges(true)

    try {
      // Calculate current charges
      const breakdown = await calculateTotalBill(patient.id)
      setChargesBreakdown(breakdown)
      
      // Get current advance payments
      const advance = await getAdvancePayments(patient.id)
      setAdvanceAmount(advance)
    } catch (error) {
      console.error('Error calculating charges:', error)
      setAlert({ type: 'error', message: 'Failed to calculate patient charges' })
    } finally {
      setCalculatingCharges(false)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient || paymentData.amount <= 0) return

    setLoading(true)
    try {
      const result = await saveAdvancePayment(paymentData)
      
      if (result.success && result.billingId) {
        // Generate receipt for printing
        const receipt = await generateReceipt(result.billingId)
        setLastReceipt(receipt)
        
        // Update advance amount
        setAdvanceAmount(prev => prev + paymentData.amount)
        
        // Reset form
        setPaymentData(prev => ({
          ...prev,
          amount: 0,
          bank_name: '',
          cheque_number: '',
          transaction_id: '',
          remarks: ''
        }))
        
        setAlert({ type: 'success', message: 'Advance payment saved successfully!' })
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to save payment' })
      }
    } catch (error) {
      console.error('Payment error:', error)
      setAlert({ type: 'error', message: 'An error occurred while saving payment' })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Advance Receipt - ${selectedPatient?.first_name} ${selectedPatient?.last_name}`
  })

  const requiresBankDetails = ['Cheque', 'NEFT', 'Bank Deposit'].includes(paymentData.payment_mode)
  const requiresTransactionId = ['NEFT', 'Card', 'UPI'].includes(paymentData.payment_mode)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advance Payment</h1>
          <p className="text-gray-600">Collect advance payments from patients</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              placeholder="Search by name, IPD number, or ID..."
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
                    IPD: {selectedPatient.ipd_number || 'N/A'} | ID: {selectedPatient.id}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium">{selectedPatient.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Age:</span>
                  <p className="font-medium">{selectedPatient.age || 'N/A'}</p>
                </div>
              </div>

              {advanceAmount > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <span className="text-sm text-blue-600">Previous Advance:</span>
                  <p className="font-bold text-blue-800">{formatCurrency(advanceAmount)}</p>
                </div>
              )}
              
              <button
                onClick={() => {
                  setSelectedPatient(null)
                  setSearchTerm('')
                  setChargesBreakdown(null)
                }}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700"
              >
                Change Patient
              </button>
            </div>
          )}
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </h3>

          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Advance Amount *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={paymentData.amount || ''}
                onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount..."
                required
                disabled={!selectedPatient}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentData.payment_mode}
                onChange={(e) => setPaymentData(prev => ({ 
                  ...prev, 
                  payment_mode: e.target.value as any,
                  bank_name: '',
                  cheque_number: '',
                  transaction_id: ''
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="NEFT">NEFT</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Bank Deposit">Bank Deposit</option>
              </select>
            </div>

            {requiresBankDetails && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={paymentData.bank_name}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, bank_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter bank name..."
                />
              </div>
            )}

            {paymentData.payment_mode === 'Cheque' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cheque Number
                </label>
                <input
                  type="text"
                  value={paymentData.cheque_number}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, cheque_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter cheque number..."
                />
              </div>
            )}

            {requiresTransactionId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentData.transaction_id}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter transaction ID..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={paymentData.remarks}
                onChange={(e) => setPaymentData(prev => ({ ...prev, remarks: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Optional remarks..."
              />
            </div>

            <button
              type="submit"
              disabled={!selectedPatient || paymentData.amount <= 0 || loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save Advance Payment'}
            </button>
          </form>

          {lastReceipt && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handlePrint}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-medium"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
            </div>
          )}
        </div>

        {/* Current Charges Breakdown */}
        <div className="space-y-6">
          <ChargesBreakdown
            breakdown={chargesBreakdown}
            loading={calculatingCharges}
            showAdvance={true}
            advanceAmount={advanceAmount}
          />
        </div>
      </div>

      {/* Hidden Print Component */}
      {lastReceipt && (
        <div style={{ display: 'none' }}>
          <PrintReceipt ref={printRef} receipt={lastReceipt} type="advance" />
        </div>
      )}
    </div>
  )
}