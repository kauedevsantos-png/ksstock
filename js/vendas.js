/**
 * KS STOCK — GESTÃO DE VENDAS E PONTO DE VENDA (PDV RÁPIDO)
 * Fluxo simples: Selecionar produto -> Qtd -> Pagamento -> Concluir (Atômico)
 */

const Vendas = {
  salesList: [],
  productsList: [],
  customersList: [],

  async init() {
    const authData = await Auth.requireAuth();
    if (!authData && CONFIG.isSupabaseConfigured()) return;

    this.bindEvents();
    await this.loadProductsForSale();
    await this.loadCustomersForSale();
    await this.loadSales();
  },

  bindEvents() {
    // Atualiza preço unitário e estoque disponível ao selecionar produto
    const prodSelect = document.getElementById('sale-product-id');
    if (prodSelect) {
      prodSelect.addEventListener('change', () => {
        const prod = this.productsList.find(p => p.id === prodSelect.value);
        const priceInput = document.getElementById('sale-unit-price');
        const availStockEl = document.getElementById('sale-available-stock');

        if (prod) {
          if (priceInput) priceInput.value = prod.sale_price;
          if (availStockEl) {
            availStockEl.textContent = `${prod.stock_quantity} unidades disponíveis`;
            availStockEl.style.color = prod.stock_quantity > 0 ? 'var(--color-success)' : 'var(--color-danger)';
          }
        } else {
          if (priceInput) priceInput.value = '';
          if (availStockEl) availStockEl.textContent = '-';
        }
        this.updateSaleTotal();
      });
    }

    const qtyInput = document.getElementById('sale-quantity');
    const priceInput = document.getElementById('sale-unit-price');
    if (qtyInput && priceInput) {
      qtyInput.addEventListener('input', () => this.updateSaleTotal());
      priceInput.addEventListener('input', () => this.updateSaleTotal());
    }

    // Formulário de Venda
    const form = document.getElementById('form-sale');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.executeSale();
      });
    }
  },

  updateSaleTotal() {
    const qty = parseInt(document.getElementById('sale-quantity')?.value) || 0;
    const price = parseFloat(document.getElementById('sale-unit-price')?.value) || 0;
    const total = qty * price;
    const totalEl = document.getElementById('sale-total-display');
    if (totalEl) {
      totalEl.textContent = UI.formatBRL(total);
    }
  },

  async loadProductsForSale() {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('products')
        .select('id, name, sale_price, stock_quantity')
        .order('name');

      if (!error && data) {
        this.productsList = data;
        const select = document.getElementById('sale-product-id');
        if (select) {
          let opts = '<option value="">Selecione o produto...</option>';
          data.forEach(p => {
            const outFlag = p.stock_quantity <= 0 ? ' (SEM ESTOQUE)' : ` (${p.stock_quantity} em estoque)`;
            opts += `<option value="${p.id}" ${p.stock_quantity <= 0 ? 'disabled' : ''}>${p.name}${outFlag}</option>`;
          });
          select.innerHTML = opts;
        }
      }
    } catch (err) {
      console.error('Erro ao carregar produtos para venda:', err);
    }
  },

  async loadCustomersForSale() {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data, error } = await client.from('customers').select('id, name').order('name');
      if (!error && data) {
        this.customersList = data;
        const select = document.getElementById('sale-customer-id');
        if (select) {
          let opts = '<option value="">Consumidor Final (Opcional)</option>';
          data.forEach(c => {
            opts += `<option value="${c.id}">${c.name}</option>`;
          });
          select.innerHTML = opts;
        }
      }
    } catch (err) {
      console.error('Erro ao carregar clientes para venda:', err);
    }
  },

  async loadSales() {
    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('sales-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4" style="color: #94a3b8;">
            Carregando histórico de vendas...
          </td>
        </tr>
      `;
    }

    try {
      const { data, error } = await client
        .from('sales')
        .select(`
          id,
          total_amount,
          total_cost,
          estimated_profit,
          payment_method,
          notes,
          created_at,
          customers ( name ),
          profiles ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao buscar vendas:', error);
        UI.showToast('error', 'Erro', 'Falha ao carregar vendas.');
        return;
      }

      this.salesList = data || [];
      this.renderSalesTable(this.salesList);
    } catch (err) {
      console.error('Erro na requisição de vendas:', err);
    }
  },

  renderSalesTable(sales) {
    const tbody = document.getElementById('sales-tbody');
    if (!tbody) return;

    if (sales.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              </div>
              <h4 class="empty-state-title">Nenhuma venda realizada</h4>
              <p class="empty-state-desc">Registre vendas em segundos para ver o faturamento, lucro e estoque atualizados automaticamente.</p>
              <button type="button" class="btn btn-primary" onclick="Vendas.openSaleModal()">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Realizar Primeira Venda
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = sales.map(s => `
      <tr>
        <td>
          <strong style="font-family: monospace; color: var(--color-primary);">#${s.id.substring(0, 8)}</strong>
        </td>
        <td>
          <span style="font-size: 0.8rem; color: #64748b;">
            ${UI.formatDateTime(s.created_at)}
          </span>
        </td>
        <td>
          <strong>${s.customers ? s.customers.name : 'Consumidor Final'}</strong>
        </td>
        <td>${UI.getPaymentMethodBadge(s.payment_method)}</td>
        <td>
          <strong style="font-size: 0.95rem;">${UI.formatBRL(s.total_amount)}</strong>
        </td>
        <td>
          <span style="color: var(--color-success); font-weight: 600; font-size: 0.88rem;">
            ${UI.formatBRL(s.estimated_profit)}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="Vendas.viewSaleDetails('${s.id}')">
            Ver Detalhes
          </button>
        </td>
      </tr>
    `).join('');
  },

  openSaleModal() {
    document.getElementById('form-sale').reset();
    document.getElementById('sale-available-stock').textContent = '-';
    document.getElementById('sale-total-display').textContent = 'R$ 0,00';
    UI.openModal('modal-sale');
  },

  async executeSale() {
    const client = getSupabase();
    if (!client) return;

    const productId = document.getElementById('sale-product-id').value;
    const quantity = parseInt(document.getElementById('sale-quantity').value) || 1;
    const unitPrice = parseFloat(document.getElementById('sale-unit-price').value);
    const customerId = document.getElementById('sale-customer-id').value || null;
    const paymentMethod = document.getElementById('sale-payment-method').value;
    const notes = document.getElementById('sale-notes').value.trim();

    if (!productId) {
      UI.showToast('warning', 'Atenção', 'Selecione um produto.');
      return;
    }

    if (quantity <= 0) {
      UI.showToast('warning', 'Atenção', 'Informe uma quantidade válida.');
      return;
    }

    const prod = this.productsList.find(p => p.id === productId);
    if (prod && prod.stock_quantity < quantity) {
      UI.showToast('error', 'Estoque Insuficiente', `Disponível em estoque apenas: ${prod.stock_quantity}`);
      return;
    }

    const submitBtn = document.getElementById('btn-finish-sale');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Finalizando Venda...';

    try {
      // Monta array de itens da venda (no formato jsonb para RPC atômica)
      const itemsPayload = [
        {
          product_id: productId,
          quantity: quantity,
          unit_price: unitPrice
        }
      ];

      // Dispara a RPC atômica no Supabase
      const { data, error } = await client.rpc('process_sale_atomic', {
        p_customer_id: customerId,
        p_payment_method: paymentMethod,
        p_notes: notes || null,
        p_items: itemsPayload
      });

      if (error) {
        console.error('Erro na RPC de venda:', error);
        UI.showToast('error', 'Falha ao Finalizar', error.message || 'Não foi possível concluir a venda.');
        return;
      }

      UI.showToast('success', 'Venda Realizada!', `Venda #${data.sale_id.substring(0, 8)} gravada com sucesso.`);
      UI.closeModal('modal-sale');

      // Atualiza listas e saldo
      await this.loadProductsForSale();
      await this.loadSales();
    } catch (err) {
      console.error('Erro ao executar venda:', err);
      UI.showToast('error', 'Erro', 'Falha de comunicação com o servidor.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Finalizar Venda';
    }
  },

  async viewSaleDetails(saleId) {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data: sale, error: saleErr } = await client
        .from('sales')
        .select(`
          id,
          total_amount,
          total_cost,
          estimated_profit,
          payment_method,
          notes,
          created_at,
          customers ( name, phone, email ),
          profiles ( name )
        `)
        .eq('id', saleId)
        .single();

      if (saleErr || !sale) {
        UI.showToast('error', 'Erro', 'Não foi possível carregar os detalhes da venda.');
        return;
      }

      const { data: items, error: itemsErr } = await client
        .from('sale_items')
        .select(`
          quantity,
          unit_price,
          subtotal,
          products ( name, sku )
        `)
        .eq('sale_id', saleId);

      const itemsHtml = (items || []).map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px dashed var(--border-color);">
          <div>
            <strong>${item.products ? item.products.name : 'Produto'}</strong>
            <span style="display: block; font-size: 0.75rem; color: #94a3b8;">${item.quantity}x ${UI.formatBRL(item.unit_price)}</span>
          </div>
          <strong style="font-size: 0.95rem;">${UI.formatBRL(item.subtotal)}</strong>
        </div>
      `).join('');

      const detailContent = document.getElementById('sale-detail-content');
      if (detailContent) {
        detailContent.innerHTML = `
          <div style="text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
            <div style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Comprovante de Venda</div>
            <h3 style="font-size: 1.3rem; margin-top: 0.2rem; color: var(--color-primary);">#${sale.id.substring(0, 8)}</h3>
            <span style="font-size: 0.82rem; color: #64748b;">${UI.formatDateTime(sale.created_at)}</span>
          </div>

          <div style="margin-bottom: 1rem; font-size: 0.88rem; display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Cliente:</span>
            <strong>${sale.customers ? sale.customers.name : 'Consumidor Final'}</strong>
          </div>
          <div style="margin-bottom: 1rem; font-size: 0.88rem; display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Forma de Pagamento:</span>
            ${UI.getPaymentMethodBadge(sale.payment_method)}
          </div>
          <div style="margin-bottom: 1.25rem; font-size: 0.88rem; display: flex; justify-content: space-between;">
            <span style="color: #64748b;">Vendedor:</span>
            <strong>${sale.profiles ? sale.profiles.name : '-'}</strong>
          </div>

          <div style="margin-top: 1.25rem; margin-bottom: 0.5rem; font-weight: 700; font-size: 0.85rem; color: #475569; text-transform: uppercase;">
            Itens da Venda
          </div>
          <div style="margin-bottom: 1.5rem;">
            ${itemsHtml}
          </div>

          <div style="background: #f8fafc; border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 700;">
              <span>Total Pago:</span>
              <span style="color: var(--color-text-main);">${UI.formatBRL(sale.total_amount)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--color-success); font-weight: 600;">
              <span>Lucro Estimado:</span>
              <span>${UI.formatBRL(sale.estimated_profit)}</span>
            </div>
          </div>
        `;
      }

      UI.openModal('modal-sale-details');
    } catch (err) {
      console.error('Erro ao abrir detalhes da venda:', err);
    }
  }
};

window.Vendas = Vendas;
document.addEventListener('DOMContentLoaded', () => Vendas.init());
