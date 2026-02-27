'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { Clock, Users, CheckCircle, AlertCircle, Play, Pause } from 'lucide-react'

interface QueuePatient {
  id: number
  token_number: number
  patient_name: string
  patient_id: string
  doctor_name: string
  appointment_time: string
  status: 'waiting' | 'in_consultation' | 'completed' | 'no_show'
  chief_complaint: string
  priority: 'normal' | 'urgent' | 'emergency'
  checked_in_at: string
}

export default function PatientQueue() {
  const [queueData, setQueueData] = useState<QueuePatient[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchDoctors()
    fetchQueueData()
    
    // Auto-refresh every 30 seconds
    const interval = autoRefresh ? setInterval(() => {
      fetchQueueData()
    }, 30000) : null

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [selectedDate, selectedDoctor, autoRefresh])

  const fetchDoctors = async () => {
    try {
      const { data } = await supabase.from('doctors').select('*').order('doctor_name')
      setDoctors(data || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
    }
  }

  const fetchQueueData = async () => {
    try {
      // Mock queue data since we may not have real appointments
      const mockQueue: QueuePatient[] = [
        {
          id: 1,
          token_number: 1,
          patient_name: 'Rajesh Kumar',
          patient_id: 'HH001234',
          doctor_name: 'Dr. Sharma',
          appointment_time: '09:00',
          status: 'completed',
          chief_complaint: 'Fever and cough',
          priority: 'normal',
          checked_in_at: '08:45'
        },
        {
          id: 2,
          token_number: 2,
          patient_name: 'Priya Singh',
          patient_id: 'HH001235',
          doctor_name: 'Dr. Sharma',
          appointment_time: '09:30',
          status: 'in_consultation',
          chief_complaint: 'Back pain',
          priority: 'normal',
          checked_in_at: '09:15'
        },
        {
          id: 3,
          token_number: 3,
          patient_name: 'Mohammed Ali',
          patient_id: 'HH001236',
          doctor_name: 'Dr. Sharma',
          appointment_time: '10:00',
          status: 'waiting',
          chief_complaint: 'Chest pain',
          priority: 'urgent',
          checked_in_at: '09:45'
        },
        {
          id: 4,
          token_number: 4,
          patient_name: 'Sunita Devi',
          patient_id: 'HH001237',
          doctor_name: 'Dr. Sharma',
          appointment_time: '10:30',
          status: 'waiting',
          chief_complaint: 'Routine checkup',
          priority: 'normal',
          checked_in_at: '10:00'
        },
        {
          id: 5,
          token_number: 5,
          patient_name: 'Arjun Patel',
          patient_id: 'HH001238',
          doctor_name: 'Dr. Sharma',
          appointment_time: '11:00',
          status: 'waiting',
          chief_complaint: 'Headache',
          priority: 'normal',
          checked_in_at: '10:30'
        }
      ]

      // Filter by selected doctor if any
      const filteredQueue = selectedDoctor 
        ? mockQueue.filter((p: any) => p.doctor_name === selectedDoctor)
        : mockQueue

      setQueueData(filteredQueue)
    } catch (error) {
      console.error('Error fetching queue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePatientStatus = async (id: number, newStatus: QueuePatient['status']) => {
    try {
      // In real implementation, update the appointment status
      console.log(`Would update patient ${id} status to ${newStatus}`)
      
      // Update local state
      setQueueData(prev => 
        prev.map((p: any) => p.id === id ? { ...p, status: newStatus } : p)
      )
    } catch (error) {
      console.error('Error updating patient status:', error)
    }
  }

  const getStatusColor = (status: QueuePatient['status']) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_consultation': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'no_show': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: QueuePatient['priority']) => {
    switch (priority) {
      case 'emergency': return 'text-red-600'
      case 'urgent': return 'text-orange-600'
      case 'normal': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getQueueStats = () => {
    const waiting = queueData.filter((p: any) => p.status === 'waiting').length
    const inConsultation = queueData.filter((p: any) => p.status === 'in_consultation').length
    const completed = queueData.filter((p: any) => p.status === 'completed').length
    const noShow = queueData.filter((p: any) => p.status === 'no_show').length

    return { waiting, inConsultation, completed, noShow, total: queueData.length }
  }

  const stats = getQueueStats()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-50 rounded-lg text-green-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Queue</h1>
            <p className="text-sm text-gray-500">Real-time OPD patient queue management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            {autoRefresh ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            Auto Refresh
          </button>
          
          <button
            onClick={fetchQueueData}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Doctors</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.doctor_name}>
                  {doctor.doctor_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0])
                setSelectedDoctor('')
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Queue Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.waiting}</div>
            <div className="text-sm text-gray-500">Waiting</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inConsultation}</div>
            <div className="text-sm text-gray-500">In Progress</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.noShow}</div>
            <div className="text-sm text-gray-500">No Show</div>
          </div>
        </div>
      </div>

      {/* Patient Queue */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">
            Patient Queue - {new Date(selectedDate).toLocaleDateString('en-IN')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {selectedDoctor ? `Showing queue for ${selectedDoctor}` : 'Showing all doctors'}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <div className="text-gray-500 mt-2">Loading queue...</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {queueData.map((patient) => (
              <div key={patient.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Token Number */}
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                      <div className="text-xl font-bold text-blue-600">
                        {patient.token_number}
                      </div>
                    </div>
                    
                    {/* Patient Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="font-semibold text-gray-900">{patient.patient_name}</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(patient.priority)}`}>
                          {patient.priority.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-1">
                        ID: {patient.patient_id} • Dr. {patient.doctor_name}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        <strong>Complaint:</strong> {patient.chief_complaint}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Appointment: {patient.appointment_time}
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Checked in: {patient.checked_in_at}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status and Actions */}
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(patient.status)}`}>
                      {patient.status.replace('_', ' ')}
                    </div>
                    
                    <div className="flex gap-2">
                      {patient.status === 'waiting' && (
                        <button
                          onClick={() => updatePatientStatus(patient.id, 'in_consultation')}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Start
                        </button>
                      )}
                      
                      {patient.status === 'in_consultation' && (
                        <button
                          onClick={() => updatePatientStatus(patient.id, 'completed')}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Complete
                        </button>
                      )}
                      
                      {(patient.status === 'waiting' || patient.status === 'in_consultation') && (
                        <button
                          onClick={() => updatePatientStatus(patient.id, 'no_show')}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          No Show
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {queueData.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-lg font-medium text-gray-900 mb-2">No patients in queue</div>
                <div>No appointments scheduled for the selected date and doctor</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}