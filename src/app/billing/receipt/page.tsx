'use client'
import { useState } from 'react'
import { useBillings } from '@/hooks/useSupabase'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Receipt, Search, Printer, Download, Eye, FileText } from 'lucide-react'

export default function ReceiptPage() {
  const { data: billings, loading } = useBillings()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  const filteredBillings = billings.filter(bill => 
    bill.id?.toString().includes(searchTerm) ||
    bill.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.mobile?.includes(searchTerm)
  )

  const printReceipt = (bill: any) => {
    const receiptWindow = window.open('', '_blank', 'width=800,height=600')
    if (receiptWindow) {
      const receiptHTML = generateReceiptHTML(bill)
      receiptWindow.document.write(receiptHTML)
      receiptWindow.document.close()
      receiptWindow.print()
    }
  }

  const downloadReceipt = (bill: any) => {
    const receiptHTML = generateReceiptHTML(bill)
    const blob = new Blob([receiptHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${bill.id}-${bill.first_name}-${bill.last_name}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateReceiptHTML = (bill: any) => {
    const location = bill.location_id === '2' ? 'Ayushman Hospital' : 'Hope Hospital'
    const paymentStatus = parseFloat(bill.total_amount || 0) <= parseFloat(bill.paid_amount || 0) ? 'PAID' : 'PARTIAL'
    const balance = parseFloat(bill.total_amount || 0) - parseFloat(bill.paid_amount || 0)

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bill.id}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #333;
              background: white;
            }
            
            .receipt {
              max-width: 400px;
              margin: 20px auto;
              border: 2px solid #000;
              background: white;
            }
            
            .header {
              background: #f8f9fa;
              padding: 15px;
              text-align: center;
              border-bottom: 1px solid #000;
            }
            
            .hospital-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .hospital-address {
              font-size: 11px;
              color: #666;
              margin-bottom: 10px;
            }
            
            .receipt-title {
              font-size: 16px;
              font-weight: bold;
              background: #000;
              color: white;
              padding: 5px;
              margin-top: 10px;
            }
            
            .content {
              padding: 15px;
            }
            
            .row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              padding: 2px 0;
            }
            
            .row.border-top {
              border-top: 1px solid #ddd;
              padding-top: 8px;
              margin-top: 8px;
            }
            
            .row.border-bottom {
              border-bottom: 1px solid #ddd;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            
            .label {
              font-weight: 500;
              color: #555;
            }
            
            .value {
              font-weight: 600;
              color: #333;
            }
            
            .amount {
              font-size: 16px;
              font-weight: bold;
              color: #000;
            }
            
            .status-paid {
              color: #22c55e;
              font-weight: bold;
            }
            
            .status-partial {
              color: #f59e0b;
              font-weight: bold;
            }
            
            .footer {
              padding: 15px;
              border-top: 1px solid #000;
              background: #f8f9fa;
            }
            
            .signature-section {
              margin-top: 30px;
              text-align: center;
            }
            
            .signature-line {
              border-top: 1px solid #333;
              width: 200px;
              margin: 20px auto 5px;
            }
            
            .footer-note {
              text-align: center;
              font-size: 10px;
              color: #666;
              margin-top: 15px;
              border-top: 1px dashed #ccc;
              padding-top: 10px;
            }
            
            @media print {
              body {
                margin: 0;
                font-size: 11px;
              }
              
              .receipt {
                border: 1px solid #000;
                margin: 0;
                max-width: none;
                width: 100%;
              }
              
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="hospital-name">${location}</div>
              <div class="hospital-address">
                Nagpur, Maharashtra<br>
                Ph: +91-XXX-XXX-XXXX | Email: info@hopehospital.in
              </div>
              <div class="receipt-title">PAYMENT RECEIPT</div>
            </div>
            
            <div class="content">
              <div class="row">
                <span class="label">Receipt No:</span>
                <span class="value">RCP-${bill.id}</span>
              </div>
              
              <div class="row">
                <span class="label">Date & Time:</span>
                <span class="value">${new Date().toLocaleString('en-IN')}</span>
              </div>
              
              <div class="row border-bottom">
                <span class="label">Bill Date:</span>
                <span class="value">${formatDate(bill.billing_date)}</span>
              </div>
              
              <div class="row">
                <span class="label">Patient ID:</span>
                <span class="value">${bill.patient_id || 'N/A'}</span>
              </div>
              
              <div class="row">
                <span class="label">Patient Name:</span>
                <span class="value">${bill.first_name || ''} ${bill.last_name || ''}</span>
              </div>
              
              <div class="row">
                <span class="label">Mobile:</span>
                <span class="value">${bill.mobile || 'N/A'}</span>
              </div>
              
              <div class="row border-bottom">
                <span class="label">Age:</span>
                <span class="value">${bill.age || 'N/A'}</span>
              </div>
              
              <div class="row">
                <span class="label">Bill Amount:</span>
                <span class="value amount">${formatCurrency(parseFloat(bill.total_amount) || 0)}</span>
              </div>
              
              <div class="row">
                <span class="label">Amount Paid:</span>
                <span class="value amount">${formatCurrency(parseFloat(bill.paid_amount) || 0)}</span>
              </div>
              
              ${balance > 0 ? `
                <div class="row">
                  <span class="label">Balance Due:</span>
                  <span class="value amount" style="color: #dc2626;">${formatCurrency(balance)}</span>
                </div>
              ` : ''}
              
              <div class="row border-top">
                <span class="label">Payment Status:</span>
                <span class="value ${paymentStatus === 'PAID' ? 'status-paid' : 'status-partial'}">${paymentStatus}</span>
              </div>
              
              <div class="row">
                <span class="label">Payment Mode:</span>
                <span class="value">Cash</span>
              </div>
            </div>
            
            <div class="footer">
              <div class="signature-section">
                <div>Authorized Signature</div>
                <div class="signature-line"></div>
                <div style="font-size: 10px; margin-top: 5px;">Cashier</div>
              </div>
              
              <div class="footer-note">
                <div>Thank you for choosing ${location}</div>
                <div style="margin-top: 5px;">
                  This is a computer generated receipt<br>
                  For queries: +91-XXX-XXX-XXXX
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  }

  const ReceiptPreview = ({ bill }: { bill: any }) => (
    <div className="bg-white border border-gray-300 rounded-lg p-4 max-w-md mx-auto">
      <div className="text-center mb-4 pb-4 border-b">
        <h3 className="font-bold text-lg">
          {bill.location_id === '2' ? 'Ayushman Hospital' : 'Hope Hospital'}
        </h3>
        <p className="text-sm text-gray-600">Nagpur, Maharashtra</p>
        <div className="bg-gray-900 text-white px-3 py-1 mt-2 inline-block">
          PAYMENT RECEIPT
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Receipt No:</span>
          <span className="font-medium">RCP-{bill.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Patient:</span>
          <span className="font-medium">{bill.first_name} {bill.last_name}</span>
        </div>
        <div className="flex justify-between">
          <span>Bill Date:</span>
          <span>{formatDate(bill.billing_date)}</span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span>Bill Amount:</span>
          <span className="font-bold">{formatCurrency(parseFloat(bill.total_amount) || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Amount Paid:</span>
          <span className="font-bold">{formatCurrency(parseFloat(bill.paid_amount) || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={`font-bold ${
            parseFloat(bill.total_amount || 0) <= parseFloat(bill.paid_amount || 0) 
              ? 'text-green-600' 
              : 'text-yellow-600'
          }`}>
            {parseFloat(bill.total_amount || 0) <= parseFloat(bill.paid_amount || 0) ? 'PAID' : 'PARTIAL'}
          </span>
        </div>
      </div>
      
      <div className="mt-6 text-center text-xs text-gray-500 border-t pt-3">
        This is a computer generated receipt
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Receipt className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900">Receipt Generation</h2>
        <span className="text-sm text-gray-500">Print-friendly receipts for all bills</span>
      </div>

      {!showPreview ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search & Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Find Bill</h3>
            
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Bill ID, Patient Name, or Mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="text-sm text-gray-600">
              <div className="flex justify-between mb-2">
                <span>Total Bills:</span>
                <span className="font-medium">{billings.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Search Results:</span>
                <span className="font-medium">{filteredBillings.length}</span>
              </div>
            </div>
          </div>

          {/* Bills List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Select Bill for Receipt</h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))
              ) : filteredBillings.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No bills found</p>
                  {searchTerm && <p className="text-sm">Try different search terms</p>}
                </div>
              ) : (
                filteredBillings.map((bill) => {
                  const isPaid = parseFloat(bill.total_amount || 0) <= parseFloat(bill.paid_amount || 0)
                  
                  return (
                    <div
                      key={bill.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedBill(bill)
                        setShowPreview(true)
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {bill.first_name} {bill.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Bill #{bill.id} • Patient ID: {bill.patient_id}
                          </p>
                          <p className="text-sm text-gray-600">
                            Mobile: {bill.mobile} • Date: {formatDate(bill.billing_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {formatCurrency(parseFloat(bill.total_amount) || 0)}
                          </div>
                          <div className={`text-sm font-medium ${
                            isPaid ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {isPaid ? 'PAID' : 'PARTIAL'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          Paid: {formatCurrency(parseFloat(bill.paid_amount) || 0)}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              printReceipt(bill)
                            }}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            <Printer className="w-4 h-4" />
                            <span className="text-sm">Print</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              downloadReceipt(bill)
                            }}
                            className="text-green-600 hover:text-green-800 flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            <span className="text-sm">Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Receipt Preview */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Receipt Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back to Bills
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Receipt Preview</h4>
              {selectedBill && <ReceiptPreview bill={selectedBill} />}
            </div>
            
            {/* Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="font-medium text-gray-900 mb-6">Actions</h4>
              
              <div className="space-y-4">
                <button
                  onClick={() => selectedBill && printReceipt(selectedBill)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Print Receipt
                </button>
                
                <button
                  onClick={() => selectedBill && downloadReceipt(selectedBill)}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download HTML
                </button>
                
                <div className="pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Bill Details</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Bill ID:</span>
                      <span className="font-medium">{selectedBill?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Patient:</span>
                      <span className="font-medium">
                        {selectedBill?.first_name} {selectedBill?.last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(parseFloat(selectedBill?.total_amount) || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span className="font-medium">
                        {formatDate(selectedBill?.billing_date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}