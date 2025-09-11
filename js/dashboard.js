import { CustomerDashboard } from './customer-dashboard.js';
import { BusinessDashboard } from './business-dashboard.js';
import { DriverDashboard } from './driver-dashboard.js';

class DashboardManager {
    constructor() {
        this.userRole = localStorage.getItem('userRole');
        this.dashboards = {
            customer: CustomerDashboard,
            business: BusinessDashboard,
            driver: DriverDashboard
        };
        this.init();
    }

    init() {
        this.setupTheme();
        this.initializeDashboard();
        this.setupNotifications();
        this.setupGlobalListeners();
    }

    initializeDashboard() {
        const DashboardClass = this.dashboards[this.userRole];
        if (DashboardClass) {
            this.activeDashboard = new DashboardClass();
            this.showDashboard(this.userRole);
        } else {
            window.location.href = '/';
        }
    }

    showDashboard(role) {
        document.querySelectorAll('.role-dashboard').forEach(dashboard => {
            dashboard.classList.remove('active');
        });
        document.getElementById(`${role}-dashboard`).classList.add('active');
    }

    setupGlobalListeners() {
        // Handle navigation, notifications, and global events
    }
}

new DashboardManager();
