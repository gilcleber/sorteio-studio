const { createClient } = require('@supabase/supabase-js');

const url = 'https://cxcwkakordpthmlkzhxa.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4Y3drYWtvcmRwdGhtbGt6aHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTEwNzQsImV4cCI6MjA4MTQyNzA3NH0.2Ca4hfk2CrjqgkBmE46--T38hdDbD2Odm1nAK00L_xA';
const supabase = createClient(url, key);

async function run() {
  console.log("Testando busca por slug...");
  const { data, error } = await supabase.from('app_historico').select('*').eq('slug', 'meu-grande-sorteio-8417').maybeSingle();
  console.log("-------------------");
  console.log("Resultado por Slug:");
  console.log("DATA:", data);
  console.log("ERROR:", error);

  console.log("\nListando primeiro item da tabela app_historico...");
  const { data: all, error: errAll } = await supabase.from('app_historico').select('*').limit(2);
  console.log("-------------------");
  console.log("All DATA:", all);
  console.log("All ERROR:", errAll);
}
run();
