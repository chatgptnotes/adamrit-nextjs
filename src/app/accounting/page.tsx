'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import DataTable from '@/components/DataTable'
import StatCard from '@/components/StatCard'
import { Wallet, Receipt, BookOpen, TrendingUp, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

export default function AccountingPage() {
  const [vouchers, setVouchers] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [finalBills, setFinalBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'vouchers' | 'receipts' | 'accounts' | 'final_bills'>('receipts')

  useEffect(() => {
    async function fetch() {
      const [v, r, a, fb] = await Promise.all([
        supabase.from('voucher_entries').select('*').order('date', { ascending: false }).limit(500),
        supabase.from('account_receipts').select('*').order('date', { ascending: false }).limit(500),
        supabase.from('accounts_full').select('*').order('name', { ascending: true }).limit(500),
        supabase.from('final_billings').select('*').order('bill_date', { ascending: false }).limit(500),
      ])
      setVouchers(v.data || [])
      setReceipts(r.data || [])
      setAccounts(a.data || [])
      setFinalBills(fb.data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const totalDebits = vouchers.reduce((s, v) => s + (v.debit || 0), 0)
  const totalCredits = vouchers.reduce((s, v) => s + (v.credit || 0), 0)
  const totalReceipts = receipts.reduce((s, r) => s + (r.amount || 0), 0)
  const totalFinalBilled = finalBills.reduce((s, f) => s + (parseFloat(f.total_amount) || 0), 0)

  const voucherCols = [
    { key: 'id', label: 'ID' },
    { key: 'voucher_id', label: 'Voucher' },
    { key: 'account_id', label: 'Account' },
    { key: 'debit', label: 'Debit', render: (r: any) => r.debit ? <span className="text-red-600 font-medium">{formatCurrency(r.debit)}</span> : '—' },
    { key: 'credit', label: 'Credit', render: (r: any) => r.credit ? <span className="text-green-600 font-medium">{formatCurrency(r.credit)}</span> : '—' },
    { key: 'narration', label: 'Narration', render: (r: any) => <span className="text-xs text-gray-500 truncate max-w-[250px] block">{r.narration || '—'}</span> },
    { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) },
  ]

  const receiptCols = [
    { key: 'id', label: 'ID' },
    { key: 'patient_id', label: 'Patient ID' },
    { key: 'amount', label: 'Amount', render: (r: any) => <span className="font-semibold text-emerald-700">{formatCurrency(r.amount)}</span> },
    { key: 'payment_mode', label: 'Mode' },
    { key: 'receipt_no', label: 'Receipt #' },
    { key: 'date', label: 'Date', render: (r: any) => formatDate(r.date) },
  ]

  const accountCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Account Name', render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: 'alias_name', label: 'Alias' },
    { key: 'account_type', label: 'Type' },
    { key: 'status', label: 'Status' },
    { key: 'balance', label: 'Balance', render: (r: any) => r.balance ? formatCurrency(r.balance) : '—' },
    { key: 'payment_type', label: 'Payment Type' },
  ]

  const finalBillCols = [
    { key: 'id', label: 'ID' },
    { key: 'patient_id', label: 'Patient ID' },
    { key: 'total_amount', label: 'Total', render: (r: any) => <span className="font-semibold">{r.total_amount ? `₹${Number(r.total_amount).toLocaleString()}` : '—'}</span> },
    { key: 'amount_paid', label: 'Paid', render: (r: any) => <span className="text-green-600">{r.amount_paid ? `₹${Number(r.amount_paid).toLocaleString()}` : '—'}</span> },
    { key: 'amount_pending', label: 'Pending', render: (r: any) => <span className="text-red-600">{r.amount_pending ? `₹${Number(r.amount_pending).toLocaleString()}` : '—'}</span> },
    { key: 'discount', label: 'Discount' },
    { key: 'bill_date', label: 'Date', render: (r: any) => formatDate(r.bill_date) },
  ]

  const tabs = [
    { key: 'receipts', label: `Receipts (${receipts.length.toLocaleString()})` },
    { key: 'vouchers', label: `Vouchers (${vouchers.length.toLocaleString()})` },
    { key: 'accounts', label: `Accounts (${accounts.length.toLocaleString()})` },
    { key: 'final_bills', label: `Final Bills (${finalBills.length.toLocaleString()})` },
  ] as const

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600"><Wallet className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
          <p className="text-sm text-gray-500">Vouchers, receipts, accounts & final billing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Receipts" value={loading ? '...' : formatCurrency(totalReceipts)} icon={Receipt} color="green" subtitle={`${receipts.length.toLocaleString()} entries`} />
        <StatCard title="Total Debits" value={loading ? '...' : formatCurrency(totalDebits)} icon={ArrowUpCircle} color="red" subtitle="Voucher debits" />
        <StatCard title="Total Credits" value={loading ? '...' : formatCurrency(totalCredits)} icon={ArrowDownCircle} color="blue" subtitle="Voucher credits" />
        <StatCard title="Final Billed" value={loading ? '...' : formatCurrency(totalFinalBilled)} icon={TrendingUp} color="purple" subtitle={`${finalBills.length.toLocaleString()} bills`} />
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'receipts' && <DataTable data={receipts} columns={receiptCols} loading={loading} searchPlaceholder="Search receipts..." searchKey="receipt_no" />}
      {tab === 'vouchers' && <DataTable data={vouchers} columns={voucherCols} loading={loading} searchPlaceholder="Search vouchers..." searchKey="narration" />}
      {tab === 'accounts' && <DataTable data={accounts} columns={accountCols} loading={loading} searchPlaceholder="Search accounts..." searchKey="name" />}
      {tab === 'final_bills' && <DataTable data={finalBills} columns={finalBillCols} loading={loading} searchPlaceholder="Search bills..." searchKey="patient_id" />}
    </div>
  )
}
