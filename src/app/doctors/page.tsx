'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { 
  Stethoscope, 
  Calendar, 
  Users, 
  TrendingUp,
  Search,
  Filter,
  Star,
  Clock,
  MapPin,
  Phone,
  Mail
} from 'lucide-react'

interface Doctor {
  id: string
  name: string
  first_name?: string
  last_name?: string
  specialization?: string
  department?: string
  charges?: number
  surgery_charges?: number
  qualification?: string
  experience?: number
  phone?: string
  email?: string
  schedule?: any
  status: 'active' | 'inactive' | 'on_leave'
}

interface DoctorStats {
  total_patients: number
  total_surgeries: number
  monthly_revenue: number
  avg_rating: number
}

export default function DoctorsPage() {
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [doctorStats, setDoctorStats] = useState<{ [doctorId: string]: DoctorStats }>({})
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departments, setDepartments] = useState<string[]>([])

  // Schedule state
  const [showSchedule, setShowSchedule] = useState(false)
  const [doctorSchedule, setDoctorSchedule] = useState<any[]>([])

  useEffect(() => {
    loadDoctorsData()
  }, [])

  async function loadDoctorsData() {
    setLoading(true)
    try {
      // Load doctors
      const { data: doctorsData, error: doctorsError } = await supabase
        .from('doctors')
        .select('*')
        .order('name')

      if (doctorsError) throw doctorsError

      const formattedDoctors = (doctorsData || []).map((doc: any) => ({
        ...doc,
        name: doc.name || `${doc.first_name || ''} ${doc.last_name || ''}`.trim(),
        status: doc.status || 'active'
      }))

      setDoctors(formattedDoctors)

      // Get unique departments
      const uniqueDepts = Array.from(new Set(doctorsData?.map((doc: any) => doc.department).filter(Boolean)))
      setDepartments(uniqueDepts)

      // Load stats for each doctor
      await loadDoctorStats(formattedDoctors)

    } catch (error) {
      console.error('Error loading doctors:', error)
    }
    setLoading(false)
  }

  async function loadDoctorStats(doctorsData: Doctor[]) {
    const statsPromises = doctorsData.map(async (doctor: Doctor) => {
      try {
        // Get patient count (from OPD/IPD visits)
        const { count: patientCount } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('doctor_id', doctor.id)

        // Get surgery count
        const { count: surgeryCount } = await supabase
          .from('surgeries')
          .select('*', { count: 'exact', head: true })
          .eq('surgeon_id', doctor.id)

        // Get revenue (from billings)
        const thisMonth = new Date().toISOString().slice(0, 7)
        const { data: billingData } = await supabase
          .from('billings_full')
          .select('total_amount')
          .eq('doctor_id', doctor.id)
          .gte('created_at', `${thisMonth}-01T00:00:00`)

        const monthlyRevenue = billingData?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0

        return {
          doctorId: doctor.id,
          stats: {
            total_patients: patientCount || 0,
            total_surgeries: surgeryCount || 0,
            monthly_revenue: monthlyRevenue,
            avg_rating: 4.5 // Would come from patient feedback system
          }
        }
      } catch (error) {
        console.error(`Error loading stats for doctor ${doctor.id}:`, error)
        return {
          doctorId: doctor.id,
          stats: {
            total_patients: 0,
            total_surgeries: 0,
            monthly_revenue: 0,
            avg_rating: 0
          }
        }
      }
    })

    const results = await Promise.all(statsPromises)
    const statsMap = results.reduce((acc, { doctorId, stats }) => {
      acc[doctorId] = stats
      return acc
    }, {} as { [doctorId: string]: DoctorStats })

    setDoctorStats(statsMap)
  }

  async function loadDoctorSchedule(doctorId: string) {
    try {
      // This would typically come from an appointments/schedule table
      // For now, we'll simulate schedule data
      const schedule = [
        { day: 'Monday', time: '09:00-12:00', type: 'OPD' },
        { day: 'Tuesday', time: '14:00-17:00', type: 'Surgery' },
        { day: 'Wednesday', time: '09:00-12:00', type: 'OPD' },
        { day: 'Thursday', time: '09:00-12:00', type: 'OPD' },
        { day: 'Friday', time: '14:00-17:00', type: 'Surgery' },
        { day: 'Saturday', time: '09:00-11:00', type: 'OPD' }
      ]
      
      setDoctorSchedule(schedule)
      setShowSchedule(true)
    } catch (error) {
      console.error('Error loading doctor schedule:', error)
    }
  }

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = !searchTerm || 
      doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.qualification?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDepartment = !departmentFilter || doctor.department === departmentFilter
    const matchesStatus = !statusFilter || doctor.status === statusFilter

    return matchesSearch && matchesDepartment && matchesStatus
  })

  const totalDoctors = doctors.length
  const activeDoctors = doctors.filter(doc => doc.status === 'active').length
  const specialistDoctors = doctors.filter(doc => doc.specialization && doc.specialization !== 'General Practice').length
  const totalRevenue = Object.values(doctorStats).reduce((sum, stats) => sum + stats.monthly_revenue, 0)

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
          <Stethoscope className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Management</h1>
          <p className="text-sm text-gray-500">Doctor directory, schedules & performance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Doctors" 
          value={loading ? '...' : totalDoctors.toString()} 
          icon={Stethoscope} 
          color="blue" 
        />
        <StatCard 
          title="Active Doctors" 
          value={loading ? '...' : activeDoctors.toString()} 
          icon={Users} 
          color="green" 
        />
        <StatCard 
          title="Specialists" 
          value={loading ? '...' : specialistDoctors.toString()} 
          icon={Star} 
          color="purple" 
        />
        <StatCard 
          title="Monthly Revenue" 
          value={loading ? '...' : formatCurrency(totalRevenue)} 
          icon={TrendingUp} 
          color="orange" 
        />
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              placeholder="Search doctors..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e: any) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map((dept: any) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredDoctors.map((doctor: Doctor) => {
          const stats = doctorStats[doctor.id] || {
            total_patients: 0,
            total_surgeries: 0,
            monthly_revenue: 0,
            avg_rating: 0
          }

          return (
            <div key={doctor.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Stethoscope className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Dr. {doctor.name}</h3>
                      <p className="text-sm text-gray-500">{doctor.specialization || 'General Practice'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doctor.status === 'active' ? 'bg-green-100 text-green-800' :
                    doctor.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {doctor.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Department:</span>
                    <span className="font-medium">{doctor.department || '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Consultation:</span>
                    <span className="font-medium">{formatCurrency(doctor.charges || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Surgery Fee:</span>
                    <span className="font-medium">{formatCurrency(doctor.surgery_charges || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Experience:</span>
                    <span className="font-medium">{doctor.experience ? `${doctor.experience} years` : '—'}</span>
                  </div>
                </div>

                {/* Doctor Statistics */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-blue-600">{stats.total_patients}</p>
                    <p className="text-xs text-gray-500">Patients</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-purple-600">{stats.total_surgeries}</p>
                    <p className="text-xs text-gray-500">Surgeries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(stats.monthly_revenue)}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                  <div className="text-center flex items-center justify-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <p className="text-sm font-semibold">{stats.avg_rating.toFixed(1)}</p>
                  </div>
                </div>

                {/* Contact Information */}
                {(doctor.phone || doctor.email) && (
                  <div className="space-y-2 mb-4">
                    {doctor.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{doctor.phone}</span>
                      </div>
                    )}
                    {doctor.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{doctor.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => loadDoctorSchedule(doctor.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule
                  </button>
                  <button
                    onClick={() => setSelectedDoctor(doctor)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Doctor Table */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Complete Doctor Directory</h3>
        </div>
        
        <DataTable
          data={filteredDoctors}
          columns={[
            { 
              key: 'name', 
              label: 'Doctor',
              render: (doctor: any) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Dr. {doctor.name}</p>
                    <p className="text-sm text-gray-500">{doctor.qualification}</p>
                  </div>
                </div>
              )
            },
            { 
              key: 'specialization', 
              label: 'Specialization',
              render: (doctor: any) => (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {doctor.specialization || 'General Practice'}
                </span>
              )
            },
            { key: 'department', label: 'Department' },
            { 
              key: 'charges', 
              label: 'Consultation Fee',
              render: (doctor: any) => formatCurrency(doctor.charges || 0)
            },
            { 
              key: 'surgery_charges', 
              label: 'Surgery Fee',
              render: (doctor: any) => formatCurrency(doctor.surgery_charges || 0)
            },
            { 
              key: 'patients',
              label: 'Patients',
              render: (doctor: any) => {
                const stats = doctorStats[doctor.id]
                return stats ? stats.total_patients.toString() : '—'
              }
            },
            { 
              key: 'revenue',
              label: 'Monthly Revenue',
              render: (doctor: any) => {
                const stats = doctorStats[doctor.id]
                return stats ? formatCurrency(stats.monthly_revenue) : '—'
              }
            },
            { 
              key: 'status', 
              label: 'Status',
              render: (doctor: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  doctor.status === 'active' ? 'bg-green-100 text-green-800' :
                  doctor.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {doctor.status.replace('_', ' ').toUpperCase()}
                </span>
              )
            },
          ]}
          loading={loading}
          searchPlaceholder="Search doctors..."
        />
      </div>

      {/* Doctor Profile Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Doctor Profile</h2>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Stethoscope className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Dr. {selectedDoctor.name}</h3>
                  <p className="text-gray-600">{selectedDoctor.specialization}</p>
                  <p className="text-sm text-gray-500">{selectedDoctor.qualification}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Professional Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Department:</span>
                      <span>{selectedDoctor.department || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Experience:</span>
                      <span>{selectedDoctor.experience ? `${selectedDoctor.experience} years` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Consultation Fee:</span>
                      <span>{formatCurrency(selectedDoctor.charges || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Surgery Fee:</span>
                      <span>{formatCurrency(selectedDoctor.surgery_charges || 0)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Performance Metrics</h4>
                  <div className="space-y-2">
                    {doctorStats[selectedDoctor.id] && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Patients:</span>
                          <span>{doctorStats[selectedDoctor.id].total_patients}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Surgeries:</span>
                          <span>{doctorStats[selectedDoctor.id].total_surgeries}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Monthly Revenue:</span>
                          <span>{formatCurrency(doctorStats[selectedDoctor.id].monthly_revenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Rating:</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span>{doctorStats[selectedDoctor.id].avg_rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-2">
                  {selectedDoctor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{selectedDoctor.phone}</span>
                    </div>
                  )}
                  {selectedDoctor.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span>{selectedDoctor.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Doctor Schedule</h2>
                <button
                  onClick={() => setShowSchedule(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {doctorSchedule.map((slot: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{slot.day}</p>
                      <p className="text-sm text-gray-500">{slot.time}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      slot.type === 'OPD' ? 'bg-blue-100 text-blue-800' :
                      slot.type === 'Surgery' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {slot.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}