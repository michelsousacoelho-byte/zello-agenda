import { createClient } from '@supabase/supabase-js'

// Buscando as variáveis de ambiente do arquivo .env de forma segura
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: As chaves do Supabase não foram encontradas no arquivo .env")
}

export const supabase = createClient(supabaseUrl, supabaseKey)