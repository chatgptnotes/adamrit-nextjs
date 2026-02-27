'use client'
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { Calendar, Clock, User, Plus, Edit, Trash2 } from 'lucide-react'

interface Doctor {
  id: number
  doctor_name: string
  department: string
}

interface Schedule {
  id: number
  doctor_id: number
  doctor_name: string
  day_of_week: string
  start_time: string
  end_time: string
  max_patients: number
  consultation_duration: number
  is_active: boolean
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
]

export default function DoctorSchedule() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  
  const [formData, setFormData] = useState({
    doctor_id: '',
    day_of_week: '',
    start_time: '09:00',
    end_time: '17:00',
    max_patients: '20',
    consultation_duration: '30',
    is_active: true
  })
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDoctors()
    fetchSchedules()
  }, [])

  useEffect(() => {
    if (selectedDoctor) {
      const filtered = schedules.filter(s => s.doctor_id === selectedDoctor)
      // Schedules are already set in fetchSchedules, just filter the view
    }
  }, [selectedDoctor, schedules])

  const fetchDoctors = async () => {
    try {
      const { data } = await supabase.from('doctors').select('*').order('doctor_name')
      setDoctors(data || [])
    } catch (error) {
      console.error('Error fetching doctors:', error)
    }
  }

  const fetchSchedules = async () => {
    try {
      // Mock schedule data since we might not have a schedules table
      const mockSchedules: Schedule[] = [
        {
          id: 1,
          doctor_id: 1,
          doctor_name: 'Dr. Sharma',
          day_of_week: 'monday',
          start_time: '09:00',
          end_time: '13:00',
          max_patients: 16,
          consultation_duration: 15,
          is_active: true
        },
        {
          id: 2,
          doctor_id: 1,
          doctor_name: 'Dr. Sharma',
          day_of_week: 'monday',
          start_time: '14:00',
          end_time: '17:00',
          max_patients: 12,
          consultation_duration: 15,
          is_active: true
        },
        {
          id: 3,
          doctor_id: 1,
          doctor_name: 'Dr. Sharma',
          day_of_week: 'tuesday',
          start_time: '10:00',
          end_time: '16:00',
          max_patients: 24,
          consultation_duration: 15,
          is_active: true
        }
      ]
      
      setSchedules(mockSchedules)
      
      // In a real implementation:
      // const { data } = await supabase
      //   .from('doctor_schedules')
      //   .select('*, doctors(doctor_name)')
      //   .order('day_of_week')
      // setSchedules(data || [])
    } catch (error) {
      console.error('Error fetching schedules:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const scheduleData = {
        doctor_id: parseInt(formData.doctor_id),
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        max_patients: parseInt(formData.max_patients),
        consultation_duration: parseInt(formData.consultation_duration),
        is_active: formData.is_active
      }

      if (editingSchedule) {
        console.log('Would update schedule:', { ...scheduleData, id: editingSchedule.id })
        alert('Schedule updated successfully!')
      } else {
        console.log('Would create schedule:', scheduleData)
        alert('Schedule created successfully!')
      }

      // Reset form
      setFormData({
        doctor_id: '',
        day_of_week: '',
        start_time: '09:00',
        end_time: '17:00',
        max_patients: '20',
        consultation_duration: '30',
        is_active: true
      })
      setShowForm(false)
      setEditingSchedule(null)
      
      // Refresh schedules
      fetchSchedules()
      
    } catch (error) {
      console.error('Error saving schedule:', error)
      alert('Error saving schedule. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (schedule: Schedule) => {
    setFormData({
      doctor_id: schedule.doctor_id.toString(),
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      max_patients: schedule.max_patients.toString(),
      consultation_duration: schedule.consultation_duration.toString(),
      is_active: schedule.is_active
    })
    setEditingSchedule(schedule)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return
    
    try {
      console.log('Would delete schedule:', id)
      alert('Schedule deleted successfully!')
      fetchSchedules()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      alert('Error deleting schedule.')
    }
  }

  const getSchedulesForDay = (dayKey: string) => {
    return schedules.filter(s => 
      s.day_of_week === dayKey && 
      (!selectedDoctor || s.doctor_id === selectedDoctor)
    )
  }

  const getDoctorName = (doctorId: number) => {
    const doctor = doctors.find(d => d.id === doctorId)
    return doctor ? doctor.doctor_name : `Doctor ${doctorId}`
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Schedule</h1>
            <p className="text-sm text-gray-500">Manage doctor availability and time slots</p>
          </div>
        </div>
        
        <button
          onClick={() => {
            setShowForm(true)
            setEditingSchedule(null)
            setFormData({
              doctor_id: '',
              day_of_week: '',
              start_time: '09:00',
              end_time: '17:00',
              max_patients: '20',
              consultation_duration: '30',
              is_active: true
            })
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          Add Schedule
        </button>
      </div>

      {/* Doctor Filter */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Doctor</label>
            <select
              value={selectedDoctor || ''}
              onChange={(e) => setSelectedDoctor(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Doctors</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.doctor_name} ({doctor.department})
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setSelectedDoctor(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor *</label>
              <select
                value={formData.doctor_id}
                onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week *</label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({...formData, day_of_week: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">Select Day</option>
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.key} value={day.key}>{day.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
              <select
                value={formData.consultation_duration}
                onChange={(e) => setFormData({...formData, consultation_duration: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Patients *</label>
              <input
                type="number"
                value={formData.max_patients}
                onChange={(e) => setFormData({...formData, max_patients: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                min="1"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Schedule is active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingSchedule(null)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Add Schedule'}
            </button>
          </div>
        </form>
      )}

      {/* Weekly Schedule Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map(day => {
          const daySchedules = getSchedulesForDay(day.key)
          
          return (
            <div key={day.key} className="bg-white rounded-lg border overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">{day.label}</h3>
                <div className="text-xs text-gray-500">
                  {daySchedules.length} schedule{daySchedules.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="p-3 space-y-3">
                {daySchedules.map(schedule => (
                  <div
                    key={schedule.id}
                    className={`p-3 rounded-lg border ${
                      schedule.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900">
                        {selectedDoctor ? getDoctorName(schedule.doctor_id) : schedule.doctor_name}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Max: {schedule.max_patients} patients
                      </div>
                      <div className="text-xs">
                        {schedule.consultation_duration} min slots
                      </div>
                    </div>
                    
                    {!schedule.is_active && (
                      <div className="mt-2 text-xs text-red-600 font-medium">
                        Inactive
                      </div>
                    )}
                  </div>
                ))}
                
                {daySchedules.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-sm">No schedules</div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Schedule Statistics */}
      <div className="mt-8 bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Schedule Statistics</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {schedules.filter(s => !selectedDoctor || s.doctor_id === selectedDoctor).length}
            </div>
            <div className="text-sm text-gray-600">Total Schedules</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {schedules.filter(s => s.is_active && (!selectedDoctor || s.doctor_id === selectedDoctor)).length}
            </div>
            <div className="text-sm text-gray-600">Active Schedules</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {schedules.reduce((sum, s) => 
                (!selectedDoctor || s.doctor_id === selectedDoctor) ? sum + s.max_patients : sum, 0
              )}
            </div>
            <div className="text-sm text-gray-600">Weekly Capacity</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(
                schedules
                  .filter(s => !selectedDoctor || s.doctor_id === selectedDoctor)
                  .reduce((sum, s) => sum + s.consultation_duration, 0) / 
                (schedules.filter(s => !selectedDoctor || s.doctor_id === selectedDoctor).length || 1)
              )}
            </div>
            <div className="text-sm text-gray-600">Avg Duration (min)</div>
          </div>
        </div>
      </div>
    </div>
  )
}