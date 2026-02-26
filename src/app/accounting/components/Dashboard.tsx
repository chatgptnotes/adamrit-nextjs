'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import DataTable from '@/components/DataTable'
import { 
  TrendingUp, 
  Receipt, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  FileText
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState<any>({})
  const [recentVouchers, setRecentVouchers] = useState<any[]>([])
  const [recentReceipts, setRecentReceipts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocation, setSelectedLocation] = useState<number>(1) // 1=Hope, 2=Ayushman

  useEffect(() => {
    fetchDashboardData()
  }, [selectedLocation])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch today's cash collection
      const { data: todayCash } = await supabaseProd
        .from('account_receipts')
        .select('amount')
        .eq('location_id', selectedLocation)
        .gte('date', today)
        .eq('payment_mode', 'Cash')

      // Fetch pending receipts
      const { data: pendingReceipts } = await supabaseProd
        .from('vouchers')
        .select('*')
        .eq('location_id', selectedLocation)
        .eq('status', 'Pending')

      // Fetch recent vouchers (last 10)
      const { data: vouchers } = await supabaseProd
        .from('voucher_entries')
        .select(`
          *,
          vouchers (
            voucher_number,
            date,
            narration,
            location_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      // Filter by location
      const locationVouchers = vouchers?.filter(v => 
        v.vouchers?.location_id === selectedLocation
      ) || []

      // Fetch recent receipts (last 10)
      const { data: receipts } = await supabaseProd
        .from('account_receipts')
        .select('*')
        .eq('location_id', selectedLocation)
        .order('date', { ascending: false })
        .limit(10)

      // Get month's totals
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      
      const { data: monthRevenue } = await supabaseProd
        .from('account_receipts')
        .select('amount')
        .eq('location_id', selectedLocation)
        .gte('date', startOfMonth)

      const todayCashTotal = todayCash?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const monthTotal = monthRevenue?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const pendingCount = pendingReceipts?.length || 0

      setStats({
        todayCash: todayCashTotal,
        monthRevenue: monthTotal,
        pendingReceipts: pendingCount,
        totalReceipts: receipts?.length || 0
      })

      setRecentVouchers(locationVouchers)
      setRecentReceipts(receipts || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const voucherColumns = [
    { key: 'id', label: 'ID' },
    { 
      key: 'voucher_number', 
      label: 'Voucher #', 
      render: (r: any) => r.vouchers?.voucher_number || '—' 
    },
    { 
      key: 'debit', 
      label: 'Debit', 
      render: (r: any) => r.debit ? <span className="text-red-600 font-medium">{formatCurrency(r.debit)}</span> : '—' 
    },
    { 
      key: 'credit', 
      label: 'Credit', 
      render: (r: any) => r.credit ? <span className="text-green-600 font-medium">{formatCurrency(r.credit)}</span> : '—' 
    },
    { 
      key: 'narration', 
      label: 'Narration', 
      render: (r: any) => <span className="text-sm text-gray-600 truncate max-w-[200px] block">{r.vouchers?.narration || '—'}</span> 
    },
    { 
      key: 'date', 
      label: 'Date', 
      render: (r: any) => formatDate(r.vouchers?.date) 
    }
  ]

  const receiptColumns = [
    { key: 'id', label: 'ID' },
    { key: 'receipt_no', label: 'Receipt #' },
    { key: 'patient_id', label: 'Patient ID' },
    { 
      key: 'amount', 
      label: 'Amount', 
      render: (r: any) => <span className="font-semibold text-emerald-700">{formatCurrency(r.amount)}</span> 
    },
    { key: 'payment_mode', label: 'Mode' },
    { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) }
  ]

  return (
    <div className="space-y-6">
      {/* Location Selector */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Today's Cash Collection" 
          value={loading ? '...' : formatCurrency(stats.todayCash)} 
          icon={DollarSign} 
          color="green" 
          subtitle="Cash receipts today"
        />
        <StatCard 
          title="Month Revenue" 
          value={loading ? '...' : formatCurrency(stats.monthRevenue)} 
          icon={TrendingUp} 
          color="blue" 
          subtitle="All receipts this month"
        />
        <StatCard 
          title="Pending Receipts" 
          value={loading ? '...' : stats.pendingReceipts.toString()} 
          icon={Clock} 
          color="orange" 
          subtitle="Pending vouchers"
        />
        <StatCard 
          title="Total Receipts" 
          value={loading ? '...' : stats.totalReceipts.toString()} 
          icon={Receipt} 
          color="purple" 
          subtitle="Recent receipt count"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Vouchers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Recent Vouchers
          </h3>
          <DataTable 
            data={recentVouchers} 
            columns={voucherColumns} 
            loading={loading}
            searchPlaceholder="Search vouchers..."
            searchKey="narration"
          />
        </div>

        {/* Recent Receipts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-green-600" />
            Recent Receipts
          </h3>
          <DataTable 
            data={recentReceipts} 
            columns={receiptColumns} 
            loading={loading}
            searchPlaceholder="Search receipts..."
            searchKey="receipt_no"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition-colors">
            <Receipt className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">New Receipt</span>
          </button>
          <button className="p-4 bg-red-50 rounded-lg text-red-700 hover:bg-red-100 transition-colors">
            <ArrowUpCircle className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Payment Voucher</span>
          </button>
          <button className="p-4 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors">
            <ArrowDownCircle className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Journal Entry</span>
          </button>
          <button className="p-4 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors">
            <CreditCard className="w-6 h-6 mx-auto mb-2" />
            <span className="text-sm font-medium">Contra Entry</span>
          </button>
        </div>
      </div>
    </div>
  )
}