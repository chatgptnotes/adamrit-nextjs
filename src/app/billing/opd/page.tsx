'use client'
// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { saveAdvancePayment, generateReceipt } from '@/lib/billing-actions'
import { useAppointments, useDoctors } from '@/hooks/useSupabase'
import { supabase } from '@/lib/supabase'
import PrintReceipt from '@/components/billing/PrintReceipt'
import DataTable from '@/components/DataTable'
import { 
  Stethoscope, 
  User, 
  Calendar, 
  CreditCard, 
  Plus,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2,
  Printer,
  Receipt
} from 'lucide-react'
import Link from 'next/link'
import { useReactToPrint } from 'react-to-print'

interface OPDBill {
  patient_id: number
  patient_name: string
  doctor_name: string
  consultation_fee: number
  lab_charges: number
  radiology_charges: number
  pharmacy_charges: number
  other_charges: number
  total_amount: number
  payment_mode: string
  remarks: string
}

export default function OPDBillingPage() {
  const { data: appointments, loading: appointmentsLoading } = useAppointments()
  const { data: doctors } = useDoctors()
  const printRef = useRef<HTMLDivElement>(null)
  
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [billing, setBilling] = useState<Partial<OPDBill>>({
    consultation_fee: 0,
    lab_charges: 0,
    radiology_charges: 0,
    pharmacy_charges: 0,
    other_charges: 0,
    payment_mode: 'Cash',
    remarks: ''
  })
  
  const [tariffLists, setTariffLists] = useState<any[]>([])
  const [doctorRates, setDoctorRates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<any>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load tariff lists and doctor rates
  useEffect(() => {
    async function loadData() {
      try {
        const [tariffResponse, doctorRatesResponse] = await Promise.all([
          supabase.from('tariff_lists').select('*').order('service_name'),
          supabase.from('tariff_amounts').select('*, doctor:doctors(name)').eq('category', 'consultation').order('doctor_id')
        ])
        
        setTariffLists(tariffResponse.data || [])
        setDoctorRates(doctorRatesResponse.data || [])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [])

  // Filter today's appointments
  const todayAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return appointments.filter(apt => 
      apt.date?.startsWith(today)
    ).map(apt => ({
      ...apt,
      patient_name: `${apt.first_name || ''} ${apt.last_name || ''}`.trim() || 'Unknown',
      doctor_name: apt.doctor_name || 'Unknown Doctor'
    }))
  }, [appointments])

  const totalAmount = useMemo(() => {
    return (billing.consultation_fee || 0) + 
           (billing.lab_charges || 0) + 
           (billing.radiology_charges || 0) + 
           (billing.pharmacy_charges || 0) + 
           (billing.other_charges || 0)
  }, [billing])

  const handleAppointmentSelect = (appointment: any) => {
    setSelectedAppointment(appointment)
    
    // Set default consultation fee based on doctor
    const doctorRate = doctorRates.find(rate => rate.doctor_id === appointment.doctor_id)
    const consultationFee = doctorRate?.non_nabh_charges || 500 // Default fee
    
    setBilling(prev => ({
      ...prev,
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name,
      doctor_name: appointment.doctor_name,
      consultation_fee: consultationFee
    }))
  }

  const handleAddLabCharges = () => {
    // In a real app, this would open a modal to select lab tests
    const labAmount = prompt('Enter lab charges amount:')
    if (labAmount && !isNaN(parseFloat(labAmount))) {
      setBilling(prev => ({
        ...prev,
        lab_charges: (prev.lab_charges || 0) + parseFloat(labAmount)
      }))
    }
  }

  const handleAddRadiologyCharges = () => {
    // In a real app, this would open a modal to select radiology tests
    const radioAmount = prompt('Enter radiology charges amount:')
    if (radioAmount && !isNaN(parseFloat(radioAmount))) {
      setBilling(prev => ({
        ...prev,
        radiology_charges: (prev.radiology_charges || 0) + parseFloat(radioAmount)
      }))
    }
  }

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAppointment || totalAmount <= 0) return

    setSaving(true)
    try {
      // Save as advance payment (since OPD bills are typically paid immediately)
      const paymentData = {
        patient_id: billing.patient_id!,
        amount: totalAmount,
        payment_mode: billing.payment_mode as any,
        remarks: `OPD Bill - ${billing.doctor_name} - Consultation: ${formatCurrency(billing.consultation_fee || 0)}, Lab: ${formatCurrency(billing.lab_charges || 0)}, Radiology: ${formatCurrency(billing.radiology_charges || 0)}, Pharmacy: ${formatCurrency(billing.pharmacy_charges || 0)}, Other: ${formatCurrency(billing.other_charges || 0)}`
      }

      const result = await saveAdvancePayment(paymentData)
      
      if (result.success && result.billingId) {
        // Generate receipt
        const receipt = await generateReceipt(result.billingId)
        setLastReceipt(receipt)
        
        // Reset form
        setSelectedAppointment(null)
        setBilling({
          consultation_fee: 0,
          lab_charges: 0,
          radiology_charges: 0,
          pharmacy_charges: 0,
          other_charges: 0,
          payment_mode: 'Cash',
          remarks: ''
        })
        
        setAlert({ type: 'success', message: 'OPD bill saved successfully!' })
      } else {
        setAlert({ type: 'error', message: result.error || 'Failed to save OPD bill' })
      }
    } catch (error) {
      console.error('Error saving OPD bill:', error)
      setAlert({ type: 'error', message: 'An error occurred while saving the bill' })
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `OPD Receipt - ${selectedAppointment?.patient_name}`
  })

  const appointmentColumns = [
    { key: 'patient_name', label: 'Patient' },
    { key: 'doctor_name', label: 'Doctor' },
    { 
      key: 'appointment_time', 
      label: 'Time',
      render: (row: any) => row.appointment_time || 'Not specified'
    },
    { key: 'chief_complaint', label: 'Complaint' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <button
          onClick={() => handleAppointmentSelect(row)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
        >
          Create Bill
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OPD Billing</h1>
          <p className="text-gray-600">Quick billing for outpatient consultations</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Today's Appointments */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today&apos;s Appointments ({todayAppointments.length})
          </h3>
          
          <DataTable
            data={todayAppointments}
            columns={appointmentColumns}
            loading={appointmentsLoading}
            searchPlaceholder="Search appointments..."
            searchKey="patient_name"
          />
        </div>

        {/* Billing Form */}
        <div className="space-y-6">
          {selectedAppointment && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient: {selectedAppointment.patient_name}
              </h3>
              
              <div className="space-y-2 text-sm mb-4">
                <p><span className="text-gray-600">Doctor:</span> {selectedAppointment.doctor_name}</p>
                <p><span className="text-gray-600">Time:</span> {selectedAppointment.appointment_time || 'Not specified'}</p>
                <p><span className="text-gray-600">Complaint:</span> {selectedAppointment.chief_complaint || 'Not specified'}</p>
              </div>

              <button
                onClick={() => {
                  setSelectedAppointment(null)
                  setBilling({
                    consultation_fee: 0,
                    lab_charges: 0,
                    radiology_charges: 0,
                    pharmacy_charges: 0,
                    other_charges: 0,
                    payment_mode: 'Cash',
                    remarks: ''
                  })
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Change Patient
              </button>
            </div>
          )}

          {selectedAppointment && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Bill Details
              </h3>
              
              <form onSubmit={handleSaveBill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Consultation Fee
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={billing.consultation_fee || ''}
                    onChange={(e) => setBilling(prev => ({ 
                      ...prev, 
                      consultation_fee: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">
                      Lab Charges
                    </label>
                    <button
                      type="button"
                      onClick={handleAddLabCharges}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Add Tests
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={billing.lab_charges || ''}
                    onChange={(e) => setBilling(prev => ({ 
                      ...prev, 
                      lab_charges: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">
                      Radiology Charges
                    </label>
                    <button
                      type="button"
                      onClick={handleAddRadiologyCharges}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Add Scans
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={billing.radiology_charges || ''}
                    onChange={(e) => setBilling(prev => ({ 
                      ...prev, 
                      radiology_charges: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pharmacy Charges
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={billing.pharmacy_charges || ''}
                    onChange={(e) => setBilling(prev => ({ 
                      ...prev, 
                      pharmacy_charges: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Charges
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={billing.other_charges || ''}
                    onChange={(e) => setBilling(prev => ({ 
                      ...prev, 
                      other_charges: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-gray-900">Total Amount:</span>
                    <span className="font-bold text-lg text-gray-900">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={billing.payment_mode}
                    onChange={(e) => setBilling(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="NEFT">NEFT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    value={billing.remarks}
                    onChange={(e) => setBilling(prev => ({ ...prev, remarks: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    rows={2}
                    placeholder="Optional remarks..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={totalAmount <= 0 || saving}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save OPD Bill'}
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
          )}
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