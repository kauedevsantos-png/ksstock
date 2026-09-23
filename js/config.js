/**
 * KS STOCK — CONFIGURAÇÕES GERAIS E CONEXÃO COM O SUPABASE
 * 
 * Insira aqui as chaves do seu projeto Supabase:
 * Acesse: Supabase Dashboard -> Project Settings -> API
 * 1. Project URL -> SUPABASE_URL
 * 2. Project API Keys (anon / public) -> SUPABASE_ANON_KEY
 */

const CONFIG = {
  // SUPABASE CREDENCIAIS
  // Substitua pelos dados do seu projeto Supabase:
  SUPABASE_URL: window.KS_ENV_SUPABASE_URL || 'https://xyzcompany.supabase.co',
  SUPABASE_ANON_KEY: window.KS_ENV_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

  APP_NAME: 'KS Stock',
  APP_VERSION: '1.0.0',
  CURRENCY: 'BRL',
  LOCALE: 'pt-BR',

  // Verifica se as chaves padrão ainda estão no código
  isSupabaseConfigured() {
    return (
      this.SUPABASE_URL &&
      this.SUPABASE_ANON_KEY &&
      !this.SUPABASE_URL.includes('xyzcompany') &&
      !this.SUPABASE_ANON_KEY.includes('...')
    );
  }
};

window.CONFIG = CONFIG;
