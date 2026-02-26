'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function useQuery<T>(table: string, options?: { select?: string; limit?: number; order?: { col: string; asc?: boolean }; eq?: [string, string | number] }) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      let q = supabase.from(table).select(options?.select || '*')
      if (options?.eq) q = q.eq(options.eq[0], options.eq[1])
      if (options?.order) q = q.order(options.order.col, { ascending: options.order.asc ?? false })
      if (options?.limit) q = q.limit(options.limit)
      const { data: d, error: e } = await q
      if (e) setError(e.message)
      else setData((d || []) as T[])
      setLoading(false)
    }
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table])

  return { data, loading, error }
}

export interface Patient {
  id: number
  first_name: string
  last_name: string
  age: number | null
  gender: string | null
  phone: string | null
  uhid: string | null
  admission_date: string | null
  status: string | null
}

export interface WardPatient {
  id: number
  patient_id: number
  ward_id: number
  room_id: number | null
  bed_number: string | null
  admission_date: string | null
  discharge_date: string | null
  status: string | null
  doctor_name: string | null
  first_name: string | null
  last_name: string | null
}

export interface Appointment {
  id: number
  patient_id: number
  doctor_name: string | null
  appointment_date: string | null
  start_time: string | null
  status: string | null
  first_name: string | null
  last_name: string | null
}

export interface Billing {
  id: number
  patient_id: number
  total_amount: number | null
  paid_amount: number | null
  billing_date: string | null
  status: string | null
  first_name: string | null
  last_name: string | null
}

export interface DischargeSummary {
  id: number
  patient_id: number
  discharge_date: string | null
  diagnosis: string | null
  treatment: string | null
  first_name: string | null
  last_name: string | null
}

export interface Ward {
  id: number
  name: string
  total_beds: number | null
  floor: string | null
}

export function usePatients() {
  return useQuery<Patient>('patients', { order: { col: 'id', asc: false }, limit: 500 })
}

export function useWardPatients() {
  return useQuery<WardPatient>('ward_patients', { order: { col: 'admission_date', asc: false }, limit: 200 })
}

export function useAppointments() {
  return useQuery<Appointment>('appointments', { order: { col: 'appointment_date', asc: false }, limit: 300 })
}

export function useBillings() {
  return useQuery<Billing>('billings', { order: { col: 'billing_date', asc: false }, limit: 500 })
}

export function useDischargeSummaries() {
  return useQuery<DischargeSummary>('discharge_summaries', { order: { col: 'discharge_date', asc: false }, limit: 200 })
}

export function useWards() {
  return useQuery<Ward>('wards', { order: { col: 'name', asc: true } })
}

export function useDashboardStats() {
  const [stats, setStats] = useState({ patients: 0, admitted: 0, appointments: 0, billings: 0, revenue: 0, discharged: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const [p, w, a, b, d] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('ward_patients').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase.from('billings').select('total_amount'),
        supabase.from('discharge_summaries').select('id', { count: 'exact', head: true }),
      ])
      const revenue = (b.data || []).reduce((sum: number, r: Record<string, number | null>) => sum + (r.total_amount || 0), 0)
      setStats({
        patients: p.count || 0,
        admitted: w.count || 0,
        appointments: a.count || 0,
        billings: (b.data || []).length,
        revenue,
        discharged: d.count || 0,
      })
      setLoading(false)
    }
    fetch()
  }, [])

  return { stats, loading }
}
