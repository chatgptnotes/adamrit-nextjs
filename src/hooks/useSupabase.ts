'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function useQuery<T>(table: string, options?: { select?: string; limit?: number; order?: { col: string; asc?: boolean } }) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let q = supabase.from(table).select(options?.select || '*')
      if (options?.order) q = q.order(options.order.col, { ascending: options.order.asc ?? false })
      if (options?.limit) q = q.limit(options.limit)
      const { data: d } = await q
      setData((d || []) as T[])
      setLoading(false)
    }
    fetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  return { data, loading }
}

export function usePatients() {
  return useQuery<any>('patients_full', { order: { col: 'id', asc: false }, limit: 500 })
}

export function usePersons() {
  return useQuery<any>('persons', { order: { col: 'id', asc: false }, limit: 500 })
}

export function useWardPatients() {
  return useQuery<any>('ward_patients_full', { order: { col: 'in_date', asc: false }, limit: 500 })
}

export function useAppointments() {
  return useQuery<any>('appointments_full', { order: { col: 'date', asc: false }, limit: 500 })
}

export function useBillings() {
  return useQuery<any>('billings_full', { order: { col: 'date', asc: false }, limit: 500 })
}

export function useDischargeSummaries() {
  return useQuery<any>('discharge_summaries_full', { order: { col: 'id', asc: false }, limit: 500 })
}

export function useDiagnoses() {
  return useQuery<any>('diagnoses_full', { order: { col: 'id', asc: false }, limit: 500 })
}

export function useDoctors() {
  return useQuery<any>('doctors', { order: { col: 'doctor_name', asc: true } })
}

export function useSurgeries() {
  return useQuery<any>('surgeries', { order: { col: 'name', asc: true }, limit: 500 })
}

export function useLabOrders() {
  return useQuery<any>('laboratory_test_orders', { order: { col: 'start_date', asc: false }, limit: 500 })
}

export function usePharmacyItems() {
  return useQuery<any>('pharmacy_items_full', { order: { col: 'product_name', asc: true }, limit: 500 })
}

export function usePharmacySales() {
  return useQuery<any>('pharmacy_sales_bills', { order: { col: 'created_at', asc: false }, limit: 500 })
}

export function useWards() {
  return useQuery<any>('wards', { order: { col: 'name', asc: true } })
}

export function useDashboardStats() {
  const [stats, setStats] = useState({ patients: 0, admitted: 0, appointments: 0, billings: 0, revenue: 0, discharged: 0, doctors: 0, surgeries: 0, labOrders: 0, pharmacyItems: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const [p, w, a, b, d, doc, s, l, ph] = await Promise.all([
        supabase.from('patients_full').select('id', { count: 'exact', head: true }),
        supabase.from('ward_patients_full').select('id', { count: 'exact', head: true }),
        supabase.from('appointments_full').select('id', { count: 'exact', head: true }),
        supabase.from('billings_full').select('total_amount'),
        supabase.from('discharge_summaries_full').select('id', { count: 'exact', head: true }),
        supabase.from('doctors').select('id', { count: 'exact', head: true }),
        supabase.from('surgeries').select('id', { count: 'exact', head: true }),
        supabase.from('laboratory_test_orders').select('id', { count: 'exact', head: true }),
        supabase.from('pharmacy_items_full').select('id', { count: 'exact', head: true }),
      ])
      const revenue = (b.data || []).reduce((sum: number, r: any) => {
        const amt = parseFloat(r.total_amount) || 0
        return sum + amt
      }, 0)
      setStats({
        patients: p.count || 0,
        admitted: w.count || 0,
        appointments: a.count || 0,
        billings: (b.data || []).length,
        revenue,
        discharged: d.count || 0,
        doctors: doc.count || 0,
        surgeries: s.count || 0,
        labOrders: l.count || 0,
        pharmacyItems: ph.count || 0,
      })
      setLoading(false)
    }
    fetch()
  }, [])

  return { stats, loading }
}
