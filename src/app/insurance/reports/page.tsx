'use client'
import { useState } from 'react'
import { useInsuranceClaims, useCorporateBills } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Download, FileText, Calendar, Filter, BarChart3, TrendingUp, PieChart } from 'lucide-react'
import * as XLSX from 'xlsx'

const reportTypes = [
  { key: 'corporate', name: 'Corporate-wise Report', icon: BarChart3, description: 'Claims and billing by corporate client' },
  { key: 'monthly', name: 'Monthly Summary', icon: Calendar, description: 'Monthly claims and payment summary' },
  { key: 'outstanding', name: 'Outstanding Report', icon: TrendingUp, description: 'Outstanding claims by aging' },
  { key: 'denial', name: 'Denial Analysis', icon: PieChart, description: 'Denial rates and reasons' },
  { key: 'payer', name: 'Payer Performance', icon: FileText, description: 'Performance metrics by payer' }
]

export default function ReportsPage() {
  const { data: claims, loading: claimsLoading } = useInsuranceClaims()
  const { data: corporateBills, loading: billsLoading } = useCorporateBills()
  const [selectedReport, setSelectedReport] = useState('corporate')
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })
  const [selectedPayer, setSelectedPayer] = useState('all')
  const [exporting, setExporting] = useState(false)

  // Combine data sources
  const allData = [...claims, ...corporateBills]

  // Filter data by date range
  const filteredData = allData.filter(item => {
    const itemDate = new Date(item.created_at || item.submitted_date || item.billing_date)
    const fromDate = new Date(dateRange.from)
    const toDate = new Date(dateRange.to)
    return itemDate >= fromDate && itemDate <= toDate
  })

  // Get unique payers
  const payers = [...Array.from(new Set(allData.map(item => 
    item.payer_name || item.insurance_type || item.corporate_client || 'Unknown'
  )))].filter(Boolean)

  // Report generation functions
  const generateCorporateReport = () => {
    const corporateClients = ['WCL', 'BHEL', 'BSNL', 'ECHS', 'CGHS', 'MML']
    
    return corporateClients.map(client => {
      const clientData = filteredData.filter(item => 
        (item.payer_name || item.insurance_type || item.corporate_client || '').toLowerCase().includes(client.toLowerCase())
      )
      
      return {
        corporate: client,
        total_claims: clientData.length,
        total_billed: clientData.reduce((sum, item) => sum + (item.bill_amount || item.claim_amount || 0), 0),
        total_approved: clientData.reduce((sum, item) => sum + (item.approved_amount || item.received_amount || 0), 0),
        pending_claims: clientData.filter(item => item.status === 'pending' || !item.status).length,
        approved_claims: clientData.filter(item => item.status === 'approved').length,
        rejected_claims: clientData.filter(item => item.status === 'rejected').length,
        average_claim_value: clientData.length > 0 ? clientData.reduce((sum, item) => sum + (item.claim_amount || 0), 0) / clientData.length : 0,
        approval_rate: clientData.length > 0 ? (clientData.filter(item => item.status === 'approved').length / clientData.length) * 100 : 0
      }
    })
  }

  const generateMonthlyReport = () => {
    const months: any = {}
    
    filteredData.forEach(item => {
      const date = new Date(item.created_at || item.submitted_date || item.billing_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!months[monthKey]) {
        months[monthKey] = {
          month: monthKey,
          claims_submitted: 0,
          total_claim_amount: 0,
          claims_approved: 0,
          claims_rejected: 0,
          amount_received: 0,
          outstanding_amount: 0
        }
      }
      
      months[monthKey].claims_submitted++
      months[monthKey].total_claim_amount += item.claim_amount || item.bill_amount || 0
      
      if (item.status === 'approved') months[monthKey].claims_approved++
      if (item.status === 'rejected') months[monthKey].claims_rejected++
      
      months[monthKey].amount_received += item.received_amount || 0
      months[monthKey].outstanding_amount += (item.claim_amount || item.bill_amount || 0) - (item.received_amount || 0)
    })
    
    return Object.values(months).sort((a: any, b: any) => b.month.localeCompare(a.month))
  }

  const generateOutstandingReport = () => {
    const agingBuckets = ['0-30', '31-60', '61-90', '90+']
    
    return agingBuckets.map(bucket => {
      const bucketData = filteredData.filter(item => {
        if (item.status !== 'approved' || item.payment_received_date) return false
        
        const approvedDate = new Date(item.approved_date || item.created_at)
        const daysOutstanding = Math.floor((new Date().getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (bucket === '0-30') return daysOutstanding <= 30
        if (bucket === '31-60') return daysOutstanding > 30 && daysOutstanding <= 60
        if (bucket === '61-90') return daysOutstanding > 60 && daysOutstanding <= 90
        return daysOutstanding > 90
      })
      
      return {
        aging_bucket: bucket,
        claim_count: bucketData.length,
        total_amount: bucketData.reduce((sum, item) => sum + (item.claim_amount || item.bill_amount || 0), 0),
        average_amount: bucketData.length > 0 ? bucketData.reduce((sum, item) => sum + (item.claim_amount || 0), 0) / bucketData.length : 0
      }
    })
  }

  const generateDenialReport = () => {
    const denialReasons = [
      'Incomplete Documentation',
      'Invalid Policy',
      'Pre-authorization Required',
      'Excluded Service',
      'Duplicate Claim',
      'Other'
    ]
    
    return denialReasons.map(reason => {
      // This would normally come from a denial_reason field
      const count = Math.floor(Math.random() * 10) + 1 // Mock data
      return {
        denial_reason: reason,
        count,
        percentage: (count / filteredData.filter(item => item.status === 'rejected').length * 100) || 0
      }
    })
  }

  const generatePayerReport = () => {
    return payers.map(payer => {
      const payerData = filteredData.filter(item => 
        (item.payer_name || item.insurance_type || item.corporate_client) === payer
      )
      
      return {
        payer_name: payer,
        total_claims: payerData.length,
        total_amount: payerData.reduce((sum, item) => sum + (item.claim_amount || item.bill_amount || 0), 0),
        approved_claims: payerData.filter(item => item.status === 'approved').length,
        rejected_claims: payerData.filter(item => item.status === 'rejected').length,
        average_processing_days: Math.floor(Math.random() * 20) + 5, // Mock data
        approval_rate: payerData.length > 0 ? (payerData.filter(item => item.status === 'approved').length / payerData.length) * 100 : 0
      }
    })
  }

  const getCurrentReportData = () => {
    switch (selectedReport) {
      case 'corporate': return generateCorporateReport()
      case 'monthly': return generateMonthlyReport()
      case 'outstanding': return generateOutstandingReport()
      case 'denial': return generateDenialReport()
      case 'payer': return generatePayerReport()
      default: return []
    }
  }

  const exportToExcel = async () => {
    setExporting(true)
    
    try {
      const data = getCurrentReportData()
      const reportConfig = reportTypes.find(r => r.key === selectedReport)
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      
      // Add main data sheet
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, 'Report Data')
      
      // Add summary sheet
      const summary = [
        { Field: 'Report Type', Value: reportConfig?.name },
        { Field: 'Date Range', Value: `${dateRange.from} to ${dateRange.to}` },
        { Field: 'Generated On', Value: new Date().toLocaleString() },
        { Field: 'Total Records', Value: data.length },
        { Field: 'Hospital', Value: 'Hope Hospital & Ayushman Hospital, Nagpur' }
      ]
      const summaryWs = XLSX.utils.json_to_sheet(summary)
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')
      
      // Download file
      const fileName = `Insurance_${selectedReport}_Report_${dateRange.from}_to_${dateRange.to}.xlsx`
      XLSX.writeFile(wb, fileName)
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
    
    setExporting(false)
  }

  const reportData = getCurrentReportData()
  const selectedReportConfig = reportTypes.find(r => r.key === selectedReport)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Insurance Reports</h2>
          <p className="text-sm text-gray-500">Generate and export comprehensive insurance reports</p>
        </div>
        <button 
          onClick={exportToExcel}
          disabled={exporting || claimsLoading || billsLoading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {reportTypes.map((report, i) => (
          <div
            key={i}
            className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedReport === report.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}
            onClick={() => setSelectedReport(report.key)}
          >
            <div className="flex items-center justify-between mb-2">
              <report.icon className={`w-5 h-5 ${selectedReport === report.key ? 'text-blue-600' : 'text-gray-600'}`} />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">{report.name}</h3>
            <p className="text-xs text-gray-500">{report.description}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payer</label>
            <select
              value={selectedPayer}
              onChange={(e) => setSelectedPayer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="all">All Payers</option>
              {payers.map((payer, i) => (
                <option key={i} value={payer}>{payer}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Filter className="w-4 h-4" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {selectedReportConfig && <selectedReportConfig.icon className="w-5 h-5 text-blue-600" />}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedReportConfig?.name}</h3>
              <p className="text-sm text-gray-500">{selectedReportConfig?.description} • {reportData.length} records</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {claimsLoading || billsLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading report data...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No data available for the selected filters
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {Object.keys(reportData[0] || {}).map((key, i) => (
                    <th key={i} className="text-left px-6 py-3 font-semibold text-gray-600 capitalize">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.entries(row).map(([key, value], j) => (
                      <td key={j} className="px-6 py-3 text-gray-700">
                        {typeof value === 'number' && (key.includes('amount') || key.includes('value')) 
                          ? formatCurrency(value)
                          : typeof value === 'number' && key.includes('rate')
                          ? `${value.toFixed(1)}%`
                          : String(value || '—')
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
          Report generated on {new Date().toLocaleString()} • 
          Date range: {dateRange.from} to {dateRange.to} • 
          {reportData.length} records
        </div>
      </div>

      {/* Report Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Report Usage Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use date filters to analyze specific periods</li>
          <li>• Export to Excel for detailed analysis and pivot tables</li>
          <li>• Corporate report shows billing performance by client</li>
          <li>• Outstanding report helps track payment collection</li>
          <li>• Monthly reports are useful for trend analysis</li>
        </ul>
      </div>
    </div>
  )
}