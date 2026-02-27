// @ts-nocheck
'use client'
import { supabase } from '@/lib/supabase'

export interface AppointmentData {
  patientId: number
  doctorId: number
  date: string
  time: string
  type: 'New' | 'Follow-up' | 'Emergency' | 'Consultation'
  department_id?: number
  complaint?: string
  notes?: string
  priority?: 'Normal' | 'Urgent' | 'Emergency'
  referral_doctor_id?: number
}

export interface ConsultationData {
  appointmentId: number
  complaint: string
  history: string
  examination: string
  diagnosis: string[]
  prescriptions: PrescriptionItem[]
  labOrders: LabOrderItem[]
  followUpDate?: string
  followUpInstructions?: string
  notes?: string
}

export interface PrescriptionItem {
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface LabOrderItem {
  testName: string
  testCode?: string
  priority?: 'Normal' | 'Urgent' | 'STAT'
  instructions?: string
}

export interface DoctorSchedule {
  doctorId: number
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  startTime: string
  endTime: string
  slotDuration: number // in minutes
  maxPatientsPerSlot: number
  isActive: boolean
}

// Create new appointment
export async function createAppointment(data: AppointmentData) {
  try {
    const appointmentDate = new Date().toISOString()
    
    // Generate token number for the day and doctor
    const todayStart = new Date(data.date).toISOString().split('T')[0] + 'T00:00:00.000Z'
    const todayEnd = new Date(data.date).toISOString().split('T')[0] + 'T23:59:59.999Z'
    
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('doctor_id', data.doctorId)
      .gte('date', todayStart)
      .lte('date', todayEnd)
    
    const tokenNumber = (count || 0) + 1

    const appointmentData = {
      patient_id: data.patientId,
      doctor_id: data.doctorId,
      department_id: data.department_id,
      date: data.date,
      time: data.time,
      appointment_type: data.type,
      complaint: data.complaint,
      notes: data.notes,
      priority: data.priority || 'Normal',
      referral_doctor_id: data.referral_doctor_id,
      status: 'Scheduled',
      token_number: tokenNumber,
      created_at: appointmentDate,
      updated_at: appointmentDate
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      appointment,
      tokenNumber,
      message: `Appointment booked successfully. Token: ${tokenNumber}`
    }
  } catch (error) {
    console.error('Error creating appointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Get OPD queue for a doctor on a specific date
export async function getOPDQueue(doctorId: number, date: string) {
  try {
    const dateStart = new Date(date).toISOString().split('T')[0] + 'T00:00:00.000Z'
    const dateEnd = new Date(date).toISOString().split('T')[0] + 'T23:59:59.999Z'

    const { data: queue, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id(id, uhid, full_name, age, sex, phone),
        doctors:doctor_id(id, doctor_name),
        departments:department_id(id, name)
      `)
      .eq('doctor_id', doctorId)
      .gte('date', dateStart)
      .lte('date', dateEnd)
      .in('status', ['Scheduled', 'In Progress', 'Waiting'])
      .order('token_number')

    if (error) throw error

    // Calculate waiting time and position
    const queueWithWaitTime = queue?.map((appointment, index) => {
      let estimatedWaitTime = 0
      let position = index + 1

      // If appointment is not yet started, calculate wait time
      if (appointment.status === 'Scheduled' || appointment.status === 'Waiting') {
        // Assume 15 minutes per patient on average
        const averageTimePerPatient = 15
        const patientsAhead = queue.filter(a => 
          a.token_number < appointment.token_number && 
          ['In Progress', 'Scheduled', 'Waiting'].includes(a.status)
        ).length
        
        estimatedWaitTime = patientsAhead * averageTimePerPatient
      }

      return {
        ...appointment,
        estimatedWaitTime,
        position
      }
    }) || []

    return {
      success: true,
      queue: queueWithWaitTime,
      totalPatients: queueWithWaitTime.length,
      waitingPatients: queueWithWaitTime.filter(a => a.status === 'Waiting' || a.status === 'Scheduled').length,
      inProgressPatients: queueWithWaitTime.filter(a => a.status === 'In Progress').length
    }
  } catch (error) {
    console.error('Error getting OPD queue:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      queue: [],
      totalPatients: 0,
      waitingPatients: 0,
      inProgressPatients: 0
    }
  }
}

// Get doctor's schedule for a specific date
export async function getOPDSchedule(doctorId: number, date: string) {
  try {
    const dayOfWeek = new Date(date).getDay()
    
    // Get doctor's schedule for this day
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single()

    if (scheduleError && scheduleError.code !== 'PGRST116') throw scheduleError

    // Get appointments for this date
    const dateStart = new Date(date).toISOString().split('T')[0] + 'T00:00:00.000Z'
    const dateEnd = new Date(date).toISOString().split('T')[0] + 'T23:59:59.999Z'

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id(id, uhid, full_name, phone)
      `)
      .eq('doctor_id', doctorId)
      .gte('date', dateStart)
      .lte('date', dateEnd)
      .order('time')

    if (appointmentsError) throw appointmentsError

    // Generate available time slots if schedule exists
    let availableSlots = []
    if (schedule) {
      const startTime = new Date(`1970-01-01T${schedule.start_time}`)
      const endTime = new Date(`1970-01-01T${schedule.end_time}`)
      const slotDuration = schedule.slot_duration || 30 // minutes
      
      const currentSlot = new Date(startTime)
      while (currentSlot < endTime) {
        const timeString = currentSlot.toTimeString().slice(0, 5)
        const bookedAppointments = appointments?.filter(apt => apt.time === timeString).length || 0
        const maxPatients = schedule.max_patients_per_slot || 1
        
        availableSlots.push({
          time: timeString,
          available: bookedAppointments < maxPatients,
          booked: bookedAppointments,
          maxPatients
        })
        
        currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration)
      }
    }

    return {
      success: true,
      schedule: schedule || null,
      appointments: appointments || [],
      availableSlots,
      isWorkingDay: !!schedule
    }
  } catch (error) {
    console.error('Error getting OPD schedule:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      schedule: null,
      appointments: [],
      availableSlots: [],
      isWorkingDay: false
    }
  }
}

// Start consultation (mark appointment as in progress)
export async function startConsultation(appointmentId: number) {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'In Progress',
        consultation_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (error) throw error

    return {
      success: true,
      message: 'Consultation started'
    }
  } catch (error) {
    console.error('Error starting consultation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Complete consultation
export async function completeConsultation(data: ConsultationData) {
  try {
    const completionTime = new Date().toISOString()
    
    // Update appointment status
    const { error: appointmentError } = await supabase
      .from('appointments')
      .update({
        status: 'Completed',
        consultation_end_time: completionTime,
        complaint: data.complaint,
        diagnosis: data.diagnosis.join(', '),
        notes: data.notes,
        follow_up_date: data.followUpDate,
        follow_up_instructions: data.followUpInstructions,
        updated_at: completionTime
      })
      .eq('id', data.appointmentId)

    if (appointmentError) throw appointmentError

    // Get appointment details for patient ID
    const { data: appointment, error: appointmentFetchError } = await supabase
      .from('appointments')
      .select('patient_id, doctor_id')
      .eq('id', data.appointmentId)
      .single()

    if (appointmentFetchError) throw appointmentFetchError

    // Create consultation record
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .insert({
        appointment_id: data.appointmentId,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        consultation_date: completionTime,
        complaint: data.complaint,
        history: data.history,
        examination: data.examination,
        diagnosis: data.diagnosis.join(', '),
        follow_up_date: data.followUpDate,
        follow_up_instructions: data.followUpInstructions,
        notes: data.notes,
        created_at: completionTime
      })
      .select()
      .single()

    if (consultationError) throw consultationError

    // Add diagnoses to diagnoses table
    if (data.diagnosis.length > 0) {
      const diagnosisInserts = data.diagnosis.map(diagnosis => ({
        patient_id: appointment.patient_id,
        consultation_id: consultation.id,
        diagnosis,
        diagnosed_date: completionTime,
        doctor_id: appointment.doctor_id,
        created_at: completionTime
      }))

      const { error: diagnosisError } = await supabase
        .from('diagnoses')
        .insert(diagnosisInserts)

      if (diagnosisError) console.warn('Failed to insert diagnoses:', diagnosisError)
    }

    // Add prescriptions
    if (data.prescriptions.length > 0) {
      const prescriptionInserts = data.prescriptions.map(prescription => ({
        patient_id: appointment.patient_id,
        consultation_id: consultation.id,
        appointment_id: data.appointmentId,
        doctor_id: appointment.doctor_id,
        medication: prescription.medication,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        instructions: prescription.instructions,
        prescribed_date: completionTime,
        created_at: completionTime
      }))

      const { error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert(prescriptionInserts)

      if (prescriptionError) console.warn('Failed to insert prescriptions:', prescriptionError)
    }

    // Add lab orders
    if (data.labOrders.length > 0) {
      const labOrderInserts = data.labOrders.map(labOrder => ({
        patient_id: appointment.patient_id,
        consultation_id: consultation.id,
        appointment_id: data.appointmentId,
        doctor_id: appointment.doctor_id,
        test_name: labOrder.testName,
        test_code: labOrder.testCode,
        priority: labOrder.priority || 'Normal',
        instructions: labOrder.instructions,
        order_date: completionTime,
        status: 'Ordered',
        created_at: completionTime
      }))

      const { error: labOrderError } = await supabase
        .from('laboratory_test_orders')
        .insert(labOrderInserts)

      if (labOrderError) console.warn('Failed to insert lab orders:', labOrderError)
    }

    return {
      success: true,
      consultation,
      message: 'Consultation completed successfully'
    }
  } catch (error) {
    console.error('Error completing consultation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Cancel appointment
export async function cancelAppointment(appointmentId: number, reason: string) {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'Cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (error) throw error

    return {
      success: true,
      message: 'Appointment cancelled successfully'
    }
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Get today's OPD stats across all doctors
export async function getOPDStats(date?: string) {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const dateStart = targetDate + 'T00:00:00.000Z'
    const dateEnd = targetDate + 'T23:59:59.999Z'

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select(`
        *,
        doctors:doctor_id(id, doctor_name),
        patients:patient_id(id, uhid, full_name)
      `)
      .gte('date', dateStart)
      .lte('date', dateEnd)

    if (error) throw error

    const stats = {
      totalAppointments: appointments?.length || 0,
      scheduledAppointments: appointments?.filter(a => a.status === 'Scheduled').length || 0,
      inProgressAppointments: appointments?.filter(a => a.status === 'In Progress').length || 0,
      completedAppointments: appointments?.filter(a => a.status === 'Completed').length || 0,
      cancelledAppointments: appointments?.filter(a => a.status === 'Cancelled').length || 0,
      newPatients: appointments?.filter(a => a.appointment_type === 'New').length || 0,
      followUpPatients: appointments?.filter(a => a.appointment_type === 'Follow-up').length || 0,
      emergencyAppointments: appointments?.filter(a => a.priority === 'Emergency').length || 0
    }

    // Doctor-wise stats
    const doctorStats = appointments?.reduce((acc, appointment) => {
      const doctorId = appointment.doctor_id
      if (!acc[doctorId]) {
        acc[doctorId] = {
          doctor: appointment.doctors,
          total: 0,
          completed: 0,
          pending: 0,
          cancelled: 0
        }
      }
      
      acc[doctorId].total++
      
      if (appointment.status === 'Completed') acc[doctorId].completed++
      else if (appointment.status === 'Cancelled') acc[doctorId].cancelled++
      else acc[doctorId].pending++
      
      return acc
    }, {} as any) || {}

    return {
      success: true,
      stats,
      doctorStats: Object.values(doctorStats),
      appointments: appointments || []
    }
  } catch (error) {
    console.error('Error getting OPD stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      stats: {
        totalAppointments: 0,
        scheduledAppointments: 0,
        inProgressAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        newPatients: 0,
        followUpPatients: 0,
        emergencyAppointments: 0
      },
      doctorStats: [],
      appointments: []
    }
  }
}

// Get available time slots for a doctor on a specific date
export async function getAvailableSlots(doctorId: number, date: string) {
  try {
    const scheduleResult = await getOPDSchedule(doctorId, date) as any
    
    if (!scheduleResult?.success) {
      return {
        success: false,
        error: 'Failed to get doctor schedule',
        slots: []
      }
    }

    return {
      success: true,
      slots: scheduleResult.availableSlots.filter((slot: any) => slot.available),
      schedule: scheduleResult.schedule
    }
  } catch (error) {
    console.error('Error getting available slots:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      slots: []
    }
  }
}

// Transfer patient to another doctor
export async function transferPatient(appointmentId: number, newDoctorId: number, reason: string) {
  try {
    const transferTime = new Date().toISOString()
    
    // Get original appointment
    const { data: originalAppointment, error: originalError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (originalError) throw originalError

    // Update original appointment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'Transferred',
        transfer_reason: reason,
        transferred_at: transferTime,
        updated_at: transferTime
      })
      .eq('id', appointmentId)

    if (updateError) throw updateError

    // Create new appointment with new doctor
    const { data: newAppointment, error: newAppointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id: originalAppointment.patient_id,
        doctor_id: newDoctorId,
        department_id: originalAppointment.department_id,
        date: originalAppointment.date,
        time: originalAppointment.time,
        appointment_type: originalAppointment.appointment_type,
        complaint: originalAppointment.complaint,
        notes: `Transferred from Dr. ID ${originalAppointment.doctor_id}. Reason: ${reason}`,
        priority: originalAppointment.priority,
        status: 'Scheduled',
        transferred_from_appointment_id: appointmentId,
        created_at: transferTime
      })
      .select()
      .single()

    if (newAppointmentError) throw newAppointmentError

    return {
      success: true,
      newAppointment,
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

// Skip patient in queue (move to end)
export async function skipPatient(appointmentId: number, reason: string) {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'Waiting',
        skip_reason: reason,
        skipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (error) throw error

    return {
      success: true,
      message: 'Patient moved to waiting list'
    }
  } catch (error) {
    console.error('Error skipping patient:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

// Get next patient in queue
export async function getNextPatient(doctorId: number, date: string) {
  try {
    const dateStart = new Date(date).toISOString().split('T')[0] + 'T00:00:00.000Z'
    const dateEnd = new Date(date).toISOString().split('T')[0] + 'T23:59:59.999Z'

    const { data: nextPatient, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patients:patient_id(id, uhid, full_name, age, sex, phone)
      `)
      .eq('doctor_id', doctorId)
      .gte('date', dateStart)
      .lte('date', dateEnd)
      .in('status', ['Scheduled', 'Waiting'])
      .order('token_number')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return {
      success: true,
      nextPatient: nextPatient || null
    }
  } catch (error) {
    console.error('Error getting next patient:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      nextPatient: null
    }
  }
}