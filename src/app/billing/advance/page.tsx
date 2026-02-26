'use client'
import { useState } from 'react'
import { usePatients } from '@/hooks/useSupabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Banknote, Search, Receipt, CreditCard, User, Calendar, FileText } from 'lucide-react'

interface Advance {
  id: string
  patient_id: number
  patient_name: string
  amount: number
  payment_mode: string
  collected_date: string
  purpose: string
  receipt_number: string
  status: 'collected' | 'adjusted' | 'refunded'
}

export default function AdvancePaymentPage() {
  const { data: patients } = usePatients()
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [advanceData, setAdvanceData] = useState({
    amount: '',
    purpose: 'surgery',
    payment_mode: 'cash',
    notes: ''
  })
  const [isCollecting, setIsCollecting] = useState(false)
  const [recentAdvances, setRecentAdvances] = useState<Advance[]>([
    // Mock data - in real app, this would come from Supabase
    {
      id: '1',
      patient_id: 123,
      patient_name: 'John Doe',
      amount: 25000,
      payment_mode: 'cash',
      collected_date: '2024-02-26',
      purpose: 'surgery',
      receipt_number: 'ADV-2024-001',
      status: 'collected'
    },
    {
      id: '2',
      patient_id: 124,
      patient_name: 'Jane Smith',
      amount: 15000,
      payment_mode: 'card',
      collected_date: '2024-02-25',
      purpose: 'ipd_admission',
      receipt_number: 'ADV-2024-002',
      status: 'adjusted'
    }
  ])

  const filteredPatients = patients.filter(p => 
    `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mobile?.includes(patientSearch) ||
    p.id?.toString().includes(patientSearch)
  )

  const collectAdvance = async () => {
    if (!selectedPatient || !advanceData.amount) {
      alert('Please select a patient and enter advance amount')
      return
    }

    setIsCollecting(true)
    
    try {
      // Generate receipt number
      const receiptNumber = `ADV-${new Date().getFullYear()}-${String(recentAdvances.length + 1).padStart(3, '0')}`
      
      const advance: Advance = {
        id: Date.now().toString(),
        patient_id: selectedPatient.id,
        patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
        amount: parseFloat(advanceData.amount),
        payment_mode: advanceData.payment_mode,
        collected_date: new Date().toISOString().split('T')[0],
        purpose: advanceData.purpose,
        receipt_number: receiptNumber,
        status: 'collected'
      }

      // In real app, save to Supabase
      console.log('Collecting advance:', advance)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Add to recent advances
      setRecentAdvances([advance, ...recentAdvances])
      
      alert(`Advance collected successfully!\nReceipt Number: ${receiptNumber}\nAmount: ${formatCurrency(advance.amount)}`)
      
      // Reset form
      setSelectedPatient(null)
      setAdvanceData({
        amount: '',
        purpose: 'surgery',
        payment_mode: 'cash',
        notes: ''
      })
      setPatientSearch('')
      
    } catch (error) {
      alert('Error collecting advance. Please try again.')
    } finally {
      setIsCollecting(false)
    }
  }

  const printReceipt = (advance: Advance) => {
    // Generate a printable receipt
    const receiptWindow = window.open('', '_blank')
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Advance Payment Receipt</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #000; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin: 5px 0; }
              .amount { font-size: 18px; font-weight: bold; }
              @media print {
                body { margin: 0; }
                .receipt { border: none; box-shadow: none; }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h2>ADVANCE PAYMENT RECEIPT</h2>
                <p>Hope Hospital / Ayushman Hospital</p>
                <p>Nagpur</p>
              </div>
              
              <div class="row">
                <span>Receipt No:</span>
                <strong>${advance.receipt_number}</strong>
              </div>
              <div class="row">
                <span>Date:</span>
                <span>${formatDate(advance.collected_date)}</span>
              </div>
              <div class="row">
                <span>Patient ID:</span>
                <span>${advance.patient_id}</span>
              </div>
              <div class="row">
                <span>Patient Name:</span>
                <span>${advance.patient_name}</span>
              </div>
              <div class="row">
                <span>Purpose:</span>
                <span>${advance.purpose.replace('_', ' ').toUpperCase()}</span>
              </div>
              <div class="row">
                <span>Payment Mode:</span>
                <span>${advance.payment_mode.toUpperCase()}</span>
              </div>
              
              <hr>
              
              <div class="row amount">
                <span>Amount Received:</span>
                <span>${formatCurrency(advance.amount)}</span>
              </div>
              
              <hr>
              
              <div style="margin-top: 30px; text-align: center;">
                <p>Authorized Signature</p>
                <br><br>
                <p>________________________</p>
              </div>
              
              <div style="margin-top: 20px; text-align: center; font-size: 12px;">
                <p>This is a computer generated receipt</p>
              </div>
            </div>
            
            <script>
              window.print();
              setTimeout(() => window.close(), 1000);
            </script>
          </body>
        </html>
      `)
      receiptWindow.document.close()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Banknote className="w-6 h-6 text-yellow-600" />
        <h2 className="text-xl font-bold text-gray-900">Advance Payment</h2>
        <span className="text-sm text-gray-500">Collect patient advances & track payments</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Advance Collection Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Collect New Advance
          </h3>

          {/* Patient Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Select Patient
            </label>
            
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient by name, mobile, or ID..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            {selectedPatient ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h4>
                    <p className="text-sm text-gray-600">ID: {selectedPatient.id}</p>
                    <p className="text-sm text-gray-600">Mobile: {selectedPatient.mobile}</p>
                    <p className="text-sm text-gray-600">Age: {selectedPatient.age || 'N/A'}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedPatient(null)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredPatients.slice(0, 8).map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      ID: {patient.id} • Mobile: {patient.mobile}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advance Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advance Amount *
              </label>
              <input
                type="number"
                placeholder="Enter amount"
                value={advanceData.amount}
                onChange={(e) => setAdvanceData({...advanceData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Purpose
              </label>
              <select
                value={advanceData.purpose}
                onChange={(e) => setAdvanceData({...advanceData, purpose: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="surgery">Surgery</option>
                <option value="ipd_admission">IPD Admission</option>
                <option value="treatment">Treatment</option>
                <option value="investigation">Investigation</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'cash', label: 'Cash', icon: '💵' },
                  { value: 'card', label: 'Card', icon: '💳' },
                  { value: 'upi', label: 'UPI', icon: '📱' },
                  { value: 'cheque', label: 'Cheque', icon: '📄' }
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setAdvanceData({...advanceData, payment_mode: mode.value})}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      advanceData.payment_mode === mode.value 
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg mb-1">{mode.icon}</div>
                    <div className="font-medium text-sm">{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Additional notes..."
                value={advanceData.notes}
                onChange={(e) => setAdvanceData({...advanceData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <button
              onClick={collectAdvance}
              disabled={isCollecting || !selectedPatient || !advanceData.amount}
              className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2 text-lg font-semibold"
            >
              {isCollecting ? (
                <>
                  <Calendar className="w-5 h-5 animate-pulse" />
                  Collecting Advance...
                </>
              ) : (
                <>
                  <Banknote className="w-5 h-5" />
                  Collect Advance & Print Receipt
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent Advances */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Recent Advances
          </h3>

          <div className="space-y-3">
            {recentAdvances.map((advance) => (
              <div key={advance.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{advance.patient_name}</h4>
                    <p className="text-sm text-gray-600">ID: {advance.patient_id}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-green-600">
                      {formatCurrency(advance.amount)}
                    </div>
                    <div className="text-xs text-gray-500">{advance.receipt_number}</div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                  <span>Purpose: {advance.purpose.replace('_', ' ')}</span>
                  <span>Mode: {advance.payment_mode.toUpperCase()}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{formatDate(advance.collected_date)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      advance.status === 'collected' ? 'bg-green-100 text-green-700' :
                      advance.status === 'adjusted' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {advance.status.charAt(0).toUpperCase() + advance.status.slice(1)}
                    </span>
                    <button
                      onClick={() => printReceipt(advance)}
                      className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                    >
                      <Receipt className="w-3 h-3" />
                      Print
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {recentAdvances.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Banknote className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent advances found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}