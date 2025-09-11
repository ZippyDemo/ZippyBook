export class Auth {
    constructor() {
        this.baseUrl = '/api';
        this.token = localStorage.getItem('authToken');
        this.userRole = localStorage.getItem('userRole');
    }

    async login(email, password, role) {
        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });

            if (response.ok) {
                const data = await response.json();
                this.setSession(data);
                return this.redirectToDashboard(role);
            }
            throw new Error('Login failed');
        } catch (error) {
            console.error('Auth error:', error);
            throw error;
        }
    }

    setSession(data) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userId', data.userId);
    }

    redirectToDashboard(role) {
        switch(role) {
            case 'customer':
                window.location.href = '/customer-dashboard.html';
                break;
            case 'business':
                window.location.href = '/business-dashboard.html';
                break;
            case 'driver':
                window.location.href = '/driver-dashboard.html';
                break;
        }
    }

    async logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('zippybook.role'); // Clear session storage role

        try {
            const mod = await import('./supabase.js');
            const { supabase } = mod;
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out from Supabase:', error);
        }

        // Remove provider dashboard button if it exists
        const providerBtn = document.getElementById('provider-dashboard-btn');
        if (providerBtn) {
            providerBtn.remove();
        }

        window.location.href = '/';
    }

    isAuthenticated() {
        return !!this.token;
    }
}
