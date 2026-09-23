/**
 * KS STOCK — GESTÃO DE AUTENTICAÇÃO E SESSÃO MULTIEMPRESA
 * Integração com Supabase Auth + RPC register_company_and_admin
 */

const Auth = {
  // Guarda de rota para páginas protegidas
  async requireAuth() {
    UI.checkSupabaseBanner();

    if (!CONFIG.isSupabaseConfigured()) {
      console.warn('Supabase não configurado. Exibindo banner informativo.');
      return null;
    }

    const client = getSupabase();
    if (!client) {
      window.location.href = 'login.html';
      return null;
    }

    const { data: { session }, error } = await client.auth.getSession();
    if (error || !session) {
      this.clearSessionCache();
      window.location.href = 'login.html';
      return null;
    }

    // Carrega ou valida o perfil
    const profile = await this.loadUserProfile(session.user.id);
    if (!profile) {
      // Se não encontrou perfil (ex: empresa não criada), redireciona
      UI.showToast('error', 'Atenção', 'Perfil de empresa não encontrado.');
      setTimeout(() => window.location.href = 'login.html', 1500);
      return null;
    }

    this.updateUserUI(profile);
    return { session, profile };
  },

  // Redireciona usuário já logado para o dashboard
  async redirectIfAuthenticated() {
    UI.checkSupabaseBanner();

    if (!CONFIG.isSupabaseConfigured()) return;

    const client = getSupabase();
    if (!client) return;

    const { data: { session } } = await client.auth.getSession();
    if (session) {
      window.location.href = 'dashboard.html';
    }
  },

  // Carrega os dados do perfil e da empresa do usuário
  async loadUserProfile(userId) {
    const cached = localStorage.getItem('ks_user_profile');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.id === userId) {
          return parsed;
        }
      } catch (e) {
        localStorage.removeItem('ks_user_profile');
      }
    }

    const client = getSupabase();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('profiles')
        .select(`
          id,
          name,
          email,
          role,
          company_id,
          companies (
            id,
            name,
            slug,
            plan
          )
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('Erro ao buscar perfil:', error);
        return null;
      }

      const userProfile = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        company_id: data.company_id,
        company_name: data.companies ? data.companies.name : 'Minha Empresa',
        company_plan: data.companies ? data.companies.plan : 'Pro'
      };

      localStorage.setItem('ks_user_profile', JSON.stringify(userProfile));
      return userProfile;
    } catch (err) {
      console.error('Falha de rede ao carregar perfil:', err);
      return null;
    }
  },

  // Atualiza as informações do usuário e da empresa na barra superior/sidebar
  updateUserUI(profile) {
    if (!profile) return;

    const userNames = document.querySelectorAll('.user-name-display');
    userNames.forEach(el => el.textContent = profile.name);

    const userRoles = document.querySelectorAll('.user-role-display');
    userRoles.forEach(el => el.textContent = profile.role === 'admin' ? 'Administrador' : 'Funcionário');

    const companyNames = document.querySelectorAll('.company-name-display');
    companyNames.forEach(el => el.textContent = profile.company_name);

    const companyAvatars = document.querySelectorAll('.company-avatar-display');
    companyAvatars.forEach(el => {
      el.textContent = profile.company_name.substring(0, 2).toUpperCase();
    });

    const userAvatars = document.querySelectorAll('.user-avatar-display');
    userAvatars.forEach(el => {
      el.textContent = profile.name.substring(0, 1).toUpperCase();
    });

    // Se for funcionário, oculta elementos exclusivos de admin (ex: configurações)
    if (profile.role !== 'admin') {
      const adminOnlyEls = document.querySelectorAll('.admin-only');
      adminOnlyEls.forEach(el => el.style.display = 'none');
    }
  },

  // Login com e-mail e senha
  async signIn(email, password) {
    const client = getSupabase();
    if (!client) {
      UI.showToast('error', 'Configuração Pendente', 'Supabase ainda não foi configurado em js/config.js');
      return { success: false };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) {
        let msg = 'E-mail ou senha incorretos.';
        if (error.message.includes('Invalid login credentials')) {
          msg = 'E-mail ou senha inválidos.';
        } else if (error.message.includes('Email not confirmed')) {
          msg = 'Confirmação de e-mail pendente. Verifique sua caixa de entrada.';
        }
        UI.showToast('error', 'Falha no Login', msg);
        return { success: false, error };
      }

      // Carrega perfil
      const profile = await this.loadUserProfile(data.user.id);
      if (!profile) {
        UI.showToast('warning', 'Aviso', 'Perfil em criação. Redirecionando...');
      }

      UI.showToast('success', 'Bem-vindo!', 'Login realizado com sucesso.');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);

      return { success: true, data };
    } catch (err) {
      console.error('Erro no login:', err);
      UI.showToast('error', 'Erro', 'Não foi possível conectar ao servidor.');
      return { success: false, error: err };
    }
  },

  // Cadastro com criação automática de Empresa e Perfil Admin
  async signUp(name, companyName, email, password) {
    const client = getSupabase();
    if (!client) {
      UI.showToast('error', 'Configuração Pendente', 'Supabase ainda não foi configurado em js/config.js');
      return { success: false };
    }

    try {
      // 1. Cria usuário no Supabase Auth
      const { data: authData, error: authError } = await client.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
            company_name: companyName.trim()
          }
        }
      });

      if (authError) {
        let msg = authError.message;
        if (msg.includes('User already registered')) {
          msg = 'Já existe uma conta cadastrada com este e-mail.';
        } else if (msg.includes('Password should be at least')) {
          msg = 'A senha deve ter pelo menos 6 caracteres.';
        }
        UI.showToast('error', 'Falha no Cadastro', msg);
        return { success: false, error: authError };
      }

      // 2. Se a sessão foi iniciada imediatamente (sem confirmação de email necessária)
      if (authData.session) {
        // Chama RPC atômica para criar Empresa + Perfil Admin
        const { error: rpcError } = await client.rpc('register_company_and_admin', {
          p_company_name: companyName.trim(),
          p_user_name: name.trim(),
          p_user_email: email.trim()
        });

        if (rpcError) {
          console.error('Erro na RPC de registro:', rpcError);
          UI.showToast('error', 'Erro', 'Falha ao provisionar empresa. Contate o suporte.');
          return { success: false, error: rpcError };
        }

        UI.showToast('success', 'Conta criada!', 'Sua empresa foi configurada com sucesso.');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
        return { success: true };
      } else {
        // Confirmação de e-mail necessária
        UI.showToast(
          'info',
          'Quase lá!',
          'Enviamos um link de confirmação para o seu e-mail. Confirme para acessar.',
          7000
        );
        return { success: true, emailConfirmationRequired: true };
      }
    } catch (err) {
      console.error('Erro no cadastro:', err);
      UI.showToast('error', 'Erro', 'Não foi possível completar o cadastro.');
      return { success: false, error: err };
    }
  },

  // Recuperação de senha
  async resetPassword(email) {
    const client = getSupabase();
    if (!client) {
      UI.showToast('error', 'Configuração Pendente', 'Supabase ainda não configurado.');
      return { success: false };
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/login.html'
      });

      if (error) {
        UI.showToast('error', 'Erro', 'Não foi possível enviar e-mail de recuperação.');
        return { success: false, error };
      }

      UI.showToast('success', 'E-mail enviado', 'Verifique sua caixa de entrada para redefinir sua senha.');
      return { success: true };
    } catch (err) {
      UI.showToast('error', 'Erro', 'Falha na comunicação com o servidor.');
      return { success: false, error: err };
    }
  },

  // Logout seguro
  async signOut() {
    this.clearSessionCache();
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.error('Erro ao deslogar:', e);
      }
    }
    window.location.href = 'login.html';
  },

  clearSessionCache() {
    localStorage.removeItem('ks_user_profile');
  },

  getCurrentUser() {
    const cached = localStorage.getItem('ks_user_profile');
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch (e) {
      return null;
    }
  }
};

window.Auth = Auth;
