'use client'
// @ts-nocheck
import { useState, useMemo } from 'react'
import { usePatients, useDoctors, useSurgeries } from '@/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'
import { FileText, Zap, User, Scissors, Clock, Receipt, CreditCard } from 'lucide-react'

interface SurgeryBillData {
  surgery: any
  surgeon: any
  assistantSurgeon?: any
  anesthetist?: any
  otCharges: number
  implantCharges: number
  consumables: number
  otDuration: number // in hours
}

export default function SurgeryBillingPage() {
  const { data: patients } = usePatients()
  const { data: doctors } = useDoctors()
  const { data: surgeries } = useSurgeries()
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [billData, setBillData] = useState<SurgeryBillData | null>(null)
  const [paymentMode, setPaymentMode] = useState('cash')
  const [isGenerating, setIsGenerating] = useState(false)

  // Predefined surgery packages with fees
  const surgeryPackages = {
    'fracture_fixation': {
      surgeon_fee: 25000,
      assistant_fee: 5000,
      anesthetist_fee: 8000,
      ot_charges: 15000,
      consumables: 5000,
      estimated_hours: 3
    },
    'arthroscopy': {
      surgeon_fee: 35000,
      assistant_fee: 7000,
      anesthetist_fee: 10000,
      ot_charges: 20000,
      consumables: 8000,
      estimated_hours: 2
    },
    'joint_replacement': {
      surgeon_fee: 75000,
      assistant_fee: 15000,
      anesthetist_fee: 20000,
      ot_charges: 35000,
      consumables: 25000,
      estimated_hours: 4
    },
    'default': {
      surgeon_fee: 15000,
      assistant_fee: 3000,
      anesthetist_fee: 5000,
      ot_charges: 10000,
      consumables: 3000,
      estimated_hours: 2
    }
  }

  const filteredPatients = patients.filter((p: any) => 
    `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mobile?.includes(patientSearch) ||
    p.id?.toString().includes(patientSearch)
  )

  // Quick surgery billing - one click functionality
  const quickSurgeryBill = (surgery: any, surgeon: any) => {
    if (!selectedPatient) {
      alert('Please select a patient first')
      return
    }

    // Determine package rates based on surgery type
    const surgeryType = surgery.name?.toLowerCase() || ''
    let packageRates = surgeryPackages.default

    if (surgeryType.includes('fracture') || surgeryType.includes('fixation')) {
      packageRates = surgeryPackages.fracture_fixation
    } else if (surgeryType.includes('arthroscopy') || surgeryType.includes('scope')) {
      packageRates = surgeryPackages.arthroscopy
    } else if (surgeryType.includes('replacement') || surgeryType.includes('joint')) {
      packageRates = surgeryPackages.joint_replacement
    }

    setBillData({
      surgery,
      surgeon,
      otCharges: packageRates.ot_charges,
      implantCharges: 0, // To be added manually if needed
      consumables: packageRates.consumables,
      otDuration: packageRates.estimated_hours
    })
  }

  // Calculate total bill amount
  const billTotal = useMemo(() => {
    if (!billData) return 0

    const surgeryType = billData.surgery.name?.toLowerCase() || ''
    let packageRates = surgeryPackages.default

    if (surgeryType.includes('fracture') || surgeryType.includes('fixation')) {
      packageRates = surgeryPackages.fracture_fixation
    } else if (surgeryType.includes('arthroscopy') || surgeryType.includes('scope')) {
      packageRates = surgeryPackages.arthroscopy
    } else if (surgeryType.includes('replacement') || surgeryType.includes('joint')) {
      packageRates = surgeryPackages.joint_replacement
    }

    return (
      packageRates.surgeon_fee +
      packageRates.assistant_fee +
      packageRates.anesthetist_fee +
      billData.otCharges +
      billData.implantCharges +
      billData.consumables
    )
  }, [billData])

  const generateSurgeryBill = async () => {
    if (!selectedPatient || !billData) {
      alert('Please select patient and surgery details')
      return
    }

    setIsGenerating(true)
    
    try {
      // Simulate API call - replace with actual Supabase insert
      const billPayload = {
        patient_id: selectedPatient.id,
        patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
        surgery_id: billData.surgery.id,
        surgery_name: billData.surgery.name,
        surgeon_id: billData.surgeon.id,
        surgeon_name: billData.surgeon.doctor_name,
        total_amount: billTotal,
        payment_mode: paymentMode,
        bill_type: 'surgery',
        generated_at: new Date().toISOString(),
        status: 'generated'
      }

      console.log('Generating surgery bill:', billPayload)
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert(`Surgery bill generated successfully! Total: ${formatCurrency(billTotal)}`)
      
      // Reset form
      setSelectedPatient(null)
      setBillData(null)
      setPatientSearch('')
      
    } catch (error) {
      alert('Error generating bill. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-bold text-gray-900">Surgery Billing</h2>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          <Zap className="w-4 h-4" />
          ONE-CLICK BILLING
        </div>
      </div>

      {!billData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              1. Select Patient
            </h3>
            
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search patient..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {selectedPatient ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">ID: {selectedPatient.id}</p>
                    <p className="text-sm text-gray-600">Mobile: {selectedPatient.mobile}</p>
                    <p className="text-sm text-gray-600">Age: {selectedPatient.age || 'N/A'}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedPatient(null)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredPatients.slice(0, 8).map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="font-medium text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      ID: {patient.id} • {patient.mobile}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Surgery Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              2. One-Click Surgery Selection
            </h3>
            
            <div className="space-y-3">
              {surgeries.slice(0, 10).map((surgery) => (
                <div key={surgery.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-gray-900">{surgery.name}</h4>
                    <span className="text-sm text-gray-500">ID: {surgery.id}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {doctors.filter(d => d.specialization?.toLowerCase().includes('orth') || d.specialization?.toLowerCase().includes('surg')).slice(0, 2).map((doctor) => (
                      <button
                        key={doctor.id}
                        onClick={() => quickSurgeryBill(surgery, doctor)}
                        disabled={!selectedPatient}
                        className="flex items-center gap-2 p-3 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      >
                        <Zap className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm">{doctor.doctor_name}</div>
                          <div className="text-xs text-gray-600">{doctor.specialization}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  {!selectedPatient && (
                    <p className="text-xs text-gray-500 italic">Select a patient first</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Bill Preview & Generate */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bill Preview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Surgery Bill Preview
            </h3>
            
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Patient Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Name: {selectedPatient?.first_name} {selectedPatient?.last_name}</div>
                  <div>ID: {selectedPatient?.id}</div>
                  <div>Mobile: {selectedPatient?.mobile}</div>
                  <div>Age: {selectedPatient?.age || 'N/A'}</div>
                </div>
              </div>

              {/* Surgery Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Surgery Details</h4>
                <div className="text-sm">
                  <div>Procedure: <span className="font-medium">{billData.surgery.name}</span></div>
                  <div>Surgeon: <span className="font-medium">{billData.surgeon.doctor_name}</span></div>
                  <div>Duration: <span className="font-medium">{billData.otDuration} hours (estimated)</span></div>
                </div>
              </div>

              {/* Charges Breakdown */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Charges Breakdown</h4>
                {(() => {
                  const surgeryType = billData.surgery.name?.toLowerCase() || ''
                  let packageRates = surgeryPackages.default

                  if (surgeryType.includes('fracture') || surgeryType.includes('fixation')) {
                    packageRates = surgeryPackages.fracture_fixation
                  } else if (surgeryType.includes('arthroscopy') || surgeryType.includes('scope')) {
                    packageRates = surgeryPackages.arthroscopy
                  } else if (surgeryType.includes('replacement') || surgeryType.includes('joint')) {
                    packageRates = surgeryPackages.joint_replacement
                  }

                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Surgeon Fee:</span>
                        <span className="font-medium">{formatCurrency(packageRates.surgeon_fee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Assistant Surgeon:</span>
                        <span className="font-medium">{formatCurrency(packageRates.assistant_fee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Anesthetist Fee:</span>
                        <span className="font-medium">{formatCurrency(packageRates.anesthetist_fee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>OT Charges:</span>
                        <span className="font-medium">{formatCurrency(billData.otCharges)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Consumables:</span>
                        <span className="font-medium">{formatCurrency(billData.consumables)}</span>
                      </div>
                      {billData.implantCharges > 0 && (
                        <div className="flex justify-between">
                          <span>Implants:</span>
                          <span className="font-medium">{formatCurrency(billData.implantCharges)}</span>
                        </div>
                      )}
                      <div className="border-t border-green-200 pt-2 mt-2">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total Amount:</span>
                          <span className="text-green-600">{formatCurrency(billTotal)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-6">
            {/* Payment Mode */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Mode</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'cash', label: 'Cash', icon: '💵' },
                  { value: 'card', label: 'Card', icon: '💳' },
                  { value: 'upi', label: 'UPI', icon: '📱' },
                  { value: 'insurance', label: 'Insurance', icon: '🛡️' }
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setPaymentMode(mode.value)}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      paymentMode === mode.value 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">{mode.icon}</div>
                    <div className="font-medium">{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={generateSurgeryBill}
                  disabled={isGenerating}
                  className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 text-lg font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      Generating Bill...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Generate Surgery Bill
                    </>
                  )}
                </button>

                <button
                  onClick={() => setBillData(null)}
                  className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200"
                >
                  Back to Surgery Selection
                </button>

                <div className="text-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Surgery-to-Bill in under 30 seconds!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}