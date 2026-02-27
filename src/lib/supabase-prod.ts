// @ts-nocheck
import { createClient } from '@supabase/supabase-js'

// Production Supabase credentials for live features
const supabaseUrl = 'https://xvkxccqaopbnkvwgyfjv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2a3hjY3Fhb3Bibmt2d2d5Zmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY1ODA2MzAsImV4cCI6MjA0MjE1NjYzMH0.Q-AxSMpO6lKogtR_m0j2CvpzdRiDpZiKebR8XCPq1Nc'

export const supabaseProd = createClient(supabaseUrl, supabaseAnonKey)