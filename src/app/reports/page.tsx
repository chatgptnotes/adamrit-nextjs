'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import StatCard from '@/components/StatCard'
import DataTable from '@/components/DataTable'
import { 
  BarChart3, 
  Users, 
  Bed, 
  Receipt, 
  IndianRupee, 
  Building,
  Calendar,
  TrendingUp,
  Download,
  Printer,
  Filter,
  RefreshCw,
  FileText,
  Activity,
  Stethoscope,
  TestTube,
  Pill
} from 'lucide-react'

interface ReportData {
  daily: any
  weekly: any
  monthly: any
  departmentWise: any[]
  doctorWise: any[]
  revenueBreakdown: any[]
  occupancyData: any[]
  labPharmacyStats: any
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<ReportData>({
    daily: {},
    weekly: {},
    monthly: {},
    departmentWise: [],
    doctorWise: [],
    revenueBreakdown: [],
    occupancyData: [],
    labPharmacyStats: {}
  })
  
  // Report filters
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [selectedReport, setSelectedReport] = useState<'overview' | 'revenue' | 'occupancy' | 'departments' | 'doctors' | 'lab_pharmacy'>('overview')

  useEffect(() => {
    loadReportsData()
  }, [dateRange, reportType])

  async function loadReportsData() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const thisWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      // Daily statistics
      const [patientsToday, admissionsToday, dischargesQuery, surgeriesQuery, revenueQuery] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true })
          .gte('created_at', `${today}T00:00:00`).lt('created_at', `${today}T23:59:59`),
        supabase.from('ward_patients').select('*', { count: 'exact', head: true })
          .gte('admission_date', `${today}T00:00:00`).lt('admission_date', `${today}T23:59:59`),
        supabase.from('ward_patients').select('*', { count: 'exact', head: true })
          .gte('discharge_date', `${today}T00:00:00`).lt('discharge_date', `${today}T23:59:59`),
        supabase.from('surgeries').select('*', { count: 'exact', head: true })
          .gte('scheduled_date', `${today}T00:00:00`).lt('scheduled_date', `${today}T23:59:59`),
        supabase.from('billings_full').select('total_amount')
          .gte('created_at', `${today}T00:00:00`).lt('created_at', `${today}T23:59:59`)
      ])

      const dailyStats = {
        new_patients: patientsToday.count || 0,
        admissions: admissionsToday.count || 0,
        discharges: dischargesQuery.count || 0,
        surgeries: surgeriesQuery.count || 0,
        revenue: revenueQuery.data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0
      }

      // Weekly and monthly stats (similar calculations for different date ranges)
      const weeklyRevenue = await supabase.from('billings_full').select('total_amount')
        .gte('created_at', `${thisWeekStart}T00:00:00`)
      const monthlyRevenue = await supabase.from('billings_full').select('total_amount')
        .gte('created_at', `${thisMonthStart}T00:00:00`)

      // Department-wise revenue
      const { data: departmentData } = await supabase
        .from('billings_full')
        .select('department, total_amount')
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)

      const departmentWise = departmentData?.reduce((acc: any, bill: any) => {
        const dept = bill.department || 'General'
        if (!acc[dept]) {
          acc[dept] = { name: dept, revenue: 0, patients: 0 }
        }
        acc[dept].revenue += bill.total_amount || 0
        acc[dept].patients += 1
        return acc
      }, {})

      // Doctor-wise performance
      const { data: doctorData } = await supabase
        .from('billings_full')
        .select(`
          doctor_id,
          total_amount,
          doctors(name, specialization)
        `)
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)

      const doctorWise = doctorData?.reduce((acc: any, bill: any) => {
        const doctorId = bill.doctor_id
        if (doctorId && bill.doctors) {
          if (!acc[doctorId]) {
            acc[doctorId] = {
              name: bill.doctors.name,
              specialization: bill.doctors.specialization,
              revenue: 0,
              patients: 0
            }
          }
          acc[doctorId].revenue += bill.total_amount || 0
          acc[doctorId].patients += 1
        }
        return acc
      }, {})

      // Ward occupancy data
      const { data: wardsData } = await supabase.from('wards').select('*')
      const occupancyData = await Promise.all(
        (wardsData || []).map(async (ward: any) => {
          const { count: totalBeds } = await supabase
            .from('beds').select('*', { count: 'exact', head: true }).eq('ward_id', ward.id)
          const { count: occupiedBeds } = await supabase
            .from('beds').select('*', { count: 'exact', head: true })
            .eq('ward_id', ward.id).eq('status', 'occupied')

          return {
            ward_name: ward.name,
            total_beds: totalBeds || 0,
            occupied_beds: occupiedBeds || 0,
            available_beds: (totalBeds || 0) - (occupiedBeds || 0),
            occupancy_rate: totalBeds ? Math.round((occupiedBeds || 0) / totalBeds * 100) : 0
          }
        })
      )

      // Lab & Pharmacy stats
      const [labRevenue, pharmacyRevenue, labTests, pharmacySales] = await Promise.all([
        supabase.from('laboratory_test_orders').select('total_amount')
          .gte('ordered_at', `${dateRange.from}T00:00:00`)
          .lte('ordered_at', `${dateRange.to}T23:59:59`),
        supabase.from('pharmacy_sales_bills').select('net_amount')
          .gte('created_at', `${dateRange.from}T00:00:00`)
          .lte('created_at', `${dateRange.to}T23:59:59`),
        supabase.from('laboratory_test_orders').select('*', { count: 'exact', head: true })
          .gte('ordered_at', `${dateRange.from}T00:00:00`)
          .lte('ordered_at', `${dateRange.to}T23:59:59`),
        supabase.from('pharmacy_sales_bills').select('*', { count: 'exact', head: true })
          .gte('created_at', `${dateRange.from}T00:00:00`)
          .lte('created_at', `${dateRange.to}T23:59:59`)
      ])

      const labPharmacyStats = {
        lab_revenue: labRevenue.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0,
        pharmacy_revenue: pharmacyRevenue.data?.reduce((sum, sale) => sum + (sale.net_amount || 0), 0) || 0,
        lab_tests: labTests.count || 0,
        pharmacy_sales: pharmacySales.count || 0
      }

      setReportData({
        daily: dailyStats,
        weekly: {
          revenue: weeklyRevenue.data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0
        },
        monthly: {
          revenue: monthlyRevenue.data?.reduce((sum, bill) => sum + (bill.total_amount || 0), 0) || 0
        },
        departmentWise: Object.values(departmentWise || {}),
        doctorWise: Object.values(doctorWise || {}),
        revenueBreakdown: [],
        occupancyData,
        labPharmacyStats
      })

    } catch (error) {
      console.error('Error loading reports data:', error)
    }
    setLoading(false)
  }

  function exportToCSV(data: any[], filename: string) {
    if (data.length === 0) return
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  return (
    <div className="print:bg-white">
      {/* Header - Hidden in print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MIS Reports</h1>
            <p className="text-sm text-gray-500">Hospital analytics & performance reports</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadReportsData()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* Filters - Hidden in print */}
      <div className="mb-6 bg-white rounded-lg border p-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e: any) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e: any) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Period</label>
            <select
              value={reportType}
              onChange={(e: any) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={selectedReport}
              onChange={(e: any) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="overview">Overview</option>
              <option value="revenue">Revenue Analysis</option>
              <option value="occupancy">Occupancy Report</option>
              <option value="departments">Department Performance</option>
              <option value="doctors">Doctor Performance</option>
              <option value="lab_pharmacy">Lab & Pharmacy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Print Header - Visible only in print */}
      <div className="hidden print:block mb-6 text-center border-b-2 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Hospital MIS Report</h1>
        <p className="text-gray-600">
          Period: {new Date(dateRange.from).toLocaleDateString()} to {new Date(dateRange.to).toLocaleDateString()}
        </p>
        <p className="text-gray-600">Generated on: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Overview Stats */}
      {selectedReport === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard 
              title="Today's Patients" 
              value={loading ? '...' : (reportData.daily.new_patients || 0).toString()} 
              icon={Users} 
              color="blue" 
            />
            <StatCard 
              title="Admissions" 
              value={loading ? '...' : (reportData.daily.admissions || 0).toString()} 
              icon={Bed} 
              color="green" 
            />
            <StatCard 
              title="Discharges" 
              value={loading ? '...' : (reportData.daily.discharges || 0).toString()} 
              icon={FileText} 
              color="orange" 
            />
            <StatCard 
              title="Surgeries" 
              value={loading ? '...' : (reportData.daily.surgeries || 0).toString()} 
              icon={Activity} 
              color="red" 
            />
            <StatCard 
              title="Today's Revenue" 
              value={loading ? '...' : formatCurrency(reportData.daily.revenue || 0)} 
              icon={IndianRupee} 
              color="purple" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Revenue:</span>
                  <span className="font-semibold">{formatCurrency(reportData.daily.revenue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Weekly Revenue:</span>
                  <span className="font-semibold">{formatCurrency(reportData.weekly.revenue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Revenue:</span>
                  <span className="font-semibold">{formatCurrency(reportData.monthly.revenue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lab Revenue:</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(reportData.labPharmacyStats.lab_revenue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pharmacy Revenue:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(reportData.labPharmacyStats.pharmacy_revenue || 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Bed Occupancy</span>
                    <span className="font-semibold">
                      {reportData.occupancyData.length > 0 
                        ? Math.round(
                            reportData.occupancyData.reduce((sum, ward) => sum + ward.occupancy_rate, 0) / 
                            reportData.occupancyData.length
                          )
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${reportData.occupancyData.length > 0 
                          ? Math.round(
                              reportData.occupancyData.reduce((sum, ward) => sum + ward.occupancy_rate, 0) / 
                              reportData.occupancyData.length
                            )
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{reportData.labPharmacyStats.lab_tests || 0}</p>
                    <p className="text-sm text-gray-500">Lab Tests</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{reportData.labPharmacyStats.pharmacy_sales || 0}</p>
                    <p className="text-sm text-gray-500">Pharmacy Sales</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Occupancy Report */}
      {selectedReport === 'occupancy' && (
        <div className="bg-white rounded-lg border print:border-0">
          <div className="p-6 border-b print:border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Ward Occupancy Report</h3>
              <button
                onClick={() => exportToCSV(reportData.occupancyData, 'ward_occupancy')}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm print:hidden"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
          
          <DataTable
            data={reportData.occupancyData}
            columns={[
              { key: 'ward_name', label: 'Ward Name' },
              { key: 'total_beds', label: 'Total Beds' },
              { key: 'occupied_beds', label: 'Occupied' },
              { key: 'available_beds', label: 'Available' },
              { 
                key: 'occupancy_rate', 
                label: 'Occupancy Rate',
                render: (ward: any) => (
                  <span className={`font-semibold ${
                    ward.occupancy_rate > 80 ? 'text-red-600' :
                    ward.occupancy_rate > 60 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {ward.occupancy_rate}%
                  </span>
                )
              },
            ]}
            loading={loading}
          />
        </div>
      )}

      {/* Department Performance */}
      {selectedReport === 'departments' && (
        <div className="bg-white rounded-lg border print:border-0">
          <div className="p-6 border-b print:border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Department Performance Report</h3>
              <button
                onClick={() => exportToCSV(reportData.departmentWise, 'department_performance')}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm print:hidden"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
          
          <DataTable
            data={reportData.departmentWise}
            columns={[
              { key: 'name', label: 'Department' },
              { key: 'patients', label: 'Patients' },
              { 
                key: 'revenue', 
                label: 'Revenue',
                render: (dept: any) => (
                  <span className="font-semibold text-green-600">
                    {formatCurrency(dept.revenue)}
                  </span>
                )
              },
              { 
                key: 'avg_revenue', 
                label: 'Avg per Patient',
                render: (dept: any) => (
                  <span>
                    {formatCurrency(dept.patients > 0 ? dept.revenue / dept.patients : 0)}
                  </span>
                )
              },
            ]}
            loading={loading}
          />
        </div>
      )}

      {/* Doctor Performance */}
      {selectedReport === 'doctors' && (
        <div className="bg-white rounded-lg border print:border-0">
          <div className="p-6 border-b print:border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Doctor Performance Report</h3>
              <button
                onClick={() => exportToCSV(reportData.doctorWise, 'doctor_performance')}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm print:hidden"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
          
          <DataTable
            data={reportData.doctorWise}
            columns={[
              { 
                key: 'name', 
                label: 'Doctor',
                render: (doc: any) => (
                  <div>
                    <p className="font-medium">Dr. {doc.name}</p>
                    <p className="text-sm text-gray-500">{doc.specialization}</p>
                  </div>
                )
              },
              { key: 'patients', label: 'Patients Seen' },
              { 
                key: 'revenue', 
                label: 'Revenue Generated',
                render: (doc: any) => (
                  <span className="font-semibold text-green-600">
                    {formatCurrency(doc.revenue)}
                  </span>
                )
              },
              { 
                key: 'avg_revenue', 
                label: 'Avg per Patient',
                render: (doc: any) => (
                  <span>
                    {formatCurrency(doc.patients > 0 ? doc.revenue / doc.patients : 0)}
                  </span>
                )
              },
            ]}
            loading={loading}
          />
        </div>
      )}

      {/* Lab & Pharmacy Report */}
      {selectedReport === 'lab_pharmacy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Lab Tests" 
              value={loading ? '...' : (reportData.labPharmacyStats.lab_tests || 0).toString()} 
              icon={TestTube} 
              color="blue" 
            />
            <StatCard 
              title="Lab Revenue" 
              value={loading ? '...' : formatCurrency(reportData.labPharmacyStats.lab_revenue || 0)} 
              icon={IndianRupee} 
              color="blue" 
            />
            <StatCard 
              title="Pharmacy Sales" 
              value={loading ? '...' : (reportData.labPharmacyStats.pharmacy_sales || 0).toString()} 
              icon={Pill} 
              color="green" 
            />
            <StatCard 
              title="Pharmacy Revenue" 
              value={loading ? '...' : formatCurrency(reportData.labPharmacyStats.pharmacy_revenue || 0)} 
              icon={IndianRupee} 
              color="green" 
            />
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Lab & Pharmacy Performance</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Laboratory Statistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Tests:</span>
                    <span className="font-medium">{reportData.labPharmacyStats.lab_tests || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(reportData.labPharmacyStats.lab_revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg per Test:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        reportData.labPharmacyStats.lab_tests > 0 
                          ? reportData.labPharmacyStats.lab_revenue / reportData.labPharmacyStats.lab_tests 
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Pharmacy Statistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="font-medium">{reportData.labPharmacyStats.pharmacy_sales || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium text-green-600">{formatCurrency(reportData.labPharmacyStats.pharmacy_revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg per Sale:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        reportData.labPharmacyStats.pharmacy_sales > 0 
                          ? reportData.labPharmacyStats.pharmacy_revenue / reportData.labPharmacyStats.pharmacy_sales 
                          : 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body { margin: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:border-b { border-bottom: 1px solid #e5e7eb !important; }
        }
      `}</style>
    </div>
  )
}