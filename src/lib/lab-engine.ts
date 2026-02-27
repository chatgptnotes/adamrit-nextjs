// @ts-nocheck
import { supabase } from './supabase'

export interface LabTest {
  id: string
  name: string
  code?: string
  department?: string
  normal_range?: string
  unit?: string
  sample_type?: string
  price?: number
}

export interface LabOrder {
  id: string
  patient_id: string
  patient_name?: string
  doctor_id?: string
  doctor_name?: string
  tests: string[]
  test_names?: string[]
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled'
  priority: 'normal' | 'urgent' | 'stat'
  ordered_at: string
  collected_at?: string
  reported_at?: string
  total_amount?: number
}

export interface LabResult {
  id: string
  order_id: string
  test_id: string
  test_name: string
  value: string
  unit?: string
  normal_range?: string
  status: 'normal' | 'abnormal' | 'critical'
  notes?: string
  reported_at?: string
}

export interface LabStats {
  todayOrders: number
  pendingOrders: number
  completedToday: number
  criticalResults: number
  totalRevenue: number
}

// Get all available laboratory tests
export async function getLabTests(): Promise<LabTest[]> {
  const { data: tests, error } = await supabase
    .from('laboratories')
    .select('*')
    .order('name')

  if (error) {
    throw new Error('Failed to fetch lab tests')
  }

  return tests || []
}

// Get lab test orders with filters
export async function getLabOrders(filters: {
  status?: string
  date?: string
  patient_id?: string
  doctor_id?: string
}): Promise<LabOrder[]> {
  let query = supabase
    .from('laboratory_test_orders')
    .select(`
      *,
      patients!inner(name, phone),
      doctors(name)
    `)
    .order('ordered_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.date) {
    query = query.gte('ordered_at', `${filters.date}T00:00:00`)
      .lt('ordered_at', `${filters.date}T23:59:59`)
  }

  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id)
  }

  if (filters.doctor_id) {
    query = query.eq('doctor_id', filters.doctor_id)
  }

  const { data: orders, error } = await query

  if (error) {
    throw new Error('Failed to fetch lab orders')
  }

  // Get test names for each order
  const ordersWithTests = await Promise.all(
    (orders || []).map(async (order: any) => {
      const testIds = order.tests || []
      const { data: tests } = await supabase
        .from('laboratories')
        .select('name')
        .in('id', testIds)

      return {
        ...order,
        patient_name: order.patients?.name,
        doctor_name: order.doctors?.name,
        test_names: tests?.map((test: any) => test.name) || []
      }
    })
  )

  return ordersWithTests
}

// Get lab results for a specific patient
export async function getLabResults(patientId: string): Promise<LabResult[]> {
  const { data: results, error } = await supabase
    .from('laboratory_results')
    .select(`
      *,
      laboratory_test_orders!inner(patient_id),
      laboratories(name, unit, normal_range)
    `)
    .eq('laboratory_test_orders.patient_id', patientId)
    .order('reported_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch lab results')
  }

  return (results || []).map((result: any) => ({
    ...result,
    test_name: result.laboratories?.name,
    unit: result.laboratories?.unit,
    normal_range: result.laboratories?.normal_range
  }))
}

// Create a new lab order
export async function createLabOrder(
  patientId: string, 
  doctorId: string,
  tests: Array<{
    id: string
    name: string
    price: number
  }>,
  priority: 'normal' | 'urgent' | 'stat' = 'normal'
) {
  const totalAmount = tests.reduce((sum, test) => sum + test.price, 0)

  const { data: order, error } = await supabase
    .from('laboratory_test_orders')
    .insert({
      patient_id: patientId,
      doctor_id: doctorId,
      tests: tests.map((test: any) => test.id),
      status: 'pending',
      priority,
      total_amount: totalAmount,
      ordered_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to create lab order')
  }

  return order
}

// Enter lab result values
export async function enterLabResult(
  orderId: string,
  testId: string,
  value: string,
  status: 'normal' | 'abnormal' | 'critical' = 'normal',
  notes?: string
) {
  const { data: result, error } = await supabase
    .from('laboratory_results')
    .upsert({
      order_id: orderId,
      test_id: testId,
      value,
      status,
      notes,
      reported_at: new Date().toISOString()
    }, {
      onConflict: 'order_id,test_id'
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to enter lab result')
  }

  // Check if all tests for this order are completed
  const { data: order } = await supabase
    .from('laboratory_test_orders')
    .select('tests')
    .eq('id', orderId)
    .single()

  if (order?.tests) {
    const { count: completedResults } = await supabase
      .from('laboratory_results')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)

    if (completedResults === order.tests.length) {
      // Mark order as completed
      await supabase
        .from('laboratory_test_orders')
        .update({ status: 'completed', reported_at: new Date().toISOString() })
        .eq('id', orderId)
    }
  }

  return result
}

// Get lab queue (pending samples for today)
export async function getLabQueue() {
  const today = new Date().toISOString().split('T')[0]

  const { data: orders, error } = await supabase
    .from('laboratory_test_orders')
    .select(`
      *,
      patients!inner(name, phone, uhid),
      doctors(name)
    `)
    .in('status', ['pending', 'collected', 'processing'])
    .gte('ordered_at', `${today}T00:00:00`)
    .lt('ordered_at', `${today}T23:59:59`)
    .order('priority', { ascending: false })
    .order('ordered_at', { ascending: true })

  if (error) {
    throw new Error('Failed to fetch lab queue')
  }

  // Get test names and check result status for each order
  const queueWithDetails = await Promise.all(
    (orders || []).map(async (order: any) => {
      const testIds = order.tests || []
      
      // Get test names
      const { data: tests } = await supabase
        .from('laboratories')
        .select('name')
        .in('id', testIds)

      // Check how many results are completed
      const { count: completedResults } = await supabase
        .from('laboratory_results')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', order.id)

      return {
        ...order,
        patient_name: order.patients?.name,
        patient_uhid: order.patients?.uhid,
        doctor_name: order.doctors?.name,
        test_names: tests?.map((test: any) => test.name) || [],
        completed_tests: completedResults || 0,
        total_tests: testIds.length,
        progress: testIds.length > 0 ? Math.round((completedResults || 0) / testIds.length * 100) : 0
      }
    })
  )

  return queueWithDetails
}

// Get lab statistics
export async function getLabStats(): Promise<LabStats> {
  const today = new Date().toISOString().split('T')[0]

  // Today's orders
  const { count: todayOrders } = await supabase
    .from('laboratory_test_orders')
    .select('*', { count: 'exact', head: true })
    .gte('ordered_at', `${today}T00:00:00`)
    .lt('ordered_at', `${today}T23:59:59`)

  // Pending orders
  const { count: pendingOrders } = await supabase
    .from('laboratory_test_orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'collected', 'processing'])

  // Completed today
  const { count: completedToday } = await supabase
    .from('laboratory_test_orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .gte('reported_at', `${today}T00:00:00`)
    .lt('reported_at', `${today}T23:59:59`)

  // Critical results today
  const { count: criticalResults } = await supabase
    .from('laboratory_results')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'critical')
    .gte('reported_at', `${today}T00:00:00`)
    .lt('reported_at', `${today}T23:59:59`)

  // Today's revenue
  const { data: todayRevenue } = await supabase
    .from('laboratory_test_orders')
    .select('total_amount')
    .gte('ordered_at', `${today}T00:00:00`)
    .lt('ordered_at', `${today}T23:59:59`)

  const totalRevenue = todayRevenue?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

  return {
    todayOrders: todayOrders || 0,
    pendingOrders: pendingOrders || 0,
    completedToday: completedToday || 0,
    criticalResults: criticalResults || 0,
    totalRevenue
  }
}

// Update order status
export async function updateOrderStatus(orderId: string, status: LabOrder['status']) {
  const updateData: any = { status }

  if (status === 'collected') {
    updateData.collected_at = new Date().toISOString()
  } else if (status === 'completed') {
    updateData.reported_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('laboratory_test_orders')
    .update(updateData)
    .eq('id', orderId)

  if (error) {
    throw new Error('Failed to update order status')
  }
}

// Get lab parameters for a test
export async function getLabParameters(testId: string) {
  const { data: parameters, error } = await supabase
    .from('laboratory_parameters')
    .select('*')
    .eq('test_id', testId)
    .order('name')

  if (error) {
    throw new Error('Failed to fetch lab parameters')
  }

  return parameters || []
}