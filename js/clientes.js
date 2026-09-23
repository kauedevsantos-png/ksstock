/**
 * KS STOCK — GESTÃO DE CLIENTES
 * Cadastro simples, busca rápida e histórico
 */

const Clientes = {
  customersList: [],
  editingCustomerId: null,

  async init() {
    const authData = await Auth.requireAuth();
    if (!authData && CONFIG.isSupabaseConfigured()) return;

    this.bindEvents();
    await this.loadCustomers();
  },

  bindEvents() {
    const searchInput = document.getElementById('search-customers');
    if (searchInput) {
      searchInput.addEventListener('input', UI.debounce(() => this.filterCustomers(), 250));
    }

    const form = document.getElementById('form-customer');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveCustomer();
      });
    }
  },

  async loadCustomers() {
    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('customers-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4" style="color: #94a3b8;">
            Carregando clientes...
          </td>
        </tr>
      `;
    }

    try {
      const { data, error } = await client.from('customers').select('*').order('name');
      if (error) {
        console.error('Erro ao buscar clientes:', error);
        UI.showToast('error', 'Erro', 'Falha ao carregar lista de clientes.');
        return;
      }

      this.customersList = data || [];
      this.renderTable(this.customersList);
    } catch (err) {
      console.error('Erro na requisição de clientes:', err);
    }
  },

  filterCustomers() {
    const query = (document.getElementById('search-customers')?.value || '').toLowerCase().trim();
    const filtered = this.customersList.filter(c => {
      return !query || 
        c.name.toLowerCase().includes(query) || 
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.phone && c.phone.includes(query));
    });
    this.renderTable(filtered);
  },

  renderTable(customers) {
    const tbody = document.getElementById('customers-tbody');
    if (!tbody) return;

    if (customers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </div>
              <h4 class="empty-state-title">Nenhum cliente cadastrado</h4>
              <p class="empty-state-desc">Cadastre clientes para associar às vendas e manter um histórico personalizado.</p>
              <button type="button" class="btn btn-primary" onclick="Clientes.openNewModal()">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Cadastrar Primeiro Cliente
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = customers.map(c => {
      const cleanPhone = c.phone ? c.phone.replace(/\D/g, '') : '';
      const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: #e0e7ff; color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 700;">
                ${c.name.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <strong>${c.name}</strong>
              </div>
            </div>
          </td>
          <td>
            ${c.phone ? `
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <span>${c.phone}</span>
                ${waLink ? `<a href="${waLink}" target="_blank" title="Abrir WhatsApp" style="color: #10b981; font-size: 0.75rem; font-weight: 600;">(WhatsApp)</a>` : ''}
              </div>
            ` : '<span style="color: #94a3b8;">-</span>'}
          </td>
          <td>${c.email || '<span style="color: #94a3b8;">-</span>'}</td>
          <td><span style="color: #64748b; font-size: 0.85rem;">${c.notes || '-'}</span></td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="Clientes.openEditModal('${c.id}')" title="Editar">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="Clientes.confirmDelete('${c.id}', '${c.name}')" title="Excluir">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openNewModal() {
    this.editingCustomerId = null;
    document.getElementById('modal-customer-title').textContent = 'Novo Cliente';
    document.getElementById('form-customer').reset();
    UI.openModal('modal-customer');
  },

  openEditModal(id) {
    const cust = this.customersList.find(c => c.id === id);
    if (!cust) return;

    this.editingCustomerId = id;
    document.getElementById('modal-customer-title').textContent = 'Editar Cliente';

    document.getElementById('cust-name').value = cust.name || '';
    document.getElementById('cust-phone').value = cust.phone || '';
    document.getElementById('cust-email').value = cust.email || '';
    document.getElementById('cust-notes').value = cust.notes || '';

    UI.openModal('modal-customer');
  },

  async saveCustomer() {
    const client = getSupabase();
    if (!client) return;

    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const email = document.getElementById('cust-email').value.trim();
    const notes = document.getElementById('cust-notes').value.trim();

    if (!name) {
      UI.showToast('warning', 'Atenção', 'Informe o nome do cliente.');
      return;
    }

    const saveBtn = document.getElementById('btn-save-customer');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
      const user = Auth.getCurrentUser();
      const company_id = user ? user.company_id : null;

      if (this.editingCustomerId) {
        const { error } = await client
          .from('customers')
          .update({ name, phone, email, notes, updated_at: new Date().toISOString() })
          .eq('id', this.editingCustomerId);

        if (error) throw error;
        UI.showToast('success', 'Atualizado!', 'Cliente salvo com sucesso.');
      } else {
        const { error } = await client
          .from('customers')
          .insert({ company_id, name, phone, email, notes });

        if (error) throw error;
        UI.showToast('success', 'Cadastrado!', 'Cliente adicionado.');
      }

      UI.closeModal('modal-customer');
      await this.loadCustomers();
    } catch (err) {
      console.error('Erro ao salvar cliente:', err);
      UI.showToast('error', 'Erro', 'Falha ao salvar dados do cliente.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar Cliente';
    }
  },

  confirmDelete(id, name) {
    UI.confirmAction(
      'Excluir Cliente',
      `Deseja realmente remover o cliente "${name}"?`,
      async () => {
        const client = getSupabase();
        if (!client) return;

        try {
          const { error } = await client.from('customers').delete().eq('id', id);
          if (error) throw error;

          UI.showToast('success', 'Removido', 'Cliente excluído com sucesso.');
          await this.loadCustomers();
        } catch (err) {
          console.error('Erro ao excluir cliente:', err);
          UI.showToast('error', 'Erro', 'Não foi possível excluir o cliente.');
        }
      }
    );
  }
};

window.Clientes = Clientes;
document.addEventListener('DOMContentLoaded', () => Clientes.init());
