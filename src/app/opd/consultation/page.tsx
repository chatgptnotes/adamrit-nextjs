'use client'
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { FileText, User, Stethoscope, Clipboard, Save, Printer } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface Patient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  age: number
  gender: string
  phone: string
  allergies: string
  medical_history: string
}

export default function ConsultationNotes() {
  const searchParams = useSearchParams()
  const patientParam = searchParams.get('patient')
  
  const [patient, setPatient] = useState<Patient | null>(null)
  const [soapData, setSoapData] = useState({
    // Subjective
    chief_complaint: '',
    history_present_illness: '',
    review_of_systems: '',
    past_medical_history: '',
    family_history: '',
    social_history: '',
    
    // Objective
    vital_signs: {
      temperature: '',
      blood_pressure_systolic: '',
      blood_pressure_diastolic: '',
      heart_rate: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      weight: '',
      height: ''
    },
    physical_examination: '',
    
    // Assessment
    primary_diagnosis: '',
    secondary_diagnosis: '',
    differential_diagnosis: '',
    
    // Plan
    treatment_plan: '',
    medications: '',
    lab_orders: '',
    imaging_orders: '',
    follow_up: '',
    patient_education: '',
    
    // Additional
    consultation_date: new Date().toISOString().split('T')[0],
    consultation_time: new Date().toTimeString().slice(0, 5),
    doctor_notes: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])

  useEffect(() => {
    if (patientParam) {
      fetchPatient(patientParam)
    }
    fetchTemplates()
  }, [patientParam])

  const fetchPatient = async (id: string) => {
    try {
      const { data } = await supabase
        .from('patients_full')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        setPatient(data)
        // Pre-fill some data from patient record
        setSoapData(prev => ({
          ...prev,
          past_medical_history: data.medical_history || '',
          review_of_systems: data.allergies ? `Allergies: ${data.allergies}` : ''
        }))
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
    }
  }

  const fetchTemplates = async () => {
    // Mock consultation templates
    const mockTemplates = [
      {
        id: 1,
        name: 'General Consultation',
        chief_complaint: 'Chief complaint as stated by patient',
        physical_examination: 'General appearance: \nHead & Neck: \nCardiovascular: \nRespiratory: \nAbdomen: \nNeurological: ',
        treatment_plan: '1. \n2. \n3. '
      },
      {
        id: 2,
        name: 'Follow-up Visit',
        chief_complaint: 'Follow-up visit for',
        physical_examination: 'Patient appears comfortable\nVital signs stable\n',
        treatment_plan: 'Continue current treatment\nNext follow-up in '
      }
    ]
    setTemplates(mockTemplates)
  }

  const applyTemplate = (template: any) => {
    setSoapData(prev => ({
      ...prev,
      chief_complaint: template.chief_complaint,
      physical_examination: template.physical_examination,
      treatment_plan: template.treatment_plan
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) return

    setLoading(true)
    try {
      const consultationRecord = {
        patient_id: patient.id,
        consultation_date: `${soapData.consultation_date}T${soapData.consultation_time}:00`,
        soap_notes: soapData,
        created_at: new Date().toISOString()
      }

      console.log('Would save consultation:', consultationRecord)
      alert('Consultation notes saved successfully!')
      
    } catch (error) {
      console.error('Error saving consultation:', error)
      alert('Error saving consultation notes.')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <div className="text-lg font-medium text-gray-900 mb-2">No patient selected</div>
        <div className="text-gray-500">Please select a patient to start consultation</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Consultation Notes (SOAP)</h1>
            <p className="text-sm text-gray-500">Structured clinical documentation</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Patient Header */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </div>
            <div className="text-sm text-gray-600">
              ID: {patient.patient_id} • {patient.gender} • Age: {patient.age} • Phone: {patient.phone}
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Date: {new Date(soapData.consultation_date).toLocaleDateString('en-IN')}</div>
            <div>Time: {soapData.consultation_time}</div>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="bg-white rounded-lg border p-4 mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Quick Templates:</span>
          {templates.map(template => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Subjective */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clipboard className="w-5 h-5" />
            Subjective
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
              <textarea
                value={soapData.chief_complaint}
                onChange={(e) => setSoapData({...soapData, chief_complaint: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={2}
                placeholder="Patient's main complaint in their own words..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">History of Present Illness</label>
              <textarea
                value={soapData.history_present_illness}
                onChange={(e) => setSoapData({...soapData, history_present_illness: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Detailed history of the current illness..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Review of Systems</label>
                <textarea
                  value={soapData.review_of_systems}
                  onChange={(e) => setSoapData({...soapData, review_of_systems: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Systematic review..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Family History</label>
                <textarea
                  value={soapData.family_history}
                  onChange={(e) => setSoapData({...soapData, family_history: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Relevant family history..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Social History</label>
                <textarea
                  value={soapData.social_history}
                  onChange={(e) => setSoapData({...soapData, social_history: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Smoking, alcohol, occupation..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Objective */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Objective
          </h3>
          
          {/* Vital Signs */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Vital Signs</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Temperature (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={soapData.vital_signs.temperature}
                  onChange={(e) => setSoapData({
                    ...soapData,
                    vital_signs: {...soapData.vital_signs, temperature: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="98.6"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">BP (mmHg)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={soapData.vital_signs.blood_pressure_systolic}
                    onChange={(e) => setSoapData({
                      ...soapData,
                      vital_signs: {...soapData.vital_signs, blood_pressure_systolic: e.target.value}
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="120"
                  />
                  <span className="py-2">/</span>
                  <input
                    type="number"
                    value={soapData.vital_signs.blood_pressure_diastolic}
                    onChange={(e) => setSoapData({
                      ...soapData,
                      vital_signs: {...soapData.vital_signs, blood_pressure_diastolic: e.target.value}
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="80"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={soapData.vital_signs.heart_rate}
                  onChange={(e) => setSoapData({
                    ...soapData,
                    vital_signs: {...soapData.vital_signs, heart_rate: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="72"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  value={soapData.vital_signs.oxygen_saturation}
                  onChange={(e) => setSoapData({
                    ...soapData,
                    vital_signs: {...soapData.vital_signs, oxygen_saturation: e.target.value}
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="98"
                />
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
            <textarea
              value={soapData.physical_examination}
              onChange={(e) => setSoapData({...soapData, physical_examination: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={6}
              placeholder="Detailed physical examination findings..."
            />
          </div>
        </div>

        {/* Assessment */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Diagnosis</label>
              <input
                type="text"
                value={soapData.primary_diagnosis}
                onChange={(e) => setSoapData({...soapData, primary_diagnosis: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Primary diagnosis with ICD code if known"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Diagnosis</label>
                <input
                  type="text"
                  value={soapData.secondary_diagnosis}
                  onChange={(e) => setSoapData({...soapData, secondary_diagnosis: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional diagnoses"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Differential Diagnosis</label>
                <input
                  type="text"
                  value={soapData.differential_diagnosis}
                  onChange={(e) => setSoapData({...soapData, differential_diagnosis: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Alternative diagnoses to consider"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Plan</label>
              <textarea
                value={soapData.treatment_plan}
                onChange={(e) => setSoapData({...soapData, treatment_plan: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Detailed treatment plan..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medications</label>
                <textarea
                  value={soapData.medications}
                  onChange={(e) => setSoapData({...soapData, medications: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Prescribed medications with dosage..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Patient Education</label>
                <textarea
                  value={soapData.patient_education}
                  onChange={(e) => setSoapData({...soapData, patient_education: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Instructions and education provided..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lab Orders</label>
                <textarea
                  value={soapData.lab_orders}
                  onChange={(e) => setSoapData({...soapData, lab_orders: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Laboratory tests ordered..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Imaging Orders</label>
                <textarea
                  value={soapData.imaging_orders}
                  onChange={(e) => setSoapData({...soapData, imaging_orders: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Radiology/imaging orders..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Follow-up</label>
                <textarea
                  value={soapData.follow_up}
                  onChange={(e) => setSoapData({...soapData, follow_up: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Follow-up plan and timeline..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
          
          <textarea
            value={soapData.doctor_notes}
            onChange={(e) => setSoapData({...soapData, doctor_notes: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="Any additional notes or observations..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 print:hidden">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Consultation'}
          </button>
        </div>
      </form>
    </div>
  )
}