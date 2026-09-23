/**
 * KS STOCK — GESTÃO DE PRODUTOS
 * Listagem, filtros, cálculo de margem em tempo real, cadastro e edição
 */

const Produtos = {
  productsList: [],
  categoriesList: [],
  suppliersList: [],
  editingProductId: null,

  async init() {
    const authData = await Auth.requireAuth();
    if (!authData && CONFIG.isSupabaseConfigured()) return;

    this.bindEvents();
    await this.loadCategories();
    await this.loadSuppliers();
    await this.loadProducts();
  },

  bindEvents() {
    // Busca em tempo real com debounce
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
      searchInput.addEventListener('input', UI.debounce(() => this.filterProducts(), 250));
    }

    // Filtros de Categoria e Status de Estoque
    const filterCat = document.getElementById('filter-category');
    if (filterCat) {
      filterCat.addEventListener('change', () => this.filterProducts());
    }

    const filterStock = document.getElementById('filter-stock-status');
    if (filterStock) {
      filterStock.addEventListener('change', () => this.filterProducts());
    }

    // Cálculo automático de Margem de Lucro no Modal
    const costInput = document.getElementById('prod-cost-price');
    const saleInput = document.getElementById('prod-sale-price');

    if (costInput && saleInput) {
      const updateMargin = () => {
        const cost = parseFloat(costInput.value) || 0;
        const sale = parseFloat(saleInput.value) || 0;
        const marginValue = sale - cost;
        const marginPercent = sale > 0 ? ((marginValue / sale) * 100).toFixed(1) : 0;

        const displayEl = document.getElementById('margin-calc-display');
        if (displayEl) {
          displayEl.textContent = `${UI.formatBRL(marginValue)} (${marginPercent}%)`;
          displayEl.style.color = marginValue >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        }
      };

      costInput.addEventListener('input', updateMargin);
      saleInput.addEventListener('input', updateMargin);
    }

    // Submissão do Formulário de Produto
    const form = document.getElementById('form-product');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveProduct();
      });
    }
  },

  async loadCategories() {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data, error } = await client.from('categories').select('*').order('name');
      if (!error && data) {
        this.categoriesList = data;
        const selectFilter = document.getElementById('filter-category');
        const selectForm = document.getElementById('prod-category');

        let options = '<option value="">Todas as categorias</option>';
        let formOptions = '<option value="">Sem categoria</option>';

        data.forEach(c => {
          options += `<option value="${c.id}">${c.name}</option>`;
          formOptions += `<option value="${c.id}">${c.name}</option>`;
        });

        if (selectFilter) selectFilter.innerHTML = options;
        if (selectForm) selectForm.innerHTML = formOptions;
      }
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  },

  async loadSuppliers() {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data, error } = await client.from('suppliers').select('id, name').order('name');
      if (!error && data) {
        this.suppliersList = data;
        const selectForm = document.getElementById('prod-supplier');
        if (selectForm) {
          let opts = '<option value="">Sem fornecedor</option>';
          data.forEach(s => opts += `<option value="${s.id}">${s.name}</option>`);
          selectForm.innerHTML = opts;
        }
      }
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
    }
  },

  async loadProducts() {
    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('products-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4" style="color: #94a3b8;">
            Carregando produtos...
          </td>
        </tr>
      `;
    }

    try {
      const { data, error } = await client
        .from('products')
        .select(`
          *,
          categories ( id, name, color ),
          suppliers ( id, name )
        `)
        .order('name');

      if (error) {
        console.error('Erro ao buscar produtos:', error);
        UI.showToast('error', 'Erro', 'Não foi possível carregar os produtos.');
        return;
      }

      this.productsList = data || [];
      this.renderTable(this.productsList);
    } catch (err) {
      console.error('Erro na requisição de produtos:', err);
    }
  },

  filterProducts() {
    const query = (document.getElementById('search-products')?.value || '').toLowerCase().trim();
    const catId = document.getElementById('filter-category')?.value || '';
    const stockStatus = document.getElementById('filter-stock-status')?.value || '';

    const filtered = this.productsList.filter(p => {
      const matchesSearch = !query || 
        p.name.toLowerCase().includes(query) || 
        (p.sku && p.sku.toLowerCase().includes(query));

      const matchesCat = !catId || p.category_id === catId;

      let matchesStock = true;
      if (stockStatus === 'out') {
        matchesStock = p.stock_quantity <= 0;
      } else if (stockStatus === 'low') {
        matchesStock = p.stock_quantity > 0 && p.stock_quantity <= p.minimum_stock;
      } else if (stockStatus === 'ok') {
        matchesStock = p.stock_quantity > p.minimum_stock;
      }

      return matchesSearch && matchesCat && matchesStock;
    });

    this.renderTable(filtered);
  },

  renderTable(products) {
    const tbody = document.getElementById('products-tbody');
    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
              </div>
              <h4 class="empty-state-title">Nenhum produto encontrado</h4>
              <p class="empty-state-desc">Cadastre seu primeiro produto para começar a controlar o estoque do seu negócio com rapidez e clareza.</p>
              <button type="button" class="btn btn-primary" onclick="Produtos.openNewModal()">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Cadastrar Primeiro Produto
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const margin = (p.sale_price - p.cost_price);
      const marginPct = p.sale_price > 0 ? ((margin / p.sale_price) * 100).toFixed(0) : 0;
      const catBadge = p.categories 
        ? `<span class="badge" style="background-color: ${p.categories.color}15; color: ${p.categories.color}; border: 1px solid ${p.categories.color}40;">${p.categories.name}</span>` 
        : '<span style="color: #94a3b8; font-size: 0.8rem;">-</span>';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: var(--radius-md); background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #475569; font-size: 0.85rem;">
                ${p.name.substring(0, 1).toUpperCase()}
              </div>
              <div>
                <strong style="display: block; font-size: 0.92rem;">${p.name}</strong>
                <span style="font-size: 0.75rem; color: #94a3b8;">SKU: ${p.sku || 'N/A'}</span>
              </div>
            </div>
          </td>
          <td>${catBadge}</td>
          <td>${UI.getStockBadge(p.stock_quantity, p.minimum_stock)}</td>
          <td>${UI.formatBRL(p.cost_price)}</td>
          <td><strong>${UI.formatBRL(p.sale_price)}</strong></td>
          <td>
            <span style="color: ${margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600; font-size: 0.82rem;">
              ${UI.formatBRL(margin)} (${marginPct}%)
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="Produtos.openEditModal('${p.id}')" title="Editar">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button class="btn btn-secondary btn-sm" style="color: var(--color-danger);" onclick="Produtos.confirmDelete('${p.id}', '${p.name}')" title="Excluir">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openNewModal() {
    this.editingProductId = null;
    document.getElementById('modal-product-title').textContent = 'Novo Produto';
    document.getElementById('form-product').reset();
    document.getElementById('prod-stock-quantity').disabled = false;
    document.getElementById('margin-calc-display').textContent = 'R$ 0,00 (0%)';
    UI.openModal('modal-product');
  },

  openEditModal(id) {
    const prod = this.productsList.find(p => p.id === id);
    if (!prod) return;

    this.editingProductId = id;
    document.getElementById('modal-product-title').textContent = 'Editar Produto';

    document.getElementById('prod-name').value = prod.name || '';
    document.getElementById('prod-sku').value = prod.sku || '';
    document.getElementById('prod-category').value = prod.category_id || '';
    document.getElementById('prod-supplier').value = prod.supplier_id || '';
    document.getElementById('prod-cost-price').value = prod.cost_price;
    document.getElementById('prod-sale-price').value = prod.sale_price;
    document.getElementById('prod-stock-quantity').value = prod.stock_quantity;
    document.getElementById('prod-stock-quantity').disabled = true; // Alterações de estoque via tela de estoque
    document.getElementById('prod-min-stock').value = prod.minimum_stock;
    document.getElementById('prod-description').value = prod.description || '';

    // Calcula margem
    const margin = prod.sale_price - prod.cost_price;
    const marginPct = prod.sale_price > 0 ? ((margin / prod.sale_price) * 100).toFixed(1) : 0;
    const marginEl = document.getElementById('margin-calc-display');
    if (marginEl) {
      marginEl.textContent = `${UI.formatBRL(margin)} (${marginPct}%)`;
    }

    UI.openModal('modal-product');
  },

  async saveProduct() {
    const client = getSupabase();
    if (!client) return;

    const name = document.getElementById('prod-name').value.trim();
    const sku = document.getElementById('prod-sku').value.trim();
    const category_id = document.getElementById('prod-category').value || null;
    const supplier_id = document.getElementById('prod-supplier').value || null;
    const cost_price = parseFloat(document.getElementById('prod-cost-price').value) || 0;
    const sale_price = parseFloat(document.getElementById('prod-sale-price').value) || 0;
    const minimum_stock = parseInt(document.getElementById('prod-min-stock').value) || 5;
    const description = document.getElementById('prod-description').value.trim();

    if (!name) {
      UI.showToast('warning', 'Campos Obrigatórios', 'Informe o nome do produto.');
      return;
    }

    const saveBtn = document.getElementById('btn-save-product');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
      const user = Auth.getCurrentUser();
      const company_id = user ? user.company_id : null;

      if (this.editingProductId) {
        // Atualizar produto existente
        const { error } = await client
          .from('products')
          .update({
            name,
            sku,
            category_id,
            supplier_id,
            cost_price,
            sale_price,
            minimum_stock,
            description,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.editingProductId);

        if (error) throw error;
        UI.showToast('success', 'Atualizado!', 'Produto salvo com sucesso.');
      } else {
        // Criar novo produto
        const stock_quantity = parseInt(document.getElementById('prod-stock-quantity').value) || 0;

        const { data: newProd, error } = await client
          .from('products')
          .insert({
            company_id,
            name,
            sku,
            category_id,
            supplier_id,
            cost_price,
            sale_price,
            stock_quantity,
            minimum_stock,
            description
          })
          .select()
          .single();

        if (error) throw error;

        // Se tiver estoque inicial > 0, grava movimentação inicial
        if (stock_quantity > 0 && newProd) {
          await client.from('stock_movements').insert({
            company_id,
            product_id: newProd.id,
            user_id: user.id,
            type: 'entry',
            quantity: stock_quantity,
            previous_quantity: 0,
            new_quantity: stock_quantity,
            reason: 'Estoque inicial cadastrado'
          });
        }

        UI.showToast('success', 'Cadastrado!', 'Novo produto adicionado.');
      }

      UI.closeModal('modal-product');
      await this.loadProducts();
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      UI.showToast('error', 'Erro', 'Não foi possível salvar o produto. Tente novamente.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar Produto';
    }
  },

  confirmDelete(id, name) {
    UI.confirmAction(
      'Excluir Produto',
      `Tem certeza que deseja excluir "${name}"? O histórico associado permanecerá seguro no banco.`,
      async () => {
        const client = getSupabase();
        if (!client) return;

        try {
          const { error } = await client.from('products').delete().eq('id', id);
          if (error) {
            if (error.code === '23503') {
              UI.showToast('error', 'Não permitido', 'Este produto já possui vendas registradas e não pode ser excluído.');
            } else {
              UI.showToast('error', 'Erro', 'Falha ao remover produto.');
            }
            return;
          }

          UI.showToast('success', 'Removido', 'Produto excluído com sucesso.');
          await this.loadProducts();
        } catch (err) {
          console.error('Erro ao excluir:', err);
        }
      }
    );
  }
};

window.Produtos = Produtos;
document.addEventListener('DOMContentLoaded', () => Produtos.init());
