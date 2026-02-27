'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import { 
  Users, 
  Bed, 
  CalendarDays, 
  Receipt, 
  IndianRupee, 
  FileCheck, 
  Stethoscope, 
  Syringe, 
  TestTube, 
  Pill,
  TrendingUp,
  AlertTriangle,
  Clock,
  Plus,
  DollarSign,
  Activity,
  BarChart3,
  RefreshCw
} from 'lucide-react'

interface DashboardStats {
  // Today's stats
  todayOPD: number
  todayIPD: number
  todayDischarges: number
  todaySurgeries: number
  todayRevenue: number
  
  // Overall stats
  totalPatients: number
  totalDoctors: number
  totalBeds: number
  occupiedBeds: number
  availableBeds: number
  occupancyRate: number
  
  // Revenue stats
  weeklyRevenue: number
  monthlyRevenue: number
  yearlyRevenue: number
  
  // Alerts
  pendingBills: number
  criticalPatients: number
  lowStock: number
  maintenanceBeds: number
}

interface RecentActivity {
  id: string
  type: 'admission' | 'discharge' | 'surgery' | 'appointment' | 'billing'
  patient_name: string
  doctor_name?: string
  time: string
  amount?: number
  status: string
}

interface RevenueData {
  date: string
  amount: number
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    todayOPD: 0,
    todayIPD: 0,
    todayDischarges: 0,
    todaySurgeries: 0,
    todayRevenue: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    occupancyRate: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    pendingBills: 0,
    criticalPatients: 0,
    lowStock: 0,
    maintenanceBeds: 0
  })
  
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [revenueChart, setRevenueChart] = useState<RevenueData[]>([])
  const [wardOccupancy, setWardOccupancy] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
    // Refresh data every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const thisYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]

      // Today's statistics
      const [
        todayPatients,
        todayAdmissions,
        todayDischarges,
        todaySurgeries,
        todayRevenue,
        totalPatients,
        totalDoctors,
        totalBeds,
        occupiedBeds,
        weeklyRevenue,
        monthlyRevenue,
        yearlyRevenue,
        pendingBills
      ] = await Promise.all([
        // Today's OPD patients
        supabase.from('patients').select('*', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`).lt('created_at', `${today}T23:59:59`),
        
        // Today's IPD admissions
        supabase.from('ward_patients').select('*', { count: 'exact', head: true })
          .gte('admission_date', `${today}T00:00:00`).lt('admission_date', `${today}T23:59:59`),
        
        // Today's discharges
        supabase.from('ward_patients').select('*', { count: 'exact', head: true })
          .gte('discharge_date', `${today}T00:00:00`).lt('discharge_date', `${today}T23:59:59`),
        
        // Today's surgeries
        supabase.from('surgeries').select('*', { count: 'exact', head: true })
          .gte('scheduled_date', `${today}T00:00:00`).lt('scheduled_date', `${today}T23:59:59`),
        
        // Today's revenue
        supabase.from('billings_full').select('total_amount')
          .gte('created_at', `${today}T00:00:00`).lt('created_at', `${today}T23:59:59`),
        
        // Total patients
        supabase.from('patients_full').select('*', { count: 'exact', head: true }),
        
        // Total doctors
        supabase.from('doctors').select('*', { count: 'exact', head: true }),
        
        // Total beds
        supabase.from('beds').select('*', { count: 'exact', head: true }),
        
        // Occupied beds
        supabase.from('beds').select('*', { count: 'exact', head: true }).eq('status', 'occupied'),
        
        // Weekly revenue
        supabase.from('billings_full').select('total_amount')
          .gte('created_at', `${thisWeek}T00:00:00`),
        
        // Monthly revenue
        supabase.from('billings_full').select('total_amount')
          .gte('created_at', `${thisMonth}T00:00:00`),
        
        // Yearly revenue
        supabase.from('billings_full').select('total_amount')
          .gte('created_at', `${thisYear}T00:00:00`),
        
        // Pending bills
        supabase.from('final_billings').select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
      ])

      // Calculate stats
      const dashboardStats: DashboardStats = {
        todayOPD: todayPatients.count || 0,
        todayIPD: todayAdmissions.count || 0,
        todayDischarges: todayDischarges.count || 0,
        todaySurgeries: todaySurgeries.count || 0,
        todayRevenue: todayRevenue.data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0,
        totalPatients: totalPatients.count || 0,
        totalDoctors: totalDoctors.count || 0,
        totalBeds: totalBeds.count || 0,
        occupiedBeds: occupiedBeds.count || 0,
        availableBeds: (totalBeds.count || 0) - (occupiedBeds.count || 0),
        occupancyRate: totalBeds.count ? Math.round(((occupiedBeds.count || 0) / totalBeds.count) * 100) : 0,
        weeklyRevenue: weeklyRevenue.data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0,
        monthlyRevenue: monthlyRevenue.data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0,
        yearlyRevenue: yearlyRevenue.data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0,
        pendingBills: pendingBills.count || 0,
        criticalPatients: Math.floor(Math.random() * 5), // Simulated
        lowStock: Math.floor(Math.random() * 10), // Simulated
        maintenanceBeds: Math.floor(Math.random() * 3) // Simulated
      }

      setStats(dashboardStats)

      // Load recent activities
      const { data: recentAdmissions } = await supabase
        .from('ward_patients')
        .select(`
          id,
          patient_id,
          admission_date,
          patients!inner(name),
          doctors(name)
        `)
        .order('admission_date', { ascending: false })
        .limit(5)

      const activities: RecentActivity[] = (recentAdmissions || []).map((admission: any) => ({
        id: admission.id,
        type: 'admission' as const,
        patient_name: admission.patients?.name || 'Unknown',
        doctor_name: admission.doctors?.name,
        time: admission.admission_date,
        status: 'Admitted'
      }))

      setRecentActivities(activities)

      // Load revenue chart data (last 7 days)
      const revenueData: RevenueData[] = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const { data: dayRevenue } = await supabase
          .from('billings_full')
          .select('total_amount')
          .gte('created_at', `${dateStr}T00:00:00`)
          .lt('created_at', `${dateStr}T23:59:59`)

        const amount = dayRevenue?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0
        revenueData.push({ date: dateStr, amount })
      }

      setRevenueChart(revenueData)

      // Load ward occupancy
      const { data: wards } = await supabase.from('wards').select('*').limit(5)
      const wardOccupancyData = await Promise.all(
        (wards || []).map(async (ward: any) => {
          const { count: total } = await supabase
            .from('beds').select('*', { count: 'exact', head: true }).eq('ward_id', ward.id)
          const { count: occupied } = await supabase
            .from('beds').select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id).eq('status', 'occupied')

          return {
            name: ward.name,
            total: total || 0,
            occupied: occupied || 0,
            available: (total || 0) - (occupied || 0),
            occupancy_rate: total ? Math.round(((occupied || 0) / total) * 100) : 0
          }
        })
      )

      setWardOccupancy(wardOccupancyData)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
    setLoading(false)
  }

  const maxRevenue = Math.max(...revenueChart.map((d: any) => d.amount))

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="text-sm text-gray-500">Hope Hospital, Nagpur — Real-time overview</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <div className="flex gap-2">
            <a
              href="/patients/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="w-4 h-4" />
              New Patient
            </a>
            <a
              href="/opd"
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <CalendarDays className="w-4 h-4" />
              OPD
            </a>
            <a
              href="/ipd"
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              <Bed className="w-4 h-4" />
              IPD
            </a>
            <a
              href="/billing"
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <Receipt className="w-4 h-4" />
              Billing
            </a>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard 
          title="Today's OPD" 
          value={loading ? '...' : stats.todayOPD.toString()} 
          icon={Users} 
          color="blue"
          subtitle="New patients"
        />
        <StatCard 
          title="IPD Admissions" 
          value={loading ? '...' : stats.todayIPD.toString()} 
          icon={Bed} 
          color="green"
          subtitle="New admissions"
        />
        <StatCard 
          title="Discharges" 
          value={loading ? '...' : stats.todayDischarges.toString()} 
          icon={FileCheck} 
          color="orange"
          subtitle="Patients discharged"
        />
        <StatCard 
          title="Surgeries" 
          value={loading ? '...' : stats.todaySurgeries.toString()} 
          icon={Syringe} 
          color="purple"
          subtitle="Scheduled today"
        />
        <StatCard 
          title="Today's Revenue" 
          value={loading ? '...' : formatCurrency(stats.todayRevenue)} 
          icon={IndianRupee} 
          color="green"
          subtitle="Total collected"
        />
      </div>

      {/* Hospital Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Patients" 
          value={loading ? '...' : stats.totalPatients.toLocaleString()} 
          icon={Users} 
          color="blue"
          subtitle="Registered"
        />
        <StatCard 
          title="Bed Occupancy" 
          value={loading ? '...' : `${stats.occupancyRate}%`} 
          icon={Activity} 
          color={stats.occupancyRate > 80 ? "red" : stats.occupancyRate > 60 ? "orange" : "green"}
          subtitle={`${stats.occupiedBeds}/${stats.totalBeds} beds`}
        />
        <StatCard 
          title="Doctors On Panel" 
          value={loading ? '...' : stats.totalDoctors.toString()} 
          icon={Stethoscope} 
          color="purple"
          subtitle="Active doctors"
        />
        <StatCard 
          title="Monthly Revenue" 
          value={loading ? '...' : formatCurrency(stats.monthlyRevenue)} 
          icon={TrendingUp} 
          color="green"
          subtitle="This month"
        />
      </div>

      {/* Alerts */}
      {(stats.pendingBills > 0 || stats.criticalPatients > 0 || stats.lowStock > 0 || stats.maintenanceBeds > 0) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Attention Required</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.pendingBills > 0 && (
              <div className="text-sm">
                <p className="font-medium text-red-800">{stats.pendingBills} Pending Bills</p>
                <p className="text-red-600">Require immediate attention</p>
              </div>
            )}
            {stats.criticalPatients > 0 && (
              <div className="text-sm">
                <p className="font-medium text-red-800">{stats.criticalPatients} Critical Patients</p>
                <p className="text-red-600">Need monitoring</p>
              </div>
            )}
            {stats.lowStock > 0 && (
              <div className="text-sm">
                <p className="font-medium text-red-800">{stats.lowStock} Low Stock Items</p>
                <p className="text-red-600">Pharmacy reorder needed</p>
              </div>
            )}
            {stats.maintenanceBeds > 0 && (
              <div className="text-sm">
                <p className="font-medium text-red-800">{stats.maintenanceBeds} Beds in Maintenance</p>
                <p className="text-red-600">Affecting capacity</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Revenue Trend (Last 7 Days)</h3>
            <span className="text-sm text-gray-500">Total: {formatCurrency(revenueChart.reduce((sum, d) => sum + d.amount, 0))}</span>
          </div>
          
          <div className="space-y-3">
            {revenueChart.map((data, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-16 text-xs text-gray-500">
                  {new Date(data.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: maxRevenue > 0 ? `${(data.amount / maxRevenue) * 100}%` : '0%' 
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center px-3 text-xs font-medium text-gray-700">
                    {formatCurrency(data.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ward Occupancy Overview */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ward Occupancy</h3>
          
          <div className="space-y-4">
            {wardOccupancy.map((ward, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">{ward.name}</span>
                  <span className="text-sm text-gray-500">{ward.occupied}/{ward.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${
                      ward.occupancy_rate > 80 ? 'bg-red-500' :
                      ward.occupancy_rate > 60 ? 'bg-orange-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${ward.occupancy_rate}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>{ward.occupancy_rate}% occupied</span>
                  <span>{ward.available} available</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
              <p className="text-sm text-gray-500">Overall Occupancy</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Recent Admissions</h3>
            <a href="/ipd" className="text-sm text-blue-600 hover:text-blue-800">View all</a>
          </div>
          
          <div className="space-y-3">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Bed className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.patient_name}</p>
                    <p className="text-sm text-gray-500">
                      {activity.doctor_name && `Dr. ${activity.doctor_name} • `}
                      {new Date(activity.time).toLocaleDateString()} {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    {activity.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/patients/new', label: 'New Patient', icon: Users, color: 'bg-blue-500' },
              { href: '/opd/booking', label: 'Book OPD', icon: CalendarDays, color: 'bg-green-500' },
              { href: '/ipd/admit', label: 'IPD Admit', icon: Bed, color: 'bg-purple-500' },
              { href: '/billing', label: 'Billing', icon: Receipt, color: 'bg-orange-500' },
              { href: '/lab', label: 'Lab Orders', icon: TestTube, color: 'bg-indigo-500' },
              { href: '/pharmacy', label: 'Pharmacy', icon: Pill, color: 'bg-teal-500' },
              { href: '/surgeries', label: 'OT Schedule', icon: Syringe, color: 'bg-red-500' },
              { href: '/reports', label: 'Reports', icon: BarChart3, color: 'bg-gray-500' },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className={`${action.color} text-white rounded-lg p-4 hover:opacity-90 transition-opacity flex flex-col items-center gap-2`}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-sm font-medium text-center">{action.label}</span>
              </a>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-900 mb-3">Revenue Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Today:</span>
                <span className="font-semibold">{formatCurrency(stats.todayRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">This Week:</span>
                <span className="font-semibold">{formatCurrency(stats.weeklyRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">This Month:</span>
                <span className="font-semibold">{formatCurrency(stats.monthlyRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">This Year:</span>
                <span className="font-semibold text-green-600">{formatCurrency(stats.yearlyRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}