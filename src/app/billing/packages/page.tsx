'use client'
import { useState } from 'react'
import { usePatients, useDoctors } from '@/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'
import { Package, User, Search, Scissors, Bed, Clock, Receipt, Tag } from 'lucide-react'

interface PackageData {
  id: string
  name: string
  type: 'surgery' | 'ward' | 'daycare'
  description: string
  inclusions: string[]
  price: number
  duration?: string
  category?: string
  popular?: boolean
}

export default function PackageBillingPage() {
  const { data: patients } = usePatients()
  const { data: doctors } = useDoctors()
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<'all' | 'surgery' | 'ward' | 'daycare'>('all')
  
  // Predefined packages
  const packages: PackageData[] = [
    // Surgery Packages
    {
      id: 'surg_arthroscopy',
      name: 'Knee Arthroscopy Package',
      type: 'surgery',
      category: 'orthopedic',
      description: 'Complete arthroscopy package including surgery, anesthesia, and post-op care',
      inclusions: [
        'Surgeon Fee', 'Assistant Surgeon Fee', 'Anesthetist Fee', 
        'OT Charges (2 hours)', 'Arthroscopy Equipment', 'Post-op Medications',
        '1 Day Room Charges', 'Nursing Care', 'Physiotherapy (1 session)'
      ],
      price: 85000,
      duration: '2 hours',
      popular: true
    },
    {
      id: 'surg_fracture',
      name: 'Fracture Fixation Package',
      type: 'surgery',
      category: 'orthopedic',
      description: 'Comprehensive fracture fixation with implants',
      inclusions: [
        'Surgeon Fee', 'Assistant Fee', 'Anesthesia', 
        'OT Charges (3 hours)', 'Implants & Hardware', 'X-rays',
        '2 Days Room Charges', 'Nursing Care', 'Medications'
      ],
      price: 125000,
      duration: '3 hours'
    },
    {
      id: 'surg_joint_replacement',
      name: 'Joint Replacement Package',
      type: 'surgery',
      category: 'orthopedic',
      description: 'Complete joint replacement with prosthesis',
      inclusions: [
        'Surgeon Fee', 'Assistant Fee', 'Anesthetist Fee',
        'OT Charges (4 hours)', 'Prosthesis/Implant', 'Blood Tests',
        '5 Days IPD Charges', 'ICU if required', 'Physiotherapy (5 sessions)',
        'Post-op X-rays', 'Medications'
      ],
      price: 275000,
      duration: '4 hours',
      popular: true
    },
    
    // Ward Packages
    {
      id: 'ward_general',
      name: 'General Ward Package',
      type: 'ward',
      description: '7-day stay in general ward with nursing care',
      inclusions: [
        '7 Days Bed Charges', 'Nursing Care', '3 Doctor Visits',
        'Basic Medications', 'Meals', 'Attendant Facilities'
      ],
      price: 15000,
      duration: '7 days'
    },
    {
      id: 'ward_private',
      name: 'Private Room Package',
      type: 'ward',
      description: '7-day stay in private room with enhanced services',
      inclusions: [
        '7 Days Private Room', 'Dedicated Nursing', 'Daily Doctor Rounds',
        'Premium Medications', 'Special Meals', 'Attendant Bed',
        'TV & WiFi', 'Housekeeping'
      ],
      price: 35000,
      duration: '7 days',
      popular: true
    },
    {
      id: 'ward_icu',
      name: 'ICU Care Package',
      type: 'ward',
      description: '3-day intensive care with monitoring',
      inclusions: [
        '3 Days ICU Charges', '24/7 Nursing', 'Ventilator Support',
        'Continuous Monitoring', 'Critical Care Medications',
        'Specialist Consultations', 'Lab Tests', 'Emergency Services'
      ],
      price: 75000,
      duration: '3 days'
    },
    
    // Daycare Packages
    {
      id: 'daycare_cataract',
      name: 'Cataract Surgery Daycare',
      type: 'daycare',
      category: 'ophthalmology',
      description: 'Same-day cataract surgery with lens implant',
      inclusions: [
        'Pre-op Assessment', 'Cataract Surgery', 'IOL Implant',
        'Local Anesthesia', 'Post-op Care', '4 hours Recovery',
        'Take-home Medications', 'Follow-up Visit'
      ],
      price: 35000,
      duration: 'Same day'
    },
    {
      id: 'daycare_endoscopy',
      name: 'Diagnostic Endoscopy Package',
      type: 'daycare',
      category: 'gastroenterology',
      description: 'Upper/Lower endoscopy with biopsy if needed',
      inclusions: [
        'Pre-procedure Preparation', 'Endoscopy Procedure', 'Sedation',
        'Biopsy (if required)', 'Recovery Care', 'Reports',
        'Post-procedure Instructions'
      ],
      price: 12000,
      duration: '4 hours'
    },
    {
      id: 'daycare_colonoscopy',
      name: 'Colonoscopy Screening Package',
      type: 'daycare',
      category: 'gastroenterology',
      description: 'Complete colonoscopy with polyp removal',
      inclusions: [
        'Bowel Preparation Kit', 'Colonoscopy Procedure', 'IV Sedation',
        'Polyp Removal (if found)', 'Pathology', 'Recovery',
        'Detailed Report', 'Dietary Instructions'
      ],
      price: 18000,
      duration: 'Same day',
      popular: true
    }
  ]

  const filteredPatients = patients.filter(p => 
    `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mobile?.includes(patientSearch) ||
    p.id?.toString().includes(patientSearch)
  )

  const filteredPackages = packages.filter(pkg => 
    activeCategory === 'all' || pkg.type === activeCategory
  )

  const generatePackageBill = () => {
    if (!selectedPatient || !selectedPackage) {
      alert('Please select both patient and package')
      return
    }

    const billData = {
      patient: selectedPatient,
      doctor: selectedDoctor,
      package: selectedPackage,
      total_amount: selectedPackage.price,
      bill_type: 'package',
      generated_at: new Date().toISOString()
    }

    console.log('Generating package bill:', billData)
    
    alert(`Package bill generated successfully!\nPackage: ${selectedPackage.name}\nAmount: ${formatCurrency(selectedPackage.price)}`)
    
    // Reset selections
    setSelectedPackage(null)
    setSelectedPatient(null)
    setSelectedDoctor(null)
    setPatientSearch('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Package className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900">Package Billing</h2>
        <span className="text-sm text-gray-500">Surgery, ward & daycare packages with fixed rates</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient & Doctor Selection */}
        <div className="lg:col-span-1 space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Select Patient
            </h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {selectedPatient ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">ID: {selectedPatient.id}</p>
                    <p className="text-sm text-gray-600">Mobile: {selectedPatient.mobile}</p>
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
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredPatients.slice(0, 6).map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="font-medium text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {patient.id} • {patient.mobile}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Doctor Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Doctor (Optional)</h3>
            <select 
              value={selectedDoctor?.id || ''}
              onChange={(e) => {
                const doctor = doctors.find(d => d.id === parseInt(e.target.value))
                setSelectedDoctor(doctor)
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select a doctor...</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.doctor_name} - {doctor.specialization}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Package Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Select Package</h3>
              
              {/* Category Filter */}
              <div className="flex gap-2">
                {[
                  { key: 'all', label: 'All', icon: Package },
                  { key: 'surgery', label: 'Surgery', icon: Scissors },
                  { key: 'ward', label: 'Ward', icon: Bed },
                  { key: 'daycare', label: 'Daycare', icon: Clock }
                ].map((category) => {
                  const Icon = category.icon
                  return (
                    <button
                      key={category.key}
                      onClick={() => setActiveCategory(category.key as any)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                        activeCategory === category.key
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {category.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors relative ${
                    selectedPackage?.id === pkg.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      pkg.type === 'surgery' ? 'bg-red-100 text-red-600' :
                      pkg.type === 'ward' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {pkg.type === 'surgery' ? <Scissors className="w-4 h-4" /> :
                       pkg.type === 'ward' ? <Bed className="w-4 h-4" /> :
                       <Clock className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {pkg.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {pkg.duration}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {pkg.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="text-sm font-medium text-gray-700">Inclusions:</div>
                    <div className="text-xs text-gray-600">
                      {pkg.inclusions.slice(0, 3).map((inclusion, i) => (
                        <div key={i}>• {inclusion}</div>
                      ))}
                      {pkg.inclusions.length > 3 && (
                        <div className="text-purple-600">+ {pkg.inclusions.length - 3} more...</div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-lg font-bold text-purple-600">
                      {formatCurrency(pkg.price)}
                    </span>
                    {selectedPackage?.id === pkg.id && (
                      <span className="text-sm text-purple-600 font-medium">Selected</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Package Details & Bill Generation */}
      {selectedPackage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Package Details</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">{selectedPackage.name}</h4>
                <p className="text-gray-600 mb-4">{selectedPackage.description}</p>
                
                <div className="space-y-2">
                  <div className="font-medium text-gray-700">Complete Inclusions:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedPackage.inclusions.map((inclusion, i) => (
                      <div key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                        {inclusion}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {formatCurrency(selectedPackage.price)}
                  </div>
                  <div className="text-sm text-gray-600">All Inclusive Package</div>
                </div>
              </div>
              
              <button
                onClick={generatePackageBill}
                disabled={!selectedPatient}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Receipt className="w-5 h-5" />
                Generate Package Bill
              </button>
              
              {!selectedPatient && (
                <p className="text-sm text-gray-500 text-center">Please select a patient first</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}