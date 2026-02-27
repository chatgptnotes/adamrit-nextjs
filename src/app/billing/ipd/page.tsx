'use client'
import { useState, useEffect, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculateTotalBill, type BillBreakdown } from '@/lib/billing-engine'
import { useWardPatients } from '@/hooks/useSupabase'
import { supabase } from '@/lib/supabase'
import ChargesBreakdown from '@/components/billing/ChargesBreakdown'
import DataTable from '@/components/DataTable'
import { 
  Building, 
  User, 
  Calendar, 
  CreditCard, 
  Plus,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface ServiceCharge {
  tariff_list_id: number
  service_name: string
  quantity: number
  rate: number
  total: number
}

export default function IPDBillingPage() {
  const { data: wardPatients, loading: patientsLoading } = useWardPatients()
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [chargesBreakdown, setChargesBreakdown] = useState<BillBreakdown | null>(null)
  const [calculatingCharges, setCalculatingCharges] = useState(false)
  const [tariffLists, setTariffLists] = useState<any[]>([])
  const [newService, setNewService] = useState({ tariff_list_id: '', quantity: 1 })
  const [savingService, setSavingService] = useState(false)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load tariff lists for service selection
  useEffect(() => {
    async function loadTariffLists() {
      const { data } = await supabase
        .from('tariff_lists')
        .select('*')
        .order('service_name')
      
      setTariffLists(data || [])
    }
    loadTariffLists()
  }, [])

  // Calculate days admitted for each patient
  const patientsWithDays = useMemo(() => {
    return wardPatients.map(patient => {
      const admissionDate = new Date(patient.in_date)
      const today = new Date()
      const daysAdmitted = Math.ceil((today.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...patient,
        days_admitted: Math.max(1, daysAdmitted),
        patient_name: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown'
      }
    })
  }, [wardPatients])

  const handlePatientSelect = async (patient: any) => {
    setSelectedPatient(patient)
    setCalculatingCharges(true)

    try {
      const breakdown = await calculateTotalBill(patient.patient_id)
      setChargesBreakdown(breakdown)
    } catch (error) {
      console.error('Error calculating charges:', error)
      setAlert({ type: 'error', message: 'Failed to calculate patient charges' })
    } finally {
      setCalculatingCharges(false)
    }
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient || !newService.tariff_list_id) return

    setSavingService(true)
    try {
      // Get tariff details
      const selectedTariff = tariffLists.find(t => t.id === parseInt(newService.tariff_list_id))
      if (!selectedTariff) throw new Error('Invalid service selected')

      // Add service bill
      const { error } = await supabase
        .from('service_bills')
        .insert({
          patient_id: selectedPatient.patient_id,
          tariff_list_id: parseInt(newService.tariff_list_id),
          quantity: newService.quantity,
          service_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString()
        })

      if (error) throw error

      // Refresh charges breakdown
      const breakdown = await calculateTotalBill(selectedPatient.patient_id)
      setChargesBreakdown(breakdown)
      
      // Reset form
      setNewService({ tariff_list_id: '', quantity: 1 })
      
      setAlert({ type: 'success', message: 'Service charge added successfully!' })
    } catch (error) {
      console.error('Error adding service:', error)
      setAlert({ type: 'error', message: 'Failed to add service charge' })
    } finally {
      setSavingService(false)
    }
  }

  const patientColumns = [
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'ipd_number', label: 'IPD Number' },
    { key: 'ward_name', label: 'Ward' },
    { key: 'bed_number', label: 'Bed' },
    { 
      key: 'in_date', 
      label: 'Admission Date', 
      render: (row: any) => formatDate(row.in_date) 
    },
    { 
      key: 'days_admitted', 
      label: 'Days',
      render: (row: any) => `${row.days_admitted} days`
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <button
          onClick={() => handlePatientSelect(row)}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
        >
          View Charges
        </button>
      )
    }
  ]

  const selectedTariff = tariffLists.find(t => t.id === parseInt(newService.tariff_list_id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IPD Billing</h1>
          <p className="text-gray-600">Manage billing for admitted patients</p>
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
        {/* Current IPD Patients */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Current IPD Patients ({patientsWithDays.length})
          </h3>
          
          <DataTable
            data={patientsWithDays}
            columns={patientColumns}
            loading={patientsLoading}
            searchPlaceholder="Search patients..."
            searchKey="patient_name"
          />
        </div>

        {/* Patient Details & Actions */}
        <div className="space-y-6">
          {/* Selected Patient Info */}
          {selectedPatient && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Details
              </h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium">{selectedPatient.patient_name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">IPD Number:</span>
                  <p className="font-medium">{selectedPatient.ipd_number}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Ward:</span>
                    <p className="font-medium">{selectedPatient.ward_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Bed:</span>
                    <p className="font-medium">{selectedPatient.bed_number}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Admitted:</span>
                  <p className="font-medium">{formatDate(selectedPatient.in_date)}</p>
                  <p className="text-sm text-blue-600">{selectedPatient.days_admitted} days</p>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <div className="flex gap-2">
                    <Link 
                      href={`/billing/advance?patient=${selectedPatient.patient_id}`}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm text-center hover:bg-blue-700 transition-colors"
                    >
                      Advance Payment
                    </Link>
                    <Link 
                      href={`/billing/discharge?patient=${selectedPatient.patient_id}`}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm text-center hover:bg-green-700 transition-colors"
                    >
                      Discharge Bill
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Service Charge */}
          {selectedPatient && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Service Charge
              </h3>
              
              <form onSubmit={handleAddService} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service *
                  </label>
                  <select
                    value={newService.tariff_list_id}
                    onChange={(e) => setNewService(prev => ({ ...prev, tariff_list_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  >
                    <option value="">Select a service...</option>
                    {tariffLists.map(tariff => (
                      <option key={tariff.id} value={tariff.id}>
                        {tariff.service_name} - {formatCurrency(tariff.base_rate || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newService.quantity}
                    onChange={(e) => setNewService(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    required
                  />
                </div>

                {selectedTariff && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-900">{selectedTariff.service_name}</p>
                    <p className="text-gray-600">Rate: {formatCurrency(selectedTariff.base_rate || 0)}</p>
                    <p className="text-gray-800 font-semibold">
                      Total: {formatCurrency((selectedTariff.base_rate || 0) * newService.quantity)}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!newService.tariff_list_id || savingService}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-sm"
                >
                  {savingService ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingService ? 'Adding...' : 'Add Service'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Charges Breakdown */}
      {selectedPatient && (
        <div className="max-w-4xl">
          <ChargesBreakdown
            breakdown={chargesBreakdown}
            loading={calculatingCharges}
          />
        </div>
      )}
    </div>
  )
}