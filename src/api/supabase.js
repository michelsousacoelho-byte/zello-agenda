import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zcurbdfvaskskggzeuee.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdXJiZGZ2YXNrc2tnZ3pldWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NzI2MDAsImV4cCI6MjA5NDM0ODYwMH0.2LbH1LZe2Q06SAuJw6Khq60AV5Atk-DqgwzX4RbDdRo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)