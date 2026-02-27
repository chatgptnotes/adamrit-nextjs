'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { Search, User, Phone, Calendar, MapPin, Eye, Edit } from 'lucide-react'
import Link from 'next/link'

interface Patient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  full_name: string
  age: number
  gender: string
  phone: string
  email: string
  address_line1: string
  city: string
  blood_group: string
  insurance_provider: string
  registration_date: string
  last_visit_date?: string
}

export default function PatientSearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [searchBy, setSearchBy] = useState<'all' | 'name' | 'id' | 'phone' | 'email'>('all')

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setPatients([])
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, searchBy])

  const performSearch = async () => {
    setLoading(true)
    try {
      let query = supabase.from('patients_full').select('*')

      switch (searchBy) {
        case 'name':
          query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
          break
        case 'id':
          query = query.ilike('patient_id', `%${searchTerm}%`)
          break
        case 'phone':
          query = query.ilike('phone', `%${searchTerm}%`)
          break
        case 'email':
          query = query.ilike('email', `%${searchTerm}%`)
          break
        default: // 'all'
          query = query.or(
            `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,patient_id.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
          )
      }

      const { data } = await query.order('registration_date', { ascending: false }).limit(20)
      setPatients(data || [])
    } catch (error) {
      console.error('Error searching patients:', error)
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const highlightMatch = (text: string, term: string) => {
    if (!term) return text
    const regex = new RegExp(`(${term})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Search</h1>
          <p className="text-sm text-gray-500">Find patients by name, ID, phone, or email</p>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Term</label>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter patient name, ID, phone number, or email..."
                autoFocus
              />
            </div>
          </div>

          <div className="md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search By</label>
            <select
              value={searchBy}
              onChange={(e) => setSearchBy(e.target.value as any)}
              className="w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Fields</option>
              <option value="name">Name</option>
              <option value="id">Patient ID</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
          </div>
        </div>

        {searchTerm.length > 0 && searchTerm.length < 2 && (
          <div className="mt-4 text-sm text-gray-500">
            Please enter at least 2 characters to search
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <div className="text-gray-500">Searching patients...</div>
        </div>
      )}

      {/* Search Results */}
      {!loading && patients.length > 0 && (
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-900">Search Results</h3>
            <p className="text-sm text-gray-500">Found {patients.length} patients matching "{searchTerm}"</p>
          </div>

          <div className="divide-y divide-gray-200">
            {patients.map((patient) => (
              <div key={patient.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div 
                          className="font-semibold text-lg text-gray-900"
                          dangerouslySetInnerHTML={{ __html: highlightMatch(`${patient.first_name} ${patient.last_name}`, searchTerm) }}
                        />
                        <div className="text-sm text-gray-500">
                          <span 
                            dangerouslySetInnerHTML={{ __html: highlightMatch(`ID: ${patient.patient_id}`, searchTerm) }}
                          />
                          <span className="mx-2">•</span>
                          {patient.gender}
                          {patient.age && <span>, {patient.age} years</span>}
                          {patient.blood_group && <span className="mx-2">•</span>}
                          {patient.blood_group && <span>Blood: {patient.blood_group}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span 
                          dangerouslySetInnerHTML={{ __html: highlightMatch(patient.phone || 'N/A', searchTerm) }}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {patient.address_line1 ? `${patient.address_line1}, ${patient.city}` : 'Address not available'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          Registered: {formatDate(patient.registration_date)}
                        </span>
                      </div>
                    </div>

                    {patient.email && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Email: </span>
                        <span 
                          className="text-gray-600"
                          dangerouslySetInnerHTML={{ __html: highlightMatch(patient.email, searchTerm) }}
                        />
                      </div>
                    )}

                    {patient.insurance_provider && (
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {patient.insurance_provider}
                        </span>
                      </div>
                    )}

                    {patient.last_visit_date && (
                      <div className="mt-2 text-sm text-gray-500">
                        Last visit: {formatDate(patient.last_visit_date)}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">View</span>
                    </Link>
                    
                    <Link
                      href={`/patients/${patient.id}/edit`}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && searchTerm.length >= 2 && patients.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <div className="text-lg font-medium text-gray-900 mb-2">No patients found</div>
          <div className="text-gray-500 mb-6">
            No patients match your search criteria "{searchTerm}".
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Search
            </button>
            <Link
              href="/patients/new"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Register New Patient
            </Link>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!loading && searchTerm.length < 2 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <div className="text-lg font-medium text-gray-900 mb-2">Search for Patients</div>
          <div className="text-gray-500 mb-6">
            Enter a patient's name, ID, phone number, or email to find their records instantly.
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-md mx-auto">
            <button
              onClick={() => { setSearchBy('name'); document.querySelector('input')?.focus() }}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <User className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <div className="text-xs text-gray-600">Name</div>
            </button>
            
            <button
              onClick={() => { setSearchBy('id'); document.querySelector('input')?.focus() }}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Search className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <div className="text-xs text-gray-600">Patient ID</div>
            </button>
            
            <button
              onClick={() => { setSearchBy('phone'); document.querySelector('input')?.focus() }}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Phone className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <div className="text-xs text-gray-600">Phone</div>
            </button>
            
            <button
              onClick={() => { setSearchBy('email'); document.querySelector('input')?.focus() }}
              className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <div className="text-xs text-gray-600">Email</div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}