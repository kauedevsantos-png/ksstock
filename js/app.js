/**
 * KS STOCK — CONTROLADOR GLOBAL DO LAYOUT (APP SHELL)
 * Responsividade, menu mobile, navegação ativa e bindings comuns
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Toggle do Menu Mobile
  const btnToggle = document.getElementById('btn-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (btnToggle && sidebar) {
    btnToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }

  // 2. Destacar item ativo na navegação lateral
  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 3. Vincular botões de Logout
  const logoutButtons = document.querySelectorAll('.btn-logout-action');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      UI.confirmAction(
        'Encerrar Sessão',
        'Deseja realmente sair da sua conta no KS Stock?',
        () => {
          Auth.signOut();
        }
      );
    });
  });
});

/**
 * ============================================================
 * KS STOCK — CONTROLE DE ASSINATURA E LIMITES
 * ============================================================
 */

const Subscription = {

  data: null,

  async init() {
    const client = getSupabase();

    if (!client) return null;

    try {
      const { data, error } = await client.rpc(
        'get_subscription_info'
      );

      if (error) {
        console.error(
          'Erro ao carregar assinatura:',
          error
        );

        return null;
      }

      this.data = data;

      this.updateInterface();

      return data;

    } catch (error) {

      console.error(
        'Erro no módulo de assinatura:',
        error
      );

      return null;
    }
  },


  /**
   * Retorna o plano atual
   */
  getPlan() {
    return this.data?.plan || null;
  },


  /**
   * Retorna status atual
   */
  getStatus() {
    return this.data?.status || null;
  },


  /**
   * Retorna limite
   */
  getLimit(resource) {

    if (!this.data?.limits) {
      return 0;
    }

    return Number(
      this.data.limits[resource] || 0
    );
  },


  /**
   * Verifica se a empresa pode usar o sistema
   */
  canUseSystem() {

    return [
      'trial',
      'active'
    ].includes(this.getStatus());

  },


  /**
   * Verifica limite diretamente no banco
   */
  async checkLimit(resource) {

    const client = getSupabase();

    if (!client) {
      return {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0
      };
    }

    const { data, error } = await client.rpc(
      'check_company_limit',
      {
        p_resource: resource
      }
    );

    if (error) {

      console.error(
        'Erro ao verificar limite:',
        error
      );

      return {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        error
      };
    }

    return data;
  },


  /**
   * Verifica se pode criar determinado recurso
   */
  async canCreate(resource) {

    if (!this.canUseSystem()) {

      this.showBlockedMessage();

      return false;
    }

    const result = await this.checkLimit(resource);

    if (!result.allowed) {

      this.showLimitMessage(
        resource,
        result.limit
      );

      return false;
    }

    return true;
  },


  /**
   * Mensagem de limite atingido
   */
  showLimitMessage(resource, limit) {

    const names = {
      products: 'produtos',
      customers: 'clientes',
      categories: 'categorias',
      users: 'usuários'
    };

    const name =
      names[resource] || resource;

    if (typeof UI !== 'undefined' &&
        UI.showToast) {

      UI.showToast(
        'warning',
        'Limite do plano atingido',
        `Seu plano permite até ${limit} ${name}.`
      );

    } else {

      alert(
        `Seu plano permite até ${limit} ${name}.`
      );

    }
  },


  /**
   * Sistema bloqueado por assinatura
   */
  showBlockedMessage() {

    const status = this.getStatus();

    let message =
      'Sua assinatura não está ativa.';

    if (status === 'expired') {

      message =
        'Seu período de teste terminou. Entre em contato para continuar usando o KS Stock.';

    } else if (status === 'suspended') {

      message =
        'Sua conta está suspensa. Entre em contato para regularizar o acesso.';

    } else if (status === 'cancelled') {

      message =
        'Sua assinatura foi cancelada. Entre em contato para reativar o acesso.';

    }

    if (typeof UI !== 'undefined' &&
        UI.showToast) {

      UI.showToast(
        'warning',
        'Acesso limitado',
        message
      );

    } else {

      alert(message);

    }
  },


  /**
   * Atualiza informações visuais do sistema
   */
  updateInterface() {

    if (!this.data) return;

    const plan = this.data.plan;
    const status = this.data.status;
    const days = this.data.days_remaining;

    /*
     * Plano na sidebar
     */
    document
      .querySelectorAll('.company-plan')
      .forEach(element => {

        element.textContent =
          this.getPlanLabel(plan);

      });


    /*
     * Elementos com data-subscription-status
     */
    document
      .querySelectorAll(
        '[data-subscription-status]'
      )
      .forEach(element => {

        element.textContent =
          this.getStatusLabel(status);

      });


    /*
     * Aviso de trial
     */
    const trialWarning =
      document.getElementById(
        'subscription-warning'
      );

    if (trialWarning) {

      if (
        status === 'trial' &&
        days !== null &&
        days <= 3
      ) {

        trialWarning.style.display = 'block';

        trialWarning.innerHTML = `
          <strong>Seu período gratuito está terminando.</strong>
          <span>
            ${days === 1
              ? 'Seu trial termina amanhã.'
              : `Restam ${days} dias do seu período gratuito.`
            }
          </span>
        `;

      } else {

        trialWarning.style.display = 'none';

      }

    }
  },


  getPlanLabel(plan) {

    const labels = {
      basico: 'Plano Básico',
      profissional: 'Plano Profissional',
      premium: 'Plano Premium'
    };

    return labels[plan] || 'KS Stock';
  },


  getStatusLabel(status) {

    const labels = {
      trial: 'Período gratuito',
      active: 'Ativo',
      expired: 'Expirado',
      suspended: 'Suspenso',
      cancelled: 'Cancelado'
    };

    return labels[status] || status;
  }

};
