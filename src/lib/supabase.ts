import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tegvsgjhxrfddwpbgrzz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3ZzZ2poeHJmZGR3cGJncnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDU1NDIsImV4cCI6MjA4NzY4MTU0Mn0.WjKDFe5NueYvfenpqlRHbHQwuDSW9ogGILglCSxj0EM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)