'use client'
import { useState, useMemo } from 'react'
import { useWardPatients, useDoctors, useWards } from '@/hooks/useSupabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { CreditCard, Calendar, User, Bed, Calculator, Receipt, Plus } from 'lucide-react'

interface IPDCharge {
  id: string
  date: string
  category: 'bed' | 'nursing' | 'doctor' | 'surgery' | 'pharmacy' | 'lab' | 'radiology' | 'other'
  description: string
  amount: number
  quantity: number
}

export default function IPDBillingPage() {
  const { data: wardPatients } = useWardPatients()
  const { data: doctors } = useDoctors()
  const { data: wards } = useWards()
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [charges, setCharges] = useState<IPDCharge[]>([])
  const [newCharge, setNewCharge] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'other' as IPDCharge['category'],
    description: '',
    amount: '',
    quantity: '1'
  })

  // IPD charge rates (can be moved to a config/database later)
  const chargeRates = {
    general_bed: 800,
    private_bed: 1500,
    icu_bed: 3000,
    nursing_general: 300,
    nursing_icu: 500,
    doctor_visit: 500,
    consultation: 800
  }

  // Filter admitted patients only
  const admittedPatients = wardPatients.filter(p => !p.out_date)

  // Calculate stay duration for selected patient
  const stayDuration = useMemo(() => {
    if (!selectedPatient?.in_date) return 0
    const inDate = new Date(selectedPatient.in_date)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - inDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }, [selectedPatient])

  // Auto-generate bed charges based on stay duration
  const generateBedCharges = () => {
    if (!selectedPatient || !selectedPatient.in_date) return

    const wardName = selectedPatient.ward_name?.toLowerCase() || 'general'
    let bedRate = chargeRates.general_bed
    
    if (wardName.includes('icu')) bedRate = chargeRates.icu_bed
    else if (wardName.includes('private') || wardName.includes('delux')) bedRate = chargeRates.private_bed

    // Generate daily bed charges
    const bedCharges: IPDCharge[] = []
    const inDate = new Date(selectedPatient.in_date)
    
    for (let i = 0; i < stayDuration; i++) {
      const chargeDate = new Date(inDate)
      chargeDate.setDate(chargeDate.getDate() + i)
      
      bedCharges.push({
        id: `bed_${i}_${Date.now()}`,
        date: chargeDate.toISOString().split('T')[0],
        category: 'bed',
        description: `${selectedPatient.ward_name} Bed Charges`,
        amount: bedRate,
        quantity: 1
      })
    }

    // Generate nursing charges
    const nursingRate = wardName.includes('icu') ? chargeRates.nursing_icu : chargeRates.nursing_general
    for (let i = 0; i < stayDuration; i++) {
      const chargeDate = new Date(inDate)
      chargeDate.setDate(chargeDate.getDate() + i)
      
      bedCharges.push({
        id: `nursing_${i}_${Date.now()}`,
        date: chargeDate.toISOString().split('T')[0],
        category: 'nursing',
        description: `Nursing Charges`,
        amount: nursingRate,
        quantity: 1
      })
    }

    setCharges(prevCharges => [...prevCharges, ...bedCharges])
  }

  const addCharge = () => {
    if (!newCharge.description || !newCharge.amount) return

    const charge: IPDCharge = {
      id: Date.now().toString(),
      date: newCharge.date,
      category: newCharge.category,
      description: newCharge.description,
      amount: parseFloat(newCharge.amount),
      quantity: parseInt(newCharge.quantity)
    }

    setCharges([...charges, charge])
    setNewCharge({
      date: new Date().toISOString().split('T')[0],
      category: 'other',
      description: '',
      amount: '',
      quantity: '1'
    })
  }

  const removeCharge = (id: string) => {
    setCharges(charges.filter(c => c.id !== id))
  }

  // Calculate totals by category
  const categoryTotals = useMemo(() => {
    const totals = charges.reduce((acc, charge) => {
      const category = charge.category
      if (!acc[category]) acc[category] = 0
      acc[category] += charge.amount * charge.quantity
      return acc
    }, {} as Record<string, number>)
    
    return totals
  }, [charges])

  const totalAmount = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)

  const generateBill = () => {
    if (!selectedPatient || charges.length === 0) {
      alert('Please select a patient and add charges.')
      return
    }

    console.log('Generating IPD bill:', {
      patient: selectedPatient,
      charges,
      categoryTotals,
      totalAmount,
      stayDuration,
      type: 'IPD'
    })
    
    alert(`IPD Bill generated successfully! Total: ${formatCurrency(totalAmount)}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-900">IPD Billing</h2>
        <span className="text-sm text-gray-500">Comprehensive inpatient billing</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Selection */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Admitted Patient</h3>
            
            {selectedPatient ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </h4>
                      <p className="text-sm text-gray-600">ID: {selectedPatient.patient_id}</p>
                      <p className="text-sm text-gray-600">Mobile: {selectedPatient.mobile}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        <Bed className="w-4 h-4 inline mr-1" />
                        Ward: {selectedPatient.ward_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Admitted: {formatDate(selectedPatient.in_date)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Duration: {stayDuration} days
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedPatient(null)
                      setCharges([])
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Change
                  </button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <button
                    onClick={generateBedCharges}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Calculator className="w-4 h-4" />
                    Auto-Generate Bed & Nursing Charges
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {admittedPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          ID: {patient.patient_id} • Mobile: {patient.mobile}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          {patient.ward_name}
                        </div>
                        <div>Admitted: {formatDate(patient.in_date)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Charge Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Charge</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={newCharge.date}
                onChange={(e) => setNewCharge({...newCharge, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newCharge.category}
                onChange={(e) => setNewCharge({...newCharge, category: e.target.value as IPDCharge['category']})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="other">Other</option>
                <option value="bed">Bed Charges</option>
                <option value="nursing">Nursing</option>
                <option value="doctor">Doctor Fee</option>
                <option value="surgery">Surgery</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="lab">Laboratory</option>
                <option value="radiology">Radiology</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                placeholder="Charge description"
                value={newCharge.description}
                onChange={(e) => setNewCharge({...newCharge, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newCharge.amount}
                  onChange={(e) => setNewCharge({...newCharge, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={newCharge.quantity}
                  onChange={(e) => setNewCharge({...newCharge, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            <button
              onClick={addCharge}
              className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Charge
            </button>
          </div>
        </div>
      </div>

      {/* Charges List & Summary */}
      {charges.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Charges List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Charges Breakdown</h3>
            
            <div className="max-h-80 overflow-y-auto space-y-2">
              {charges.map((charge) => (
                <div key={charge.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium">{charge.description}</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(charge.date)} • {charge.category} • Qty: {charge.quantity}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatCurrency(charge.amount * charge.quantity)}</span>
                    <button
                      onClick={() => removeCharge(charge.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Summary</h3>
            
            <div className="space-y-3">
              {Object.entries(categoryTotals).map(([category, amount]) => (
                <div key={category} className="flex justify-between">
                  <span className="capitalize text-gray-600">{category}:</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-purple-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
            
            <button
              onClick={generateBill}
              className="w-full mt-6 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              Generate IPD Bill
            </button>
          </div>
        </div>
      )}
    </div>
  )
}