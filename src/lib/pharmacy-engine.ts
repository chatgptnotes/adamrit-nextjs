// @ts-nocheck
import { supabase } from './supabase'

export interface PharmacyItem {
  id: string
  name: string
  generic_name?: string
  manufacturer?: string
  batch_number?: string
  expiry_date?: string
  stock_quantity?: number
  mrp?: number
  purchase_rate?: number
  reorder_level?: number
  rack_location?: string
  current_rate?: number
  unit?: string
  category?: string
  [key: string]: any
}

export interface PharmacySale {
  id: string
  patient_id: string
  patient_name?: string
  total_amount: number
  discount?: number
  net_amount: number
  created_at: string
  items?: PharmacySaleItem[]
}

export interface PharmacySaleItem {
  id: string
  bill_id: string
  item_id: string
  item_name: string
  quantity: number
  rate: number
  amount: number
}

export interface StockAlert {
  item_id: string
  item_name: string
  current_stock: number
  reorder_level: number
  status: 'low_stock' | 'out_of_stock' | 'expiring_soon'
  expiry_date?: string
}

// Get all pharmacy inventory with rates
export async function getPharmacyInventory() {
  const { data: items, error: itemsError } = await supabase
    .from('pharmacy_items_full')
    .select('*')
    .order('name')

  const { data: rates, error: ratesError } = await supabase
    .from('pharmacy_item_rates')
    .select('*')

  if (itemsError || ratesError) {
    throw new Error('Failed to fetch pharmacy inventory')
  }

  // Merge items with their rates
  const inventory = items?.map((item: any) => {
    const itemRates = rates?.filter((rate: any) => rate.item_id === item.id) || []
    const latestRate = itemRates.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    return {
      ...item,
      current_rate: latestRate?.rate || 0,
      mrp: latestRate?.mrp || 0,
      purchase_rate: latestRate?.purchase_rate || 0,
    }
  }) || []

  return inventory
}

// Get pharmacy sales within date range
export async function getPharmacySales(dateRange: { from: string; to: string }) {
  const { data: bills, error: billsError } = await supabase
    .from('pharmacy_sales_bills')
    .select(`
      *,
      patients!inner(name, phone)
    `)
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to)
    .order('created_at', { ascending: false })

  if (billsError) {
    throw new Error('Failed to fetch pharmacy sales')
  }

  // Get bill details for each bill
  const billsWithDetails = await Promise.all(
    (bills || []).map(async (bill: any) => {
      const { data: details } = await supabase
        .from('pharmacy_sales_bill_details')
        .select('*')
        .eq('bill_id', bill.id)

      return {
        ...bill,
        patient_name: bill.patients?.name,
        items: details || []
      }
    })
  )

  return billsWithDetails
}

// Get all medications dispensed to a specific patient
export async function getPatientMedications(patientId: string) {
  const { data: bills, error: billsError } = await supabase
    .from('pharmacy_sales_bills')
    .select(`
      *,
      pharmacy_sales_bill_details(*)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (billsError) {
    throw new Error('Failed to fetch patient medications')
  }

  return bills || []
}

// Create a new pharmacy sale
export async function createSale(patientId: string, items: Array<{
  item_id: string
  item_name: string
  quantity: number
  rate: number
}>) {
  const totalAmount = items.reduce((sum: any, item: any) => sum + (item.quantity * item.rate), 0)

  // Create the sale bill
  const { data: bill, error: billError } = await supabase
    .from('pharmacy_sales_bills')
    .insert({
      patient_id: patientId,
      total_amount: totalAmount,
      net_amount: totalAmount,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (billError) {
    throw new Error('Failed to create pharmacy sale')
  }

  // Create the sale items
  const saleItems = items.map((item: any) => ({
    bill_id: bill.id,
    item_id: item.item_id,
    item_name: item.item_name,
    quantity: item.quantity,
    rate: item.rate,
    amount: item.quantity * item.rate
  }))

  const { error: itemsError } = await supabase
    .from('pharmacy_sales_bill_details')
    .insert(saleItems)

  if (itemsError) {
    // Rollback the bill if items insertion fails
    await supabase.from('pharmacy_sales_bills').delete().eq('id', bill.id)
    throw new Error('Failed to create sale items')
  }

  return bill
}

// Get stock alerts (low stock and expiring items)
export async function getStockAlerts(): Promise<StockAlert[]> {
  const { data: items, error } = await supabase
    .from('pharmacy_items_full')
    .select('id, name, stock_quantity, reorder_level, expiry_date')

  if (error) {
    throw new Error('Failed to fetch stock alerts')
  }

  const alerts: StockAlert[] = []
  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))

  items?.forEach((item: any) => {
    // Check for low stock
    if (item.stock_quantity <= 0) {
      alerts.push({
        item_id: item.id,
        item_name: item.name,
        current_stock: item.stock_quantity || 0,
        reorder_level: item.reorder_level || 0,
        status: 'out_of_stock'
      })
    } else if (item.stock_quantity <= (item.reorder_level || 5)) {
      alerts.push({
        item_id: item.id,
        item_name: item.name,
        current_stock: item.stock_quantity,
        reorder_level: item.reorder_level || 5,
        status: 'low_stock'
      })
    }

    // Check for expiring items
    if (item.expiry_date) {
      const expiryDate = new Date(item.expiry_date)
      if (expiryDate <= thirtyDaysFromNow) {
        alerts.push({
          item_id: item.id,
          item_name: item.name,
          current_stock: item.stock_quantity || 0,
          reorder_level: item.reorder_level || 0,
          status: 'expiring_soon',
          expiry_date: item.expiry_date
        })
      }
    }
  })

  return alerts
}

// Get pharmacy statistics
export async function getPharmacyStats() {
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().slice(0, 7)

  // Today's sales
  const { data: todaySales } = await supabase
    .from('pharmacy_sales_bills')
    .select('net_amount')
    .gte('created_at', `${today}T00:00:00`)
    .lt('created_at', `${today}T23:59:59`)

  // This month's sales
  const { data: monthSales } = await supabase
    .from('pharmacy_sales_bills')
    .select('net_amount')
    .gte('created_at', `${thisMonth}-01T00:00:00`)

  // Total items count
  const { count: totalItems } = await supabase
    .from('pharmacy_items_full')
    .select('*', { count: 'exact', head: true })

  // Stock alerts count
  const alerts = await getStockAlerts()

  const todayRevenue = todaySales?.reduce((sum, sale) => sum + (sale.net_amount || 0), 0) || 0
  const monthRevenue = monthSales?.reduce((sum, sale) => sum + (sale.net_amount || 0), 0) || 0

  return {
    todayRevenue,
    monthRevenue,
    totalItems: totalItems || 0,
    lowStockItems: alerts.filter(alert => alert.status === 'low_stock').length,
    outOfStockItems: alerts.filter(alert => alert.status === 'out_of_stock').length,
    expiringItems: alerts.filter(alert => alert.status === 'expiring_soon').length,
    totalAlerts: alerts.length
  }
}