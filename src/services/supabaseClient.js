import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE SETUP", import.meta.env);
console.log("SUPABASE INIT:", { supabaseUrl, authStatus: supabaseKey ? "Present" : "Missing" });

if (!supabaseUrl || !supabaseKey) {
  console.error("URGENTE: ENV NÃO CARREGADA NO VITE PAYLOAD", { supabaseUrl, supabaseKey });
}

export const supabase = createClient(supabaseUrl || "https://dummy.supabase.co", supabaseKey || "dummy_key");
