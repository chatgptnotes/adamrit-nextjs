'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Printer,
  Search,
  Filter,
  User,
  CreditCard,
  Pill,
  Calendar
} from 'lucide-react'

interface DischargePatient {
  id: string
  name: string
  uhid: string
  phone?: string
  admission_date: string
  discharge_date?: string
  diagnosis?: string
  treating_doctor?: string
  room_number?: string
  final_bill_amount?: number
  bill_status: 'pending' | 'partially_paid' | 'paid'
  discharge_summary_ready: boolean
  medicines_dispensed: boolean
  clearance_status: 'pending' | 'partial' | 'complete'
}

interface DischargeChecklist {
  final_bill_cleared: boolean
  discharge_summary_completed: boolean
  medicines_dispensed: boolean
  lab_reports_ready: boolean
  follow_up_scheduled: boolean
  patient_counseling_done: boolean
}

export default function DischargePage() {
  const [loading, setLoading] = useState(true)
  const [readyForDischarge, setReadyForDischarge] = useState<DischargePatient[]>([])
  const [recentDischarges, setRecentDischarges] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<DischargePatient | null>(null)
  const [dischargeChecklist, setDischargeChecklist] = useState<DischargeChecklist>({
    final_bill_cleared: false,
    discharge_summary_completed: false,
    medicines_dispensed: false,
    lab_reports_ready: false,
    follow_up_scheduled: false,
    patient_counseling_done: false
  })

  // Summary state
  const [dischargeSummary, setDischargeSummary] = useState({
    diagnosis: '',
    treatment_given: '',
    condition_on_discharge: '',
    medications: '',
    follow_up_instructions: '',
    next_visit_date: '',
    doctor_notes: ''
  })

  // Stats
  const [stats, setStats] = useState({
    ready_for_discharge: 0,
    pending_bills: 0,
    today_discharges: 0,
    pending_summaries: 0
  })

  useEffect(() => {
    loadDischargeData()
  }, [])

  async function loadDischargeData() {
    setLoading(true)
    try {
      // Load patients ready for discharge
      const { data: patientsData, error: patientsError } = await supabase
        .from('ward_patients')
        .select(`
          *,
          patients!inner(name, uhid, phone),
          doctors(name)
        `)
        .or('is_discharge.eq.true,discharge_date.not.is.null')
        .is('actual_discharge_date', null)
        .order('discharge_date')

      if (patientsError) throw patientsError

      // Transform the data
      const readyPatients = (patientsData || []).map((patient: any) => ({
        id: patient.id,
        name: patient.patients?.name,
        uhid: patient.patients?.uhid,
        phone: patient.patients?.phone,
        admission_date: patient.admission_date,
        discharge_date: patient.discharge_date,
        diagnosis: patient.diagnosis,
        treating_doctor: patient.doctors?.name,
        room_number: patient.room_number,
        final_bill_amount: Math.floor(Math.random() * 50000) + 10000, // Simulated
        bill_status: (Math.random() > 0.5 ? 'paid' : 'pending') as 'pending' | 'paid' | 'partially_paid',
        discharge_summary_ready: Math.random() > 0.3,
        medicines_dispensed: Math.random() > 0.4,
        clearance_status: Math.random() > 0.6 ? 'complete' : 'partial'
      }))

      setReadyForDischarge(readyPatients as any)

      // Load recent discharges (last 7 days)
      const { data: recentData, error: recentError } = await supabase
        .from('discharge_summaries')
        .select(`
          *,
          patients!inner(name, uhid)
        `)
        .gte('discharge_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('discharge_date', { ascending: false })
        .limit(20)

      if (recentError) throw recentError

      const recentDischarges = (recentData || []).map((discharge: any) => ({
        ...discharge,
        patient_name: discharge.patients?.name,
        patient_uhid: discharge.patients?.uhid
      }))

      setRecentDischarges(recentDischarges)

      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const todayDischarges = recentDischarges.filter((d: any) => 
        d.discharge_date?.startsWith(today)
      ).length

      setStats({
        ready_for_discharge: readyPatients.length,
        pending_bills: readyPatients.filter((p: any) => p.bill_status !== 'paid').length,
        today_discharges: todayDischarges,
        pending_summaries: readyPatients.filter((p: any) => !p.discharge_summary_ready).length
      })

    } catch (error) {
      console.error('Error loading discharge data:', error)
    }
    setLoading(false)
  }

  async function processDischarge(patient: DischargePatient) {
    try {
      // Update patient discharge status
      await supabase
        .from('ward_patients')
        .update({ actual_discharge_date: new Date().toISOString() })
        .eq('id', patient.id)

      // Create discharge summary if not exists
      const { error: summaryError } = await supabase
        .from('discharge_summaries')
        .upsert({
          patient_id: patient.id,
          diagnosis: dischargeSummary.diagnosis,
          treatment_given: dischargeSummary.treatment_given,
          condition_on_discharge: dischargeSummary.condition_on_discharge,
          medications: dischargeSummary.medications,
          follow_up_instructions: dischargeSummary.follow_up_instructions,
          discharge_date: new Date().toISOString(),
          doctor_notes: dischargeSummary.doctor_notes
        })

      if (summaryError) throw summaryError

      // Reset form and close modal
      setSelectedPatient(null)
      setDischargeSummary({
        diagnosis: '',
        treatment_given: '',
        condition_on_discharge: '',
        medications: '',
        follow_up_instructions: '',
        next_visit_date: '',
        doctor_notes: ''
      })
      setDischargeChecklist({
        final_bill_cleared: false,
        discharge_summary_completed: false,
        medicines_dispensed: false,
        lab_reports_ready: false,
        follow_up_scheduled: false,
        patient_counseling_done: false
      })

      // Refresh data
      await loadDischargeData()

      alert('Patient discharged successfully!')
    } catch (error) {
      console.error('Error processing discharge:', error)
      alert('Error processing discharge. Please try again.')
    }
  }

  function printDischargeSummary(patient: any) {
    // This would typically generate a PDF or open print dialog
    window.print()
  }

  const canDischarge = Object.values(dischargeChecklist).every(Boolean)

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-red-50 rounded-lg text-red-600">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discharge Management</h1>
          <p className="text-sm text-gray-500">Patient discharge processing & summaries</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Ready for Discharge" 
          value={loading ? '...' : stats.ready_for_discharge.toString()} 
          icon={Clock} 
          color="orange" 
        />
        <StatCard 
          title="Pending Bills" 
          value={loading ? '...' : stats.pending_bills.toString()} 
          icon={CreditCard} 
          color="red" 
        />
        <StatCard 
          title="Today's Discharges" 
          value={loading ? '...' : stats.today_discharges.toString()} 
          icon={CheckCircle} 
          color="green" 
        />
        <StatCard 
          title="Pending Summaries" 
          value={loading ? '...' : stats.pending_summaries.toString()} 
          icon={FileText} 
          color="blue" 
        />
      </div>

      {/* Ready for Discharge */}
      <div className="mb-8 bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Patients Ready for Discharge ({readyForDischarge.length})
          </h3>
        </div>

        <div className="p-4">
          {readyForDischarge.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {readyForDischarge.map((patient: any) => (
                <div key={patient.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{patient.name}</h4>
                      <p className="text-sm text-gray-500">UHID: {patient.uhid}</p>
                      <p className="text-sm text-gray-500">Room: {patient.room_number || 'TBD'}</p>
                      <p className="text-sm text-gray-500">Dr. {patient.treating_doctor}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      patient.clearance_status === 'complete' ? 'bg-green-100 text-green-800' :
                      patient.clearance_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {patient.clearance_status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Bill Amount:</span>
                      <span className="font-medium">{formatCurrency(patient.final_bill_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Bill Status:</span>
                      <span className={`font-medium ${
                        patient.bill_status === 'paid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {patient.bill_status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Discharge Date:</span>
                      <span className="font-medium">
                        {patient.discharge_date ? new Date(patient.discharge_date).toLocaleDateString() : 'Today'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 ${patient.discharge_summary_ready ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={patient.discharge_summary_ready ? 'text-green-700' : 'text-gray-500'}>
                        Discharge Summary
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 ${patient.bill_status === 'paid' ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={patient.bill_status === 'paid' ? 'text-green-700' : 'text-gray-500'}>
                        Bill Cleared
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className={`w-4 h-4 ${patient.medicines_dispensed ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={patient.medicines_dispensed ? 'text-green-700' : 'text-gray-500'}>
                        Medicines Dispensed
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedPatient(patient)}
                      className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      Process Discharge
                    </button>
                    {patient.discharge_summary_ready && (
                      <button
                        onClick={() => printDischargeSummary(patient)}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No patients ready for discharge
            </div>
          )}
        </div>
      </div>

      {/* Recent Discharges */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Recent Discharges (Last 7 days)
          </h3>
        </div>

        <DataTable
          data={recentDischarges}
          columns={[
            { 
              key: 'patient_name', 
              label: 'Patient',
              render: (discharge: any) => (
                <div>
                  <p className="font-medium text-gray-900">{discharge.patient_name}</p>
                  <p className="text-sm text-gray-500">UHID: {discharge.patient_uhid}</p>
                </div>
              )
            },
            { 
              key: 'diagnosis', 
              label: 'Diagnosis',
              render: (discharge: any) => (
                <span className="text-sm">{discharge.diagnosis || '—'}</span>
              )
            },
            { 
              key: 'discharge_date', 
              label: 'Discharge Date',
              render: (discharge: any) => (
                <div>
                  <p className="text-sm">{new Date(discharge.discharge_date).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500">{new Date(discharge.discharge_date).toLocaleTimeString()}</p>
                </div>
              )
            },
            { 
              key: 'condition_on_discharge', 
              label: 'Condition',
              render: (discharge: any) => (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  {discharge.condition_on_discharge || 'Stable'}
                </span>
              )
            },
            { 
              key: 'follow_up_instructions', 
              label: 'Follow-up',
              render: (discharge: any) => (
                <span className="text-sm">{discharge.follow_up_instructions ? 'Required' : 'None'}</span>
              )
            },
            { 
              key: 'actions', 
              label: 'Actions',
              render: (discharge: any) => (
                <button
                  onClick={() => printDischargeSummary(discharge)}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              )
            },
          ]}
          loading={loading}
          searchPlaceholder="Search recent discharges..."
        />
      </div>

      {/* Discharge Processing Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Process Discharge - {selectedPatient.name}
                </h2>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Discharge Checklist */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Discharge Checklist</h3>
                  
                  <div className="space-y-3">
                    {Object.entries({
                      final_bill_cleared: 'Final bill cleared',
                      discharge_summary_completed: 'Discharge summary completed',
                      medicines_dispensed: 'Medicines dispensed',
                      lab_reports_ready: 'Lab reports ready',
                      follow_up_scheduled: 'Follow-up scheduled',
                      patient_counseling_done: 'Patient counseling done'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={dischargeChecklist[key as keyof DischargeChecklist]}
                          onChange={(e: any) => setDischargeChecklist(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <label className="text-sm text-gray-700">{label}</label>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-white rounded border">
                    <p className="text-sm font-medium text-gray-900">Patient Information</p>
                    <p className="text-sm text-gray-600">UHID: {selectedPatient.uhid}</p>
                    <p className="text-sm text-gray-600">Room: {selectedPatient.room_number}</p>
                    <p className="text-sm text-gray-600">Bill: {formatCurrency(selectedPatient.final_bill_amount || 0)}</p>
                    <p className="text-sm text-gray-600">Status: 
                      <span className={`ml-1 font-medium ${
                        selectedPatient.bill_status === 'paid' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedPatient.bill_status.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Discharge Summary */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Discharge Summary</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Diagnosis</label>
                    <input
                      type="text"
                      value={dischargeSummary.diagnosis}
                      onChange={(e: any) => setDischargeSummary(prev => ({ ...prev, diagnosis: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter primary diagnosis"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Given</label>
                    <textarea
                      value={dischargeSummary.treatment_given}
                      onChange={(e: any) => setDischargeSummary(prev => ({ ...prev, treatment_given: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Describe treatment provided"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition on Discharge</label>
                    <select
                      value={dischargeSummary.condition_on_discharge}
                      onChange={(e: any) => setDischargeSummary(prev => ({ ...prev, condition_on_discharge: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select condition</option>
                      <option value="Stable">Stable</option>
                      <option value="Improved">Improved</option>
                      <option value="Recovered">Recovered</option>
                      <option value="Against Medical Advice">Against Medical Advice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
                    <textarea
                      value={dischargeSummary.medications}
                      onChange={(e: any) => setDischargeSummary(prev => ({ ...prev, medications: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="List discharge medications"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Instructions</label>
                    <textarea
                      value={dischargeSummary.follow_up_instructions}
                      onChange={(e: any) => setDischargeSummary(prev => ({ ...prev, follow_up_instructions: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Follow-up care instructions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Visit Date</label>
                    <input
                      type="date"
                      value={dischargeSummary.next_visit_date}
                      onChange={(e: any) => setDischargeSummary(prev => ({ ...prev, next_visit_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Doctor's Notes</label>
                    <textarea
                      value={dischargeSummary.doctor_notes}
                      onChange={(e: any) => setDischargeSummary(prev => ({ ...prev, doctor_notes: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-4">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => processDischarge(selectedPatient)}
                disabled={!canDischarge}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300"
              >
                Complete Discharge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}