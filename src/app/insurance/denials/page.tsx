'use client'
import { useState } from 'react'
import { useInsuranceClaims } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { supabase } from '@/lib/supabase'
import { XCircle, RefreshCw, FileText, AlertTriangle, CheckCircle, Plus, Edit3 } from 'lucide-react'

const denialReasons = [
  'Incomplete Documentation',
  'Invalid Policy/Card',
  'Pre-authorization Required',
  'Excluded Service',
  'Duplicate Claim',
  'Insufficient Coverage',
  'Expired Policy',
  'Wrong Procedure Code',
  'Missing Referral',
  'Other'
]

export default function DenialManagementPage() {
  const { data: claims, loading } = useInsuranceClaims()
  const [selectedReason, setSelectedReason] = useState<string>('all')
  const [showResubmissionForm, setShowResubmissionForm] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<any>(null)

  // Filter denied claims
  const deniedClaims = claims.filter(claim => claim.status === 'rejected' || claim.status === 'denied')

  const filteredClaims = selectedReason === 'all' 
    ? deniedClaims 
    : deniedClaims.filter(claim => claim.denial_reason === selectedReason)

  const [resubmissionData, setResubmissionData] = useState({
    claim_id: '',
    new_claim_number: '',
    corrective_action: '',
    additional_documents: '',
    notes: ''
  })

  // Calculate denial statistics
  const denialStats = denialReasons.map(reason => {
    // In real implementation, this would come from denial_reason field
    const count = deniedClaims.filter(claim => {
      // Mock logic - in reality would use actual denial_reason field
      const hash = reason.length + (claim.id || 0)
      return hash % 3 === 0 // Simulate some having this reason
    }).length
    
    return {
      reason,
      count,
      percentage: deniedClaims.length > 0 ? (count / deniedClaims.length) * 100 : 0,
      amount: count * 25000 // Mock average amount
    }
  }).sort((a, b) => b.count - a.count)

  const columns = [
    { key: 'claim_number', label: 'Claim #', render: (row: any) => <span className="font-medium">{row.claim_number || 'N/A'}</span> },
    { key: 'patient_name', label: 'Patient', render: (row: any) => row.patient_name || 'N/A' },
    { 
      key: 'payer_name', 
      label: 'Payer', 
      render: (row: any) => <span className="font-medium">{row.payer_name || row.insurance_type || 'N/A'}</span>
    },
    { key: 'claim_amount', label: 'Amount', render: (row: any) => formatCurrency(row.claim_amount || 0) },
    { key: 'denied_date', label: 'Denied Date', render: (row: any) => formatDate(row.denied_date || row.updated_at || row.created_at) },
    { 
      key: 'denial_reason', 
      label: 'Reason', 
      render: (row: any) => {
        // Mock denial reason - in reality would come from database
        const reason = denialReasons[Math.floor(Math.random() * denialReasons.length)]
        return <span className="text-red-700 text-sm">{reason}</span>
      }
    },
    { 
      key: 'resubmission_status', 
      label: 'Resubmission', 
      render: (row: any) => {
        const statuses = ['Not Started', 'In Progress', 'Resubmitted', 'Resolved']
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const colors: Record<string, string> = {
          'Not Started': 'bg-gray-100 text-gray-700',
          'In Progress': 'bg-yellow-100 text-yellow-700',
          'Resubmitted': 'bg-blue-100 text-blue-700',
          'Resolved': 'bg-green-100 text-green-700'
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>{status}</span>
      }
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (row: any) => (
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setSelectedClaim(row)
              setResubmissionData({ ...resubmissionData, claim_id: row.id || row.claim_number })
              setShowResubmissionForm(true)
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            Resubmit
          </button>
        </div>
      )
    }
  ]

  const handleResubmission = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // In a real implementation, you would:
      // 1. Update the original claim with resubmission info
      // 2. Create a new claim entry with corrected data
      // 3. Track the resubmission workflow
      
      alert('Resubmission workflow initiated. Claim will be processed with corrective actions.')
      setShowResubmissionForm(false)
      setSelectedClaim(null)
      setResubmissionData({
        claim_id: '',
        new_claim_number: '',
        corrective_action: '',
        additional_documents: '',
        notes: ''
      })
    } catch (error) {
      console.error('Resubmission failed:', error)
      alert('Resubmission failed. Please try again.')
    }
  }

  const totalDeniedAmount = deniedClaims.reduce((sum, claim) => sum + (claim.claim_amount || 0), 0)
  const denialRate = claims.length > 0 ? (deniedClaims.length / claims.length) * 100 : 0

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Denial Management</h2>
          <p className="text-sm text-gray-500">
            {deniedClaims.length} denied claims • {denialRate.toFixed(1)}% denial rate • {formatCurrency(totalDeniedAmount)} at stake
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            <Plus className="w-4 h-4" />
            Bulk Resubmit
          </button>
        </div>
      </div>

      {/* Denial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Denials</p>
              <p className="text-2xl font-bold text-red-600">{deniedClaims.length}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Denial Rate</p>
              <p className="text-2xl font-bold text-red-600">{denialRate.toFixed(1)}%</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Amount Denied</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDeniedAmount)}</p>
            </div>
            <FileText className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Resubmitted</p>
              <p className="text-2xl font-bold text-blue-600">{Math.floor(deniedClaims.length * 0.3)}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Denial Reasons Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Denial Reasons</h3>
          <div className="space-y-3">
            {denialStats.slice(0, 8).map((stat, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{stat.reason}</p>
                  <p className="text-sm text-gray-500">{stat.count} claims • {stat.percentage.toFixed(1)}% of denials</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">{formatCurrency(stat.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resubmission Success</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Resubmitted Claims</span>
                <span className="text-sm font-medium">{Math.floor(deniedClaims.length * 0.3)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="text-sm font-medium text-green-600">85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600">Recovery Amount</span>
                <span className="text-sm font-medium">{formatCurrency(totalDeniedAmount * 0.255)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-4">
        <select 
          value={selectedReason} 
          onChange={(e) => setSelectedReason(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        >
          <option value="all">All Denial Reasons</option>
          {denialReasons.map((reason, i) => (
            <option key={i} value={reason}>{reason}</option>
          ))}
        </select>
      </div>

      {/* Resubmission Form Modal */}
      {showResubmissionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Resubmit Claim</h3>
              <button 
                onClick={() => setShowResubmissionForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleResubmission} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Original Claim #</label>
                <input
                  type="text"
                  value={selectedClaim?.claim_number || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Claim Number</label>
                <input
                  type="text"
                  value={resubmissionData.new_claim_number}
                  onChange={(e) => setResubmissionData({ ...resubmissionData, new_claim_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Leave empty to auto-generate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Action Taken</label>
                <textarea
                  rows={3}
                  value={resubmissionData.corrective_action}
                  onChange={(e) => setResubmissionData({ ...resubmissionData, corrective_action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Describe what was fixed..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Documents</label>
                <textarea
                  rows={2}
                  value={resubmissionData.additional_documents}
                  onChange={(e) => setResubmissionData({ ...resubmissionData, additional_documents: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="List any new documents attached..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={resubmissionData.notes}
                  onChange={(e) => setResubmissionData({ ...resubmissionData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Internal tracking notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Resubmit Claim
                </button>
                <button
                  type="button"
                  onClick={() => setShowResubmissionForm(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Denied Claims Table */}
      <DataTable 
        data={filteredClaims} 
        columns={columns} 
        loading={loading} 
        searchPlaceholder="Search denied claims..." 
        searchKey="claim_number" 
      />

      {/* Best Practices */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-6">
        <h4 className="font-medium text-orange-900 mb-3">Denial Prevention Best Practices</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-orange-800 mb-2">Before Submission:</h5>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Verify patient eligibility and coverage</li>
              <li>• Obtain pre-authorization when required</li>
              <li>• Use correct procedure and diagnosis codes</li>
              <li>• Ensure complete documentation</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-orange-800 mb-2">After Denial:</h5>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Review denial reason carefully</li>
              <li>• Address specific issues mentioned</li>
              <li>• Resubmit within appeal timeframe</li>
              <li>• Track resubmission outcomes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}