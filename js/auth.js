/**
 * KS STOCK — GESTÃO DE AUTENTICAÇÃO E SESSÃO MULTIEMPRESA
 * Integração com Supabase Auth + RPC register_company_and_admin
 */

const Auth = {

  async requireAuth() {

    UI.checkSupabaseBanner();

    if (!CONFIG.isSupabaseConfigured()) {
      console.warn(
        'Supabase não configurado.'
      );

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

      window.location.href =
        'login.html';

      return null;
    }

    const profile =
      await this.loadUserProfile(
        session.user.id,
        true
      );

    if (!profile) {

      UI.showToast(
        'error',
        'Atenção',
        'Perfil de empresa não encontrado.'
      );

      setTimeout(() => {
        window.location.href =
          'login.html';
      }, 1500);

      return null;
    }

    this.updateUserUI(profile);


    /*
     * Verifica assinatura/trial.
     */
    if (
      typeof Subscription !== 'undefined'
    ) {

      await Subscription.init();

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

      window.location.href =
        'dashboard.html';

    }
  },


  async loadUserProfile(
    userId,
    forceRefresh = false
  ) {

    if (!forceRefresh) {

      const cached =
        localStorage.getItem(
          'ks_user_profile'
        );

      if (cached) {

        try {

          const parsed =
            JSON.parse(cached);

          if (
            parsed.id === userId
          ) {
            return parsed;
          }

        } catch (e) {

          localStorage.removeItem(
            'ks_user_profile'
          );

        }
      }
    }


    const client =
      getSupabase();

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
        .eq(
          'id',
          userId
        )
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

        id:
          data.id,

        name:
          data.name || 'Usuário',

        email:
          data.email || '',

        role:
          data.role || 'employee',

        company_id:
          data.company_id,

        company_name:
          data.companies
            ? data.companies.name
            : 'Minha Empresa',

        company_plan:
          data.companies
            ? data.companies.plan
            : 'basico'
      };


      localStorage.setItem(
        'ks_user_profile',
        JSON.stringify(
          userProfile
        )
      );


      return userProfile;

    } catch (err) {

      console.error(
        'Falha de rede ao carregar perfil:',
        err
      );

      return null;
    }
  },


  updateUserUI(profile) {

    if (!profile) {
      return;
    }


    const userNames =
      document.querySelectorAll(
        '.user-name-display'
      );

    userNames.forEach(el => {

      el.textContent =
        profile.name || 'Usuário';

    });


    const userRoles =
      document.querySelectorAll(
        '.user-role-display'
      );

    userRoles.forEach(el => {

      el.textContent =
        profile.role === 'admin'
          ? 'Administrador'
          : 'Funcionário';

    });


    const companyNames =
      document.querySelectorAll(
        '.company-name-display'
      );

    companyNames.forEach(el => {

      el.textContent =
        profile.company_name ||
        'Minha Empresa';

    });


    const companyAvatars =
      document.querySelectorAll(
        '.company-avatar-display'
      );

    companyAvatars.forEach(el => {

      const companyName =
        profile.company_name ||
        'KS';

      el.textContent =
        companyName
          .substring(0, 2)
          .toUpperCase();

    });


    const userAvatars =
      document.querySelectorAll(
        '.user-avatar-display'
      );

    userAvatars.forEach(el => {

      const name =
        profile.name ||
        'U';

      el.textContent =
        name
          .substring(0, 1)
          .toUpperCase();

    });


    if (
      profile.role !== 'admin'
    ) {

      const adminOnlyEls =
        document.querySelectorAll(
          '.admin-only'
        );

      adminOnlyEls.forEach(el => {

        el.style.display =
          'none';

      });

    }
  },


  async signIn(
    email,
    password
  ) {

    const client =
      getSupabase();

    if (!client) {

      UI.showToast(
        'error',
        'Configuração Pendente',
        'Supabase ainda não foi configurado em js/config.js'
      );

      return {
        success: false
      };
    }


    try {

      const {
        data,
        error
      } =
        await client.auth.signInWithPassword({
          email:
            email.trim(),
          password
        });


      if (error) {

        let msg =
          'E-mail ou senha incorretos.';


        if (
          error.message.includes(
            'Invalid login credentials'
          )
        ) {

          msg =
            'E-mail ou senha inválidos.';

        } else if (
          error.message.includes(
            'Email not confirmed'
          )
        ) {

          msg =
            'Confirmação de e-mail pendente. Verifique sua caixa de entrada.';

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


      this.clearSessionCache();


      let profile =
        await this.loadUserProfile(
          data.user.id,
          true
        );


      /*
       * Se o usuário acabou de confirmar
       * o e-mail, o profile/empresa pode
       * ainda não existir.
       *
       * Nesse caso usamos os metadados
       * salvos no próprio usuário Auth.
       */
      if (!profile) {

        const metadata =
          data.user.user_metadata || {};

        const companyName =
          String(
            metadata.company_name || ''
          ).trim();

        const userName =
          String(
            metadata.full_name || ''
          ).trim();

        const userEmail =
          String(
            data.user.email || email
          ).trim();


        if (
          companyName &&
          userName &&
          userEmail
        ) {

          const {
            error: rpcError
          } = await client.rpc(
            'register_company_and_admin',
            {
              p_company_name:
                companyName,

              p_user_name:
                userName,

              p_user_email:
                userEmail
            }
          );


          if (
            rpcError &&
            !String(
              rpcError.message || ''
            ).toLowerCase().includes(
              'already'
            )
          ) {

            console.error(
              'Erro ao criar empresa após confirmação:',
              rpcError
            );

            UI.showToast(
              'error',
              'Erro',
              'Não foi possível configurar sua empresa.'
            );

            await client.auth.signOut();

            return {
              success: false,
              error: rpcError
            };
          }


          profile =
            await this.loadUserProfile(
              data.user.id,
              true
            );

        }
      }


      if (!profile) {

        UI.showToast(
          'error',
          'Conta incompleta',
          'Sua conta foi criada, mas a empresa ainda não foi configurada. Entre em contato com o suporte.'
        );

        return {
          success: false
        };
      }


      this.updateUserUI(
        profile
      );


      if (
        typeof Subscription !== 'undefined'
      ) {

        await Subscription.init();

      }


      UI.showToast(
        'success',
        'Bem-vindo!',
        'Login realizado com sucesso.'
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
        'Erro no login:',
        err
      );

      UI.showToast(
        'error',
        'Erro',
        'Não foi possível conectar ao servidor.'
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

    const client =
      getSupabase();

    if (!client) {

      UI.showToast(
        'error',
        'Configuração Pendente',
        'Supabase ainda não foi configurado em js/config.js'
      );

      return {
        success: false
      };
    }


    const cleanName =
      name.trim();

    const cleanCompany =
      companyName.trim();

    const cleanEmail =
      email.trim();


    if (
      !cleanName ||
      !cleanCompany ||
      !cleanEmail ||
      !password
    ) {

      UI.showToast(
        'warning',
        'Atenção',
        'Preencha todos os campos.'
      );

      return {
        success: false
      };
    }


    try {

      const redirectUrl =
        `${window.location.origin}/login.html`;


      const {
        data: authData,
        error: authError
      } =
        await client.auth.signUp({

          email:
            cleanEmail,

          password,

          options: {

            emailRedirectTo:
              redirectUrl,

            data: {

              full_name:
                cleanName,

              company_name:
                cleanCompany

            }
          }
        });


      if (authError) {

        let msg =
          authError.message;


        if (
          msg.includes(
            'User already registered'
          )
        ) {

          msg =
            'Já existe uma conta cadastrada com este e-mail.';

        } else if (
          msg.includes(
            'Password should be at least'
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


      if (
        !authData ||
        !authData.user
      ) {

        UI.showToast(
          'error',
          'Falha no Cadastro',
          'Não foi possível criar o usuário.'
        );

        return {
          success: false
        };
      }


      /*
       * Confirmação desativada:
       * já existe sessão.
       */
      if (authData.session) {

        const {
          error: rpcError
        } = await client.rpc(
          'register_company_and_admin',
          {
            p_company_name:
              cleanCompany,

            p_user_name:
              cleanName,

            p_user_email:
              cleanEmail
          }
        );


        if (rpcError) {

          console.error(
            'Erro na RPC de registro:',
            rpcError
          );

          await client.auth.signOut();

          UI.showToast(
            'error',
            'Erro',
            'Falha ao provisionar sua empresa. Contate o suporte.'
          );

          return {
            success: false,
            error: rpcError
          };
        }


        this.clearSessionCache();


        UI.showToast(
          'success',
          'Conta criada!',
          'Sua empresa foi configurada com sucesso.'
        );


        setTimeout(() => {

          window.location.href =
            'dashboard.html';

        }, 800);


        return {
          success: true,
          data: authData
        };
      }


      /*
       * Confirmação ativada.
       * Os dados necessários já foram
       * armazenados no metadata do usuário.
       */
      UI.showToast(
        'info',
        'Quase lá!',
        'Enviamos um link de confirmação para seu e-mail. Depois de confirmar, faça login para concluir a configuração.',
        8000
      );


      return {
        success: true,
        emailConfirmationRequired: true,
        data: authData
      };


    } catch (err) {

      console.error(
        'Erro no cadastro:',
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

    const client =
      getSupabase();

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
      } =
        await client.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo:
              `${window.location.origin}/recuperar-senha.html`
          }
        );


      if (error) {

        console.error(
          'Erro no reset:',
          error
        );

        UI.showToast(
          'error',
          'Erro',
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
        'Verifique sua caixa de entrada para redefinir sua senha.'
      );


      return {
        success: true
      };


    } catch (err) {

      console.error(
        'Erro na recuperação:',
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


  async updatePassword(
    newPassword
  ) {

    const client =
      getSupabase();

    if (!client) {

      UI.showToast(
        'error',
        'Erro',
        'Supabase não configurado.'
      );

      return {
        success: false
      };
    }


    if (
      !newPassword ||
      newPassword.length < 6
    ) {

      UI.showToast(
        'warning',
        'Senha inválida',
        'A nova senha deve ter pelo menos 6 caracteres.'
      );

      return {
        success: false
      };
    }


    try {

      const {
        data,
        error
      } =
        await client.auth.updateUser({
          password:
            newPassword
        });


      if (error) {

        console.error(
          'Erro ao atualizar senha:',
          error
        );

        UI.showToast(
          'error',
          'Erro',
          'Não foi possível alterar sua senha.'
        );

        return {
          success: false,
          error
        };
      }


      UI.showToast(
        'success',
        'Senha alterada!',
        'Sua senha foi atualizada com sucesso.'
      );


      return {
        success: true,
        data
      };


    } catch (err) {

      console.error(
        'Erro ao atualizar senha:',
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

    const client =
      getSupabase();

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

      return JSON.parse(
        cached
      );

    } catch (e) {

      localStorage.removeItem(
        'ks_user_profile'
      );

      return null;
    }
  }

};


window.Auth = Auth;
