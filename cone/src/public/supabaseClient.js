import { createClient } from '@supabase/supabase-js'

export const sb = createClient(
  'https://crsalcpvsedmiabkeibp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyc2FsY3B2c2VkbWlhYmtlaWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjkxNDgsImV4cCI6MjA5Njg0NTE0OH0.OuVSJRFgTp5C4rSM9Wi_fT2Q2RwpHEIIkUOdBNxUTJw'
)
