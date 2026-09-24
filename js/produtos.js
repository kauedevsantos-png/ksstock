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

    const authData =
      await Auth.requireAuth();

    if (
      !authData &&
      CONFIG.isSupabaseConfigured()
    ) {
      return;
    }

    this.bindEvents();

    await this.loadCategories();
    await this.loadSuppliers();
    await this.loadProducts();
  },


  bindEvents() {

    const searchInput =
      document.getElementById(
        'search-products'
      );

    if (searchInput) {

      searchInput.addEventListener(
        'input',
        UI.debounce(
          () => this.filterProducts(),
          250
        )
      );

    }


    const filterCat =
      document.getElementById(
        'filter-category'
      );

    if (filterCat) {

      filterCat.addEventListener(
        'change',
        () => this.filterProducts()
      );

    }


    const filterStock =
      document.getElementById(
        'filter-stock-status'
      );

    if (filterStock) {

      filterStock.addEventListener(
        'change',
        () => this.filterProducts()
      );

    }


    const costInput =
      document.getElementById(
        'prod-cost-price'
      );

    const saleInput =
      document.getElementById(
        'prod-sale-price'
      );


    if (
      costInput &&
      saleInput
    ) {

      const updateMargin = () => {

        const cost =
          parseFloat(
            costInput.value
          ) || 0;

        const sale =
          parseFloat(
            saleInput.value
          ) || 0;

        const marginValue =
          sale - cost;

        const marginPercent =
          sale > 0
            ? (
                (marginValue / sale) *
                100
              ).toFixed(1)
            : 0;


        const displayEl =
          document.getElementById(
            'margin-calc-display'
          );


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


    const form =
      document.getElementById(
        'form-product'
      );


    if (form) {

      form.addEventListener(
        'submit',
        event => {

          event.preventDefault();

          this.saveProduct();

        }
      );

    }

  },


  async loadCategories() {

    const client =
      getSupabase();

    if (!client) {
      return;
    }


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


      this.categoriesList =
        data || [];


      this.renderCategoryOptions();

    } catch (err) {

      console.error(
        'Erro ao carregar categorias:',
        err
      );

    }

  },


  async loadSuppliers() {

    const client =
      getSupabase();

    if (!client) {
      return;
    }


    try {

      const {
        data,
        error
      } = await client
        .from('suppliers')
        .select('*')
        .order('name');


      if (error) {

        console.error(
          'Erro ao carregar fornecedores:',
          error
        );

        return;
      }


      this.suppliersList =
        data || [];


      this.renderSupplierOptions();

    } catch (err) {

      console.error(
        'Erro ao carregar fornecedores:',
        err
      );

    }

  },


  async loadProducts() {

    const client =
      getSupabase();

    if (!client) {
      return;
    }


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
            style="color:#94a3b8;"
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
          categories (
            id,
            name,
            color
          ),
          suppliers (
            id,
            name
          )
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
            productName.includes(
              query
            ) ||
            productSku.includes(
              query
            );


          const matchesCategory =
            !catId ||
            product.category_id ===
              catId;


          let matchesStock =
            true;


          if (
            stockStatus ===
            'low'
          ) {

            matchesStock =
              Number(
                product.stock_quantity
              ) <=
              Number(
                product.minimum_stock
              );

          }


          if (
            stockStatus ===
            'out'
          ) {

            matchesStock =
              Number(
                product.stock_quantity
              ) <= 0;

          }


          return (
            matchesSearch &&
            matchesCategory &&
            matchesStock
          );

        }
      );


    this.renderTable(
      filtered
    );

  },


  escapeHtml(value) {

    return String(
      value ?? ''
    )
      .replace(
        /&/g,
        '&amp;'
      )
      .replace(
        /</g,
        '&lt;'
      )
      .replace(
        />/g,
        '&gt;'
      )
      .replace(
        /"/g,
        '&quot;'
      )
      .replace(
        /'/g,
        '&#039;'
      );

  },


  async saveProduct() {

    const client =
      getSupabase();

    if (!client) {
      return;
    }


    const name =
      document.getElementById(
        'prod-name'
      )?.value
        .trim() || '';


    const sku =
      document.getElementById(
        'prod-sku'
      )?.value
        .trim() || '';


    const category_id =
      document.getElementById(
        'prod-category'
      )?.value || null;


    const supplier_id =
      document.getElementById(
        'prod-supplier'
      )?.value || null;


    const cost_price =
      parseFloat(
        document.getElementById(
          'prod-cost-price'
        )?.value
      ) || 0;


    const sale_price =
      parseFloat(
        document.getElementById(
          'prod-sale-price'
        )?.value
      ) || 0;


    const minimum_stock =
      parseInt(
        document.getElementById(
          'prod-min-stock'
        )?.value
      ) || 5;


    const description =
      document.getElementById(
        'prod-description'
      )?.value
        .trim() || '';


    if (!name) {

      UI.showToast(
        'warning',
        'Campos Obrigatórios',
        'Informe o nome do produto.'
      );

      return;
    }


    if (
      cost_price < 0 ||
      sale_price < 0
    ) {

      UI.showToast(
        'warning',
        'Valores inválidos',
        'Os valores não podem ser negativos.'
      );

      return;
    }


    const saveBtn =
      document.getElementById(
        'btn-save-product'
      );


    if (saveBtn) {

      saveBtn.disabled =
        true;

      saveBtn.textContent =
        'Salvando...';

    }


    try {

      const user =
        Auth.getCurrentUser();


      const company_id =
        user
          ? user.company_id
          : null;


      if (!company_id) {

        throw new Error(
          'Empresa não encontrada.'
        );

      }


      /*
       * NOVO PRODUTO:
       * verifica limite antes do INSERT.
       */
      if (
        !this.editingProductId &&
        typeof Subscription !== 'undefined'
      ) {

        const allowed =
          await Subscription.canCreate(
            'products'
          );


        if (!allowed) {
          return;
        }

      }


      /*
       * EDITAR PRODUTO
       */
      if (
        this.editingProductId
      ) {

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
          )
          .eq(
            'company_id',
            company_id
          );


        if (error) {
          throw error;
        }


        UI.showToast(
          'success',
          'Produto atualizado!',
          'As informações foram salvas.'
        );

      } else {

        /*
         * NOVO PRODUTO
         */
        const {
          error
        } = await client
          .from('products')
          .insert({

            company_id,

            name,

            sku:
              sku || null,

            category_id,

            supplier_id,

            cost_price,

            sale_price,

            stock_quantity:
              0,

            minimum_stock,

            description

          });


        if (error) {
          throw error;
        }


        UI.showToast(
          'success',
          'Produto criado!',
          'O produto foi adicionado ao estoque.'
        );

      }


      this.editingProductId =
        null;


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
        err.message ||
          'Não foi possível salvar o produto.'
      );


    } finally {

      if (saveBtn) {

        saveBtn.disabled =
          false;

        saveBtn.textContent =
          'Salvar Produto';

      }

    }

  }

};


window.Produtos =
  Produtos;


document.addEventListener(
  'DOMContentLoaded',
  () => Produtos.init()
);
