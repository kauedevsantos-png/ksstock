/**
 * KS STOCK — CONTROLE DE ASSINATURA E LIMITES
 */

const Subscription = {

  info: null,

  async init() {
    const client = getSupabase();

    if (!client) return false;

    try {
      const { data, error } = await client.rpc(
        'get_subscription_info'
      );

      if (error) {
        console.error('Erro ao consultar assinatura:', error);
        this.info = null;
        return false;
      }

      // SECURITY/COMPATIBILIDADE: algumas RPCs retornam objeto,
      // outras retornam um array com uma única linha.
      this.info = Array.isArray(data) ? data[0] : data;

      if (!this.info) {
        console.error('get_subscription_info não retornou dados.');
        return false;
      }

      // Proteção adicional no frontend: se o trial já passou da data
      // final, considera expirado mesmo que o status da RPC ainda esteja
      // como "trial".
      if (
        this.info.status === 'trial' &&
        this.info.trial_ends_at &&
        new Date(this.info.trial_ends_at).getTime() <= Date.now()
      ) {
        this.info.status = 'expired';
        this.info.days_remaining = 0;
      }

      this.updateInterface();

      return this.isAllowed();

    } catch (err) {
      console.error('Erro no módulo de assinatura:', err);
      this.info = null;
      return false;
    }
  },


  getPlan() {
    return this.info?.plan || null;
  },


  getStatus() {
    return this.info?.status || null;
  },


  getLimit(resource) {
    if (!this.info?.limits) return 0;
    return Number(this.info.limits[resource] || 0);
  },


  isAllowed() {
    return ['trial', 'active'].includes(this.getStatus());
  },


  isExpired() {
    return ['expired', 'suspended', 'cancelled'].includes(
      this.getStatus()
    );
  },


  canUseSystem() {
    return this.isAllowed();
  },


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

    try {
      const { data, error } = await client.rpc(
        'check_company_limit',
        { p_resource: resource }
      );

      if (error) {
        console.error('Erro ao verificar limite:', error);
        return {
          allowed: false,
          current: 0,
          limit: 0,
          remaining: 0,
          error
        };
      }

      const result = Array.isArray(data) ? data[0] : data;

      return result || {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0
      };

    } catch (err) {
      console.error('Erro ao verificar limite:', err);
      return {
        allowed: false,
        current: 0,
        limit: 0,
        remaining: 0,
        error: err
      };
    }
  },


  async canCreate(resource) {
    if (!this.isAllowed()) {
      this.showBlockedScreen();
      return false;
    }

    const result = await this.checkLimit(resource);

    if (!result.allowed) {
      this.showLimitMessage(resource, result.limit);
      return false;
    }

    return true;
  },


  updateInterface() {
    if (!this.info) return;

    const status = this.getStatus();
    const days = Number(this.info.days_remaining || 0);

    document
      .querySelectorAll('.company-plan')
      .forEach(element => {
        element.textContent = this.getPlanLabel(this.getPlan());
      });

    document
      .querySelectorAll('[data-subscription-status]')
      .forEach(element => {
        element.textContent = this.getStatusLabel(status);
      });

    const trialWarning = document.getElementById(
      'subscription-warning'
    );

    if (trialWarning) {
      if (status === 'trial' && days <= 3 && days > 0) {
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

    if (status === 'trial' && days <= 3 && days > 0) {
      this.showTrialWarning(days);
    }

    if (this.isExpired()) {
      this.showBlockedScreen();
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

    return labels[status] || status || 'Indisponível';
  },


  showTrialWarning(days) {
    if (document.getElementById('ks-trial-warning')) return;

    const warning = document.createElement('div');
    warning.id = 'ks-trial-warning';

    warning.innerHTML = `
      <div style="
        position:fixed;
        top:0;
        left:0;
        right:0;
        z-index:99999;
        padding:12px 20px;
        background:#fff7ed;
        border-bottom:1px solid #fed7aa;
        color:#9a3412;
        text-align:center;
        font-family:inherit;
        font-size:14px;
        font-weight:600;
      ">
        Seu período de teste termina em
        ${days} ${days === 1 ? 'dia' : 'dias'}.
        Para continuar utilizando o KS Stock,
        entre em contato com o desenvolvedor.
      </div>
    `;

    document.body.appendChild(warning);
  },


  showLimitMessage(resource, limit) {
    const names = {
      products: 'produtos',
      customers: 'clientes',
      categories: 'categorias',
      users: 'usuários',
      sales: 'vendas'
    };

    const name = names[resource] || resource;
    const message = `Seu plano permite até ${limit} ${name}.`;

    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('warning', 'Limite do plano atingido', message);
    } else {
      alert(message);
    }
  },


  showBlockedMessage() {
    const status = this.getStatus();

    let message = 'Sua assinatura não está ativa.';

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

    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast('warning', 'Acesso limitado', message);
    } else {
      alert(message);
    }
  },


  showBlockedScreen() {
    if (document.getElementById('ks-subscription-blocked')) return;

    const status = this.getStatus();

    let title = 'Acesso bloqueado';
    let message =
      'Sua assinatura não está ativa. Entre em contato com o desenvolvedor para continuar utilizando o KS Stock.';

    if (status === 'expired') {
      title = 'Período de teste encerrado';
      message =
        'Os 7 dias de teste da sua empresa chegaram ao fim. Para continuar utilizando o KS Stock, entre em contato com o desenvolvedor.';
    } else if (status === 'suspended') {
      title = 'Conta suspensa';
      message =
        'O acesso da sua empresa está suspenso. Entre em contato com o desenvolvedor para regularizar o acesso.';
    } else if (status === 'cancelled') {
      title = 'Assinatura cancelada';
      message =
        'A assinatura da sua empresa foi cancelada. Entre em contato com o desenvolvedor para reativar o acesso.';
    }

    document.body.innerHTML = `
      <div
        id="ks-subscription-blocked"
        style="
          position:fixed;
          inset:0;
          z-index:2147483647;
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:24px;
          box-sizing:border-box;
          background:#f8fafc;
          font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        "
      >
        <div style="
          width:100%;
          max-width:520px;
          box-sizing:border-box;
          background:#ffffff;
          border:1px solid #e2e8f0;
          border-radius:24px;
          padding:48px 32px;
          text-align:center;
          box-shadow:0 20px 60px rgba(15,23,42,.08);
        ">
          <div style="
            width:72px;
            height:72px;
            margin:0 auto 24px;
            border-radius:50%;
            background:#fef2f2;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:32px;
          ">🔒</div>

          <h1 style="
            margin:0 0 12px;
            font-size:28px;
            line-height:1.2;
            color:#0f172a;
          ">${title}</h1>

          <p style="
            margin:0 auto 28px;
            max-width:420px;
            line-height:1.7;
            color:#64748b;
            font-size:15px;
          ">${message}</p>

          <a
            href="https://wa.me/5519978013794?text=Ol%C3%A1%2C%20Kaue%21%20Meu%20per%C3%ADodo%20de%20teste%20do%20KS%20Stock%20terminou%20e%20gostaria%20de%20continuar%20utilizando%20o%20sistema."
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              gap:8px;
              padding:14px 22px;
              border-radius:12px;
              background:#16a34a;
              color:white;
              text-decoration:none;
              font-weight:700;
            "
          >
            Falar com o desenvolvedor
          </a>

          <div style="
            margin-top:24px;
            font-size:12px;
            color:#94a3b8;
          ">KS Stock</div>
        </div>
      </div>
    `;
  }
};

window.Subscription = Subscription;
