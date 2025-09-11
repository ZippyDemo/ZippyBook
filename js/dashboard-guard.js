export class DashboardGuard {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.userRole = localStorage.getItem('userRole');
        this.currentPath = window.location.pathname;
    }

    async validateAccess() {
        // Prefer Supabase session; fallback to local token
        let isAuthed = !!this.token;
        let role = this.userRole;
        try {
            const mod = await import('./supabase.js');
            const { supabase, getCurrentUserRole } = mod;
            const { data } = await supabase.auth.getSession();
            isAuthed = !!data?.session;
            if (!role) role = await getCurrentUserRole();
            if (role) localStorage.setItem('userRole', role);
        } catch (_) {}
        if (!isAuthed) return this.redirectToLogin();

        const allowedPaths = {
            customer: ['/customer-dashboard.html'],
            business: ['/business-dashboard.html'],
            driver: ['/driver-dashboard.html']
        };

        const userRole = role || this.userRole;
        if (!allowedPaths[userRole]?.includes(this.currentPath)) {
            this.redirectToDashboard(userRole);
        }
    }

    redirectToLogin() {
        window.location.href = '/?redirect=' + encodeURIComponent(window.location.pathname);
    }

    redirectToDashboard(role) {
        const dashboardUrls = {
            customer: '/customer-dashboard.html',
            business: '/business-dashboard.html',
            driver: '/driver-dashboard.html'
        };
        window.location.href = dashboardUrls[role || this.userRole] || '/';
    }
}
