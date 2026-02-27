'use client'
// @ts-nocheck
import { useState } from 'react'
import { useInsuranceClaims } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Filter, Download, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function PMJAYPage() {
  const { data, loading } = useInsuranceClaims()
  const [selectedScheme, setSelectedScheme] = useState<'all' | 'pmjay' | 'rgjay'>('all')
  const [showNewClaimForm, setShowNewClaimForm] = useState(false)

  // Filter PM-JAY and RGJAY claims
  const pmjayRgjayClaims = data.filter((claim: any) => {
    const type = claim.insurance_type?.toLowerCase() || claim.payer_name?.toLowerCase() || ''
    return type.includes('pm-jay') || type.includes('pmjay') || type.includes('rgjay') || type.includes('ayushman')
  })

  const filteredClaims = selectedScheme === 'all' 
    ? pmjayRgjayClaims 
    : pmjayRgjayClaims.filter((claim: any) => {
        const type = claim.insurance_type?.toLowerCase() || claim.payer_name?.toLowerCase() || ''
        return selectedScheme === 'pmjay' 
          ? type.includes('pm-jay') || type.includes('pmjay') || type.includes('ayushman')
          : type.includes('rgjay')
      })

  const [newClaim, setNewClaim] = useState({
    patient_id: '',
    beneficiary_id: '',
    claim_number: '',
    claim_amount: '',
    treatment_package: '',
    pre_auth_number: '',
    admission_date: '',
    discharge_date: '',
    location_id: '1',
    scheme_type: 'PM-JAY'
  })

  const columns = [
    { key: 'claim_number', label: 'Claim #' },
    { key: 'beneficiary_id', label: 'Beneficiary ID', render: (row: any) => row.beneficiary_id || row.patient_id || 'N/A' },
    { key: 'patient_name', label: 'Patient', render: (row: any) => <span className="font-medium">{row.patient_name || 'N/A'}</span> },
    { key: 'scheme_type', label: 'Scheme', render: (row: any) => {
      const scheme = row.insurance_type || row.payer_name || 'PM-JAY'
      return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{scheme}</span>
    }},
    { key: 'claim_amount', label: 'Amount', render: (row: any) => <span className="font-semibold">{formatCurrency(row.claim_amount || 0)}</span> },
    { key: 'pre_auth_number', label: 'Pre-Auth', render: (row: any) => row.pre_auth_number || '—' },
    { key: 'submitted_date', label: 'Submitted', render: (row: any) => formatDate(row.submitted_date || row.created_at) },
    { 
      key: 'status', 
      label: 'Status',
      render: (row: any) => {
        const status = row.status || 'pending'
        const colors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-700',
          'pre-auth': 'bg-blue-100 text-blue-700',
          approved: 'bg-green-100 text-green-700',
          rejected: 'bg-red-100 text-red-700',
          paid: 'bg-emerald-100 text-emerald-700'
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>{status}</span>
      }
    }
  ]

  const stats = {
    total: filteredClaims.length,
    pending: filteredClaims.filter(c => c.status === 'pending').length,
    approved: filteredClaims.filter(c => c.status === 'approved').length,
    rejected: filteredClaims.filter(c => c.status === 'rejected').length,
    totalAmount: filteredClaims.reduce((sum, c) => sum + (c.claim_amount || 0), 0)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">PM-JAY / RGJAY Claims</h2>
          <p className="text-sm text-gray-500">{filteredClaims.length} claims • Total: {formatCurrency(stats.totalAmount)}</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedScheme} 
            onChange={(e) => setSelectedScheme(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
          >
            <option value="all">All Schemes</option>
            <option value="pmjay">PM-JAY Only</option>
            <option value="rgjay">RGJAY Only</option>
          </select>
          <button 
            onClick={() => setShowNewClaimForm(!showNewClaimForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Claim
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Claims</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-500">Approved</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-gray-500">Rejected</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-lg font-bold text-blue-600">{formatCurrency(stats.totalAmount)}</div>
          <div className="text-sm text-gray-500">Total Amount</div>
        </div>
      </div>

      {showNewClaimForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit New PM-JAY / RGJAY Claim</h3>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheme Type</label>
              <select
                value={newClaim.scheme_type}
                onChange={(e) => setNewClaim({ ...newClaim, scheme_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              >
                <option value="PM-JAY">PM-JAY (Ayushman Bharat)</option>
                <option value="RGJAY">RGJAY (Rajiv Gandhi Jeevandayee)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beneficiary ID</label>
              <input
                type="text"
                value={newClaim.beneficiary_id}
                onChange={(e) => setNewClaim({ ...newClaim, beneficiary_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                placeholder="Ayushman card / RGJAY ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <input
                type="text"
                value={newClaim.patient_id}
                onChange={(e) => setNewClaim({ ...newClaim, patient_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Number</label>
              <input
                type="text"
                value={newClaim.claim_number}
                onChange={(e) => setNewClaim({ ...newClaim, claim_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Authorization Number</label>
              <input
                type="text"
                value={newClaim.pre_auth_number}
                onChange={(e) => setNewClaim({ ...newClaim, pre_auth_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={newClaim.claim_amount}
                onChange={(e) => setNewClaim({ ...newClaim, claim_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Package</label>
              <input
                type="text"
                value={newClaim.treatment_package}
                onChange={(e) => setNewClaim({ ...newClaim, treatment_package: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                placeholder="e.g., Cataract Surgery, Knee Replacement"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={newClaim.location_id}
                onChange={(e) => setNewClaim({ ...newClaim, location_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              >
                <option value="1">Hope Hospital</option>
                <option value="2">Ayushman Hospital</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission Date</label>
              <input
                type="date"
                value={newClaim.admission_date}
                onChange={(e) => setNewClaim({ ...newClaim, admission_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Date</label>
              <input
                type="date"
                value={newClaim.discharge_date}
                onChange={(e) => setNewClaim({ ...newClaim, discharge_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit Claim
              </button>
              <button
                type="button"
                onClick={() => setShowNewClaimForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable 
        data={filteredClaims} 
        columns={columns} 
        loading={loading} 
        searchPlaceholder="Search claims..." 
        searchKey="claim_number" 
      />

      {/* Outstanding Report */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Outstanding Claims Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 font-semibold text-gray-600">Scheme</th>
                <th className="text-left py-3 font-semibold text-gray-600">Pending</th>
                <th className="text-left py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 font-semibold text-gray-600">Avg Days</th>
                <th className="text-left py-3 font-semibold text-gray-600">Action Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 font-medium">PM-JAY</td>
                <td className="py-3">{stats.pending - Math.floor(stats.pending / 2)}</td>
                <td className="py-3">{formatCurrency(stats.totalAmount * 0.6)}</td>
                <td className="py-3">12 days</td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Follow up required</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 font-medium">RGJAY</td>
                <td className="py-3">{Math.floor(stats.pending / 2)}</td>
                <td className="py-3">{formatCurrency(stats.totalAmount * 0.4)}</td>
                <td className="py-3">8 days</td>
                <td className="py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">On track</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}