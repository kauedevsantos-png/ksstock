/**
 * KS STOCK — GESTÃO DE AUTENTICAÇÃO E SESSÃO MULTIEMPRESA
 * Supabase Auth + criação automática de empresa + trial de 7 dias
 */

const Auth = {

  async requireAuth() {
    UI.checkSupabaseBanner();

    if (!CONFIG.isSupabaseConfigured()) {
      console.warn('Supabase não configurado.');
      return null;
    }

    const client = getSupabase();

    if (!client) {
      window.location.href = 'login.html';
      return null;
    }

    const {
      data: { session },
      error
    } = await client.auth.getSession();

    if (error || !session) {
      this.clearSessionCache();
      window.location.href = 'login.html';
      return null;
    }

    const profile = await this.loadUserProfile(session.user.id);

    if (!profile) {
      UI.showToast(
        'error',
        'Perfil não encontrado',
        'Sua conta existe, mas o perfil da empresa não foi encontrado.'
      );

      return null;
    }

    this.updateUserUI(profile);

    if (typeof Subscription !== 'undefined') {
      const subscriptionAllowed = await Subscription.init();

      if (!subscriptionAllowed) {
        return null;
      }
    }

    return {
      session,
      profile
    };
  },

  async redirectIfAuthenticated() {
    UI.checkSupabaseBanner();

    if (!CONFIG.isSupabaseConfigured()) {
      return;
    }

    const client = getSupabase();

    if (!client) {
      return;
    }

    const {
      data: { session }
    } = await client.auth.getSession();

    if (session) {
      window.location.href = 'dashboard.html';
    }
  },

  async loadUserProfile(userId) {

    const cached = localStorage.getItem('ks_user_profile');

    if (cached) {
      try {
        const parsed = JSON.parse(cached);

        if (
          parsed &&
          parsed.id === userId &&
          parsed.company_id
        ) {
          return parsed;
        }

      } catch (e) {
        localStorage.removeItem('ks_user_profile');
      }
    }

    const client = getSupabase();

    if (!client) {
      return null;
    }

    try {

      const {
        data,
        error
      } = await client
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
        .maybeSingle();

      if (error) {
        console.error(
          'Erro ao buscar perfil:',
          error
        );

        return null;
      }

      if (!data) {
        return null;
      }

      const userProfile = {
        id: data.id,
        name: data.name || 'Usuário',
        email: data.email || '',
        role: data.role || 'employee',
        company_id: data.company_id,

        company_name:
          data.companies?.name ||
          'Minha Empresa',

        company_plan:
          data.companies?.plan ||
          'pro_trial'
      };

      localStorage.setItem(
        'ks_user_profile',
        JSON.stringify(userProfile)
      );

      return userProfile;

    } catch (err) {

      console.error(
        'Falha ao carregar perfil:',
        err
      );

      return null;
    }
  },

  updateUserUI(profile) {

    if (!profile) {
      return;
    }

    document
      .querySelectorAll('.user-name-display')
      .forEach(el => {
        el.textContent = profile.name;
      });

    document
      .querySelectorAll('.user-role-display')
      .forEach(el => {
        el.textContent =
          profile.role === 'admin'
            ? 'Administrador'
            : 'Funcionário';
      });

    document
      .querySelectorAll('.company-name-display')
      .forEach(el => {
        el.textContent = profile.company_name;
      });

    document
      .querySelectorAll('.company-avatar-display')
      .forEach(el => {
        el.textContent =
          profile.company_name
            .substring(0, 2)
            .toUpperCase();
      });

    document
      .querySelectorAll('.user-avatar-display')
      .forEach(el => {
        el.textContent =
          profile.name
            .substring(0, 1)
            .toUpperCase();
      });

    if (profile.role !== 'admin') {

      document
        .querySelectorAll('.admin-only')
        .forEach(el => {
          el.style.display = 'none';
        });

    }
  },

  async signIn(email, password) {

    const client = getSupabase();

    if (!client) {

      UI.showToast(
        'error',
        'Configuração Pendente',
        'Supabase ainda não foi configurado.'
      );

      return {
        success: false
      };
    }

    try {

      const cleanEmail = email.trim();

      const {
        data,
        error
      } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {

        console.error(
          'Erro Supabase Login:',
          error
        );

        let msg =
          'E-mail ou senha incorretos.';

        const errorMessage =
          String(error.message || '').toLowerCase();

        if (
          errorMessage.includes(
            'email not confirmed'
          )
        ) {

          msg =
            'O e-mail desta conta ainda não foi confirmado. Desative a confirmação de e-mail no Supabase ou confirme o endereço.';

        } else if (
          errorMessage.includes(
            'invalid login credentials'
          )
        ) {

          msg =
            'E-mail ou senha inválidos.';

        } else if (
          errorMessage.includes(
            'user not found'
          )
        ) {

          msg =
            'Nenhuma conta foi encontrada com este e-mail.';

        } else if (
          error.message
        ) {

          msg = error.message;
        }

        UI.showToast(
          'error',
          'Falha no Login',
          msg
        );

        return {
          success: false,
          error
        };
      }

      if (!data?.user) {

        UI.showToast(
          'error',
          'Falha no Login',
          'Usuário não retornado pelo Supabase.'
        );

        return {
          success: false
        };
      }

      if (!data.session) {

        UI.showToast(
          'error',
          'Sessão não criada',
          'O Supabase não criou uma sessão para este usuário.'
        );

        return {
          success: false
        };
      }

      this.clearSessionCache();

      const profile =
        await this.loadUserProfile(
          data.user.id
        );

      if (!profile) {

        UI.showToast(
          'error',
          'Perfil não encontrado',
          'A conta existe, mas não encontramos a empresa vinculada.'
        );

        await client.auth.signOut();

        return {
          success: false
        };
      }

      UI.showToast(
        'success',
        'Bem-vindo!',
        `Olá, ${profile.name}!`
      );

      setTimeout(() => {
        window.location.href =
          'dashboard.html';
      }, 500);

      return {
        success: true,
        data,
        profile
      };

    } catch (err) {

      console.error(
        'Erro inesperado no login:',
        err
      );

      UI.showToast(
        'error',
        'Erro',
        'Não foi possível realizar o login.'
      );

      return {
        success: false,
        error: err
      };
    }
  },

  async signUp(
    name,
    companyName,
    email,
    password
  ) {

    const client = getSupabase();

    if (!client) {

      UI.showToast(
        'error',
        'Configuração Pendente',
        'Supabase ainda não foi configurado.'
      );

      return {
        success: false
      };
    }

    try {

      const cleanName =
        name.trim();

      const cleanCompanyName =
        companyName.trim();

      const cleanEmail =
        email.trim().toLowerCase();

      if (!cleanName) {

        UI.showToast(
          'error',
          'Cadastro',
          'Informe seu nome.'
        );

        return {
          success: false
        };
      }

      if (!cleanCompanyName) {

        UI.showToast(
          'error',
          'Cadastro',
          'Informe o nome da empresa.'
        );

        return {
          success: false
        };
      }

      if (!cleanEmail) {

        UI.showToast(
          'error',
          'Cadastro',
          'Informe seu e-mail.'
        );

        return {
          success: false
        };
      }

      if (!password || password.length < 6) {

        UI.showToast(
          'error',
          'Cadastro',
          'A senha deve ter pelo menos 6 caracteres.'
        );

        return {
          success: false
        };
      }

      /*
       * CRIAÇÃO DO USUÁRIO
       *
       * A confirmação de e-mail deve estar
       * desativada no Supabase.
       */
      const {
        data: authData,
        error: authError
      } = await client.auth.signUp({

        email: cleanEmail,

        password,

        options: {

          data: {
            full_name: cleanName,
            company_name: cleanCompanyName
          }

        }

      });

      if (authError) {

        console.error(
          'Erro Supabase Signup:',
          authError
        );

        let msg =
          authError.message;

        const errorMessage =
          String(authError.message || '').toLowerCase();

        if (
          errorMessage.includes(
            'user already registered'
          )
        ) {

          msg =
            'Já existe uma conta cadastrada com este e-mail.';

        } else if (
          errorMessage.includes(
            'password'
          ) &&
          errorMessage.includes(
            '6'
          )
        ) {

          msg =
            'A senha deve ter pelo menos 6 caracteres.';

        }

        UI.showToast(
          'error',
          'Falha no Cadastro',
          msg
        );

        return {
          success: false,
          error: authError
        };
      }

      if (!authData?.user) {

        UI.showToast(
          'error',
          'Falha no Cadastro',
          'O usuário não foi criado.'
        );

        return {
          success: false
        };
      }

      /*
       * COM CONFIRMAÇÃO DE E-MAIL DESATIVADA,
       * o Supabase deve retornar uma sessão.
       */

      let session =
        authData.session;

      /*
       * Caso o Supabase não tenha retornado
       * sessão imediatamente, tentamos recuperar
       * a sessão atual.
       */
      if (!session) {

        const {
          data: sessionData
        } = await client.auth.getSession();

        session =
          sessionData?.session || null;
      }

      /*
       * Se ainda não existe sessão,
       * o cadastro não pode provisionar a empresa
       * porque a RPC exige usuário autenticado.
       */
      if (!session) {

        UI.showToast(
          'error',
          'Cadastro incompleto',
          'O usuário foi criado, mas o Supabase não criou uma sessão. Verifique se "Confirm email" está desativado no Authentication > Providers > Email.'
        );

        return {
          success: false,
          error: new Error(
            'Usuário criado sem sessão.'
          )
        };
      }

      /*
       * CRIA EMPRESA + PERFIL ADMIN
       *
       * A RPC também cria as categorias iniciais
       * e o trial de 7 dias.
       */
      const {
        data: companyData,
        error: rpcError
      } = await client.rpc(
        'register_company_and_admin',
        {
          p_company_name:
            cleanCompanyName,

          p_user_name:
            cleanName,

          p_user_email:
            cleanEmail
        }
      );

      if (rpcError) {

        console.error(
          'Erro na RPC register_company_and_admin:',
          rpcError
        );

        /*
         * Se por algum motivo o perfil já existir,
         * tenta carregar o perfil antes de considerar
         * o cadastro perdido.
         */
        const existingProfile =
          await this.loadUserProfile(
            authData.user.id
          );

        if (!existingProfile) {

          UI.showToast(
            'error',
            'Erro no cadastro',
            rpcError.message ||
            'Não foi possível criar sua empresa.'
          );

          return {
            success: false,
            error: rpcError
          };
        }
      }

      /*
       * Limpa qualquer cache antigo.
       */
      this.clearSessionCache();

      /*
       * Busca novamente o perfil recém-criado.
       */
      const profile =
        await this.loadUserProfile(
          authData.user.id
        );

      if (!profile) {

        UI.showToast(
          'error',
          'Erro no cadastro',
          'A empresa foi criada, mas o perfil ainda não pôde ser carregado.'
        );

        return {
          success: false
        };
      }

      /*
       * Tudo pronto.
       */
      UI.showToast(
        'success',
        'Conta criada!',
        'Seu estoque está pronto. Você tem 7 dias grátis.'
      );

      setTimeout(() => {
        window.location.href =
          'dashboard.html';
      }, 700);

      return {
        success: true,
        data: {
          user: authData.user,
          session,
          company: companyData,
          profile
        }
      };

    } catch (err) {

      console.error(
        'Erro inesperado no cadastro:',
        err
      );

      UI.showToast(
        'error',
        'Erro',
        'Não foi possível completar o cadastro.'
      );

      return {
        success: false,
        error: err
      };
    }
  },

  async resetPassword(email) {

    const client = getSupabase();

    if (!client) {

      UI.showToast(
        'error',
        'Configuração Pendente',
        'Supabase ainda não configurado.'
      );

      return {
        success: false
      };
    }

    try {

      const {
        error
      } = await client.auth
        .resetPasswordForEmail(
          email.trim().toLowerCase(),
          {
            redirectTo:
              window.location.origin +
              '/login.html'
          }
        );

      if (error) {

        console.error(
          'Erro recuperação:',
          error
        );

        UI.showToast(
          'error',
          'Erro',
          error.message ||
          'Não foi possível enviar o e-mail de recuperação.'
        );

        return {
          success: false,
          error
        };
      }

      UI.showToast(
        'success',
        'E-mail enviado',
        'Verifique sua caixa de entrada.'
      );

      return {
        success: true
      };

    } catch (err) {

      console.error(
        'Erro recuperação:',
        err
      );

      UI.showToast(
        'error',
        'Erro',
        'Falha na comunicação com o servidor.'
      );

      return {
        success: false,
        error: err
      };
    }
  },

  async signOut() {

    this.clearSessionCache();

    const client = getSupabase();

    if (client) {

      try {
        await client.auth.signOut();
      } catch (e) {
        console.error(
          'Erro ao deslogar:',
          e
        );
      }
    }

    window.location.href =
      'login.html';
  },

  clearSessionCache() {

    localStorage.removeItem(
      'ks_user_profile'
    );
  },

  getCurrentUser() {

    const cached =
      localStorage.getItem(
        'ks_user_profile'
      );

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch (e) {
      return null;
    }
  }

};

window.Auth = Auth;
