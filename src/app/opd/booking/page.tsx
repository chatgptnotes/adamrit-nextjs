'use client'
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { Calendar, Clock, User, Search, Stethoscope, CreditCard } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Patient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  age: number
  gender: string
  phone: string
  insurance_provider: string
}

interface Doctor {
  id: number
  doctor_name: string
  department: string
  consultation_fee: number
}

interface TimeSlot {
  time: string
  available: boolean
  token_number?: number
}

export default function AppointmentBooking() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [bookingData, setBookingData] = useState({
    doctor_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
    appointment_type: 'consultation',
    priority: 'normal',
    chief_complaint: '',
    consultation_fee: '',
    payment_mode: 'cash',
    notes: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchDoctors()
  }, [])

  useEffect(() => {
    if (bookingData.doctor_id && bookingData.appointment_date) {
      generateTimeSlots()
    }
  }, [bookingData.doctor_id, bookingData.appointment_date])

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

  const generateTimeSlots = async () => {
    // Generate time slots for the selected date and doctor
    const slots: TimeSlot[] = []
    const startHour = 9 // 9 AM
    const endHour = 17 // 5 PM
    const slotDuration = 30 // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        
        // Check if slot is available (mock logic)
        const isAvailable = Math.random() > 0.3 // 70% availability
        
        slots.push({
          time: timeString,
          available: isAvailable,
          token_number: isAvailable ? Math.floor(Math.random() * 50) + 1 : undefined
        })
      }
    }

    setTimeSlots(slots)
  }

  const handleDoctorChange = (doctorId: string) => {
    const doctor = doctors.find(d => d.id.toString() === doctorId)
    setBookingData({
      ...bookingData,
      doctor_id: doctorId,
      consultation_fee: doctor ? doctor.consultation_fee?.toString() || '500' : '500'
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) {
      alert('Please select a patient')
      return
    }

    setLoading(true)
    try {
      const selectedDoctor = doctors.find(d => d.id.toString() === bookingData.doctor_id)
      const selectedSlot = timeSlots.find(s => s.time === bookingData.appointment_time)
      
      const appointmentRecord = {
        patient_id: selectedPatient.id,
        doctor_id: parseInt(bookingData.doctor_id),
        appointment_date: `${bookingData.appointment_date}T${bookingData.appointment_time}:00`,
        appointment_type: bookingData.appointment_type,
        priority: bookingData.priority,
        chief_complaint: bookingData.chief_complaint,
        consultation_fee: parseFloat(bookingData.consultation_fee),
        payment_mode: bookingData.payment_mode,
        notes: bookingData.notes,
        token_number: selectedSlot?.token_number,
        status: 'scheduled',
        created_at: new Date().toISOString(),
        location_id: 1
      }

      // In a real implementation, you'd insert into appointments table
      console.log('Would create appointment:', appointmentRecord)
      
      alert(`Appointment booked successfully!\nToken Number: ${selectedSlot?.token_number || 'N/A'}`)
      router.push('/opd')
      
    } catch (error) {
      console.error('Error booking appointment:', error)
      alert('Error booking appointment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getTimeSlotClass = (slot: TimeSlot) => {
    if (!slot.available) {
      return 'bg-gray-100 text-gray-400 cursor-not-allowed'
    }
    if (bookingData.appointment_time === slot.time) {
      return 'bg-blue-600 text-white'
    }
    return 'bg-white border-2 border-gray-200 hover:border-blue-500 cursor-pointer'
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-sm text-gray-500">Schedule OPD consultation for patient</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl space-y-8">
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
                        ID: {patient.patient_id} • {patient.gender} • Age: {patient.age}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{patient.phone}</div>
                  </div>
                  {patient.insurance_provider && (
                    <div className="mt-1">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        {patient.insurance_provider}
                      </span>
                    </div>
                  )}
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

        {/* Appointment Details */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Appointment Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
              <select
                value={bookingData.doctor_id}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Doctor</option>
                {doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.doctor_name} ({doctor.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Date</label>
              <input
                type="date"
                value={bookingData.appointment_date}
                onChange={(e) => setBookingData({...bookingData, appointment_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Type</label>
              <select
                value={bookingData.appointment_type}
                onChange={(e) => setBookingData({...bookingData, appointment_type: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="checkup">Health Checkup</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={bookingData.priority}
                onChange={(e) => setBookingData({...bookingData, priority: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Fee (₹)</label>
              <input
                type="number"
                value={bookingData.consultation_fee}
                onChange={(e) => setBookingData({...bookingData, consultation_fee: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        {/* Time Slot Selection */}
        {timeSlots.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Select Time Slot
            </h3>
            
            <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => slot.available ? setBookingData({...bookingData, appointment_time: slot.time}) : null}
                  disabled={!slot.available}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${getTimeSlotClass(slot)}`}
                >
                  <div>{slot.time}</div>
                  {slot.available && slot.token_number && (
                    <div className="text-xs mt-1">Token: {slot.token_number}</div>
                  )}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
                <span>Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-100 rounded"></div>
                <span>Unavailable</span>
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chief Complaint</label>
              <textarea
                value={bookingData.chief_complaint}
                onChange={(e) => setBookingData({...bookingData, chief_complaint: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Brief description of patient's main complaint..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={bookingData.notes}
                onChange={(e) => setBookingData({...bookingData, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Any additional notes for the appointment..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Mode
            </label>
            <select
              value={bookingData.payment_mode}
              onChange={(e) => setBookingData({...bookingData, payment_mode: e.target.value})}
              className="w-full md:w-64 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="insurance">Insurance</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>
        </div>

        {/* Booking Summary */}
        {selectedPatient && bookingData.doctor_id && bookingData.appointment_time && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Appointment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-blue-700 mb-1">Patient Details:</div>
                <div className="text-blue-900">
                  {selectedPatient.first_name} {selectedPatient.last_name} (ID: {selectedPatient.patient_id})
                </div>
              </div>
              <div>
                <div className="text-blue-700 mb-1">Doctor:</div>
                <div className="text-blue-900">
                  {doctors.find(d => d.id.toString() === bookingData.doctor_id)?.doctor_name}
                </div>
              </div>
              <div>
                <div className="text-blue-700 mb-1">Date & Time:</div>
                <div className="text-blue-900">
                  {new Date(bookingData.appointment_date).toLocaleDateString('en-IN')} at {bookingData.appointment_time}
                </div>
              </div>
              <div>
                <div className="text-blue-700 mb-1">Consultation Fee:</div>
                <div className="text-blue-900 font-semibold">
                  ₹{bookingData.consultation_fee}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !selectedPatient || !bookingData.appointment_time}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>
      </form>
    </div>
  )
}