'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Hospital, Search, User, UserPlus, ArrowRight,
  Bed, Stethoscope, Shield, Building, FileText,
  Clock, AlertCircle, CheckCircle, Phone
} from 'lucide-react'
import { searchPatients, admitPatient, getMasterData, getAvailableBeds } from '@/lib/patient-engine'

export default function PatientAdmissionPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Search Patient, 2: Admission Details
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [admissionLoading, setAdmissionLoading] = useState(false)
  
  const [masterData, setMasterData] = useState<{
    doctors: any[]
    departments: any[]
    wards: any[]
    rooms: any[]
    tariffStandards: any[]
    corporates: any[]
  }>({
    doctors: [],
    departments: [],
    wards: [],
    rooms: [],
    tariffStandards: [],
    corporates: []
  })
  
  const [availableBeds, setAvailableBeds] = useState<any[]>([])
  const [filteredRooms, setFilteredRooms] = useState<any[]>([])
  const [filteredBeds, setFilteredBeds] = useState<any[]>([])
  
  const [admissionData, setAdmissionData] = useState({
    admissionType: 'IPD',
    wardId: '',
    roomId: '',
    bedId: '',
    doctorId: '',
    departmentId: '',
    tariffStandardId: '',
    admissionReason: '',
    referringDoctorId: '',
    // Insurance updates
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceTpa: '',
    corporateId: ''
  })

  useEffect(() => {
    loadMasterData()
  }, [])

  useEffect(() => {
    if (admissionData.wardId) {
      loadAvailableBeds()
      filterRoomsByWard()
    }
  }, [admissionData.wardId])

  useEffect(() => {
    if (admissionData.roomId) {
      filterBedsByRoom()
    }
  }, [admissionData.roomId, availableBeds])

  const loadMasterData = async () => {
    const result = await getMasterData()
    if (result.success) {
      setMasterData(result.data)
    }
  }

  const loadAvailableBeds = async () => {
    const result = await getAvailableBeds(admissionData.wardId ? parseInt(admissionData.wardId) : undefined)
    if (result.success) {
      setAvailableBeds(result.beds)
    }
  }

  const filterRoomsByWard = () => {
    if (!admissionData.wardId) {
      setFilteredRooms([])
      return
    }
    
    const wardRooms = masterData.rooms.filter(room => room.ward_id == admissionData.wardId)
    setFilteredRooms(wardRooms)
  }

  const filterBedsByRoom = () => {
    if (!admissionData.roomId) {
      setFilteredBeds([])
      return
    }
    
    const roomBeds = availableBeds.filter((bed: any) => bed.room_id == admissionData.roomId)
    setFilteredBeds(roomBeds)
  }

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return
    
    setSearchLoading(true)
    try {
      const result = await searchPatients(searchQuery)
      if (result.success) {
        setSearchResults(result.patients)
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Error searching patients')
    } finally {
      setSearchLoading(false)
    }
  }

  const selectPatient = (patient: any) => {
    setSelectedPatient(patient)
    // Pre-fill some admission data from patient record
    if (patient.doctors?.id) {
      setAdmissionData(prev => ({ ...prev, doctorId: patient.doctors.id.toString() }))
    }
    if (patient.departments?.id) {
      setAdmissionData(prev => ({ ...prev, departmentId: patient.departments.id.toString() }))
    }
    if (patient.tariff_standards?.id) {
      setAdmissionData(prev => ({ ...prev, tariffStandardId: patient.tariff_standards.id.toString() }))
    }
    if (patient.insurance_provider) {
      setAdmissionData(prev => ({ 
        ...prev, 
        insuranceProvider: patient.insurance_provider,
        insurancePolicyNumber: patient.insurance_policy_number || '',
        insuranceTpa: patient.insurance_tpa || ''
      }))
    }
    if (patient.corporate_id) {
      setAdmissionData(prev => ({ ...prev, corporateId: patient.corporate_id.toString() }))
    }
    
    setStep(2)
  }

  const handleWardChange = (wardId: string) => {
    setAdmissionData({
      ...admissionData,
      wardId,
      roomId: '',
      bedId: ''
    })
  }

  const handleRoomChange = (roomId: string) => {
    setAdmissionData({
      ...admissionData,
      roomId,
      bedId: ''
    })
  }

  const handleAdmission = async () => {
    if (!selectedPatient) return
    
    // Validate required fields
    if (!admissionData.wardId || !admissionData.roomId || !admissionData.bedId || !admissionData.doctorId) {
      alert('Please fill in all required fields (Ward, Room, Bed, Doctor)')
      return
    }

    setAdmissionLoading(true)
    
    try {
      const result = await admitPatient({
        patientId: selectedPatient.id,
        wardId: parseInt(admissionData.wardId),
        roomId: parseInt(admissionData.roomId),
        bedId: parseInt(admissionData.bedId),
        doctorId: parseInt(admissionData.doctorId),
        admissionType: admissionData.admissionType as any,
        tariff_standard_id: admissionData.tariffStandardId ? parseInt(admissionData.tariffStandardId) : undefined,
        admission_reason: admissionData.admissionReason,
        referring_doctor_id: admissionData.referringDoctorId ? parseInt(admissionData.referringDoctorId) : undefined
      })

      if (result.success) {
        alert('Patient admitted successfully!')
        router.push(`/patients/${selectedPatient.id}`)
      } else {
        alert(`Admission failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Admission error:', error)
      alert('Error admitting patient')
    } finally {
      setAdmissionLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600">
          <Hospital className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Admission</h1>
          <p className="text-sm text-gray-500">
            {step === 1 ? 'Search and select patient for admission' : 'Complete admission details and bed assignment'}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>
              {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <span className="ml-2 font-medium">Search Patient</span>
          </div>
          
          <div className={`mx-4 h-1 w-16 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>
              2
            </div>
            <span className="ml-2 font-medium">Admission Details</span>
          </div>
        </div>
      </div>

      {/* Step 1: Search Patient */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Existing Patient</h3>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, UHID, or mobile number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={searchLoading || searchQuery.trim().length < 2}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Search Results ({searchResults.length})</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((patient) => (
                    <div
                      key={patient.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => selectPatient(patient)}
                    >
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
                              UHID: {patient.uhid || patient.patient_id} • {patient.age}y {patient.sex}
                            </div>
                            {patient.phone && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {patient.phone}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            Registered: {formatDate(patient.registration_date)}
                          </div>
                          {patient.admission_date && !patient.discharge_date ? (
                            <div className="text-sm text-red-600 font-medium">
                              Currently Admitted
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-blue-600">
                              <span className="text-sm">Select for Admission</span>
                              <ArrowRight className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Show warning if patient is already admitted */}
                      {patient.admission_date && !patient.discharge_date && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-800 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            <span>
                              Patient is currently admitted in {patient.wards?.name} - Bed {patient.beds?.bed_number}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchLoading && (
              <div className="text-center py-8 text-gray-500">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div>No patients found for "{searchQuery}"</div>
                <div className="text-sm mt-1">Try a different search term or register a new patient</div>
              </div>
            )}
          </div>

          {/* Register New Patient Option */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Patient Not Found?</h3>
                <p className="text-sm text-blue-700 mt-1">Register a new patient and admit them directly</p>
              </div>
              <button
                onClick={() => router.push('/patients/new')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <UserPlus className="w-4 h-4" />
                New Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Admission Details */}
      {step === 2 && selectedPatient && (
        <div className="space-y-6">
          {/* Selected Patient Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-3">Selected Patient</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-green-900">{selectedPatient.full_name}</div>
                <div className="text-sm text-green-700">
                  UHID: {selectedPatient.uhid || selectedPatient.patient_id} • {selectedPatient.age}y {selectedPatient.sex}
                </div>
                {selectedPatient.phone && (
                  <div className="text-sm text-green-700">{selectedPatient.phone}</div>
                )}
              </div>
              <button
                onClick={() => setStep(1)}
                className="ml-auto text-green-700 hover:text-green-900 text-sm"
              >
                Change Patient
              </button>
            </div>
          </div>

          {/* Admission Form */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Admission Details</h3>
            
            <div className="space-y-6">
              {/* Admission Type & Doctor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admission Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={admissionData.admissionType}
                    onChange={(e) => setAdmissionData({...admissionData, admissionType: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="IPD">IPD (Inpatient)</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Daycare">Daycare</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attending Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={admissionData.doctorId}
                    onChange={(e) => setAdmissionData({...admissionData, doctorId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Doctor</option>
                    {masterData.doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.doctor_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department & Referring Doctor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={admissionData.departmentId}
                    onChange={(e) => setAdmissionData({...admissionData, departmentId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {masterData.departments.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Referring Doctor</label>
                  <select
                    value={admissionData.referringDoctorId}
                    onChange={(e) => setAdmissionData({...admissionData, referringDoctorId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Referring Doctor</option>
                    {masterData.doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.doctor_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ward, Room, Bed Selection */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-medium text-blue-900 mb-4 flex items-center gap-2">
                  <Bed className="w-5 h-5" />
                  Bed Assignment
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ward <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={admissionData.wardId}
                      onChange={(e) => handleWardChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Ward</option>
                      {masterData.wards.map((ward: any) => (
                        <option key={ward.id} value={ward.id}>
                          {ward.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={admissionData.roomId}
                      onChange={(e) => handleRoomChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!admissionData.wardId}
                    >
                      <option value="">Select Room</option>
                      {filteredRooms.map((room: any) => (
                        <option key={room.id} value={room.id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bed <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={admissionData.bedId}
                      onChange={(e) => setAdmissionData({...admissionData, bedId: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!admissionData.roomId}
                    >
                      <option value="">Select Bed</option>
                      {filteredBeds.map((bed: any) => (
                        <option key={bed.id} value={bed.id}>
                          Bed {bed.bed_number}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {admissionData.wardId && filteredBeds.length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">No available beds in selected room. Please choose a different room.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tariff & Insurance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tariff Standard</label>
                  <select
                    value={admissionData.tariffStandardId}
                    onChange={(e) => setAdmissionData({...admissionData, tariffStandardId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Tariff Standard</option>
                    {masterData.tariffStandards.map(tariff => (
                      <option key={tariff.id} value={tariff.id}>
                        {tariff.name} ({tariff.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Corporate</label>
                  <select
                    value={admissionData.corporateId}
                    onChange={(e) => setAdmissionData({...admissionData, corporateId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Corporate (if applicable)</option>
                    {masterData.corporates.map(corp => (
                      <option key={corp.id} value={corp.id}>
                        {corp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Insurance Updates */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Insurance Information
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                    <select
                      value={admissionData.insuranceProvider}
                      onChange={(e) => setAdmissionData({...admissionData, insuranceProvider: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Insurance</option>
                      <option value="ESIC">ESIC</option>
                      <option value="CGHS">CGHS</option>
                      <option value="PMJAY">PM-JAY</option>
                      <option value="Star Health">Star Health</option>
                      <option value="HDFC ERGO">HDFC ERGO</option>
                      <option value="Bajaj Allianz">Bajaj Allianz</option>
                      <option value="Other">Other</option>
                      <option value="Self Pay">Self Pay</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Policy Number</label>
                    <input
                      type="text"
                      value={admissionData.insurancePolicyNumber}
                      onChange={(e) => setAdmissionData({...admissionData, insurancePolicyNumber: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">TPA</label>
                    <input
                      type="text"
                      value={admissionData.insuranceTpa}
                      onChange={(e) => setAdmissionData({...admissionData, insuranceTpa: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Medi Assist"
                    />
                  </div>
                </div>
              </div>

              {/* Admission Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admission Reason</label>
                <textarea
                  value={admissionData.admissionReason}
                  onChange={(e) => setAdmissionData({...admissionData, admissionReason: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Brief reason for admission..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Search
            </button>
            
            <button
              onClick={handleAdmission}
              disabled={admissionLoading || !admissionData.wardId || !admissionData.bedId || !admissionData.doctorId}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {admissionLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Admitting...
                </>
              ) : (
                <>
                  <Hospital className="w-4 h-4" />
                  Admit Patient
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}