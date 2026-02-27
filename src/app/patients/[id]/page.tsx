'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, User, Phone, MapPin, Calendar, CreditCard, 
  Stethoscope, FileText, Activity, Pill, FlaskConical,
  Edit, Hospital, Bed, Clock, AlertCircle, CheckCircle,
  Shield, Building, Users, History, TrendingUp, Wallet,
  ClipboardList, Heart, Thermometer, Droplets
} from 'lucide-react'
import Link from 'next/link'
import { getPatientDetails, getPatientHistory } from '@/lib/patient-engine'

export default function PatientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const patientId = parseInt(params.id as string)
  
  const [patient, setPatient] = useState<any>(null)
  const [currentAdmission, setCurrentAdmission] = useState<any>(null)
  const [billing, setBilling] = useState({ total: 0, paid: 0, outstanding: 0 })
  const [history, setHistory] = useState<{
    admissions: any[]
    discharges: any[]
    appointments: any[]
    diagnoses: any[]
  }>({
    admissions: [],
    discharges: [],
    appointments: [],
    diagnoses: []
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (patientId) {
      loadPatientDetails()
      loadPatientHistory()
    }
  }, [patientId])

  const loadPatientDetails = async () => {
    try {
      const result = await getPatientDetails(patientId)
      if (result.success) {
        setPatient(result.patient)
        setCurrentAdmission(result.currentAdmission)
        setBilling(result.billing || { total: 0, paid: 0, outstanding: 0 })
      } else {
        setError(result.error || 'Unknown error occurred')
      }
    } catch (error) {
      setError('Failed to load patient details')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPatientHistory = async () => {
    try {
      const result = await getPatientHistory(patientId)
      if (result.success) {
        setHistory(result.history)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getDaysAdmitted = () => {
    if (!patient?.admission_date) return 0
    const admission = new Date(patient.admission_date)
    const today = new Date()
    return Math.ceil((today.getTime() - admission.getTime()) / (1000 * 3600 * 24))
  }

  const getPatientStatus = () => {
    if (patient?.admission_date && !patient?.discharge_date) {
      return { status: 'Active IPD', color: 'text-green-700 bg-green-100 border-green-200' }
    } else if (patient?.discharge_date) {
      return { status: 'Discharged', color: 'text-gray-700 bg-gray-100 border-gray-200' }
    } else {
      return { status: 'OPD Patient', color: 'text-blue-700 bg-blue-100 border-blue-200' }
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'vitals', label: 'Vitals', icon: Heart },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'lab', label: 'Lab Results', icon: FlaskConical },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'billing', label: 'Billing', icon: Wallet },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'history', label: 'History', icon: History }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading patient details...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient Not Found</h2>
          <p className="text-gray-600 mb-4">The requested patient could not be found.</p>
          <Link
            href="/patients"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Patients
          </Link>
        </div>
      </div>
    )
  }

  const patientStatus = getPatientStatus()
  const daysAdmitted = getDaysAdmitted()

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.full_name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span>UHID: {patient.uhid || patient.patient_id}</span>
                <span>•</span>
                <span>{patient.age}y {patient.sex}</span>
                <span>•</span>
                <span className={`px-2 py-1 rounded-full border text-xs font-medium ${patientStatus.color}`}>
                  {patientStatus.status}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Edit className="w-4 h-4" />
            Edit Patient
          </button>
          {patient.admission_date && !patient.discharge_date && (
            <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              <Hospital className="w-4 h-4" />
              Transfer Ward
            </button>
          )}
        </div>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Current Admission Info */}
        {patient.admission_date && !patient.discharge_date && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Bed className="w-5 h-5" />
              Current Admission
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Ward:</span>
                <span className="text-green-900 font-medium">
                  {patient.wards?.name || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Bed:</span>
                <span className="text-green-900 font-medium">
                  {patient.beds?.bed_number || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Doctor:</span>
                <span className="text-green-900 font-medium">
                  {patient.doctors?.doctor_name || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Admitted:</span>
                <span className="text-green-900 font-medium">
                  {formatDate(patient.admission_date)}
                </span>
              </div>
              {daysAdmitted > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-700">Days:</span>
                  <span className="text-green-900 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {daysAdmitted} days
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Info */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Contact Information
          </h3>
          <div className="space-y-2 text-sm">
            {patient.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{patient.phone}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 text-gray-400">@</span>
                <span>{patient.email}</span>
              </div>
            )}
            {patient.address_line1 && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <div>{patient.address_line1}</div>
                  {patient.address_line2 && <div>{patient.address_line2}</div>}
                  {patient.city && (
                    <div className="text-gray-500">
                      {patient.city}, {patient.state} {patient.pincode}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Billing Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Billing Summary
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Total Charges:</span>
              <span className="text-blue-900 font-medium">
                ₹{billing.total.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Paid Amount:</span>
              <span className="text-blue-900 font-medium">
                ₹{billing.paid.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-t border-blue-200 pt-2">
              <span className="text-blue-700 font-medium">Outstanding:</span>
              <span className={`font-medium ${billing.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{billing.outstanding.toLocaleString()}
              </span>
            </div>
            {patient.tariff_standards && (
              <div className="text-xs text-blue-600 mt-2">
                {patient.tariff_standards.name} ({patient.tariff_standards.type})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {patient.admission_date && !patient.discharge_date && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-900">Quick Actions</span>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-white border border-yellow-300 text-yellow-700 rounded text-sm hover:bg-yellow-50">
                Add Note
              </button>
              <button className="px-3 py-1.5 bg-white border border-yellow-300 text-yellow-700 rounded text-sm hover:bg-yellow-50">
                Order Lab
              </button>
              <button className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
                Discharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border rounded-lg">
        <div className="border-b">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500">Date of Birth:</span>
                        <div className="font-medium">{formatDate(patient.date_of_birth)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Blood Group:</span>
                        <div className="font-medium">{patient.blood_group || 'Not specified'}</div>
                      </div>
                    </div>
                    
                    {patient.aadhaar_number && (
                      <div>
                        <span className="text-gray-500">Aadhaar:</span>
                        <div className="font-medium">{patient.aadhaar_number}</div>
                      </div>
                    )}
                    
                    {patient.pan_number && (
                      <div>
                        <span className="text-gray-500">PAN:</span>
                        <div className="font-medium">{patient.pan_number}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Insurance Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    {patient.insurance_provider ? (
                      <>
                        <div>
                          <span className="text-gray-500">Provider:</span>
                          <div className="font-medium">{patient.insurance_provider}</div>
                        </div>
                        {patient.insurance_policy_number && (
                          <div>
                            <span className="text-gray-500">Policy Number:</span>
                            <div className="font-medium">{patient.insurance_policy_number}</div>
                          </div>
                        )}
                        {patient.insurance_tpa && (
                          <div>
                            <span className="text-gray-500">TPA:</span>
                            <div className="font-medium">{patient.insurance_tpa}</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-500 italic">No insurance information</div>
                    )}
                  </div>
                </div>
              </div>

              {patient.emergency_contact_name && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Emergency Contact
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <div className="font-medium">{patient.emergency_contact_name}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <div className="font-medium">{patient.emergency_contact_phone}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Relationship:</span>
                        <div className="font-medium">{patient.emergency_contact_relation}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(patient.allergies || patient.medical_history) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Medical Information
                  </h4>
                  <div className="space-y-4">
                    {patient.allergies && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="font-medium text-red-900">Known Allergies</span>
                        </div>
                        <div className="text-sm text-red-800">{patient.allergies}</div>
                      </div>
                    )}
                    
                    {patient.medical_history && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <span className="font-medium text-gray-900 block mb-2">Medical History</span>
                        <div className="text-sm text-gray-700">{patient.medical_history}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Vitals Tab */}
          {activeTab === 'vitals' && (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Vitals Monitoring</h3>
              <p className="text-gray-600 mb-4">Track patient vital signs and measurements</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Vitals Record
              </button>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Doctor Orders</h3>
              <p className="text-gray-600 mb-4">View and manage doctor orders and instructions</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add New Order
              </button>
            </div>
          )}

          {/* Lab Results Tab */}
          {activeTab === 'lab' && (
            <div className="text-center py-12">
              <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Laboratory Results</h3>
              <p className="text-gray-600 mb-4">View lab test results and reports</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Order Lab Tests
              </button>
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === 'prescriptions' && (
            <div className="text-center py-12">
              <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Prescriptions</h3>
              <p className="text-gray-600 mb-4">View current and past prescriptions</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Prescription
              </button>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-gray-900">Billing Details</h4>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add Charge
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-900">₹{billing.total.toLocaleString()}</div>
                  <div className="text-sm text-blue-700">Total Charges</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-900">₹{billing.paid.toLocaleString()}</div>
                  <div className="text-sm text-green-700">Amount Paid</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-900">₹{billing.outstanding.toLocaleString()}</div>
                  <div className="text-sm text-red-700">Outstanding</div>
                </div>
              </div>

              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-600">Detailed billing records will be displayed here</div>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Clinical Notes</h3>
              <p className="text-gray-600 mb-4">Add and view clinical notes and observations</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Note
              </button>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900">Patient History</h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Admission History */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Hospital className="w-4 h-4" />
                    Admission History ({history.admissions.length})
                  </h5>
                  {history.admissions.length > 0 ? (
                    <div className="space-y-3">
                      {history.admissions.slice(0, 5).map((admission, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm">
                              {admission.wards?.name} - Bed {admission.beds?.bed_number}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(admission.in_date)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Doctor: {admission.doctors?.doctor_name}
                          </div>
                          {admission.out_date && (
                            <div className="text-xs text-gray-600">
                              Discharged: {formatDate(admission.out_date)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm italic">No admission history</div>
                  )}
                </div>

                {/* Appointment History */}
                <div>
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Recent Appointments ({history.appointments.length})
                  </h5>
                  {history.appointments.length > 0 ? (
                    <div className="space-y-3">
                      {history.appointments.slice(0, 5).map((appointment, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm">
                              {appointment.doctors?.doctor_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(appointment.date)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Type: {appointment.appointment_type} • Status: {appointment.status}
                          </div>
                          {appointment.departments?.name && (
                            <div className="text-xs text-gray-600">
                              Department: {appointment.departments.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm italic">No appointment history</div>
                  )}
                </div>
              </div>

              {/* Diagnoses */}
              {history.diagnoses.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Recent Diagnoses ({history.diagnoses.length})
                  </h5>
                  <div className="space-y-2">
                    {history.diagnoses.slice(0, 5).map((diagnosis, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm">{diagnosis.diagnosis}</span>
                        <span className="text-xs text-gray-500">{formatDate(diagnosis.diagnosed_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}