'use client'
import { useState } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Download, FileText, Calendar, CheckCircle } from 'lucide-react'

export default function TallyExport() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [voucherType, setVoucherType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [xmlPreview, setXmlPreview] = useState('')
  const [stats, setStats] = useState<any>(null)

  const generateTallyXML = (vouchers: any[]) => {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<ENVELOPE>\n<HEADER>\n<TALLYREQUEST>Import Data</TALLYREQUEST>\n</HEADER>\n<BODY>\n<IMPORTDATA>\n<REQUESTDESC>\n<REPORTNAME>Vouchers</REPORTNAME>\n<STATICVARIABLES>\n<SVCURRENTCOMPANY>Hope Hospital</SVCURRENTCOMPANY>\n</STATICVARIABLES>\n</REQUESTDESC>\n<REQUESTDATA>\n`

    for (const v of vouchers) {
      const type = v.voucher_type || 'Journal'
      const date = v.date ? new Date(v.date).toISOString().slice(0, 10).replace(/-/g, '') : ''
      xml += `<TALLYMESSAGE xmlns:UDF="TallyUDF">\n`
      xml += `<VOUCHER VCHTYPE="${type}" ACTION="Create">\n`
      xml += `<DATE>${date}</DATE>\n`
      xml += `<VOUCHERTYPENAME>${type}</VOUCHERTYPENAME>\n`
      xml += `<NARRATION>${v.narration || v.description || ''}</NARRATION>\n`
      xml += `<VOUCHERNUMBER>${v.voucher_number || v.id || ''}</VOUCHERNUMBER>\n`
      
      if (v.debit_account) {
        xml += `<ALLLEDGERENTRIES.LIST>\n`
        xml += `<LEDGERNAME>${v.debit_account}</LEDGERNAME>\n`
        xml += `<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`
        xml += `<AMOUNT>-${v.amount || 0}</AMOUNT>\n`
        xml += `</ALLLEDGERENTRIES.LIST>\n`
      }
      if (v.credit_account) {
        xml += `<ALLLEDGERENTRIES.LIST>\n`
        xml += `<LEDGERNAME>${v.credit_account}</LEDGERNAME>\n`
        xml += `<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`
        xml += `<AMOUNT>${v.amount || 0}</AMOUNT>\n`
        xml += `</ALLLEDGERENTRIES.LIST>\n`
      }
      
      xml += `</VOUCHER>\n</TALLYMESSAGE>\n`
    }
    xml += `</REQUESTDATA>\n</IMPORTDATA>\n</BODY>\n</ENVELOPE>`
    return xml
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      let query = supabaseProd.from('vouchers').select('*')
      if (dateFrom) query = query.gte('date', dateFrom)
      if (dateTo) query = query.lte('date', dateTo)
      if (voucherType !== 'all') query = query.eq('voucher_type', voucherType)
      query = query.order('date', { ascending: true })

      const { data, error } = await query
      if (error) throw error

      const vouchers = data || []
      setStats({
        total: vouchers.length,
        journal: vouchers.filter((v: any) => v.voucher_type === 'Journal').length,
        receipt: vouchers.filter((v: any) => v.voucher_type === 'Receipt').length,
        payment: vouchers.filter((v: any) => v.voucher_type === 'Payment').length,
        contra: vouchers.filter((v: any) => v.voucher_type === 'Contra').length,
      })

      const xml = generateTallyXML(vouchers)
      setXmlPreview(xml.substring(0, 2000) + (xml.length > 2000 ? '\n... (truncated)' : ''))
      
      // Auto download
      const blob = new Blob([xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tally-export-${dateFrom || 'all'}-to-${dateTo || 'all'}.xml`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export error:', e)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tally Export</h2>
          <p className="text-sm text-gray-500">Export vouchers in Tally XML format for import</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Export Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voucher Type</label>
            <select value={voucherType} onChange={e => setVoucherType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent">
              <option value="all">All Types</option>
              <option value="Journal">Journal</option>
              <option value="Receipt">Receipt</option>
              <option value="Payment">Payment</option>
              <option value="Contra">Contra</option>
            </select>
          </div>
        </div>
        <button onClick={handleExport} disabled={loading}
          className="mt-4 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
          <Download className="w-4 h-4" />
          {loading ? 'Generating...' : 'Generate & Download Tally XML'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'blue' },
            { label: 'Journal', value: stats.journal, color: 'purple' },
            { label: 'Receipt', value: stats.receipt, color: 'green' },
            { label: 'Payment', value: stats.payment, color: 'red' },
            { label: 'Contra', value: stats.contra, color: 'orange' },
          ].map(s => (
            <div key={s.label} className={`bg-${s.color}-50 rounded-xl p-4 border border-${s.color}-100`}>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label} Vouchers</p>
            </div>
          ))}
        </div>
      )}

      {/* XML Preview */}
      {xmlPreview && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> XML Preview
          </h3>
          <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700 overflow-auto max-h-64 border">
            {xmlPreview}
          </pre>
        </div>
      )}

      {/* Help */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <h4 className="font-medium text-amber-800 mb-2">How to Import in Tally</h4>
        <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
          <li>Open Tally ERP 9 / Tally Prime</li>
          <li>Go to Gateway → Import Data</li>
          <li>Select the downloaded XML file</li>
          <li>Verify the vouchers imported correctly</li>
          <li>Check Day Book for imported entries</li>
        </ol>
      </div>
    </div>
  )
}
