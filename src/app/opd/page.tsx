'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Calendar, Clock, Users, Stethoscope, TrendingUp, 
  UserPlus, CheckCircle, AlertCircle, PlayCircle,
  Phone, User, Eye, ArrowRight, Activity, Plus,
  ClipboardList, Filter
} from 'lucide-react'
import { getOPDStats, getNextPatient } from '@/lib/opd-engine'
import { useDoctors } from '@/hooks/useSupabase'

export default function OPDDashboard() {
  const { data: doctors, loading: doctorsLoading } = useDoctors()
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [stats, setStats] = useState({
    totalAppointments: 0,
    scheduledAppointments: 0,
    inProgressAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    newPatients: 0,
    followUpPatients: 0,
    emergencyAppointments: 0
  })
  const [doctorStats, setDoctorStats] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [nextPatients, setNextPatients] = useState<any>({})

  useEffect(() => {
    loadOPDData()
  }, [selectedDate])

  useEffect(() => {
    if (doctors && doctors.length > 0) {
      loadNextPatients()
    }
  }, [doctors, selectedDate])

  const loadOPDData = async () => {
    setLoading(true)
    try {
      const result = await getOPDStats(selectedDate)
      if (result.success) {
        setStats(result.stats || {
          totalAppointments: 0,
          scheduledAppointments: 0,
          inProgressAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          newPatients: 0,
          followUpPatients: 0,
          emergencyAppointments: 0
        })
        setDoctorStats(result.doctorStats)
        setAppointments(result.appointments)
      }
    } catch (error) {
      console.error('Error loading OPD data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNextPatients = async () => {
    if (!doctors) return
    
    const nextPatientsData: { [key: number]: any } = {}
    for (const doctor of doctors.slice(0, 5)) { // Load for first 5 doctors
      try {
        const result = await getNextPatient(doctor.id, selectedDate)
        if (result.success && result.nextPatient) {
          nextPatientsData[doctor.id] = result.nextPatient
        }
      } catch (error) {
        console.error(`Error loading next patient for doctor ${doctor.id}:`, error)
      }
    }
    setNextPatients(nextPatientsData)
  }

  const filteredAppointments = selectedDoctor 
    ? appointments.filter(apt => apt.doctor_id == selectedDoctor)
    : appointments

  const quickActions = [
    {
      title: 'Book Appointment',
      description: 'Schedule new patient appointment',
      href: '/opd/booking',
      icon: Calendar,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      title: 'Walk-in Registration',
      description: 'Register walk-in patient',
      href: '/patients/new',
      icon: UserPlus,
      color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      title: 'View Queues',
      description: 'Doctor-wise appointment queues',
      href: '/opd/queue',
      icon: ClipboardList,
      color: 'bg-orange-50 text-orange-700 border-orange-200'
    },
    {
      title: 'Consultation',
      description: 'Start patient consultation',
      href: '/opd/consultation',
      icon: Stethoscope,
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    }
  ]

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'In Progress': return 'bg-blue-100 text-blue-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      case 'Waiting': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A'
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && doctorsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading OPD dashboard...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-50 rounded-lg text-green-600">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OPD Dashboard</h1>
            <p className="text-sm text-gray-500">Outpatient department management and scheduling</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <Link
            href="/opd/booking"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Calendar className="w-4 h-4" />
            Book Appointment
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Appointments</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalAppointments}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : 'Selected date'}
              </div>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Completed</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.completedAppointments}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.totalAppointments > 0 ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) : 0}% completion rate
              </div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">In Progress</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.inProgressAppointments}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Currently consulting
              </div>
            </div>
            <PlayCircle className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">New Patients</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.newPatients}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                First-time visits
              </div>
            </div>
            <UserPlus className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`block p-4 rounded-lg border-2 transition-colors hover:bg-opacity-80 ${action.color}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-6 h-6" />
                <div>
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm opacity-80">{action.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Doctor-wise Stats */}
      {doctorStats.length > 0 && (
        <div className="bg-white rounded-lg border mb-8">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Doctor-wise Appointments
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctorStats.map((doctorStat, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {doctorStat.doctor?.doctor_name || 'Unknown Doctor'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {doctorStat.total} appointments
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-50 rounded p-2">
                      <div className="text-lg font-bold text-green-900">{doctorStat.completed}</div>
                      <div className="text-xs text-green-700">Completed</div>
                    </div>
                    <div className="bg-yellow-50 rounded p-2">
                      <div className="text-lg font-bold text-yellow-900">{doctorStat.pending}</div>
                      <div className="text-xs text-yellow-700">Pending</div>
                    </div>
                    <div className="bg-red-50 rounded p-2">
                      <div className="text-lg font-bold text-red-900">{doctorStat.cancelled}</div>
                      <div className="text-xs text-red-700">Cancelled</div>
                    </div>
                  </div>

                  {/* Next Patient */}
                  {nextPatients[doctorStat.doctor?.id] && (
                    <div className="mt-3 p-2 bg-blue-50 rounded">
                      <div className="text-xs text-blue-700 font-medium">Next Patient:</div>
                      <div className="text-sm text-blue-900">
                        {nextPatients[doctorStat.doctor.id].patients?.full_name}
                      </div>
                      <div className="text-xs text-blue-600">
                        Token: {nextPatients[doctorStat.doctor.id].token_number}
                      </div>
                    </div>
                  )}

                  <div className="mt-3">
                    <Link
                      href={`/opd/queue?doctor=${doctorStat.doctor?.id}&date=${selectedDate}`}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      View Queue
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Recent Appointments ({filteredAppointments.length})
              </h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="text-sm border-0 bg-transparent focus:ring-0"
                >
                  <option value="">All Doctors</option>
                  {doctors?.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.doctor_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredAppointments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredAppointments.slice(0, 10).map((appointment) => (
                  <div key={appointment.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                          {appointment.token_number}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {appointment.patients?.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.doctors?.doctor_name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(appointment.time)}</span>
                            <span>•</span>
                            <span>{appointment.appointment_type}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getAppointmentStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        {appointment.patients?.phone && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {appointment.patients.phone.slice(-4)}
                          </div>
                        )}
                        <Link
                          href={`/patients/${appointment.patient_id}`}
                          className="text-blue-600 hover:text-blue-800 mt-1 inline-block"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>

                    {appointment.complaint && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Complaint:</span> {appointment.complaint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div>No appointments found</div>
                <div className="text-sm mt-1">
                  {selectedDoctor ? 'for selected doctor' : 'for selected date'}
                </div>
              </div>
            )}
          </div>

          {filteredAppointments.length > 10 && (
            <div className="px-6 py-3 border-t bg-gray-50">
              <Link
                href={`/opd/queue?date=${selectedDate}`}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center gap-1"
              >
                View All Appointments
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Quick Stats & Emergency */}
        <div className="space-y-6">
          {/* Emergency Appointments */}
          {stats.emergencyAppointments > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h3 className="font-semibold text-red-900">Emergency Appointments</h3>
              </div>
              
              <div className="text-3xl font-bold text-red-900 mb-2">
                {stats.emergencyAppointments}
              </div>
              <p className="text-sm text-red-700">Require immediate attention</p>
              
              <Link
                href={`/opd/queue?priority=Emergency&date=${selectedDate}`}
                className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                View Emergency Queue
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Additional Stats */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Today's Summary
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New Patients:</span>
                <span className="font-medium text-gray-900">{stats.newPatients}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Follow-up Visits:</span>
                <span className="font-medium text-gray-900">{stats.followUpPatients}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cancelled:</span>
                <span className="font-medium text-gray-900">{stats.cancelledAppointments}</span>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-600">Completion Rate:</span>
                <span className="font-medium text-gray-900">
                  {stats.totalAppointments > 0 ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Active Doctors */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Active Doctors
            </h3>
            
            <div className="space-y-3">
              {doctorStats.filter(ds => ds.total > 0).slice(0, 5).map((doctorStat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <Stethoscope className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-900">
                      {doctorStat.doctor?.doctor_name || 'Unknown'}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {doctorStat.completed}/{doctorStat.total}
                  </div>
                </div>
              ))}
              
              {doctorStats.filter(ds => ds.total > 0).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">
                  No active consultations today
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}