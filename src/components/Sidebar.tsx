'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Bed, ClipboardList, Receipt,
  FileText, BarChart3, Pill, TestTube, Stethoscope, Syringe,
  BookOpen, Wallet, Building2
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
  { href: '/ipd', label: 'IPD', icon: Bed },
  { href: '/opd', label: 'OPD', icon: ClipboardList },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/discharge', label: 'Discharge', icon: FileText },
  { href: '/doctors', label: 'Doctors', icon: Stethoscope },
  { href: '/surgeries', label: 'Surgeries', icon: Syringe },
  { href: '/pharmacy', label: 'Pharmacy', icon: Pill },
  { href: '/lab', label: 'Lab', icon: TestTube },
  { href: '/accounting', label: 'Accounting', icon: Wallet },
  { href: '/infrastructure', label: 'Infrastructure', icon: Building2 },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700/50">
        <h1 className="text-lg font-bold tracking-tight">adamrit.com</h1>
        <p className="text-xs text-slate-400 mt-0.5">Hospital Management System</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 pb-4">
        <div className="px-3 py-3 rounded-lg bg-slate-800/50 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Hope Hospital</p>
          <p>Nagpur, India</p>
        </div>
      </div>
    </aside>
  )
}
