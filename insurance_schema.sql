-- Insurance Module Database Schema for Adamrit HMS
-- Production Supabase: https://xvkxccqaopbnkvwgyfjv.supabase.co

-- Insurance Providers/Payers
CREATE TABLE IF NOT EXISTS insurance_providers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'ESIC', 'PM-JAY', 'RGJAY', 'Corporate', 'Private'
    contact_info JSONB, -- Phone, email, address
    payment_terms TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance Claims (main table)
CREATE TABLE IF NOT EXISTS insurance_claims (
    id SERIAL PRIMARY KEY,
    claim_number VARCHAR(100) UNIQUE NOT NULL,
    patient_id INTEGER REFERENCES patients(id),
    insurance_provider_id INTEGER REFERENCES insurance_providers(id),
    payer_name VARCHAR(255), -- Direct payer name for backward compatibility
    insurance_type VARCHAR(50), -- 'ESIC', 'PM-JAY', 'RGJAY', etc.
    beneficiary_id VARCHAR(100), -- Ayushman card number, ESIC number, etc.
    
    -- Claim details
    claim_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2),
    received_amount DECIMAL(12,2) DEFAULT 0,
    treatment_details TEXT,
    treatment_package VARCHAR(255), -- For PM-JAY packages
    
    -- Dates
    admission_date DATE,
    discharge_date DATE,
    submitted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_date TIMESTAMP WITH TIME ZONE,
    payment_received_date TIMESTAMP WITH TIME ZONE,
    
    -- Pre-authorization
    pre_auth_number VARCHAR(100),
    pre_auth_amount DECIMAL(12,2),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'submitted', 'under_review', 'approved', 'rejected', 'payment_received'
    denial_reason TEXT,
    denial_date TIMESTAMP WITH TIME ZONE,
    
    -- Resubmission tracking
    original_claim_id INTEGER REFERENCES insurance_claims(id),
    resubmission_count INTEGER DEFAULT 0,
    
    -- Location and metadata
    location_id INTEGER NOT NULL, -- 1=Hope, 2=Ayushman
    created_by INTEGER, -- User who created the claim
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corporate Bills (separate table for corporate billing)
CREATE TABLE IF NOT EXISTS corporate_bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(100) UNIQUE NOT NULL,
    corporate_client VARCHAR(255) NOT NULL, -- 'WCL', 'BHEL', 'BSNL', etc.
    patient_id INTEGER REFERENCES patients(id),
    
    -- Bill details
    bill_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2),
    paid_amount DECIMAL(12,2) DEFAULT 0,
    services TEXT, -- Description of services provided
    
    -- Dates
    service_date DATE,
    billing_date DATE DEFAULT CURRENT_DATE,
    approved_date DATE,
    payment_date DATE,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'submitted', 'approved', 'paid'
    
    -- Location
    location_id INTEGER NOT NULL, -- 1=Hope, 2=Ayushman
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Claim Documents (for uploaded files)
CREATE TABLE IF NOT EXISTS claim_documents (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES insurance_claims(id) ON DELETE CASCADE,
    document_type VARCHAR(100), -- 'discharge_summary', 'bills', 'esic_form', etc.
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,
    uploaded_by INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Tracking
CREATE TABLE IF NOT EXISTS insurance_payments (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES insurance_claims(id),
    payment_amount DECIMAL(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50), -- 'bank_transfer', 'cheque', 'cash', etc.
    reference_number VARCHAR(100),
    notes TEXT,
    location_id INTEGER NOT NULL,
    recorded_by INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Denial Management
CREATE TABLE IF NOT EXISTS claim_denials (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES insurance_claims(id),
    denial_reason VARCHAR(255) NOT NULL,
    denial_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    denial_amount DECIMAL(12,2),
    appeal_deadline DATE,
    corrective_action TEXT,
    is_appealed BOOLEAN DEFAULT false,
    appeal_date TIMESTAMP WITH TIME ZONE,
    appeal_outcome VARCHAR(50), -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resubmission Tracking
CREATE TABLE IF NOT EXISTS claim_resubmissions (
    id SERIAL PRIMARY KEY,
    original_claim_id INTEGER REFERENCES insurance_claims(id),
    new_claim_id INTEGER REFERENCES insurance_claims(id),
    resubmission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    corrective_actions TEXT,
    additional_documents TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    outcome_date TIMESTAMP WITH TIME ZONE,
    created_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient_id ON insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_submitted_date ON insurance_claims(submitted_date);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_location_id ON insurance_claims(location_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_insurance_type ON insurance_claims(insurance_type);
CREATE INDEX IF NOT EXISTS idx_corporate_bills_corporate_client ON corporate_bills(corporate_client);
CREATE INDEX IF NOT EXISTS idx_corporate_bills_billing_date ON corporate_bills(billing_date);
CREATE INDEX IF NOT EXISTS idx_corporate_bills_status ON corporate_bills(status);

-- Views for easier querying
CREATE OR REPLACE VIEW insurance_claims_full AS
SELECT 
    ic.*,
    p.first_name || ' ' || COALESCE(p.last_name, '') AS patient_name,
    p.phone as patient_phone,
    ip.name as insurance_provider_name,
    CASE 
        WHEN ic.location_id = 1 THEN 'Hope Hospital'
        WHEN ic.location_id = 2 THEN 'Ayushman Hospital'
        ELSE 'Unknown'
    END as location_name,
    CASE 
        WHEN ic.payment_received_date IS NOT NULL THEN ic.received_amount
        ELSE 0
    END as actual_received_amount
FROM insurance_claims ic
LEFT JOIN patients p ON ic.patient_id = p.id
LEFT JOIN insurance_providers ip ON ic.insurance_provider_id = ip.id;

CREATE OR REPLACE VIEW corporate_bills_full AS
SELECT 
    cb.*,
    p.first_name || ' ' || COALESCE(p.last_name, '') AS patient_name,
    p.phone as patient_phone,
    CASE 
        WHEN cb.location_id = 1 THEN 'Hope Hospital'
        WHEN cb.location_id = 2 THEN 'Ayushman Hospital'
        ELSE 'Unknown'
    END as location_name
FROM corporate_bills cb
LEFT JOIN patients p ON cb.patient_id = p.id;

-- Sample data for testing
INSERT INTO insurance_providers (name, type, is_active) VALUES
('ESIC Corporation', 'ESIC', true),
('PM-JAY (National Health Authority)', 'PM-JAY', true),
('RGJAY (Rajiv Gandhi Jeevandayee)', 'RGJAY', true),
('WCL (Western Coal Fields)', 'Corporate', true),
('BHEL (Bharat Heavy Electricals)', 'Corporate', true),
('BSNL (Bharat Sanchar Nigam)', 'Corporate', true),
('ECHS (Ex-Servicemen Health)', 'Corporate', true),
('CGHS (Central Govt Health)', 'Corporate', true),
('MML (Manganese Mining Limited)', 'Corporate', true)
ON CONFLICT (name) DO NOTHING;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_insurance_claims_updated_at 
    BEFORE UPDATE ON insurance_claims 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_corporate_bills_updated_at 
    BEFORE UPDATE ON corporate_bills 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notes for implementation:
-- 1. Ensure patients table exists with proper structure
-- 2. Set up proper row-level security (RLS) policies in Supabase
-- 3. Create proper user roles and permissions
-- 4. Set up automated backups for claim data
-- 5. Configure file storage for claim documents (Supabase Storage)