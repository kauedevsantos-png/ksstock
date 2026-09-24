/**
 * KS STOCK — CONTROLE DE ASSINATURA E LIMITES
 */

const Subscription = {
  info: null,

  async init() {
    const client = getSupabase();
    if (!client) return false;

    try {
      const { data, error } = await client.rpc('get_subscription_info');

      if (error) {
        console.error('Erro ao consultar assinatura:', error);
        this.info = null;
        return false;
      }

      this.info = Array.isArray(data) ? data[0] : data;

      if (!this.info) {
        console.error('get_subscription_info não retornou dados.');
        return false;
      }

      // Proteção adicional: se o trial já venceu pela data,
      // considera expirado mesmo que a RPC ainda retorne "trial".
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
        {
          p_resource: resource
        }
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

      return Array.isArray(data) ? data[0] : data;

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

    if (!result?.allowed) {
      this.showLimitMessage(
        resource,
        result?.limit || 0
      );

      return false;
    }

    return true;
  },

  updateInterface() {
    if (!this.info) return;

    const status = this.getStatus();
    const days = Number(
      this.info.days_remaining || 0
    );

    document
      .querySelectorAll('.company-plan')
      .forEach(element => {
        element.textContent =
          this.getPlanLabel(this.getPlan());
      });

    document
      .querySelectorAll('[data-subscription-status]')
      .forEach(element => {
        element.textContent =
          this.getStatusLabel(status);
      });

    // Assinatura encerrada = bloqueio total.
    if (this.isExpired()) {
      this.showBlockedScreen();
      return;
    }

    // Trial ativo.
    if (status === 'trial') {

      // Primeiro acesso: mostra os 7 dias grátis.
      this.showTrialWelcomeIfNeeded(days);

      // 3, 2 ou 1 dia restante:
      // mostra apenas um modal, nunca uma barra fixa.
      if (days <= 3 && days > 0) {
        this.showTrialEndingWarning(days);
      }
    }
  },

  getCompanyKey() {
    if (this.info?.company_id) {
      return this.info.company_id;
    }

    try {
      const cached =
        localStorage.getItem(
          'ks_user_profile'
        );

      if (cached) {
        const profile =
          JSON.parse(cached);

        if (profile?.company_id) {
          return profile.company_id;
        }
      }
    } catch (e) {
      // Ignora cache inválido.
    }

    return 'current';
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

    return (
      labels[status] ||
      status ||
      'Indisponível'
    );
  },

  createModal(id, content) {
    document
      .getElementById(id)
      ?.remove();

    const overlay =
      document.createElement('div');

    overlay.id = id;
    overlay.innerHTML = content;

    document.body.appendChild(
      overlay
    );

    return overlay;
  },

  // ============================================================
  // PRIMEIRO ACESSO — 7 DIAS GRÁTIS
  // ============================================================

  showTrialWelcomeIfNeeded(days) {
    const companyKey =
      this.getCompanyKey();

    const storageKey =
      `ks_trial_welcome_seen_${companyKey}`;

    if (
      localStorage.getItem(storageKey) === 'true'
    ) {
      return;
    }

    if (
      document.getElementById(
        'ks-trial-welcome'
      )
    ) {
      return;
    }

    const endsAt =
      this.info?.trial_ends_at
        ? new Date(
            this.info.trial_ends_at
          )
        : null;

    const endDate =
      endsAt &&
      !Number.isNaN(
        endsAt.getTime()
      )
        ? endsAt.toLocaleDateString(
            'pt-BR'
          )
        : null;

    const remainingText =
      days > 0
        ? `${days} ${
            days === 1
              ? 'dia'
              : 'dias'
          }`
        : '7 dias';

    const overlay =
      this.createModal(
        'ks-trial-welcome',
        `
        <div style="
          position:fixed;
          inset:0;
          z-index:2147483000;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          box-sizing:border-box;
          background:rgba(15,23,42,.58);
          backdrop-filter:blur(5px);
          font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        ">

          <div style="
            width:100%;
            max-width:480px;
            box-sizing:border-box;
            padding:36px 30px;
            border-radius:22px;
            background:#fff;
            box-shadow:0 24px 80px rgba(15,23,42,.22);
            text-align:center;
          ">

            <div style="
              width:64px;
              height:64px;
              margin:0 auto 20px;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              background:#eff6ff;
              font-size:30px;
            ">
              🎉
            </div>

            <h2 style="
              margin:0 0 12px;
              font-size:26px;
              line-height:1.2;
              color:#0f172a;
            ">
              Bem-vindo ao KS Stock!
            </h2>

            <p style="
              margin:0 auto 18px;
              max-width:390px;
              color:#64748b;
              line-height:1.65;
              font-size:15px;
            ">
              Você recebeu
              <strong style="color:#0f172a;">
                7 dias grátis
              </strong>
              para testar o sistema e conhecer todos os recursos disponíveis.
            </p>

            <div style="
              margin:0 auto 24px;
              padding:14px 16px;
              border-radius:12px;
              background:#f8fafc;
              color:#475569;
              font-size:14px;
            ">
              Período gratuito:
              <strong style="color:#0f172a;">
                ${remainingText}
              </strong>

              ${
                endDate
                  ? `
                    <br>
                    Termina em:
                    <strong style="color:#0f172a;">
                      ${endDate}
                    </strong>
                  `
                  : ''
              }
            </div>

            <button
              id="ks-trial-welcome-ok"
              type="button"
              style="
                width:100%;
                border:0;
                border-radius:12px;
                padding:14px 20px;
                background:#2563eb;
                color:#fff;
                font-size:15px;
                font-weight:700;
                cursor:pointer;
              "
            >
              OK, ENTENDI
            </button>

          </div>
        </div>
        `
      );

    overlay
      .querySelector(
        '#ks-trial-welcome-ok'
      )
      ?.addEventListener(
        'click',
        () => {
          localStorage.setItem(
            storageKey,
            'true'
          );

          overlay.remove();
        }
      );
  },

  // ============================================================
  // 3, 2 OU 1 DIA RESTANTE
  // ============================================================

  showTrialEndingWarning(days) {
    const companyKey =
      this.getCompanyKey();

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    const storageKey =
      `ks_trial_warning_seen_${companyKey}_${days}`;

    // Não mostra novamente no mesmo dia.
    if (
      localStorage.getItem(
        storageKey
      ) === today
    ) {
      return;
    }

    if (
      document.getElementById(
        'ks-trial-ending-warning'
      )
    ) {
      return;
    }

    const text =
      days === 1
        ? 'Seu período gratuito termina amanhã.'
        : `Você ainda tem ${days} dias do seu período gratuito.`;

    const overlay =
      this.createModal(
        'ks-trial-ending-warning',
        `
        <div style="
          position:fixed;
          inset:0;
          z-index:2147483000;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          box-sizing:border-box;
          background:rgba(15,23,42,.58);
          backdrop-filter:blur(5px);
          font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        ">

          <div style="
            width:100%;
            max-width:460px;
            box-sizing:border-box;
            padding:34px 28px;
            border-radius:22px;
            background:#fff;
            box-shadow:0 24px 80px rgba(15,23,42,.22);
            text-align:center;
          ">

            <div style="
              width:62px;
              height:62px;
              margin:0 auto 18px;
              border-radius:50%;
              display:flex;
              align-items:center;
              justify-content:center;
              background:#fff7ed;
              font-size:29px;
            ">
              ⚠️
            </div>

            <h2 style="
              margin:0 0 12px;
              font-size:24px;
              line-height:1.25;
              color:#0f172a;
            ">
              Seu período de teste está terminando
            </h2>

            <p style="
              margin:0 auto 24px;
              max-width:380px;
              color:#64748b;
              line-height:1.65;
              font-size:15px;
            ">
              ${text}
              Aproveite esse período para conhecer o KS Stock.
            </p>

            <button
              id="ks-trial-ending-ok"
              type="button"
              style="
                width:100%;
                border:0;
                border-radius:12px;
                padding:14px 20px;
                background:#2563eb;
                color:#fff;
                font-size:15px;
                font-weight:700;
                cursor:pointer;
              "
            >
              OK, ENTENDI
            </button>

          </div>
        </div>
        `
      );

    overlay
      .querySelector(
        '#ks-trial-ending-ok'
      )
      ?.addEventListener(
        'click',
        () => {
          localStorage.setItem(
            storageKey,
            today
          );

          overlay.remove();
        }
      );
  },

  // ============================================================
  // LIMITE DO PLANO
  // ============================================================

  showLimitMessage(
    resource,
    limit
  ) {
    const names = {
      products: 'produtos',
      customers: 'clientes',
      categories: 'categorias',
      users: 'usuários',
      sales: 'vendas'
    };

    const name =
      names[resource] ||
      resource;

    const message =
      `Seu plano permite até ${limit} ${name}.`;

    if (
      typeof UI !== 'undefined' &&
      UI.showToast
    ) {
      UI.showToast(
        'warning',
        'Limite do plano atingido',
        message
      );
    } else {
      alert(message);
    }
  },

  // ============================================================
  // MENSAGEM DE ACESSO
  // ============================================================

  showBlockedMessage() {
    const status =
      this.getStatus();

    let message =
      'Sua assinatura não está ativa.';

    if (status === 'expired') {
      message =
        'Seu período de teste terminou. Entre em contato para continuar usando o KS Stock.';
    } else if (
      status === 'suspended'
    ) {
      message =
        'Sua conta está suspensa. Entre em contato para regularizar o acesso.';
    } else if (
      status === 'cancelled'
    ) {
      message =
        'Sua assinatura foi cancelada. Entre em contato para reativar o acesso.';
    }

    if (
      typeof UI !== 'undefined' &&
      UI.showToast
    ) {
      UI.showToast(
        'warning',
        'Acesso limitado',
        message
      );
    } else {
      alert(message);
    }
  },

  // ============================================================
  // BLOQUEIO TOTAL
  // ============================================================

  showBlockedScreen() {
    if (
      document.getElementById(
        'ks-subscription-blocked'
      )
    ) {
      return;
    }

    const status =
      this.getStatus();

    let title =
      'Acesso bloqueado';

    let message =
      'Sua assinatura não está ativa. Entre em contato com o desenvolvedor para continuar utilizando o KS Stock.';

    if (
      status === 'expired'
    ) {
      title =
        'Período de teste encerrado';

      message =
        'Os 7 dias de teste da sua empresa chegaram ao fim. Para continuar utilizando o KS Stock, entre em contato com o desenvolvedor.';
    } else if (
      status === 'suspended'
    ) {
      title =
        'Conta suspensa';

      message =
        'O acesso da sua empresa está suspenso. Entre em contato com o desenvolvedor para regularizar o acesso.';
    } else if (
      status === 'cancelled'
    ) {
      title =
        'Assinatura cancelada';

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
          ">
            🔒
          </div>

          <h1 style="
            margin:0 0 12px;
            font-size:28px;
            line-height:1.2;
            color:#0f172a;
          ">
            ${title}
          </h1>

          <p style="
            margin:0 auto 28px;
            max-width:420px;
            line-height:1.7;
            color:#64748b;
            font-size:15px;
          ">
            ${message}
          </p>

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
          ">
            KS Stock
          </div>

        </div>
      </div>
    `;
  }
};

window.Subscription = Subscription;
