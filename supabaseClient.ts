
// This assumes the script tag in index.html has loaded the supabase library into window.supabase
declare global {
  interface Window {
    supabase: {
      createClient: (url: string, key: string) => any;
    };
  }
}

const SUPABASE_URL = 'https://supabase.assisthelp.ru';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY1MTQxMjAwLCJleHAiOjE5MjI5MDc2MDB9.YA4manXaXwmvzpDaoZB2S42eza-rIxEg_nPZv7drS0c';

export const supabase = window.supabase 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabase) {
  console.error('Supabase client failed to initialize. Make sure the CDN script is loaded.');
}
