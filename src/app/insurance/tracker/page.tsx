'use client'
import { useState } from 'react'
import { useInsuranceClaims } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Clock, CheckCircle, XCircle, DollarSign, TrendingUp, Search } from 'lucide-react'

const statusPipeline = [
  { key: 'submitted', label: 'Submitted', icon: Clock, color: 'blue' },
  { key: 'under_review', label: 'Under Review', icon: Search, color: 'yellow' },
  { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'green' },
  { key: 'payment_received', label: 'Payment Received', icon: DollarSign, color: 'emerald' }
]

const rejectedStatus = { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'red' }

export default function ClaimTrackerPage() {
  const { data: claims, loading } = useInsuranceClaims()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter claims
  const filteredClaims = claims.filter((claim: any) => {
    const matchesStatus = selectedStatus === 'all' || claim.status === selectedStatus
    const matchesSearch = !searchTerm || 
      claim.claim_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.payer_name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  // Calculate stats for each status
  const statusStats = statusPipeline.map(status => {
    const statusClaims = claims.filter(claim => claim.status === status.key)
    return {
      ...status,
      count: statusClaims.length,
      amount: statusClaims.reduce((sum, claim) => sum + (claim.claim_amount || 0), 0)
    }
  })

  const rejectedStats = {
    ...rejectedStatus,
    count: claims.filter(claim => claim.status === 'rejected').length,
    amount: claims.filter(claim => claim.status === 'rejected').reduce((sum, claim) => sum + (claim.claim_amount || 0), 0)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Claim Tracker</h2>
        <p className="text-sm text-gray-500">Track claims across all payers through the approval pipeline</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by claim #, patient, or payer..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <select 
          value={selectedStatus} 
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          {statusPipeline.map(status => (
            <option key={status.key} value={status.key}>{status.label}</option>
          ))}
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Status Pipeline */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {statusStats.map((status, i) => (
            <div 
              key={i} 
              className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
                selectedStatus === status.key ? `border-${status.color}-500` : 'border-gray-200'
              }`}
              onClick={() => setSelectedStatus(selectedStatus === status.key ? 'all' : status.key)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-${status.color}-50 text-${status.color}-600`}>
                  <status.icon className="w-5 h-5" />
                </div>
                {i < statusStats.length - 1 && (
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{status.label}</p>
                <p className="text-2xl font-bold text-gray-900">{status.count}</p>
                <p className="text-sm text-gray-500">{formatCurrency(status.amount)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rejected Claims - Separate */}
        <div className="bg-white rounded-xl border-2 border-red-200 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-red-50 text-red-600">
              <rejectedStatus.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{rejectedStats.count} Rejected Claims</p>
              <p className="text-sm text-gray-500">{formatCurrency(rejectedStats.amount)} - Requires resubmission</p>
            </div>
            <button 
              onClick={() => setSelectedStatus('rejected')}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Review Rejected
            </button>
          </div>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedStatus === 'all' ? 'All Claims' : statusPipeline.find(s => s.key === selectedStatus)?.label || rejectedStatus.label}
            <span className="text-sm text-gray-500 ml-2">({filteredClaims.length} claims)</span>
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Claim #</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Patient</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Payer</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Amount</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Submitted</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Days Pending</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No claims found for the selected filters
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim: any, i: number) => {
                  const submittedDate = new Date(claim.submitted_date || claim.created_at)
                  const daysPending = Math.floor((new Date().getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24))
                  
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-medium">{claim.claim_number || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{claim.patient_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">ID: {claim.patient_id || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{claim.payer_name || claim.insurance_type || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold">{formatCurrency(claim.claim_amount || 0)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {formatDate(claim.submitted_date || claim.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${
                          daysPending > 30 ? 'text-red-600' : 
                          daysPending > 14 ? 'text-yellow-600' : 
                          'text-gray-600'
                        }`}>
                          {daysPending} days
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const status = claim.status || 'submitted'
                          const statusConfig = [...statusPipeline, rejectedStatus].find(s => s.key === status)
                          if (!statusConfig) return <span>—</span>
                          
                          return (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${statusConfig.color}-100 text-${statusConfig.color}-700`}>
                              {statusConfig.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-2">Average Processing Time</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">ESIC Claims</span>
              <span className="font-medium">12 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">PM-JAY Claims</span>
              <span className="font-medium">8 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Corporate Claims</span>
              <span className="font-medium">15 days</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-2">Approval Rates</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">This Month</span>
              <span className="font-medium text-green-600">87%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Last Month</span>
              <span className="font-medium">82%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">YTD Average</span>
              <span className="font-medium">85%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-2">Payment Collection</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Outstanding</span>
              <span className="font-medium text-orange-600">{formatCurrency(2450000)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">This Month</span>
              <span className="font-medium text-green-600">{formatCurrency(1890000)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Collection Rate</span>
              <span className="font-medium">92%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}