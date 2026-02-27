'use client'
// @ts-nocheck

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { supabaseProd as supabase } from '@/lib/supabase-prod'
import { QrCode, User, Printer, Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Patient {
  id: number
  patient_id: string
  first_name: string
  last_name: string
  age: number
  gender: string
  phone: string
  blood_group: string
  emergency_contact_name: string
  emergency_contact_phone: string
  registration_date: string
}

function PatientQRCardInner() {
  const searchParams = useSearchParams()
  const patientIdParam = searchParams.get('patient')
  
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  useEffect(() => {
    if (patientIdParam) {
      fetchPatient(patientIdParam)
    }
  }, [patientIdParam])

  useEffect(() => {
    if (patient) {
      generateQRCode()
    }
  }, [patient])

  const fetchPatient = async (id: string) => {
    try {
      const { data } = await supabase
        .from('patients_full')
        .select('*')
        .eq('id', id)
        .single()
      
      if (data) {
        setPatient(data)
      }
    } catch (error) {
      console.error('Error fetching patient:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    if (!patient) return

    try {
      // Generate QR code data
      const qrData = {
        id: patient.patient_id,
        name: `${patient.first_name} ${patient.last_name}`,
        phone: patient.phone,
        emergency: patient.emergency_contact_phone,
        blood: patient.blood_group,
        hospital: 'Hope Hospital, Nagpur'
      }

      // In a real implementation, you'd use a QR code library like qrcode
      // For now, we'll use a placeholder QR code service
      const qrString = JSON.stringify(qrData)
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrString)}`
      setQrCodeDataUrl(qrCodeUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Create a downloadable image
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx || !patient) return

    canvas.width = 350
    canvas.height = 550

    // Set background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add content
    ctx.fillStyle = '#000'
    ctx.font = 'bold 20px Arial'
    ctx.fillText('Hope Hospital', 20, 40)
    
    ctx.font = '16px Arial'
    ctx.fillText('Patient ID Card', 20, 70)
    
    ctx.font = 'bold 18px Arial'
    ctx.fillText(`${patient.first_name} ${patient.last_name}`, 20, 120)
    
    ctx.font = '14px Arial'
    ctx.fillText(`ID: ${patient.patient_id}`, 20, 150)
    ctx.fillText(`Age: ${patient.age} • ${patient.gender}`, 20, 175)
    ctx.fillText(`Blood: ${patient.blood_group || 'N/A'}`, 20, 200)
    ctx.fillText(`Phone: ${patient.phone}`, 20, 225)
    
    if (patient.emergency_contact_phone) {
      ctx.fillText(`Emergency: ${patient.emergency_contact_phone}`, 20, 250)
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `patient-card-${patient.patient_id}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    })
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading patient data...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <div className="text-lg font-medium text-gray-900 mb-2">Patient not found</div>
        <div className="text-gray-500">Unable to generate QR card</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header - Hidden in print */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/patients" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back to Patients
          </Link>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* QR Card */}
      <div className="max-w-md mx-auto">
        <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg print:shadow-none print:border-2 print:border-black">
          {/* Hospital Header */}
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-emerald-600 mb-1">Hope Hospital</div>
            <div className="text-sm text-gray-600">Patient Identification Card</div>
            <div className="text-xs text-gray-500">Nagpur, Maharashtra</div>
          </div>

          {/* Patient Photo Placeholder */}
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-gray-400" />
          </div>

          {/* Patient Information */}
          <div className="text-center mb-6">
            <div className="text-xl font-bold text-gray-900 mb-2">
              {patient.first_name} {patient.last_name}
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              <div><strong>Patient ID:</strong> {patient.patient_id}</div>
              <div><strong>Age:</strong> {patient.age} years • <strong>Gender:</strong> {patient.gender}</div>
              <div><strong>Blood Group:</strong> {patient.blood_group || 'N/A'}</div>
              <div><strong>Phone:</strong> {patient.phone}</div>
              {patient.emergency_contact_phone && (
                <div><strong>Emergency:</strong> {patient.emergency_contact_phone}</div>
              )}
              <div><strong>Reg. Date:</strong> {new Date(patient.registration_date).toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center mb-4">
            {qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="Patient QR Code" 
                className="w-40 h-40 mx-auto border rounded-lg"
              />
            ) : (
              <div className="w-40 h-40 mx-auto border rounded-lg flex items-center justify-center bg-gray-50">
                <QrCode className="w-16 h-16 text-gray-300" />
              </div>
            )}
            <div className="text-xs text-gray-500 mt-2">
              Scan for patient information
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-gray-500 text-center border-t pt-4">
            <div className="mb-2">
              <strong>Important:</strong> Please carry this card during hospital visits
            </div>
            <div>
              For emergencies: {patient.emergency_contact_phone || 'Contact hospital directly'}
            </div>
          </div>

          {/* Card Footer */}
          <div className="text-center mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500">
              Valid at Hope Hospital, Nagpur
            </div>
            <div className="text-xs text-gray-400">
              Generated on: {new Date().toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        {/* Card Back */}
        <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg mt-8 print:shadow-none print:border-2 print:border-black print:mt-4">
          <div className="text-center mb-4">
            <div className="text-lg font-bold text-gray-900">Emergency Information</div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-gray-900">Emergency Contact:</div>
              <div className="text-gray-600">
                {patient.emergency_contact_name || 'Not specified'}
                {patient.emergency_contact_phone && (
                  <span> - {patient.emergency_contact_phone}</span>
                )}
              </div>
            </div>

            <div>
              <div className="font-semibold text-gray-900">Hospital Contact:</div>
              <div className="text-gray-600">
                Hope Hospital<br />
                Emergency: +91-712-XXXXXXX<br />
                Reception: +91-712-XXXXXXX
              </div>
            </div>

            <div>
              <div className="font-semibold text-gray-900">Address:</div>
              <div className="text-gray-600">
                Hope Hospital<br />
                Nagpur, Maharashtra<br />
                India
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <div className="text-xs text-gray-500">
              In case of emergency, present this card to medical staff
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 0.5in;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-2 {
            border-width: 2px !important;
          }
          
          .print\\:border-black {
            border-color: black !important;
          }
          
          .print\\:mt-4 {
            margin-top: 1rem !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function PatientQRCard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>}>
      <PatientQRCardInner />
    </Suspense>
  )
}
