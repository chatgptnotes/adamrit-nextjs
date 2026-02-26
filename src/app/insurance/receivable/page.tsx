'use client'
import { useState } from 'react'
import { useInsuranceClaims } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { DollarSign, TrendingDown, AlertTriangle, Calendar, Download, RefreshCw } from 'lucide-react'

const agingBuckets = [
  { key: '0-30', label: '0-30 Days', color: 'green' },
  { key: '31-60', label: '31-60 Days', color: 'yellow' },
  { key: '61-90', label: '61-90 Days', color: 'orange' },
  { key: '90+', label: '90+ Days', color: 'red' }
]

export default function AccountReceivablePage() {
  const { data: claims, loading } = useInsuranceClaims()
  const [selectedAging, setSelectedAging] = useState<string>('all')
  const [selectedPayer, setSelectedPayer] = useState<string>('all')

  // Calculate outstanding claims (approved but not yet paid)
  const outstandingClaims = claims.filter(claim => 
    claim.status === 'approved' && !claim.payment_received_date
  )

  // Calculate aging for each claim
  const claimsWithAging = outstandingClaims.map(claim => {
    const approvedDate = new Date(claim.approved_date || claim.created_at)
    const today = new Date()
    const daysOutstanding = Math.floor((today.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    let agingBucket = '0-30'
    if (daysOutstanding > 90) agingBucket = '90+'
    else if (daysOutstanding > 60) agingBucket = '61-90'
    else if (daysOutstanding > 30) agingBucket = '31-60'

    return {
      ...claim,
      days_outstanding: daysOutstanding,
      aging_bucket: agingBucket
    }
  })

  // Filter claims
  const filteredClaims = claimsWithAging.filter(claim => {
    const matchesAging = selectedAging === 'all' || claim.aging_bucket === selectedAging
    const matchesPayer = selectedPayer === 'all' || 
      (claim.payer_name || claim.insurance_type || '').toLowerCase().includes(selectedPayer.toLowerCase())
    return matchesAging && matchesPayer
  })

  // Calculate aging summary
  const agingSummary = agingBuckets.map(bucket => {
    const bucketClaims = claimsWithAging.filter(claim => claim.aging_bucket === bucket.key)
    return {
      ...bucket,
      count: bucketClaims.length,
      amount: bucketClaims.reduce((sum, claim) => sum + (claim.claim_amount || 0), 0)
    }
  })

  // Payer-wise outstanding
  const payerOutstanding = claims.reduce((acc: any[], claim) => {
    if (claim.status !== 'approved' || claim.payment_received_date) return acc
    
    const payerName = claim.payer_name || claim.insurance_type || 'Unknown'
    const existing = acc.find(p => p.name === payerName)
    
    if (existing) {
      existing.amount += claim.claim_amount || 0
      existing.claims += 1
    } else {
      acc.push({
        name: payerName,
        amount: claim.claim_amount || 0,
        claims: 1
      })
    }
    
    return acc
  }, []).sort((a, b) => b.amount - a.amount)

  const columns = [
    { key: 'claim_number', label: 'Claim #', render: (row: any) => <span className="font-medium">{row.claim_number || 'N/A'}</span> },
    { key: 'patient_name', label: 'Patient', render: (row: any) => row.patient_name || 'N/A' },
    { 
      key: 'payer_name', 
      label: 'Payer', 
      render: (row: any) => (
        <span className="font-medium">{row.payer_name || row.insurance_type || 'N/A'}</span>
      )
    },
    { key: 'claim_amount', label: 'Amount', render: (row: any) => <span className="font-semibold">{formatCurrency(row.claim_amount || 0)}</span> },
    { key: 'approved_date', label: 'Approved', render: (row: any) => formatDate(row.approved_date || row.created_at) },
    { 
      key: 'days_outstanding', 
      label: 'Days Outstanding', 
      render: (row: any) => (
        <span className={`font-medium ${
          row.days_outstanding > 90 ? 'text-red-600' :
          row.days_outstanding > 60 ? 'text-orange-600' :
          row.days_outstanding > 30 ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {row.days_outstanding} days
        </span>
      )
    },
    { 
      key: 'aging_bucket', 
      label: 'Aging', 
      render: (row: any) => {
        const bucket = agingBuckets.find(b => b.key === row.aging_bucket)
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${bucket?.color}-100 text-${bucket?.color}-700`}>
            {bucket?.label || row.aging_bucket}
          </span>
        )
      }
    },
    { key: 'location_id', label: 'Location', render: (row: any) => row.location_id === 1 || row.location_id === '1' ? 'Hope' : 'Ayushman' }
  ]

  const totalOutstanding = claimsWithAging.reduce((sum, claim) => sum + (claim.claim_amount || 0), 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Account Receivable</h2>
          <p className="text-sm text-gray-500">
            {claimsWithAging.length} outstanding claims • Total: {formatCurrency(totalOutstanding)}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export Aging Report
          </button>
        </div>
      </div>

      {/* Aging Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {agingSummary.map((bucket, i) => (
          <div 
            key={i}
            className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-md ${
              selectedAging === bucket.key ? `border-${bucket.color}-500` : 'border-gray-200'
            }`}
            onClick={() => setSelectedAging(selectedAging === bucket.key ? 'all' : bucket.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg bg-${bucket.color}-50`}>
                <Calendar className={`w-5 h-5 text-${bucket.color}-600`} />
              </div>
              <span className={`text-xs px-2 py-1 rounded-full bg-${bucket.color}-100 text-${bucket.color}-700 font-medium`}>
                {bucket.label}
              </span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{bucket.count}</p>
              <p className="text-sm text-gray-500 mb-1">claims</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(bucket.amount)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select 
          value={selectedPayer} 
          onChange={(e) => setSelectedPayer(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Payers</option>
          {payerOutstanding.map((payer, i) => (
            <option key={i} value={payer.name}>{payer.name}</option>
          ))}
        </select>
        <select 
          value={selectedAging} 
          onChange={(e) => setSelectedAging(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="all">All Aging Periods</option>
          {agingBuckets.map(bucket => (
            <option key={bucket.key} value={bucket.key}>{bucket.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Outstanding by Payer */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Outstanding by Payer</h3>
          <div className="space-y-3">
            {payerOutstanding.slice(0, 10).map((payer, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{payer.name}</p>
                  <p className="text-sm text-gray-500">{payer.claims} claims</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(payer.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Trend</h3>
          <div className="space-y-4">
            {[
              { month: 'Current Month', collected: 1890000, target: 2100000 },
              { month: 'Last Month', collected: 2150000, target: 2000000 },
              { month: 'Month -2', collected: 1820000, target: 1950000 }
            ].map((month, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">{month.month}</span>
                  <span className="text-sm font-medium">{formatCurrency(month.collected)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${month.collected >= month.target ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min((month.collected / month.target) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Target: {formatCurrency(month.target)} ({((month.collected / month.target) * 100).toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outstanding Claims Table */}
      <DataTable 
        data={filteredClaims} 
        columns={columns} 
        loading={loading} 
        searchPlaceholder="Search outstanding claims..." 
        searchKey="claim_number" 
      />

      {/* Action Items */}
      <div className="mt-6 bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-orange-900 mb-2">Action Items</h4>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• Follow up on {agingSummary.find(b => b.key === '90+')?.count || 0} claims over 90 days old</li>
              <li>• Contact top 3 payers with highest outstanding amounts</li>
              <li>• Review and resubmit any documentation requests</li>
              <li>• Schedule payment collection calls for this week</li>
              <li>• Update payment status for recently received payments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}