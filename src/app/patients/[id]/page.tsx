'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, User, Calendar, Receipt } from 'lucide-react'

export default function PatientDetail({ params }: { params: { id: string } }) {
  const [patient, setPatient] = useState<any | null>(null)
  const [billings, setBillings] = useState<any[]>([])
  const [admissions, setAdmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'billing' | 'admissions'>('overview')

  useEffect(() => {
    async function fetch() {
      const [p, b, a] = await Promise.all([
        supabase.from('patients').select('*').eq('id', params.id).single(),
        supabase.from('billings').select('*').eq('patient_id', params.id).order('billing_date', { ascending: false }),
        supabase.from('ward_patients').select('*').eq('patient_id', params.id).order('admission_date', { ascending: false }),
      ])
      if (p.data) setPatient(p.data)
      setBillings(b.data || [])
      setAdmissions(a.data || [])
      setLoading(false)
    }
    fetch()
  }, [params.id])

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-gray-200 rounded" /><div className="h-64 bg-gray-100 rounded-xl" /></div>
  if (!patient) return <div className="text-center py-12 text-gray-400">Patient not found</div>

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'billing', label: `Billing (${billings.length})`, icon: Receipt },
    { key: 'admissions', label: `Admissions (${admissions.length})`, icon: Calendar },
  ] as const

  return (
    <div>
      <Link href="/patients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Patients
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xl font-bold">
            {(patient.first_name as string)?.[0] || '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{patient.first_name as string} {patient.last_name as string}</h1>
            <p className="text-sm text-gray-500">ID: {patient.id as number} &middot; Age: {patient.age as number || '—'} &middot; {patient.gender as string || '—'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Patient Details</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['First Name', patient.first_name],
              ['Last Name', patient.last_name],
              ['Age', patient.age],
              ['Gender', patient.gender],
              ['Phone', patient.phone],
              ['Status', patient.status],
              ['Admission Date', formatDate(patient.admission_date as string)],
            ].map(([label, val]) => (
              <div key={label as string}><dt className="text-gray-500">{label as string}</dt><dd className="font-medium text-gray-900 mt-0.5">{(val as string) || '—'}</dd></div>
            ))}
          </dl>
        </div>
      )}

      {tab === 'billing' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Date</th><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Amount</th><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Paid</th><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {billings.map((b, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">{formatDate(b.billing_date as string)}</td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(b.total_amount as number)}</td>
                  <td className="px-4 py-3">{formatCurrency(b.paid_amount as number)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{(b.status as string) || 'billed'}</span></td>
                </tr>
              ))}
              {billings.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No billing records</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'admissions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b"><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Admitted</th><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Discharged</th><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Ward</th><th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {admissions.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">{formatDate(a.admission_date as string)}</td>
                  <td className="px-4 py-3">{formatDate(a.discharge_date as string)}</td>
                  <td className="px-4 py-3">Ward {a.ward_id as number}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{(a.status as string) || 'admitted'}</span></td>
                </tr>
              ))}
              {admissions.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No admission records</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
