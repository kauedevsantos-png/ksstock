/**
 * KS STOCK — DASHBOARD CONTROLLER
 * KPIs principais, métricas financeiras, gráfico de vendas e alertas
 */

const Dashboard = {
  chartInstance: null,
  activePeriod: '7days', // 'today', '7days', '30days', 'month'

  async init() {
    const authData = await Auth.requireAuth();
    if (!authData && CONFIG.isSupabaseConfigured()) return;

    await this.loadKPIs();
    await this.loadSalesChart(this.activePeriod);
    await this.loadRecentMovements();
  },

  // Carrega contadores e somatórios dos cards principais
  async loadKPIs() {
    const client = getSupabase();
    if (!client) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // 1. Vendas de Hoje
      const { data: salesToday, error: errToday } = await client
        .from('sales')
        .select('total_amount, estimated_profit')
        .gte('created_at', todayIso);

      let totalToday = 0;
      let profitToday = 0;
      if (!errToday && salesToday) {
        totalToday = salesToday.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
        profitToday = salesToday.reduce((acc, s) => acc + Number(s.estimated_profit || 0), 0);
      }
      document.getElementById('kpi-sales-today').textContent = UI.formatBRL(totalToday);

      // 2. Vendas no Mês e Lucro Estimado no Mês
      const { data: salesMonth, error: errMonth } = await client
        .from('sales')
        .select('total_amount, estimated_profit')
        .gte('created_at', firstDayOfMonth);

      let totalMonth = 0;
      let profitMonth = 0;
      if (!errMonth && salesMonth) {
        totalMonth = salesMonth.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
        profitMonth = salesMonth.reduce((acc, s) => acc + Number(s.estimated_profit || 0), 0);
      }
      document.getElementById('kpi-sales-month').textContent = UI.formatBRL(totalMonth);
      document.getElementById('kpi-profit-month').textContent = UI.formatBRL(profitMonth);

      // 3. Métricas de Produtos e Estoque
      const { data: products, error: errProd } = await client
        .from('products')
        .select('id, stock_quantity, minimum_stock');

      if (!errProd && products) {
        const totalProducts = products.length;
        const lowStock = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.minimum_stock).length;
        const outOfStock = products.filter(p => p.stock_quantity <= 0).length;

        document.getElementById('kpi-products-count').textContent = totalProducts;
        document.getElementById('kpi-low-stock').textContent = lowStock;
        document.getElementById('kpi-out-of-stock').textContent = outOfStock;
      }
    } catch (err) {
      console.error('Erro ao carregar KPIs:', err);
    }
  },

  // Configura e renderiza o gráfico de vendas
  async loadSalesChart(period = '7days') {
    this.activePeriod = period;

    // Atualiza botões de filtro
    document.querySelectorAll('.filter-pill').forEach(btn => {
      if (btn.dataset.period === period) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const client = getSupabase();
    if (!client) return;

    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '7days') {
      startDate.setDate(startDate.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '30days') {
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    }

    try {
      const { data: sales, error } = await client
        .from('sales')
        .select('total_amount, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar dados do gráfico:', error);
        return;
      }

      // Agrupa vendas por dia
      const daysMap = {};
      const labels = [];
      const values = [];

      let curr = new Date(startDate);
      const now = new Date();

      while (curr <= now) {
        const key = curr.toISOString().split('T')[0];
        const displayLabel = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(curr);
        daysMap[key] = { label: displayLabel, total: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      if (sales) {
        sales.forEach(s => {
          const key = s.created_at.split('T')[0];
          if (daysMap[key]) {
            daysMap[key].total += Number(s.total_amount || 0);
          }
        });
      }

      Object.keys(daysMap).forEach(k => {
        labels.push(daysMap[k].label);
        values.push(daysMap[k].total);
      });

      this.renderChart(labels, values);
    } catch (err) {
      console.error('Erro ao renderizar gráfico:', err);
    }
  },

  renderChart(labels, data) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    if (!window.Chart) {
      console.warn('Chart.js ainda não foi carregado.');
      return;
    }

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Vendas (R$)',
          data: data,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.08)',
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: '#4f46e5',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: 'Inter', size: 12 },
            bodyFont: { family: 'Inter', size: 13, weight: 'bold' },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` Total: ${UI.formatBRL(context.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#94a3b8' }
          },
          y: {
            border: { dash: [4, 4] },
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#94a3b8',
              callback: (val) => 'R$ ' + val
            }
          }
        }
      }
    });
  },

  // Carrega movimentações recentes no Dashboard
  async loadRecentMovements() {
    const client = getSupabase();
    if (!client) return;

    const tbody = document.getElementById('recent-movements-tbody');
    if (!tbody) return;

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
        .limit(6);

      if (error || !data || data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4" style="color: #94a3b8;">
              Nenhuma movimentação registrada recentemente.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(m => `
        <tr>
          <td>
            <strong>${m.products ? m.products.name : 'Produto removido'}</strong>
          </td>
          <td>${UI.getMovementTypeBadge(m.type)}</td>
          <td><strong>${m.quantity}</strong> un.</td>
          <td><span style="color: #64748b; font-size: 0.82rem;">${m.reason || '-'}</span></td>
          <td><span style="color: #64748b; font-size: 0.8rem;">${UI.formatDateTime(m.created_at)}</span></td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Erro ao carregar movimentações recentes:', err);
    }
  }
};

window.Dashboard = Dashboard;
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
