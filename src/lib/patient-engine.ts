'use client'
import { supabase } from '@/lib/supabase'

export interface PatientRegistrationData {
  // Personal Details
  first_name: string
  last_name: string
  date_of_birth: string
  age?: number
  sex: string
  blood_group?: string
  
  // Contact Information
  phone: string
  email?: string
  address_line1: string
  address_line2?: string
  city: string
  state?: string
  pincode?: string
  
  // Government IDs
  aadhaar_number?: string
  pan_number?: string
  
  // Insurance Details
  insurance_provider?: string
  insurance_policy_number?: string
  insurance_tpa?: string
  
  // Emergency Contact
  emergency_contact_name?: string
  emergency_contact_phone?: string
  emergency_contact_relation?: string
  
  // Medical Information
  allergies?: string
  blood_pressure?: string
  diabetes?: string
  medical_history?: string
  
  // Administrative
  registration_fee?: number
  payment_mode?: string
  referred_by?: string
  referring_doctor_id?: number
  consultant_doctor_id?: number
  department_id?: number
  admission_type?: 'OPD' | 'IPD' | 'Emergency' | 'Daycare'
  tariff_standard_id?: number
  corporate_id?: number
}

export interface PatientAdmissionData {
  patientId: number
  wardId: number
  roomId: number
  bedId: number
  doctorId: number
  admissionType: 'IPD' | 'Emergency' | 'Daycare'
  tariff_standard_id?: number
  admission_reason?: string
  referring_doctor_id?: number
}

// Generate UHID in format: UHIDYYMMDD####
export function generateUHID(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  return `UHID${year}${month}${day}${random}`
}

// Register new patient
export async function registerNewPatient(data: PatientRegistrationData) {
  try {
    const uhid = generateUHID()
    const registrationDate = new Date().toISOString()
    const fullName = `${data.first_name} ${data.last_name}`
    
    // Calculate age if not provided
    let calculatedAge = data.age
    if (!calculatedAge && data.date_of_birth) {
      const today = new Date()
      const birthDate = new Date(data.date_of_birth)
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      calculatedAge = age
    }

    // Insert into patients table
    const patientData = {
      uhid,
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: fullName,
      date_of_birth: data.date_of_birth,
      age: calculatedAge,
      sex: data.sex,
      blood_group: data.blood_group,
      phone: data.phone,
      email: data.email,
      address_line1: data.address_line1,
      address_line2: data.address_line2,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      aadhaar_number: data.aadhaar_number,
      pan_number: data.pan_number,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_phone: data.emergency_contact_phone,
      emergency_contact_relation: data.emergency_contact_relation,
      allergies: data.allergies,
      blood_pressure: data.blood_pressure,
      diabetes: data.diabetes,
      medical_history: data.medical_history,
      registration_date: registrationDate,
      registration_fee: data.registration_fee || 100,
      payment_mode: data.payment_mode || 'cash',
      referred_by: data.referred_by,
      referring_doctor_id: data.referring_doctor_id,
      consultant_doctor_id: data.consultant_doctor_id,
      department_id: data.department_id,
      admission_type: data.admission_type || 'OPD',
      tariff_standard_id: data.tariff_standard_id,
      created_at: registrationDate,
      updated_at: registrationDate,
    }

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert(patientData)
      .select()
      .single()

    if (patientError) throw patientError

    // Also insert into patients_full for extended data
    const patientFullData = {
      ...patientData,
      patient_id: patient.id,
      insurance_provider: data.insurance_provider,
      insurance_policy_number: data.insurance_policy_number,
      insurance_tpa: data.insurance_tpa,
      corporate_id: data.corporate_id,
    }

    const { error: patientFullError } = await supabase
      .from('patients_full')
      .insert(patientFullData)

    if (patientFullError) throw patientFullError

    return {
      success: true,
      patient,
      uhid,
      message: `Patient registered successfully with UHID: ${uhid}`
    }
  } catch (error) {
    console.error('Error registering patient:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Admit patient to IPD
export async function admitPatient(data: PatientAdmissionData) {
  try {
    const admissionDate = new Date().toISOString()
    
    // Update patient record with admission details
    const { error: updateError } = await supabase
      .from('patients')
      .update({
        admission_date: admissionDate,
        ward_id: data.wardId,
        room_id: data.roomId,
        bed_id: data.bedId,
        doctor_id: data.doctorId,
        admission_type: data.admissionType,
        tariff_standard_id: data.tariff_standard_id,
        updated_at: admissionDate
      })
      .eq('id', data.patientId)

    if (updateError) throw updateError

    // Insert ward_patients record
    const { error: wardPatientError } = await supabase
      .from('ward_patients')
      .insert({
        patient_id: data.patientId,
        ward_id: data.wardId,
        room_id: data.roomId,
        bed_id: data.bedId,
        doctor_id: data.doctorId,
        in_date: admissionDate,
        admission_reason: data.admission_reason,
        referring_doctor_id: data.referring_doctor_id,
        created_at: admissionDate
      })

    if (wardPatientError) throw wardPatientError

    // Mark bed as occupied
    const { error: bedError } = await supabase
      .from('beds')
      .update({
        status: 'occupied',
        patient_id: data.patientId,
        updated_at: admissionDate
      })
      .eq('id', data.bedId)

    if (bedError) throw bedError

    return {
      success: true,
      message: 'Patient admitted successfully to IPD'
    }
  } catch (error) {
    console.error('Error admitting patient:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Search patients
export async function searchPatients(query: string) {
  try {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        patients: []
      }
    }

    const searchTerm = `%${query.trim()}%`
    
    // Search in both patients and patients_full tables
    const { data: patients, error } = await supabase
      .from('patients_full')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name),
        wards:ward_id(id, name),
        rooms:room_id(id, name),
        beds:bed_id(id, bed_number),
        departments:department_id(id, name)
      `)
      .or(`uhid.ilike.${searchTerm},full_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
      .limit(50)

    if (error) throw error

    return {
      success: true,
      patients: patients || []
    }
  } catch (error) {
    console.error('Error searching patients:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      patients: []
    }
  }
}

// Get patient details
export async function getPatientDetails(patientId: number) {
  try {
    const { data: patient, error } = await supabase
      .from('patients_full')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name, department_id),
        wards:ward_id(id, name, floor, description),
        rooms:room_id(id, name, room_type, ward_id),
        beds:bed_id(id, bed_number, status),
        departments:department_id(id, name),
        tariff_standards:tariff_standard_id(id, name, type),
        corporate:corporate_id(id, name)
      `)
      .eq('id', patientId)
      .single()

    if (error) throw error

    // Get current ward_patients record if admitted
    let currentAdmission = null
    if (patient.admission_date && !patient.discharge_date) {
      const { data: admission } = await supabase
        .from('ward_patients')
        .select(`
          *,
          doctors:doctor_id(id, doctor_name),
          wards:ward_id(id, name),
          rooms:room_id(id, name),
          beds:bed_id(id, bed_number)
        `)
        .eq('patient_id', patientId)
        .is('out_date', null)
        .single()
      
      currentAdmission = admission
    }

    // Get billing summary
    const { data: billings } = await supabase
      .from('billings')
      .select('*')
      .eq('patient_id', patientId)

    const billingTotal = billings?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0
    const paidAmount = billings?.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0) || 0

    return {
      success: true,
      patient,
      currentAdmission,
      billing: {
        total: billingTotal,
        paid: paidAmount,
        outstanding: billingTotal - paidAmount
      }
    }
  } catch (error) {
    console.error('Error getting patient details:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Update patient details
export async function updatePatient(patientId: number, data: Partial<PatientRegistrationData>) {
  try {
    const updateDate = new Date().toISOString()
    
    // Update patients table
    const { error: patientsError } = await supabase
      .from('patients')
      .update({
        ...data,
        full_name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : undefined,
        updated_at: updateDate
      })
      .eq('id', patientId)

    if (patientsError) throw patientsError

    // Update patients_full table
    const { error: patientsFullError } = await supabase
      .from('patients_full')
      .update({
        ...data,
        full_name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : undefined,
        updated_at: updateDate
      })
      .eq('patient_id', patientId)

    if (patientsFullError) throw patientsFullError

    return {
      success: true,
      message: 'Patient updated successfully'
    }
  } catch (error) {
    console.error('Error updating patient:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Get patient history
export async function getPatientHistory(patientId: number) {
  try {
    // Get admission history
    const { data: admissions, error: admissionsError } = await supabase
      .from('ward_patients')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name),
        wards:ward_id(id, name),
        rooms:room_id(id, name),
        beds:bed_id(id, bed_number)
      `)
      .eq('patient_id', patientId)
      .order('in_date', { ascending: false })

    if (admissionsError) throw admissionsError

    // Get discharge summaries
    const { data: discharges, error: dischargesError } = await supabase
      .from('discharge_summaries')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name)
      `)
      .eq('patient_id', patientId)
      .order('discharge_date', { ascending: false })

    if (dischargesError) throw dischargesError

    // Get appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name),
        departments:department_id(id, name)
      `)
      .eq('patient_id', patientId)
      .order('date', { ascending: false })

    if (appointmentsError) throw appointmentsError

    // Get diagnoses
    const { data: diagnoses, error: diagnosesError } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (diagnosesError) throw diagnosesError

    return {
      success: true,
      history: {
        admissions: admissions || [],
        discharges: discharges || [],
        appointments: appointments || [],
        diagnoses: diagnoses || []
      }
    }
  } catch (error) {
    console.error('Error getting patient history:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      history: {
        admissions: [],
        discharges: [],
        appointments: [],
        diagnoses: []
      }
    }
  }
}

// Get available beds for admission
export async function getAvailableBeds(wardId?: number) {
  try {
    let query = supabase
      .from('beds')
      .select(`
        *,
        rooms:room_id(id, name, ward_id),
        wards:rooms(ward_id(id, name))
      `)
      .eq('status', 'available')

    if (wardId) {
      query = query.eq('rooms.ward_id', wardId)
    }

    const { data: beds, error } = await query.order('bed_number')

    if (error) throw error

    return {
      success: true,
      beds: beds || []
    }
  } catch (error) {
    console.error('Error getting available beds:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      beds: []
    }
  }
}

// Get master data for dropdowns
export async function getMasterData() {
  try {
    const [
      { data: doctors },
      { data: departments },
      { data: wards },
      { data: rooms },
      { data: tariffStandards },
      { data: corporates }
    ] = await Promise.all([
      supabase.from('doctors').select('*').order('doctor_name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('wards').select('*').order('name'),
      supabase.from('rooms').select('*').order('name'),
      supabase.from('tariff_standards').select('*').order('name'),
      supabase.from('corporates').select('*').order('name')
    ])

    return {
      success: true,
      data: {
        doctors: doctors || [],
        departments: departments || [],
        wards: wards || [],
        rooms: rooms || [],
        tariffStandards: tariffStandards || [],
        corporates: corporates || []
      }
    }
  } catch (error) {
    console.error('Error getting master data:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: {
        doctors: [],
        departments: [],
        wards: [],
        rooms: [],
        tariffStandards: [],
        corporates: []
      }
    }
  }
}