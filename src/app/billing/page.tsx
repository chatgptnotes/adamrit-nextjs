'use client'
import { useBillings, usePatients } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import DataTable from '@/components/DataTable'
import { Receipt, TrendingUp, AlertCircle, Clock, Building, DollarSign } from 'lucide-react'
import { useMemo } from 'react'

export default function BillingDashboard() {
  const { data: billings, loading: billingsLoading } = useBillings()
  const { data: patients } = usePatients()

  // Calculate dashboard stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    
    // Today's billings
    const todayBills = billings.filter(b => b.billing_date?.startsWith(today))
    const todayRevenue = todayBills.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0)
    
    // Pending bills (not fully paid)
    const pendingBills = billings.filter(b => {
      const total = parseFloat(b.total_amount) || 0
      const paid = parseFloat(b.paid_amount) || 0
      return total > paid
    })
    const pendingAmount = pendingBills.reduce((sum, b) => {
      const total = parseFloat(b.total_amount) || 0
      const paid = parseFloat(b.paid_amount) || 0
      return sum + (total - paid)
    }, 0)
    
    // Total revenue
    const totalRevenue = billings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0)
    
    // Department-wise revenue (simplified)
    const departments = billings.reduce((acc, b) => {
      const dept = b.location_id === '2' ? 'Ayushman' : 'Hope Hospital'
      if (!acc[dept]) acc[dept] = 0
      acc[dept] += parseFloat(b.total_amount) || 0
      return acc
    }, {} as Record<string, number>)
    
    return {
      todayBills: todayBills.length,
      todayRevenue,
      pendingBills: pendingBills.length,
      pendingAmount,
      totalRevenue,
      totalBills: billings.length,
      departments
    }
  }, [billings])

  // Recent transactions (last 10 billings)
  const recentTransactions = useMemo(() => {
    return billings.slice(0, 10).map(bill => ({
      ...bill,
      patient_name: `${bill.first_name || ''} ${bill.last_name || ''}`.trim() || 'Unknown Patient'
    }))
  }, [billings])

  const transactionColumns = [
    { key: 'id', label: 'Bill #' },
    { key: 'patient_name', label: 'Patient' },
    { key: 'total_amount', label: 'Amount', render: (row: any) => formatCurrency(parseFloat(row.total_amount) || 0) },
    { key: 'billing_date', label: 'Date', render: (row: any) => formatDate(row.billing_date) },
    { 
      key: 'status', 
      label: 'Status',
      render: (row: any) => {
        const total = parseFloat(row.total_amount) || 0
        const paid = parseFloat(row.paid_amount) || 0
        const status = total <= paid ? 'paid' : paid > 0 ? 'partial' : 'pending'
        const colors = {
          paid: 'bg-green-100 text-green-700',
          partial: 'bg-yellow-100 text-yellow-700',
          pending: 'bg-red-100 text-red-700'
        }
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Bills"
          value={stats.todayBills}
          subtitle={`Revenue: ${formatCurrency(stats.todayRevenue)}`}
          icon={Receipt}
          color="blue"
        />
        <StatCard
          title="Pending Bills"
          value={stats.pendingBills}
          subtitle={`Amount: ${formatCurrency(stats.pendingAmount)}`}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          subtitle={`From ${stats.totalBills} bills`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Avg Bill Value"
          value={formatCurrency(stats.totalRevenue / (stats.totalBills || 1))}
          subtitle="Overall average"
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Revenue by Department */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-600" />
              Revenue by Location
            </h3>
            <div className="space-y-4">
              {Object.entries(stats.departments).map(([dept, revenue]) => (
                <div key={dept} className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{dept}</span>
                  <span className="font-bold text-gray-900">{formatCurrency(revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                <Stethoscope className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-sm font-medium">New OPD Bill</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-sm font-medium">Surgery Bill</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                <Receipt className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="text-sm font-medium">Print Receipt</div>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <div className="text-sm font-medium">Pending Bills</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          Recent Transactions
        </h3>
        <DataTable
          data={recentTransactions}
          columns={transactionColumns}
          loading={billingsLoading}
          searchPlaceholder="Search transactions..."
          searchKey="patient_name"
        />
      </div>
    </div>
  )
}