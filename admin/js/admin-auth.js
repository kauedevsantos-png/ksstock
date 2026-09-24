/**
 * KS STOCK — AUTENTICAÇÃO DO SUPER ADMIN
 */

const AdminAuth = {

    async requirePlatformAdmin() {

        const client = getSupabase();

        if (!client) {
            window.location.href = '/admin/login.html';
            return null;
        }

        try {

            const {
                data: { user },
                error: userError
            } = await client.auth.getUser();

            if (userError || !user) {
                window.location.href = '/admin/login.html';
                return null;
            }

            const {
                data: isAdmin,
                error: adminError
            } = await client.rpc('is_platform_admin');

            if (adminError) {
                console.error('Erro ao verificar Super Admin:', adminError);
                window.location.href = '/dashboard.html';
                return null;
            }

            if (!isAdmin) {
                window.location.href = '/dashboard.html';
                return null;
            }

            this.renderAdminUser(user);

            return user;

        } catch (error) {

            console.error('Falha na autenticação administrativa:', error);

            window.location.href = '/admin/login.html';

            return null;
        }
    },


    renderAdminUser(user) {

        const email = user.email || 'Administrador';

        const name =
            user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            email.split('@')[0];

        const initials = name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part.charAt(0).toUpperCase())
            .join('');

        const nameElement = document.getElementById('admin-name');
        const avatarElement = document.getElementById('admin-avatar');

        if (nameElement) {
            nameElement.textContent = name;
        }

        if (avatarElement) {
            avatarElement.textContent = initials || 'KS';
        }
    },


    async logout() {

        const client = getSupabase();

        if (client) {
            await client.auth.signOut();
        }

        window.location.href = '/admin/login.html';
    }
};