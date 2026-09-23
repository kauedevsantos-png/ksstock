/**
 * KS STOCK — UI HELPERS & COMPONENTES VISUAIS
 * Notificações Toasts, Modais, Formatadores de Moeda e Data, Badges de Estoque
 */

const UI = {
  // Notificações Toast
  showToast(type = 'info', title = '', message = '', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  // Modais
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Confirmação personalizada
  confirmAction(title, message, onConfirm) {
    let confirmModal = document.getElementById('modal-confirm-action');
    if (!confirmModal) {
      confirmModal = document.createElement('div');
      confirmModal.id = 'modal-confirm-action';
      confirmModal.className = 'modal-backdrop';
      confirmModal.innerHTML = `
        <div class="modal-dialog" style="max-width: 440px;">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-title">${title}</h3>
            <button type="button" class="btn-close-modal" onclick="UI.closeModal('modal-confirm-action')">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div class="modal-body">
            <p id="confirm-message" style="font-size: 0.92rem; color: #475569; line-height: 1.5;">${message}</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="UI.closeModal('modal-confirm-action')">Cancelar</button>
            <button type="button" class="btn btn-danger" id="btn-confirm-execute">Confirmar</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);
    } else {
      document.getElementById('confirm-title').innerText = title;
      document.getElementById('confirm-message').innerText = message;
    }

    const btnExec = document.getElementById('btn-confirm-execute');
    btnExec.onclick = () => {
      UI.closeModal('modal-confirm-action');
      if (typeof onConfirm === 'function') onConfirm();
    };

    UI.openModal('modal-confirm-action');
  },

  // Formatador de Moeda BRL
  formatBRL(value) {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  },

  // Formatador de Data
  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  },

  // Formatador de Data e Hora
  formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  // Badges de Status de Estoque
  getStockBadge(stock, minStock = 5) {
    const qty = Number(stock) || 0;
    const min = Number(minStock) || 0;

    if (qty <= 0) {
      return `<span class="badge badge-danger"><span class="badge-dot"></span>Sem estoque</span>`;
    }
    if (qty <= min) {
      return `<span class="badge badge-warning"><span class="badge-dot"></span>Estoque baixo (${qty})</span>`;
    }
    return `<span class="badge badge-success"><span class="badge-dot"></span>${qty} em estoque</span>`;
  },

  // Badge de Forma de Pagamento
  getPaymentMethodBadge(method) {
    const map = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      cartao_debito: 'Débito',
      cartao_credito: 'Crédito',
      outro: 'Outro'
    };
    return `<span class="badge badge-neutral">${map[method] || method}</span>`;
  },

  // Badge de Tipo de Movimentação
  getMovementTypeBadge(type) {
    const map = {
      entry: { label: 'Entrada', class: 'badge-success' },
      exit: { label: 'Saída', class: 'badge-danger' },
      adjustment: { label: 'Ajuste', class: 'badge-warning' },
      sale: { label: 'Venda', class: 'badge-neutral' }
    };
    const item = map[type] || { label: type, class: 'badge-neutral' };
    return `<span class="badge ${item.class}"><span class="badge-dot"></span>${item.label}</span>`;
  },

  // Banner avisando configuração pendente caso chaves não estejam cadastradas
  checkSupabaseBanner() {
    if (!CONFIG.isSupabaseConfigured()) {
      const banner = document.getElementById('config-alert-banner');
      if (banner) {
        banner.style.display = 'flex';
      }
    }
  },

  // Utilitário de debounce para pesquisas em tempo real
  debounce(func, wait = 300) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
};

window.UI = UI;
