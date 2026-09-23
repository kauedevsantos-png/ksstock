/**
 * KS STOCK — GESTÃO DE ESTOQUE E AUDITORIA DE MOVIMENTAÇÕES
 * Entradas, saídas manuais, balanço de inventário e rastreabilidade total
 */

const Estoque = {
  movementsList: [],
  productsList: [],

  async init() {
    const authData = await Auth.requireAuth();
    if (!authData && CONFIG.isSupabaseConfigured()) return;

    this.bindEvents();
    await this.loadProductsSelect();
    await this.loadStockOverview();
    await this.loadMovements();
  },

  bindEvents() {
    // Filtro por tipo de movimentação
    const filterType = document.getElementById('filter-movement-type');
    if (filterType) {
      filterType.addEventListener('change', () => this.filterMovements());
    }

    // Formulário de movimentação de estoque
    const form = document.getElementById('form-movement');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveMovement();
      });
    }

    // Atualiza saldo atual quando seleciona o produto no modal
    const prodSelect = document.getElementById('mov-product-id');
    if (prodSelect) {
      prodSelect.addEventListener('change', () => {
        const prod = this.productsList.find(p => p.id === prodSelect.value);
        const currentStockEl = document.getElementById('mov-current-stock');
        if (currentStockEl) {
          currentStockEl.textContent = prod ? `${prod.stock_quantity} unidades` : '-';
        }
      });
    }
  },

  async loadProductsSelect() {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('products')
        .select('id, name, stock_quantity, cost_price')
        .order('name');

      if (!error && data) {
        this.productsList = data;
        const select = document.getElementById('mov-product-id');
        if (select) {
          let opts = '<option value="">Selecione um produto...</option>';
          data.forEach(p => {
            opts += `<option value="${p.id}">${p.name} (Atual: ${p.stock_quantity})</option>`;
          });
          select.innerHTML = opts;
        }
      }
    } catch (err) {
      console.error('Erro ao carregar produtos para estoque:', err);
    }
  },

  async loadStockOverview() {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('products')
        .select('stock_quantity, cost_price, minimum_stock');

      if (!error && data) {
        const totalItems = data.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
        const totalValue = data.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.cost_price || 0)), 0);
        const lowStockCount = data.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.minimum_stock).length;
        const outOfStockCount = data.filter(p => p.stock_quantity <= 0).length;

        const elItems = document.getElementById('stock-total-items');
        const elVal = document.getElementById('stock-total-valuation');
        const elLow = document.getElementById('stock-low-count');
        const elOut = document.getElementById('stock-out-count');

        if (elItems) elItems.textContent = totalItems.toLocaleString('pt-BR');
        if (elVal) elVal.textContent = UI.formatBRL(totalValue);
        if (elLow) elLow.textContent = lowStockCount;
        if (elOut) elOut.textContent = outOfStockCount;
      }
    } catch (err) {
      console.error('Erro ao carregar resumo de estoque:', err);
    }
  },

  async loadMovements() {
    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('movements-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4" style="color: #94a3b8;">
            Carregando histórico de movimentações...
          </td>
        </tr>
      `;
    }

    try {
      const { data, error } = await client
        .from('stock_movements')
        .select(`
          id,
          type,
          quantity,
          previous_quantity,
          new_quantity,
          reason,
          created_at,
          products ( name ),
          profiles ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao buscar movimentações:', error);
        UI.showToast('error', 'Erro', 'Falha ao carregar movimentações.');
        return;
      }

      this.movementsList = data || [];
      this.renderTable(this.movementsList);
    } catch (err) {
      console.error('Erro na requisição de movimentações:', err);
    }
  },

  filterMovements() {
    const type = document.getElementById('filter-movement-type')?.value || '';
    const filtered = this.movementsList.filter(m => !type || m.type === type);
    this.renderTable(filtered);
  },

  renderTable(movements) {
    const tbody = document.getElementById('movements-tbody');
    if (!tbody) return;

    if (movements.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              </div>
              <h4 class="empty-state-title">Nenhuma movimentação registrada</h4>
              <p class="empty-state-desc">Movimentações de entrada, saída, ajustes e vendas aparecem aqui automaticamente.</p>
              <button type="button" class="btn btn-primary" onclick="Estoque.openMovementModal()">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Registrar Movimentação
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = movements.map(m => `
      <tr>
        <td>
          <span style="font-size: 0.8rem; color: #64748b;">
            ${UI.formatDateTime(m.created_at)}
          </span>
        </td>
        <td>
          <strong>${m.products ? m.products.name : 'Produto removido'}</strong>
        </td>
        <td>${UI.getMovementTypeBadge(m.type)}</td>
        <td>
          <span style="font-weight: 700; color: ${m.type === 'entry' ? 'var(--color-success)' : m.type === 'exit' || m.type === 'sale' ? 'var(--color-danger)' : 'var(--color-text-main)'};">
            ${m.type === 'entry' ? '+' : m.type === 'exit' || m.type === 'sale' ? '-' : ''}${m.quantity}
          </span>
        </td>
        <td>
          <span style="color: #64748b; font-size: 0.82rem;">
            ${m.previous_quantity} &rarr; <strong>${m.new_quantity}</strong>
          </span>
        </td>
        <td>
          <span style="color: #475569; font-size: 0.85rem;">${m.reason || '-'}</span>
        </td>
        <td>
          <span style="color: #64748b; font-size: 0.82rem;">
            ${m.profiles ? m.profiles.name : 'Sistema'}
          </span>
        </td>
      </tr>
    `).join('');
  },

  openMovementModal(type = 'entry') {
    document.getElementById('form-movement').reset();
    document.getElementById('mov-type').value = type;
    document.getElementById('mov-current-stock').textContent = '-';
    UI.openModal('modal-movement');
  },

  async saveMovement() {
    const client = getSupabase();
    if (!client) return;

    const productId = document.getElementById('mov-product-id').value;
    const type = document.getElementById('mov-type').value;
    const quantity = parseInt(document.getElementById('mov-quantity').value);
    const reason = document.getElementById('mov-reason').value.trim();

    if (!productId) {
      UI.showToast('warning', 'Campos Obrigatórios', 'Selecione um produto.');
      return;
    }

    if (!quantity || quantity <= 0) {
      UI.showToast('warning', 'Atenção', 'Informe uma quantidade válida.');
      return;
    }

    const saveBtn = document.getElementById('btn-save-movement');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Processando...';

    try {
      // Chama a RPC atômica adjust_stock_atomic
      const { data, error } = await client.rpc('adjust_stock_atomic', {
        p_product_id: productId,
        p_type: type,
        p_quantity: quantity,
        p_reason: reason || 'Movimentação manual'
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('Estoque insuficiente')) {
          msg = 'Estoque insuficiente para efetuar esta saída.';
        }
        UI.showToast('error', 'Falha na Movimentação', msg);
        return;
      }

      UI.showToast('success', 'Sucesso!', 'Estoque atualizado com sucesso.');
      UI.closeModal('modal-movement');

      // Recarrega dados
      await this.loadProductsSelect();
      await this.loadStockOverview();
      await this.loadMovements();
    } catch (err) {
      console.error('Erro na movimentação:', err);
      UI.showToast('error', 'Erro', 'Falha ao processar movimentação.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Confirmar Movimentação';
    }
  }
};

window.Estoque = Estoque;
document.addEventListener('DOMContentLoaded', () => Estoque.init());
