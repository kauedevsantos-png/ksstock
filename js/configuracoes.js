/**
 * KS STOCK — CONFIGURAÇÕES DA EMPRESA E CONTA
 * Perfil da empresa, usuários da equipe e detalhes do plano
 */

const Configuracoes = {
  async init() {
    const authData = await Auth.requireAuth();
    if (!authData && CONFIG.isSupabaseConfigured()) return;

    this.bindEvents();
    await this.loadCompanyData();
    await this.loadTeamMembers();
  },

  bindEvents() {
    const formCompany = document.getElementById('form-company-settings');
    if (formCompany) {
      formCompany.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveCompanySettings();
      });
    }

    const formUser = document.getElementById('form-user-profile');
    if (formUser) {
      formUser.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveUserProfile();
      });
    }
  },

  async loadCompanyData() {
    const user = Auth.getCurrentUser();
    if (!user || !user.company_id) return;

    const client = getSupabase();
    if (!client) return;

    try {
      const { data: company, error } = await client
        .from('companies')
        .select('*')
        .eq('id', user.company_id)
        .single();

      if (error || !company) return;

      const nameInput = document.getElementById('setting-company-name');
      const emailInput = document.getElementById('setting-company-email');
      const phoneInput = document.getElementById('setting-company-phone');
      const planBadge = document.getElementById('setting-company-plan');

      if (nameInput) nameInput.value = company.name || '';
      if (emailInput) emailInput.value = company.email || '';
      if (phoneInput) phoneInput.value = company.phone || '';
      if (planBadge) planBadge.textContent = (company.plan || 'Pro Trial').toUpperCase();

      // Perfil do usuário atual
      const userNameInput = document.getElementById('setting-user-name');
      const userEmailInput = document.getElementById('setting-user-email');
      const userRoleInput = document.getElementById('setting-user-role');

      if (userNameInput) userNameInput.value = user.name || '';
      if (userEmailInput) userEmailInput.value = user.email || '';
      if (userRoleInput) userRoleInput.value = user.role === 'admin' ? 'Administrador' : 'Funcionário';
    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err);
    }
  },

  async loadTeamMembers() {
    const user = Auth.getCurrentUser();
    if (!user || !user.company_id) return;

    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('team-tbody');
    if (!tbody) return;

    try {
      const { data: members, error } = await client
        .from('profiles')
        .select('name, email, role, created_at')
        .eq('company_id', user.company_id)
        .order('created_at');

      if (error || !members) return;

      tbody.innerHTML = members.map(m => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #e0e7ff; color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                ${m.name.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>${m.name}</strong>
              </div>
            </div>
          </td>
          <td>${m.email}</td>
          <td>
            <span class="badge ${m.role === 'admin' ? 'badge-neutral' : 'badge-neutral'}">
              ${m.role === 'admin' ? 'Administrador' : 'Funcionário'}
            </span>
          </td>
          <td><span style="color: #64748b; font-size: 0.8rem;">${UI.formatDate(m.created_at)}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    }
  },

  async saveCompanySettings() {
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'admin') {
      UI.showToast('error', 'Acesso Negado', 'Apenas administradores podem alterar os dados da empresa.');
      return;
    }

    const client = getSupabase();
    if (!client) return;

    const name = document.getElementById('setting-company-name').value.trim();
    const email = document.getElementById('setting-company-email').value.trim();
    const phone = document.getElementById('setting-company-phone').value.trim();

    if (!name) {
      UI.showToast('warning', 'Atenção', 'Informe o nome da empresa.');
      return;
    }

    try {
      const { error } = await client
        .from('companies')
        .update({ name, email, phone, updated_at: new Date().toISOString() })
        .eq('id', user.company_id);

      if (error) throw error;

      // Atualiza o cache local
      user.company_name = name;
      localStorage.setItem('ks_user_profile', JSON.stringify(user));
      Auth.updateUserUI(user);

      UI.showToast('success', 'Salvo!', 'Dados da empresa atualizados.');
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      UI.showToast('error', 'Erro', 'Falha ao atualizar dados da empresa.');
    }
  },

  async saveUserProfile() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const client = getSupabase();
    if (!client) return;

    const name = document.getElementById('setting-user-name').value.trim();

    if (!name) {
      UI.showToast('warning', 'Atenção', 'Informe seu nome.');
      return;
    }

    try {
      const { error } = await client
        .from('profiles')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      user.name = name;
      localStorage.setItem('ks_user_profile', JSON.stringify(user));
      Auth.updateUserUI(user);

      UI.showToast('success', 'Salvo!', 'Seu perfil foi atualizado.');
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      UI.showToast('error', 'Erro', 'Falha ao atualizar perfil.');
    }
  }
};

window.Configuracoes = Configuracoes;
document.addEventListener('DOMContentLoaded', () => Configuracoes.init());
