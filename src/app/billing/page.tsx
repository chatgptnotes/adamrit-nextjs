'use client'
import { useState, useEffect, useMemo } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getBillingSummary } from '@/lib/billing-actions'
import { useBillings, usePatients } from '@/hooks/useSupabase'
import StatCard from '@/components/StatCard'
import DataTable from '@/components/DataTable'
import { 
  Receipt, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Building, 
  DollarSign,
  Search,
  Plus,
  FileText,
  CreditCard,
  Stethoscope
} from 'lucide-react'
import Link from 'next/link'

export default function BillingDashboard() {
  const { data: billings, loading: billingsLoading } = useBillings()
  const { data: patients } = usePatients()
  const [summaryStats, setSummaryStats] = useState({
    todayBills: 0,
    todayRevenue: 0,
    pendingBills: 0,
    pendingAmount: 0,
    totalRevenue: 0,
    totalBills: 0
  })
  const [searchTerm, setSearchTerm] = useState('')

  // Load billing summary
  useEffect(() => {
    async function loadSummary() {
      try {
        const summary = await getBillingSummary()
        setSummaryStats(summary)
      } catch (error) {
        console.error('Error loading billing summary:', error)
      }
    }
    loadSummary()
  }, [])

  // Search patients for quick billing
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return []
    return patients.filter(patient => {
      const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.toLowerCase()
      const ipd = patient.ipd_number || ''
      return fullName.includes(searchTerm.toLowerCase()) || 
             ipd.toLowerCase().includes(searchTerm.toLowerCase())
    }).slice(0, 10)
  }, [patients, searchTerm])

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return billings.slice(0, 15).map(bill => ({
      ...bill,
      patient_name: `${bill.first_name || ''} ${bill.last_name || ''}`.trim() || 'Unknown Patient'
    }))
  }, [billings])

  // Department-wise stats
  const departmentStats = useMemo(() => {
    const stats = billings.reduce((acc, bill) => {
      const dept = bill.location_id === 2 ? 'Ayushman Hospital' : 'Hope Hospital'
      if (!acc[dept]) {
        acc[dept] = { revenue: 0, bills: 0 }
      }
      acc[dept].revenue += parseFloat(bill.total_amount) || 0
      acc[dept].bills += 1
      return acc
    }, {} as Record<string, { revenue: number; bills: number }>)

    return Object.entries(stats).map(([dept, data]: [string, any]) => ({
      department: dept,
      revenue: data.revenue,
      bills: data.bills,
      avgBill: data.bills > 0 ? data.revenue / data.bills : 0
    }))
  }, [billings])

  const transactionColumns = [
    { key: 'bill_number', label: 'Bill #' },
    { key: 'patient_name', label: 'Patient' },
    { 
      key: 'payment_category', 
      label: 'Type',
      render: (row: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.payment_category === 'Advance' 
            ? 'bg-blue-100 text-blue-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {row.payment_category}
        </span>
      )
    },
    { 
      key: 'total_amount', 
      label: 'Amount', 
      render: (row: any) => formatCurrency(parseFloat(row.total_amount) || 0) 
    },
    { key: 'billing_date', label: 'Date', render: (row: any) => formatDate(row.billing_date) },
    { 
      key: 'payment_mode', 
      label: 'Mode',
      render: (row: any) => (
        <span className="text-sm text-gray-600">{row.payment_mode || 'Cash'}</span>
      )
    },
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
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header with Quick Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
          <p className="text-gray-600">Manage payments, bills, and patient charges</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search patient for quick billing..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
          />
          {searchTerm && filteredPatients.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg z-10 max-h-64 overflow-y-auto">
              {filteredPatients.map(patient => (
                <Link
                  key={patient.id}
                  href={`/billing/advance?patient=${patient.id}`}
                  className="block px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    IPD: {patient.ipd_number || 'N/A'} | ID: {patient.id}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today&apos;s Bills"
          value={summaryStats.todayBills}
          subtitle={`Revenue: ${formatCurrency(summaryStats.todayRevenue)}`}
          icon={Receipt}
          color="blue"
        />
        <StatCard
          title="Pending Bills"
          value={summaryStats.pendingBills}
          subtitle={`Amount: ${formatCurrency(summaryStats.pendingAmount)}`}
          icon={AlertCircle}
          color="red"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(summaryStats.totalRevenue)}
          subtitle={`From ${summaryStats.totalBills} bills`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Avg Bill Value"
          value={formatCurrency(summaryStats.totalRevenue / (summaryStats.totalBills || 1))}
          subtitle="Overall average"
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Quick Actions and Department Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/billing/opd" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center group">
                <Receipt className="w-6 h-6 mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-medium">OPD Billing</div>
              </Link>
              
              <Link href="/billing/ipd" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center group">
                <Building className="w-6 h-6 mx-auto mb-2 text-green-600 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-medium">IPD Billing</div>
              </Link>
              
              <Link href="/billing/advance" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center group">
                <CreditCard className="w-6 h-6 mx-auto mb-2 text-purple-600 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-medium">Advance Payment</div>
              </Link>
              
              <Link href="/billing/discharge" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center group">
                <FileText className="w-6 h-6 mx-auto mb-2 text-orange-600 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-medium">Discharge Bill</div>
              </Link>
              
              <Link href="/billing/surgery" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center group">
                <Stethoscope className="w-6 h-6 mx-auto mb-2 text-red-600 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-medium">Surgery Bill</div>
              </Link>
              
              <Link href="/billing/pending" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center group">
                <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-600 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-medium">Pending Bills</div>
              </Link>
              
              <Link href="/billing/reports" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center group">
                <FileText className="w-6 h-6 mx-auto mb-2 text-indigo-600 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-medium">Reports</div>
              </Link>
              
              <Link href="/billing/receipt" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center group">
                <Receipt className="w-6 h-6 mx-auto mb-2 text-pink-600 group-hover:scale-110 transition-transform" />
                <div className="text-sm font-medium">Print Receipt</div>
              </Link>
            </div>
          </div>
        </div>

        {/* Department Revenue */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-gray-600" />
              Department Revenue
            </h3>
            <div className="space-y-4">
              {departmentStats.map((dept, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-700 text-sm">{dept.department}</span>
                    <span className="font-bold text-gray-900">{formatCurrency(dept.revenue)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {dept.bills} bills • Avg: {formatCurrency(dept.avgBill)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full" 
                      style={{ 
                        width: `${(dept.revenue / Math.max(...departmentStats.map(d => d.revenue))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Recent Transactions
          </h3>
          <Link 
            href="/billing/reports" 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All Reports →
          </Link>
        </div>
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