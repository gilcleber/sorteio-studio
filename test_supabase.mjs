import { createClient } from '@supabase/supabase-js';

const url = 'https://cxcwkakordpthmlkzhxa.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4Y3drYWtvcmRwdGhtbGt6aHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTEwNzQsImV4cCI6MjA4MTQyNzA3NH0.2Ca4hfk2CrjqgkBmE46--T38hdDbD2Odm1nAK00L_xA';
const supabase = createClient(url, key);

async function run() {
  console.log("Verificando app_radios...");
  const { data: radioData, error: radioError } = await supabase.from('app_radios').select('*').limit(1);
  console.log("DATA app_radios:", radioData);
  console.log("ERROR app_radios:", radioError);

  console.log("\nVerificando radio_settings...");
  const { data: settingsData, error: settingsError } = await supabase.from('radio_settings').select('*').limit(1);
  console.log("DATA radio_settings:", settingsData);
  console.log("ERROR radio_settings:", settingsError);
}
run();
