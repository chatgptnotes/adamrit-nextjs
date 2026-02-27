'use client'
// @ts-nocheck
import { useState } from 'react'
import { useCorporateBills, useInsuranceClaims } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { Building, Plus, Download, Receipt, TrendingUp, AlertCircle } from 'lucide-react'

const corporateClients = [
  { id: 'wcl', name: 'WCL (Western Coal Fields)', color: 'bg-blue-500' },
  { id: 'bhel', name: 'BHEL (Bharat Heavy Electricals)', color: 'bg-green-500' },
  { id: 'bsnl', name: 'BSNL (Bharat Sanchar Nigam)', color: 'bg-purple-500' },
  { id: 'echs', name: 'ECHS (Ex-Servicemen Health)', color: 'bg-orange-500' },
  { id: 'cghs', name: 'CGHS (Central Govt Health)', color: 'bg-pink-500' },
  { id: 'mml', name: 'MML (Manganese Mining)', color: 'bg-indigo-500' },
]

export default function CorporateBillingPage() {
  const { data: corporateBills, loading } = useCorporateBills()
  const { data: claims } = useInsuranceClaims()
  const [selectedCorporate, setSelectedCorporate] = useState<string>('all')
  const [showNewBillForm, setShowNewBillForm] = useState(false)

  // Filter corporate claims/bills
  const corporateData = [...corporateBills, ...claims.filter(c => {
    const payer = (c.payer_name || c.insurance_type || '').toLowerCase()
    return corporateClients.some(corp => payer.includes(corp.id))
  })]

  const filteredData = selectedCorporate === 'all' 
    ? corporateData 
    : corporateData.filter(item => {
        const payer = (item.payer_name || item.insurance_type || '').toLowerCase()
        return payer.includes(selectedCorporate)
      })

  const [newBill, setNewBill] = useState({
    corporate_client: 'WCL',
    bill_number: '',
    patient_id: '',
    services: '',
    bill_amount: '',
    approved_amount: '',
    billing_date: new Date().toISOString().split('T')[0],
    location_id: '1'
  })

  const columns = [
    { key: 'bill_number', label: 'Bill #', render: (row: any) => row.bill_number || row.claim_number || 'N/A' },
    { 
      key: 'corporate_client', 
      label: 'Corporate', 
      render: (row: any) => {
        const client = row.corporate_client || row.payer_name || row.insurance_type || 'N/A'
        const corp = corporateClients.find(c => client.toLowerCase().includes(c.id))
        return (
          <div className="flex items-center gap-2">
            {corp && <div className={`w-3 h-3 rounded-full ${corp.color}`}></div>}
            <span className="font-medium">{client}</span>
          </div>
        )
      }
    },
    { key: 'patient_name', label: 'Patient', render: (row: any) => row.patient_name || 'N/A' },
    { key: 'bill_amount', label: 'Billed', render: (row: any) => formatCurrency(row.bill_amount || row.claim_amount || 0) },
    { key: 'approved_amount', label: 'Approved', render: (row: any) => formatCurrency(row.approved_amount || row.claim_amount || 0) },
    { key: 'billing_date', label: 'Date', render: (row: any) => formatDate(row.billing_date || row.created_at) },
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
    { key: 'location_id', label: 'Location', render: (row: any) => row.location_id === 1 || row.location_id === '1' ? 'Hope' : 'Ayushman' }
  ]

  // Calculate stats by corporate
  const corporateStats = corporateClients.map(corp => {
    const corpData = corporateData.filter(item => {
      const payer = (item.payer_name || item.insurance_type || item.corporate_client || '').toLowerCase()
      return payer.includes(corp.id)
    })
    
    const totalBills = corpData.length
    const totalBilled = corpData.reduce((sum, item) => sum + (item.bill_amount || item.claim_amount || 0), 0)
    const totalApproved = corpData.reduce((sum, item) => sum + (item.approved_amount || item.claim_amount || 0), 0)
    const pending = corpData.filter(item => item.status === 'pending' || !item.status).length

    return {
      ...corp,
      totalBills,
      totalBilled,
      totalApproved,
      pending,
      approvalRate: totalBilled > 0 ? (totalApproved / totalBilled) * 100 : 0
    }
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Corporate Billing</h2>
          <p className="text-sm text-gray-500">{filteredData.length} bills across corporate clients</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedCorporate} 
            onChange={(e) => setSelectedCorporate(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Corporates</option>
            {corporateClients.map(corp => (
              <option key={corp.id} value={corp.id}>{corp.name}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowNewBillForm(!showNewBillForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Bill
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Corporate Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {corporateStats.map((corp, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${corp.color}`}></div>
                <h3 className="font-semibold text-gray-900">{corp.name}</h3>
              </div>
              <Building className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Bills</span>
                <span className="font-medium">{corp.totalBills}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Billed Amount</span>
                <span className="font-medium">{formatCurrency(corp.totalBilled)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Approved Amount</span>
                <span className="font-medium text-green-600">{formatCurrency(corp.totalApproved)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Pending</span>
                <span className="font-medium text-orange-600">{corp.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Approval Rate</span>
                <span className={`font-medium ${corp.approvalRate >= 80 ? 'text-green-600' : corp.approvalRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {corp.approvalRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNewBillForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Corporate Bill</h3>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Corporate Client</label>
              <select
                value={newBill.corporate_client}
                onChange={(e) => setNewBill({ ...newBill, corporate_client: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {corporateClients.map(corp => (
                  <option key={corp.id} value={corp.name}>{corp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
              <input
                type="text"
                value={newBill.bill_number}
                onChange={(e) => setNewBill({ ...newBill, bill_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
              <input
                type="text"
                value={newBill.patient_id}
                onChange={(e) => setNewBill({ ...newBill, patient_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={newBill.bill_amount}
                onChange={(e) => setNewBill({ ...newBill, bill_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={newBill.approved_amount}
                onChange={(e) => setNewBill({ ...newBill, approved_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Leave empty if not yet approved"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={newBill.location_id}
                onChange={(e) => setNewBill({ ...newBill, location_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="1">Hope Hospital</option>
                <option value="2">Ayushman Hospital</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Services / Treatment</label>
              <textarea
                rows={3}
                value={newBill.services}
                onChange={(e) => setNewBill({ ...newBill, services: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                placeholder="Describe the services provided..."
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Bill
              </button>
              <button
                type="button"
                onClick={() => setShowNewBillForm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <DataTable 
        data={filteredData} 
        columns={columns} 
        loading={loading} 
        searchPlaceholder="Search corporate bills..." 
        searchKey="bill_number" 
      />

      {/* Super Bill Summary */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Super Bill Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 font-semibold text-gray-600">Corporate</th>
                <th className="text-right py-3 font-semibold text-gray-600">Bills</th>
                <th className="text-right py-3 font-semibold text-gray-600">Billed Amount</th>
                <th className="text-right py-3 font-semibold text-gray-600">Approved Amount</th>
                <th className="text-right py-3 font-semibold text-gray-600">Variance</th>
                <th className="text-center py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {corporateStats.map((corp, i) => {
                const variance = corp.totalBilled - corp.totalApproved
                const variancePercent = corp.totalBilled > 0 ? (variance / corp.totalBilled) * 100 : 0
                return (
                  <tr key={i}>
                    <td className="py-3 font-medium">{corp.name}</td>
                    <td className="py-3 text-right">{corp.totalBills}</td>
                    <td className="py-3 text-right">{formatCurrency(corp.totalBilled)}</td>
                    <td className="py-3 text-right text-green-600">{formatCurrency(corp.totalApproved)}</td>
                    <td className="py-3 text-right">
                      <span className={variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : 'text-gray-600'}>
                        {formatCurrency(Math.abs(variance))} ({variancePercent.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      {corp.pending > 0 ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                          {corp.pending} pending
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                          Up to date
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}