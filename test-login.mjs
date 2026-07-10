import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bqwngfmeyhqtirndfpnx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxd25nZm1leWhxdGlybmRmcG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTQ1MjgsImV4cCI6MjA5Nzc5MDUyOH0.rV4d1xvCiTZN2WarOCLaoPeQKYPbEkFo95KP_FJgYnc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'datacentershope@gmail.com',
    password: 'Admin@2026',
  })

  if (error) {
    console.error('Error logging in:', error.message)
    process.exit(1)
  }

  console.log('User logged in successfully:', data.user?.id)
}

main()
