'use client'
import { useState, useEffect } from 'react'
import { getAccountBalance, getTrialBalance } from '@/lib/accounting-engine'
import { createClient } from '@supabase/supabase-js'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  TrendingUp, 
  Receipt, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  FileText,
  PlusCircle
} from 'lucide-react'

// Use correct Supabase credentials
const supabase = createClient(
  'https://tegvsgjhxrfddwpbgrzz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3ZzZ2poeHJmZGR3cGJncnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDU1NDIsImV4cCI6MjA4NzY4MTU0Mn0.WjKDFe5NueYvfenpqlRHbHQwuDSW9ogGILglCSxj0EM'
)

interface DashboardStats {
  todaysCash: number
  todaysBank: number
  totalReceivables: number
  totalPayables: number
}

interface VoucherEntry {
  id: number
  voucher_number: string
  type: string
  debit?: number
  credit?: number
  narration: string
  voucher_date: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    todaysCash: 0,
    todaysBank: 0,
    totalReceivables: 0,
    totalPayables: 0
  })
  const [recentVouchers, setRecentVouchers] = useState<VoucherEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<number>(1) // 1=Hope, 2=Ayushman

  useEffect(() => {
    fetchDashboardData()
  }, [selectedLocation])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Get current balances
      const cashBalance = await getAccountBalance(1) // Cash account
      const bankBalance = await getAccountBalance(2) // Bank account
      const receivablesBalance = await getAccountBalance(3) // Patient Receivables
      
      // Get today's cash collections
      const { data: todayCashEntries } = await supabase
        .from('voucher_entries')
        .select('credit')
        .eq('account_id', 1) // Cash account
        .eq('voucher_date', today)
        .eq('location_id', selectedLocation)
        .eq('is_deleted', false)

      // Get today's bank collections
      const { data: todayBankEntries } = await supabase
        .from('voucher_entries')
        .select('credit')
        .eq('account_id', 2) // Bank account
        .eq('voucher_date', today)
        .eq('location_id', selectedLocation)
        .eq('is_deleted', false)

      // Get recent voucher entries
      const { data: recentEntries } = await supabase
        .from('voucher_entries')
        .select(`
          id,
          debit,
          credit,
          narration,
          voucher_date,
          voucher_logs!inner(voucher_number, type)
        `)
        .eq('location_id', selectedLocation)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10)

      const todayCashTotal = todayCashEntries?.reduce((sum, entry) => sum + (entry.credit || 0), 0) || 0
      const todayBankTotal = todayBankEntries?.reduce((sum, entry) => sum + (entry.credit || 0), 0) || 0

      setStats({
        todaysCash: todayCashTotal,
        todaysBank: todayBankTotal,
        totalReceivables: receivablesBalance,
        totalPayables: 0 // You can add payables logic here
      })

      // Format recent vouchers
      const formattedVouchers = recentEntries?.map((entry: any) => ({
        id: entry.id,
        voucher_number: entry.voucher_logs?.voucher_number || 'N/A',
        type: entry.voucher_logs?.type || 'Unknown',
        debit: entry.debit,
        credit: entry.credit,
        narration: entry.narration,
        voucher_date: entry.voucher_date
      })) || []

      setRecentVouchers(formattedVouchers)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: {
    title: string
    value: string
    icon: any
    color: string
    subtitle: string
  }) => {
    const colorClasses = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700'
    }

    return (
      <div className={`p-6 rounded-xl border-2 ${colorClasses[color as keyof typeof colorClasses]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs opacity-70 mt-1">{subtitle}</p>
          </div>
          <Icon className="w-8 h-8 opacity-60" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Accounting Dashboard</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Location:</label>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value={1}>Hope Hospital</option>
            <option value={2}>Ayushman Hospital</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Cash Collection" 
          value={loading ? '...' : formatCurrency(stats.todaysCash)} 
          icon={DollarSign} 
          color="green" 
          subtitle="Cash receipts today"
        />
        <StatCard 
          title="Today's Bank Collection" 
          value={loading ? '...' : formatCurrency(stats.todaysBank)} 
          icon={CreditCard} 
          color="blue" 
          subtitle="Bank receipts today"
        />
        <StatCard 
          title="Total Receivables" 
          value={loading ? '...' : formatCurrency(stats.totalReceivables)} 
          icon={ArrowUpCircle} 
          color="orange" 
          subtitle="Outstanding from patients"
        />
        <StatCard 
          title="Total Payables" 
          value={loading ? '...' : formatCurrency(stats.totalPayables)} 
          icon={ArrowDownCircle} 
          color="purple" 
          subtitle="Outstanding to suppliers"
        />
      </div>

      {/* Recent Vouchers */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Recent Voucher Entries
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-700">Voucher No.</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Debit</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Credit</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Narration</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td>
                </tr>
              ) : recentVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No voucher entries found</td>
                </tr>
              ) : (
                recentVouchers.map((voucher) => (
                  <tr key={voucher.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">{voucher.voucher_number}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        voucher.type === 'Receipt' ? 'bg-green-100 text-green-700' :
                        voucher.type === 'Payment' ? 'bg-red-100 text-red-700' :
                        voucher.type === 'Journal' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {voucher.type}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {voucher.debit ? (
                        <span className="text-red-600 font-medium">{formatCurrency(voucher.debit)}</span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-2">
                      {voucher.credit ? (
                        <span className="text-green-600 font-medium">{formatCurrency(voucher.credit)}</span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-2 max-w-xs truncate">{voucher.narration}</td>
                    <td className="py-3 px-2">{formatDate(voucher.voucher_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-600" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => window.location.href = '/accounting/receipt-voucher'}
            className="p-4 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition-colors border border-green-200"
          >
            <Receipt className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Receipt Voucher</span>
          </button>
          <button 
            onClick={() => window.location.href = '/accounting/payment-voucher'}
            className="p-4 bg-red-50 rounded-lg text-red-700 hover:bg-red-100 transition-colors border border-red-200"
          >
            <ArrowUpCircle className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Payment Voucher</span>
          </button>
          <button 
            onClick={() => window.location.href = '/accounting/journal-entry'}
            className="p-4 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
          >
            <FileText className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Journal Entry</span>
          </button>
          <button 
            onClick={() => window.location.href = '/accounting/contra-entry'}
            className="p-4 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors border border-purple-200"
          >
            <CreditCard className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Contra Entry</span>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-3">Reports</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => window.location.href = '/accounting/cash-book'}
              className="p-3 bg-gray-50 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <span className="text-sm font-medium">Cash Book</span>
            </button>
            <button 
              onClick={() => window.location.href = '/accounting/ledger'}
              className="p-3 bg-gray-50 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <span className="text-sm font-medium">Ledger</span>
            </button>
            <button 
              onClick={() => window.location.href = '/accounting/trial-balance'}
              className="p-3 bg-gray-50 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <span className="text-sm font-medium">Trial Balance</span>
            </button>
            <button 
              onClick={() => window.location.href = '/accounting/patient-account'}
              className="p-3 bg-gray-50 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <span className="text-sm font-medium">Patient Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}