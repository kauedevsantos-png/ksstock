/**
 * KS STOCK — CONTROLE DE ASSINATURA
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
        console.error(
          'Erro ao consultar assinatura:',
          error
        );

        return false;
      }

      this.info = data;

      this.updateInterface();

      return this.isAllowed();

    } catch (err) {

      console.error(
        'Erro no Subscription:',
        err
      );

      return false;
    }
  },


  isAllowed() {

    if (!this.info) return false;

    return (
      this.info.status === 'trial' ||
      this.info.status === 'active'
    );
  },


  isExpired() {

    if (!this.info) return false;

    return (
      this.info.status === 'expired' ||
      this.info.status === 'suspended' ||
      this.info.status === 'cancelled'
    );
  },


  updateInterface() {

    if (!this.info) return;

    const status = this.info.status;
    const days = Number(
      this.info.days_remaining || 0
    );


    /*
     * AVISO DO TESTE
     */

    if (
      status === 'trial' &&
      days <= 3 &&
      days > 0
    ) {

      this.showTrialWarning(days);

    }


    /*
     * BLOQUEIO
     */

    if (this.isExpired()) {

      this.showBlockedScreen();

    }

  },


  showTrialWarning(days) {

    if (
      document.getElementById(
        'ks-trial-warning'
      )
    ) {
      return;
    }


    const warning = document.createElement(
      'div'
    );

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
        Seu período de teste termina
        em ${days} ${days === 1 ? 'dia' : 'dias'}.
        Para continuar utilizando o KS Stock,
        entre em contato com o desenvolvedor.
      </div>
    `;

    document.body.appendChild(warning);

  },


  showBlockedScreen() {

    /*
     * Impede a página de continuar sendo utilizada.
     */

    document.body.innerHTML = `

      <div style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:#f8fafc;
        font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      ">

        <div style="
          width:100%;
          max-width:520px;
          background:white;
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
            color:#0f172a;
          ">
            Período de teste encerrado
          </h1>

          <p style="
            margin:0 auto 28px;
            max-width:420px;
            line-height:1.7;
            color:#64748b;
            font-size:15px;
          ">
            Os 7 dias de teste da sua empresa
            chegaram ao fim.
            <br><br>
            Para continuar utilizando o KS Stock,
            entre em contato com o desenvolvedor.
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