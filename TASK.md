# TASK: Build Module 1 — Accounting System for Adamrit HMS

## Context
This is a Next.js 14 hospital management system (adamrit-nextjs) being built as a replacement for a CakePHP HMS.
The app uses Supabase (PostgreSQL) as backend. Currently has 15 pages showing migrated historical data.

## CRITICAL: Two Supabase Databases
1. **Production DB (LIVE — adamrit.com)**: `xvkxccqaopbnkvwgyfjv.supabase.co` — has 113 tables, 2137 patients, 15447 bills, 3065 vouchers, 47 chart_of_accounts. This is used by Hope + Ayushman hospitals daily.
2. **Migration DB (historical CakePHP data)**: `tegvsgjhxrfddwpbgrzz.supabase.co` — has 624K records from old CakePHP system.

The accounting module should connect to the **Production DB** for live features.
Keep the existing pages connected to the Migration DB for historical viewing.

## Production Supabase Details
- URL: https://xvkxccqaopbnkvwgyfjv.supabase.co
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2a3hjY3Fhb3Bibmt2d2d5Zmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MjMwMTIsImV4cCI6MjA2MzM5OTAxMn0.z9UkKHDm4RPMs_2IIzEPEYzd3-sbQSF6XpxaQg3vZhU

## Production DB Schema (Accounting-related tables)
- `chart_of_accounts` — 47 accounts (GL codes, account types, opening balances, tally_guid)
- `vouchers` — 3,065 vouchers (voucher_number, voucher_type, date, description, total_amount, tally_guid, metadata)
- `voucher_entries` — 6,130 entries (voucher_id, account_id, amount, is_debit, description)
- `voucher_types` — Voucher type definitions
- `bills` — 15,447 bills
- `bill_line_items` — Bill line items with charges
- `bill_sections` — Bill sections
- `patients` — 2,137 patients
- `visits` — 2,460 visits
- `payment_transactions` — Payment records
- `outstanding_invoices` — Outstanding amounts
- `aging_snapshots` — Aging analysis
- `daily_balances` — Daily balance tracking
- `ledgers` — Ledger accounts
- `ledger_groups` — Ledger groupings

## Reference Code (Current Live App)
Study these files from the current production app at `/tmp/adamrit_current/`:
- `src/components/accounting/` — 36 React components (Dashboard, VoucherCreation, DayBook, TrialBalance, BalanceSheet, ProfitLoss, ChartOfAccounts, LedgerCreation, etc.)
- `src/services/tallyIntegration.ts` — Full Tally XML export/import service
- `src/pages/Accounting.tsx` — Main accounting page
- `src/pages/CashBook.tsx` — 652 lines, cash book with date filters
- `src/pages/DayBook.tsx` — 592 lines, day book report
- `src/pages/FinalBill.tsx` — 23,928 lines (THE billing beast)
- `src/pages/LedgerStatement.tsx` — 686 lines
- `src/pages/PatientLedger.tsx` — 423 lines

## CakePHP Reference
The original CakePHP code is at `/tmp/hmis_cakephp/`:
- `app/Controller/AccountingController.php` — 7,651 lines, 89 functions
- Key functions: cashier_open, paymentRecieved, trialBalanceReport, legder_voucher, patient_statement, post_to_tallynew, pettyCashBook, department_wise_revenue

## What to Build (10 pages under /accounting/*)

### 1. `/accounting` — Dashboard
- Daily cash collection summary (today's receipts, payments, net)
- Pending vouchers count
- Quick stats cards: Total receivable, Total payable, Cash in hand, Bank balance
- Recent transactions list (last 20)
- Quick action buttons to all sub-pages

### 2. `/accounting/receipts` — Receipt Voucher Management
- Create new receipt: Patient search → amount → payment mode (Cash/Card/UPI/Cheque/RTGS) → narration → save
- List all receipts with date filter, search
- Print receipt (print-friendly layout)
- Patient-wise receipt history

### 3. `/accounting/payments` — Payment Voucher Management
- Create payment voucher: Select account → amount → mode → narration → save
- List with filters
- Print voucher
- Approval workflow (if needed)

### 4. `/accounting/journal` — Journal Entries
- Double-entry: Debit account + Credit account + amount + narration
- Batch journal entries
- List with date filter
- Print journal voucher

### 5. `/accounting/contra` — Contra Entries
- Bank to Cash / Cash to Bank transfers
- List with date filter

### 6. `/accounting/ledger` — Ledger View
- Select account → show all transactions (debit/credit) with running balance
- Date range filter
- Print ledger statement
- Account-wise summary

### 7. `/accounting/trial-balance` — Trial Balance
- Date range selection
- Group-wise trial balance
- Export to Excel/PDF
- Debit/Credit totals with balance check

### 8. `/accounting/cashier` — Cashier Management
- Open/close cashier session
- Daily collection summary per cashier
- Cash handover records
- Used by Priyanka daily

### 9. `/accounting/petty-cash` — Petty Cash Book
- Add petty cash entries
- Category-wise tracking
- Date range report

### 10. `/accounting/tally-export` — Tally Integration
- Export vouchers to Tally XML format
- Date range selection
- Voucher type filter (Receipt/Payment/Journal/Contra)
- Download XML file for Tally import
- Sync status tracking
- Use the TallyIntegrationService pattern from `/tmp/adamrit_current/src/services/tallyIntegration.ts`

## Technical Requirements
- Create a second Supabase client for production DB: `src/lib/supabaseProd.ts`
- Keep existing `src/lib/supabase.ts` for migration DB (historical data pages)
- All accounting pages use the production Supabase client
- Use TypeScript, Tailwind CSS, shadcn/ui components
- Print-friendly layouts with `@media print` CSS
- Responsive for tablet use
- Indian Rupee (₹) formatting throughout
- Date format: DD/MM/YYYY (Indian standard)
- Multi-location support: Location selector (Hope Hospital / Ayushman Hospital)
- All financial calculations must be precise (no floating point issues — use integers for paisa)

## Sidebar Update
Add these under a new "Accounting" section in the sidebar:
- Dashboard, Receipts, Payments, Journal, Contra, Ledger, Trial Balance, Cashier, Petty Cash, Tally Export

## DO NOT
- Do NOT modify existing pages (Dashboard, Patients, IPD, etc.)
- Do NOT change the migration DB connection
- Do NOT hardcode any secrets — use environment variables
- Do NOT use `any` type excessively — define proper interfaces

## When Done
Run `npm run build` to verify no errors. Then run:
```
openclaw system event --text "Done: Built Accounting Module with 10 pages — Dashboard, Receipts, Payments, Journal, Contra, Ledger, Trial Balance, Cashier, Petty Cash, Tally Export. Connected to production Supabase." --mode now
```
