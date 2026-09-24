/**
 * KS STOCK — CONTROLADOR GLOBAL DO LAYOUT (APP SHELL)
 * Responsividade, menu mobile, navegação ativa, intro de entrada
 * e bindings comuns
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================
  // 0. INTRO — SOMENTE AO ENTRAR NO SISTEMA APÓS LOGIN
  // =========================================================

  if (
    sessionStorage.getItem('ks_show_system_intro') === '1'
  ) {
    document.body.classList.add('ks-system-entry');

    sessionStorage.removeItem(
      'ks_show_system_intro'
    );
  }


  // =========================================================
  // 1. TOGGLE DO MENU MOBILE
  // =========================================================

  const btnToggle =
    document.getElementById('btn-menu-toggle');

  const sidebar =
    document.getElementById('app-sidebar');

  const backdrop =
    document.getElementById('sidebar-backdrop');


  if (btnToggle && sidebar) {

    btnToggle.addEventListener('click', () => {

      sidebar.classList.toggle(
        'mobile-open'
      );

      if (backdrop) {

        backdrop.classList.toggle(
          'active'
        );

      }

    });

  }


  if (backdrop && sidebar) {

    backdrop.addEventListener('click', () => {

      sidebar.classList.remove(
        'mobile-open'
      );

      backdrop.classList.remove(
        'active'
      );

    });

  }


  // =========================================================
  // 2. DESTACAR ITEM ATIVO NA NAVEGAÇÃO LATERAL
  // =========================================================

  const currentPath =
    window.location.pathname
      .split('/')
      .pop() ||
    'dashboard.html';

  const navLinks =
    document.querySelectorAll(
      '.sidebar-nav .nav-item'
    );


  navLinks.forEach(link => {

    const href =
      link.getAttribute('href');

    if (
      href === currentPath ||
      (
        currentPath === '' &&
        href === 'dashboard.html'
      )
    ) {

      link.classList.add('active');

    } else {

      link.classList.remove('active');

    }

  });


  // =========================================================
  // 3. VINCULAR BOTÕES DE LOGOUT
  // =========================================================

  const logoutButtons =
    document.querySelectorAll(
      '.btn-logout-action'
    );


  logoutButtons.forEach(btn => {

    btn.addEventListener(
      'click',
      (e) => {

        e.preventDefault();

        UI.confirmAction(
          'Encerrar Sessão',
          'Deseja realmente sair da sua conta no KS Stock?',
          () => {

            Auth.signOut();

          }
        );

      }
    );

  });

});
