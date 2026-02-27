'use client'
// @ts-nocheck

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { saveFinalBill } from '@/lib/billing-actions'
import { calculateTotalBill } from '@/lib/billing-engine'
import { formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { Package, User, Search, Scissors, Bed, Clock, Receipt, Tag, Plus, Edit, Eye, TrendingUp } from 'lucide-react'

interface SurgeryPackage {
  id: number
  name: string
  category: string
  service_group: string
  nabh_charges?: number
  non_nabh_charges?: number
  description?: string
  department?: string
  inclusions: string[]
}

interface Patient {
  id: number
  first_name: string
  last_name: string
  uhid?: string
  mobile?: string
}

interface Doctor {
  id: number
  doctor_name: string
  specialization: string
}

export default function SurgeryPackagesPage() {
  const [packages, setPackages] = useState<SurgeryPackage[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<SurgeryPackage | null>(null)
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [packageForm, setPackageForm] = useState({
    name: '',
    category: 'surgery',
    service_group: 'surgery',
    nabh_charges: '',
    non_nabh_charges: '',
    description: '',
    department: '',
    inclusions: ['Surgeon Fee', 'Anesthesia', 'OT Charges', 'Post-op Care']
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Load surgery packages from tariff_lists
      const { data: packagesData } = await supabase
        .from('tariff_lists')
        .select('*')
        .ilike('service_group', '%surgery%')
        .order('name')

      // Load patients
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id, first_name, last_name, uhid, mobile')
        .order('first_name')
        .limit(100)

      // Load doctors
      const { data: doctorsData } = await supabase
        .from('doctors')
        .select('id, doctor_name, specialization')
        .order('doctor_name')

      setPackages((packagesData || []).map((pkg: any) => ({
        ...pkg,
        inclusions: pkg.description ? pkg.description.split(',').map((i: any) => i.trim()) : []
      })))
      setPatients(patientsData || [])
      setDoctors(doctorsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePackage() {
    try {
      const { data, error } = await supabase
        .from('tariff_lists')
        .insert({
          name: packageForm.name,
          category: packageForm.category,
          service_group: packageForm.service_group,
          description: packageForm.inclusions.join(', '),
          department: packageForm.department,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Create tariff amounts
      await supabase
        .from('tariff_amounts')
        .insert([
          {
            tariff_list_id: data.id,
            tariff_standard_id: 1, // Default/General
            nabh_charges: parseFloat(packageForm.nabh_charges),
            non_nabh_charges: parseFloat(packageForm.non_nabh_charges),
            category: 'surgery',
            created_at: new Date().toISOString()
          }
        ])

      await loadData()
      setShowCreateModal(false)
      resetPackageForm()
    } catch (error) {
      console.error('Error creating package:', error)
      alert('Error creating package')
    }
  }

  async function handleApplyPackage() {
    if (!selectedPatient || !selectedPackage) {
      alert('Please select both patient and package')
      return
    }

    try {
      const isNabh = false // Determine based on hospital type
      const packageAmount = isNabh ? selectedPackage.nabh_charges : selectedPackage.non_nabh_charges
      
      if (!packageAmount) {
        alert('Package amount not found')
        return
      }

      // Create a final bill with the package
      const result = await saveFinalBill(selectedPatient.id, {
        patient_id: selectedPatient.id,
        total_amount: packageAmount,
        discount: 0,
        payments: [{
          mode: 'Cash',
          amount: 0 // No payment yet, just creating the bill
        }],
        remarks: `Surgery Package: ${selectedPackage.name}`
      })

      if (result.success) {
        alert(`Package applied successfully!\nPackage: ${selectedPackage.name}\nAmount: ${formatCurrency(packageAmount)}`)
        setShowApplyModal(false)
        resetSelections()
      } else {
        alert('Error applying package: ' + result.error)
      }
    } catch (error) {
      console.error('Error applying package:', error)
      alert('Error applying package')
    }
  }

  function resetPackageForm() {
    setPackageForm({
      name: '',
      category: 'surgery',
      service_group: 'surgery',
      nabh_charges: '',
      non_nabh_charges: '',
      description: '',
      department: '',
      inclusions: ['Surgeon Fee', 'Anesthesia', 'OT Charges', 'Post-op Care']
    })
  }

  function resetSelections() {
    setSelectedPatient(null)
    setSelectedDoctor(null)
    setSelectedPackage(null)
    setPatientSearch('')
  }

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.category?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || pkg.category?.toLowerCase().includes(categoryFilter.toLowerCase())
    return matchesSearch && matchesCategory
  })

  const filteredPatients = patients.filter((p: any) => 
    `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mobile?.includes(patientSearch) ||
    p.uhid?.toLowerCase().includes(patientSearch.toLowerCase())
  )

  // Get unique categories
  const categories = Array.from(new Set(packages.map((p: any) => p.category).filter(Boolean)))

  // Calculate stats
  const stats = {
    totalPackages: packages.length,
    surgeryPackages: packages.filter((p: any) => p.service_group?.toLowerCase().includes('surgery')).length,
    avgPackagePrice: packages.length > 0 ? 
      packages.reduce((sum, p) => sum + (p.non_nabh_charges || 0), 0) / packages.length : 0,
    highestPackage: Math.max(...packages.map((p: any) => p.non_nabh_charges || 0))
  }

  const columns = [
    { key: 'name', label: 'Package Name' },
    { key: 'category', label: 'Category' },
    { key: 'department', label: 'Department' },
    { 
      key: 'non_nabh_charges', 
      label: 'Non-NABH Rate', 
      render: (value: number) => value ? formatCurrency(value) : 'N/A'
    },
    { 
      key: 'nabh_charges', 
      label: 'NABH Rate', 
      render: (value: number) => value ? formatCurrency(value) : 'N/A'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: SurgeryPackage) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedPackage(row)
              setShowPackageModal(true)
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPackage(row)
              setShowApplyModal(true)
            }}
            className="text-green-600 hover:text-green-800"
            title="Apply to Patient"
          >
            <Receipt className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Surgery Packages</h1>
        <p className="text-gray-600">Manage surgery packages with fixed rates and inclusions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Packages"
          value={stats.totalPackages.toLocaleString()}
          subtitle="All surgery packages"
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Surgery Packages"
          value={stats.surgeryPackages.toLocaleString()}
          subtitle="Surgery-specific"
          icon={Scissors}
          color="red"
        />
        <StatCard
          title="Average Price"
          value={formatCurrency(stats.avgPackagePrice)}
          subtitle="Average package cost"
          icon={Tag}
          color="green"
        />
        <StatCard
          title="Highest Package"
          value={formatCurrency(stats.highestPackage)}
          subtitle="Most expensive"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Package
            </button>
          </div>
        </div>
      </div>

      {/* Packages Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <DataTable 
          data={filteredPackages} 
          columns={columns as any}
          loading={loading}
        />
      </div>

      {/* Package Details Modal */}
      {showPackageModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Package Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Package Name</label>
                <p className="font-medium">{selectedPackage.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Category</label>
                  <p>{selectedPackage.category}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Department</label>
                  <p>{selectedPackage.department || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Non-NABH Rate</label>
                  <p className="font-semibold text-green-600">
                    {selectedPackage.non_nabh_charges ? formatCurrency(selectedPackage.non_nabh_charges) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">NABH Rate</label>
                  <p className="font-semibold text-blue-600">
                    {selectedPackage.nabh_charges ? formatCurrency(selectedPackage.nabh_charges) : 'N/A'}
                  </p>
                </div>
              </div>
              {selectedPackage.inclusions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Inclusions</label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    {selectedPackage.inclusions.map((inclusion, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        {inclusion}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPackageModal(false)
                  setShowApplyModal(true)
                }}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
              >
                Apply to Patient
              </button>
              <button
                onClick={() => {
                  setShowPackageModal(false)
                  setSelectedPackage(null)
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Package Modal */}
      {showApplyModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Apply Package to Patient</h3>
            <p className="text-sm text-gray-600 mb-4">Package: {selectedPackage.name}</p>
            
            <div className="space-y-4">
              {/* Patient Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Patient</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patient..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {selectedPatient ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                        <p className="text-sm text-gray-600">ID: {selectedPatient.id} | {selectedPatient.mobile}</p>
                      </div>
                      <button 
                        onClick={() => setSelectedPatient(null)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {filteredPatients.slice(0, 5).map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className="w-full text-left p-2 border border-gray-200 rounded hover:bg-gray-50"
                      >
                        <div className="font-medium text-sm">{patient.first_name} {patient.last_name}</div>
                        <div className="text-xs text-gray-600">{patient.id} • {patient.mobile}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Package Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-center">
                  <p className="font-semibold text-green-800">Package Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedPackage.non_nabh_charges || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Non-NABH Rate</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleApplyPackage}
                disabled={!selectedPatient}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Apply Package
              </button>
              <button
                onClick={() => {
                  setShowApplyModal(false)
                  resetSelections()
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Package Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Package</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                <input
                  type="text"
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={packageForm.category}
                    onChange={(e) => setPackageForm({ ...packageForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={packageForm.department}
                    onChange={(e) => setPackageForm({ ...packageForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Non-NABH Rate</label>
                  <input
                    type="number"
                    value={packageForm.non_nabh_charges}
                    onChange={(e) => setPackageForm({ ...packageForm, non_nabh_charges: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NABH Rate</label>
                  <input
                    type="number"
                    value={packageForm.nabh_charges}
                    onChange={(e) => setPackageForm({ ...packageForm, nabh_charges: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inclusions</label>
                <div className="space-y-2">
                  {packageForm.inclusions.map((inclusion, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={inclusion}
                        onChange={(e) => {
                          const newInclusions = [...packageForm.inclusions]
                          newInclusions[index] = e.target.value
                          setPackageForm({ ...packageForm, inclusions: newInclusions })
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newInclusions = packageForm.inclusions.filter((_, i) => i !== index)
                          setPackageForm({ ...packageForm, inclusions: newInclusions })
                        }}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPackageForm({ 
                      ...packageForm, 
                      inclusions: [...packageForm.inclusions, ''] 
                    })}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Inclusion
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreatePackage}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Create Package
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  resetPackageForm()
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}