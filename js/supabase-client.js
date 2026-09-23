/**
 * KS STOCK — CLIENTE SUPABASE
 * Inicializa a instância oficial do Supabase e expõe métodos auxiliares
 */

let _supabaseClient = null;

function getSupabase() {
  if (_supabaseClient) return _supabaseClient;

  if (!window.supabase) {
    console.error('KS Stock: Biblioteca oficial do Supabase não foi carregada no documento.');
    return null;
  }

  if (!CONFIG.isSupabaseConfigured()) {
    console.warn('KS Stock: As credenciais do Supabase em js/config.js ainda não foram preenchidas.');
    return null;
  }

  try {
    _supabaseClient = window.supabase.createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
    return _supabaseClient;
  } catch (err) {
    console.error('Erro ao inicializar cliente Supabase:', err);
    return null;
  }
}

window.getSupabase = getSupabase;
