'use client'
import { TestTube } from 'lucide-react'

export default function LabPage() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600"><TestTube className="w-5 h-5" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laboratory</h1>
          <p className="text-sm text-gray-500">Lab orders, results, and reports</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <TestTube className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Laboratory Module</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Lab data migration is in progress. This module will display lab test orders, results, sample tracking, and quality control once the data from the CakePHP system is fully migrated.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          Data migration in progress
        </div>
      </div>
    </div>
  )
}
