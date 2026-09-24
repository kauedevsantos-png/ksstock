/**
 * KS STOCK — SUPER ADMIN DASHBOARD
 */

const AdminDashboard = {

    companies: [],

    async init() {

        const user = await AdminAuth.requirePlatformAdmin();

        if (!user) return;

        this.bindEvents();

        await this.loadCompanies();

        this.renderStats();

        this.renderPlanDistribution();

        this.renderRecentCompanies();
    },


    bindEvents() {

        const logoutButton = document.getElementById('btn-logout');

        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                AdminAuth.logout();
            });
        }


        const menuButton =
            document.getElementById('mobile-menu-button');

        const sidebar =
            document.getElementById('admin-sidebar');

        const overlay =
            document.getElementById('admin-overlay');


        if (menuButton && sidebar && overlay) {

            menuButton.addEventListener('click', () => {
                sidebar.classList.add('open');
                overlay.classList.add('active');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }
    },


    async loadCompanies() {

        const client = getSupabase();

        if (!client) return;

        try {

            const { data, error } = await client
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
                    created_at
                `)
                .order('created_at', {
                    ascending: false
                });

            if (error) {
                throw error;
            }

            this.companies = data || [];

        } catch (error) {

            console.error(
                'Erro ao carregar empresas:',
                error
            );

            this.companies = [];
        }
    },


    getStatus(company) {

        if (company.subscription_status === 'suspended') {
            return {
                key: 'suspended',
                label: 'Suspensa'
            };
        }

        if (company.subscription_status === 'active') {
            return {
                key: 'active',
                label: 'Ativa'
            };
        }

        if (
            company.subscription_status === 'trial' &&
            company.trial_ends_at
        ) {

            const expiration =
                new Date(company.trial_ends_at);

            if (expiration < new Date()) {
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

        const names = {
            basico: 'Básico',
            profissional: 'Profissional',
            premium: 'Premium'
        };

        return names[plan] || plan || 'Básico';
    },


    formatDate(date) {

        if (!date) return '—';

        return new Date(date).toLocaleDateString(
            'pt-BR'
        );
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


    renderStats() {

        const total =
            this.companies.length;

        const trial =
            this.companies.filter(company =>
                this.getStatus(company).key === 'trial'
            ).length;

        const active =
            this.companies.filter(company =>
                this.getStatus(company).key === 'active'
            ).length;

        const expired =
            this.companies.filter(company =>
                this.getStatus(company).key === 'expired'
            ).length;


        const totalElement =
            document.getElementById('stat-total');

        const trialElement =
            document.getElementById('stat-trial');

        const activeElement =
            document.getElementById('stat-active');

        const expiredElement =
            document.getElementById('stat-expired');


        if (totalElement)
            totalElement.textContent = total;

        if (trialElement)
            trialElement.textContent = trial;

        if (activeElement)
            activeElement.textContent = active;

        if (expiredElement)
            expiredElement.textContent = expired;
    },


    renderPlanDistribution() {

        const container =
            document.getElementById(
                'plan-distribution'
            );

        if (!container) return;


        const plans = [
            {
                key: 'basico',
                label: 'Básico',
                css: 'basic'
            },
            {
                key: 'profissional',
                label: 'Profissional',
                css: 'profissional'
            },
            {
                key: 'premium',
                label: 'Premium',
                css: 'premium'
            }
        ];


        const total =
            this.companies.length || 1;


        container.innerHTML = plans.map(plan => {

            const count =
                this.companies.filter(
                    company => company.plan === plan.key
                ).length;

            const percentage =
                Math.round(
                    (count / total) * 100
                );


            return `
                <div class="plan-row">

                    <div class="plan-row-top">
                        <span>${plan.label}</span>
                        <span>${count} empresa(s)</span>
                    </div>

                    <div class="plan-progress ${plan.css}">
                        <span style="width:${percentage}%"></span>
                    </div>

                </div>
            `;

        }).join('');
    },


    renderRecentCompanies() {

        const tbody =
            document.getElementById(
                'recent-companies'
            );

        if (!tbody) return;


        const companies =
            this.companies.slice(0, 8);


        if (!companies.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty">
                        Nenhuma empresa cadastrada.
                    </td>
                </tr>
            `;

            return;
        }


        tbody.innerHTML =
            companies.map(company => {

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
                            ${this.formatDate(company.created_at)}
                        </td>


                        <td>
                            <a
                                class="table-action"
                                href="empresa.html?id=${company.id}"
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
    () => AdminDashboard.init()
);