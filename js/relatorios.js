/**
 * KS STOCK — RELATÓRIOS SIMPLES & INTELIGENTES
 * Faturamento, ticket médio, valor total do estoque e produtos mais vendidos
 */

const Relatorios = {
  async init() {
    const authData = await Auth.requireAuth();
    if (!authData && CONFIG.isSupabaseConfigured()) return;

    await this.loadFinancialMetrics();
    await this.loadInventoryValuation();
    await this.loadTopSellingProducts();
    await this.loadLowStockReport();
  },

  async loadFinancialMetrics() {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data: sales, error } = await client
        .from('sales')
        .select('total_amount, estimated_profit');

      if (!error && sales) {
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
        const totalProfit = sales.reduce((acc, s) => acc + Number(s.estimated_profit || 0), 0);
        const averageTicket = totalSales > 0 ? (totalRevenue / totalSales) : 0;

        document.getElementById('rep-total-revenue').textContent = UI.formatBRL(totalRevenue);
        document.getElementById('rep-sales-count').textContent = totalSales;
        document.getElementById('rep-avg-ticket').textContent = UI.formatBRL(averageTicket);
        document.getElementById('rep-estimated-profit').textContent = UI.formatBRL(totalProfit);
      }
    } catch (err) {
      console.error('Erro ao carregar métricas financeiras:', err);
    }
  },

  async loadInventoryValuation() {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data: products, error } = await client
        .from('products')
        .select('stock_quantity, cost_price, sale_price');

      if (!error && products) {
        let totalCostValuation = 0;
        let totalSaleValuation = 0;

        products.forEach(p => {
          const qty = p.stock_quantity || 0;
          totalCostValuation += qty * (p.cost_price || 0);
          totalSaleValuation += qty * (p.sale_price || 0);
        });

        document.getElementById('rep-stock-cost-valuation').textContent = UI.formatBRL(totalCostValuation);
        document.getElementById('rep-stock-sale-valuation').textContent = UI.formatBRL(totalSaleValuation);
        document.getElementById('rep-potential-profit').textContent = UI.formatBRL(totalSaleValuation - totalCostValuation);
      }
    } catch (err) {
      console.error('Erro ao calcular valor do estoque:', err);
    }
  },

  async loadTopSellingProducts() {
    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('rep-top-products-tbody');
    if (!tbody) return;

    try {
      const { data, error } = await client
        .from('sale_items')
        .select(`
          quantity,
          subtotal,
          products ( name, sku )
        `);

      if (error || !data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4" style="color: #94a3b8;">Nenhuma venda registrada ainda.</td></tr>`;
        return;
      }

      // Agrupa por produto
      const map = {};
      data.forEach(item => {
        const name = item.products ? item.products.name : 'Outro';
        if (!map[name]) {
          map[name] = { name, quantity: 0, revenue: 0 };
        }
        map[name].quantity += Number(item.quantity || 0);
        map[name].revenue += Number(item.subtotal || 0);
      });

      const sorted = Object.values(map).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

      tbody.innerHTML = sorted.map((item, idx) => `
        <tr>
          <td><strong style="color: var(--color-primary);">#${idx + 1}</strong></td>
          <td><strong>${item.name}</strong></td>
          <td><span class="badge badge-neutral">${item.quantity} un.</span></td>
          <td><strong>${UI.formatBRL(item.revenue)}</strong></td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Erro ao listar produtos mais vendidos:', err);
    }
  },

  async loadLowStockReport() {
    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('rep-low-stock-tbody');
    if (!tbody) return;

    try {
      const { data: products, error } = await client
        .from('products')
        .select('name, sku, stock_quantity, minimum_stock, cost_price')
        .order('stock_quantity', { ascending: true });

      if (error || !products) return;

      const critical = products.filter(p => p.stock_quantity <= p.minimum_stock);

      if (critical.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4" style="color: var(--color-success); font-weight: 500;">✓ Todos os produtos estão com estoque regular!</td></tr>`;
        return;
      }

      tbody.innerHTML = critical.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td>${UI.getStockBadge(p.stock_quantity, p.minimum_stock)}</td>
          <td>Mínimo: <strong>${p.minimum_stock}</strong></td>
          <td>${UI.formatBRL(p.cost_price)}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Erro ao gerar relatório de estoque baixo:', err);
    }
  }
};

window.Relatorios = Relatorios;
document.addEventListener('DOMContentLoaded', () => Relatorios.init());
