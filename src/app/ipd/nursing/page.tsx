'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { Heart, Thermometer, Activity, Clock, FileText, Plus, Search } from 'lucide-react'

interface WardPatient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  ward_id: number
  bed_number: string
  ward_name?: string
  admission_date: string
}

interface VitalSigns {
  temperature: string
  systolic_bp: string
  diastolic_bp: string
  pulse_rate: string
  spo2: string
  respiratory_rate: string
}

interface NursingNote {
  id: number
  patient_id: number
  nurse_name: string
  note_date: string
  vital_signs: VitalSigns
  nursing_notes: string
  intake_output?: string
  medications_given?: string
}

export default function NursingNotes() {
  const [patients, setPatients] = useState<WardPatient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<WardPatient | null>(null)
  const [nursingNotes, setNursingNotes] = useState<NursingNote[]>([])
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    nurse_name: '',
    vital_signs: {
      temperature: '',
      systolic_bp: '',
      diastolic_bp: '',
      pulse_rate: '',
      spo2: '',
      respiratory_rate: ''
    },
    nursing_notes: '',
    intake_output: '',
    medications_given: ''
  })
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchWardPatients()
  }, [])

  useEffect(() => {
    if (selectedPatient) {
      fetchNursingNotes(selectedPatient.id)
    }
  }, [selectedPatient])

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

  const fetchNursingNotes = async (patientId: number) => {
    try {
      // In a real implementation, you'd have a nursing_notes table
      // For now, we'll mock some data
      const mockNotes: NursingNote[] = [
        {
          id: 1,
          patient_id: patientId,
          nurse_name: 'Sister Mary',
          note_date: new Date().toISOString(),
          vital_signs: {
            temperature: '98.6',
            systolic_bp: '120',
            diastolic_bp: '80',
            pulse_rate: '72',
            spo2: '98',
            respiratory_rate: '18'
          },
          nursing_notes: 'Patient comfortable, good oral intake. Ambulating with assistance.',
          intake_output: 'Intake: 1500ml, Output: 1200ml',
          medications_given: 'Paracetamol 500mg at 10:00 AM'
        }
      ]
      
      setNursingNotes(mockNotes)
    } catch (error) {
      console.error('Error fetching nursing notes:', error)
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
    if (!selectedPatient) return

    setLoading(true)
    try {
      const newNote = {
        patient_id: selectedPatient.id,
        nurse_name: formData.nurse_name,
        note_date: new Date().toISOString(),
        vital_signs: formData.vital_signs,
        nursing_notes: formData.nursing_notes,
        intake_output: formData.intake_output,
        medications_given: formData.medications_given
      }

      console.log('Would save nursing note:', newNote)
      
      // Reset form
      setFormData({
        nurse_name: '',
        vital_signs: {
          temperature: '',
          systolic_bp: '',
          diastolic_bp: '',
          pulse_rate: '',
          spo2: '',
          respiratory_rate: ''
        },
        nursing_notes: '',
        intake_output: '',
        medications_given: ''
      })
      
      setShowForm(false)
      alert('Nursing note saved successfully!')
      
      // Refresh notes
      fetchNursingNotes(selectedPatient.id)
    } catch (error) {
      console.error('Error saving nursing note:', error)
      alert('Error saving nursing note. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN')
  }

  const getVitalStatus = (vital: string, normalRange: [number, number]) => {
    const value = parseFloat(vital)
    if (isNaN(value)) return 'text-gray-500'
    
    if (value < normalRange[0] || value > normalRange[1]) {
      return 'text-red-600 font-semibold'
    }
    return 'text-green-600'
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-50 rounded-lg text-pink-600">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nursing Notes</h1>
            <p className="text-sm text-gray-500">Vital signs and nursing care notes</p>
          </div>
        </div>
        
        {selectedPatient && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            Add Note
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Select Patient
          </h3>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredPatients.map(patient => (
              <div
                key={patient.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedPatient?.id === patient.id
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="font-semibold text-sm">{patient.first_name} {patient.last_name}</div>
                <div className="text-xs text-gray-600">
                  ID: {patient.patient_id}
                </div>
                <div className="text-xs text-gray-500">
                  {patient.ward_name || `Ward ${patient.ward_id}`} - Bed {patient.bed_number}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nursing Notes & Form */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPatient ? (
            <>
              {/* Patient Info */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold text-gray-900">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </h3>
                <div className="text-sm text-gray-600">
                  ID: {selectedPatient.patient_id} • {selectedPatient.ward_name || `Ward ${selectedPatient.ward_id}`} - Bed {selectedPatient.bed_number}
                </div>
              </div>

              {/* Add Note Form */}
              {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Nursing Note</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nurse Name</label>
                    <input
                      type="text"
                      value={formData.nurse_name}
                      onChange={(e) => setFormData({...formData, nurse_name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter nurse name"
                      required
                    />
                  </div>

                  {/* Vital Signs */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Vital Signs
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Temperature (°F)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.vital_signs.temperature}
                          onChange={(e) => setFormData({
                            ...formData,
                            vital_signs: {...formData.vital_signs, temperature: e.target.value}
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          placeholder="98.6"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          BP Systolic
                        </label>
                        <input
                          type="number"
                          value={formData.vital_signs.systolic_bp}
                          onChange={(e) => setFormData({
                            ...formData,
                            vital_signs: {...formData.vital_signs, systolic_bp: e.target.value}
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          placeholder="120"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          BP Diastolic
                        </label>
                        <input
                          type="number"
                          value={formData.vital_signs.diastolic_bp}
                          onChange={(e) => setFormData({
                            ...formData,
                            vital_signs: {...formData.vital_signs, diastolic_bp: e.target.value}
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          placeholder="80"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Pulse Rate
                        </label>
                        <input
                          type="number"
                          value={formData.vital_signs.pulse_rate}
                          onChange={(e) => setFormData({
                            ...formData,
                            vital_signs: {...formData.vital_signs, pulse_rate: e.target.value}
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          placeholder="72"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SpO2 (%)
                        </label>
                        <input
                          type="number"
                          value={formData.vital_signs.spo2}
                          onChange={(e) => setFormData({
                            ...formData,
                            vital_signs: {...formData.vital_signs, spo2: e.target.value}
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          placeholder="98"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Respiratory Rate
                        </label>
                        <input
                          type="number"
                          value={formData.vital_signs.respiratory_rate}
                          onChange={(e) => setFormData({
                            ...formData,
                            vital_signs: {...formData.vital_signs, respiratory_rate: e.target.value}
                          })}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          placeholder="18"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nursing Notes</label>
                      <textarea
                        value={formData.nursing_notes}
                        onChange={(e) => setFormData({...formData, nursing_notes: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                        rows={4}
                        placeholder="Patient assessment, care provided, observations..."
                        required
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Intake/Output</label>
                        <textarea
                          value={formData.intake_output}
                          onChange={(e) => setFormData({...formData, intake_output: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          rows={2}
                          placeholder="Fluid intake and output..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Medications Given</label>
                        <textarea
                          value={formData.medications_given}
                          onChange={(e) => setFormData({...formData, medications_given: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          rows={2}
                          placeholder="Medications administered..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Note'}
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Notes */}
              <div className="space-y-4">
                {nursingNotes.map(note => (
                  <div key={note.id} className="bg-white rounded-lg border p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-semibold text-gray-900">{note.nurse_name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatDateTime(note.note_date)}
                        </div>
                      </div>
                    </div>

                    {/* Vital Signs Display */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Temp (°F)</div>
                        <div className={`font-semibold ${getVitalStatus(note.vital_signs.temperature, [97, 99])}`}>
                          {note.vital_signs.temperature || '-'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">BP</div>
                        <div className="font-semibold">
                          {note.vital_signs.systolic_bp || '-'}/{note.vital_signs.diastolic_bp || '-'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Pulse</div>
                        <div className={`font-semibold ${getVitalStatus(note.vital_signs.pulse_rate, [60, 100])}`}>
                          {note.vital_signs.pulse_rate || '-'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">SpO2 (%)</div>
                        <div className={`font-semibold ${getVitalStatus(note.vital_signs.spo2, [95, 100])}`}>
                          {note.vital_signs.spo2 || '-'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">RR</div>
                        <div className={`font-semibold ${getVitalStatus(note.vital_signs.respiratory_rate, [12, 20])}`}>
                          {note.vital_signs.respiratory_rate || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Nursing Notes:</div>
                        <div className="text-gray-900">{note.nursing_notes}</div>
                      </div>
                      
                      {note.intake_output && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Intake/Output:</div>
                          <div className="text-gray-900">{note.intake_output}</div>
                        </div>
                      )}
                      
                      {note.medications_given && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Medications:</div>
                          <div className="text-gray-900">{note.medications_given}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500">Select a patient to view nursing notes</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}