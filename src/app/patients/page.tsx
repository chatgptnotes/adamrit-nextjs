'use client'
import { useState, useEffect } from 'react'
import { 
  Users, UserPlus, Search, User, QrCode, FileText,
  Phone, Calendar, Shield, ArrowRight, Eye, Filter,
  Hospital, MapPin, Clock, Activity
} from 'lucide-react'
import Link from 'next/link'
import { searchPatients } from '@/lib/patient-engine'
import { usePatients } from '@/hooks/useSupabase'

export default function PatientsPage() {
  const { data: allPatients, loading: allPatientsLoading } = usePatients()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredPatients, setFilteredPatients] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [filters, setFilters] = useState({
    admissionType: '',
    status: '',
    department: '',
    dateRange: ''
  })

  // Use search results if searching, otherwise show filtered all patients
  const displayPatients = searchQuery.trim().length >= 2 ? searchResults : filteredPatients

  useEffect(() => {
    if (!allPatientsLoading && allPatients) {
      applyFilters()
    }
  }, [allPatients, allPatientsLoading, filters])

  const applyFilters = () => {
    let filtered = [...allPatients]

    // Filter by admission type
    if (filters.admissionType) {
      filtered = filtered.filter(patient => 
        patient.admission_type === filters.admissionType
      )
    }

    // Filter by status
    if (filters.status === 'active') {
      filtered = filtered.filter(patient => 
        patient.admission_date && !patient.discharge_date
      )
    } else if (filters.status === 'discharged') {
      filtered = filtered.filter(patient => 
        patient.discharge_date
      )
    }

    // Filter by date range
    if (filters.dateRange) {
      const days = parseInt(filters.dateRange)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      filtered = filtered.filter(patient => {
        if (!patient.registration_date) return false
        return new Date(patient.registration_date) >= cutoffDate
      })
    }

    setFilteredPatients(filtered)
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const result = await searchPatients(query)
      if (result.success) {
        setSearchResults(result.patients)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'New Registration',
      description: 'Register a new patient with complete details',
      href: '/patients/new',
      icon: UserPlus,
      color: 'blue'
    },
    {
      title: 'Print QR Card',
      description: 'Generate patient QR code identification cards',
      href: '/patients/qr-card',
      icon: QrCode,
      color: 'purple'
    },
    {
      title: 'IPD Admission',
      description: 'Admit patient to inpatient department',
      href: '/patients/admission',
      icon: FileText,
      color: 'orange'
    },
    {
      title: 'Advanced Search',
      description: 'Search with multiple criteria and filters',
      href: '/patients/search',
      icon: Search,
      color: 'emerald'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
      purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
      orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const getPatientStatus = (patient: any) => {
    if (patient.admission_date && !patient.discharge_date) {
      return { status: 'Active IPD', color: 'text-green-600 bg-green-50' }
    } else if (patient.discharge_date) {
      return { status: 'Discharged', color: 'text-gray-600 bg-gray-50' }
    } else {
      return { status: 'OPD', color: 'text-blue-600 bg-blue-50' }
    }
  }

  const getDaysAdmitted = (admissionDate: string) => {
    if (!admissionDate) return 0
    const admission = new Date(admissionDate)
    const today = new Date()
    return Math.ceil((today.getTime() - admission.getTime()) / (1000 * 3600 * 24))
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
            <p className="text-sm text-gray-500">Complete patient registration and management system</p>
          </div>
        </div>
        
        <Link
          href="/patients/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4" />
          New Patient
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patients by name, UHID, or mobile number..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {searchLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <select
              value={filters.admissionType}
              onChange={(e) => setFilters({...filters, admissionType: e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="OPD">OPD</option>
              <option value="IPD">IPD</option>
              <option value="Emergency">Emergency</option>
              <option value="Daycare">Daycare</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active IPD</option>
              <option value="discharged">Discharged</option>
            </select>

            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Time</option>
              <option value="1">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>
        </div>

        {searchQuery.trim().length >= 2 && (
          <div className="mt-3 text-sm text-gray-600">
            {searchLoading ? 'Searching...' : `Found ${searchResults.length} results for "${searchQuery}"`}
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Patients</div>
              <div className="text-2xl font-bold text-gray-900">
                {allPatientsLoading ? '...' : allPatients.length.toLocaleString()}
              </div>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Active IPD</div>
              <div className="text-2xl font-bold text-gray-900">
                {allPatientsLoading ? '...' : allPatients.filter(p => 
                  p.admission_date && !p.discharge_date
                ).length}
              </div>
            </div>
            <Hospital className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Today Registration</div>
              <div className="text-2xl font-bold text-gray-900">
                {allPatientsLoading ? '...' : allPatients.filter(p => {
                  const today = new Date().toDateString()
                  return p.registration_date && new Date(p.registration_date).toDateString() === today
                }).length}
              </div>
            </div>
            <Calendar className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">With Insurance</div>
              <div className="text-2xl font-bold text-gray-900">
                {allPatientsLoading ? '...' : allPatients.filter(p => 
                  p.insurance_provider && p.insurance_provider !== 'Self Pay'
                ).length}
              </div>
            </div>
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Patient Management Functions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className={`block p-6 rounded-lg border-2 transition-all duration-200 ${getColorClasses(action.color)}`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-white bg-opacity-60">
                  <Icon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-xl mb-2">{action.title}</h3>
                  <p className="text-sm opacity-80 mb-4">{action.description}</p>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    Open <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Patient List Table */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {searchQuery.trim().length >= 2 ? 'Search Results' : 'Patient List'}
            </h3>
            <div className="text-sm text-gray-500">
              {allPatientsLoading ? 'Loading...' : `${displayPatients.length} patients`}
            </div>
          </div>
        </div>
        
        {allPatientsLoading || searchLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-gray-500">Loading patients...</div>
          </div>
        ) : displayPatients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor / Ward
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayPatients.slice(0, 50).map((patient) => {
                  const patientStatus = getPatientStatus(patient)
                  const daysAdmitted = getDaysAdmitted(patient.admission_date)
                  
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.uhid || patient.patient_id} • {patient.sex} • {patient.age}y
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.city && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {patient.city}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.doctors?.doctor_name || patient.referring_doctor || 'N/A'}
                        </div>
                        {patient.wards?.name && (
                          <div className="text-sm text-gray-500">
                            {patient.wards.name} - {patient.beds?.bed_number || 'N/A'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${patientStatus.color}`}>
                          {patientStatus.status}
                        </span>
                        {patient.admission_date && !patient.discharge_date && daysAdmitted > 0 && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {daysAdmitted} days
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>Reg: {formatDate(patient.registration_date)}</div>
                        {patient.admission_date && (
                          <div>Adm: {formatDate(patient.admission_date)}</div>
                        )}
                        {patient.discharge_date && (
                          <div>Dis: {formatDate(patient.discharge_date)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {patient.admission_date && !patient.discharge_date && (
                            <span className="text-green-600 p-1" title="Currently Admitted">
                              <Activity className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <div>
              {searchQuery.trim().length >= 2 
                ? `No patients found for "${searchQuery}"`
                : 'No patients match the selected filters'
              }
            </div>
            <div className="text-sm mt-1">
              {searchQuery.trim().length >= 2 
                ? 'Try a different search term'
                : 'Clear filters to see all patients'
              }
            </div>
          </div>
        )}

        {displayPatients.length > 50 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="text-sm text-gray-500 text-center">
              Showing first 50 results. Use search to find specific patients.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}