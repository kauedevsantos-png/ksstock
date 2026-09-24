/**
 * KS STOCK — PLANOS
 */

const AdminPlanos = {

    async init() {

        const user =
            await AdminAuth.requirePlatformAdmin();

        if (!user) return;


        this.bindEvents();

        await this.loadPlans();
    },


    bindEvents() {

        document
            .getElementById('btn-logout')
            ?.addEventListener(
                'click',
                () => AdminAuth.logout()
            );


        const menu =
            document.getElementById(
                'mobile-menu-button'
            );

        const sidebar =
            document.getElementById(
                'admin-sidebar'
            );

        const overlay =
            document.getElementById(
                'admin-overlay'
            );


        if (menu && sidebar && overlay) {

            menu.addEventListener(
                'click',
                () => {

                    sidebar.classList.add('open');

                    overlay.classList.add('active');
                }
            );


            overlay.addEventListener(
                'click',
                () => {

                    sidebar.classList.remove('open');

                    overlay.classList.remove('active');
                }
            );
        }
    },


    async loadPlans() {

        const client =
            getSupabase();


        const { data, error } =
            await client
                .from('plan_limits')
                .select('*')
                .order(
                    'monthly_price',
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.error(error);

            document.getElementById(
                'plans-grid'
            ).innerHTML = `
                <div class="admin-card"
                     style="padding:30px;">
                    Não foi possível carregar os planos.
                </div>
            `;

            return;
        }


        this.render(data || []);
    },


    render(plans) {

        const container =
            document.getElementById(
                'plans-grid'
            );


        if (!plans.length) {

            container.innerHTML = `
                <div
                    class="admin-card"
                    style="padding:30px;"
                >
                    Nenhum plano cadastrado.
                </div>
            `;

            return;
        }


        container.innerHTML =
            plans.map(plan => {

                const name =
                    this.formatPlan(plan.plan);


                return `
                    <article class="plan-card">

                        <div class="plan-card-head">

                            <h2>
                                <span
                                    class="plan-color"
                                    style="background:${this.getColor(plan.plan)}"
                                ></span>

                                ${name}
                            </h2>

                            <div class="plan-price">

                                R$
                                ${this.formatPrice(
                                    plan.monthly_price
                                )}

                                <span>
                                    /mês
                                </span>

                            </div>

                        </div>


                        <div class="plan-card-body">

                            ${this.limit(
                                'Produtos',
                                plan.max_products
                            )}

                            ${this.limit(
                                'Usuários',
                                plan.max_users
                            )}

                            ${this.limit(
                                'Vendas / mês',
                                plan.max_sales_per_month
                            )}

                            ${this.limit(
                                'Clientes',
                                plan.max_customers
                            )}

                            ${this.limit(
                                'Categorias',
                                plan.max_categories
                            )}

                            ${this.limit(
                                'Relatórios',
                                this.formatReport(
                                    plan.reports_level
                                )
                            )}

                            ${this.limit(
                                'Exportação',
                                plan.can_export
                                    ? 'Sim'
                                    : 'Não'
                            )}

                            ${this.limit(
                                'Suporte prioritário',
                                plan.priority_support
                                    ? 'Sim'
                                    : 'Não'
                            )}

                        </div>

                    </article>
                `;

            }).join('');
    },


    limit(label, value) {

        return `
            <div class="plan-limit">

                <span>
                    ${label}
                </span>

                <strong>
                    ${value}
                </strong>

            </div>
        `;
    },


    formatPlan(plan) {

        return {
            basico: 'Básico',
            profissional: 'Profissional',
            premium: 'Premium'
        }[plan] || plan;
    },


    formatReport(level) {

        return {
            basic: 'Básico',
            complete: 'Completo',
            advanced: 'Avançado'
        }[level] || level || '—';
    },


    formatPrice(value) {

        return Number(value || 0)
            .toLocaleString(
                'pt-BR',
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
    },


    getColor(plan) {

        return {
            basico: '#64748b',
            profissional: '#0ea5e9',
            premium: '#8b5cf6'
        }[plan] || '#4f46e5';
    }
};


document.addEventListener(
    'DOMContentLoaded',
    () => AdminPlanos.init()
);