/**
 * KS STOCK — DETALHES DA EMPRESA
 */

const AdminEmpresa = {

    company: null,

    companyId: null,


    async init() {

        const user =
            await AdminAuth.requirePlatformAdmin();

        if (!user) return;


        this.companyId =
            new URLSearchParams(
                window.location.search
            ).get('id');


        if (!this.companyId) {

            window.location.href =
                'empresas.html';

            return;
        }


        this.bindEvents();

        await this.loadCompany();

        await this.loadUsers();
    },


    bindEvents() {

        document
            .getElementById('btn-logout')
            ?.addEventListener(
                'click',
                () => AdminAuth.logout()
            );


        document
            .getElementById('btn-save')
            ?.addEventListener(
                'click',
                () => this.save()
            );


        document
            .getElementById('btn-activate')
            ?.addEventListener(
                'click',
                () => this.activate()
            );


        document
            .getElementById('btn-renew')
            ?.addEventListener(
                'click',
                () => this.renew()
            );


        document
            .getElementById('btn-suspend')
            ?.addEventListener(
                'click',
                () => this.suspend()
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


    async loadCompany() {

        const client = getSupabase();


        const { data, error } =
            await client
                .from('companies')
                .select('*')
                .eq('id', this.companyId)
                .single();


        if (error || !data) {

            console.error(error);

            alert(
                'Empresa não encontrada ou sem acesso.'
            );

            window.location.href =
                'empresas.html';

            return;
        }


        this.company = data;

        this.render();
    },


    render() {

        const company =
            this.company;


        document.getElementById(
            'page-title'
        ).textContent =
            company.name;


        document.getElementById(
            'company-name'
        ).textContent =
            company.name;


        document.getElementById(
            'company-email'
        ).textContent =
            company.email || 'Sem e-mail';


        document.getElementById(
            'company-phone'
        ).textContent =
            company.phone || '—';


        document.getElementById(
            'company-id'
        ).textContent =
            company.id;


        document.getElementById(
            'company-slug'
        ).textContent =
            company.slug || '—';


        document.getElementById(
            'company-created'
        ).textContent =
            this.formatDate(company.created_at);


        document.getElementById(
            'company-avatar'
        ).textContent =
            this.getInitials(company.name);


        document.getElementById(
            'current-plan'
        ).textContent =
            this.formatPlan(company.plan);


        document.getElementById(
            'current-status'
        ).innerHTML =
            this.statusBadge(company);


        document.getElementById(
            'trial-end'
        ).textContent =
            this.formatDateTime(
                company.trial_ends_at
            );


        document.getElementById(
            'subscription-start'
        ).textContent =
            this.formatDateTime(
                company.subscription_started_at
            );


        document.getElementById(
            'subscription-end'
        ).textContent =
            this.formatDateTime(
                company.subscription_ends_at
            );


        document.getElementById(
            'edit-plan'
        ).value =
            company.plan || 'basico';


        document.getElementById(
            'edit-status'
        ).value =
            company.subscription_status || 'trial';


        this.setDateInput(
            'edit-trial-end',
            company.trial_ends_at
        );


        this.setDateInput(
            'edit-subscription-end',
            company.subscription_ends_at
        );


        document.getElementById(
            'page-loading'
        ).style.display =
            'none';


        document.getElementById(
            'company-content'
        ).style.display =
            'block';
    },


    async loadUsers() {

        const client =
            getSupabase();


        const { data, error } =
            await client
                .from('profiles')
                .select(
                    'id,name,email,role,created_at'
                )
                .eq(
                    'company_id',
                    this.companyId
                )
                .order(
                    'created_at',
                    { ascending: true }
                );


        const tbody =
            document.getElementById(
                'users-table'
            );


        if (!tbody) return;


        if (error) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="table-empty"
                    >
                        Não foi possível carregar os usuários.
                    </td>
                </tr>
            `;

            return;
        }


        if (!data?.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="table-empty"
                    >
                        Nenhum usuário encontrado.
                    </td>
                </tr>
            `;

            return;
        }


        tbody.innerHTML =
            data.map(user => {

                return `
                    <tr>

                        <td>
                            <strong>
                                ${this.escape(
                                    user.name
                                )}
                            </strong>
                        </td>

                        <td>
                            ${this.escape(
                                user.email
                            )}
                        </td>

                        <td>
                            <span class="badge ${
                                user.role === 'admin'
                                    ? 'profissional'
                                    : 'basic'
                            }">
                                ${
                                    user.role === 'admin'
                                        ? 'Administrador'
                                        : 'Funcionário'
                                }
                            </span>
                        </td>

                        <td>
                            ${this.formatDate(
                                user.created_at
                            )}
                        </td>

                    </tr>
                `;

            }).join('');
    },


    async save() {

        const client =
            getSupabase();


        const plan =
            document.getElementById(
                'edit-plan'
            ).value;


        const status =
            document.getElementById(
                'edit-status'
            ).value;


        const trialEnd =
            this.getDateValue(
                'edit-trial-end'
            );


        const subscriptionEnd =
            this.getDateValue(
                'edit-subscription-end'
            );


        const button =
            document.getElementById(
                'btn-save'
            );


        button.disabled = true;
        button.textContent = 'Salvando...';


        try {

            const updates = {
                plan,
                subscription_status: status,
                trial_ends_at: trialEnd,
                subscription_ends_at: subscriptionEnd,
                updated_at: new Date().toISOString()
            };


            if (
                status === 'active' &&
                !this.company.subscription_started_at
            ) {

                updates.subscription_started_at =
                    new Date().toISOString();
            }


            const { error } =
                await client
                    .from('companies')
                    .update(updates)
                    .eq('id', this.companyId);


            if (error) {
                throw error;
            }


            await this.loadCompany();


            alert(
                'Alterações salvas com sucesso.'
            );

        } catch (error) {

            console.error(error);

            alert(
                'Não foi possível salvar as alterações.'
            );

        } finally {

            button.disabled = false;
            button.textContent =
                'Salvar alterações';
        }
    },


    async activate() {

        const client =
            getSupabase();


        const now =
            new Date();


        const { error } =
            await client
                .from('companies')
                .update({
                    subscription_status: 'active',
                    subscription_started_at:
                        now.toISOString(),
                    cancelled_at: null,
                    updated_at:
                        now.toISOString()
                })
                .eq('id', this.companyId);


        if (error) {

            console.error(error);

            alert(
                'Erro ao ativar empresa.'
            );

            return;
        }


        await this.loadCompany();

        alert(
            'Empresa ativada com sucesso.'
        );
    },


    async renew() {

        const client =
            getSupabase();


        const currentEnd =
            this.company.subscription_ends_at
                ? new Date(
                    this.company.subscription_ends_at
                )
                : new Date();


        const base =
            currentEnd > new Date()
                ? currentEnd
                : new Date();


        base.setDate(
            base.getDate() + 30
        );


        const { error } =
            await client
                .from('companies')
                .update({
                    subscription_status: 'active',
                    subscription_started_at:
                        this.company.subscription_started_at ||
                        new Date().toISOString(),
                    subscription_ends_at:
                        base.toISOString(),
                    cancelled_at: null,
                    updated_at:
                        new Date().toISOString()
                })
                .eq('id', this.companyId);


        if (error) {

            console.error(error);

            alert(
                'Erro ao renovar empresa.'
            );

            return;
        }


        await this.loadCompany();

        alert(
            'Assinatura renovada por 30 dias.'
        );
    },


    async suspend() {

        const confirmed =
            window.confirm(
                'Tem certeza que deseja suspender esta empresa?'
            );


        if (!confirmed) return;


        const client =
            getSupabase();


        const { error } =
            await client
                .from('companies')
                .update({
                    subscription_status: 'suspended',
                    cancelled_at:
                        new Date().toISOString(),
                    updated_at:
                        new Date().toISOString()
                })
                .eq('id', this.companyId);


        if (error) {

            console.error(error);

            alert(
                'Erro ao suspender empresa.'
            );

            return;
        }


        await this.loadCompany();

        alert(
            'Empresa suspensa.'
        );
    },


    statusBadge(company) {

        const status =
            this.getStatus(company);


        return `
            <span class="badge ${status.key}">
                ${status.label}
            </span>
        `;
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


    setDateInput(id, value) {

        const input =
            document.getElementById(id);


        if (!input || !value) return;


        const date =
            new Date(value);


        const local =
            new Date(
                date.getTime() -
                date.getTimezoneOffset() * 60000
            );


        input.value =
            local.toISOString()
                .slice(0, 16);
    },


    getDateValue(id) {

        const value =
            document.getElementById(id)?.value;


        if (!value) return null;


        return new Date(value)
            .toISOString();
    },


    formatDate(value) {

        if (!value) return '—';


        return new Date(value)
            .toLocaleDateString('pt-BR');
    },


    formatDateTime(value) {

        if (!value) return '—';


        return new Date(value)
            .toLocaleString(
                'pt-BR',
                {
                    dateStyle: 'short',
                    timeStyle: 'short'
                }
            );
    },


    formatPlan(plan) {

        return {
            basico: 'Básico',
            profissional: 'Profissional',
            premium: 'Premium'
        }[plan] || plan || 'Básico';
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
    () => AdminEmpresa.init()
);