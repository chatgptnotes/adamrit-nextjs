'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  UserPlus, Upload, Camera, CreditCard, User, Phone, MapPin, 
  Calendar, Building, Stethoscope, FileText, AlertCircle,
  Hospital, Bed, Users, Shield
} from 'lucide-react'
import { registerNewPatient, getMasterData, getAvailableBeds } from '@/lib/patient-engine'

export default function NewPatientRegistration() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
  
  const [formData, setFormData] = useState({
    // Personal Details
    first_name: '',
    last_name: '',
    date_of_birth: '',
    age: '',
    sex: '',
    blood_group: '',
    
    // Contact Information
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    
    // Government IDs
    aadhaar_number: '',
    pan_number: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    
    // Medical Information
    allergies: '',
    blood_pressure: '',
    diabetes: '',
    medical_history: '',
    
    // Clinical Details
    referring_doctor_id: '',
    consultant_doctor_id: '',
    department_id: '',
    admission_type: 'OPD',
    
    // IPD Details (shown when admission_type is IPD)
    ward_id: '',
    room_id: '',
    bed_id: '',
    
    // Administrative
    tariff_standard_id: '',
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_tpa: '',
    corporate_id: '',
    registration_fee: '100',
    payment_mode: 'cash',
    referred_by: ''
  })

  // Load master data on component mount
  useEffect(() => {
    loadMasterData()
  }, [])

  // Load available beds when ward changes
  useEffect(() => {
    if (formData.ward_id && formData.admission_type === 'IPD') {
      loadAvailableBeds()
      filterRoomsByWard()
    }
  }, [formData.ward_id, formData.admission_type])

  // Filter beds when room changes
  useEffect(() => {
    if (formData.room_id) {
      filterBedsByRoom()
    }
  }, [formData.room_id, availableBeds])

  const loadMasterData = async () => {
    const result = await getMasterData()
    if (result.success) {
      setMasterData(result.data)
    }
  }

  const loadAvailableBeds = async () => {
    const result = await getAvailableBeds(formData.ward_id ? parseInt(formData.ward_id) : undefined)
    if (result.success) {
      setAvailableBeds(result.beds)
    }
  }

  const filterRoomsByWard = () => {
    if (!formData.ward_id) {
      setFilteredRooms([])
      return
    }
    
    const wardRooms = masterData.rooms.filter(room => room.ward_id == formData.ward_id)
    setFilteredRooms(wardRooms)
  }

  const filterBedsByRoom = () => {
    if (!formData.room_id) {
      setFilteredBeds([])
      return
    }
    
    const roomBeds = availableBeds.filter((bed: any) => bed.room_id == formData.room_id)
    setFilteredBeds(roomBeds)
  }

  // Auto-calculate age from date of birth
  const handleDateOfBirthChange = (dob: string) => {
    let calculatedAge = ''
    if (dob) {
      const today = new Date()
      const birthDate = new Date(dob)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      calculatedAge = age.toString()
    }
    
    setFormData({
      ...formData,
      date_of_birth: dob,
      age: calculatedAge
    })
  }

  const handleWardChange = (wardId: string) => {
    setFormData({
      ...formData,
      ward_id: wardId,
      room_id: '',
      bed_id: ''
    })
  }

  const handleRoomChange = (roomId: string) => {
    setFormData({
      ...formData,
      room_id: roomId,
      bed_id: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Validate required fields
      if (!formData.first_name || !formData.last_name || !formData.phone || !formData.sex) {
        alert('Please fill in all required fields')
        return
      }

      // If IPD admission, validate ward/room/bed selection
      if (formData.admission_type === 'IPD') {
        if (!formData.ward_id || !formData.room_id || !formData.bed_id) {
          alert('Please select ward, room, and bed for IPD admission')
          return
        }
      }

      // Prepare registration data
      const registrationData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        age: parseInt(formData.age) || undefined,
        sex: formData.sex,
        blood_group: formData.blood_group,
        phone: formData.phone,
        email: formData.email,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        aadhaar_number: formData.aadhaar_number,
        pan_number: formData.pan_number,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relation: formData.emergency_contact_relation,
        allergies: formData.allergies,
        blood_pressure: formData.blood_pressure,
        diabetes: formData.diabetes,
        medical_history: formData.medical_history,
        referring_doctor_id: formData.referring_doctor_id ? parseInt(formData.referring_doctor_id) : undefined,
        consultant_doctor_id: formData.consultant_doctor_id ? parseInt(formData.consultant_doctor_id) : undefined,
        department_id: formData.department_id ? parseInt(formData.department_id) : undefined,
        admission_type: formData.admission_type as 'OPD' | 'IPD' | 'Emergency' | 'Daycare',
        tariff_standard_id: formData.tariff_standard_id ? parseInt(formData.tariff_standard_id) : undefined,
        insurance_provider: formData.insurance_provider,
        insurance_policy_number: formData.insurance_policy_number,
        insurance_tpa: formData.insurance_tpa,
        corporate_id: formData.corporate_id ? parseInt(formData.corporate_id) : undefined,
        registration_fee: parseInt(formData.registration_fee),
        payment_mode: formData.payment_mode,
        referred_by: formData.referred_by
      }

      const result = await registerNewPatient(registrationData)
      
      if (result.success) {
        alert(`${result.message}\nUHID: ${result.uhid}`)
        router.push(`/patients/${result.patient.id}`)
      } else {
        alert(`Registration failed: ${result.error}`)
      }
      
    } catch (error) {
      console.error('Error registering patient:', error)
      alert('Error registering patient. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Patient Registration</h1>
          <p className="text-sm text-gray-500">Complete patient registration form with admission details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl space-y-8">
        {/* Personal Information */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sex <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sex}
                onChange={(e) => setFormData({...formData, sex: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input
                type="number"
                value={formData.age}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({...formData, blood_group: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Street address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
              <input
                type="text"
                value={formData.address_line2}
                onChange={(e) => setFormData({...formData, address_line2: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Apartment, suite, etc."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                pattern="[0-9]{6}"
              />
            </div>
          </div>
        </div>

        {/* Government IDs */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Government IDs
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number</label>
              <input
                type="text"
                value={formData.aadhaar_number}
                onChange={(e) => setFormData({...formData, aadhaar_number: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                pattern="[0-9]{12}"
                placeholder="1234 5678 9012"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
              <input
                type="text"
                value={formData.pan_number}
                onChange={(e) => setFormData({...formData, pan_number: e.target.value.toUpperCase()})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                placeholder="ABCDE1234F"
              />
            </div>
          </div>
        </div>

        {/* Clinical Details */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Clinical Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Referring Doctor</label>
              <select
                value={formData.referring_doctor_id}
                onChange={(e) => setFormData({...formData, referring_doctor_id: e.target.value})}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Consultant</label>
              <select
                value={formData.consultant_doctor_id}
                onChange={(e) => setFormData({...formData, consultant_doctor_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Consultant</option>
                {masterData.doctors.map(doctor => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.doctor_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({...formData, department_id: e.target.value})}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admission Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.admission_type}
                onChange={(e) => setFormData({...formData, admission_type: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="OPD">OPD</option>
                <option value="IPD">IPD</option>
                <option value="Emergency">Emergency</option>
                <option value="Daycare">Daycare</option>
              </select>
            </div>
          </div>
        </div>

        {/* IPD Details - Show only when admission type is IPD */}
        {formData.admission_type === 'IPD' && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bed className="w-5 h-5 text-blue-600" />
              IPD Admission Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ward <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.ward_id}
                  onChange={(e) => handleWardChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={formData.admission_type === 'IPD'}
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
                  value={formData.room_id}
                  onChange={(e) => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={formData.admission_type === 'IPD'}
                  disabled={!formData.ward_id}
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
                  value={formData.bed_id}
                  onChange={(e) => setFormData({...formData, bed_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required={formData.admission_type === 'IPD'}
                  disabled={!formData.room_id}
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

            {formData.ward_id && filteredBeds.length === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">No available beds in selected room. Please choose a different room.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Administrative Details */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Administrative Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tariff Standard</label>
              <select
                value={formData.tariff_standard_id}
                onChange={(e) => setFormData({...formData, tariff_standard_id: e.target.value})}
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
                value={formData.corporate_id}
                onChange={(e) => setFormData({...formData, corporate_id: e.target.value})}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
              <select
                value={formData.insurance_provider}
                onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
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
                value={formData.insurance_policy_number}
                onChange={(e) => setFormData({...formData, insurance_policy_number: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">TPA</label>
              <input
                type="text"
                value={formData.insurance_tpa}
                onChange={(e) => setFormData({...formData, insurance_tpa: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Medi Assist"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Emergency Contact
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
              <input
                type="text"
                value={formData.emergency_contact_name}
                onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.emergency_contact_phone}
                onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
              <select
                value={formData.emergency_contact_relation}
                onChange={(e) => setFormData({...formData, emergency_contact_relation: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Known Allergies</label>
              <textarea
                value={formData.allergies}
                onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="List any known allergies..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
              <textarea
                value={formData.medical_history}
                onChange={(e) => setFormData({...formData, medical_history: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Previous surgeries, chronic conditions..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Pressure History</label>
              <select
                value={formData.blood_pressure}
                onChange={(e) => setFormData({...formData, blood_pressure: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                <option value="Normal">Normal</option>
                <option value="High">High (Hypertension)</option>
                <option value="Low">Low (Hypotension)</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Diabetes History</label>
              <select
                value={formData.diabetes}
                onChange={(e) => setFormData({...formData, diabetes: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                <option value="No">No</option>
                <option value="Type 1">Type 1</option>
                <option value="Type 2">Type 2</option>
                <option value="Gestational">Gestational</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Registering...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Register Patient
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}