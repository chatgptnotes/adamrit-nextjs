// @ts-nocheck
import { supabase } from './supabase'

// Types for insurance operations
export interface InsuranceClaim {
  id: number
  patient_id: number
  patient_name?: string
  uhid?: string
  ipd_number?: string
  admission_date?: string
  discharge_date?: string
  claim_amount: number
  claim_status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'settled'
  insurance_type: 'ESIC' | 'PMJAY' | 'MPKAY' | 'CORPORATE' | 'TPA'
  insurance_company?: string
  corporate_name?: string
  claim_number?: string
  submission_date?: string
  approval_date?: string
  settlement_date?: string
  denial_reason?: string
  department?: string
  tariff_standard_id?: number
  days_pending: number
}

export interface ClaimFilters {
  startDate?: string
  endDate?: string
  status?: string
  department?: string
  insuranceType?: string
  corporateId?: number
}

export interface InsuranceStats {
  totalClaims: number
  pendingClaims: number
  approvedClaims: number
  rejectedClaims: number
  settledClaims: number
  totalClaimAmount: number
  pendingAmount: number
  approvedAmount: number
  rejectedAmount: number
  settledAmount: number
  collectionRate: number
}

export interface AccountReceivable {
  groupBy: string
  outstandingAmount: number
  claimsCount: number
  aging30: number
  aging60: number
  aging90: number
  aging90Plus: number
}

// Get ESIC claims
export async function getESICClaims(filters: ClaimFilters = {}): Promise<InsuranceClaim[]> {
  let query = supabase
    .from('patients_full')
    .select(`
      id,
      first_name,
      last_name,
      uhid,
      ipd_number,
      admission_date,
      discharge_date,
      tariff_standard_id,
      insurance_company,
      claim_status,
      claim_amount,
      claim_number,
      submission_date,
      approval_date,
      settlement_date,
      denial_reason,
      department_id,
      departments(name)
    `)
    .or('tariff_standard_id.eq.15,insurance_company.ilike.%ESIC%')

  // Apply filters
  if (filters.startDate) {
    query = query.gte('admission_date', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('admission_date', filters.endDate)
  }
  if (filters.status) {
    query = query.eq('claim_status', filters.status)
  }
  if (filters.department) {
    query = query.eq('department_id', filters.department)
  }

  const { data: claims, error } = await query.order('admission_date', { ascending: false })

  if (error) {
    console.error('Error fetching ESIC claims:', error)
    return []
  }

  return (claims || []).map((claim: any) => ({
    ...claim,
    patient_name: `${claim.first_name} ${claim.last_name}`.trim(),
    department: claim.departments?.name,
    insurance_type: 'ESIC' as const,
    days_pending: calculateDaysPending(claim.submission_date, claim.claim_status)
  }))
}

// Get PM-JAY claims (includes MPKAY)
export async function getPMJAYClaims(filters: ClaimFilters = {}): Promise<InsuranceClaim[]> {
  let query = supabase
    .from('patients_full')
    .select(`
      id,
      first_name,
      last_name,
      uhid,
      ipd_number,
      admission_date,
      discharge_date,
      tariff_standard_id,
      insurance_company,
      claim_status,
      claim_amount,
      claim_number,
      submission_date,
      approval_date,
      settlement_date,
      denial_reason,
      department_id,
      departments(name)
    `)
    .or('tariff_standard_id.eq.39,tariff_standard_id.eq.20,insurance_company.ilike.%PMJAY%,insurance_company.ilike.%MPKAY%')

  // Apply filters
  if (filters.startDate) {
    query = query.gte('admission_date', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('admission_date', filters.endDate)
  }
  if (filters.status) {
    query = query.eq('claim_status', filters.status)
  }
  if (filters.department) {
    query = query.eq('department_id', filters.department)
  }

  const { data: claims, error } = await query.order('admission_date', { ascending: false })

  if (error) {
    console.error('Error fetching PM-JAY claims:', error)
    return []
  }

  return (claims || []).map((claim: any) => ({
    ...claim,
    patient_name: `${claim.first_name} ${claim.last_name}`.trim(),
    department: claim.departments?.name,
    insurance_type: claim.tariff_standard_id === 20 ? 'MPKAY' as const : 'PMJAY' as const,
    days_pending: calculateDaysPending(claim.submission_date, claim.claim_status)
  }))
}

// Get corporate claims
export async function getCorporateClaims(corporateId?: number, filters: ClaimFilters = {}): Promise<InsuranceClaim[]> {
  let query = supabase
    .from('patients_full')
    .select(`
      id,
      first_name,
      last_name,
      uhid,
      ipd_number,
      admission_date,
      discharge_date,
      tariff_standard_id,
      corporate_id,
      claim_status,
      claim_amount,
      claim_number,
      submission_date,
      approval_date,
      settlement_date,
      denial_reason,
      department_id,
      departments(name),
      corporates(name)
    `)

  if (corporateId) {
    query = query.eq('corporate_id', corporateId)
  } else {
    query = query.not('corporate_id', 'is', null)
  }

  // Apply filters
  if (filters.startDate) {
    query = query.gte('admission_date', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('admission_date', filters.endDate)
  }
  if (filters.status) {
    query = query.eq('claim_status', filters.status)
  }
  if (filters.department) {
    query = query.eq('department_id', filters.department)
  }

  const { data: claims, error } = await query.order('admission_date', { ascending: false })

  if (error) {
    console.error('Error fetching corporate claims:', error)
    return []
  }

  return (claims || []).map((claim: any) => ({
    ...claim,
    patient_name: `${claim.first_name} ${claim.last_name}`.trim(),
    department: claim.departments?.name,
    corporate_name: claim.corporates?.name,
    insurance_type: 'CORPORATE' as const,
    days_pending: calculateDaysPending(claim.submission_date, claim.claim_status)
  }))
}

// Get claims by status
export async function getClaimsByStatus(status: string, filters: ClaimFilters = {}): Promise<InsuranceClaim[]> {
  let query = supabase
    .from('patients_full')
    .select(`
      id,
      first_name,
      last_name,
      uhid,
      ipd_number,
      admission_date,
      discharge_date,
      tariff_standard_id,
      insurance_company,
      corporate_id,
      claim_status,
      claim_amount,
      claim_number,
      submission_date,
      approval_date,
      settlement_date,
      denial_reason,
      department_id,
      departments(name),
      corporates(name),
      tariff_standards(name)
    `)
    .eq('claim_status', status)
    .not('claim_amount', 'is', null)

  // Apply filters
  if (filters.startDate) {
    query = query.gte('admission_date', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('admission_date', filters.endDate)
  }
  if (filters.department) {
    query = query.eq('department_id', filters.department)
  }
  if (filters.insuranceType) {
    if (filters.insuranceType === 'ESIC') {
      query = query.or('tariff_standard_id.eq.15,insurance_company.ilike.%ESIC%')
    } else if (filters.insuranceType === 'PMJAY') {
      query = query.eq('tariff_standard_id', 39)
    } else if (filters.insuranceType === 'MPKAY') {
      query = query.eq('tariff_standard_id', 20)
    } else if (filters.insuranceType === 'CORPORATE') {
      query = query.not('corporate_id', 'is', null)
    }
  }

  const { data: claims, error } = await query.order('admission_date', { ascending: false })

  if (error) {
    console.error('Error fetching claims by status:', error)
    return []
  }

  return (claims || []).map((claim: any) => ({
    ...claim,
    patient_name: `${claim.first_name} ${claim.last_name}`.trim(),
    department: claim.departments?.name,
    corporate_name: claim.corporates?.name,
    insurance_type: getInsuranceType(claim.tariff_standard_id, claim.insurance_company, claim.corporate_id),
    days_pending: calculateDaysPending(claim.submission_date, claim.claim_status)
  }))
}

// Submit claim
export async function submitClaim(patientId: number, data: {
  claimNumber?: string
  claimAmount: number
  submissionDate?: string
  remarks?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('patients_full')
      .update({
        claim_status: 'submitted',
        claim_number: data.claimNumber || generateClaimNumber(),
        claim_amount: data.claimAmount,
        submission_date: data.submissionDate || new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error submitting claim:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Get account receivable grouped by various criteria
export async function getAccountReceivable(groupBy: 'insurance' | 'corporate' | 'month' = 'insurance'): Promise<AccountReceivable[]> {
  let selectFields = ''
  let groupByField = ''

  switch (groupBy) {
    case 'insurance':
      selectFields = 'insurance_company'
      groupByField = 'insurance_company'
      break
    case 'corporate':
      selectFields = 'corporates(name)'
      groupByField = 'corporate_id'
      break
    case 'month':
      selectFields = 'DATE_TRUNC(\'month\', admission_date) as month'
      groupByField = 'month'
      break
  }

  const { data: receivables, error } = await supabase
    .from('patients_full')
    .select(`
      ${selectFields},
      claim_amount,
      submission_date,
      claim_status
    `)
    .in('claim_status', ['submitted', 'approved'])
    .not('claim_amount', 'is', null)
    .order(groupByField)

  if (error) {
    console.error('Error fetching account receivable:', error)
    return []
  }

  // Process and group the data
  const grouped: { [key: string]: any } = {}

  receivables?.forEach(item => {
    const key = groupBy === 'corporate' ? item.corporates?.name || 'Unknown' :
                groupBy === 'insurance' ? item.insurance_company || 'Unknown' :
                item.month || 'Unknown'

    if (!grouped[key]) {
      grouped[key] = {
        outstandingAmount: 0,
        claimsCount: 0,
        aging30: 0,
        aging60: 0,
        aging90: 0,
        aging90Plus: 0
      }
    }

    const amount = parseFloat(item.claim_amount) || 0
    grouped[key].outstandingAmount += amount
    grouped[key].claimsCount += 1

    // Calculate aging
    const daysPending = calculateDaysPending(item.submission_date, item.claim_status)
    if (daysPending <= 30) {
      grouped[key].aging30 += amount
    } else if (daysPending <= 60) {
      grouped[key].aging60 += amount
    } else if (daysPending <= 90) {
      grouped[key].aging90 += amount
    } else {
      grouped[key].aging90Plus += amount
    }
  })

  return Object.entries(grouped).map(([key, value]) => ({
    groupBy: key,
    ...value
  }))
}

// Get denial report
export async function getDenialReport(filters: ClaimFilters = {}): Promise<InsuranceClaim[]> {
  return getClaimsByStatus('rejected', filters)
}

// Get claim tracker - all claims with status timeline
export async function getClaimTracker(filters: ClaimFilters = {}): Promise<InsuranceClaim[]> {
  let query = supabase
    .from('patients_full')
    .select(`
      id,
      first_name,
      last_name,
      uhid,
      ipd_number,
      admission_date,
      discharge_date,
      tariff_standard_id,
      insurance_company,
      corporate_id,
      claim_status,
      claim_amount,
      claim_number,
      submission_date,
      approval_date,
      settlement_date,
      denial_reason,
      department_id,
      departments(name),
      corporates(name),
      tariff_standards(name)
    `)
    .not('claim_amount', 'is', null)

  // Apply filters
  if (filters.startDate) {
    query = query.gte('admission_date', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('admission_date', filters.endDate)
  }
  if (filters.status) {
    query = query.eq('claim_status', filters.status)
  }
  if (filters.department) {
    query = query.eq('department_id', filters.department)
  }
  if (filters.insuranceType) {
    if (filters.insuranceType === 'ESIC') {
      query = query.or('tariff_standard_id.eq.15,insurance_company.ilike.%ESIC%')
    } else if (filters.insuranceType === 'PMJAY') {
      query = query.eq('tariff_standard_id', 39)
    } else if (filters.insuranceType === 'MPKAY') {
      query = query.eq('tariff_standard_id', 20)
    } else if (filters.insuranceType === 'CORPORATE') {
      query = query.not('corporate_id', 'is', null)
    }
  }

  const { data: claims, error } = await query.order('submission_date', { ascending: false })

  if (error) {
    console.error('Error fetching claim tracker:', error)
    return []
  }

  return (claims || []).map((claim: any) => ({
    ...claim,
    patient_name: `${claim.first_name} ${claim.last_name}`.trim(),
    department: claim.departments?.name,
    corporate_name: claim.corporates?.name,
    insurance_type: getInsuranceType(claim.tariff_standard_id, claim.insurance_company, claim.corporate_id),
    days_pending: calculateDaysPending(claim.submission_date, claim.claim_status)
  }))
}

// Export claims to CSV
export async function exportClaimsToExcel(claims: InsuranceClaim[]): Promise<string> {
  const headers = [
    'Patient Name',
    'UHID',
    'IPD Number',
    'Admission Date',
    'Discharge Date',
    'Insurance Type',
    'Insurance Company',
    'Corporate',
    'Claim Number',
    'Claim Amount',
    'Claim Status',
    'Submission Date',
    'Approval Date',
    'Settlement Date',
    'Days Pending',
    'Department',
    'Denial Reason'
  ]

  const csvContent = [
    headers.join(','),
    ...claims.map((claim: any) => [
      `"${claim.patient_name || ''}"`,
      `"${claim.uhid || ''}"`,
      `"${claim.ipd_number || ''}"`,
      `"${claim.admission_date || ''}"`,
      `"${claim.discharge_date || ''}"`,
      `"${claim.insurance_type || ''}"`,
      `"${claim.insurance_company || ''}"`,
      `"${claim.corporate_name || ''}"`,
      `"${claim.claim_number || ''}"`,
      `"${claim.claim_amount || 0}"`,
      `"${claim.claim_status || ''}"`,
      `"${claim.submission_date || ''}"`,
      `"${claim.approval_date || ''}"`,
      `"${claim.settlement_date || ''}"`,
      `"${claim.days_pending || 0}"`,
      `"${claim.department || ''}"`,
      `"${claim.denial_reason || ''}"`
    ].join(','))
  ].join('\n')

  // Create downloadable CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  return url
}

// Get insurance statistics for dashboard
export async function getInsuranceStats(): Promise<InsuranceStats> {
  const { data: claims, error } = await supabase
    .from('patients_full')
    .select('claim_status, claim_amount')
    .not('claim_amount', 'is', null)

  if (error) {
    console.error('Error fetching insurance stats:', error)
    return {
      totalClaims: 0,
      pendingClaims: 0,
      approvedClaims: 0,
      rejectedClaims: 0,
      settledClaims: 0,
      totalClaimAmount: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      rejectedAmount: 0,
      settledAmount: 0,
      collectionRate: 0
    }
  }

  const stats = {
    totalClaims: claims.length,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    settledClaims: 0,
    totalClaimAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    settledAmount: 0,
    collectionRate: 0
  }

  claims.forEach(claim => {
    const amount = parseFloat(claim.claim_amount) || 0
    stats.totalClaimAmount += amount

    switch (claim.claim_status) {
      case 'pending':
      case 'submitted':
        stats.pendingClaims += 1
        stats.pendingAmount += amount
        break
      case 'approved':
        stats.approvedClaims += 1
        stats.approvedAmount += amount
        break
      case 'rejected':
        stats.rejectedClaims += 1
        stats.rejectedAmount += amount
        break
      case 'settled':
        stats.settledClaims += 1
        stats.settledAmount += amount
        break
    }
  })

  stats.collectionRate = stats.totalClaimAmount > 0 ? 
    (stats.settledAmount / stats.totalClaimAmount) * 100 : 0

  return stats
}

// Helper functions
function calculateDaysPending(submissionDate?: string, status?: string): number {
  if (!submissionDate || status === 'settled') return 0
  
  const submission = new Date(submissionDate)
  const today = new Date()
  const diffTime = today.getTime() - submission.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

function getInsuranceType(tariffStandardId?: number, insuranceCompany?: string, corporateId?: number): 'ESIC' | 'PMJAY' | 'MPKAY' | 'CORPORATE' | 'TPA' {
  if (tariffStandardId === 15 || insuranceCompany?.includes('ESIC')) {
    return 'ESIC'
  }
  if (tariffStandardId === 39 || insuranceCompany?.includes('PMJAY')) {
    return 'PMJAY'
  }
  if (tariffStandardId === 20 || insuranceCompany?.includes('MPKAY')) {
    return 'MPKAY'
  }
  if (corporateId) {
    return 'CORPORATE'
  }
  return 'TPA'
}

function generateClaimNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  
  return `CL${year}${month}${random}`
}

// Get list of corporates for dropdown
export async function getCorporatesList(): Promise<Array<{ id: number; name: string }>> {
  const { data: corporates, error } = await supabase
    .from('corporates')
    .select('id, name')
    .order('name')

  if (error) {
    console.error('Error fetching corporates:', error)
    return []
  }

  return corporates || []
}

// Get list of departments for dropdown
export async function getDepartmentsList(): Promise<Array<{ id: number; name: string }>> {
  const { data: departments, error } = await supabase
    .from('departments')
    .select('id, name')
    .order('name')

  if (error) {
    console.error('Error fetching departments:', error)
    return []
  }

  return departments || []
}

// Update claim status
export async function updateClaimStatus(patientId: number, status: string, data: {
  approvalDate?: string
  settlementDate?: string
  denialReason?: string
  remarks?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {
      claim_status: status,
      updated_at: new Date().toISOString()
    }

    if (data.approvalDate) updateData.approval_date = data.approvalDate
    if (data.settlementDate) updateData.settlement_date = data.settlementDate
    if (data.denialReason) updateData.denial_reason = data.denialReason

    const { error } = await supabase
      .from('patients_full')
      .update(updateData)
      .eq('id', patientId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error updating claim status:', error)
    return { success: false, error: (error as Error).message }
  }
}