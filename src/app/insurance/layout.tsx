'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Shield } from 'lucide-react'

const tabs = [
  { href: '/insurance', label: 'Dashboard' },
  { href: '/insurance/esic', label: 'ESIC Claims' },
  { href: '/insurance/pmjay', label: 'PM-JAY / RGJAY' },
  { href: '/insurance/corporate', label: 'Corporate Billing' },
  { href: '/insurance/tracker', label: 'Claim Tracker' },
  { href: '/insurance/receivable', label: 'Account Receivable' },
  { href: '/insurance/reports', label: 'Reports' },
  { href: '/insurance/denials', label: 'Denial Management' },
]

export default function InsuranceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance / ESIC / Corporate</h1>
          <p className="text-sm text-gray-500">Manage claims, billing, and payments across all insurance providers</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'py-3 px-1 border-b-2 font-medium text-sm',
                    active
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {children}
    </div>
  )
}