'use client'
import { forwardRef } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ReceiptData } from '@/lib/billing-actions'

interface PrintReceiptProps {
  receipt: ReceiptData
  type?: 'advance' | 'final'
}

const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(
  ({ receipt, type = 'final' }, ref) => {
    const isAdvance = type === 'advance'

    return (
      <div ref={ref} className="print-receipt">
        <style jsx>{`
          @media print {
            .print-receipt {
              width: 100%;
              max-width: none;
              margin: 0;
              padding: 20px;
              font-size: 12px;
              color: black;
              background: white;
            }
            .no-print {
              display: none !important;
            }
            .page-break {
              page-break-after: always;
            }
            body {
              margin: 0;
              -webkit-print-color-adjust: exact;
            }
          }
          
          .print-receipt {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 24px;
            font-family: 'Courier New', monospace;
          }
        `}</style>

        {/* Hospital Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {receipt.hospital_name}
          </h1>
          <p className="text-sm text-gray-600 mb-2">{receipt.hospital_address}</p>
          <p className="text-sm text-gray-600">
            Phone: +91-712-XXXXXXX | Email: info@hopehospital.com
          </p>
          <div className="mt-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {isAdvance ? 'ADVANCE PAYMENT RECEIPT' : 'FINAL BILL RECEIPT'}
            </h2>
          </div>
        </div>

        {/* Receipt Details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm">
              <strong>Receipt No:</strong> {receipt.bill_number}
            </p>
            <p className="text-sm">
              <strong>Patient:</strong> {receipt.patient_name}
            </p>
            <p className="text-sm">
              <strong>Date:</strong> {formatDate(receipt.billing_date)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm">
              <strong>Payment Mode:</strong> {receipt.payment_mode}
            </p>
            <p className="text-sm">
              <strong>Time:</strong> {new Date().toLocaleTimeString()}
            </p>
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <p className="text-xs text-gray-600">Receipt ID: {receipt.id}</p>
            </div>
          </div>
        </div>

        {/* Charges Table */}
        {receipt.charges_breakdown && !isAdvance && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">
              CHARGES BREAKDOWN
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2">Description</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {receipt.charges_breakdown.wardCharges > 0 && (
                  <tr>
                    <td className="py-1">Ward Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.wardCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.nursingCharges > 0 && (
                  <tr>
                    <td className="py-1">Nursing Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.nursingCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.doctorCharges > 0 && (
                  <tr>
                    <td className="py-1">Doctor Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.doctorCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.labCharges > 0 && (
                  <tr>
                    <td className="py-1">Laboratory Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.labCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.radiologyCharges > 0 && (
                  <tr>
                    <td className="py-1">Radiology Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.radiologyCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.pharmacyCharges > 0 && (
                  <tr>
                    <td className="py-1">Pharmacy Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.pharmacyCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.surgeryCharges > 0 && (
                  <tr>
                    <td className="py-1">Surgery Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.surgeryCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.anesthesiaCharges > 0 && (
                  <tr>
                    <td className="py-1">Anesthesia Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.anesthesiaCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.otherCharges > 0 && (
                  <tr>
                    <td className="py-1">Other Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.otherCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.registrationCharges > 0 && (
                  <tr>
                    <td className="py-1">Registration Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.registrationCharges)}</td>
                  </tr>
                )}
                {receipt.charges_breakdown.consultantCharges > 0 && (
                  <tr>
                    <td className="py-1">Consultant Charges</td>
                    <td className="text-right">{formatCurrency(receipt.charges_breakdown.consultantCharges)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Summary */}
        <div className="border-t-2 border-gray-800 pt-4 mb-6">
          <table className="w-full text-sm">
            <tbody>
              {!isAdvance && (
                <tr>
                  <td className="py-1 font-semibold">Total Amount</td>
                  <td className="text-right font-semibold">{formatCurrency(receipt.total_amount)}</td>
                </tr>
              )}
              <tr>
                <td className="py-1 font-semibold">Amount {isAdvance ? 'Paid' : 'Received'}</td>
                <td className="text-right font-semibold">{formatCurrency(receipt.paid_amount)}</td>
              </tr>
              {!isAdvance && receipt.total_amount !== receipt.paid_amount && (
                <tr>
                  <td className="py-1 text-red-600 font-semibold">Balance Due</td>
                  <td className="text-right text-red-600 font-semibold">
                    {formatCurrency(receipt.total_amount - receipt.paid_amount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Details */}
        <div className="mb-6">
          <h4 className="font-semibold mb-2">PAYMENT DETAILS</h4>
          <p className="text-sm">
            <strong>Mode:</strong> {receipt.payment_mode}
          </p>
          {receipt.paid_amount > 0 && (
            <p className="text-sm">
              <strong>Amount in Words:</strong> {numberToWords(receipt.paid_amount)} Rupees Only
            </p>
          )}
        </div>

        {/* QR Code Placeholder */}
        <div className="flex justify-between items-end mb-6">
          <div className="flex-1">
            <h4 className="font-semibold mb-2">DIGITAL PAYMENT</h4>
            <div className="w-24 h-24 border-2 border-gray-300 flex items-center justify-center bg-gray-50">
              <span className="text-xs text-gray-500 text-center">QR Code<br/>Placeholder</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">Scan to pay digitally</p>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <p className="text-xs text-gray-600">Authorized Signatory</p>
              <div className="border-b border-gray-400 w-32 mt-8"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4">
          <div className="text-xs text-gray-600 text-center">
            <p className="mb-1">Thank you for choosing {receipt.hospital_name}</p>
            <p className="mb-1">
              For queries, contact: accounts@hopehospital.com | +91-712-XXXXXXX
            </p>
            <p>This is a computer generated receipt.</p>
          </div>
        </div>

        {/* Print Info */}
        <div className="text-xs text-gray-500 text-center mt-4 no-print">
          <p>Generated on: {new Date().toLocaleString()}</p>
          <p>Print this receipt for your records</p>
        </div>
      </div>
    )
  }
)

PrintReceipt.displayName = 'PrintReceipt'

// Helper function to convert number to words (simplified)
function numberToWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]
  
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ]
  
  if (amount === 0) return 'Zero'
  if (amount < 0) return 'Negative ' + numberToWords(Math.abs(amount))
  
  let words = ''
  
  if (amount >= 10000000) {
    words += numberToWords(Math.floor(amount / 10000000)) + ' Crore '
    amount %= 10000000
  }
  
  if (amount >= 100000) {
    words += numberToWords(Math.floor(amount / 100000)) + ' Lakh '
    amount %= 100000
  }
  
  if (amount >= 1000) {
    words += numberToWords(Math.floor(amount / 1000)) + ' Thousand '
    amount %= 1000
  }
  
  if (amount >= 100) {
    words += numberToWords(Math.floor(amount / 100)) + ' Hundred '
    amount %= 100
  }
  
  if (amount >= 20) {
    words += tens[Math.floor(amount / 10)]
    if (amount % 10 !== 0) {
      words += ' ' + ones[amount % 10]
    }
  } else if (amount > 0) {
    words += ones[amount]
  }
  
  return words.trim()
}

export default PrintReceipt