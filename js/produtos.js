/**
 * KS STOCK — GESTÃO DE PRODUTOS
 * Listagem, filtros, categorias, cálculo de margem,
 * cadastro e edição.
 */

const Produtos = {

  productsList: [],
  categoriesList: [],
  suppliersList: [],

  editingProductId: null,
  editingCategoryId: null,

  async init() {

    const authData = await Auth.requireAuth();

    if (!authData && CONFIG.isSupabaseConfigured()) {
      return;
    }

    this.bindEvents();

    await this.loadCategories();
    await this.loadSuppliers();
    await this.loadProducts();
  },

  bindEvents() {

    // ============================================================
    // BUSCA DE PRODUTOS
    // ============================================================

    const searchInput = document.getElementById('search-products');

    if (searchInput) {

      searchInput.addEventListener(
        'input',
        UI.debounce(() => this.filterProducts(), 250)
      );

    }


    // ============================================================
    // FILTRO DE CATEGORIA
    // ============================================================

    const filterCat = document.getElementById('filter-category');

    if (filterCat) {

      filterCat.addEventListener(
        'change',
        () => this.filterProducts()
      );

    }


    // ============================================================
    // FILTRO DE ESTOQUE
    // ============================================================

    const filterStock = document.getElementById('filter-stock-status');

    if (filterStock) {

      filterStock.addEventListener(
        'change',
        () => this.filterProducts()
      );

    }


    // ============================================================
    // CÁLCULO AUTOMÁTICO DE MARGEM
    // ============================================================

    const costInput = document.getElementById('prod-cost-price');
    const saleInput = document.getElementById('prod-sale-price');

    if (costInput && saleInput) {

      const updateMargin = () => {

        const cost =
          parseFloat(costInput.value) || 0;

        const sale =
          parseFloat(saleInput.value) || 0;

        const marginValue =
          sale - cost;

        const marginPercent =
          sale > 0
            ? ((marginValue / sale) * 100).toFixed(1)
            : 0;

        const displayEl =
          document.getElementById('margin-calc-display');

        if (displayEl) {

          displayEl.textContent =
            `${UI.formatBRL(marginValue)} (${marginPercent}%)`;

          displayEl.style.color =
            marginValue >= 0
              ? 'var(--color-success)'
              : 'var(--color-danger)';
        }
      };

      costInput.addEventListener(
        'input',
        updateMargin
      );

      saleInput.addEventListener(
        'input',
        updateMargin
      );
    }


    // ============================================================
    // FORMULÁRIO DE PRODUTO
    // ============================================================

    const form =
      document.getElementById('form-product');

    if (form) {

      form.addEventListener('submit', (e) => {

        e.preventDefault();

        this.saveProduct();

      });

    }
  },


  // ============================================================
  // CATEGORIAS
  // ============================================================

  async loadCategories() {

    const client = getSupabase();

    if (!client) return;

    try {

      const {
        data,
        error
      } = await client
        .from('categories')
        .select('*')
        .order('name');

      if (error) {
        console.error(
          'Erro ao carregar categorias:',
          error
        );

        return;
      }

      this.categoriesList = data || [];

      const selectFilter =
        document.getElementById(
          'filter-category'
        );

      const selectForm =
        document.getElementById(
          'prod-category'
        );


      // ------------------------------------------------------------
      // FILTRO
      // ------------------------------------------------------------

      let options =
        '<option value="">Todas as categorias</option>';


      // ------------------------------------------------------------
      // FORMULÁRIO
      // ------------------------------------------------------------

      let formOptions =
        '<option value="">Sem categoria</option>';


      this.categoriesList.forEach(category => {

        const safeName =
          this.escapeHtml(category.name);

        options += `
          <option value="${category.id}">
            ${safeName}
          </option>
        `;

        formOptions += `
          <option value="${category.id}">
            ${safeName}
          </option>
        `;

      });


      if (selectFilter) {
        selectFilter.innerHTML = options;
      }

      if (selectForm) {
        selectForm.innerHTML = formOptions;
      }


      this.renderCategoriesList();

    } catch (err) {

      console.error(
        'Erro ao carregar categorias:',
        err
      );

    }
  },


  // ============================================================
  // ABRIR GERENCIADOR DE CATEGORIAS
  // ============================================================

  openCategoriesModal() {

    this.cancelCategoryEdit();

    UI.openModal(
      'modal-categories'
    );

    this.renderCategoriesList();
  },


  // ============================================================
  // LISTAR CATEGORIAS
  // ============================================================

  renderCategoriesList() {

    const container =
      document.getElementById(
        'categories-list'
      );

    if (!container) return;


    if (!this.categoriesList.length) {

      container.innerHTML = `
        <div
          style="
            padding: 1.5rem;
            text-align: center;
            color: #94a3b8;
            border: 1px dashed #cbd5e1;
            border-radius: var(--radius-md);
          "
        >
          Nenhuma categoria cadastrada.
        </div>
      `;

      return;
    }


    // Conta quantos produtos existem em cada categoria.

    const counts = {};

    this.productsList.forEach(product => {

      if (product.category_id) {

        counts[product.category_id] =
          (counts[product.category_id] || 0) + 1;

      }

    });


    container.innerHTML =
      this.categoriesList
        .map(category => {

          const count =
            counts[category.id] || 0;

          const color =
            this.normalizeCategoryColor(
              category.color
            );

          const safeName =
            this.escapeHtml(
              category.name
            );

          const jsName =
            this.escapeJsString(
              category.name
            );


          return `
            <div
              style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 1rem;
                padding: 0.85rem 1rem;
                border: 1px solid #e2e8f0;
                border-radius: var(--radius-md);
                background: #fff;
              "
            >

              <div
                style="
                  display: flex;
                  align-items: center;
                  gap: 0.75rem;
                  min-width: 0;
                "
              >

                <span
                  style="
                    width: 12px;
                    height: 12px;
                    flex: 0 0 12px;
                    border-radius: 50%;
                    background: ${color};
                    box-shadow: 0 0 0 4px ${color}18;
                  "
                ></span>


                <div style="min-width: 0;">

                  <strong
                    style="
                      display: block;
                      color: #0f172a;
                      font-size: 0.9rem;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    "
                  >
                    ${safeName}
                  </strong>

                  <span
                    style="
                      font-size: 0.76rem;
                      color: #94a3b8;
                    "
                  >
                    ${count}
                    ${count === 1 ? 'produto' : 'produtos'}
                  </span>

                </div>

              </div>


              <div
                style="
                  display: flex;
                  gap: 0.4rem;
                  flex: 0 0 auto;
                "
              >

                <!-- EDITAR -->

                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  onclick="Produtos.editCategory('${category.id}')"
                  title="Editar categoria"
                >

                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    ></path>
                  </svg>

                </button>


                <!-- EXCLUIR -->

                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  style="color: var(--color-danger);"
                  onclick="Produtos.confirmDeleteCategory('${category.id}', '${jsName}')"
                  title="Excluir categoria"
                >

                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    ></path>
                  </svg>

                </button>

              </div>

            </div>
          `;

        })
        .join('');
  },


  // ============================================================
  // EDITAR CATEGORIA
  // ============================================================

  editCategory(id) {

    const category =
      this.categoriesList.find(
        item => item.id === id
      );

    if (!category) return;


    this.editingCategoryId = id;


    const nameInput =
      document.getElementById(
        'category-name'
      );

    const colorInput =
      document.getElementById(
        'category-color'
      );

    const saveBtn =
      document.getElementById(
        'btn-save-category'
      );

    const cancelBtn =
      document.getElementById(
        'btn-cancel-category-edit'
      );


    if (nameInput) {

      nameInput.value =
        category.name || '';

      nameInput.focus();

    }


    if (colorInput) {

      colorInput.value =
        this.normalizeCategoryColor(
          category.color
        );

    }


    if (saveBtn) {

      saveBtn.innerHTML = `
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>

        Salvar alteração
      `;

    }


    if (cancelBtn) {

      cancelBtn.style.display =
        'inline-flex';

    }
  },


  // ============================================================
  // CANCELAR EDIÇÃO DE CATEGORIA
  // ============================================================

  cancelCategoryEdit() {

    this.editingCategoryId = null;


    const nameInput =
      document.getElementById(
        'category-name'
      );

    const colorInput =
      document.getElementById(
        'category-color'
      );

    const saveBtn =
      document.getElementById(
        'btn-save-category'
      );

    const cancelBtn =
      document.getElementById(
        'btn-cancel-category-edit'
      );


    if (nameInput) {
      nameInput.value = '';
    }


    if (colorInput) {
      colorInput.value =
        '#4f46e5';
    }


    if (saveBtn) {

      saveBtn.innerHTML = `
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16M20 12H4"
          ></path>
        </svg>

        Adicionar
      `;

    }


    if (cancelBtn) {

      cancelBtn.style.display =
        'none';

    }
  },


  // ============================================================
  // SALVAR CATEGORIA
  // ============================================================

  async saveCategory() {

    const client =
      getSupabase();

    if (!client) return;


    const nameInput =
      document.getElementById(
        'category-name'
      );

    const colorInput =
      document.getElementById(
        'category-color'
      );

    const saveBtn =
      document.getElementById(
        'btn-save-category'
      );


    const name =
      (nameInput?.value || '')
        .trim();

    const color =
      this.normalizeCategoryColor(
        colorInput?.value
      );


    if (!name) {

      UI.showToast(
        'warning',
        'Campo obrigatório',
        'Informe o nome da categoria.'
      );

      nameInput?.focus();

      return;
    }


    if (name.length > 100) {

      UI.showToast(
        'warning',
        'Nome muito longo',
        'A categoria pode ter no máximo 100 caracteres.'
      );

      return;
    }


    if (saveBtn) {

      saveBtn.disabled = true;
      saveBtn.textContent =
        'Salvando...';

    }


    try {

      // ========================================================
      // EDITAR
      // ========================================================

      if (this.editingCategoryId) {

        const {
          error
        } = await client
          .from('categories')
          .update({
            name,
            color
          })
          .eq(
            'id',
            this.editingCategoryId
          );


        if (error) {
          throw error;
        }


        UI.showToast(
          'success',
          'Categoria atualizada',
          'As alterações foram salvas.'
        );

      }

      // ========================================================
      // CRIAR
      // ========================================================

      else {

        const user =
          Auth.getCurrentUser();

        const company_id =
          user
            ? user.company_id
            : null;


        if (!company_id) {

          throw new Error(
            'Empresa do usuário não encontrada.'
          );

        }


        const {
          error
        } = await client
          .from('categories')
          .insert({
            company_id,
            name,
            color
          });


        if (error) {
          throw error;
        }


        UI.showToast(
          'success',
          'Categoria criada',
          'Nova categoria adicionada.'
        );

      }


      this.cancelCategoryEdit();

      await this.loadCategories();

      await this.loadProducts();


    } catch (err) {

      console.error(
        'Erro ao salvar categoria:',
        err
      );


      if (err?.code === '23505') {

        UI.showToast(
          'warning',
          'Categoria duplicada',
          'Já existe uma categoria com esse nome.'
        );

      } else {

        UI.showToast(
          'error',
          'Erro',
          'Não foi possível salvar a categoria.'
        );

      }

    } finally {

      if (saveBtn) {

        saveBtn.disabled = false;

        saveBtn.innerHTML = `
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16M20 12H4"
            ></path>
          </svg>

          Adicionar
        `;

      }
    }
  },


  // ============================================================
  // EXCLUIR CATEGORIA
  // ============================================================

  confirmDeleteCategory(id, name) {

    UI.confirmAction(

      'Excluir Categoria',

      `Excluir "${name}"? Os produtos não serão excluídos. Eles ficarão sem categoria.`,

      async () => {

        const client =
          getSupabase();

        if (!client) return;


        try {

          // Primeiro remove a associação
          // dos produtos com a categoria.

          const {
            error: productsError
          } = await client
            .from('products')
            .update({
              category_id: null
            })
            .eq(
              'category_id',
              id
            );


          if (productsError) {
            throw productsError;
          }


          // Agora exclui a categoria.

          const {
            error: categoryError
          } = await client
            .from('categories')
            .delete()
            .eq(
              'id',
              id
            );


          if (categoryError) {
            throw categoryError;
          }


          UI.showToast(
            'success',
            'Categoria excluída',
            'A categoria foi removida e os produtos foram preservados.'
          );


          if (
            this.editingCategoryId === id
          ) {

            this.cancelCategoryEdit();

          }


          await this.loadCategories();

          await this.loadProducts();

          this.filterProducts();


        } catch (err) {

          console.error(
            'Erro ao excluir categoria:',
            err
          );


          UI.showToast(
            'error',
            'Erro',
            'Não foi possível excluir a categoria.'
          );

        }

      }

    );
  },


  // ============================================================
  // NORMALIZAR COR
  // ============================================================

  normalizeCategoryColor(color) {

    const value =
      String(color || '')
        .trim();


    if (
      /^#[0-9A-Fa-f]{6}$/.test(value)
    ) {

      return value;

    }


    return '#4f46e5';
  },


  // ============================================================
  // ESCAPAR HTML
  // ============================================================

  escapeHtml(value) {

    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  },


  // ============================================================
  // ESCAPAR TEXTO PARA ONCLICK
  // ============================================================

  escapeJsString(value) {

    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ');

  },


  // ============================================================
  // FORNECEDORES
  // ============================================================

  async loadSuppliers() {

    const client =
      getSupabase();

    if (!client) return;


    try {

      const {
        data,
        error
      } = await client
        .from('suppliers')
        .select('id, name')
        .order('name');


      if (!error && data) {

        this.suppliersList =
          data;


        const selectForm =
          document.getElementById(
            'prod-supplier'
          );


        if (selectForm) {

          let opts =
            '<option value="">Sem fornecedor</option>';


          data.forEach(s => {

            opts += `
              <option value="${s.id}">
                ${this.escapeHtml(s.name)}
              </option>
            `;

          });


          selectForm.innerHTML =
            opts;

        }

      }

    } catch (err) {

      console.error(
        'Erro ao carregar fornecedores:',
        err
      );

    }
  },


  // ============================================================
  // PRODUTOS
  // ============================================================

  async loadProducts() {

    const client =
      getSupabase();

    if (!client) return;


    const tbody =
      document.getElementById(
        'products-tbody'
      );


    if (tbody) {

      tbody.innerHTML = `
        <tr>
          <td
            colspan="7"
            class="text-center py-4"
            style="color: #94a3b8;"
          >
            Carregando produtos...
          </td>
        </tr>
      `;

    }


    try {

      const {
        data,
        error
      } = await client

        .from('products')

        .select(`
          *,
          categories ( id, name, color ),
          suppliers ( id, name )
        `)

        .order('name');


      if (error) {

        console.error(
          'Erro ao buscar produtos:',
          error
        );

        UI.showToast(
          'error',
          'Erro',
          'Não foi possível carregar os produtos.'
        );

        return;
      }


      this.productsList =
        data || [];


      this.renderTable(
        this.productsList
      );


      this.renderCategoriesList();


    } catch (err) {

      console.error(
        'Erro na requisição de produtos:',
        err
      );

    }
  },


  // ============================================================
  // FILTROS
  // ============================================================

  filterProducts() {

    const query =
      (
        document.getElementById(
          'search-products'
        )?.value || ''
      )
        .toLowerCase()
        .trim();


    const catId =
      document.getElementById(
        'filter-category'
      )?.value || '';


    const stockStatus =
      document.getElementById(
        'filter-stock-status'
      )?.value || '';


    const filtered =
      this.productsList.filter(
        product => {

          const productName =
            String(
              product.name || ''
            )
              .toLowerCase();


          const productSku =
            String(
              product.sku || ''
            )
              .toLowerCase();


          const matchesSearch =
            !query ||
            productName.includes(query) ||
            productSku.includes(query);


          const matchesCat =
            !catId ||
            product.category_id === catId;


          let matchesStock =
            true;


          if (
            stockStatus === 'out'
          ) {

            matchesStock =
              product.stock_quantity <= 0;

          } else if (
            stockStatus === 'low'
          ) {

            matchesStock =
              product.stock_quantity > 0 &&
              product.stock_quantity <=
                product.minimum_stock;

          } else if (
            stockStatus === 'ok'
          ) {

            matchesStock =
              product.stock_quantity >
                product.minimum_stock;

          }


          return (
            matchesSearch &&
            matchesCat &&
            matchesStock
          );

        }
      );


    this.renderTable(
      filtered
    );
  },


  // ============================================================
  // TABELA
  // ============================================================

  renderTable(products) {

    const tbody =
      document.getElementById(
        'products-tbody'
      );


    if (!tbody) return;


    if (products.length === 0) {

      tbody.innerHTML = `
        <tr>

          <td colspan="7">

            <div class="empty-state">

              <div class="empty-state-icon">

                <svg
                  width="28"
                  height="28"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  ></path>
                </svg>

              </div>


              <h4 class="empty-state-title">
                Nenhum produto encontrado
              </h4>


              <p class="empty-state-desc">
                Cadastre seu primeiro produto para começar a controlar o estoque do seu negócio com rapidez e clareza.
              </p>


              <button
                type="button"
                class="btn btn-primary"
                onclick="Produtos.openNewModal()"
              >

                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>

                Cadastrar Primeiro Produto

              </button>

            </div>

          </td>

        </tr>
      `;

      return;
    }


    tbody.innerHTML =
      products
        .map(product => {

          const margin =
            (
              product.sale_price -
              product.cost_price
            );


          const marginPct =
            product.sale_price > 0
              ? (
                  (
                    margin /
                    product.sale_price
                  ) * 100
                ).toFixed(0)
              : 0;


          const categoryColor =
            this.normalizeCategoryColor(
              product.categories?.color
            );


          const categoryBadge =
            product.categories

              ? `
                <span
                  class="badge"
                  style="
                    background-color: ${categoryColor}15;
                    color: ${categoryColor};
                    border: 1px solid ${categoryColor}40;
                  "
                >
                  ${this.escapeHtml(
                    product.categories.name
                  )}
                </span>
              `

              : `
                <span
                  style="
                    color: #94a3b8;
                    font-size: 0.8rem;
                  "
                >
                  -
                </span>
              `;


          const safeName =
            this.escapeHtml(
              product.name
            );


          const safeSku =
            this.escapeHtml(
              product.sku || 'N/A'
            );


          const safeId =
            this.escapeJsString(
              product.id
            );


          const safeProductName =
            this.escapeJsString(
              product.name
            );


          return `
            <tr>

              <td>

                <div
                  style="
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                  "
                >

                  <div
                    style="
                      width: 36px;
                      height: 36px;
                      border-radius: var(--radius-md);
                      background: #f1f5f9;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-weight: 700;
                      color: #475569;
                      font-size: 0.85rem;
                    "
                  >
                    ${safeName.substring(0, 1).toUpperCase()}
                  </div>


                  <div>

                    <strong
                      style="
                        display: block;
                        font-size: 0.92rem;
                      "
                    >
                      ${safeName}
                    </strong>

                    <span
                      style="
                        font-size: 0.75rem;
                        color: #94a3b8;
                      "
                    >
                      SKU: ${safeSku}
                    </span>

                  </div>

                </div>

              </td>


              <td>
                ${categoryBadge}
              </td>


              <td>
                ${UI.getStockBadge(
                  product.stock_quantity,
                  product.minimum_stock
                )}
              </td>


              <td>
                ${UI.formatBRL(
                  product.cost_price
                )}
              </td>


              <td>
                <strong>
                  ${UI.formatBRL(
                    product.sale_price
                  )}
                </strong>
              </td>


              <td>

                <span
                  style="
                    color: ${
                      margin >= 0
                        ? 'var(--color-success)'
                        : 'var(--color-danger)'
                    };
                    font-weight: 600;
                    font-size: 0.82rem;
                  "
                >
                  ${UI.formatBRL(margin)}
                  (${marginPct}%)
                </span>

              </td>


              <td style="text-align: right;">

                <div
                  style="
                    display: inline-flex;
                    gap: 0.4rem;
                  "
                >

                  <!-- EDITAR PRODUTO -->

                  <button
                    class="btn btn-secondary btn-sm"
                    onclick="Produtos.openEditModal('${safeId}')"
                    title="Editar"
                  >

                    <svg
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      ></path>
                    </svg>

                  </button>


                  <!-- EXCLUIR PRODUTO -->

                  <button
                    class="btn btn-secondary btn-sm"
                    style="color: var(--color-danger);"
                    onclick="Produtos.confirmDelete('${safeId}', '${safeProductName}')"
                    title="Excluir"
                  >

                    <svg
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 01-1 1v3M4 7h16"
                      ></path>
                    </svg>

                  </button>

                </div>

              </td>

            </tr>
          `;

        })
        .join('');
  },


  // ============================================================
  // NOVO PRODUTO
  // ============================================================

  openNewModal() {

    this.editingProductId = null;


    document.getElementById(
      'modal-product-title'
    ).textContent =
      'Novo Produto';


    document.getElementById(
      'form-product'
    ).reset();


    document.getElementById(
      'prod-stock-quantity'
    ).disabled = false;


    document.getElementById(
      'margin-calc-display'
    ).textContent =
      'R$ 0,00 (0%)';


    UI.openModal(
      'modal-product'
    );
  },


  // ============================================================
  // EDITAR PRODUTO
  // ============================================================

  openEditModal(id) {

    const prod =
      this.productsList.find(
        p => p.id === id
      );


    if (!prod) return;


    this.editingProductId = id;


    document.getElementById(
      'modal-product-title'
    ).textContent =
      'Editar Produto';


    document.getElementById(
      'prod-name'
    ).value =
      prod.name || '';


    document.getElementById(
      'prod-sku'
    ).value =
      prod.sku || '';


    document.getElementById(
      'prod-category'
    ).value =
      prod.category_id || '';


    document.getElementById(
      'prod-supplier'
    ).value =
      prod.supplier_id || '';


    document.getElementById(
      'prod-cost-price'
    ).value =
      prod.cost_price;


    document.getElementById(
      'prod-sale-price'
    ).value =
      prod.sale_price;


    document.getElementById(
      'prod-stock-quantity'
    ).value =
      prod.stock_quantity;


    document.getElementById(
      'prod-stock-quantity'
    ).disabled =
      true;


    document.getElementById(
      'prod-min-stock'
    ).value =
      prod.minimum_stock;


    document.getElementById(
      'prod-description'
    ).value =
      prod.description || '';


    const margin =
      prod.sale_price -
      prod.cost_price;


    const marginPct =
      prod.sale_price > 0
        ? (
            (
              margin /
              prod.sale_price
            ) * 100
          ).toFixed(1)
        : 0;


    const marginEl =
      document.getElementById(
        'margin-calc-display'
      );


    if (marginEl) {

      marginEl.textContent =
        `${UI.formatBRL(margin)} (${marginPct}%)`;

    }


    UI.openModal(
      'modal-product'
    );
  },


  // ============================================================
  // SALVAR PRODUTO
  // ============================================================

  async saveProduct() {

    const client =
      getSupabase();


    if (!client) return;


    const name =
      document.getElementById(
        'prod-name'
      ).value.trim();


    const sku =
      document.getElementById(
        'prod-sku'
      ).value.trim();


    const category_id =
      document.getElementById(
        'prod-category'
      ).value || null;


    const supplier_id =
      document.getElementById(
        'prod-supplier'
      ).value || null;


    const cost_price =
      parseFloat(
        document.getElementById(
          'prod-cost-price'
        ).value
      ) || 0;


    const sale_price =
      parseFloat(
        document.getElementById(
          'prod-sale-price'
        ).value
      ) || 0;


    const minimum_stock =
      parseInt(
        document.getElementById(
          'prod-min-stock'
        ).value
      ) || 5;


    const description =
      document.getElementById(
        'prod-description'
      ).value.trim();


    if (!name) {

      UI.showToast(
        'warning',
        'Campos Obrigatórios',
        'Informe o nome do produto.'
      );

      return;
    }


    const saveBtn =
      document.getElementById(
        'btn-save-product'
      );


    saveBtn.disabled =
      true;

    saveBtn.textContent =
      'Salvando...';


    try {

      const user =
        Auth.getCurrentUser();


      const company_id =
        user
          ? user.company_id
          : null;


      // ========================================================
      // EDITAR PRODUTO
      // ========================================================

      if (this.editingProductId) {

        const {
          error
        } = await client

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

            updated_at:
              new Date().toISOString()

          })

          .eq(
            'id',
            this.editingProductId
          );


        if (error) {
          throw error;
        }


        UI.showToast(
          'success',
          'Atualizado!',
          'Produto salvo com sucesso.'
        );

      }


      // ========================================================
      // NOVO PRODUTO
      // ========================================================

      else {

        const stock_quantity =
          parseInt(
            document.getElementById(
              'prod-stock-quantity'
            ).value
          ) || 0;


        const {
          data: newProd,
          error
        } = await client

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


        if (error) {
          throw error;
        }


        // Estoque inicial.

        if (
          stock_quantity > 0 &&
          newProd
        ) {

          await client
            .from('stock_movements')
            .insert({

              company_id,

              product_id:
                newProd.id,

              user_id:
                user.id,

              type:
                'entry',

              quantity:
                stock_quantity,

              previous_quantity:
                0,

              new_quantity:
                stock_quantity,

              reason:
                'Estoque inicial cadastrado'

            });

        }


        UI.showToast(
          'success',
          'Cadastrado!',
          'Novo produto adicionado.'
        );

      }


      UI.closeModal(
        'modal-product'
      );


      await this.loadProducts();


    } catch (err) {

      console.error(
        'Erro ao salvar produto:',
        err
      );


      UI.showToast(
        'error',
        'Erro',
        'Não foi possível salvar o produto. Tente novamente.'
      );


    } finally {

      saveBtn.disabled =
        false;

      saveBtn.textContent =
        'Salvar Produto';

    }
  },


  // ============================================================
  // EXCLUIR PRODUTO
  // ============================================================

  confirmDelete(id, name) {

    UI.confirmAction(

      'Excluir Produto',

      `Tem certeza que deseja excluir "${name}"? O histórico associado permanecerá seguro no banco.`,

      async () => {

        const client =
          getSupabase();


        if (!client) return;


        try {

          const {
            error
          } = await client

            .from('products')

            .delete()

            .eq(
              'id',
              id
            );


          if (error) {

            if (
              error.code ===
              '23503'
            ) {

              UI.showToast(
                'error',
                'Não permitido',
                'Este produto já possui vendas registradas e não pode ser excluído.'
              );

            } else {

              UI.showToast(
                'error',
                'Erro',
                'Falha ao remover produto.'
              );

            }

            return;
          }


          UI.showToast(
            'success',
            'Removido',
            'Produto excluído com sucesso.'
          );


          await this.loadProducts();


        } catch (err) {

          console.error(
            'Erro ao excluir:',
            err
          );

        }

      }

    );
  }

};


window.Produtos =
  Produtos;


document.addEventListener(
  'DOMContentLoaded',
  () => Produtos.init()
);
