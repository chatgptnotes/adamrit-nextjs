import { supabase } from './supabase'

// Types for billing calculations
export interface BillBreakdown {
  wardCharges: number
  nursingCharges: number
  doctorCharges: number
  registrationCharges: number
  consultantCharges: number
  labCharges: number
  radiologyCharges: number
  pharmacyCharges: number
  surgeryCharges: number
  anesthesiaCharges: number
  otherCharges: number
  totalCharges: number
}

export interface PatientInfo {
  id: number
  first_name: string
  last_name: string
  ipd_number?: string
  admission_date?: string
  discharge_date?: string
  location_id?: number
  tariff_standard_id?: number
  hospital_type?: 'NABH' | 'NON_NABH'
}

// Main function to calculate total bill for a patient
export async function calculateTotalBill(patientId: number): Promise<BillBreakdown> {
  const patient = await getPatientInfo(patientId)
  if (!patient) {
    throw new Error('Patient not found')
  }

  const totalDays = calculateAdmissionDays(patient.admission_date, patient.discharge_date)
  const isNabh = patient.hospital_type === 'NABH' || patient.location_id === 2
  const tariffStandardId = patient.tariff_standard_id || 1

  const [
    wardCharges,
    nursingCharges,
    doctorCharges,
    labCharges,
    pharmacyCharges,
    surgeryCharges
  ] = await Promise.all([
    calculateWardCharges(patientId),
    calculateNursingCharges(patientId, tariffStandardId),
    calculateDoctorCharges(totalDays, patient.hospital_type || 'NON_NABH', tariffStandardId),
    calculateLabCharges(patientId, tariffStandardId, isNabh),
    calculatePharmacyTotal(patientId),
    calculateSurgeryCharges(patientId, tariffStandardId)
  ])

  // Fixed charges (to be configured via configurations table)
  const registrationCharges = await getConfigurationAmount('registration_charge') || 100
  const consultantCharges = await getConfigurationAmount('consultant_charge') || 500

  const radiologyCharges = await calculateRadiologyCharges(patientId, tariffStandardId, isNabh)
  const anesthesiaCharges = surgeryCharges * 0.15 // 15% of surgery charges typically
  const otherCharges = await calculateOtherCharges(patientId)

  const totalCharges = wardCharges + nursingCharges + doctorCharges + 
    registrationCharges + consultantCharges + labCharges + 
    radiologyCharges + pharmacyCharges + surgeryCharges + 
    anesthesiaCharges + otherCharges

  return {
    wardCharges,
    nursingCharges,
    doctorCharges,
    registrationCharges,
    consultantCharges,
    labCharges,
    radiologyCharges,
    pharmacyCharges,
    surgeryCharges,
    anesthesiaCharges,
    otherCharges,
    totalCharges
  }
}

// Calculate ward charges based on patient transfers and days stayed
export async function calculateWardCharges(patientId: number): Promise<number> {
  const { data: wardHistory } = await supabase
    .from('ward_patients')
    .select(`
      *,
      ward:wards(name, ward_type),
      tariff:tariff_standards(ward_ac_rate, ward_non_ac_rate, ward_deluxe_rate, ward_icu_rate)
    `)
    .eq('patient_id', patientId)
    .order('in_date', { ascending: true })

  if (!wardHistory || wardHistory.length === 0) return 0

  let totalWardCharges = 0

  for (const wardStay of wardHistory) {
    const inDate = new Date(wardStay.in_date)
    const outDate = wardStay.out_date ? new Date(wardStay.out_date) : new Date()
    const days = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24))

    let dailyRate = 0
    const wardType = wardStay.ward?.ward_type?.toLowerCase()

    // Get rate based on ward type from tariff standards
    if (wardType?.includes('icu')) {
      dailyRate = wardStay.tariff?.ward_icu_rate || 2000
    } else if (wardType?.includes('deluxe')) {
      dailyRate = wardStay.tariff?.ward_deluxe_rate || 1500
    } else if (wardType?.includes('ac')) {
      dailyRate = wardStay.tariff?.ward_ac_rate || 1200
    } else {
      dailyRate = wardStay.tariff?.ward_non_ac_rate || 800
    }

    totalWardCharges += days * dailyRate
  }

  return totalWardCharges
}

// Calculate nursing charges from service bills
export async function calculateNursingCharges(patientId: number, tariffStandardId: number): Promise<number> {
  const { data: serviceBills } = await supabase
    .from('service_bills')
    .select(`
      *,
      service:services(name),
      tariff:tariff_amounts!inner(*)
    `)
    .eq('patient_id', patientId)
    .eq('tariff.tariff_standard_id', tariffStandardId)
    .eq('tariff.category', 'nursing')

  if (!serviceBills || serviceBills.length === 0) return 0

  let totalNursingCharges = 0

  for (const bill of serviceBills) {
    const quantity = bill.quantity || 1
    const rate = bill.tariff?.non_nabh_charges || bill.tariff?.nabh_charges || 0
    totalNursingCharges += quantity * rate
  }

  return totalNursingCharges
}

// Calculate doctor charges per day
export async function calculateDoctorCharges(
  totalDays: number, 
  hospitalType: 'NABH' | 'NON_NABH', 
  tariffStandardId: number
): Promise<number> {
  const { data: tariffData } = await supabase
    .from('tariff_amounts')
    .select('*')
    .eq('tariff_standard_id', tariffStandardId)
    .eq('category', 'doctor')
    .single()

  if (!tariffData) return totalDays * 500 // Default rate

  const dailyRate = hospitalType === 'NABH' 
    ? (tariffData.nabh_charges || 800)
    : (tariffData.non_nabh_charges || 600)

  return totalDays * dailyRate
}

// Calculate laboratory charges
export async function calculateLabCharges(
  patientId: number, 
  tariffStandardId: number, 
  isNabh: boolean
): Promise<number> {
  const { data: labOrders } = await supabase
    .from('laboratory_tokens')
    .select(`
      *,
      tariff:tariff_amounts!inner(*)
    `)
    .eq('patient_id', patientId)
    .eq('tariff.tariff_standard_id', tariffStandardId)
    .eq('tariff.category', 'laboratory')

  if (!labOrders || labOrders.length === 0) return 0

  let totalLabCharges = 0

  for (const order of labOrders) {
    const rate = isNabh 
      ? (order.tariff?.nabh_charges || 0)
      : (order.tariff?.non_nabh_charges || 0)
    totalLabCharges += rate
  }

  return totalLabCharges
}

// Calculate radiology charges
export async function calculateRadiologyCharges(
  patientId: number, 
  tariffStandardId: number, 
  isNabh: boolean
): Promise<number> {
  const { data: radioOrders } = await supabase
    .from('radiology_orders')
    .select(`
      *,
      tariff:tariff_amounts!inner(*)
    `)
    .eq('patient_id', patientId)
    .eq('tariff.tariff_standard_id', tariffStandardId)
    .eq('tariff.category', 'radiology')

  if (!radioOrders || radioOrders.length === 0) return 0

  let totalRadioCharges = 0

  for (const order of radioOrders) {
    const rate = isNabh 
      ? (order.tariff?.nabh_charges || 0)
      : (order.tariff?.non_nabh_charges || 0)
    totalRadioCharges += rate
  }

  return totalRadioCharges
}

// Calculate pharmacy total from sales bills
export async function calculatePharmacyTotal(patientId: number): Promise<number> {
  const { data: pharmacySales } = await supabase
    .from('pharmacy_sales_bills')
    .select('total_amount')
    .eq('patient_id', patientId)

  if (!pharmacySales || pharmacySales.length === 0) return 0

  return pharmacySales.reduce((total, sale) => {
    return total + (parseFloat(sale.total_amount) || 0)
  }, 0)
}

// Calculate surgery and OT charges
export async function calculateSurgeryCharges(patientId: number, tariffStandardId: number): Promise<number> {
  const { data: surgeries } = await supabase
    .from('opt_appointments')
    .select(`
      *,
      surgery:surgeries(name),
      tariff:tariff_amounts!inner(*)
    `)
    .eq('patient_id', patientId)
    .eq('tariff.tariff_standard_id', tariffStandardId)
    .eq('tariff.category', 'surgery')

  if (!surgeries || surgeries.length === 0) return 0

  let totalSurgeryCharges = 0

  for (const surgery of surgeries) {
    const rate = surgery.tariff?.nabh_charges || surgery.tariff?.non_nabh_charges || 0
    totalSurgeryCharges += rate
  }

  return totalSurgeryCharges
}

// Calculate other service charges
export async function calculateOtherCharges(patientId: number): Promise<number> {
  const { data: otherServices } = await supabase
    .from('service_bills')
    .select(`
      *,
      tariff:tariff_amounts!inner(*)
    `)
    .eq('patient_id', patientId)
    .eq('tariff.category', 'other')

  if (!otherServices || otherServices.length === 0) return 0

  let totalOtherCharges = 0

  for (const service of otherServices) {
    const quantity = service.quantity || 1
    const rate = service.tariff?.non_nabh_charges || service.tariff?.nabh_charges || 0
    totalOtherCharges += quantity * rate
  }

  return totalOtherCharges
}

// Helper functions
export async function getPatientInfo(patientId: number): Promise<PatientInfo | null> {
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single()

  return patient
}

export function calculateAdmissionDays(admissionDate?: string, dischargeDate?: string): number {
  if (!admissionDate) return 1

  const admission = new Date(admissionDate)
  const discharge = dischargeDate ? new Date(dischargeDate) : new Date()
  
  const daysDiff = Math.ceil((discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(1, daysDiff) // Minimum 1 day
}

export async function getConfigurationAmount(configKey: string): Promise<number | null> {
  const { data: config } = await supabase
    .from('configurations')
    .select('value')
    .eq('key', configKey)
    .single()

  if (!config) return null
  return parseFloat(config.value) || null
}

// Get advance payments for a patient
export async function getAdvancePayments(patientId: number): Promise<number> {
  const { data: advances } = await supabase
    .from('billings')
    .select('total_amount')
    .eq('patient_id', patientId)
    .eq('payment_category', 'Advance')
    .eq('is_deleted', false)

  if (!advances || advances.length === 0) return 0

  return advances.reduce((total, advance) => {
    return total + (parseFloat(advance.total_amount) || 0)
  }, 0)
}

// Get final bill for a patient
export async function getFinalBill(patientId: number) {
  const { data: finalBill } = await supabase
    .from('final_billings')
    .select('*')
    .eq('patient_id', patientId)
    .single()

  return finalBill
}