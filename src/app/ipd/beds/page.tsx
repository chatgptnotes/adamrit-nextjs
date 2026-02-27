'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { Bed, Users, CheckCircle, AlertCircle } from 'lucide-react'

interface Ward {
  id: number
  name: string
  total_beds: number
  occupied_beds?: number
}

interface BedInfo {
  id: number
  ward_id: number
  bed_number: string
  is_occupied: boolean
  patient_name?: string
  patient_id?: string
  admission_date?: string
}

export default function BedDashboard() {
  const [wards, setWards] = useState<Ward[]>([])
  const [selectedWard, setSelectedWard] = useState<number | null>(null)
  const [beds, setBeds] = useState<BedInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWards()
  }, [])

  useEffect(() => {
    if (selectedWard) {
      fetchWardBeds(selectedWard)
    }
  }, [selectedWard])

  async function fetchWards() {
    try {
      const { data: wardsData } = await supabase.from('wards').select('*').order('name')
      
      // Get occupancy counts
      const wardsWithOccupancy = await Promise.all(
        (wardsData || []).map(async (ward: any) => {
          const { count } = await supabase
            .from('ward_patients_full')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id)
            .neq('status', 'discharged')
          
          return {
            ...ward,
            occupied_beds: count || 0
          }
        })
      )
      
      setWards(wardsWithOccupancy)
      if (wardsWithOccupancy.length > 0) {
        setSelectedWard(wardsWithOccupancy[0].id)
      }
    } catch (error) {
      console.error('Error fetching wards:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchWardBeds(wardId: number) {
    try {
      // Mock bed data - in real implementation, you'd have a beds table
      const selectedWardData = wards.find(w => w.id === wardId)
      if (!selectedWardData) return

      const { data: patients } = await supabase
        .from('ward_patients_full')
        .select('*')
        .eq('ward_id', wardId)
        .neq('status', 'discharged')

      const totalBeds = selectedWardData.total_beds || 20
      const mockBeds: BedInfo[] = []

      for (let i = 1; i <= totalBeds; i++) {
        const patient = patients?.find(p => p.bed_number === i.toString())
        mockBeds.push({
          id: i,
          ward_id: wardId,
          bed_number: i.toString(),
          is_occupied: !!patient,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : undefined,
          patient_id: patient?.patient_id,
          admission_date: patient?.admission_date
        })
      }

      setBeds(mockBeds)
    } catch (error) {
      console.error('Error fetching ward beds:', error)
    }
  }

  const getOccupancyColor = (occupied: number, total: number) => {
    const percentage = (occupied / total) * 100
    if (percentage >= 90) return 'text-red-600 bg-red-50'
    if (percentage >= 70) return 'text-orange-600 bg-orange-50'
    return 'text-green-600 bg-green-50'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
          <Bed className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bed Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time bed occupancy across all wards</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading wards...</p>
        </div>
      ) : (
        <>
          {/* Ward Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {wards.map((ward: any) => {
              const occupancyPercentage = ward.total_beds ? (ward.occupied_beds! / ward.total_beds * 100) : 0
              return (
                <div
                  key={ward.id}
                  className={`bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedWard === ward.id ? 'ring-2 ring-emerald-500' : ''
                  }`}
                  onClick={() => setSelectedWard(ward.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{ward.name}</h3>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getOccupancyColor(ward.occupied_beds!, ward.total_beds)}`}>
                      {occupancyPercentage.toFixed(0)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{ward.occupied_beds}/{ward.total_beds}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${ward.occupied_beds! > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {ward.occupied_beds! > 0 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      <span>{ward.total_beds - ward.occupied_beds!} available</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Bed Layout */}
          {selectedWard && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {wards.find(w => w.id === selectedWard)?.name} - Bed Layout
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                {beds.map((bed: any) => (
                  <div
                    key={bed.id}
                    className={`aspect-square rounded-lg border-2 p-2 text-center transition-all ${
                      bed.is_occupied
                        ? 'border-red-300 bg-red-50 hover:bg-red-100'
                        : 'border-green-300 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1">Bed {bed.bed_number}</div>
                    {bed.is_occupied ? (
                      <div className="text-xs">
                        <div className="font-medium text-red-700 mb-1">{bed.patient_name}</div>
                        <div className="text-red-600">ID: {bed.patient_id}</div>
                        <div className="text-red-500">{formatDate(bed.admission_date)}</div>
                      </div>
                    ) : (
                      <div className="text-green-600 text-xs font-medium mt-2">Available</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}