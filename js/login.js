const loginForm = document.getElementById('loginForm');
const tabButtons = document.querySelectorAll('.tab-btn');
let currentRole = 'business';

// Handle tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-selected', 'true');
        currentRole = button.dataset.tab;
    });
});

// Handle login form submission (Supabase auth)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    try {
        const mod = await import('./supabase.js');
        const { signInWithEmail } = mod;
        const { role } = await signInWithEmail({ email, password });
        const r = role || currentRole || 'customer';
        try { localStorage.setItem('userRole', r); } catch(_) {}
        window.location.href = r === 'business' ? '/business-dashboard.html'
            : r === 'driver' ? '/driver-dashboard.html'
            : '/customer-dashboard.html';
    } catch (error) {
        console.error('Login error:', error);
        // Show error message to user
    }
});

// Toggle password visibility
const togglePassword = document.querySelector('.toggle-password');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.querySelector('i').classList.toggle('fa-eye');
    togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
});
