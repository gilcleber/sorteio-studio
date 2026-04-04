const url = 'https://cxcwkakordpthmlkzhxa.supabase.co/rest/v1/app_historico?slug=eq.meu-grande-sorteio-8417&select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4Y3drYWtvcmRwdGhtbGt6aHhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NTEwNzQsImV4cCI6MjA4MTQyNzA3NH0.2Ca4hfk2CrjqgkBmE46--T38hdDbD2Odm1nAK00L_xA';

fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Accept': 'application/vnd.pgrst.object+json' // forces single row or object fail
  }
})
.then(async res => {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  console.log("Status:", res.status);
  console.log("Data:", data);
})
.catch(console.error);

fetch('https://cxcwkakordpthmlkzhxa.supabase.co/rest/v1/app_historico?select=*&limit=1', {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
})
.then(async res => {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  console.log("\nStatus (ALL, Limit 1):", res.status);
  console.log("Data:", data);
})
.catch(console.error);
