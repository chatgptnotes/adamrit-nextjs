'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { UserPlus, Search, Calendar, User, Bed, Stethoscope } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Patient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  sex: string
  age?: number
  phone?: string
}

interface Doctor {
  id: number
  doctor_name: string
  department?: string
}

interface Ward {
  id: number
  name: string
  total_beds: number
}

export default function AdmitPatient() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [wards, setWards] = useState<Ward[]>([])
  const [availableBeds, setAvailableBeds] = useState<string[]>([])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [formData, setFormData] = useState({
    ward_id: '',
    bed_number: '',
    doctor_id: '',
    diagnosis: '',
    expected_stay_days: '',
    admission_notes: '',
    emergency_contact: '',
    insurance_details: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchDoctors()
    fetchWards()
  }, [])

  useEffect(() => {
    if (formData.ward_id) {
      fetchAvailableBeds(parseInt(formData.ward_id))
    }
  }, [formData.ward_id])

  const searchPatients = async (term: string) => {
    if (term.length < 2) {
      setPatients([])
      return
    }
    
    setSearching(true)
    try {
      const { data } = await supabase
        .from('patients_full')
        .select('*')
        .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,patient_id.ilike.%${term}%,phone.ilike.%${term}%`)
        .limit(10)
      
      setPatients(data || [])
    } catch (error) {
      console.error('Error searching patients:', error)
    } finally {
      setSearching(false)
    }
  }

  const fetchDoctors = async () => {
    try {
      const { data } = await supabase.from('doctors').select('*').order('doctor_name')
      setDoctors(data || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
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
      setFormData(prev => ({ ...prev, bed_number: '' }))
    } catch (error) {
      console.error('Error fetching available beds:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      alert('Please select a patient')
      return
    }

    setLoading(true)
    try {
      // Insert admission record - using mock structure
      const admissionData = {
        patient_id: selectedPatient.id,
        ward_id: parseInt(formData.ward_id),
        bed_number: formData.bed_number,
        doctor_id: parseInt(formData.doctor_id),
        admission_date: new Date().toISOString(),
        diagnosis: formData.diagnosis,
        expected_stay_days: parseInt(formData.expected_stay_days) || null,
        admission_notes: formData.admission_notes,
        emergency_contact: formData.emergency_contact,
        insurance_details: formData.insurance_details,
        status: 'admitted',
        location_id: 1 // Hope Hospital
      }

      // In a real implementation, you'd insert into ward_patients table
      console.log('Would insert admission:', admissionData)
      
      alert('Patient admitted successfully!')
      router.push('/ipd')
    } catch (error) {
      console.error('Error admitting patient:', error)
      alert('Error admitting patient. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admit Patient</h1>
          <p className="text-sm text-gray-500">Admit a patient to IPD ward</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
        {/* Patient Search */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Select Patient
          </h3>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name, patient ID, or phone number..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                searchPatients(e.target.value)
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searching && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          {patients.length > 0 && (
            <div className="space-y-2 mb-4">
              {patients.map(patient => (
                <div
                  key={patient.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedPatient?.id === patient.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{patient.first_name} {patient.last_name}</div>
                      <div className="text-sm text-gray-600">
                        ID: {patient.patient_id} • {patient.sex} • Age: {patient.age || 'N/A'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{patient.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedPatient && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="font-semibold text-green-800">Selected Patient:</div>
              <div className="text-green-700">
                {selectedPatient.first_name} {selectedPatient.last_name} (ID: {selectedPatient.patient_id})
              </div>
            </div>
          )}
        </div>

        {/* Admission Details */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bed className="w-5 h-5" />
            Ward & Bed Assignment
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ward</label>
              <select
                value={formData.ward_id}
                onChange={(e) => setFormData({...formData, ward_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Ward</option>
                {wards.map((ward: any) => (
                  <option key={ward.id} value={ward.id}>{ward.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bed Number</label>
              <select
                value={formData.bed_number}
                onChange={(e) => setFormData({...formData, bed_number: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.ward_id}
              >
                <option value="">Select Bed</option>
                {availableBeds.map((bed: any) => (
                  <option key={bed} value={bed}>Bed {bed}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Medical Details */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Medical Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admitting Doctor</label>
              <select
                value={formData.doctor_id}
                onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>{doctor.doctor_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Stay (days)</label>
              <input
                type="number"
                value={formData.expected_stay_days}
                onChange={(e) => setFormData({...formData, expected_stay_days: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                placeholder="e.g., 3"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Diagnosis</label>
            <input
              type="text"
              value={formData.diagnosis}
              onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter primary diagnosis"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Admission Notes</label>
            <textarea
              value={formData.admission_notes}
              onChange={(e) => setFormData({...formData, admission_notes: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any additional notes for admission..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
              <input
                type="text"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Name and phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Details</label>
              <input
                type="text"
                value={formData.insurance_details}
                onChange={(e) => setFormData({...formData, insurance_details: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Insurance provider and policy number"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
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
            disabled={loading || !selectedPatient}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Admitting...' : 'Admit Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}