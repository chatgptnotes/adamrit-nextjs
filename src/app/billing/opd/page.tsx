'use client'
import { useState } from 'react'
import { usePatients, useDoctors } from '@/hooks/useSupabase'
import { formatCurrency } from '@/lib/utils'
import { Stethoscope, Search, Plus, Trash2, Calculator, Receipt } from 'lucide-react'

interface BillItem {
  id: string
  description: string
  amount: number
  category: 'registration' | 'consultation' | 'lab' | 'radiology' | 'pharmacy' | 'other'
}

export default function OPDBillingPage() {
  const { data: patients } = usePatients()
  const { data: doctors } = useDoctors()
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [billItems, setBillItems] = useState<BillItem[]>([])
  const [newItem, setNewItem] = useState({ description: '', amount: '', category: 'other' as BillItem['category'] })
  const [paymentMode, setPaymentMode] = useState('cash')
  const [location, setLocation] = useState('1') // 1=Hope, 2=Ayushman

  // Pre-defined OPD charges
  const predefinedCharges = {
    registration: { description: 'Registration Charges', amount: 100 },
    consultation: { description: 'Consultation Fee', amount: 500 },
    lab_basic: { description: 'Basic Lab Tests', amount: 300 },
    lab_advanced: { description: 'Advanced Lab Tests', amount: 800 },
    xray: { description: 'X-Ray', amount: 400 },
    ultrasound: { description: 'Ultrasound', amount: 800 },
    ecg: { description: 'ECG', amount: 200 },
    injection: { description: 'Injection Administration', amount: 150 },
    dressing: { description: 'Wound Dressing', amount: 200 }
  }

  const filteredPatients = patients.filter(p => 
    `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.mobile?.includes(patientSearch) ||
    p.id?.toString().includes(patientSearch)
  )

  const addPredefinedCharge = (key: string, charge: { description: string, amount: number }) => {
    const newBillItem: BillItem = {
      id: Date.now().toString(),
      description: charge.description,
      amount: charge.amount,
      category: key.startsWith('lab') ? 'lab' : key.startsWith('consultation') ? 'consultation' : key === 'registration' ? 'registration' : 'other'
    }
    setBillItems([...billItems, newBillItem])
  }

  const addCustomItem = () => {
    if (!newItem.description || !newItem.amount) return
    
    const billItem: BillItem = {
      id: Date.now().toString(),
      description: newItem.description,
      amount: parseFloat(newItem.amount),
      category: newItem.category
    }
    setBillItems([...billItems, billItem])
    setNewItem({ description: '', amount: '', category: 'other' })
  }

  const removeItem = (id: string) => {
    setBillItems(billItems.filter(item => item.id !== id))
  }

  const totalAmount = billItems.reduce((sum, item) => sum + item.amount, 0)

  const generateBill = () => {
    if (!selectedPatient || billItems.length === 0) {
      alert('Please select a patient and add at least one item to the bill.')
      return
    }

    // Here you would normally save to database
    console.log('Generating bill:', {
      patient: selectedPatient,
      doctor: selectedDoctor,
      items: billItems,
      total: totalAmount,
      paymentMode,
      location,
      type: 'OPD'
    })
    
    alert(`Bill generated successfully! Total: ${formatCurrency(totalAmount)}`)
    
    // Reset form
    setSelectedPatient(null)
    setSelectedDoctor(null)
    setBillItems([])
    setPatientSearch('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Stethoscope className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">OPD Billing</h2>
        <span className="text-sm text-gray-500">Quick billing for outpatient services</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient & Doctor Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Select Patient</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, mobile, or ID..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedPatient ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
                    className="text-red-600 hover:text-red-800"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredPatients.slice(0, 10).map((patient) => (
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

          {/* Doctor Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Select Doctor (Optional)</h3>
            <select 
              value={selectedDoctor?.id || ''}
              onChange={(e) => {
                const doctor = doctors.find(d => d.id === parseInt(e.target.value))
                setSelectedDoctor(doctor)
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a doctor...</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.doctor_name} - {doctor.specialization}
                </option>
              ))}
            </select>
          </div>

          {/* Location Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Location</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="1"
                  checked={location === '1'}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-blue-600"
                />
                <span>Hope Hospital</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="2"
                  checked={location === '2'}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-blue-600"
                />
                <span>Ayushman Hospital</span>
              </label>
            </div>
          </div>
        </div>

        {/* Bill Items */}
        <div className="space-y-6">
          {/* Quick Add Common Charges */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add</h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(predefinedCharges).map(([key, charge]) => (
                <button
                  key={key}
                  onClick={() => addPredefinedCharge(key, charge)}
                  className="text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                >
                  <div className="font-medium">{charge.description}</div>
                  <div className="text-gray-600">{formatCurrency(charge.amount)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Item */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Custom Item</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Amount"
                value={newItem.amount}
                onChange={(e) => setNewItem({...newItem, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({...newItem, category: e.target.value as BillItem['category']})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="other">Other</option>
                <option value="consultation">Consultation</option>
                <option value="lab">Laboratory</option>
                <option value="radiology">Radiology</option>
                <option value="pharmacy">Pharmacy</option>
              </select>
              <button
                onClick={addCustomItem}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Items List */}
      {billItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Bill Items
          </h3>
          
          <div className="space-y-2">
            {billItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium">{item.description}</div>
                  <div className="text-sm text-gray-600 capitalize">{item.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(item.amount)}</span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-green-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Mode */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="insurance">Insurance</option>
              <option value="corporate">Corporate</option>
            </select>
          </div>

          {/* Generate Bill Button */}
          <div className="mt-6">
            <button
              onClick={generateBill}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-lg font-semibold"
            >
              <Receipt className="w-5 h-5" />
              Generate Bill & Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}