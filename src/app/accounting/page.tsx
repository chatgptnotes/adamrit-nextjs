'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabaseProd } from '@/lib/supabase-prod'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  Wallet, 
  Receipt, 
  BookOpen, 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle,
  CreditCard,
  FileText,
  Calculator,
  User,
  Download
} from 'lucide-react'

// Import all accounting components
import Dashboard from './components/Dashboard'
import CashBook from './components/CashBook'
import ReceiptVoucher from './components/ReceiptVoucher'
import PaymentVoucher from './components/PaymentVoucher'
import JournalEntry from './components/JournalEntry'
import ContraEntry from './components/ContraEntry'
import Ledger from './components/Ledger'
import TrialBalance from './components/TrialBalance'
import PatientAccount from './components/PatientAccount'
import TallyExport from './components/TallyExport'

export default function AccountingPage() {
  const [tab, setTab] = useState<string>('dashboard')
  const [loading, setLoading] = useState(false)

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { key: 'cashbook', label: 'Cash Book', icon: BookOpen },
    { key: 'receipt', label: 'Receipt Voucher', icon: Receipt },
    { key: 'payment', label: 'Payment Voucher', icon: ArrowUpCircle },
    { key: 'journal', label: 'Journal Entry', icon: FileText },
    { key: 'contra', label: 'Contra Entry', icon: CreditCard },
    { key: 'ledger', label: 'Ledger', icon: Calculator },
    { key: 'trial', label: 'Trial Balance', icon: ArrowDownCircle },
    { key: 'patient', label: 'Patient Account', icon: User },
    { key: 'tally', label: 'Tally Export', icon: Download },
  ]

  const renderContent = () => {
    switch (tab) {
      case 'dashboard': return <Dashboard />
      case 'cashbook': return <CashBook />
      case 'receipt': return <ReceiptVoucher />
      case 'payment': return <PaymentVoucher />
      case 'journal': return <JournalEntry />
      case 'contra': return <ContraEntry />
      case 'ledger': return <Ledger />
      case 'trial': return <TrialBalance />
      case 'patient': return <PatientAccount />
      case 'tally': return <TallyExport />
      default: return <Dashboard />
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounting Module</h1>
          <p className="text-sm text-gray-500">Complete accounting management for Hope & Ayushman Hospitals</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg border border-gray-200">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button 
              key={t.key} 
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {renderContent()}
      </div>
    </div>
  )
}