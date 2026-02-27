'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Hospital, Bed, Users, Clock, TrendingUp, AlertCircle,
  Calendar, ArrowRight, Eye, Activity, MapPin, Phone,
  User, Stethoscope, LogOut, Plus, Filter
} from 'lucide-react'
import { 
  getActiveIPDPatients, 
  getWardOccupancy, 
  getTodayStats, 
  getCriticalPatients 
} from '@/lib/ipd-engine'

export default function IPDDashboard() {
  const [loading, setLoading] = useState(true)
  const [activePatients, setActivePatients] = useState<any[]>([])
  const [wardOccupancy, setWardOccupancy] = useState<any[]>([])
  const [todayStats, setTodayStats] = useState<{
    admissions: any[]
    discharges: any[]
    admissionCount: number
    dischargeCount: number
  }>({
    admissions: [],
    discharges: [],
    admissionCount: 0,
    dischargeCount: 0
  })
  const [criticalPatients, setCriticalPatients] = useState<any[]>([])
  const [selectedWard, setSelectedWard] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [
        activePatientsResult,
        wardOccupancyResult,
        todayStatsResult,
        criticalPatientsResult
      ] = await Promise.all([
        getActiveIPDPatients(),
        getWardOccupancy(),
        getTodayStats(),
        getCriticalPatients()
      ])

      if (activePatientsResult.success) {
        setActivePatients(activePatientsResult.patients)
      }

      if (wardOccupancyResult.success) {
        setWardOccupancy(wardOccupancyResult.wards)
      }

      if (todayStatsResult.success) {
        setTodayStats(todayStatsResult.todayStats)
      }

      if (criticalPatientsResult.success) {
        setCriticalPatients(criticalPatientsResult.criticalPatients)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPatients = selectedWard 
    ? activePatients.filter(patient => patient.ward_id == selectedWard)
    : activePatients

  const totalBeds = wardOccupancy.reduce((total, ward) => total + ward.totalBeds, 0)
  const occupiedBeds = wardOccupancy.reduce((total, ward) => total + ward.occupiedBeds, 0)
  const availableBeds = totalBeds - occupiedBeds
  const overallOccupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  const getBedStatusColor = (bed: any) => {
    if (bed.isOccupied) {
      return 'bg-red-500 text-white'
    }
    return 'bg-green-500 text-white'
  }

  const getCriticalLevelColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-50 text-red-700 border-red-200'
      case 'Medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default: return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const quickActions = [
    {
      title: 'New Admission',
      description: 'Admit a patient to IPD',
      href: '/ipd/admit',
      icon: Plus,
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      title: 'Bed Management',
      description: 'View and manage bed allocations',
      href: '/ipd/beds',
      icon: Bed,
      color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      title: 'Ward Transfer',
      description: 'Transfer patients between wards',
      href: '/ipd/transfer',
      icon: ArrowRight,
      color: 'bg-orange-50 text-orange-700 border-orange-200'
    },
    {
      title: 'Ward Dashboard',
      description: 'Detailed ward-wise view',
      href: '/ipd/ward-dashboard',
      icon: Hospital,
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading IPD dashboard...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <Hospital className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IPD Dashboard</h1>
            <p className="text-sm text-gray-500">Inpatient department management and monitoring</p>
          </div>
        </div>
        
        <Link
          href="/ipd/admit"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Admission
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Active IPD Patients</div>
              <div className="text-2xl font-bold text-gray-900">
                {activePatients.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Currently admitted
              </div>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Bed Occupancy</div>
              <div className="text-2xl font-bold text-gray-900">
                {overallOccupancy}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {occupiedBeds} of {totalBeds} beds
              </div>
            </div>
            <Bed className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full" 
              style={{ width: `${overallOccupancy}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Today Admissions</div>
              <div className="text-2xl font-bold text-gray-900">
                {todayStats.admissionCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                New admissions today
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Today Discharges</div>
              <div className="text-2xl font-bold text-gray-900">
                {todayStats.dischargeCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Discharged today
              </div>
            </div>
            <LogOut className="w-8 h-8 text-orange-600" />
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

      {/* Ward Occupancy Overview */}
      <div className="bg-white rounded-lg border mb-8">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bed className="w-5 h-5" />
            Ward Occupancy Overview
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {wardOccupancy.map((ward) => (
              <div key={ward.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{ward.name}</h4>
                    <p className="text-sm text-gray-500">Floor {ward.floor}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {ward.occupancyRate}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {ward.occupiedBeds}/{ward.totalBeds} beds
                    </div>
                  </div>
                </div>

                <div className="mb-3 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      ward.occupancyRate >= 90 ? 'bg-red-500' :
                      ward.occupancyRate >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${ward.occupancyRate}%` }}
                  ></div>
                </div>

                {/* Bed Grid Preview */}
                <div className="grid grid-cols-6 gap-1 mb-3">
                  {ward.rooms?.slice(0, 3).map((room: any) => 
                    room.beds?.slice(0, 6).map((bed: any) => (
                      <div
                        key={bed.id}
                        className={`w-6 h-6 rounded text-xs flex items-center justify-center ${getBedStatusColor(bed)}`}
                        title={`Bed ${bed.bed_number} - ${bed.isOccupied ? 'Occupied' : 'Available'}`}
                      >
                        {bed.bed_number}
                      </div>
                    ))
                  )}
                </div>

                <Link
                  href={`/ipd/ward-dashboard?ward=${ward.id}`}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                >
                  View Ward Details
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>

          {wardOccupancy.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Bed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <div>No ward data available</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current IPD Patients */}
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Currently Admitted ({filteredPatients.length})
              </h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="text-sm border-0 bg-transparent focus:ring-0"
                >
                  <option value="">All Wards</option>
                  {wardOccupancy.map((ward: any) => (
                    <option key={ward.id} value={ward.id}>{ward.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {filteredPatients.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredPatients.slice(0, 10).map((patient) => (
                  <div key={patient.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {patient.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {patient.uhid || patient.patient_id} • {patient.age}y {patient.sex}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{patient.wards?.name} - Bed {patient.beds?.bed_number}</span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>{patient.daysAdmitted} days</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {patient.doctors?.doctor_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Admitted: {formatDate(patient.admission_date)}
                        </div>
                        <Link
                          href={`/patients/${patient.id}`}
                          className="text-blue-600 hover:text-blue-800 mt-1 inline-block"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div>No patients currently admitted</div>
                {selectedWard && <div className="text-sm mt-1">in selected ward</div>}
              </div>
            )}
          </div>

          {filteredPatients.length > 10 && (
            <div className="px-6 py-3 border-t bg-gray-50">
              <Link
                href="/patients"
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center justify-center gap-1"
              >
                View All Patients
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Critical Patients & Today Activity */}
        <div className="space-y-6">
          {/* Critical Patients */}
          {criticalPatients.length > 0 && (
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b bg-red-50">
                <h3 className="font-semibold text-red-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Critical Patients ({criticalPatients.length})
                </h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                {criticalPatients.slice(0, 5).map((patient) => (
                  <div key={patient.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        {patient.full_name}
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getCriticalLevelColor(patient.criticalLevel)}`}>
                        {patient.criticalLevel}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {patient.wards?.name} - Bed {patient.beds?.bed_number}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {patient.criticalReasons.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Activity */}
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Today's Activity
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Today's Admissions */}
              {todayStats.admissions.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Admissions ({todayStats.admissionCount})
                  </h4>
                  <div className="space-y-2">
                    {todayStats.admissions.slice(0, 3).map((patient, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        • {patient.full_name} - {formatDate(patient.admission_date)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Discharges */}
              {todayStats.discharges.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Discharges ({todayStats.dischargeCount})
                  </h4>
                  <div className="space-y-2">
                    {todayStats.discharges.slice(0, 3).map((patient, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        • {patient.full_name} - {formatDate(patient.discharge_date)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {todayStats.admissionCount === 0 && todayStats.dischargeCount === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <div className="text-sm">No activity recorded today</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}