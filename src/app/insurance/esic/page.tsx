'use client'
import { useState } from 'react'
import { useInsuranceClaims } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { supabase } from '@/lib/supabase'
import { Plus, Upload, Download, RefreshCw } from 'lucide-react'

export default function ESICClaimsPage() {
  const { data, loading } = useInsuranceClaims()
  const [showNewClaimForm, setShowNewClaimForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filter ESIC claims
  const esicClaims = data.filter((claim: any) => 
    claim.insurance_type?.toLowerCase() === 'esic' || 
    claim.payer_name?.toLowerCase().includes('esic')
  )

  const [newClaim, setNewClaim] = useState({
    patient_id: '',
    claim_number: '',
    claim_amount: '',
    treatment_details: '',
    admission_date: '',
    discharge_date: '',
    location_id: '1', // Default to Hope Hospital
    status: 'pending'
  })

  const columns = [
    { key: 'claim_number', label: 'Claim #' },
    { key: 'patient_name', label: 'Patient', render: (row: any) => <span className="font-medium">{row.patient_name || 'N/A'}</span> },
    { key: 'claim_amount', label: 'Amount', render: (row: any) => <span className="font-semibold">{formatCurrency(row.claim_amount || 0)}</span> },
    { key: 'submitted_date', label: 'Submitted', render: (row: any) => formatDate(row.submitted_date || row.created_at) },
    { 
      key: 'status', 
      label: 'Status',
      render: (row: any) => {
        const status = row.status || 'pending'
        const colors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-700',
          submitted: 'bg-blue-100 text-blue-700',
          approved: 'bg-green-100 text-green-700',
          rejected: 'bg-red-100 text-red-700',
          paid: 'bg-emerald-100 text-emerald-700'
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>{status}</span>
      }
    },
    { key: 'location_name', label: 'Location', render: (row: any) => row.location_id === 1 ? 'Hope Hospital' : 'Ayushman Hospital' }
  ]

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const claimData = {
        ...newClaim,
        claim_amount: parseFloat(newClaim.claim_amount) || 0,
        insurance_type: 'ESIC',
        payer_name: 'ESIC',
        submitted_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      // Try to insert the claim
      const { error } = await supabase
        .from('insurance_claims')
        .insert([claimData])

      if (error) {
        console.error('Error creating claim:', error)
        alert('Error creating claim. The insurance_claims table may not exist yet.')
      } else {
        alert('Claim submitted successfully!')
        setNewClaim({
          patient_id: '',
          claim_number: '',
          claim_amount: '',
          treatment_details: '',
          admission_date: '',
          discharge_date: '',
          location_id: '1',
          status: 'pending'
        })
        setShowNewClaimForm(false)
        // In a real app, you'd refresh the data here
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error creating claim')
    }

    setSubmitting(false)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">ESIC Claims</h2>
          <p className="text-sm text-gray-500">{esicClaims.length} ESIC claims</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowNewClaimForm(!showNewClaimForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Claim
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {showNewClaimForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit New ESIC Claim</h3>
          <form onSubmit={handleSubmitClaim} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <input
                type="text"
                value={newClaim.patient_id}
                onChange={(e) => setNewClaim({ ...newClaim, patient_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Number</label>
              <input
                type="text"
                value={newClaim.claim_number}
                onChange={(e) => setNewClaim({ ...newClaim, claim_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={newClaim.claim_amount}
                onChange={(e) => setNewClaim({ ...newClaim, claim_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={newClaim.location_id}
                onChange={(e) => setNewClaim({ ...newClaim, location_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discharge Date</label>
              <input
                type="date"
                value={newClaim.discharge_date}
                onChange={(e) => setNewClaim({ ...newClaim, discharge_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Details</label>
              <textarea
                rows={3}
                value={newClaim.treatment_details}
                onChange={(e) => setNewClaim({ ...newClaim, treatment_details: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Describe the treatment provided..."
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
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
        data={esicClaims} 
        columns={columns} 
        loading={loading} 
        searchPlaceholder="Search ESIC claims..." 
        searchKey="claim_number" 
      />

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">ESIC Claims Process</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure patient has valid ESIC card and employee details</li>
          <li>• Submit claims within 30 days of treatment</li>
          <li>• Upload required documents: discharge summary, bills, ESIC form</li>
          <li>• Track status regularly and follow up on pending claims</li>
          <li>• Contact ESIC office for rejected claims clarification</li>
        </ul>
      </div>
    </div>
  )
}