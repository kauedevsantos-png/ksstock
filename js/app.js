/**
 * KS STOCK — CONTROLADOR GLOBAL DO LAYOUT (APP SHELL)
 * Responsividade, menu mobile, navegação ativa e bindings comuns
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Toggle do Menu Mobile
  const btnToggle = document.getElementById('btn-menu-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (btnToggle && sidebar) {
    btnToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }

  // 2. Destacar item ativo na navegação lateral
  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // 3. Vincular botões de Logout
  const logoutButtons = document.querySelectorAll('.btn-logout-action');
  logoutButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      UI.confirmAction(
        'Encerrar Sessão',
        'Deseja realmente sair da sua conta no KS Stock?',
        () => {
          Auth.signOut();
        }
      );
    });
  });
});

/**
 * ============================================================
 * KS STOCK — CONTROLE DE ASSINATURA E LIMITES
 * ============================================================
 */
