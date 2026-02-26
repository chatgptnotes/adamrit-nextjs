'use client'
import { useState, useMemo } from 'react'
import { useBillings } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import { AlertCircle, Clock, Phone, Mail, Filter, Search, DollarSign, Calendar } from 'lucide-react'

export default function PendingBillsPage() {
  const { data: billings, loading } = useBillings()
  const [searchTerm, setSearchTerm] = useState('')
  const [ageFilter, setAgeFilter] = useState<'all' | '0-7' | '8-30' | '31-90' | '90+'>('all')
  const [sortBy, setSortBy] = useState<'amount' | 'date' | 'age'>('amount')

  // Calculate pending bills
  const pendingBills = useMemo(() => {
    return billings
      .filter(bill => {
        const totalAmount = parseFloat(bill.total_amount) || 0
        const paidAmount = parseFloat(bill.paid_amount) || 0
        return totalAmount > paidAmount // Has outstanding balance
      })
      .map(bill => {
        const totalAmount = parseFloat(bill.total_amount) || 0
        const paidAmount = parseFloat(bill.paid_amount) || 0
        const pendingAmount = totalAmount - paidAmount
        
        // Calculate age in days
        const billDate = new Date(bill.billing_date)
        const today = new Date()
        const ageInDays = Math.floor((today.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          ...bill,
          pendingAmount,
          ageInDays,
          ageCategory: 
            ageInDays <= 7 ? '0-7' :
            ageInDays <= 30 ? '8-30' :
            ageInDays <= 90 ? '31-90' : '90+'
        }
      })
      .filter(bill => {
        // Search filter
        const searchMatch = !searchTerm || 
          bill.id?.toString().includes(searchTerm) ||
          bill.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bill.mobile?.includes(searchTerm)
        
        // Age filter
        const ageMatch = ageFilter === 'all' || bill.ageCategory === ageFilter
        
        return searchMatch && ageMatch
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'amount':
            return b.pendingAmount - a.pendingAmount
          case 'date':
            return new Date(b.billing_date).getTime() - new Date(a.billing_date).getTime()
          case 'age':
            return b.ageInDays - a.ageInDays
          default:
            return 0
        }
      })
  }, [billings, searchTerm, ageFilter, sortBy])

  // Summary statistics
  const summary = useMemo(() => {
    const totalPending = pendingBills.reduce((sum, bill) => sum + bill.pendingAmount, 0)
    const ageBuckets = {
      '0-7': pendingBills.filter(b => b.ageCategory === '0-7'),
      '8-30': pendingBills.filter(b => b.ageCategory === '8-30'),
      '31-90': pendingBills.filter(b => b.ageCategory === '31-90'),
      '90+': pendingBills.filter(b => b.ageCategory === '90+')
    }
    
    return {
      totalCount: pendingBills.length,
      totalAmount: totalPending,
      ageBuckets
    }
  }, [pendingBills])

  const sendReminder = (bill: any, method: 'sms' | 'call' | 'email') => {
    // In a real app, this would trigger SMS/email/call
    const message = `Reminder: Outstanding bill payment of ${formatCurrency(bill.pendingAmount)} for Bill #${bill.id}`
    
    console.log(`Sending ${method} reminder to ${bill.first_name} ${bill.last_name}:`, message)
    alert(`${method.toUpperCase()} reminder sent to ${bill.first_name} ${bill.last_name}`)
  }

  const getUrgencyColor = (ageInDays: number) => {
    if (ageInDays <= 7) return 'text-green-600 bg-green-100'
    if (ageInDays <= 30) return 'text-yellow-600 bg-yellow-100'
    if (ageInDays <= 90) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-red-600" />
        <h2 className="text-xl font-bold text-gray-900">Pending Bills</h2>
        <span className="text-sm text-gray-500">Outstanding payments & follow-ups</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-2xl font-bold text-red-600">{summary.totalCount}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Amount Due</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalAmount)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue (>30 days)</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary.ageBuckets['31-90'].length + summary.ageBuckets['90+'].length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical (>90 days)</p>
              <p className="text-2xl font-bold text-red-700">{summary.ageBuckets['90+'].length}</p>
            </div>
            <Calendar className="w-8 h-8 text-red-700" />
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Age Filter */}
          <div>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Ages</option>
              <option value="0-7">0-7 days</option>
              <option value="8-30">8-30 days</option>
              <option value="31-90">31-90 days</option>
              <option value="90+">90+ days</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="amount">Sort by Amount</option>
              <option value="date">Sort by Date</option>
              <option value="age">Sort by Age</option>
            </select>
          </div>

          {/* Age Distribution */}
          <div className="text-sm">
            <div className="font-medium text-gray-700 mb-2">Age Distribution</div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-green-600">0-7 days:</span>
                <span className="font-medium">{summary.ageBuckets['0-7'].length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-yellow-600">8-30 days:</span>
                <span className="font-medium">{summary.ageBuckets['8-30'].length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">31-90 days:</span>
                <span className="font-medium">{summary.ageBuckets['31-90'].length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-600">90+ days:</span>
                <span className="font-medium">{summary.ageBuckets['90+'].length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Bills List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Bills ({pendingBills.length})
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))
          ) : pendingBills.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending bills found</h3>
              <p className="text-gray-500">All bills are paid or no bills match your filters</p>
            </div>
          ) : (
            pendingBills.map((bill) => (
              <div key={bill.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {bill.first_name} {bill.last_name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(bill.ageInDays)}`}>
                        {bill.ageInDays} days old
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>Bill #: <span className="font-medium">{bill.id}</span></div>
                      <div>Patient ID: <span className="font-medium">{bill.patient_id}</span></div>
                      <div>Mobile: <span className="font-medium">{bill.mobile}</span></div>
                      <div>Bill Date: <span className="font-medium">{formatDate(bill.billing_date)}</span></div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-gray-600">
                        Total: <span className="font-medium">{formatCurrency(parseFloat(bill.total_amount) || 0)}</span>
                      </div>
                      <div className="text-gray-600">
                        Paid: <span className="font-medium text-green-600">{formatCurrency(parseFloat(bill.paid_amount) || 0)}</span>
                      </div>
                      <div className="text-red-600">
                        Pending: <span className="font-bold">{formatCurrency(bill.pendingAmount)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="text-right mb-2">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(bill.pendingAmount)}
                      </div>
                      <div className="text-xs text-gray-500">Outstanding</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => sendReminder(bill, 'sms')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Send SMS Reminder"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => sendReminder(bill, 'call')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Make Call"
                      >
                        <Phone className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        onClick={() => sendReminder(bill, 'email')}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Send Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Payment Progress</span>
                    <span>
                      {Math.round((parseFloat(bill.paid_amount) || 0) / (parseFloat(bill.total_amount) || 1) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (parseFloat(bill.paid_amount) || 0) / (parseFloat(bill.total_amount) || 1) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}