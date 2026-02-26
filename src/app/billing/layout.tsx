'use client'
import { useState } from 'react'
import { Receipt, CreditCard, Stethoscope, Banknote, FileText, Package, ClipboardList, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, href: '/billing' },
  { id: 'opd', label: 'OPD Billing', icon: Stethoscope, href: '/billing/opd' },
  { id: 'ipd', label: 'IPD Billing', icon: CreditCard, href: '/billing/ipd' },
  { id: 'surgery', label: 'Surgery Billing', icon: FileText, href: '/billing/surgery' },
  { id: 'advance', label: 'Advance Payment', icon: Banknote, href: '/billing/advance' },
  { id: 'discharge', label: 'Discharge Bill', icon: ClipboardList, href: '/billing/discharge' },
  { id: 'packages', label: 'Package Billing', icon: Package, href: '/billing/packages' },
  { id: 'receipt', label: 'Receipt', icon: Receipt, href: '/billing/receipt' },
  { id: 'pending', label: 'Pending Bills', icon: AlertCircle, href: '/billing/pending' },
  { id: 'reports', label: 'Reports', icon: TrendingUp, href: '/billing/reports' },
]

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Management</h1>
          <p className="text-sm text-gray-500">Comprehensive billing system for OPD, IPD, Surgery & more</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href === '/billing' && pathname === '/billing')
            const Icon = tab.icon
            
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page Content */}
      <div className="min-h-[600px]">
        {children}
      </div>
    </div>
  )
}