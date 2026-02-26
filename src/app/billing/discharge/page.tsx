'use client'
import { useState, useMemo } from 'react'
import { useWardPatients, useDoctors } from '@/hooks/useSupabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ClipboardList, User, Calculator, CreditCard, Receipt, CheckCircle } from 'lucide-react'

interface DischargeCharge {
  id: string
  category: string
  description: string
  amount: number
  days?: number
}

interface PaymentSplit {
  mode: 'cash' | 'card' | 'upi' | 'insurance' | 'corporate'
  amount: number
  reference?: string
}

export default function DischargeBillPage() {
  const { data: wardPatients } = useWardPatients()
  const { data: doctors } = useDoctors()
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [charges, setCharges] = useState<DischargeCharge[]>([])
  const [advanceAmount, setAdvanceAmount] = useState(0)
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplit[]>([
    { mode: 'cash', amount: 0 }
  ])
  const [isGeneratingBill, setIsGeneratingBill] = useState(false)

  // Get patients ready for discharge (have in_date but no out_date)
  const dischargeReadyPatients = wardPatients.filter(p => p.in_date && !p.out_date)

  // Auto-generate comprehensive discharge charges
  const generateDischargeCharges = () => {
    if (!selectedPatient) return

    const inDate = new Date(selectedPatient.in_date)
    const today = new Date()
    const stayDays = Math.ceil((today.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24))
    
    const wardName = selectedPatient.ward_name?.toLowerCase() || 'general'
    
    // Bed charges
    let bedRate = 800 // General ward
    if (wardName.includes('icu')) bedRate = 3000
    else if (wardName.includes('private') || wardName.includes('delux')) bedRate = 1500

    // Generate comprehensive charges
    const newCharges: DischargeCharge[] = [
      {
        id: '1',
        category: 'Accommodation',
        description: `${selectedPatient.ward_name} Bed Charges`,
        amount: bedRate * stayDays,
        days: stayDays
      },
      {
        id: '2',
        category: 'Nursing',
        description: 'Nursing Care',
        amount: (wardName.includes('icu') ? 500 : 300) * stayDays,
        days: stayDays
      },
      {
        id: '3',
        category: 'Doctor Fee',
        description: 'Consultation & Visit Charges',
        amount: 500 * Math.max(1, Math.floor(stayDays / 2))
      },
      {
        id: '4',
        category: 'Pharmacy',
        description: 'Medicines & Consumables',
        amount: 2500 // Estimated
      },
      {
        id: '5',
        category: 'Laboratory',
        description: 'Lab Tests & Investigations',
        amount: 1800 // Estimated
      },
      {
        id: '6',
        category: 'Radiology',
        description: 'X-Ray/USG/CT Scan',
        amount: 1200 // Estimated
      },
      {
        id: '7',
        category: 'Misc',
        description: 'Registration & Other Charges',
        amount: 500
      }
    ]

    setCharges(newCharges)
  }

  // Calculate totals
  const totals = useMemo(() => {
    const grossTotal = charges.reduce((sum, charge) => sum + charge.amount, 0)
    const totalPayments = paymentSplits.reduce((sum, split) => sum + split.amount, 0)
    const netPayable = grossTotal - advanceAmount
    const balance = netPayable - totalPayments
    
    return {
      grossTotal,
      advanceAmount,
      netPayable,
      totalPayments,
      balance
    }
  }, [charges, advanceAmount, paymentSplits])

  const addPaymentSplit = () => {
    setPaymentSplits([...paymentSplits, { mode: 'cash', amount: 0 }])
  }

  const updatePaymentSplit = (index: number, field: keyof PaymentSplit, value: any) => {
    const updated = [...paymentSplits]
    updated[index] = { ...updated[index], [field]: value }
    setPaymentSplits(updated)
  }

  const removePaymentSplit = (index: number) => {
    if (paymentSplits.length > 1) {
      setPaymentSplits(paymentSplits.filter((_, i) => i !== index))
    }
  }

  const autoFillPayment = () => {
    if (paymentSplits.length === 1) {
      const updated = [...paymentSplits]
      updated[0].amount = Math.max(0, totals.netPayable)
      setPaymentSplits(updated)
    }
  }

  const generateDischargeBill = async () => {
    if (!selectedPatient || charges.length === 0) {
      alert('Please select a patient and generate charges')
      return
    }

    if (Math.abs(totals.balance) > 1) {
      alert(`Payment balance is ${formatCurrency(totals.balance)}. Please adjust payments.`)
      return
    }

    setIsGeneratingBill(true)
    
    try {
      const billData = {
        patient: selectedPatient,
        charges,
        totals,
        paymentSplits: paymentSplits.filter(p => p.amount > 0),
        discharge_date: new Date().toISOString(),
        bill_type: 'discharge'
      }

      console.log('Generating discharge bill:', billData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert(`Discharge bill generated successfully!\nTotal: ${formatCurrency(totals.grossTotal)}\nNet Payable: ${formatCurrency(totals.netPayable)}`)
      
      // Reset form
      setSelectedPatient(null)
      setCharges([])
      setAdvanceAmount(0)
      setPaymentSplits([{ mode: 'cash', amount: 0 }])
      
    } catch (error) {
      alert('Error generating discharge bill. Please try again.')
    } finally {
      setIsGeneratingBill(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ClipboardList className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900">Discharge Bill</h2>
        <span className="text-sm text-gray-500">Final bill generation with multiple payment modes</span>
      </div>

      {!selectedPatient ? (
        /* Patient Selection */
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Select Patient for Discharge</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dischargeReadyPatients.map((patient) => {
              const inDate = new Date(patient.in_date)
              const today = new Date()
              const stayDays = Math.ceil((today.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24))
              
              return (
                <button
                  key={patient.id}
                  onClick={() => setSelectedPatient(patient)}
                  className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <div className="font-semibold text-gray-900">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    ID: {patient.patient_id} • {patient.ward_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    Admitted: {formatDate(patient.in_date)}
                  </div>
                  <div className="text-sm font-medium text-indigo-600 mt-2">
                    Stay: {stayDays} days
                  </div>
                </button>
              )
            })}
          </div>
          
          {dischargeReadyPatients.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No patients ready for discharge</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Patient Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                  <div>ID: {selectedPatient.patient_id}</div>
                  <div>Mobile: {selectedPatient.mobile}</div>
                  <div>Ward: {selectedPatient.ward_name}</div>
                  <div>Admitted: {formatDate(selectedPatient.in_date)}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-red-600 hover:text-red-800"
              >
                Change Patient
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={generateDischargeCharges}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Generate Discharge Charges
              </button>
            </div>
          </div>

          {charges.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Charges Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Charges Breakdown</h3>
                
                <div className="space-y-3">
                  {charges.map((charge) => (
                    <div key={charge.id} className="flex justify-between items-start p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{charge.description}</div>
                        <div className="text-sm text-gray-600">{charge.category}</div>
                        {charge.days && (
                          <div className="text-xs text-gray-500">{charge.days} days</div>
                        )}
                      </div>
                      <div className="font-semibold text-right">
                        {formatCurrency(charge.amount)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Advance Payment */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advance Payment Received
                  </label>
                  <input
                    type="number"
                    placeholder="Enter advance amount"
                    value={advanceAmount || ''}
                    onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Bill Summary */}
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between">
                    <span>Gross Total:</span>
                    <span className="font-semibold">{formatCurrency(totals.grossTotal)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Less: Advance:</span>
                    <span>-{formatCurrency(totals.advanceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Net Payable:</span>
                    <span className="text-indigo-600">{formatCurrency(totals.netPayable)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Collection */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Payment Collection</h3>
                  <button
                    onClick={autoFillPayment}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    Auto-fill
                  </button>
                </div>

                <div className="space-y-4">
                  {paymentSplits.map((split, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Mode
                          </label>
                          <select
                            value={split.mode}
                            onChange={(e) => updatePaymentSplit(index, 'mode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                            <option value="insurance">Insurance</option>
                            <option value="corporate">Corporate</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={split.amount || ''}
                            onChange={(e) => updatePaymentSplit(index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      
                      {(split.mode === 'card' || split.mode === 'upi') && (
                        <input
                          type="text"
                          placeholder="Transaction reference"
                          value={split.reference || ''}
                          onChange={(e) => updatePaymentSplit(index, 'reference', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                      
                      {paymentSplits.length > 1 && (
                        <button
                          onClick={() => removePaymentSplit(index)}
                          className="text-red-600 hover:text-red-800 text-sm mt-2"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={addPaymentSplit}
                  className="w-full mt-4 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
                >
                  + Add Payment Mode
                </button>

                {/* Payment Summary */}
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Payments:</span>
                    <span className="font-semibold">{formatCurrency(totals.totalPayments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Balance:</span>
                    <span className={`font-semibold ${totals.balance > 1 ? 'text-red-600' : totals.balance < -1 ? 'text-green-600' : 'text-gray-900'}`}>
                      {formatCurrency(totals.balance)}
                    </span>
                  </div>
                </div>

                {/* Generate Bill Button */}
                <button
                  onClick={generateDischargeBill}
                  disabled={isGeneratingBill || Math.abs(totals.balance) > 1}
                  className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGeneratingBill ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Generating Discharge Bill...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Generate Discharge Bill & Receipt
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}