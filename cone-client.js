// Shared Supabase client for all public pages.
// Loaded after the supabase-js CDN script — exposes _sb to all subsequent scripts.
const _sb = supabase.createClient(
  'https://crsalcpvsedmiabkeibp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyc2FsY3B2c2VkbWlhYmtlaWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjkxNDgsImV4cCI6MjA5Njg0NTE0OH0.OuVSJRFgTp5C4rSM9Wi_fT2Q2RwpHEIIkUOdBNxUTJw'
);
