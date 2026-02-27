'use client'
import { supabase } from '@/lib/supabase'

export interface WardTransferData {
  patientId: number
  newWardId: number
  newRoomId: number
  newBedId: number
  transferReason: string
  transferredBy: number // doctor/user id
}

export interface DischargeData {
  patientId: number
  dischargeType: 'DAMA' | 'Normal' | 'Death' | 'Transfer' | 'Abscond'
  dischargeDate: string
  dischargeSummary?: string
  dischargedBy: number // doctor id
  followUpDate?: string
  followUpInstructions?: string
  medications?: string
  dietInstructions?: string
}

export interface NursingNote {
  id?: number
  patientId: number
  wardPatientId: number
  noteType: 'General' | 'Medication' | 'Vital Signs' | 'Progress' | 'Incident'
  note: string
  nurseId: number
  createdAt: string
}

// Get all currently admitted IPD patients
export async function getActiveIPDPatients() {
  try {
    const { data: patients, error } = await supabase
      .from('patients_full')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name, department_id),
        wards:ward_id(id, name, floor),
        rooms:room_id(id, name, room_type),
        beds:bed_id(id, bed_number),
        departments:department_id(id, name),
        ward_patients!inner(id, in_date, out_date)
      `)
      .not('admission_date', 'is', null)
      .is('discharge_date', null)
      .is('ward_patients.out_date', null)
      .order('admission_date', { ascending: false })

    if (error) throw error

    // Calculate days admitted for each patient
    const patientsWithDays = patients?.map(patient => {
      const admissionDate = new Date(patient.admission_date)
      const today = new Date()
      const daysAdmitted = Math.ceil((today.getTime() - admissionDate.getTime()) / (1000 * 3600 * 24))
      
      return {
        ...patient,
        daysAdmitted
      }
    }) || []

    return {
      success: true,
      patients: patientsWithDays
    }
  } catch (error) {
    console.error('Error getting active IPD patients:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      patients: []
    }
  }
}

// Get ward occupancy overview
export async function getWardOccupancy() {
  try {
    const { data: wards, error: wardsError } = await supabase
      .from('wards')
      .select(`
        *,
        rooms(
          *,
          beds(*)
        )
      `)
      .order('name')

    if (wardsError) throw wardsError

    const wardOccupancy = wards?.map(ward => {
      const totalBeds = ward.rooms?.reduce((total: number, room: any) => total + (room.beds?.length || 0), 0) || 0
      const occupiedBeds = ward.rooms?.reduce((total: number, room: any) => 
        total + (room.beds?.filter((bed: any) => bed.status === 'occupied').length || 0), 0
      ) || 0
      const availableBeds = totalBeds - occupiedBeds
      const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0

      return {
        ...ward,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate: Math.round(occupancyRate),
        rooms: ward.rooms?.map((room: any) => ({
          ...room,
          totalBeds: room.beds?.length || 0,
          occupiedBeds: room.beds?.filter((bed: any) => bed.status === 'occupied').length || 0,
          availableBeds: room.beds?.filter((bed: any) => bed.status === 'available').length || 0,
          beds: room.beds?.map((bed: any) => ({
            ...bed,
            isOccupied: bed.status === 'occupied'
          }))
        }))
      }
    }) || []

    return {
      success: true,
      wards: wardOccupancy
    }
  } catch (error) {
    console.error('Error getting ward occupancy:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      wards: []
    }
  }
}

// Transfer patient to different ward/room/bed
export async function transferWard(data: WardTransferData) {
  try {
    const transferDate = new Date().toISOString()
    
    // Check if new bed is available
    const { data: bedCheck, error: bedError } = await supabase
      .from('beds')
      .select('status, patient_id')
      .eq('id', data.newBedId)
      .single()

    if (bedError) throw bedError
    
    if (bedCheck.status !== 'available') {
      return {
        success: false,
        error: 'Selected bed is not available'
      }
    }

    // Get current ward_patients record
    const { data: currentWardPatient, error: currentError } = await supabase
      .from('ward_patients')
      .select('*')
      .eq('patient_id', data.patientId)
      .is('out_date', null)
      .single()

    if (currentError) throw currentError

    // Close current ward_patients record
    const { error: closeError } = await supabase
      .from('ward_patients')
      .update({
        out_date: transferDate,
        transfer_reason: data.transferReason,
        updated_at: transferDate
      })
      .eq('id', currentWardPatient.id)

    if (closeError) throw closeError

    // Create new ward_patients record
    const { error: newWardError } = await supabase
      .from('ward_patients')
      .insert({
        patient_id: data.patientId,
        ward_id: data.newWardId,
        room_id: data.newRoomId,
        bed_id: data.newBedId,
        doctor_id: currentWardPatient.doctor_id,
        in_date: transferDate,
        admission_reason: `Transfer from Ward ${currentWardPatient.ward_id}`,
        transferred_from_ward_patient_id: currentWardPatient.id,
        created_at: transferDate
      })

    if (newWardError) throw newWardError

    // Free up old bed
    const { error: oldBedError } = await supabase
      .from('beds')
      .update({
        status: 'available',
        patient_id: null,
        updated_at: transferDate
      })
      .eq('id', currentWardPatient.bed_id)

    if (oldBedError) throw oldBedError

    // Occupy new bed
    const { error: newBedError } = await supabase
      .from('beds')
      .update({
        status: 'occupied',
        patient_id: data.patientId,
        updated_at: transferDate
      })
      .eq('id', data.newBedId)

    if (newBedError) throw newBedError

    // Update patient record
    const { error: patientUpdateError } = await supabase
      .from('patients')
      .update({
        ward_id: data.newWardId,
        room_id: data.newRoomId,
        bed_id: data.newBedId,
        updated_at: transferDate
      })
      .eq('id', data.patientId)

    if (patientUpdateError) throw patientUpdateError

    // Add nursing note about transfer
    const { error: noteError } = await supabase
      .from('nursing_notes')
      .insert({
        patient_id: data.patientId,
        ward_patient_id: currentWardPatient.id,
        note_type: 'General',
        note: `Patient transferred from Ward ${currentWardPatient.ward_id} to Ward ${data.newWardId}. Reason: ${data.transferReason}`,
        nurse_id: data.transferredBy,
        created_at: transferDate
      })

    // Don't throw if nursing note fails, just log it
    if (noteError) console.warn('Failed to create nursing note for transfer:', noteError)

    return {
      success: true,
      message: 'Patient transferred successfully'
    }
  } catch (error) {
    console.error('Error transferring patient:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Discharge patient
export async function dischargePatient(data: DischargeData) {
  try {
    const dischargeDate = data.dischargeDate || new Date().toISOString()
    
    // Get current ward_patients record
    const { data: currentWardPatient, error: currentError } = await supabase
      .from('ward_patients')
      .select('*')
      .eq('patient_id', data.patientId)
      .is('out_date', null)
      .single()

    if (currentError) throw currentError

    // Close ward_patients record
    const { error: closeWardError } = await supabase
      .from('ward_patients')
      .update({
        out_date: dischargeDate,
        discharge_type: data.dischargeType,
        updated_at: dischargeDate
      })
      .eq('id', currentWardPatient.id)

    if (closeWardError) throw closeWardError

    // Update patient record
    const { error: patientUpdateError } = await supabase
      .from('patients')
      .update({
        discharge_date: dischargeDate,
        discharge_type: data.dischargeType,
        ward_id: null,
        room_id: null,
        bed_id: null,
        updated_at: dischargeDate
      })
      .eq('id', data.patientId)

    if (patientUpdateError) throw patientUpdateError

    // Free up bed
    const { error: bedError } = await supabase
      .from('beds')
      .update({
        status: 'available',
        patient_id: null,
        updated_at: dischargeDate
      })
      .eq('id', currentWardPatient.bed_id)

    if (bedError) throw bedError

    // Create discharge summary
    const { error: summaryError } = await supabase
      .from('discharge_summaries')
      .insert({
        patient_id: data.patientId,
        ward_patient_id: currentWardPatient.id,
        doctor_id: data.dischargedBy,
        admission_date: currentWardPatient.in_date,
        discharge_date: dischargeDate,
        discharge_type: data.dischargeType,
        discharge_summary: data.dischargeSummary,
        follow_up_date: data.followUpDate,
        follow_up_instructions: data.followUpInstructions,
        medications: data.medications,
        diet_instructions: data.dietInstructions,
        created_at: dischargeDate
      })

    if (summaryError) throw summaryError

    // Add nursing note about discharge
    const { error: noteError } = await supabase
      .from('nursing_notes')
      .insert({
        patient_id: data.patientId,
        ward_patient_id: currentWardPatient.id,
        note_type: 'General',
        note: `Patient discharged with type: ${data.dischargeType}`,
        nurse_id: data.dischargedBy,
        created_at: dischargeDate
      })

    // Don't throw if nursing note fails
    if (noteError) console.warn('Failed to create nursing note for discharge:', noteError)

    return {
      success: true,
      message: `Patient discharged successfully (${data.dischargeType})`
    }
  } catch (error) {
    console.error('Error discharging patient:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Get nursing notes for a patient
export async function getNursingNotes(patientId: number) {
  try {
    const { data: notes, error } = await supabase
      .from('nursing_notes')
      .select(`
        *,
        nurses:nurse_id(id, name),
        ward_patients:ward_patient_id(id, ward_id, room_id, bed_id)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      notes: notes || []
    }
  } catch (error) {
    console.error('Error getting nursing notes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      notes: []
    }
  }
}

// Add nursing note
export async function addNursingNote(note: Omit<NursingNote, 'id' | 'createdAt'>) {
  try {
    const { error } = await supabase
      .from('nursing_notes')
      .insert({
        ...note,
        created_at: new Date().toISOString()
      })

    if (error) throw error

    return {
      success: true,
      message: 'Nursing note added successfully'
    }
  } catch (error) {
    console.error('Error adding nursing note:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Get ward charges by day for a patient
export async function getWardChargesByDay(patientId: number) {
  try {
    const { data: wardPatients, error } = await supabase
      .from('ward_patients')
      .select(`
        *,
        wards:ward_id(id, name),
        tariff_standards:tariff_standard_id(id, name, ward_charges_per_day)
      `)
      .eq('patient_id', patientId)
      .order('in_date')

    if (error) throw error

    const chargesByDay = wardPatients?.map(admission => {
      const inDate = new Date(admission.in_date)
      const outDate = admission.out_date ? new Date(admission.out_date) : new Date()
      const daysStayed = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 3600 * 24))
      const dailyRate = admission.tariff_standards?.ward_charges_per_day || 0
      const totalCharges = daysStayed * dailyRate

      return {
        ...admission,
        daysStayed,
        dailyRate,
        totalCharges,
        dateRange: {
          from: inDate.toDateString(),
          to: admission.out_date ? outDate.toDateString() : 'Current'
        }
      }
    }) || []

    const totalCharges = chargesByDay.reduce((sum, charge) => sum + charge.totalCharges, 0)

    return {
      success: true,
      charges: chargesByDay,
      totalCharges
    }
  } catch (error) {
    console.error('Error getting ward charges:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      charges: [],
      totalCharges: 0
    }
  }
}

// Get today's admissions and discharges
export async function getTodayStats() {
  try {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

    const [
      { data: admissions, error: admissionsError },
      { data: discharges, error: dischargesError }
    ] = await Promise.all([
      supabase
        .from('patients')
        .select('id, full_name, admission_date')
        .gte('admission_date', todayStart)
        .lt('admission_date', todayEnd),
      supabase
        .from('patients')
        .select('id, full_name, discharge_date')
        .gte('discharge_date', todayStart)
        .lt('discharge_date', todayEnd)
    ])

    if (admissionsError) throw admissionsError
    if (dischargesError) throw dischargesError

    return {
      success: true,
      todayStats: {
        admissions: admissions || [],
        discharges: discharges || [],
        admissionCount: admissions?.length || 0,
        dischargeCount: discharges?.length || 0
      }
    }
  } catch (error) {
    console.error('Error getting today stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      todayStats: {
        admissions: [],
        discharges: [],
        admissionCount: 0,
        dischargeCount: 0
      }
    }
  }
}

// Get ward-specific dashboard data
export async function getWardDashboard(wardId: number) {
  try {
    const { data: patients, error: patientsError } = await supabase
      .from('patients_full')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name),
        rooms:room_id(id, name),
        beds:bed_id(id, bed_number),
        ward_patients!inner(id, in_date, out_date)
      `)
      .eq('ward_id', wardId)
      .is('discharge_date', null)
      .is('ward_patients.out_date', null)

    if (patientsError) throw patientsError

    const { data: wardInfo, error: wardError } = await supabase
      .from('wards')
      .select(`
        *,
        rooms(
          *,
          beds(*)
        )
      `)
      .eq('id', wardId)
      .single()

    if (wardError) throw wardError

    // Get recent nursing notes for this ward
    const { data: recentNotes, error: notesError } = await supabase
      .from('nursing_notes')
      .select(`
        *,
        patients:patient_id(id, full_name),
        nurses:nurse_id(id, name)
      `)
      .in('patient_id', patients?.map(p => p.id) || [])
      .order('created_at', { ascending: false })
      .limit(10)

    if (notesError) throw notesError

    return {
      success: true,
      wardDashboard: {
        ward: wardInfo,
        patients: patients || [],
        recentNotes: recentNotes || []
      }
    }
  } catch (error) {
    console.error('Error getting ward dashboard:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      wardDashboard: {
        ward: null,
        patients: [],
        recentNotes: []
      }
    }
  }
}

// Get critical patients (based on certain criteria)
export async function getCriticalPatients() {
  try {
    // Get patients admitted for more than 7 days or with specific conditions
    const { data: patients, error } = await supabase
      .from('patients_full')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name),
        wards:ward_id(id, name),
        beds:bed_id(id, bed_number)
      `)
      .not('admission_date', 'is', null)
      .is('discharge_date', null)
      .lt('admission_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (error) throw error

    // Add additional criteria for critical patients
    const criticalPatients = patients?.map(patient => {
      const admissionDate = new Date(patient.admission_date)
      const today = new Date()
      const daysAdmitted = Math.ceil((today.getTime() - admissionDate.getTime()) / (1000 * 3600 * 24))
      
      let criticalLevel = 'Low'
      let criticalReasons = []
      
      if (daysAdmitted > 14) {
        criticalLevel = 'High'
        criticalReasons.push('Long stay (> 14 days)')
      } else if (daysAdmitted > 7) {
        criticalLevel = 'Medium'
        criticalReasons.push('Extended stay (> 7 days)')
      }
      
      if (patient.age && patient.age > 70) {
        criticalLevel = criticalLevel === 'Low' ? 'Medium' : 'High'
        criticalReasons.push('Elderly patient (> 70 years)')
      }

      return {
        ...patient,
        daysAdmitted,
        criticalLevel,
        criticalReasons
      }
    }) || []

    return {
      success: true,
      criticalPatients
    }
  } catch (error) {
    console.error('Error getting critical patients:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      criticalPatients: []
    }
  }
}