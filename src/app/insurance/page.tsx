'use client'
// @ts-nocheck
import { useInsuranceStats } from '@/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import { ClipboardList, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

export default function InsuranceDashboard() {
  const { stats, loading } = useInsuranceStats()

  const statCards = [
    {
      title: 'Total Claims',
      value: loading ? '—' : stats.totalClaims.toLocaleString(),
      subtitle: 'All submitted claims',
      icon: ClipboardList,
      color: 'blue' as const
    },
    {
      title: 'Pending Claims',
      value: loading ? '—' : stats.pendingClaims.toLocaleString(),
      subtitle: 'Awaiting approval',
      icon: Clock,
      color: 'orange' as const
    },
    {
      title: 'Approved Claims',
      value: loading ? '—' : stats.approvedClaims.toLocaleString(),
      subtitle: 'Ready for payment',
      icon: CheckCircle,
      color: 'green' as const
    },
    {
      title: 'Rejected Claims',
      value: loading ? '—' : stats.rejectedClaims.toLocaleString(),
      subtitle: 'Need resubmission',
      icon: XCircle,
      color: 'red' as const
    },
    {
      title: 'Total Claim Amount',
      value: loading ? '—' : formatCurrency(stats.totalClaimAmount),
      subtitle: 'All claims value',
      icon: DollarSign,
      color: 'purple' as const
    },
    {
      title: 'Amount Received',
      value: loading ? '—' : formatCurrency(stats.receivedAmount),
      subtitle: 'Payments received',
      icon: TrendingUp,
      color: 'green' as const
    },
    {
      title: 'Outstanding Amount',
      value: loading ? '—' : formatCurrency(stats.outstandingAmount),
      subtitle: 'Pending payments',
      icon: AlertTriangle,
      color: 'red' as const
    }
  ]

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claims by Payer Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Claims by Payer Type</h3>
          <div className="space-y-3">
            {[
              { name: 'ESIC', claims: 45, amount: 125000, color: 'bg-blue-500' },
              { name: 'PM-JAY', claims: 32, amount: 89000, color: 'bg-green-500' },
              { name: 'RGJAY', claims: 28, amount: 76000, color: 'bg-purple-500' },
              { name: 'WCL', claims: 22, amount: 145000, color: 'bg-orange-500' },
              { name: 'BHEL', claims: 18, amount: 98000, color: 'bg-pink-500' },
              { name: 'ECHS', claims: 15, amount: 67000, color: 'bg-indigo-500' },
              { name: 'CGHS', claims: 12, amount: 54000, color: 'bg-cyan-500' },
            ].map((payer, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${payer.color}`}></div>
                  <div>
                    <p className="font-medium text-gray-700">{payer.name}</p>
                    <p className="text-sm text-gray-500">{payer.claims} claims</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(payer.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              {
                action: 'New ESIC claim submitted',
                patient: 'RAM KUMAR (ID: 1234)',
                amount: '₹25,000',
                time: '2 hours ago',
                status: 'pending'
              },
              {
                action: 'PM-JAY claim approved',
                patient: 'SITA DEVI (ID: 5678)',
                amount: '₹18,500',
                time: '4 hours ago',
                status: 'approved'
              },
              {
                action: 'WCL payment received',
                patient: 'KRISHNA GUPTA (ID: 9012)',
                amount: '₹45,000',
                time: '6 hours ago',
                status: 'paid'
              },
              {
                action: 'RGJAY claim rejected',
                patient: 'RADHA SHARMA (ID: 3456)',
                amount: '₹12,000',
                time: '8 hours ago',
                status: 'rejected'
              }
            ].map((activity, i) => (
              <div key={i} className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-700">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.patient}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{activity.amount}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'approved' ? 'bg-green-100 text-green-700' :
                    activity.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                    activity.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Submit New Claim</span>
          </button>
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium">Track Claims</span>
          </button>
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="font-medium">View Reports</span>
          </button>
          <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-medium">Manage Denials</span>
          </button>
        </div>
      </div>
    </div>
  )
}