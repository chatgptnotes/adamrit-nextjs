import { supabase } from './supabase'
import { calculateTotalBill, getAdvancePayments } from './billing-engine'

// Types for billing operations
export interface AdvancePaymentData {
  patient_id: number
  amount: number
  payment_mode: 'Cash' | 'Cheque' | 'NEFT' | 'Card' | 'UPI' | 'Bank Deposit'
  bank_name?: string
  cheque_number?: string
  transaction_id?: string
  remarks?: string
}

export interface FinalBillData {
  patient_id: number
  total_amount: number
  discount: number
  payments: PaymentMode[]
  remarks?: string
}

export interface PaymentMode {
  mode: 'Cash' | 'Cheque' | 'NEFT' | 'Card' | 'UPI' | 'Bank Deposit'
  amount: number
  bank_name?: string
  cheque_number?: string
  transaction_id?: string
}

export interface ReceiptData {
  id: number
  bill_number: string
  patient_name: string
  total_amount: number
  paid_amount: number
  payment_mode: string
  billing_date: string
  hospital_name: string
  hospital_address: string
  charges_breakdown: any
}

// Save advance payment
export async function saveAdvancePayment(data: AdvancePaymentData): Promise<{ success: boolean; billingId?: number; error?: string }> {
  try {
    // Insert into billings table
    const { data: billing, error: billingError } = await supabase
      .from('billings')
      .insert({
        patient_id: data.patient_id,
        total_amount: data.amount,
        paid_amount: data.amount,
        payment_category: 'Advance',
        payment_mode: data.payment_mode,
        bank_name: data.bank_name,
        cheque_number: data.cheque_number,
        transaction_id: data.transaction_id,
        remarks: data.remarks,
        billing_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        is_deleted: false
      })
      .select()
      .single()

    if (billingError) throw billingError

    // Update or create final_billings record
    await updateFinalBillingsAdvance(data.patient_id, data.amount)

    return { success: true, billingId: billing.id }
  } catch (error) {
    console.error('Error saving advance payment:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Save final bill with multiple payment modes
export async function saveFinalBill(patientId: number, data: FinalBillData): Promise<{ success: boolean; billNumber?: string; error?: string }> {
  try {
    // Generate bill number
    const billNumber = await generateBillNumber(patientId)

    // Calculate total bill breakdown
    const billBreakdown = await calculateTotalBill(patientId)
    const advancePaid = await getAdvancePayments(patientId)

    // Insert main billing record
    const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0)
    
    const { data: billing, error: billingError } = await supabase
      .from('billings')
      .insert({
        patient_id: patientId,
        bill_number: billNumber,
        total_amount: data.total_amount,
        paid_amount: totalPaid,
        payment_category: 'Finalbill',
        payment_mode: data.payments.map(p => p.mode).join(', '),
        bank_name: data.payments.find(p => p.bank_name)?.bank_name,
        cheque_number: data.payments.find(p => p.cheque_number)?.cheque_number,
        transaction_id: data.payments.find(p => p.transaction_id)?.transaction_id,
        remarks: data.remarks,
        billing_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        is_deleted: false
      })
      .select()
      .single()

    if (billingError) throw billingError

    // Insert individual payment records if multiple payment modes
    if (data.payments.length > 1) {
      for (const payment of data.payments) {
        await supabase
          .from('billings')
          .insert({
            patient_id: patientId,
            bill_number: `${billNumber}-${payment.mode}`,
            total_amount: payment.amount,
            paid_amount: payment.amount,
            payment_category: 'Payment',
            payment_mode: payment.mode,
            bank_name: payment.bank_name,
            cheque_number: payment.cheque_number,
            transaction_id: payment.transaction_id,
            billing_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            parent_bill_id: billing.id,
            is_deleted: false
          })
      }
    }

    // Create/update final_billings record
    const { error: finalBillError } = await supabase
      .from('final_billings')
      .upsert({
        patient_id: patientId,
        bill_number: billNumber,
        total_bill_amount: data.total_amount,
        advance_amount: advancePaid,
        discount_amount: data.discount,
        final_amount: data.total_amount - advancePaid - data.discount,
        paid_amount: totalPaid,
        balance_amount: (data.total_amount - advancePaid - data.discount) - totalPaid,
        ward_charges: billBreakdown.wardCharges,
        nursing_charges: billBreakdown.nursingCharges,
        doctor_charges: billBreakdown.doctorCharges,
        lab_charges: billBreakdown.labCharges,
        pharmacy_charges: billBreakdown.pharmacyCharges,
        surgery_charges: billBreakdown.surgeryCharges,
        other_charges: billBreakdown.otherCharges,
        registration_charges: billBreakdown.registrationCharges,
        consultant_charges: billBreakdown.consultantCharges,
        radiology_charges: billBreakdown.radiologyCharges,
        anesthesia_charges: billBreakdown.anesthesiaCharges,
        bill_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (finalBillError) throw finalBillError

    return { success: true, billNumber }
  } catch (error) {
    console.error('Error saving final bill:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Generate sequential bill number
export async function generateBillNumber(patientId: number): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  
  // Get the latest bill number for current month
  const { data: lastBill } = await supabase
    .from('billings')
    .select('bill_number')
    .like('bill_number', `${year}${month}%`)
    .order('bill_number', { ascending: false })
    .limit(1)

  let nextNumber = 1
  if (lastBill && lastBill.length > 0) {
    const lastNumber = parseInt(lastBill[0].bill_number.slice(-4))
    nextNumber = lastNumber + 1
  }

  return `${year}${month}${nextNumber.toString().padStart(4, '0')}`
}

// Generate printable receipt data
export async function generateReceipt(billingId: number): Promise<ReceiptData | null> {
  try {
    const { data: billing } = await supabase
      .from('billings')
      .select(`
        *,
        patient:patients(first_name, last_name)
      `)
      .eq('id', billingId)
      .single()

    if (!billing) return null

    // Get charges breakdown if it's a final bill
    let chargesBreakdown = null
    if (billing.payment_category === 'Finalbill') {
      chargesBreakdown = await calculateTotalBill(billing.patient_id)
    }

    return {
      id: billing.id,
      bill_number: billing.bill_number || `ADV-${billing.id}`,
      patient_name: `${billing.patient?.first_name || ''} ${billing.patient?.last_name || ''}`.trim(),
      total_amount: parseFloat(billing.total_amount) || 0,
      paid_amount: parseFloat(billing.paid_amount) || 0,
      payment_mode: billing.payment_mode || 'Cash',
      billing_date: billing.billing_date,
      hospital_name: 'Hope Hospital',
      hospital_address: 'Nagpur, Maharashtra',
      charges_breakdown: chargesBreakdown
    }
  } catch (error) {
    console.error('Error generating receipt:', error)
    return null
  }
}

// Soft delete advance payment
export async function deleteAdvancePayment(billingId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('billings')
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', billingId)

    if (error) throw error

    // Update final_billings to reflect the deletion
    const { data: billing } = await supabase
      .from('billings')
      .select('patient_id, total_amount')
      .eq('id', billingId)
      .single()

    if (billing) {
      await updateFinalBillingsAdvance(billing.patient_id, -parseFloat(billing.total_amount))
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting advance payment:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Helper function to update final_billings with advance amounts
async function updateFinalBillingsAdvance(patientId: number, advanceAmount: number) {
  const { data: existingBill } = await supabase
    .from('final_billings')
    .select('*')
    .eq('patient_id', patientId)
    .single()

  if (existingBill) {
    const newAdvanceAmount = (existingBill.advance_amount || 0) + advanceAmount
    const newBalanceAmount = (existingBill.total_bill_amount || 0) - newAdvanceAmount - (existingBill.discount_amount || 0)

    await supabase
      .from('final_billings')
      .update({
        advance_amount: newAdvanceAmount,
        balance_amount: newBalanceAmount,
        updated_at: new Date().toISOString()
      })
      .eq('patient_id', patientId)
  } else {
    // Create new final_billings record with advance
    await supabase
      .from('final_billings')
      .insert({
        patient_id: patientId,
        advance_amount: advanceAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
  }
}

// Get payment history for a patient
export async function getPaymentHistory(patientId: number) {
  const { data: payments } = await supabase
    .from('billings')
    .select('*')
    .eq('patient_id', patientId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  return payments || []
}

// Get billing summary for dashboard
export async function getBillingSummary() {
  const today = new Date().toISOString().split('T')[0]
  
  const [
    { data: todayBills },
    { data: pendingBills },
    { data: totalBills }
  ] = await Promise.all([
    supabase
      .from('billings')
      .select('total_amount')
      .eq('billing_date', today)
      .eq('is_deleted', false),
    
    supabase
      .from('final_billings')
      .select('balance_amount')
      .gt('balance_amount', 0),
    
    supabase
      .from('billings')
      .select('total_amount')
      .eq('is_deleted', false)
  ])

  const todayRevenue = (todayBills || []).reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0)
  const pendingAmount = (pendingBills || []).reduce((sum, bill) => sum + parseFloat(bill.balance_amount), 0)
  const totalRevenue = (totalBills || []).reduce((sum, bill) => sum + parseFloat(bill.total_amount), 0)

  return {
    todayBills: (todayBills || []).length,
    todayRevenue,
    pendingBills: (pendingBills || []).length,
    pendingAmount,
    totalRevenue,
    totalBills: (totalBills || []).length
  }
}