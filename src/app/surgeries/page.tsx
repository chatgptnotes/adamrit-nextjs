'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import {
  getSurgeries,
  getOTSchedule,
  scheduleSurgery,
  getSurgeryDetails,
  getSurgeryStats,
  updateSurgeryStatus,
  getAvailableOTSlots,
  getUpcomingSurgeries,
  Surgery
} from '@/lib/surgery-engine'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import {
  Stethoscope,
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  Filter,
  MapPin,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

export default function SurgeriesPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({})
  const [surgeries, setSurgeries] = useState<Surgery[]>([])
  const [todaySchedule, setTodaySchedule] = useState<any>(null)
  const [upcomingSurgeries, setUpcomingSurgeries] = useState<Surgery[]>([])
  
  // Filters
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    surgeon_id: '',
    status: '',
    type: ''
  })

  // New surgery modal
  const [showNewSurgery, setShowNewSurgery] = useState(false)
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  
  // Surgery form
  const [surgeryForm, setSurgeryForm] = useState({
    patient_id: '',
    surgeon_id: '',
    anesthetist_id: '',
    procedure_name: '',
    surgery_type: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '',
    duration: 60,
    ot_number: '',
    priority: 'elective' as 'elective' | 'emergency' | 'urgent',
    pre_op_notes: ''
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadSurgeriesData()
  }, [filters])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [statsData, todayData, upcomingData] = await Promise.all([
        getSurgeryStats(),
        getOTSchedule(new Date().toISOString().split('T')[0]),
        getUpcomingSurgeries()
      ])

      setStats(statsData)
      setTodaySchedule(todayData)
      setUpcomingSurgeries(upcomingData)

      // Load patients and doctors for new surgery form
      const [patientsData, doctorsData] = await Promise.all([
        supabase.from('patients').select('id, name, uhid, phone').order('name').limit(100),
        supabase.from('doctors').select('id, name, specialization, department').order('name')
      ])

      setPatients(patientsData.data || [])
      setDoctors(doctorsData.data || [])

    } catch (error) {
      console.error('Error loading surgeries data:', error)
    }
    setLoading(false)
  }

  async function loadSurgeriesData() {
    try {
      const surgeriesData = await getSurgeries(filters)
      setSurgeries(surgeriesData)
    } catch (error) {
      console.error('Error loading surgeries:', error)
    }
  }

  async function handleScheduleSurgery() {
    try {
      await scheduleSurgery(surgeryForm)
      
      // Reset form
      setSurgeryForm({
        patient_id: '',
        surgeon_id: '',
        anesthetist_id: '',
        procedure_name: '',
        surgery_type: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: '',
        duration: 60,
        ot_number: '',
        priority: 'elective',
        pre_op_notes: ''
      })
      setShowNewSurgery(false)

      // Refresh data
      await loadInitialData()
      await loadSurgeriesData()

      alert('Surgery scheduled successfully!')
    } catch (error) {
      console.error('Error scheduling surgery:', error)
      alert('Error scheduling surgery. Please try again.')
    }
  }

  async function handleStatusUpdate(surgeryId: string, newStatus: Surgery['status']) {
    try {
      await updateSurgeryStatus(surgeryId, newStatus)
      await loadInitialData()
      await loadSurgeriesData()
    } catch (error) {
      console.error('Error updating surgery status:', error)
    }
  }

  async function loadAvailableSlots(date: string) {
    try {
      const slots = await getAvailableOTSlots(date)
      setAvailableSlots(slots)
    } catch (error) {
      console.error('Error loading available slots:', error)
    }
  }

  useEffect(() => {
    if (surgeryForm.scheduled_date) {
      loadAvailableSlots(surgeryForm.scheduled_date)
    }
  }, [surgeryForm.scheduled_date])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OT & Surgery Management</h1>
            <p className="text-sm text-gray-500">Operating theater schedule & surgery tracking</p>
          </div>
        </div>

        <button
          onClick={() => setShowNewSurgery(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
        >
          <Plus className="w-4 h-4" />
          Schedule Surgery
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Today's Surgeries" 
          value={loading ? '...' : (stats.todaySurgeries || 0).toString()} 
          icon={Calendar} 
          color="purple" 
        />
        <StatCard 
          title="This Week" 
          value={loading ? '...' : (stats.weekSurgeries || 0).toString()} 
          icon={Clock} 
          color="blue" 
        />
        <StatCard 
          title="Emergency Cases" 
          value={loading ? '...' : (stats.emergencyCount || 0).toString()} 
          icon={AlertTriangle} 
          color="red" 
        />
        <StatCard 
          title="Elective Cases" 
          value={loading ? '...' : (stats.electiveCount || 0).toString()} 
          icon={CheckCircle} 
          color="green" 
        />
      </div>

      {/* Today's OT Schedule */}
      <div className="mb-6 bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Today's OT Schedule ({todaySchedule?.surgeries?.length || 0} surgeries)
          </h3>
        </div>

        <div className="p-4">
          {todaySchedule?.surgeries?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(todaySchedule.ot_utilization || {}).map(([ot, utilization]: [string, any]) => {
                const otSurgeries = todaySchedule.surgeries.filter((s: any) => s.ot_number === ot)
                return (
                  <div key={ot} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900">{ot}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        utilization.utilization_percent >= 90 ? 'bg-red-100 text-red-800' :
                        utilization.utilization_percent >= 70 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {utilization.utilization_percent}% utilized
                      </span>
                    </div>

                    <div className="space-y-2">
                      {otSurgeries.map((surgery: any) => (
                        <div key={surgery.id} className={`p-3 rounded border-l-4 ${
                          surgery.status === 'completed' ? 'border-green-400 bg-green-50' :
                          surgery.status === 'in_progress' ? 'border-blue-400 bg-blue-50' :
                          surgery.status === 'scheduled' ? 'border-yellow-400 bg-yellow-50' :
                          'border-gray-400 bg-gray-50'
                        }`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{surgery.patient_name}</p>
                              <p className="text-xs text-gray-600">{surgery.procedure_name}</p>
                              <p className="text-xs text-gray-500">Dr. {surgery.surgeon_name}</p>
                              <p className="text-xs text-gray-500">
                                {surgery.scheduled_time} ({surgery.duration || 60} min)
                              </p>
                            </div>
                            {surgery.priority === 'emergency' && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>

                          <div className="flex gap-1 mt-2">
                            {surgery.status === 'scheduled' && (
                              <button
                                onClick={() => handleStatusUpdate(surgery.id, 'in_progress')}
                                className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                              >
                                Start
                              </button>
                            )}
                            {surgery.status === 'in_progress' && (
                              <button
                                onClick={() => handleStatusUpdate(surgery.id, 'completed')}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                              >
                                Complete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Available: {(utilization.total_hours - utilization.booked_hours).toFixed(1)}h
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No surgeries scheduled for today
            </div>
          )}
        </div>
      </div>

      {/* All Surgeries */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e: any) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Surgeon</label>
              <select
                value={filters.surgeon_id}
                onChange={(e: any) => setFilters(prev => ({ ...prev, surgeon_id: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Surgeons</option>
                {doctors.filter((doc: any) => doc.specialization?.includes('Surg')).map((doctor: any) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e: any) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="postponed">Postponed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e: any) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">All Types</option>
                <option value="Orthopedic">Orthopedic</option>
                <option value="General">General Surgery</option>
                <option value="Cardiac">Cardiac</option>
                <option value="Neurosurgery">Neurosurgery</option>
                <option value="ENT">ENT</option>
                <option value="Ophthalmology">Ophthalmology</option>
              </select>
            </div>
          </div>
        </div>

        <DataTable
          data={surgeries}
          columns={[
            { 
              key: 'patient_name', 
              label: 'Patient',
              render: (surgery: any) => (
                <div>
                  <p className="font-medium text-gray-900">{surgery.patient_name}</p>
                  <p className="text-sm text-gray-500">UHID: {surgery.uhid}</p>
                </div>
              )
            },
            { 
              key: 'procedure_name', 
              label: 'Procedure',
              render: (surgery: any) => (
                <div>
                  <p className="font-medium text-gray-900">{surgery.procedure_name}</p>
                  <p className="text-sm text-gray-500">{surgery.surgery_type}</p>
                </div>
              )
            },
            { 
              key: 'surgeon_name', 
              label: 'Surgeon',
              render: (surgery: any) => (
                <div>
                  <p className="font-medium text-gray-900">Dr. {surgery.surgeon_name}</p>
                  <p className="text-sm text-gray-500">Dr. {surgery.anesthetist_name}</p>
                </div>
              )
            },
            { 
              key: 'scheduled_date', 
              label: 'Schedule',
              render: (surgery: any) => (
                <div>
                  <p className="text-sm">{new Date(surgery.scheduled_date).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-500">{surgery.scheduled_time || 'Time TBD'}</p>
                </div>
              )
            },
            { 
              key: 'ot_number', 
              label: 'OT',
              render: (surgery: any) => (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                  {surgery.ot_number || 'TBD'}
                </span>
              )
            },
            { 
              key: 'priority', 
              label: 'Priority',
              render: (surgery: any) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  surgery.priority === 'emergency' ? 'bg-red-100 text-red-800' :
                  surgery.priority === 'urgent' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {surgery.priority.toUpperCase()}
                </span>
              )
            },
            { 
              key: 'status', 
              label: 'Status',
              render: (surgery: any) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  surgery.status === 'completed' ? 'bg-green-100 text-green-800' :
                  surgery.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  surgery.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                  surgery.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {surgery.status.replace('_', ' ').toUpperCase()}
                </span>
              )
            },
            { 
              key: 'duration', 
              label: 'Duration',
              render: (surgery: any) => `${surgery.duration || 60} min`
            },
          ]}
          loading={loading}
          searchPlaceholder="Search surgeries..."
        />
      </div>

      {/* Upcoming Surgeries Sidebar */}
      {upcomingSurgeries.length > 0 && (
        <div className="fixed right-4 top-20 w-80 bg-white rounded-lg border shadow-lg p-4 max-h-96 overflow-y-auto">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Upcoming Surgeries
          </h4>
          
          <div className="space-y-3">
            {upcomingSurgeries.slice(0, 5).map((surgery: any) => (
              <div key={surgery.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{surgery.patient_name}</p>
                    <p className="text-xs text-gray-600">{surgery.procedure_name}</p>
                  </div>
                  {surgery.priority === 'emergency' && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(surgery.scheduled_date).toLocaleDateString()} at {surgery.scheduled_time}
                </p>
                <p className="text-xs text-gray-500">Dr. {surgery.surgeon_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Surgery Modal */}
      {showNewSurgery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Schedule New Surgery</h2>
                <button
                  onClick={() => setShowNewSurgery(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                  <select
                    value={surgeryForm.patient_id}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, patient_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select Patient</option>
                    {patients.map((patient: any) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} - {patient.uhid}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Surgeon Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surgeon</label>
                  <select
                    value={surgeryForm.surgeon_id}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, surgeon_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select Surgeon</option>
                    {doctors.map((doctor: any) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.name} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Anesthetist Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Anesthetist</label>
                  <select
                    value={surgeryForm.anesthetist_id}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, anesthetist_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select Anesthetist</option>
                    {doctors.filter((doc: any) => doc.specialization?.includes('Anesth')).map((doctor: any) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Procedure Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Procedure Name</label>
                  <input
                    type="text"
                    value={surgeryForm.procedure_name}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, procedure_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter procedure name"
                  />
                </div>

                {/* Surgery Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surgery Type</label>
                  <select
                    value={surgeryForm.surgery_type}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, surgery_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select Type</option>
                    <option value="Orthopedic">Orthopedic</option>
                    <option value="General">General Surgery</option>
                    <option value="Cardiac">Cardiac</option>
                    <option value="Neurosurgery">Neurosurgery</option>
                    <option value="ENT">ENT</option>
                    <option value="Ophthalmology">Ophthalmology</option>
                  </select>
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Date</label>
                  <input
                    type="date"
                    value={surgeryForm.scheduled_date}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Scheduled Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scheduled Time</label>
                  <input
                    type="time"
                    value={surgeryForm.scheduled_time}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={surgeryForm.duration}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    min="15"
                    step="15"
                  />
                </div>

                {/* OT Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Operating Theater</label>
                  <select
                    value={surgeryForm.ot_number}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, ot_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select OT</option>
                    {availableSlots.map((slot: any) => (
                      <option key={slot.ot_number} value={slot.ot_number}>
                        {slot.ot_number} - {slot.available_hours.toFixed(1)}h available ({slot.utilization_percent}% used)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={surgeryForm.priority}
                    onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="elective">Elective</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {/* Pre-op Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pre-operative Notes</label>
                <textarea
                  value={surgeryForm.pre_op_notes}
                  onChange={(e: any) => setSurgeryForm(prev => ({ ...prev, pre_op_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter pre-operative notes, special instructions, etc."
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-4">
              <button
                onClick={() => setShowNewSurgery(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSurgery}
                disabled={!surgeryForm.patient_id || !surgeryForm.surgeon_id || !surgeryForm.procedure_name}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300"
              >
                Schedule Surgery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}