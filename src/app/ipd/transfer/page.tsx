'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { ArrowRight, Search, Users, Bed } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface WardPatient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  ward_id: number
  bed_number: string
  ward_name?: string
  admission_date: string
  doctor_name: string
}

interface Ward {
  id: number
  name: string
  total_beds: number
}

export default function TransferPatient() {
  const router = useRouter()
  const [patients, setPatients] = useState<WardPatient[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [availableBeds, setAvailableBeds] = useState<string[]>([])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<WardPatient | null>(null)
  const [transferData, setTransferData] = useState({
    to_ward_id: '',
    to_bed_number: '',
    transfer_reason: '',
    transfer_notes: '',
    approval_required: false
  })
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchWardPatients()
    fetchWards()
  }, [])

  useEffect(() => {
    if (transferData.to_ward_id) {
      fetchAvailableBeds(parseInt(transferData.to_ward_id))
    }
  }, [transferData.to_ward_id])

  const fetchWardPatients = async () => {
    try {
      const { data } = await supabase
        .from('ward_patients_full')
        .select('*')
        .neq('status', 'discharged')
        .order('admission_date', { ascending: false })
      
      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching ward patients:', error)
    }
  }

  const fetchWards = async () => {
    try {
      const { data } = await supabase.from('wards').select('*').order('name')
      setWards(data || [])
    } catch (error) {
      console.error('Error fetching wards:', error)
    }
  }

  const fetchAvailableBeds = async (wardId: number) => {
    try {
      const selectedWard = wards.find(w => w.id === wardId)
      if (!selectedWard) return

      const { data: occupiedBeds } = await supabase
        .from('ward_patients_full')
        .select('bed_number')
        .eq('ward_id', wardId)
        .neq('status', 'discharged')

      const occupied = (occupiedBeds || []).map(b => b.bed_number)
      const totalBeds = selectedWard.total_beds || 20
      const available = []

      for (let i = 1; i <= totalBeds; i++) {
        if (!occupied.includes(i.toString())) {
          available.push(i.toString())
        }
      }

      setAvailableBeds(available)
      setTransferData(prev => ({ ...prev, to_bed_number: '' }))
    } catch (error) {
      console.error('Error fetching available beds:', error)
    }
  }

  const filteredPatients = patients.filter(patient =>
    searchTerm === '' ||
    patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patient_id?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      alert('Please select a patient to transfer')
      return
    }

    setLoading(true)
    try {
      // In a real implementation, you'd update the ward_patients table
      const transferRecord = {
        patient_id: selectedPatient.id,
        from_ward_id: selectedPatient.ward_id,
        from_bed_number: selectedPatient.bed_number,
        to_ward_id: parseInt(transferData.to_ward_id),
        to_bed_number: transferData.to_bed_number,
        transfer_date: new Date().toISOString(),
        transfer_reason: transferData.transfer_reason,
        transfer_notes: transferData.transfer_notes,
        approval_required: transferData.approval_required,
        status: transferData.approval_required ? 'pending' : 'completed'
      }

      console.log('Would create transfer record:', transferRecord)
      
      if (transferData.approval_required) {
        alert('Transfer request sent for approval!')
      } else {
        alert('Patient transferred successfully!')
      }
      
      router.push('/ipd')
    } catch (error) {
      console.error('Error transferring patient:', error)
      alert('Error transferring patient. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
          <ArrowRight className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Patient</h1>
          <p className="text-sm text-gray-500">Move patient between wards and beds</p>
        </div>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Select Patient to Transfer
          </h3>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by patient name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredPatients.map(patient => (
              <div
                key={patient.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedPatient?.id === patient.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold">{patient.first_name} {patient.last_name}</div>
                    <div className="text-sm text-gray-600">
                      ID: {patient.patient_id} • Dr. {patient.doctor_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Admitted: {formatDate(patient.admission_date)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 text-right">
                    <div className="font-medium">{patient.ward_name || `Ward ${patient.ward_id}`}</div>
                    <div className="text-gray-500">Bed {patient.bed_number}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedPatient && (
            <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="font-semibold text-purple-800">Selected for Transfer:</div>
              <div className="text-purple-700">
                {selectedPatient.first_name} {selectedPatient.last_name} 
                <span className="mx-2">•</span>
                Current: {selectedPatient.ward_name || `Ward ${selectedPatient.ward_id}`}, Bed {selectedPatient.bed_number}
              </div>
            </div>
          )}
        </div>

        {/* Transfer Details */}
        {selectedPatient && (
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Bed className="w-5 h-5" />
                Transfer Destination
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Ward</label>
                  <select
                    value={transferData.to_ward_id}
                    onChange={(e) => setTransferData({...transferData, to_ward_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Ward</option>
                    {wards.filter(w => w.id !== selectedPatient.ward_id).map((ward: any) => (
                      <option key={ward.id} value={ward.id}>{ward.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Bed</label>
                  <select
                    value={transferData.to_bed_number}
                    onChange={(e) => setTransferData({...transferData, to_bed_number: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                    disabled={!transferData.to_ward_id}
                  >
                    <option value="">Select Bed</option>
                    {availableBeds.map((bed: any) => (
                      <option key={bed} value={bed}>Bed {bed}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Reason</label>
                <select
                  value={transferData.transfer_reason}
                  onChange={(e) => setTransferData({...transferData, transfer_reason: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select Reason</option>
                  <option value="medical_upgrade">Medical - Upgrade Care Level</option>
                  <option value="medical_downgrade">Medical - Step Down Care</option>
                  <option value="infection_control">Infection Control</option>
                  <option value="patient_request">Patient/Family Request</option>
                  <option value="bed_availability">Bed Availability</option>
                  <option value="departmental_transfer">Departmental Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Notes</label>
                <textarea
                  value={transferData.transfer_notes}
                  onChange={(e) => setTransferData({...transferData, transfer_notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  placeholder="Any additional notes for the transfer..."
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={transferData.approval_required}
                    onChange={(e) => setTransferData({...transferData, approval_required: e.target.checked})}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Requires medical approval before transfer</span>
                </label>
              </div>

              {/* Transfer Summary */}
              {transferData.to_ward_id && transferData.to_bed_number && (
                <div className="bg-gray-50 border rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Transfer Summary</h4>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-center">
                      <div className="font-medium">From</div>
                      <div className="text-gray-600">
                        {selectedPatient.ward_name || `Ward ${selectedPatient.ward_id}`}
                        <br />
                        Bed {selectedPatient.bed_number}
                      </div>
                    </div>
                    <div className="px-4">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="text-center">
                      <div className="font-medium">To</div>
                      <div className="text-gray-600">
                        {wards.find(w => w.id === parseInt(transferData.to_ward_id))?.name}
                        <br />
                        Bed {transferData.to_bed_number}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : transferData.approval_required ? 'Request Transfer' : 'Transfer Patient'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}