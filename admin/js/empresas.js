/**
 * KS STOCK — GERENCIAMENTO DE EMPRESAS
 */

const AdminEmpresas = {

    companies: [],

    filtered: [],


    async init() {

        const user =
            await AdminAuth.requirePlatformAdmin();

        if (!user) return;

        this.bindEvents();

        await this.loadCompanies();

        this.render();
    },


    bindEvents() {

        const logout =
            document.getElementById('btn-logout');

        if (logout) {
            logout.addEventListener(
                'click',
                () => AdminAuth.logout()
            );
        }


        const search =
            document.getElementById('company-search');

        if (search) {

            search.addEventListener(
                'input',
                () => this.filter(search.value)
            );
        }


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


    async loadCompanies() {

        const client = getSupabase();

        if (!client) return;


        const { data, error } =
            await client
                .from('companies')
                .select(`
                    id,
                    name,
                    slug,
                    logo_url,
                    phone,
                    email,
                    plan,
                    subscription_status,
                    trial_started_at,
                    trial_ends_at,
                    subscription_started_at,
                    subscription_ends_at,
                    cancelled_at,
                    created_at
                `)
                .order('created_at', {
                    ascending: false
                });


        if (error) {

            console.error(error);

            this.companies = [];

            return;
        }


        this.companies = data || [];
        this.filtered = [...this.companies];
    },


    filter(value) {

        const query =
            value
                .toLowerCase()
                .trim();


        if (!query) {

            this.filtered =
                [...this.companies];

        } else {

            this.filtered =
                this.companies.filter(company => {

                    return (
                        (company.name || '')
                            .toLowerCase()
                            .includes(query)

                        ||

                        (company.email || '')
                            .toLowerCase()
                            .includes(query)

                        ||

                        (company.phone || '')
                            .toLowerCase()
                            .includes(query)
                    );
                });
        }


        this.render();
    },


    getStatus(company) {

        if (
            company.subscription_status ===
            'suspended'
        ) {

            return {
                key: 'suspended',
                label: 'Suspensa'
            };
        }


        if (
            company.subscription_status ===
            'active'
        ) {

            return {
                key: 'active',
                label: 'Ativa'
            };
        }


        if (
            company.subscription_status ===
            'trial'
        ) {

            if (
                company.trial_ends_at &&
                new Date(company.trial_ends_at)
                    < new Date()
            ) {

                return {
                    key: 'expired',
                    label: 'Trial expirado'
                };
            }


            return {
                key: 'trial',
                label: 'Em trial'
            };
        }


        return {
            key: 'expired',
            label: 'Sem status'
        };
    },


    formatPlan(plan) {

        return {
            basico: 'Básico',
            profissional: 'Profissional',
            premium: 'Premium'
        }[plan] || plan || 'Básico';
    },


    formatDate(date) {

        if (!date) return '—';

        return new Date(date)
            .toLocaleDateString('pt-BR');
    },


    formatTrial(company) {

        if (!company.trial_ends_at) {
            return '—';
        }


        const end =
            new Date(company.trial_ends_at);

        const now =
            new Date();


        if (end < now) {
            return 'Expirado';
        }


        const days =
            Math.ceil(
                (end - now) /
                (1000 * 60 * 60 * 24)
            );


        return `${days} dia(s)`;
    },


    getInitials(name) {

        return (name || 'KS')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0])
            .join('')
            .toUpperCase();
    },


    render() {

        const tbody =
            document.getElementById(
                'companies-table'
            );


        const count =
            document.getElementById(
                'companies-count'
            );


        if (count) {

            count.textContent =
                `${this.filtered.length} empresa(s)`;
        }


        if (!tbody) return;


        if (!this.filtered.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="table-empty"
                    >
                        Nenhuma empresa encontrada.
                    </td>
                </tr>
            `;

            return;
        }


        tbody.innerHTML =
            this.filtered.map(company => {

                const status =
                    this.getStatus(company);


                return `
                    <tr>

                        <td>
                            <div class="company-cell">

                                <div class="company-mini-avatar">
                                    ${this.getInitials(company.name)}
                                </div>

                                <div>
                                    <strong>
                                        ${this.escape(company.name)}
                                    </strong>

                                    <span>
                                        ${this.escape(
                                            company.email || 'Sem e-mail'
                                        )}
                                    </span>
                                </div>

                            </div>
                        </td>


                        <td>
                            <span class="badge ${company.plan}">
                                ${this.formatPlan(company.plan)}
                            </span>
                        </td>


                        <td>
                            <span class="badge ${status.key}">
                                ${status.label}
                            </span>
                        </td>


                        <td>
                            ${this.formatTrial(company)}
                        </td>


                        <td>
                            ${this.formatDate(company.created_at)}
                        </td>


                        <td>
                            <a
                                href="empresa.html?id=${company.id}"
                                class="table-action"
                            >
                                Gerenciar
                            </a>
                        </td>

                    </tr>
                `;

            }).join('');
    },


    escape(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};


document.addEventListener(
    'DOMContentLoaded',
    () => AdminEmpresas.init()
);