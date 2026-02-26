'use client'
import { Pill } from 'lucide-react'

export default function PharmacyPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-teal-50 rounded-lg text-teal-600"><Pill className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharmacy</h1>
          <p className="text-sm text-gray-500">Medicine inventory and dispensing</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Pharmacy Module</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Pharmacy data migration is in progress. This module will display medicine inventory, purchase orders, sales, and stock management once the data from the CakePHP system is fully migrated.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
          Data migration in progress
        </div>
      </div>
    </div>
  )
}
