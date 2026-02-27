// @ts-nocheck
import { supabase } from './supabase'

export interface Surgery {
  id: string
  patient_id: string
  patient_name?: string
  uhid?: string
  surgeon_id?: string
  surgeon_name?: string
  anesthetist_id?: string
  anesthetist_name?: string
  procedure_name: string
  surgery_type?: string
  scheduled_date: string
  scheduled_time?: string
  duration?: number
  ot_number?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  priority: 'elective' | 'emergency' | 'urgent'
  pre_op_notes?: string
  post_op_notes?: string
  complications?: string
  created_at: string
  updated_at: string
}

export interface OTSchedule {
  date: string
  surgeries: Surgery[]
  ot_utilization: {
    [ot_number: string]: {
      total_hours: number
      booked_hours: number
      utilization_percent: number
    }
  }
}

export interface SurgeryStats {
  todaySurgeries: number
  weekSurgeries: number
  monthSurgeries: number
  emergencyCount: number
  electiveCount: number
  monthlyTrend: Array<{
    month: string
    count: number
  }>
  surgeryTypes: Array<{
    type: string
    count: number
  }>
}

// Get surgeries with filters
export async function getSurgeries(filters: {
  date?: string
  surgeon_id?: string
  patient_id?: string
  status?: string
  type?: string
  limit?: number
} = {}): Promise<Surgery[]> {
  let query = supabase
    .from('surgeries')
    .select(`
      *,
      patients!inner(name, uhid, phone),
      doctors!surgeon_id(name),
      doctors!anesthetist_id(name)
    `)
    .order('scheduled_date', { ascending: false })

  if (filters.date) {
    query = query.gte('scheduled_date', `${filters.date}T00:00:00`)
      .lt('scheduled_date', `${filters.date}T23:59:59`)
  }

  if (filters.surgeon_id) {
    query = query.eq('surgeon_id', filters.surgeon_id)
  }

  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.type) {
    query = query.eq('surgery_type', filters.type)
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data: surgeries, error } = await query

  if (error) {
    throw new Error('Failed to fetch surgeries')
  }

  return (surgeries || []).map((surgery: any) => ({
    ...surgery,
    patient_name: surgery.patients?.name,
    uhid: surgery.patients?.uhid,
    surgeon_name: surgery.doctors?.name,
    anesthetist_name: surgery.doctors?.name // This would need proper join handling
  }))
}

// Get OT schedule for a specific date
export async function getOTSchedule(date: string): Promise<OTSchedule> {
  const surgeries = await getSurgeries({ date })

  // Group surgeries by OT number
  const otSchedule: { [ot: string]: Surgery[] } = {}
  surgeries.forEach(surgery => {
    const ot = surgery.ot_number || 'Unassigned'
    if (!otSchedule[ot]) {
      otSchedule[ot] = []
    }
    otSchedule[ot].push(surgery)
  })

  // Calculate OT utilization (assuming 8-hour working day)
  const otUtilization: OTSchedule['ot_utilization'] = {}
  Object.keys(otSchedule).forEach(ot => {
    const totalMinutes = otSchedule[ot].reduce((sum, surgery) => 
      sum + (surgery.duration || 60), 0
    )
    const totalHours = totalMinutes / 60
    const utilization = Math.min(totalHours / 8 * 100, 100)

    otUtilization[ot] = {
      total_hours: 8,
      booked_hours: totalHours,
      utilization_percent: Math.round(utilization)
    }
  })

  return {
    date,
    surgeries,
    ot_utilization: otUtilization
  }
}

// Schedule a new surgery
export async function scheduleSurgery(surgeryData: {
  patient_id: string
  surgeon_id: string
  anesthetist_id?: string
  procedure_name: string
  surgery_type?: string
  scheduled_date: string
  scheduled_time?: string
  duration?: number
  ot_number?: string
  priority?: 'elective' | 'emergency' | 'urgent'
  pre_op_notes?: string
}) {
  const { data: surgery, error } = await supabase
    .from('surgeries')
    .insert({
      ...surgeryData,
      status: 'scheduled',
      priority: surgeryData.priority || 'elective',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select(`
      *,
      patients!inner(name, uhid),
      doctors!surgeon_id(name)
    `)
    .single()

  if (error) {
    throw new Error('Failed to schedule surgery')
  }

  return {
    ...surgery,
    patient_name: surgery.patients?.name,
    uhid: surgery.patients?.uhid,
    surgeon_name: surgery.doctors?.name
  }
}

// Get detailed surgery information
export async function getSurgeryDetails(surgeryId: string): Promise<Surgery | null> {
  const { data: surgery, error } = await supabase
    .from('surgeries')
    .select(`
      *,
      patients!inner(name, uhid, phone, age, gender),
      doctors!surgeon_id(name, specialization),
      doctors!anesthetist_id(name, specialization)
    `)
    .eq('id', surgeryId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Surgery not found
    }
    throw new Error('Failed to fetch surgery details')
  }

  return {
    ...surgery,
    patient_name: surgery.patients?.name,
    uhid: surgery.patients?.uhid,
    surgeon_name: surgery.doctors?.name,
    anesthetist_name: surgery.doctors?.name // Proper join needed
  }
}

// Get surgery statistics
export async function getSurgeryStats(): Promise<SurgeryStats> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  
  // Get start of week (Monday)
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1)
  const weekStr = startOfWeek.toISOString().split('T')[0]
  
  // Get start of month
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthStr = startOfMonth.toISOString().split('T')[0]

  // Today's surgeries
  const { count: todaySurgeries } = await supabase
    .from('surgeries')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_date', `${todayStr}T00:00:00`)
    .lt('scheduled_date', `${todayStr}T23:59:59`)

  // This week's surgeries
  const { count: weekSurgeries } = await supabase
    .from('surgeries')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_date', `${weekStr}T00:00:00`)

  // This month's surgeries
  const { count: monthSurgeries } = await supabase
    .from('surgeries')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_date', `${monthStr}T00:00:00`)

  // Emergency vs Elective count
  const { count: emergencyCount } = await supabase
    .from('surgeries')
    .select('*', { count: 'exact', head: true })
    .eq('priority', 'emergency')
    .gte('scheduled_date', `${monthStr}T00:00:00`)

  const { count: electiveCount } = await supabase
    .from('surgeries')
    .select('*', { count: 'exact', head: true })
    .eq('priority', 'elective')
    .gte('scheduled_date', `${monthStr}T00:00:00`)

  // Get surgery types distribution
  const { data: surgeryTypesData } = await supabase
    .from('surgeries')
    .select('surgery_type')
    .gte('scheduled_date', `${monthStr}T00:00:00`)

  const surgeryTypes: { [key: string]: number } = {}
  surgeryTypesData?.forEach((surgery: any) => {
    const type = surgery.surgery_type || 'Other'
    surgeryTypes[type] = (surgeryTypes[type] || 0) + 1
  })

  const surgeryTypesArray = Object.entries(surgeryTypes)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // Get monthly trend for the last 6 months
  const monthlyTrend = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today)
    date.setMonth(date.getMonth() - i)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    
    const { count } = await supabase
      .from('surgeries')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_date', monthStart.toISOString())
      .lt('scheduled_date', monthEnd.toISOString())

    monthlyTrend.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count: count || 0
    })
  }

  return {
    todaySurgeries: todaySurgeries || 0,
    weekSurgeries: weekSurgeries || 0,
    monthSurgeries: monthSurgeries || 0,
    emergencyCount: emergencyCount || 0,
    electiveCount: electiveCount || 0,
    monthlyTrend,
    surgeryTypes: surgeryTypesArray
  }
}

// Update surgery status
export async function updateSurgeryStatus(
  surgeryId: string, 
  status: Surgery['status'],
  notes?: {
    post_op_notes?: string
    complications?: string
  }
) {
  const updateData: any = { 
    status,
    updated_at: new Date().toISOString()
  }

  if (notes?.post_op_notes) {
    updateData.post_op_notes = notes.post_op_notes
  }

  if (notes?.complications) {
    updateData.complications = notes.complications
  }

  const { error } = await supabase
    .from('surgeries')
    .update(updateData)
    .eq('id', surgeryId)

  if (error) {
    throw new Error('Failed to update surgery status')
  }
}

// Get available OT slots for a date
export async function getAvailableOTSlots(date: string) {
  const schedule = await getOTSchedule(date)
  const allOTs = ['OT1', 'OT2', 'OT3', 'OT4', 'OT5'] // Configurable
  
  const availableSlots = allOTs.map(ot => {
    const utilization = schedule.ot_utilization[ot]
    const surgeries = schedule.surgeries.filter((s: any) => s.ot_number === ot)
    
    return {
      ot_number: ot,
      available_hours: utilization ? 8 - utilization.booked_hours : 8,
      utilization_percent: utilization?.utilization_percent || 0,
      surgeries_count: surgeries.length,
      next_available_time: getNextAvailableTime(surgeries, date)
    }
  })

  return availableSlots.sort((a, b) => b.available_hours - a.available_hours)
}

// Helper function to calculate next available time in an OT
function getNextAvailableTime(surgeries: Surgery[], date: string): string {
  if (surgeries.length === 0) {
    return '08:00' // Start of day
  }

  // Sort surgeries by scheduled time
  const sortedSurgeries = surgeries
    .filter((s: any) => s.scheduled_time)
    .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))

  if (sortedSurgeries.length === 0) {
    return '08:00'
  }

  // Find the latest surgery and add its duration
  const lastSurgery = sortedSurgeries[sortedSurgeries.length - 1]
  const lastTime = lastSurgery.scheduled_time || '08:00'
  const duration = lastSurgery.duration || 60

  const [hours, minutes] = lastTime.split(':').map(Number)
  const endTime = new Date()
  endTime.setHours(hours, minutes + duration)

  return endTime.toTimeString().slice(0, 5)
}

// Get surgeon's surgery history
export async function getSurgeonSurgeries(surgeonId: string, limit = 50) {
  return getSurgeries({
    surgeon_id: surgeonId,
    limit
  })
}

// Get upcoming surgeries for a surgeon
export async function getUpcomingSurgeries(surgeonId?: string) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const filters: any = {
    status: 'scheduled',
    limit: 20
  }

  if (surgeonId) {
    filters.surgeon_id = surgeonId
  }

  let query = supabase
    .from('surgeries')
    .select(`
      *,
      patients!inner(name, uhid),
      doctors!surgeon_id(name)
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_date', new Date().toISOString())
    .order('scheduled_date', { ascending: true })
    .limit(20)

  if (surgeonId) {
    query = query.eq('surgeon_id', surgeonId)
  }

  const { data: surgeries, error } = await query

  if (error) {
    throw new Error('Failed to fetch upcoming surgeries')
  }

  return (surgeries || []).map((surgery: any) => ({
    ...surgery,
    patient_name: surgery.patients?.name,
    uhid: surgery.patients?.uhid,
    surgeon_name: surgery.doctors?.name
  }))
}