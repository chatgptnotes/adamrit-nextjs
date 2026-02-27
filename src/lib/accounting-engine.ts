// @ts-nocheck
import { createClient } from '@supabase/supabase-js'

// Use the correct Supabase credentials from the task
const supabaseUrl = 'https://tegvsgjhxrfddwpbgrzz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3ZzZ2poeHJmZGR3cGJncnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDU1NDIsImV4cCI6MjA4NzY4MTU0Mn0.WjKDFe5NueYvfenpqlRHbHQwuDSW9ogGILglCSxj0EM'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface JournalEntryData {
  narration: string
  voucher_date: string
  location_id: number
  entries: {
    account_id: number
    debit?: number
    credit?: number
    narration?: string
  }[]
}

export interface ReceiptVoucherData {
  patient_id: string
  amount: number
  payment_mode: string
  narration: string
  voucher_date: string
  location_id: number
}

export interface PaymentVoucherData {
  account_id: number
  amount: number
  payment_mode: string
  narration: string
  voucher_date: string
  location_id: number
}

export interface ContraVoucherData {
  from_account_id: number
  to_account_id: number
  amount: number
  narration: string
  voucher_date: string
  location_id: number
}

// Generate voucher number
export const generateVoucherNumber = async (type: string, location_id: number): Promise<string> => {
  const prefix = type === 'Receipt' ? 'RV' : type === 'Payment' ? 'PV' : type === 'Journal' ? 'JV' : 'CV'
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  
  // Get the last voucher number for today
  const { data: lastVoucher } = await supabase
    .from('voucher_logs')
    .select('voucher_number')
    .eq('type', type)
    .eq('location_id', location_id)
    .like('voucher_number', `${prefix}${today}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  let sequence = 1
  if (lastVoucher && lastVoucher.length > 0) {
    const lastNumber = lastVoucher[0].voucher_number
    const lastSequence = parseInt(lastNumber.slice(-3)) || 0
    sequence = lastSequence + 1
  }

  return `${prefix}${today}${sequence.toString().padStart(3, '0')}`
}

// Create Journal Entry with double-entry bookkeeping
export const createJournalEntry = async (data: JournalEntryData) => {
  const batch_identifier = Date.now().toString()
  const voucher_number = await generateVoucherNumber('Journal', data.location_id)
  
  // Validate that total debits equal total credits
  const totalDebit = data.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0)
  const totalCredit = data.entries.reduce((sum, entry) => sum + (entry.credit || 0), 0)
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('Total debits must equal total credits')
  }

  try {
    // Insert voucher log
    const { data: voucherLog, error: logError } = await supabase
      .from('voucher_logs')
      .insert({
        voucher_number,
        type: 'Journal',
        total_amount: totalDebit,
        narration: data.narration,
        voucher_date: data.voucher_date,
        location_id: data.location_id,
        batch_identifier,
        status: 'Posted'
      })
      .select()
      .single()

    if (logError) throw logError

    // Insert voucher entries
    const voucherEntries = data.entries.map((entry: any) => ({
      voucher_log_id: voucherLog.id,
      account_id: entry.account_id,
      debit: entry.debit || null,
      credit: entry.credit || null,
      narration: entry.narration || data.narration,
      voucher_date: data.voucher_date,
      batch_identifier,
      location_id: data.location_id
    }))

    const { error: entriesError } = await supabase
      .from('voucher_entries')
      .insert(voucherEntries)

    if (entriesError) throw entriesError

    // Update account balances
    for (const entry of data.entries) {
      await updateAccountBalance(entry.account_id, entry.debit || 0, entry.credit || 0)
    }

    return { success: true, voucher_number, batch_identifier }
  } catch (error) {
    console.error('Error creating journal entry:', error)
    throw error
  }
}

// Create Receipt Voucher (when payment is received)
export const createReceiptVoucher = async (data: ReceiptVoucherData) => {
  const batch_identifier = Date.now().toString()
  const voucher_number = await generateVoucherNumber('Receipt', data.location_id)
  
  // Determine cash/bank account (assuming Cash=1, Bank=2)
  const cashBankAccountId = data.payment_mode === 'Cash' ? 1 : 2
  
  try {
    // Insert voucher log
    const { data: voucherLog, error: logError } = await supabase
      .from('voucher_logs')
      .insert({
        voucher_number,
        type: 'Receipt',
        total_amount: data.amount,
        narration: data.narration,
        voucher_date: data.voucher_date,
        location_id: data.location_id,
        batch_identifier,
        status: 'Posted'
      })
      .select()
      .single()

    if (logError) throw logError

    // Create double entry:
    // Debit: Cash/Bank account
    // Credit: Patient account (receivable)
    const entries = [
      {
        voucher_log_id: voucherLog.id,
        account_id: cashBankAccountId,
        debit: data.amount,
        credit: null,
        narration: `Receipt from Patient ${data.patient_id} - ${data.narration}`,
        voucher_date: data.voucher_date,
        batch_identifier,
        location_id: data.location_id
      },
      {
        voucher_log_id: voucherLog.id,
        account_id: 3, // Assuming Patient Receivables account ID = 3
        debit: null,
        credit: data.amount,
        narration: `Receipt from Patient ${data.patient_id} - ${data.narration}`,
        voucher_date: data.voucher_date,
        batch_identifier,
        location_id: data.location_id
      }
    ]

    const { error: entriesError } = await supabase
      .from('voucher_entries')
      .insert(entries)

    if (entriesError) throw entriesError

    // Update balances
    await updateAccountBalance(cashBankAccountId, data.amount, 0)
    await updateAccountBalance(3, 0, data.amount) // Credit patient receivables

    return { success: true, voucher_number, batch_identifier }
  } catch (error) {
    console.error('Error creating receipt voucher:', error)
    throw error
  }
}

// Create Payment Voucher (when hospital pays out)
export const createPaymentVoucher = async (data: PaymentVoucherData) => {
  const batch_identifier = Date.now().toString()
  const voucher_number = await generateVoucherNumber('Payment', data.location_id)
  
  // Determine cash/bank account
  const cashBankAccountId = data.payment_mode === 'Cash' ? 1 : 2
  
  try {
    // Insert voucher log
    const { data: voucherLog, error: logError } = await supabase
      .from('voucher_logs')
      .insert({
        voucher_number,
        type: 'Payment',
        total_amount: data.amount,
        narration: data.narration,
        voucher_date: data.voucher_date,
        location_id: data.location_id,
        batch_identifier,
        status: 'Posted'
      })
      .select()
      .single()

    if (logError) throw logError

    // Create double entry:
    // Debit: Expense/Supplier account
    // Credit: Cash/Bank account
    const entries = [
      {
        voucher_log_id: voucherLog.id,
        account_id: data.account_id,
        debit: data.amount,
        credit: null,
        narration: data.narration,
        voucher_date: data.voucher_date,
        batch_identifier,
        location_id: data.location_id
      },
      {
        voucher_log_id: voucherLog.id,
        account_id: cashBankAccountId,
        debit: null,
        credit: data.amount,
        narration: data.narration,
        voucher_date: data.voucher_date,
        batch_identifier,
        location_id: data.location_id
      }
    ]

    const { error: entriesError } = await supabase
      .from('voucher_entries')
      .insert(entries)

    if (entriesError) throw entriesError

    // Update balances
    await updateAccountBalance(data.account_id, data.amount, 0)
    await updateAccountBalance(cashBankAccountId, 0, data.amount)

    return { success: true, voucher_number, batch_identifier }
  } catch (error) {
    console.error('Error creating payment voucher:', error)
    throw error
  }
}

// Create Contra Entry (bank to cash or cash to bank)
export const createContraVoucher = async (data: ContraVoucherData) => {
  const batch_identifier = Date.now().toString()
  const voucher_number = await generateVoucherNumber('Contra', data.location_id)
  
  try {
    // Insert voucher log
    const { data: voucherLog, error: logError } = await supabase
      .from('voucher_logs')
      .insert({
        voucher_number,
        type: 'Contra',
        total_amount: data.amount,
        narration: data.narration,
        voucher_date: data.voucher_date,
        location_id: data.location_id,
        batch_identifier,
        status: 'Posted'
      })
      .select()
      .single()

    if (logError) throw logError

    // Create double entry:
    // Debit: To account
    // Credit: From account
    const entries = [
      {
        voucher_log_id: voucherLog.id,
        account_id: data.to_account_id,
        debit: data.amount,
        credit: null,
        narration: data.narration,
        voucher_date: data.voucher_date,
        batch_identifier,
        location_id: data.location_id
      },
      {
        voucher_log_id: voucherLog.id,
        account_id: data.from_account_id,
        debit: null,
        credit: data.amount,
        narration: data.narration,
        voucher_date: data.voucher_date,
        batch_identifier,
        location_id: data.location_id
      }
    ]

    const { error: entriesError } = await supabase
      .from('voucher_entries')
      .insert(entries)

    if (entriesError) throw entriesError

    // Update balances
    await updateAccountBalance(data.to_account_id, data.amount, 0)
    await updateAccountBalance(data.from_account_id, 0, data.amount)

    return { success: true, voucher_number, batch_identifier }
  } catch (error) {
    console.error('Error creating contra voucher:', error)
    throw error
  }
}

// Delete Journal Entry (reverse balances and soft delete)
export const deleteJournalEntry = async (batchIdentifier: string) => {
  try {
    // Get all entries for this batch
    const { data: entries, error: fetchError } = await supabase
      .from('voucher_entries')
      .select('*')
      .eq('batch_identifier', batchIdentifier)
      .eq('is_deleted', false)

    if (fetchError) throw fetchError
    if (!entries || entries.length === 0) {
      throw new Error('No entries found for this batch identifier')
    }

    // Reverse the balance updates
    for (const entry of entries) {
      // Reverse: if it was debit, credit it back; if it was credit, debit it back
      await updateAccountBalance(
        entry.account_id, 
        entry.credit || 0, // Reverse: credit becomes debit
        entry.debit || 0   // Reverse: debit becomes credit
      )
    }

    // Soft delete voucher entries
    const { error: deleteEntriesError } = await supabase
      .from('voucher_entries')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('batch_identifier', batchIdentifier)

    if (deleteEntriesError) throw deleteEntriesError

    // Soft delete voucher log
    const { error: deleteLogError } = await supabase
      .from('voucher_logs')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('batch_identifier', batchIdentifier)

    if (deleteLogError) throw deleteLogError

    return { success: true }
  } catch (error) {
    console.error('Error deleting journal entry:', error)
    throw error
  }
}

// Delete Payment Voucher
export const deletePaymentVoucher = async (voucherLogId: number) => {
  try {
    // Get voucher log first
    const { data: voucherLog, error: fetchLogError } = await supabase
      .from('voucher_logs')
      .select('batch_identifier')
      .eq('id', voucherLogId)
      .eq('is_deleted', false)
      .single()

    if (fetchLogError) throw fetchLogError
    if (!voucherLog) {
      throw new Error('Voucher not found')
    }

    // Use the same deletion logic as journal entries
    return await deleteJournalEntry(voucherLog.batch_identifier)
  } catch (error) {
    console.error('Error deleting payment voucher:', error)
    throw error
  }
}

// Update account balance
const updateAccountBalance = async (accountId: number, debitAmount: number, creditAmount: number) => {
  try {
    // Get current balance
    const { data: account, error: fetchError } = await supabase
      .from('accounts_full')
      .select('balance_amount')
      .eq('id', accountId)
      .single()

    if (fetchError) {
      console.error('Account not found, creating balance entry')
      // If account doesn't exist in balance table, create it
      const newBalance = debitAmount - creditAmount
      const { error: insertError } = await supabase
        .from('accounts_full')
        .insert({
          id: accountId,
          balance_amount: newBalance
        })
      if (insertError) throw insertError
      return
    }

    const currentBalance = account.balance_amount || 0
    const newBalance = currentBalance + debitAmount - creditAmount

    // Update balance
    const { error: updateError } = await supabase
      .from('accounts_full')
      .update({ balance_amount: newBalance })
      .eq('id', accountId)

    if (updateError) throw updateError
  } catch (error) {
    console.error('Error updating account balance:', error)
    throw error
  }
}

// Get account balance
export const getAccountBalance = async (accountId: number): Promise<number> => {
  try {
    const { data: account, error } = await supabase
      .from('accounts_full')
      .select('balance_amount')
      .eq('id', accountId)
      .single()

    if (error) {
      console.error('Error fetching account balance:', error)
      return 0
    }

    return account.balance_amount || 0
  } catch (error) {
    console.error('Error getting account balance:', error)
    return 0
  }
}

// Get Trial Balance
export const getTrialBalance = async (fromDate: string, toDate: string, locationId?: number) => {
  try {
    let query = supabase
      .from('voucher_entries')
      .select(`
        account_id,
        debit,
        credit,
        chart_of_accounts!inner(name, account_type)
      `)
      .gte('voucher_date', fromDate)
      .lte('voucher_date', toDate)
      .eq('is_deleted', false)

    if (locationId) {
      query = query.eq('location_id', locationId)
    }

    const { data: entries, error } = await query

    if (error) throw error

    // Group by account
    const accountTotals: Record<number, {
      account_name: string
      account_type: string
      total_debit: number
      total_credit: number
    }> = {}

    entries?.forEach(entry => {
      if (!accountTotals[entry.account_id]) {
        accountTotals[entry.account_id] = {
          account_name: (entry.chart_of_accounts as any)?.name || '',
          account_type: (entry.chart_of_accounts as any)?.account_type || '',
          total_debit: 0,
          total_credit: 0
        }
      }
      
      accountTotals[entry.account_id].total_debit += entry.debit || 0
      accountTotals[entry.account_id].total_credit += entry.credit || 0
    })

    return Object.entries(accountTotals).map(([accountId, totals]) => ({
      account_id: parseInt(accountId),
      ...totals
    }))
  } catch (error) {
    console.error('Error getting trial balance:', error)
    throw error
  }
}

// Get Ledger for specific account
export const getLedger = async (accountId: number, fromDate: string, toDate: string) => {
  try {
    const { data: entries, error } = await supabase
      .from('voucher_entries')
      .select(`
        *,
        voucher_logs!inner(voucher_number, type, voucher_date)
      `)
      .eq('account_id', accountId)
      .gte('voucher_date', fromDate)
      .lte('voucher_date', toDate)
      .eq('is_deleted', false)
      .order('voucher_date', { ascending: true })

    if (error) throw error

    // Calculate running balance
    let runningBalance = 0
    const ledgerEntries = entries?.map((entry: any) => {
      runningBalance += (entry.debit || 0) - (entry.credit || 0)
      return {
        ...entry,
        running_balance: runningBalance
      }
    })

    return ledgerEntries || []
  } catch (error) {
    console.error('Error getting ledger:', error)
    throw error
  }
}

// Get Cash Book (cash account transactions)
export const getCashBook = async (fromDate: string, toDate: string, locationId?: number) => {
  // Assuming Cash account ID = 1
  return getLedger(1, fromDate, toDate)
}

// Get all chart of accounts
export const getChartOfAccounts = async () => {
  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting chart of accounts:', error)
    return []
  }
}

// Search patients (assuming there's a patients table)
export const searchPatients = async (searchTerm: string) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,id.eq.${searchTerm}`)
      .limit(10)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error searching patients:', error)
    return []
  }
}

// Get patient account statement
export const getPatientAccountStatement = async (patientId: string, fromDate?: string, toDate?: string) => {
  try {
    // Get billings for patient
    let billingQuery = supabase
      .from('final_billings')
      .select('*')
      .eq('patient_id', patientId)

    if (fromDate) billingQuery = billingQuery.gte('date', fromDate)
    if (toDate) billingQuery = billingQuery.lte('date', toDate)

    const { data: billings, error: billingsError } = await billingQuery

    if (billingsError) throw billingsError

    // Get payments for patient from voucher entries where narration contains patient ID
    let paymentsQuery = supabase
      .from('voucher_entries')
      .select(`
        *,
        voucher_logs!inner(voucher_number, type, voucher_date)
      `)
      .like('narration', `%Patient ${patientId}%`)
      .eq('is_deleted', false)

    if (fromDate) paymentsQuery = paymentsQuery.gte('voucher_date', fromDate)
    if (toDate) paymentsQuery = paymentsQuery.lte('voucher_date', toDate)

    const { data: payments, error: paymentsError } = await paymentsQuery

    if (paymentsError) throw paymentsError

    const totalBilled = billings?.reduce((sum: any, b: any) => sum + (b.total_amount || 0), 0) || 0
    const totalPaid = payments?.reduce((sum, p) => sum + (p.credit || 0), 0) || 0

    return {
      billings: billings || [],
      payments: payments || [],
      total_billed: totalBilled,
      total_paid: totalPaid,
      outstanding: totalBilled - totalPaid
    }
  } catch (error) {
    console.error('Error getting patient account statement:', error)
    throw error
  }
}