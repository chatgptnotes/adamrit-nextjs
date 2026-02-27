'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { Building, Users, Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react'

interface Ward {
  id: number
  name: string
  total_beds: number
  department?: string
}

interface WardStats {
  total_patients: number
  occupied_beds: number
  available_beds: number
  occupancy_percentage: number
  avg_stay_days: number
  pending_discharges: number
  new_admissions_today: number
}

interface WardPatient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  bed_number: string
  admission_date: string
  diagnosis?: string
  doctor_name?: string
  expected_discharge?: string
  status: string
}

export default function WardDashboard() {
  const [wards, setWards] = useState<Ward[]>([])
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null)
  const [wardStats, setWardStats] = useState<WardStats | null>(null)
  const [wardPatients, setWardPatients] = useState<WardPatient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWards()
  }, [])

  useEffect(() => {
    if (selectedWard) {
      fetchWardDetails(selectedWard.id)
    }
  }, [selectedWard])

  const fetchWards = async () => {
    try {
      const { data } = await supabase.from('wards').select('*').order('name')
      setWards(data || [])
      if (data && data.length > 0) {
        setSelectedWard(data[0])
      }
    } catch (error) {
      console.error('Error fetching wards:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWardDetails = async (wardId: number) => {
    try {
      // Fetch ward patients
      const { data: patients } = await supabase
        .from('ward_patients_full')
        .select('*')
        .eq('ward_id', wardId)
        .neq('status', 'discharged')
        .order('admission_date', { ascending: false })

      setWardPatients(patients || [])

      // Calculate ward statistics
      const totalPatients = patients?.length || 0
      const selectedWardData = wards.find(w => w.id === wardId)
      const totalBeds = selectedWardData?.total_beds || 20
      const availableBeds = totalBeds - totalPatients
      const occupancyPercentage = totalBeds > 0 ? (totalPatients / totalBeds) * 100 : 0

      // Calculate average stay
      const today = new Date()
      const avgStay = patients?.length 
        ? patients.reduce((sum, patient) => {
            const admissionDate = new Date(patient.admission_date)
            const daysDiff = (today.getTime() - admissionDate.getTime()) / (1000 * 3600 * 24)
            return sum + daysDiff
          }, 0) / patients.length
        : 0

      // Mock data for other stats
      const stats: WardStats = {
        total_patients: totalPatients,
        occupied_beds: totalPatients,
        available_beds: availableBeds,
        occupancy_percentage: occupancyPercentage,
        avg_stay_days: avgStay,
        pending_discharges: Math.floor(totalPatients * 0.3), // Mock: 30% pending discharge
        new_admissions_today: Math.floor(Math.random() * 3) + 1 // Mock: 1-3 new admissions
      }

      setWardStats(stats)
    } catch (error) {
      console.error('Error fetching ward details:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const getDaysStayed = (admissionDate: string) => {
    const today = new Date()
    const admission = new Date(admissionDate)
    const daysDiff = Math.floor((today.getTime() - admission.getTime()) / (1000 * 3600 * 24))
    return daysDiff
  }

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50'
    if (percentage >= 70) return 'text-orange-600 bg-orange-50'
    return 'text-green-600 bg-green-50'
  }

  const getStayColor = (days: number) => {
    if (days >= 10) return 'text-red-600 bg-red-50'
    if (days >= 5) return 'text-orange-600 bg-orange-50'
    return 'text-gray-600 bg-gray-50'
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading ward dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
          <Building className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ward Dashboard</h1>
          <p className="text-sm text-gray-500">Comprehensive view of ward operations</p>
        </div>
      </div>

      {/* Ward Selection */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {wards.map((ward: any) => (
            <button
              key={ward.id}
              onClick={() => setSelectedWard(ward)}
              className={`px-4 py-2 rounded-lg border font-medium transition-all ${
                selectedWard?.id === ward.id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {ward.name}
              {ward.department && (
                <span className="ml-2 text-xs text-gray-500">({ward.department})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedWard && wardStats && (
        <>
          {/* Ward Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Occupancy</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {wardStats.occupied_beds}/{selectedWard.total_beds}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getOccupancyColor(wardStats.occupancy_percentage)}`}>
                  {wardStats.occupancy_percentage.toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Avg. Stay</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {wardStats.avg_stay_days.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">days</div>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Pending Discharges</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {wardStats.pending_discharges}
                  </div>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Today's Admissions</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {wardStats.new_admissions_today}
                  </div>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Ward Patient List */}
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedWard.name} - Current Patients
              </h3>
              <p className="text-sm text-gray-500">{wardPatients.length} patients currently admitted</p>
            </div>

            {wardPatients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doctor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Admission Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days Stayed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {wardPatients.map((patient) => {
                      const daysStayed = getDaysStayed(patient.admission_date)
                      return (
                        <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {patient.first_name} {patient.last_name}
                            </div>
                            <div className="text-sm text-gray-500">ID: {patient.patient_id}</div>
                            {patient.diagnosis && (
                              <div className="text-xs text-gray-400 mt-1">{patient.diagnosis}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium text-center w-12">
                              {patient.bed_number}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {patient.doctor_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">
                                {formatDate(patient.admission_date)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStayColor(daysStayed)}`}>
                              {daysStayed} days
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Active
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500">No patients currently admitted to this ward</div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-6 bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="/ipd/admit"
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <Users className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                <span className="text-sm text-gray-600 group-hover:text-indigo-600">Admit Patient</span>
              </a>
              
              <a
                href="/ipd/transfer"
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <Building className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                <span className="text-sm text-gray-600 group-hover:text-indigo-600">Transfer</span>
              </a>
              
              <a
                href="/ipd/nursing"
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <Clock className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                <span className="text-sm text-gray-600 group-hover:text-indigo-600">Nursing Notes</span>
              </a>
              
              <a
                href="/discharge"
                className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <AlertCircle className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 mb-2" />
                <span className="text-sm text-gray-600 group-hover:text-indigo-600">Discharge</span>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}