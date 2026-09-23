/**
 * KS STOCK — GESTÃO DE FORNECEDORES
 * Cadastro simples de parceiros e fornecedores de produtos
 */

const Fornecedores = {
  suppliersList: [],
  editingSupplierId: null,

  async init() {
    const authData = await Auth.requireAuth();
    if (!authData && CONFIG.isSupabaseConfigured()) return;

    this.bindEvents();
    await this.loadSuppliers();
  },

  bindEvents() {
    const searchInput = document.getElementById('search-suppliers');
    if (searchInput) {
      searchInput.addEventListener('input', UI.debounce(() => this.filterSuppliers(), 250));
    }

    const form = document.getElementById('form-supplier');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSupplier();
      });
    }
  },

  async loadSuppliers() {
    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('suppliers-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4" style="color: #94a3b8;">
            Carregando fornecedores...
          </td>
        </tr>
      `;
    }

    try {
      const { data, error } = await client.from('suppliers').select('*').order('name');
      if (error) {
        console.error('Erro ao buscar fornecedores:', error);
        UI.showToast('error', 'Erro', 'Falha ao carregar lista de fornecedores.');
        return;
      }

      this.suppliersList = data || [];
      this.renderTable(this.suppliersList);
    } catch (err) {
      console.error('Erro na requisição de fornecedores:', err);
    }
  },

  filterSuppliers() {
    const query = (document.getElementById('search-suppliers')?.value || '').toLowerCase().trim();
    const filtered = this.suppliersList.filter(s => {
      return !query || 
        s.name.toLowerCase().includes(query) || 
        (s.email && s.email.toLowerCase().includes(query)) ||
        (s.phone && s.phone.includes(query));
    });
    this.renderTable(filtered);
  },

  renderTable(suppliers) {
    const tbody = document.getElementById('suppliers-tbody');
    if (!tbody) return;

    if (suppliers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              </div>
              <h4 class="empty-state-title">Nenhum fornecedor cadastrado</h4>
              <p class="empty-state-desc">Vincule fornecedores aos seus produtos para organizar compras e reposição de estoque.</p>
              <button type="button" class="btn btn-primary" onclick="Fornecedores.openNewModal()">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Cadastrar Fornecedor
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = suppliers.map(s => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-weight: 700;">
              ${s.name.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <strong>${s.name}</strong>
            </div>
          </div>
        </td>
        <td>${s.phone || '<span style="color: #94a3b8;">-</span>'}</td>
        <td>${s.email || '<span style="color: #94a3b8;">-</span>'}</td>
        <td><span style="color: #64748b; font-size: 0.85rem;">${s.notes || '-'}</span></td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="Fornecedores.openEditModal('${s.id}')" title="Editar">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
            </button>
            <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="Fornecedores.confirmDelete('${s.id}', '${s.name}')" title="Excluir">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openNewModal() {
    this.editingSupplierId = null;
    document.getElementById('modal-supplier-title').textContent = 'Novo Fornecedor';
    document.getElementById('form-supplier').reset();
    UI.openModal('modal-supplier');
  },

  openEditModal(id) {
    const supp = this.suppliersList.find(s => s.id === id);
    if (!supp) return;

    this.editingSupplierId = id;
    document.getElementById('modal-supplier-title').textContent = 'Editar Fornecedor';

    document.getElementById('supp-name').value = supp.name || '';
    document.getElementById('supp-phone').value = supp.phone || '';
    document.getElementById('supp-email').value = supp.email || '';
    document.getElementById('supp-notes').value = supp.notes || '';

    UI.openModal('modal-supplier');
  },

  async saveSupplier() {
    const client = getSupabase();
    if (!client) return;

    const name = document.getElementById('supp-name').value.trim();
    const phone = document.getElementById('supp-phone').value.trim();
    const email = document.getElementById('supp-email').value.trim();
    const notes = document.getElementById('supp-notes').value.trim();

    if (!name) {
      UI.showToast('warning', 'Atenção', 'Informe o nome do fornecedor.');
      return;
    }

    const saveBtn = document.getElementById('btn-save-supplier');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
      const user = Auth.getCurrentUser();
      const company_id = user ? user.company_id : null;

      if (this.editingSupplierId) {
        const { error } = await client
          .from('suppliers')
          .update({ name, phone, email, notes, updated_at: new Date().toISOString() })
          .eq('id', this.editingSupplierId);

        if (error) throw error;
        UI.showToast('success', 'Atualizado!', 'Fornecedor salvo com sucesso.');
      } else {
        const { error } = await client
          .from('suppliers')
          .insert({ company_id, name, phone, email, notes });

        if (error) throw error;
        UI.showToast('success', 'Cadastrado!', 'Fornecedor adicionado.');
      }

      UI.closeModal('modal-supplier');
      await this.loadSuppliers();
    } catch (err) {
      console.error('Erro ao salvar fornecedor:', err);
      UI.showToast('error', 'Erro', 'Falha ao salvar fornecedor.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar Fornecedor';
    }
  },

  confirmDelete(id, name) {
    UI.confirmAction(
      'Excluir Fornecedor',
      `Deseja realmente remover o fornecedor "${name}"?`,
      async () => {
        const client = getSupabase();
        if (!client) return;

        try {
          const { error } = await client.from('suppliers').delete().eq('id', id);
          if (error) throw error;

          UI.showToast('success', 'Removido', 'Fornecedor excluído com sucesso.');
          await this.loadSuppliers();
        } catch (err) {
          console.error('Erro ao excluir fornecedor:', err);
          UI.showToast('error', 'Erro', 'Não foi possível excluir o fornecedor.');
        }
      }
    );
  }
};

window.Fornecedores = Fornecedores;
document.addEventListener('DOMContentLoaded', () => Fornecedores.init());
