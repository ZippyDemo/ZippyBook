// GitHub Pages Compatibility Fix
// This file addresses common issues when deploying to GitHub Pages

export class GitHubPagesFix {
    constructor() {
        this.isGitHubPages = this.detectGitHubPages();
        this.init();
    }

    detectGitHubPages() {
        const hostname = window.location.hostname;
        return hostname.includes('github.io') || hostname.includes('githubusercontent.com');
    }

    init() {
        if (this.isGitHubPages) {
            console.log('GitHub Pages environment detected, applying fixes...');
            this.fixCORSIssues();
            this.addErrorHandling();
            this.preloadSupabaseClient();
        }
    }

    fixCORSIssues() {
        // Add referrer policy for Supabase requests
        const metaReferrer = document.createElement('meta');
        metaReferrer.name = 'referrer';
        metaReferrer.content = 'origin-when-cross-origin';
        document.head.appendChild(metaReferrer);

        // Set up more permissive fetch defaults for Supabase
        const originalFetch = window.fetch;
        window.fetch = function(url, options = {}) {
            if (typeof url === 'string' && url.includes('supabase.co')) {
                options = {
                    ...options,
                    mode: 'cors',
                    credentials: 'omit',
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                };
            }
            return originalFetch.call(this, url, options);
        };
    }

    addErrorHandling() {
        // Global error handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            // If it's a network error, try to provide helpful feedback
            if (event.reason?.message?.includes('fetch')) {
                console.warn('Network fetch failed - this might be due to CORS or connectivity issues on GitHub Pages');
            }
        });
    }

    async preloadSupabaseClient() {
        try {
            // Preload the Supabase client to catch any initialization issues early
            const { supabase } = await import('./supabase.js');
            
            // Test basic connectivity
            const { error } = await supabase.auth.getSession();
            if (error && !error.message.includes('session')) {
                console.warn('Supabase connectivity issue:', error);
            } else {
                console.log('Supabase client initialized successfully');
            }
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
        }
    }

    // Helper method to show loading states during async operations
    static showLoadingState(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-state" style="text-align: center; padding: 2rem;">
                    <div class="spinner" style="
                        border: 3px solid #f3f3f3;
                        border-top: 3px solid #6366f1;
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 1rem;
                    "></div>
                    <p style="color: #6b7280; margin: 0;">${message}</p>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
        }
    }

    // Helper method to show error states
    static showErrorState(elementId, message = 'Failed to load data', retry = null) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 2rem;">
                    <div style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                    <p style="color: #ef4444; margin: 0 0 1rem 0; font-weight: 500;">${message}</p>
                    ${retry ? '<button onclick="' + retry + '" style="background: #6366f1; color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer;">Try Again</button>' : ''}
                </div>
            `;
        }
    }
}

// Initialize the fix when the script loads
new GitHubPagesFix();