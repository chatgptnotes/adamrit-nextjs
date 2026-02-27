'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { 
  Building2, 
  DoorOpen, 
  BedDouble, 
  Users,
  Layers,
  MapPin,
  Search,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings
} from 'lucide-react'

type TabType = 'wards' | 'rooms' | 'beds' | 'departments'

interface Ward {
  id: string
  name: string
  ward_type?: string
  total_beds: number
  occupied_beds: number
  available_beds: number
  location_id?: string
  status: 'active' | 'maintenance' | 'closed'
}

interface Room {
  id: string
  name: string
  ward_id: string
  ward_name?: string
  room_type?: string
  bed_count: number
  status: 'available' | 'occupied' | 'maintenance' | 'housekeeping'
  patient_name?: string
  admission_date?: string
}

interface Bed {
  id: string
  name: string
  room_id: string
  room_name?: string
  ward_id: string
  ward_name?: string
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  patient_id?: string
  patient_name?: string
  admission_date?: string
}

interface Department {
  id: string
  name: string
  description?: string
  staff_count?: number
  head_of_department?: string
  location?: string
  status: 'active' | 'inactive'
}

export default function InfrastructurePage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('wards')
  
  // Data states
  const [wards, setWards] = useState<Ward[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  
  // Stats
  const [stats, setStats] = useState({
    total_wards: 0,
    total_rooms: 0,
    total_beds: 0,
    occupied_beds: 0,
    available_beds: 0,
    maintenance_beds: 0,
    occupancy_rate: 0,
    total_departments: 0
  })

  // Filters
  const [wardFilter, setWardFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadInfrastructureData()
  }, [])

  async function loadInfrastructureData() {
    setLoading(true)
    try {
      // Load wards with occupancy data
      const { data: wardsData, error: wardsError } = await supabase
        .from('wards')
        .select('*')
        .order('name')

      if (wardsError) throw wardsError

      // Calculate occupancy for each ward
      const wardsWithOccupancy = await Promise.all(
        (wardsData || []).map(async (ward: any) => {
          // Get total beds in this ward
          const { count: totalBeds } = await supabase
            .from('beds')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id)

          // Get occupied beds
          const { count: occupiedBeds } = await supabase
            .from('beds')
            .select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id)
            .eq('status', 'occupied')

          return {
            ...ward,
            total_beds: totalBeds || 0,
            occupied_beds: occupiedBeds || 0,
            available_beds: (totalBeds || 0) - (occupiedBeds || 0),
            status: ward.status || 'active'
          }
        })
      )

      setWards(wardsWithOccupancy)

      // Load rooms with bed information
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select(`
          *,
          wards(name)
        `)
        .order('name')

      if (roomsError) throw roomsError

      const roomsWithBeds = await Promise.all(
        (roomsData || []).map(async (room: any) => {
          const { count: bedCount } = await supabase
            .from('beds')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)

          // Check if room has any occupied beds
          const { count: occupiedBeds } = await supabase
            .from('beds')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('status', 'occupied')

          const roomStatus = occupiedBeds && occupiedBeds > 0 ? 'occupied' : 'available'

          return {
            ...room,
            ward_name: room.wards?.name,
            bed_count: bedCount || 0,
            status: room.status || roomStatus
          }
        })
      )

      setRooms(roomsWithBeds)

      // Load beds with patient information
      const { data: bedsData, error: bedsError } = await supabase
        .from('beds')
        .select(`
          *,
          rooms(name, ward_id),
          wards(name),
          ward_patients(
            patient_id,
            admission_date,
            patients(name)
          )
        `)
        .order('name')

      if (bedsError) throw bedsError

      const bedsWithPatients = (bedsData || []).map((bed: any) => ({
        ...bed,
        room_name: bed.rooms?.name,
        ward_name: bed.wards?.name,
        patient_id: bed.ward_patients?.patient_id,
        patient_name: bed.ward_patients?.patients?.name,
        admission_date: bed.ward_patients?.admission_date,
        status: bed.status || (bed.ward_patients ? 'occupied' : 'available')
      }))

      setBeds(bedsWithPatients)

      // Load departments
      const { data: departmentsData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name')

      if (deptError) throw deptError

      // Get staff count for each department (simulated)
      const departmentsWithStaff = (departmentsData || []).map((dept: any) => ({
        ...dept,
        staff_count: Math.floor(Math.random() * 50) + 5, // Simulated
        status: dept.status || 'active'
      }))

      setDepartments(departmentsWithStaff)

      // Calculate overall stats
      const totalBeds = bedsWithPatients.length
      const occupiedBeds = bedsWithPatients.filter((bed: any) => bed.status === 'occupied').length
      const availableBeds = bedsWithPatients.filter((bed: any) => bed.status === 'available').length
      const maintenanceBeds = bedsWithPatients.filter((bed: any) => bed.status === 'maintenance').length
      const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

      setStats({
        total_wards: wardsWithOccupancy.length,
        total_rooms: roomsWithBeds.length,
        total_beds: totalBeds,
        occupied_beds: occupiedBeds,
        available_beds: availableBeds,
        maintenance_beds: maintenanceBeds,
        occupancy_rate: occupancyRate,
        total_departments: departmentsWithStaff.length
      })

    } catch (error) {
      console.error('Error loading infrastructure data:', error)
    }
    setLoading(false)
  }

  async function updateBedStatus(bedId: string, newStatus: Bed['status']) {
    try {
      await supabase
        .from('beds')
        .update({ status: newStatus })
        .eq('id', bedId)
      
      await loadInfrastructureData()
    } catch (error) {
      console.error('Error updating bed status:', error)
    }
  }

  const filteredWards = wards.filter(ward => {
    const matchesSearch = !searchTerm || ward.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || ward.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchTerm || 
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.ward_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWard = !wardFilter || room.ward_id === wardFilter
    const matchesStatus = !statusFilter || room.status === statusFilter
    return matchesSearch && matchesWard && matchesStatus
  })

  const filteredBeds = beds.filter((bed: any) => {
    const matchesSearch = !searchTerm || 
      bed.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bed.room_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bed.ward_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bed.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesWard = !wardFilter || bed.ward_id === wardFilter
    const matchesStatus = !statusFilter || bed.status === statusFilter
    return matchesSearch && matchesWard && matchesStatus
  })

  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = !searchTerm || 
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || dept.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Infrastructure</h1>
          <p className="text-sm text-gray-500">Wards, rooms, beds & department management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Beds" 
          value={loading ? '...' : stats.total_beds.toString()} 
          icon={BedDouble} 
          color="blue" 
        />
        <StatCard 
          title="Occupancy Rate" 
          value={loading ? '...' : `${stats.occupancy_rate}%`} 
          icon={CheckCircle} 
          color={stats.occupancy_rate > 80 ? "red" : stats.occupancy_rate > 60 ? "orange" : "green"} 
        />
        <StatCard 
          title="Available Beds" 
          value={loading ? '...' : stats.available_beds.toString()} 
          icon={BedDouble} 
          color="green" 
        />
        <StatCard 
          title="Maintenance" 
          value={loading ? '...' : stats.maintenance_beds.toString()} 
          icon={Settings} 
          color="orange" 
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'wards' as const, label: 'Wards', icon: DoorOpen, count: stats.total_wards },
          { key: 'rooms' as const, label: 'Rooms', icon: MapPin, count: stats.total_rooms },
          { key: 'beds' as const, label: 'Beds', icon: BedDouble, count: stats.total_beds },
          { key: 'departments' as const, label: 'Departments', icon: Layers, count: stats.total_departments },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label} ({tab.count})
          </button>
        ))}
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
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {(activeTab === 'rooms' || activeTab === 'beds') && (
            <select
              value={wardFilter}
              onChange={(e: any) => setWardFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Wards</option>
              {wards.map((ward: any) => (
                <option key={ward.id} value={ward.id}>{ward.name}</option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Status</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
            {activeTab === 'wards' && <option value="active">Active</option>}
            {activeTab === 'wards' && <option value="closed">Closed</option>}
            {activeTab === 'departments' && <option value="active">Active</option>}
            {activeTab === 'departments' && <option value="inactive">Inactive</option>}
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>
      </div>

      {/* Wards Tab */}
      {activeTab === 'wards' && (
        <div className="space-y-6">
          {/* Ward Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWards.map((ward: Ward) => (
              <div key={ward.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{ward.name}</h3>
                    <p className="text-sm text-gray-500">{ward.ward_type || 'General Ward'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ward.status === 'active' ? 'bg-green-100 text-green-800' :
                    ward.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {ward.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Beds:</span>
                    <span className="font-medium">{ward.total_beds}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Occupied:</span>
                    <span className="font-medium text-red-600">{ward.occupied_beds}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Available:</span>
                    <span className="font-medium text-green-600">{ward.available_beds}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Occupancy Rate:</span>
                    <span className="font-medium">
                      {ward.total_beds > 0 ? Math.round((ward.occupied_beds / ward.total_beds) * 100) : 0}%
                    </span>
                  </div>
                </div>

                <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      ward.total_beds > 0 && (ward.occupied_beds / ward.total_beds) > 0.8 ? 'bg-red-500' :
                      ward.total_beds > 0 && (ward.occupied_beds / ward.total_beds) > 0.6 ? 'bg-orange-500' :
                      'bg-green-500'
                    }`}
                    style={{ 
                      width: ward.total_beds > 0 ? `${(ward.occupied_beds / ward.total_beds) * 100}%` : '0%' 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Ward Table */}
          <div className="bg-white rounded-lg border">
            <DataTable
              data={filteredWards}
              columns={[
                { 
                  key: 'name', 
                  label: 'Ward Name',
                  render: (ward: any) => (
                    <div>
                      <p className="font-medium text-gray-900">{ward.name}</p>
                      <p className="text-sm text-gray-500">{ward.ward_type}</p>
                    </div>
                  )
                },
                { 
                  key: 'total_beds', 
                  label: 'Total Beds',
                  render: (ward: any) => (
                    <span className="font-medium">{ward.total_beds}</span>
                  )
                },
                { 
                  key: 'occupied_beds', 
                  label: 'Occupied',
                  render: (ward: any) => (
                    <span className="font-medium text-red-600">{ward.occupied_beds}</span>
                  )
                },
                { 
                  key: 'available_beds', 
                  label: 'Available',
                  render: (ward: any) => (
                    <span className="font-medium text-green-600">{ward.available_beds}</span>
                  )
                },
                { 
                  key: 'occupancy_rate', 
                  label: 'Occupancy',
                  render: (ward: any) => {
                    const rate = ward.total_beds > 0 ? Math.round((ward.occupied_beds / ward.total_beds) * 100) : 0
                    return (
                      <span className={`font-medium ${
                        rate > 80 ? 'text-red-600' : rate > 60 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {rate}%
                      </span>
                    )
                  }
                },
                { 
                  key: 'status', 
                  label: 'Status',
                  render: (ward: any) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ward.status === 'active' ? 'bg-green-100 text-green-800' :
                      ward.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {ward.status.toUpperCase()}
                    </span>
                  )
                },
              ]}
              loading={loading}
              searchPlaceholder="Search wards..."
            />
          </div>
        </div>
      )}

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div className="bg-white rounded-lg border">
          <DataTable
            data={filteredRooms}
            columns={[
              { 
                key: 'name', 
                label: 'Room',
                render: (room: any) => (
                  <div>
                    <p className="font-medium text-gray-900">{room.name}</p>
                    <p className="text-sm text-gray-500">{room.room_type}</p>
                  </div>
                )
              },
              { 
                key: 'ward_name', 
                label: 'Ward',
                render: (room: any) => (
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                    {room.ward_name}
                  </span>
                )
              },
              { 
                key: 'bed_count', 
                label: 'Beds',
                render: (room: any) => (
                  <span className="font-medium">{room.bed_count}</span>
                )
              },
              { 
                key: 'status', 
                label: 'Status',
                render: (room: any) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    room.status === 'available' ? 'bg-green-100 text-green-800' :
                    room.status === 'occupied' ? 'bg-red-100 text-red-800' :
                    room.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {room.status.toUpperCase()}
                  </span>
                )
              },
              { 
                key: 'patient_name', 
                label: 'Current Patient',
                render: (room: any) => room.patient_name || '—'
              },
            ]}
            loading={loading}
            searchPlaceholder="Search rooms..."
          />
        </div>
      )}

      {/* Beds Tab */}
      {activeTab === 'beds' && (
        <div className="space-y-6">
          {/* Bed Status Grid */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Bed Status Grid</h3>
            <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
              {filteredBeds.slice(0, 64).map((bed: Bed) => (
                <div
                  key={bed.id}
                  className={`w-8 h-8 rounded border-2 cursor-pointer relative group ${
                    bed.status === 'available' ? 'bg-green-100 border-green-300' :
                    bed.status === 'occupied' ? 'bg-red-100 border-red-300' :
                    bed.status === 'maintenance' ? 'bg-orange-100 border-orange-300' :
                    'bg-gray-100 border-gray-300'
                  }`}
                  title={`${bed.name} - ${bed.status} ${bed.patient_name ? `(${bed.patient_name})` : ''}`}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {bed.name.slice(-2)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="flex gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
                <span>Available ({stats.available_beds})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
                <span>Occupied ({stats.occupied_beds})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
                <span>Maintenance ({stats.maintenance_beds})</span>
              </div>
            </div>
          </div>

          {/* Bed Table */}
          <div className="bg-white rounded-lg border">
            <DataTable
              data={filteredBeds}
              columns={[
                { 
                  key: 'name', 
                  label: 'Bed',
                  render: (bed: any) => (
                    <span className="font-medium text-gray-900">{bed.name}</span>
                  )
                },
                { 
                  key: 'room_name', 
                  label: 'Room',
                  render: (bed: any) => (
                    <div>
                      <p className="text-sm">{bed.room_name}</p>
                      <p className="text-xs text-gray-500">{bed.ward_name}</p>
                    </div>
                  )
                },
                { 
                  key: 'status', 
                  label: 'Status',
                  render: (bed: any) => (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      bed.status === 'available' ? 'bg-green-100 text-green-800' :
                      bed.status === 'occupied' ? 'bg-red-100 text-red-800' :
                      bed.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {bed.status.toUpperCase()}
                    </span>
                  )
                },
                { 
                  key: 'patient_name', 
                  label: 'Patient',
                  render: (bed: any) => (
                    <div>
                      <p className="font-medium">{bed.patient_name || '—'}</p>
                      {bed.admission_date && (
                        <p className="text-xs text-gray-500">
                          Since {new Date(bed.admission_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )
                },
                { 
                  key: 'actions', 
                  label: 'Actions',
                  render: (bed: any) => (
                    <div className="flex gap-1">
                      {bed.status !== 'occupied' && (
                        <button
                          onClick={() => updateBedStatus(bed.id, 'maintenance')}
                          className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
                        >
                          Maintenance
                        </button>
                      )}
                      {bed.status === 'maintenance' && (
                        <button
                          onClick={() => updateBedStatus(bed.id, 'available')}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          Available
                        </button>
                      )}
                    </div>
                  )
                },
              ]}
              loading={loading}
              searchPlaceholder="Search beds..."
            />
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-lg border">
          <DataTable
            data={filteredDepartments}
            columns={[
              { 
                key: 'name', 
                label: 'Department',
                render: (dept: any) => (
                  <div>
                    <p className="font-medium text-gray-900">{dept.name}</p>
                    <p className="text-sm text-gray-500">{dept.description}</p>
                  </div>
                )
              },
              { 
                key: 'staff_count', 
                label: 'Staff Count',
                render: (dept: any) => (
                  <span className="font-medium">{dept.staff_count || 0}</span>
                )
              },
              { 
                key: 'head_of_department', 
                label: 'HOD',
                render: (dept: any) => dept.head_of_department || '—'
              },
              { 
                key: 'location', 
                label: 'Location',
                render: (dept: any) => dept.location || '—'
              },
              { 
                key: 'status', 
                label: 'Status',
                render: (dept: any) => (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    dept.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {dept.status.toUpperCase()}
                  </span>
                )
              },
            ]}
            loading={loading}
            searchPlaceholder="Search departments..."
          />
        </div>
      )}
    </div>
  )
}