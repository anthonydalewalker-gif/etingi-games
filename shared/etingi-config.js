// Etingi Games shared config. Public values only (anon key is public by design; RLS protects data).
// NEVER put a service_role key here.
window.ETINGI_CONFIG = {
  supabaseUrl: 'https://vrfwzpykuisesbbukxrp.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyZnd6cHlrdWlzZXNiYnVreHJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTUxMjEsImV4cCI6MjEwNzk3MTEyMX0.su2BXsBgH2lJDPnzX21YLVaLIg9UwdeZM1DnYYhl3Ug',
  hubUrl: 'https://etingi.com/',          // where account/profile pages live
  cookieDomain: '.etingi.com',            // shared session across *.etingi.com (used only when served from etingi.com)
  storageKey: 'etingi-auth'
};
