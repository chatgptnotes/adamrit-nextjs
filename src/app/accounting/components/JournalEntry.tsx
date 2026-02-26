'use client'
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import { FileText, Plus, Save, Trash2, Calculator } from 'lucide-react'

interface JournalLine {
  account_id: string
  account_name: string
  debit: string
  credit: string
  narration: string
}

export default function JournalEntry() {
  const [entries, setEntries] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<number>(1)
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: '',
    narration: '',
    location_id: 1
  })

  const [journalLines, setJournalLines] = useState<JournalLine[]>([
    { account_id: '', account_name: '', debit: '', credit: '', narration: '' },
    { account_id: '', account_name: '', debit: '', credit: '', narration: '' }
  ])

  useEffect(() => {
    fetchData()
  }, [selectedLocation])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch journal entries (voucher type = 'Journal')
      const { data: journalData } = await supabaseProd
        .from('vouchers')
        .select(`
          *,
          voucher_entries (
            *,
            chart_of_accounts (name)
          )
        `)
        .eq('location_id', selectedLocation)
        .eq('voucher_type', 'Journal')
        .order('date', { ascending: false })
        .limit(100)

      // Fetch chart of accounts
      const { data: accountData } = await supabaseProd
        .from('chart_of_accounts')
        .select('*')
        .order('name', { ascending: true })

      setEntries(journalData || [])
      setAccounts(accountData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleLineChange = (index: number, field: string, value: string) => {
    const newLines = [...journalLines]
    newLines[index] = { ...newLines[index], [field]: value }
    
    // If account is selected, find and set the account name
    if (field === 'account_id') {
      const account = accounts.find(acc => acc.id.toString() === value)
      newLines[index].account_name = account ? account.name : ''
    }
    
    setJournalLines(newLines)
  }

  const addLine = () => {
    setJournalLines([...journalLines, { account_id: '', account_name: '', debit: '', credit: '', narration: '' }])
  }

  const removeLine = (index: number) => {
    if (journalLines.length > 2) {
      setJournalLines(journalLines.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const totalDebit = journalLines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0)
    const totalCredit = journalLines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0)
    return { totalDebit, totalCredit }
  }

  const generateVoucherNumber = () => {
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    const location = selectedLocation === 1 ? 'H' : 'A'
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `JV${location}${dateStr}${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { totalDebit, totalCredit } = calculateTotals()
    
    // Validate that debits equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      alert('Debits and Credits must be equal!')
      return
    }

    // Validate that all lines have either debit or credit (but not both)
    for (const line of journalLines) {
      if (!line.account_id) continue
      const debit = parseFloat(line.debit) || 0
      const credit = parseFloat(line.credit) || 0
      
      if (debit > 0 && credit > 0) {
        alert('A line cannot have both debit and credit amounts!')
        return
      }
      
      if (debit === 0 && credit === 0) {
        alert('Each line must have either a debit or credit amount!')
        return
      }
    }

    setSaving(true)
    try {
      // Create voucher
      const voucherData = {
        voucher_number: generateVoucherNumber(),
        voucher_type: 'Journal',
        date: formData.date,
        narration: formData.narration,
        reference: formData.reference,
        location_id: selectedLocation,
        status: 'Posted',
        total_amount: totalDebit,
        created_at: new Date().toISOString()
      }

      const { data: voucher, error: voucherError } = await supabaseProd
        .from('vouchers')
        .insert([voucherData])
        .select()
        .single()

      if (voucherError) throw voucherError

      // Create voucher entries
      const entries = journalLines
        .filter(line => line.account_id && (parseFloat(line.debit) || parseFloat(line.credit)))
        .map(line => ({
          voucher_id: voucher.id,
          account_id: parseInt(line.account_id),
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
          narration: line.narration || formData.narration,
          date: formData.date,
          location_id: selectedLocation
        }))

      await supabaseProd
        .from('voucher_entries')
        .insert(entries)

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        reference: '',
        narration: '',
        location_id: selectedLocation
      })
      setJournalLines([
        { account_id: '', account_name: '', debit: '', credit: '', narration: '' },
        { account_id: '', account_name: '', debit: '', credit: '', narration: '' }
      ])
      setShowForm(false)
      fetchData()

      alert('Journal entry created successfully!')
    } catch (error) {
      console.error('Error creating journal entry:', error)
      alert('Error creating journal entry. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'voucher_number', label: 'Voucher #' },
    { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) },
    { key: 'reference', label: 'Reference' },
    { 
      key: 'narration', 
      label: 'Narration',
      render: (r: any) => <span className="text-sm max-w-[300px] truncate block">{r.narration}</span>
    },
    { 
      key: 'total_amount', 
      label: 'Amount',
      render: (r: any) => <span className="font-semibold">{formatCurrency(r.total_amount)}</span>
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (r: any) => (
        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
          r.status === 'Posted' ? 'bg-green-100 text-green-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {r.status}
        </span>
      )
    },
    {
      key: 'entries_count',
      label: 'Lines',
      render: (r: any) => r.voucher_entries?.length || 0
    }
  ]

  const { totalDebit, totalCredit } = calculateTotals()
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Journal Entry</h2>
            <p className="text-sm text-gray-500">Double-entry bookkeeping with debit/credit</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Journal Entry
        </button>
      </div>

      {/* Location Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <label className="text-sm font-medium text-gray-700">Location:</label>
        <select 
          value={selectedLocation} 
          onChange={(e) => setSelectedLocation(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={1}>Hope Hospital</option>
          <option value={2}>Ayushman Hospital</option>
        </select>
      </div>

      {/* Journal Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Journal Entry</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Reference number or document"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <select
                  disabled
                  value={selectedLocation}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                >
                  <option value={1}>Hope Hospital</option>
                  <option value={2}>Ayushman Hospital</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Narration *
              </label>
              <textarea
                name="narration"
                value={formData.narration}
                onChange={handleFormChange}
                required
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description of the journal entry"
              />
            </div>

            {/* Journal Lines */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Journal Lines</h4>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Line
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 grid grid-cols-12 gap-2 p-3 text-sm font-medium text-gray-700">
                  <div className="col-span-4">Account</div>
                  <div className="col-span-2">Debit</div>
                  <div className="col-span-2">Credit</div>
                  <div className="col-span-3">Narration</div>
                  <div className="col-span-1">Action</div>
                </div>

                {journalLines.map((line, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-3 border-t border-gray-100">
                    <div className="col-span-4">
                      <select
                        value={line.account_id}
                        onChange={(e) => handleLineChange(index, 'account_id', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Account</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={line.debit}
                        onChange={(e) => {
                          handleLineChange(index, 'debit', e.target.value)
                          if (e.target.value) handleLineChange(index, 'credit', '')
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        value={line.credit}
                        onChange={(e) => {
                          handleLineChange(index, 'credit', e.target.value)
                          if (e.target.value) handleLineChange(index, 'debit', '')
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={line.narration}
                        onChange={(e) => handleLineChange(index, 'narration', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Line description"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {journalLines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="p-1 text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Totals Row */}
                <div className="bg-gray-100 grid grid-cols-12 gap-2 p-3 border-t border-gray-200 font-semibold">
                  <div className="col-span-4 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Totals
                  </div>
                  <div className="col-span-2 text-red-600">
                    {formatCurrency(totalDebit)}
                  </div>
                  <div className="col-span-2 text-green-600">
                    {formatCurrency(totalCredit)}
                  </div>
                  <div className="col-span-3 flex items-center">
                    {isBalanced ? (
                      <span className="text-green-600 text-sm">✓ Balanced</span>
                    ) : (
                      <span className="text-red-600 text-sm">⚠ Not Balanced</span>
                    )}
                  </div>
                  <div className="col-span-1"></div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving || !isBalanced}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Journal Entry'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Journal Entries Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Journal Entries</h3>
        <DataTable 
          data={entries}
          columns={columns}
          loading={loading}
          searchPlaceholder="Search journal entries..."
          searchKey="voucher_number"
        />
      </div>
    </div>
  )
}