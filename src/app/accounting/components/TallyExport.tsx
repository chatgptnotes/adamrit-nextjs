'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { formatDate } from '@/lib/utils'
import { Download, FileText, Calendar } from 'lucide-react'

// Use correct Supabase credentials
const supabase = createClient(
  'https://tegvsgjhxrfddwpbgrzz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3ZzZ2poeHJmZGR3cGJncnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDU1NDIsImV4cCI6MjA4NzY4MTU0Mn0.WjKDFe5NueYvfenpqlRHbHQwuDSW9ogGILglCSxj0EM'
)

interface VoucherExportData {
  voucher_number: string
  voucher_date: string
  type: string
  narration: string
  total_amount: number
  entries: Array<{
    account_name: string
    debit?: number
    credit?: number
    narration: string
  }>
}

export default function TallyExport() {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // First day of current month
    return date.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const [exportCount, setExportCount] = useState<number>(0)

  const fetchVoucherData = async (): Promise<VoucherExportData[]> => {
    // Fetch voucher logs with entries
    const { data: vouchers, error } = await supabase
      .from('voucher_logs')
      .select(`
        voucher_number,
        voucher_date,
        type,
        narration,
        total_amount,
        voucher_entries!inner(
          debit,
          credit,
          narration,
          chart_of_accounts!inner(name)
        )
      `)
      .eq('location_id', selectedLocation)
      .gte('voucher_date', fromDate)
      .lte('voucher_date', toDate)
      .eq('is_deleted', false)
      .order('voucher_date', { ascending: true })

    if (error) throw error

    // Group entries by voucher
    const groupedVouchers: Record<string, VoucherExportData> = {}

    vouchers?.forEach((voucher: any) => {
      if (!groupedVouchers[voucher.voucher_number]) {
        groupedVouchers[voucher.voucher_number] = {
          voucher_number: voucher.voucher_number,
          voucher_date: voucher.voucher_date,
          type: voucher.type,
          narration: voucher.narration,
          total_amount: voucher.total_amount,
          entries: []
        }
      }

      voucher.voucher_entries.forEach((entry: any) => {
        groupedVouchers[voucher.voucher_number].entries.push({
          account_name: entry.chart_of_accounts.name,
          debit: entry.debit || undefined,
          credit: entry.credit || undefined,
          narration: entry.narration
        })
      })
    })

    return Object.values(groupedVouchers)
  }

  const generateTallyXML = (vouchers: VoucherExportData[]): string => {
    const companyName = selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Day Book</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Day Book</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchers.map(voucher => `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER REMOTEID="${voucher.voucher_number}" VCHKEY="${voucher.voucher_number}" VCHTYPE="${voucher.type}" ACTION="Create">
            <VOUCHERTYPENAME>${voucher.type}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${voucher.voucher_number}</VOUCHERNUMBER>
            <DATE>${formatTallyDate(voucher.voucher_date)}</DATE>
            <NARRATION>${escapeXML(voucher.narration)}</NARRATION>
            <VCHGSTCLASS/>
            <ENTEREDBY>HMS System</ENTEREDBY>
            <DIFFACTUALQTY>No</DIFFACTUALQTY>
            <AUDITED>No</AUDITED>
            <FORJOBCOSTING>No</FORJOBCOSTING>
            <ISOPTIONAL>No</ISOPTIONAL>
            <EFFECTIVEDATE>${formatTallyDate(voucher.voucher_date)}</EFFECTIVEDATE>
            <USEFORINTEREST>No</USEFORINTEREST>
            <USEFORGAINLOSS>No</USEFORGAINLOSS>
            <USEFORGODOWNTRANSFER>No</USEFORGODOWNTRANSFER>
            <USEFORCOMPOUND>No</USEFORCOMPOUND>
            <ALTERID>1</ALTERID>
            <MASTERID>1</MASTERID>
            <VOUCHERKEY>1</VOUCHERKEY>
${voucher.entries.map((entry, index) => `            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXML(entry.account_name)}</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>${entry.debit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>${entry.debit ? entry.debit : entry.credit ? -entry.credit : 0}</AMOUNT>
              <SERVICETAXDETAILS.LIST>       </SERVICETAXDETAILS.LIST>
              <BANKALLOCATIONS.LIST>       </BANKALLOCATIONS.LIST>
              <BILLALLOCATIONS.LIST>       </BILLALLOCATIONS.LIST>
              <INTERESTCOLLECTION.LIST>       </INTERESTCOLLECTION.LIST>
              <OLDAUDITENTRIES.LIST>       </OLDAUDITENTRIES.LIST>
              <ACCOUNTAUDITENTRIES.LIST>       </ACCOUNTAUDITENTRIES.LIST>
              <AUDITENTRIES.LIST>       </AUDITENTRIES.LIST>
              <INPUTCRALLOCS.LIST>       </INPUTCRALLOCS.LIST>
              <DUTYHEADDETAILS.LIST>       </DUTYHEADDETAILS.LIST>
              <EXCISEDUTYHEADDETAILS.LIST>       </EXCISEDUTYHEADDETAILS.LIST>
              <RATEDETAILS.LIST>       </RATEDETAILS.LIST>
              <SUPPLEMENTARYDUTYHEADDETAILS.LIST>       </SUPPLEMENTARYDUTYHEADDETAILS.LIST>
              <TAXOBJECTALLOCATIONS.LIST>       </TAXOBJECTALLOCATIONS.LIST>
              <VATDETAILS.LIST>       </VATDETAILS.LIST>
              <COSTTRACKALLOCATIONS.LIST>       </COSTTRACKALLOCATIONS.LIST>
              <REFVOUCHERDETAILS.LIST>       </REFVOUCHERDETAILS.LIST>
              <INVOICEWISEDETAILS.LIST>       </INVOICEWISEDETAILS.LIST>
              <VATITCDETAILS.LIST>       </VATITCDETAILS.LIST>
              <ADVANCETAXDETAILS.LIST>       </ADVANCETAXDETAILS.LIST>
            </LEDGERENTRIES.LIST>`).join('\n')}
          </VOUCHER>
        </TALLYMESSAGE>`).join('\n')}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`

    return xml
  }

  const formatTallyDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  const escapeXML = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates')
      return
    }

    if (new Date(fromDate) > new Date(toDate)) {
      alert('From date cannot be later than to date')
      return
    }

    setLoading(true)
    try {
      const vouchers = await fetchVoucherData()
      
      if (vouchers.length === 0) {
        alert('No voucher entries found for the selected date range')
        return
      }

      const xml = generateTallyXML(vouchers)
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `tally-export-${selectedLocation === 1 ? 'hope' : 'ayushman'}-${fromDate}-to-${toDate}.xml`
      a.click()
      
      URL.revokeObjectURL(url)
      setExportCount(vouchers.length)
      
      // Show success message
      alert(`Successfully exported ${vouchers.length} vouchers to Tally XML format`)
    } catch (error) {
      console.error('Error exporting to Tally:', error)
      alert('Error generating Tally export. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates')
      return
    }

    setLoading(true)
    try {
      const vouchers = await fetchVoucherData()
      setExportCount(vouchers.length)
    } catch (error) {
      console.error('Error fetching voucher data:', error)
      alert('Error fetching voucher data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-orange-600" />
          Tally Export
        </h1>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Import into Tally</h3>
        <div className="space-y-2 text-blue-800">
          <p>1. Generate and download the XML file using the form below</p>
          <p>2. Open Tally ERP and go to Gateway of Tally</p>
          <p>3. Go to Import Data → Vouchers</p>
          <p>4. Select the downloaded XML file</p>
          <p>5. Verify the import and accept the vouchers</p>
        </div>
        <div className="mt-4 p-3 bg-blue-100 rounded border border-blue-300">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Make sure all the chart of accounts (ledgers) exist in your Tally 
            company before importing. The system will map accounts by name.
          </p>
        </div>
      </div>

      {/* Export Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Export Parameters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={1}>Hope Hospital</option>
              <option value={2}>Ayushman Hospital</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date *</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date *</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Preview Count
            </button>
          </div>
        </div>

        {/* Preview Results */}
        {exportCount > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-medium">
                  Found {exportCount} voucher{exportCount !== 1 ? 's' : ''} for export
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Date range: {formatDate(fromDate)} to {formatDate(toDate)} • 
                  Location: {selectedLocation === 1 ? 'Hope Hospital' : 'Ayushman Hospital'}
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={loading}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                {loading ? 'Generating...' : 'Download XML'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tally XML Format Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Format Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Voucher Types Included:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Receipt Vouchers (Patient payments)</li>
              <li>• Payment Vouchers (Hospital expenses)</li>
              <li>• Journal Vouchers (Adjustments)</li>
              <li>• Contra Vouchers (Fund transfers)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Data Fields Exported:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Voucher number and date</li>
              <li>• Account (Ledger) names</li>
              <li>• Debit and credit amounts</li>
              <li>• Narration/Description</li>
              <li>• Company information</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Important Requirements:</h4>
          <ul className="space-y-1 text-sm text-yellow-700">
            <li>• All account names in the export must exist as Ledgers in your Tally company</li>
            <li>• Voucher types (Receipt, Payment, Journal, Contra) should be configured in Tally</li>
            <li>• The company name in Tally should match the location name</li>
            <li>• Ensure no duplicate voucher numbers exist in Tally for the same period</li>
          </ul>
        </div>
      </div>

      {/* Sample XML Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample XML Structure</h3>
        
        <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
          <pre className="text-xs text-gray-600 font-mono">
{`<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Day Book</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Receipt" ACTION="Create">
            <VOUCHERNUMBER>RV20260227001</VOUCHERNUMBER>
            <DATE>20260227</DATE>
            <NARRATION>Patient payment received</NARRATION>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>Cash</LEDGERNAME>
              <AMOUNT>1000</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>Patient Receivables</LEDGERNAME>
              <AMOUNT>-1000</AMOUNT>
            </LEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`}
          </pre>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          This is a simplified sample. The actual export includes all required Tally XML tags and formatting.
        </p>
      </div>
    </div>
  )
}