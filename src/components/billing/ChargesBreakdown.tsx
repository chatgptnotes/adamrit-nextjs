'use client'
import { useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import { BillBreakdown } from '@/lib/billing-engine'

interface ChargesBreakdownProps {
  breakdown: BillBreakdown | null
  loading?: boolean
  showAdvance?: boolean
  advanceAmount?: number
  discount?: number
}

export default function ChargesBreakdown({ 
  breakdown, 
  loading = false,
  showAdvance = false,
  advanceAmount = 0,
  discount = 0
}: ChargesBreakdownProps) {
  const chargeCategories = useMemo(() => {
    if (!breakdown) return []

    return [
      { label: 'Ward Charges', amount: breakdown.wardCharges, icon: '🏥' },
      { label: 'Nursing Charges', amount: breakdown.nursingCharges, icon: '👩‍⚕️' },
      { label: 'Doctor Charges', amount: breakdown.doctorCharges, icon: '👨‍⚕️' },
      { label: 'Registration Charges', amount: breakdown.registrationCharges, icon: '📋' },
      { label: 'Consultant Charges', amount: breakdown.consultantCharges, icon: '🩺' },
      { label: 'Laboratory Charges', amount: breakdown.labCharges, icon: '🧪' },
      { label: 'Radiology Charges', amount: breakdown.radiologyCharges, icon: '📷' },
      { label: 'Pharmacy Charges', amount: breakdown.pharmacyCharges, icon: '💊' },
      { label: 'Surgery Charges', amount: breakdown.surgeryCharges, icon: '⚕️' },
      { label: 'Anesthesia Charges', amount: breakdown.anesthesiaCharges, icon: '💉' },
      { label: 'Other Charges', amount: breakdown.otherCharges, icon: '📝' }
    ].filter(charge => charge.amount > 0)
  }, [breakdown])

  const netPayable = useMemo(() => {
    if (!breakdown) return 0
    return Math.max(0, breakdown.totalCharges - advanceAmount - discount)
  }, [breakdown, advanceAmount, discount])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Charges Breakdown</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!breakdown) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Charges Breakdown</h3>
        <p className="text-gray-500 text-center py-8">No charges data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        📊 Charges Breakdown
      </h3>
      
      <div className="space-y-3">
        {chargeCategories.map((charge, index) => (
          <div 
            key={index}
            className="flex justify-between items-center py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{charge.icon}</span>
              <span className="font-medium text-gray-700">{charge.label}</span>
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(charge.amount)}
            </span>
          </div>
        ))}
        
        {/* Subtotal */}
        <div className="border-t pt-3 mt-4">
          <div className="flex justify-between items-center py-2 px-3">
            <span className="font-semibold text-gray-800">Subtotal</span>
            <span className="font-bold text-gray-900 text-lg">
              {formatCurrency(breakdown.totalCharges)}
            </span>
          </div>
        </div>

        {/* Advance Payment */}
        {showAdvance && advanceAmount > 0 && (
          <div className="flex justify-between items-center py-2 px-3 text-green-700">
            <span className="font-medium">Advance Paid</span>
            <span className="font-semibold">
              - {formatCurrency(advanceAmount)}
            </span>
          </div>
        )}

        {/* Discount */}
        {discount > 0 && (
          <div className="flex justify-between items-center py-2 px-3 text-blue-700">
            <span className="font-medium">Discount</span>
            <span className="font-semibold">
              - {formatCurrency(discount)}
            </span>
          </div>
        )}

        {/* Net Payable */}
        {(showAdvance || discount > 0) && (
          <div className="border-t pt-3 mt-4">
            <div className="flex justify-between items-center py-3 px-3 bg-gray-50 rounded-lg">
              <span className="font-bold text-gray-800 text-lg">Net Payable</span>
              <span className="font-bold text-gray-900 text-xl">
                {formatCurrency(netPayable)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-lg font-bold text-gray-900">{chargeCategories.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Highest Charge</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(Math.max(...chargeCategories.map(c => c.amount)))}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Charge</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(breakdown.totalCharges / chargeCategories.length)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}