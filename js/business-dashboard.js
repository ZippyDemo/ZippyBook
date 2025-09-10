import { DashboardGuard } from './dashboard-guard.js';
import { fetchBusinessProfile, upsertBusinessProfile, uploadBusinessLogo, uploadBusinessFeaturedImage, fetchInventory, upsertInventoryItem, bulkInsertInventory, deleteInventoryItem, uploadInventoryImage, getInventoryFileUrl } from './supabase.js';

class BusinessDashboard {
    constructor() {
        this.guard = new DashboardGuard();
        // Guard against missing socket.io in static environments
        try {
            this.socket = (typeof io !== 'undefined') ? io('/business') : { on: () => {}, emit: () => {} };
        } catch (_) {
            this.socket = { on: () => {}, emit: () => {} };
        }
        // Cache the current user id for per-user storage scoping
        this.userId = null;
        this._userIdPromise = this.resolveUserId();
        this.init();
    }

    init() {
        this.guard.validateAccess();
        this.loadDashboardData();
        this.setupSocketListeners();
        this.setupEventListeners();
        this.initBusinessProfile();
        this.initInventory();
        // After userId is known, migrate any legacy global keys to per-user keys
        this._userIdPromise.then(() => {
            this.migrateLegacyStorageKeys();
        }).catch(() => {});
    }

    setupSocketListeners() {
        this.socket.on('newOrder', (order) => {
            this.addNewOrder(order);
            this.updateStats();
        });

        this.socket.on('orderStatusChange', (order) => {
            this.updateOrderStatus(order);
            this.updateStats();
        });
    }

    async loadDashboardData() {
        try {
            const [orders, analytics] = await Promise.all([
                fetch('/api/business/orders').then(r => r.json()),
                fetch('/api/business/analytics').then(r => r.json())
            ]);
            
            this.renderOrders(orders);
            this.renderAnalytics(analytics);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateStats() {
        // Update order counts and revenue
        const stats = document.querySelectorAll('.stat-card');
        // Update statistics
    }

    // Prevent runtime errors if not yet implemented; attach future listeners here.
    setupEventListeners() {}
}

class DashboardNavigation {
    constructor() {
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.sections = document.querySelectorAll('.content-section');
        this.initializeNavigation();
    }

    initializeNavigation() {
        this.navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionId = button.dataset.section;
                this.showSection(sectionId);
            });
        });

        // Hash-based deep link support (e.g., #profile, #orders)
        const applyHash = () => {
            const hash = (location.hash || '#orders').replace('#','');
            this.showSection(hash);
        };
        window.addEventListener('hashchange', applyHash);
        applyHash();
    }

    showSection(sectionId) {
        // Update buttons
        this.navButtons.forEach(button => {
            button.setAttribute('aria-pressed', button.dataset.section === sectionId);
        });

        // Update sections
        this.sections.forEach(section => {
            section.classList.toggle('active', section.id === `${sectionId}-section`);
        });

        try { history.replaceState({}, '', `#${sectionId}`); } catch (_) {}
    }
}

// Initialize dashboard and navigation when document is ready
document.addEventListener('DOMContentLoaded', () => {
    try { new BusinessDashboard(); } catch (e) { console.warn('BusinessDashboard init failed:', e); }
    try { new DashboardNavigation(); } catch (e) { console.warn('DashboardNavigation init failed:', e); }
});

// ===== Business Profile Logic =====
BusinessDashboard.prototype.initBusinessProfile = function () {
    this.cacheProfileEls();
    this.loadProfileFromStorage();
    this.bindProfileForm();
    this.applyProfileToHeader();
    // When user id resolves (Supabase/local), re-load profile with user-scoped storage key
    this._userIdPromise.then(() => {
        this.loadProfileFromStorage();
    }).catch(() => {});
};

// Resolve the current user's ID (Supabase first, fallback to local auth.js storage)
BusinessDashboard.prototype.resolveUserId = async function () {
    try {
        const mod = await import('./supabase.js');
        const { supabase } = mod;
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.id) {
            this.userId = data.user.id;
            return this.userId;
        }
    } catch (_) { /* ignore */ }
    try {
        // Fallback to any locally stored userId set by legacy auth.js
        const localId = localStorage.getItem('userId');
        if (localId) {
            this.userId = localId;
            return this.userId;
        }
    } catch (_) { /* ignore */ }
    this.userId = 'guest';
    return this.userId;
};

BusinessDashboard.prototype._storageKey = function (suffix) {
    const uid = this.userId || 'guest';
    return `zippybook:${uid}:${suffix}`;
};

// Migrate data saved under global keys (legacy) into per-user scoped keys
BusinessDashboard.prototype.migrateLegacyStorageKeys = function () {
    try {
        const legacyProfileKey = 'zippybook.businessProfile';
        const legacyInventoryKey = 'zippybook.inventory';
        const scopedProfileKey = this._storageKey('businessProfile');
        const scopedInventoryKey = this._storageKey('inventory');

        const legacyProfile = localStorage.getItem(legacyProfileKey);
        const legacyInventory = localStorage.getItem(legacyInventoryKey);

        if (legacyProfile && !localStorage.getItem(scopedProfileKey)) {
            localStorage.setItem(scopedProfileKey, legacyProfile);
        }
        if (legacyInventory && !localStorage.getItem(scopedInventoryKey)) {
            localStorage.setItem(scopedInventoryKey, legacyInventory);
        }

        // Optionally clear legacy keys to avoid future confusion
        localStorage.removeItem(legacyProfileKey);
        localStorage.removeItem(legacyInventoryKey);
    } catch (_) { /* ignore */ }
};

BusinessDashboard.prototype.cacheProfileEls = function () {
    this.form = document.getElementById('business-profile-form');
    this.avatarPreview = document.getElementById('business-profile-avatar-preview');
    this.logoInput = document.getElementById('business-logo');
    this.featuredInput = document.getElementById('business-featured');
    this.featuredPreview = document.getElementById('business-featured-preview');
    this.featuredPlaceholder = document.getElementById('business-featured-placeholder');
    this.nameEl = document.getElementById('businessName');
    this.categoryEl = document.getElementById('businessCategory');
    this.descriptionEl = document.getElementById('businessDescription');
    this.phoneEl = document.getElementById('businessPhone');
    this.emailEl = document.getElementById('businessEmail');
    this.addressEl = document.getElementById('businessAddress');
    this.websiteEl = document.getElementById('businessWebsite');
    this.hoursEl = document.getElementById('businessHours');
    this.headerName = document.getElementById('business-name');
    this.headerAvatar = document.getElementById('business-avatar');
    this.accountDropdown = document.getElementById('accountDropdown');
    this.isProfileDirty = false;
    this.profileInputs = [
        this.nameEl, this.categoryEl, this.descriptionEl,
        this.phoneEl, this.emailEl, this.addressEl,
        this.websiteEl, this.hoursEl
    ].filter(Boolean);
    // Mark form as dirty when user edits any field
    this.profileInputs.forEach(inp => {
        inp.addEventListener('input', () => { this.isProfileDirty = true; });
        inp.addEventListener('change', () => { this.isProfileDirty = true; });
    });
};

BusinessDashboard.prototype.defaultProfile = function () {
    return {
        name: 'Business',
        category: 'Restaurant', // Default category that maps well to filtering
        description: '',
        phone: '',
        email: '',
        address: '',
        website: '',
        hours: '',
        avatarDataUrl: '',
        featured_image_url: ''
    };
};

BusinessDashboard.prototype.loadProfileFromStorage = function () {
    try {
        const key = this._storageKey('businessProfile');
        const raw = localStorage.getItem(key);
        // Do NOT read from legacy global key to avoid leaking another user's profile into a new account
        this.profile = raw ? JSON.parse(raw) : this.defaultProfile();
    } catch (_) {
        this.profile = this.defaultProfile();
    }
    this.populateProfileForm();
    // Attempt to hydrate from Supabase if logged in
    this.hydrateProfileFromSupabase();
};

BusinessDashboard.prototype.hydrateProfileFromSupabase = async function () {
    try {
        const remote = await fetchBusinessProfile();
        if (remote) {
            // Merge remote over local, but DO NOT overwrite with null/empty values
            const local = this.profile || this.defaultProfile();
            // Only take defined, non-empty values from remote
            const cleanedRemote = Object.fromEntries(
                Object.entries(remote).filter(([_, v]) => v !== null && v !== undefined && v !== '' )
            );
            // Start with local, apply cleaned remote
            const merged = { ...local, ...cleanedRemote };
            // Map logo_url to avatarDataUrl with fallback
            merged.avatarDataUrl = remote.logo_url || local.avatarDataUrl || '';
            // Keep local featured image if remote doesn't provide one
            if (!remote.featured_image_url) {
                merged.featured_image_url = local.featured_image_url || '';
            }
            this.profile = merged;
            // Avoid overwriting user edits if the form is being edited
            if (!this.isProfileDirty) {
                this.populateProfileForm();
            }
            this.applyProfileToHeader();
            this.saveProfileToStorage();
        }
    } catch (err) {
        // Not logged in or table missing; stay on localStorage
        console.warn('Supabase profile fetch skipped:', err?.message || err);
    }
};

BusinessDashboard.prototype.populateProfileForm = function () {
    if (!this.form) return;
    const p = this.profile || this.defaultProfile();
    if (this.nameEl) this.nameEl.value = p.name || '';
    if (this.categoryEl) this.categoryEl.value = p.category || 'Restaurant';
    if (this.descriptionEl) this.descriptionEl.value = p.description || '';
    if (this.phoneEl) this.phoneEl.value = p.phone || '';
    if (this.emailEl) this.emailEl.value = p.email || '';
    if (this.addressEl) this.addressEl.value = p.address || '';
    if (this.websiteEl) this.websiteEl.value = p.website || '';
    if (this.hoursEl) this.hoursEl.value = p.hours || '';
    if (this.avatarPreview && p.avatarDataUrl) this.avatarPreview.src = p.avatarDataUrl;
    // Featured image preview
    if (this.featuredPreview) {
        const has = !!(p.featured_image_url);
        if (has) {
            this.featuredPreview.src = p.featured_image_url;
            this.featuredPreview.style.display = 'block';
            this.featuredPlaceholder && (this.featuredPlaceholder.style.display = 'none');
        } else {
            this.featuredPreview.style.display = 'none';
            this.featuredPlaceholder && (this.featuredPlaceholder.style.display = 'inline');
        }
    }
};

BusinessDashboard.prototype.bindProfileForm = function () {
    if (!this.form) return;
    // Live preview for logo
    if (this.logoInput) {
        this.logoInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Try Supabase upload first; fallback to Data URL
            try {
                const url = await uploadBusinessLogo(file);
                this.avatarPreview && (this.avatarPreview.src = url);
                this.profile = { ...(this.profile || this.defaultProfile()), avatarDataUrl: url, logo_url: url };
                this.saveProfileToStorage();
                await this.persistProfileToSupabase();
                this.applyProfileToHeader();
            } catch (uploadErr) {
                console.warn('Logo upload failed, storing locally:', uploadErr?.message || uploadErr);
                const reader = new FileReader();
                reader.onload = () => {
                    const dataUrl = reader.result;
                    if (typeof dataUrl === 'string') {
                        this.avatarPreview && (this.avatarPreview.src = dataUrl);
                        this.profile = { ...(this.profile || this.defaultProfile()), avatarDataUrl: dataUrl };
                        this.saveProfileToStorage();
                        this.applyProfileToHeader();
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Featured image upload/preview
    if (this.featuredInput) {
        this.featuredInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            // Optimistic UI
            try {
                const url = await uploadBusinessFeaturedImage(file);
                if (this.featuredPreview) {
                    this.featuredPreview.src = url;
                    this.featuredPreview.style.display = 'block';
                }
                if (this.featuredPlaceholder) this.featuredPlaceholder.style.display = 'none';
                this.profile = { ...(this.profile || this.defaultProfile()), featured_image_url: url };
                this.saveProfileToStorage();
                await this.persistProfileToSupabase();
                this.toast('Featured image updated', 'success');
            } catch (err) {
                console.warn('Featured image upload failed, storing locally as data URL if possible:', err?.message || err);
                try {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                        if (dataUrl) {
                            if (this.featuredPreview) {
                                this.featuredPreview.src = dataUrl;
                                this.featuredPreview.style.display = 'block';
                            }
                            if (this.featuredPlaceholder) this.featuredPlaceholder.style.display = 'none';
                            // Keep local only; do not attempt to persist base64 to DB
                            this.profile = { ...(this.profile || this.defaultProfile()), featured_image_url: dataUrl };
                            this.saveProfileToStorage();
                            this.toast('Featured image set locally (offline mode)', 'info');
                        }
                    };
                    reader.readAsDataURL(file);
                } catch (e2) {
                    this.toast('Failed to set featured image', 'error');
                }
            }
        });
    }

    this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        const p = {
            ...(this.profile || this.defaultProfile()),
            name: this.nameEl?.value?.trim() || 'Business',
            category: this.categoryEl?.value || 'Restaurant',
            description: this.descriptionEl?.value || '',
            phone: this.phoneEl?.value || '',
            email: this.emailEl?.value || '',
            address: this.addressEl?.value || '',
            website: this.websiteEl?.value || '',
            hours: this.hoursEl?.value || '',
        };
        this.profile = p;
        this.saveProfileToStorage();
        this.applyProfileToHeader();
        this.persistProfileToSupabase();
        this.isProfileDirty = false;
        // Lightweight toast
        try {
            const toast = document.createElement('div');
            toast.className = 'toast info';
            toast.style.position = 'fixed';
            toast.style.bottom = '16px';
            toast.style.right = '16px';
            toast.style.background = '#fff';
            toast.style.padding = '10px 14px';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
            toast.textContent = 'Business profile saved';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 1800);
        } catch (_) {}
    });
};

BusinessDashboard.prototype.saveProfileToStorage = function () {
    try {
        const key = this._storageKey('businessProfile');
        localStorage.setItem(key, JSON.stringify(this.profile || this.defaultProfile()));
        // Also keep a per-user businessName for any other UI pieces that read it
        if (this.profile?.name) {
            const nameKey = this._storageKey('businessName');
            localStorage.setItem(nameKey, this.profile.name);
        }
    } catch (_) {}
};

BusinessDashboard.prototype.applyProfileToHeader = function () {
    const p = this.profile || this.defaultProfile();
    // Welcome header
    if (this.headerName) this.headerName.textContent = p.name || 'Business';
    if (this.headerAvatar) {
        if (p.avatarDataUrl) this.headerAvatar.src = p.avatarDataUrl;
    }
    // Account dropdown avatar/name
    const avatarEl = this.accountDropdown?.querySelector('.avatar-small');
    if (avatarEl && p.avatarDataUrl) avatarEl.src = p.avatarDataUrl;
    const usernameEl = this.accountDropdown?.querySelector('.username');
    if (usernameEl) usernameEl.textContent = p.name || 'Business';
};

BusinessDashboard.prototype.persistProfileToSupabase = async function () {
    const p = this.profile || this.defaultProfile();
    // Map avatarDataUrl to logo_url when it looks like an http(s) URL
    const logoUrl = (typeof p.avatarDataUrl === 'string' && /^https?:\/\//i.test(p.avatarDataUrl)) ? p.avatarDataUrl : (p.logo_url || null);
    // Only persist featured image if it's an http(s) URL (avoid storing base64)
    const featuredUrl = (typeof p.featured_image_url === 'string' && /^https?:\/\//i.test(p.featured_image_url)) ? p.featured_image_url : null;
    const payload = {
        name: p.name || null,
        category: p.category || null,
        description: p.description || null,
        phone: p.phone || null,
        email: p.email || null,
        address: p.address || null,
        website: p.website || null,
        hours: p.hours || null,
        logo_url: logoUrl,
        featured_image_url: featuredUrl,
        updated_at: new Date().toISOString(),
    };
    try {
        const saved = await upsertBusinessProfile(payload);
        // Normalize local profile with server response
        this.profile = { ...p, ...saved, avatarDataUrl: saved.logo_url || p.avatarDataUrl, featured_image_url: saved.featured_image_url || p.featured_image_url };
        this.saveProfileToStorage();
        
        // Notify featured businesses to refresh if category changed
        if (window.featuredBusinessesInstance && saved.category) {
            try {
                await window.featuredBusinessesInstance.refresh();
                console.log('Featured businesses refreshed after profile update');
            } catch (refreshErr) {
                console.warn('Could not refresh featured businesses:', refreshErr);
            }
        }
    } catch (err) {
        console.warn('Supabase profile upsert failed:', err?.message || err);
    }
};

// ===== Inventory Management =====
BusinessDashboard.prototype.initInventory = function () {
    // Cache els
    this.inventoryGrid = document.querySelector('#inventory-section .inventory-grid');
    this.openInventoryModalBtn = document.getElementById('openInventoryModalBtn');
    this.troubleshootImagesBtn = document.getElementById('troubleshootImagesBtn');
    this.inventoryModal = document.getElementById('inventoryModal');
    this.closeInventoryModalBtn = document.getElementById('closeInventoryModal');
    this.inventoryForm = document.getElementById('inventoryForm');
    this.inventoryDynamicFields = document.getElementById('inventoryDynamicFields');
    this.cancelInventoryBtn = document.getElementById('cancelInventoryBtn');
    this.imageFileInput = document.getElementById('inv_imageFile');
    this.imagePreview = document.getElementById('inv_imagePreview');
    this.imagePlaceholder = document.getElementById('inv_imagePlaceholder');
    this.tabSingle = document.getElementById('tabSingle');
    this.tabBulk = document.getElementById('tabBulk');
    this.panelSingle = document.getElementById('panelSingle');
    this.panelBulk = document.getElementById('panelBulk');
    this.bulkFile = document.getElementById('bulkFile');
    this.bulkTextarea = document.getElementById('bulkTextarea');
    this.previewBulkBtn = document.getElementById('previewBulkBtn');
    this.bulkPreview = document.getElementById('bulkPreview');
    this.bulkPreviewTable = document.getElementById('bulkPreviewTable');
    this.confirmBulkAddBtn = document.getElementById('confirmBulkAddBtn');
    this.clearBulkBtn = document.getElementById('clearBulkBtn');
    this.downloadCsvTemplateBtn = document.getElementById('downloadCsvTemplate');

    // Load from Supabase first, fallback to localStorage
    this.loadInventory();

    // Bindings
    this.openInventoryModalBtn?.addEventListener('click', () => this.openInventoryModal());
    this.troubleshootImagesBtn?.addEventListener('click', () => this.troubleshootImages());
    this.closeInventoryModalBtn?.addEventListener('click', () => this.closeInventoryModal());
    this.cancelInventoryBtn?.addEventListener('click', () => this.closeInventoryModal());
    this.inventoryModal?.addEventListener('click', (e) => {
        if (e.target === this.inventoryModal) this.closeInventoryModal();
    });

    // Tabs
    const setTab = (tab) => {
        const single = tab === 'single';
        this.tabSingle?.classList.toggle('active', single);
        this.panelSingle?.classList.toggle('active', single);
        this.tabBulk?.classList.toggle('active', !single);
        this.panelBulk?.classList.toggle('active', !single);
    };
    this.tabSingle?.addEventListener('click', () => setTab('single'));
    this.tabBulk?.addEventListener('click', () => setTab('bulk'));

    // Dynamic fields based on business type
    this.renderInventoryForm();
    this.categoryEl?.addEventListener('change', () => this.renderInventoryForm());

    // Image preview
    this.bindImagePreviewListener();
    // Cache additional image elements and bind preview listeners
    this.additionalImageInputs = document.querySelectorAll('.additional-image-input');
    this.additionalImagePreviews = document.querySelectorAll('.additional-image-preview');
    this.additionalImagePlaceholders = document.querySelectorAll('.additional-image-placeholder');
    this.bindAdditionalImagePreviewListeners();

    // Submit
    if (this.inventoryForm) {
        this._defaultInventorySubmitBound = (e) => { e.preventDefault(); this.saveCurrentInventoryForm(); };
        this.inventoryForm.addEventListener('submit', this._defaultInventorySubmitBound);
    }

    // Bulk
    this.bulkFile?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        this.bulkTextarea.value = text;
        this.previewCsv(text);
    });
    this.previewBulkBtn?.addEventListener('click', () => {
        const text = this.bulkTextarea?.value || '';
        this.previewCsv(text);
    });
    this.clearBulkBtn?.addEventListener('click', () => {
        if (this.bulkTextarea) this.bulkTextarea.value = '';
        if (this.bulkFile) this.bulkFile.value = '';
        this.bulkPreview?.setAttribute('style', 'display:none;');
        this.bulkPreviewTable && (this.bulkPreviewTable.innerHTML = '');
    });
    this.downloadCsvTemplateBtn?.addEventListener('click', () => this.downloadCsvTemplate());
    this.confirmBulkAddBtn?.addEventListener('click', () => this.confirmBulkAdd());

    // Once user id resolves (Supabase/local), reload inventory with user-scoped key
    this._userIdPromise.then(() => {
        // If Supabase auth exists, loadInventory will fetch remote; otherwise it will use per-user local key
        this.loadInventory();
    }).catch(() => {});
};

BusinessDashboard.prototype.bindImagePreviewListener = function () {
    this.imageFileInput?.addEventListener('change', () => {
        const file = this.imageFileInput.files?.[0];
        if (!file) {
            if (this.imagePreview) this.imagePreview.style.display = 'none';
            if (this.imagePlaceholder) this.imagePlaceholder.style.display = 'inline';
            return;
        }
        const url = URL.createObjectURL(file);
        if (this.imagePreview) {
            this.imagePreview.src = url;
            this.imagePreview.style.display = 'block';
        }
        if (this.imagePlaceholder) this.imagePlaceholder.style.display = 'none';
    });
};

BusinessDashboard.prototype.bindAdditionalImagePreviewListeners = function () {
    this.additionalImageInputs?.forEach(input => {
        input.addEventListener('change', (e) => {
            const index = e.target.dataset.index;
            const file = e.target.files?.[0];
            const preview = document.getElementById(`inv_imagePreview_${index}`);
            const placeholder = document.getElementById(`inv_imagePlaceholder_${index}`);

            if (!file) {
                if (preview) preview.style.display = 'none';
                if (placeholder) placeholder.style.display = 'flex';
                return;
            }
            const url = URL.createObjectURL(file);
            if (preview) {
                preview.src = url;
                preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
        });
    });
};

BusinessDashboard.prototype.loadInventory = async function () {
    try {
        console.log('Loading inventory from Supabase...');
        const remote = await fetchInventory();
        const rows = Array.isArray(remote) ? remote.map((row) => this.normalizeDbItemToLocal(row)) : [];
        this.inventory = rows;
        
        console.log(`Loaded ${rows.length} items from Supabase`);
        
        // Resolve display URLs for all items
        await Promise.all(this.inventory.map(async (it, index) => {
            try {
                // Check if we already have a working URL
                if (it.imageUrl && /^https?:\/\//i.test(it.imageUrl)) {
                    console.log(`Item ${it.name}: Already has URL ${it.imageUrl}`);
                    return;
                }
                
                // Try to get URL from stored path
                const storedPath = it.imagePath || it.imageUrl || '';
                if (storedPath) {
                    console.log(`Item ${it.name}: Resolving URL for path ${storedPath}`);
                    const resolvedUrl = await getInventoryFileUrl(storedPath);
                    if (resolvedUrl) {
                        it.imageUrl = resolvedUrl;
                        it.imagePath = storedPath;
                        console.log(`Item ${it.name}: Resolved to ${resolvedUrl}`);
                    } else {
                        console.warn(`Item ${it.name}: Could not resolve URL for path ${storedPath}`);
                    }
                }

                // Resolve additional image URLs
                if (it.additional_image_urls && Array.isArray(it.additional_image_urls)) {
                    it.additional_image_urls = await Promise.all(it.additional_image_urls.map(async (path) => {
                        if (path && !path.startsWith('http')) {
                            return await getInventoryFileUrl(path) || path;
                        }
                        return path;
                    }));
                }

            } catch (err) {
                console.warn(`Failed to resolve URL for item ${it.name}:`, err);
            }
        }));
        
        this.renderInventoryGrid();
        this.saveInventoryToStorage(); // keep local mirror
        console.log('Inventory loaded and rendered successfully');
    } catch (err) {
        // Not logged in or Supabase not configured — fallback to local
        console.warn('Supabase inventory fetch failed, loading from localStorage:', err?.message || err);
        this.inventory = this.loadInventoryFromStorage();
        this.renderInventoryGrid();
        
        if (this.inventory.length > 0) {
            this.toast('Loaded inventory from local storage (offline mode)', 'warning');
        }
    }
};

BusinessDashboard.prototype.normalizeDbItemToLocal = function (row) {
    return {
        id: row.id,
        businessCategory: this?.getBusinessCategory?.() || 'Restaurant',
        name: row.name || '',
        price: Number(row.price || 0),
        sku: row.sku || '',
        stock: Number(row.stock || 0),
        category: row.category || '',
        // Keep both path (DB) and URL (UI). DB may store the path in image_url for back-compat.
        imagePath: row.image_path || row.imagePath || row.image_url || row.image || row.imageurl || row.imageUrl || '',
        imageUrl: row.image_url && /^https?:\/\//i.test(row.image_url) ? row.image_url : '',
        additional_image_urls: row.additional_image_urls || [],
        description: row.description || '',
        flags: row.flags || {},
        meta: row.meta || {},
        createdAt: row.created_at || new Date().toISOString(),
    };
};

BusinessDashboard.prototype.openInventoryModal = function () {
    if (!this.inventoryModal) return;
    this.inventoryModal.classList.add('active');
    // reset single form
    this.renderInventoryForm();
    // reset image input and preview
    if (this.imageFileInput) this.imageFileInput.value = '';
    if (this.imagePreview) { this.imagePreview.src = ''; this.imagePreview.style.display = 'none'; }
    if (this.imagePlaceholder) this.imagePlaceholder.style.display = 'inline';

    // Re-cache additional images inside modal and reset them
    this.additionalImageInputs = document.querySelectorAll('.additional-image-input');
    this.additionalImagePreviews = document.querySelectorAll('.additional-image-preview');
    this.additionalImagePlaceholders = document.querySelectorAll('.additional-image-placeholder');
    this.additionalImageInputs?.forEach(input => input.value = '');
    this.additionalImagePreviews?.forEach(preview => { preview.src = ''; preview.style.display = 'none'; });
    this.additionalImagePlaceholders?.forEach(placeholder => placeholder.style.display = 'flex');
    this.bindAdditionalImagePreviewListeners();
};

BusinessDashboard.prototype.closeInventoryModal = function () {
    this.inventoryModal?.classList.remove('active');
};

BusinessDashboard.prototype.getBusinessCategory = function () {
    const p = this.profile || this.defaultProfile();
    // Map business category to display category for consistency
    const categoryMap = {
        'Restaurant': 'Restaurant',
        'Cafe': 'Cafe',
        'Hotel': 'Hotel',
        'Salon': 'Salon',
        'Spa': 'Spa',
        'Gym': 'Gym',
        'Transport': 'Transport',
        'Health': 'Health',
        'Events': 'Events',
        'Other': 'Other'
    };
    const category = p.category || 'Restaurant';
    return categoryMap[category] || category;
};

BusinessDashboard.prototype.renderInventoryForm = function () {
    if (!this.inventoryDynamicFields) return;
    const category = this.getBusinessCategory();
    // Base fields
    const base = [
        { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Item name' },
    ];
    const common = [
        { name: 'price', label: (category === 'Hotel' || category === 'Salon' || category === 'Gym') ? 'Rate' : 'Price', type: 'number', min: '0', step: '0.01', placeholder: '0.00' },
        { name: 'sku', label: 'SKU/Code', type: 'text', placeholder: 'Optional code' },
        { name: 'stock', label: (category === 'Hotel' || category === 'Salon' || category === 'Gym') ? 'Capacity/Slots' : 'Stock', type: 'number', min: '0', step: '1', placeholder: 'e.g., 100' },
        { name: 'category', label: 'Category', type: 'text', placeholder: 'e.g., Main, Beverage' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe the item/service' },
    ];
    // Category-specific fields
    let specific = [];
    if (category === 'Restaurant' || category === 'Cafe') {
        specific = [
            { name: 'prepTime', label: 'Prep Time (mins)', type: 'number', min: '0', step: '1', placeholder: 'e.g., 10' },
            { name: 'isVeg', label: 'Vegetarian', type: 'checkbox' },
            { name: 'isAvailable', label: 'Available', type: 'checkbox', checked: true },
        ];
    } else if (category === 'Hotel') {
        specific = [
            { name: 'roomType', label: 'Room Type', type: 'text', placeholder: 'e.g., Deluxe, Suite' },
            { name: 'occupancy', label: 'Max Occupancy', type: 'number', min: '1', step: '1', placeholder: 'e.g., 2' },
            { name: 'isAvailable', label: 'Available', type: 'checkbox', checked: true },
        ];
    } else if (category === 'Salon' || category === 'Gym') {
        specific = [
            { name: 'duration', label: 'Duration (mins)', type: 'number', min: '0', step: '5', placeholder: 'e.g., 60' },
            { name: 'requiresStaff', label: 'Requires Staff', type: 'checkbox', checked: true },
            { name: 'isAvailable', label: 'Available', type: 'checkbox', checked: true },
        ];
    } else {
        specific = [
            { name: 'isAvailable', label: 'Available', type: 'checkbox', checked: true },
        ];
    }

    const fields = [...base, ...specific, ...common];
    const toInput = (f) => {
        const id = `inv_${f.name}`;
        const commonAttrs = `id="${id}" name="${f.name}" ${f.required ? 'required' : ''}`;
        if (f.type === 'textarea') {
            return `<div class="form-group"><label for="${id}">${f.label}</label><textarea ${commonAttrs} placeholder="${f.placeholder || ''}"></textarea></div>`;
        }
        if (f.type === 'checkbox') {
            return `<div class="form-group"><label class="checkbox-label"><input type="checkbox" ${commonAttrs} ${f.checked ? 'checked' : ''}><span class="checkbox-custom" style="display:none"></span>${f.label}</label></div>`;
        }
        const min = f.min ? ` min="${f.min}"` : '';
        const step = f.step ? ` step="${f.step}"` : '';
        const placeholder = f.placeholder ? ` placeholder="${f.placeholder}"` : '';
        return `<div class="form-group"><label for="${id}">${f.label}</label><input type="${f.type}" ${commonAttrs}${min}${step}${placeholder}></div>`;
    };
    this.inventoryDynamicFields.innerHTML = fields.map(toInput).join('');
};

BusinessDashboard.prototype.collectInventoryFormValues = function () {
    try {
        const g = (n) => document.getElementById(`inv_${n}`);
        const val = (n) => g(n)?.value?.trim() || '';
        const num = (n) => {
            const v = parseFloat(val(n));
            return Number.isFinite(v) ? v : 0;
        };
        const bool = (n) => !!g(n)?.checked;
        const category = this.getBusinessCategory();
        const item = {
            id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            businessCategory: category,
            name: val('name'),
            price: num('price'),
            sku: val('sku'),
            stock: Math.max(0, Math.floor(num('stock'))),
            category: val('category'),
            imageUrl: '', // will be populated after upload if any
            additional_image_urls: [], // will be populated after upload
            description: val('description'),
            createdAt: new Date().toISOString(),
            flags: {
                isVeg: bool('isVeg'),
                isAvailable: bool('isAvailable'),
                requiresStaff: bool('requiresStaff'),
            },
            meta: {
                prepTime: Math.max(0, Math.floor(num('prepTime'))),
                roomType: val('roomType'),
                occupancy: Math.max(0, Math.floor(num('occupancy'))),
                duration: Math.max(0, Math.floor(num('duration'))),
            },
        };
        if (!item.name) {
            this.toast('Name is required', 'error');
            return null;
        }
        return item;
    } catch (err) {
        console.warn('collectInventoryFormValues failed', err);
        return null;
    }
};

BusinessDashboard.prototype.saveCurrentInventoryForm = async function () {
    const item = this.collectInventoryFormValues();
    if (!item) return;
    const file = this.imageFileInput?.files?.[0] || null;
    const additionalFiles = Array.from(this.additionalImageInputs || [])
        .map(input => input.files?.[0])
        .filter(Boolean);

    await this.addInventoryItem(item, file, additionalFiles);
    this.closeInventoryModal();
};

BusinessDashboard.prototype.addInventoryItem = async function (item, imageFile, additionalFiles = []) {
    // Upload image first if provided
    if (imageFile) {
        try {
            console.log('Starting image upload for:', item.name);
            const result = await uploadInventoryImage(imageFile, item.name || 'item');
            console.log('Upload result:', result);
            
            if (result) {
                if (typeof result === 'string') {
                    // Simple URL returned
                    item.imageUrl = result;
                    item.imagePath = result;
                } else if (result.url) {
                    // Object with url and path
                    item.imageUrl = result.url;
                    item.imagePath = result.path || result.url;
                } else {
                    console.warn('Unexpected upload result format:', result);
                }
                console.log('Image stored with URL:', item.imageUrl);
            }
        } catch (e) {
            console.error('Image upload failed:', e);
            this.toast(`Image upload failed: ${e.message}`, 'error');
            // Fallback: embed a local preview so the user still sees an image in the grid (not persisted to DB)
            try {
                const reader = new FileReader();
                const dataUrl = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
                    reader.onerror = reject;
                    reader.readAsDataURL(imageFile);
                });
                if (dataUrl) {
                    item.imageUrl = dataUrl; // UI display only
                    item.imagePath = '';     // no storage path
                    // Tag for internal use so we avoid writing data URL to DB
                    item._localImage = true;
                }
            } catch (fallbackErr) {
                console.warn('Failed to generate local preview data URL:', fallbackErr);
            }
        }
    }
    
    // Upload additional images
    if (additionalFiles.length > 0) {
        item.additional_image_urls = [];
        const uploadPromises = additionalFiles.map(async (file) => {
            try {
                const result = await uploadInventoryImage(file, `${item.name || 'item'}_additional`);
                if (result) {
                    const url = typeof result === 'string' ? result : result.url;
                    const path = typeof result === 'string' ? result : (result.path || result.url);
                    return { url, path };
                }
            } catch (e) {
                console.error('Additional image upload failed:', e);
                this.toast(`An additional image upload failed: ${e.message}`, 'error');
            }
            return null;
        });

        const results = await Promise.all(uploadPromises);
        item.additional_image_urls = results.filter(Boolean).map(r => r.url);
        // We need to store the paths to save in the database
        item.additional_image_paths = results.filter(Boolean).map(r => r.path);
    }

    // Save to Supabase if possible
    try {
        const toSave = { ...item };
        // For Supabase storage, save the path in image_url field
        // Avoid storing data URLs (too large and not portable)
        if (item.imagePath && item.imagePath !== item.imageUrl) {
            toSave.imageUrl = item.imagePath; // Store path in DB
        } else if (item.imageUrl && /^https?:\/\//i.test(item.imageUrl)) {
            toSave.imageUrl = item.imageUrl; // Store HTTP(S) URL in DB
        } else {
            toSave.imageUrl = null; // Do not persist data URLs/base64
        }
        
        if (item.additional_image_paths) {
            toSave.additional_image_urls = item.additional_image_paths;
        } else {
            toSave.additional_image_urls = (item.additional_image_urls || []).filter(url => /^https?:\/\//i.test(url));
        }
        delete toSave.additional_image_paths;


        console.log('Saving item to Supabase:', toSave);
        const saved = await upsertInventoryItem(toSave);
        console.log('Saved item:', saved);
        
        const normalized = this.normalizeDbItemToLocal(saved);
        
        // Ensure we have a working display URL
        if (saved.image_url && !normalized.imageUrl) {
            try {
                const displayUrl = await getInventoryFileUrl(saved.image_url);
                if (displayUrl) {
                    normalized.imageUrl = displayUrl;
                    normalized.imagePath = saved.image_url;
                }
            } catch (urlErr) {
                console.warn('Failed to resolve image URL:', urlErr);
                // Use the stored path as-is if URL resolution fails
                normalized.imageUrl = saved.image_url;
            }
        }
        
        // Resolve additional images for display
        if (saved.additional_image_urls && Array.isArray(saved.additional_image_urls)) {
            normalized.additional_image_urls = await Promise.all(
                saved.additional_image_urls.map(async (path) => {
                    if (path && !path.startsWith('http')) {
                        return await getInventoryFileUrl(path) || path;
                    }
                    return path;
                })
            );
        }

        // Fallback to original upload URL if available
        if (!normalized.imageUrl && item.imageUrl) {
            normalized.imageUrl = item.imageUrl;
        }
        
        this.inventory = Array.isArray(this.inventory) ? this.inventory : [];
        this.inventory.unshift(normalized);
        this.saveInventoryToStorage();
        this.renderInventoryGrid();
        this.toast('Item added to inventory', 'success');
        return;
    } catch (err) {
        console.warn('Supabase upsert failed; falling back to local storage', err?.message || err);
    }
    
    // Fallback to local storage
    this.inventory = Array.isArray(this.inventory) ? this.inventory : [];
    this.inventory.unshift(item);
    this.saveInventoryToStorage();
    this.renderInventoryGrid();
    this.toast('Item saved locally (offline mode)', 'warning');
};

BusinessDashboard.prototype.renderInventoryGrid = function () {
    if (!this.inventoryGrid) return;
    const list = Array.isArray(this.inventory) ? this.inventory : [];
    if (list.length === 0) {
        this.inventoryGrid.innerHTML = '<div class="empty-state"><p>No inventory yet. Click "Add Item" to get started.</p></div>';
        return;
    }
        const card = (it) => {
        const priceLabel = (it.businessCategory === 'Hotel' || it.businessCategory === 'Salon' || it.businessCategory === 'Gym') ? 'Rate' : 'Price';
        const stockLabel = (it.businessCategory === 'Hotel' || it.businessCategory === 'Salon' || it.businessCategory === 'Gym') ? 'Capacity' : 'Stock';
        
        const imgSrc = it.imageUrl || '';
        const hasImage = imgSrc && imgSrc.trim();
        
        let imageHtml = '';
        if (hasImage) {
            // Add debug info in data attributes
            imageHtml = `
                <div class="image-container">
                    <img src="${imgSrc}" 
                         alt="${escapeHtml(it.name)}" 
                         data-original-url="${imgSrc}"
                         data-item-id="${it.id}"
                         onload="console.log('Image loaded successfully for ${escapeHtml(it.name)}:', this.src)"
                         onerror="
                             console.error('Image failed to load for ${escapeHtml(it.name)}:', this.src);
                             this.style.display='none';
                             this.nextElementSibling.style.display='flex';
                         ">
                    <div style="
                         display:none; 
                         width:100%; 
                         height:100%; 
                         border-radius:8px; 
                         background:#f3f4f6; 
                         align-items:center; 
                         justify-content:center; 
                         flex-direction:column;
                         border:2px dashed #d1d5db;
                         color:#6b7280;
                         font-size:0.8rem;
                         text-align:center;
                         padding:10px;
                         position:absolute;
                         top:0;
                         left:0;
                    ">
                        <i class="fas fa-exclamation-triangle" style="font-size:1.5rem; margin-bottom:5px; color:#f59e0b;"></i>
                        <div>Image failed to load</div>
                        <div style="font-size:0.7rem; margin-top:3px; word-break:break-all;">${imgSrc.substring(0, 30)}...</div>
                    </div>
                </div>
            `;
        } else {
            imageHtml = `
                <div class="image-container">
                    <div style="
                         width:100%; 
                         height:100%; 
                         border-radius:8px; 
                         background:#f8fafc; 
                         display:flex; 
                         align-items:center; 
                         justify-content:center; 
                         border:2px dashed #e5e7eb;
                         color:#9ca3af;
                         font-size:0.9rem;
                         flex-direction:column;
                    ">
                        <i class="fas fa-image" style="font-size:2rem; margin-bottom:5px;"></i>
                        <div>No Image</div>
                    </div>
                </div>
            `;
        }
        
        let additionalImagesHtml = '';
        if (it.additional_image_urls && it.additional_image_urls.length > 0) {
            additionalImagesHtml = `
                <div class="additional-images-preview" style="display:flex; gap: 5px; margin-top: 5px;">
                    ${it.additional_image_urls.map(url => `<img src="${url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">`).join('')}
                </div>
            `;
        }

        return `
        <div class="inventory-card" data-id="${it.id}" style="background:#f8fafc; border:1px solid var(--border-color); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px;">
            ${imageHtml}
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <h4 style="margin:0; font-size:1rem;">${it.name}</h4>
                <span style="font-weight:700; color:var(--primary-color);">${priceLabel}: ${formatCurrency(it.price)}</span>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; font-size:0.9rem; color:var(--text-light);">
                ${it.category ? `<span class="badge" style="background:#eef2ff; color:#3730a3; padding:2px 8px; border-radius:999px;">${it.category}</span>` : ''}
                <span class="badge" style="background:#ecfeff; color:#155e75; padding:2px 8px; border-radius:999px;">${stockLabel}: ${it.stock}</span>
                ${it.flags?.isVeg ? '<span class="badge" style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:999px;">Veg</span>' : ''}
                ${it.flags?.requiresStaff ? '<span class="badge" style="background:#fef9c3; color:#713f12; padding:2px 8px; border-radius:999px;">Staff</span>' : ''}
                ${it.flags?.isAvailable ? '<span class="badge" style="background:#e0f2fe; color:#075985; padding:2px 8px; border-radius:999px;">Available</span>' : '<span class="badge" style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:999px;">Unavailable</span>'}
            </div>
            ${additionalImagesHtml}
            ${it.description ? `<p style="margin:0; font-size:0.9rem; color:var(--text-color);">${escapeHtml(it.description).slice(0, 140)}${it.description.length > 140 ? '…' : ''}</p>` : ''}
            <div style="display:flex; gap:6px; justify-content:flex-end;">
                <button class="btn" data-action="edit">Edit</button>
                <button class="btn" data-action="delete">Delete</button>
            </div>
        </div>`;
    };
    const html = list.map(card).join('');
    this.inventoryGrid.innerHTML = html;
    // Actions
    this.inventoryGrid.querySelectorAll('.inventory-card .btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardEl = e.target.closest('.inventory-card');
            const id = cardEl?.getAttribute('data-id');
            const action = e.target.getAttribute('data-action');
            const idx = this.inventory.findIndex(x => x.id === id);
            if (idx < 0) return;
            if (action === 'delete') {
                this.removeInventoryItem(id, idx);
            } else if (action === 'edit') {
                this.editInventoryItem(this.inventory[idx]);
            }
        });
    });
};

BusinessDashboard.prototype.removeInventoryItem = async function (id, localIndex) {
    try {
        await deleteInventoryItem(id);
        this.inventory.splice(localIndex, 1);
        this.saveInventoryToStorage();
        this.renderInventoryGrid();
        this.toast('Item deleted', 'success');
        return;
    } catch (err) {
        console.warn('Supabase delete failed; deleting locally:', err?.message || err);
    }
    // Fallback to local
    this.inventory.splice(localIndex, 1);
    this.saveInventoryToStorage();
    this.renderInventoryGrid();
    this.toast('Item deleted locally', 'info');
};

BusinessDashboard.prototype.editInventoryItem = function (item) {
    this.openInventoryModal();
    // Render form and populate
    this.renderInventoryForm();
    const set = (n, v, isCheckbox=false) => {
        const el = document.getElementById(`inv_${n}`);
        if (!el) return;
        if (isCheckbox) {
            el.checked = !!v;
        } else {
            el.value = (v ?? '').toString();
        }
    };
    set('name', item.name);
    set('price', item.price);
    set('sku', item.sku);
    set('stock', item.stock);
    set('category', item.category);
    set('imageUrl', item.imageUrl);
    set('description', item.description);
    set('isVeg', item.flags?.isVeg, true);
    set('isAvailable', item.flags?.isAvailable, true);
    set('requiresStaff', item.flags?.requiresStaff, true);
    set('prepTime', item.meta?.prepTime);
    set('roomType', item.meta?.roomType);
    set('occupancy', item.meta?.occupancy);
    set('duration', item.meta?.duration);

    // Populate additional image previews
    item.additional_image_urls?.forEach((url, index) => {
        const preview = document.getElementById(`inv_imagePreview_${index + 1}`);
        const placeholder = document.getElementById(`inv_imagePlaceholder_${index + 1}`);
        if (preview && url) {
            preview.src = url;
            preview.style.display = 'block';
            if (placeholder) placeholder.style.display = 'none';
        }
    });

    // Override submit to update instead of add
    const handler = async (e) => {
        e.preventDefault();
        const updated = this.collectInventoryFormValues();
        if (!updated) return;
        // Keep existing image unless changed
        const file = this.imageFileInput?.files?.[0] || null;
        const additionalFiles = Array.from(this.additionalImageInputs || [])
            .map(input => input.files?.[0])
            .filter(Boolean);

        if (file) {
            try {
                const result = await uploadInventoryImage(file, updated.name || 'item');
                if (result) {
                    if (typeof result === 'string') {
                        // Simple URL returned
                        updated.imageUrl = result;
                        updated.imagePath = result;
                    } else {
                        // Object with url and path
                        updated.imageUrl = result.url;
                        updated.imagePath = result.path || result.url;
                    }
                }
            } catch (e2) {
                console.warn('Image upload failed on edit; falling back to local preview', e2);
                // Fallback: generate a data URL so the user at least sees the image in UI (not persisted to DB)
                try {
                    const reader = new FileReader();
                    const dataUrl = await new Promise((resolve, reject) => {
                        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    if (dataUrl) {
                        updated.imageUrl = dataUrl; // UI display only
                        updated.imagePath = '';      // no storage path
                        updated._localImage = true;  // marker to avoid persisting base64
                        this.toast('Image will display locally (offline). It will sync when you’re online.', 'warning');
                    }
                } catch (fallbackErr) {
                    console.warn('Failed to generate local preview data URL on edit:', fallbackErr);
                }
            }
        } else {
            updated.imageUrl = item.imageUrl;
            updated.imagePath = item.imagePath || item.imageUrl;
        }

        // Handle additional images
        const existingAdditionalUrls = item.additional_image_urls || [];
        const newAdditionalImagePaths = [];
        if (additionalFiles.length > 0) {
            const uploadPromises = additionalFiles.map(file => uploadInventoryImage(file, `${updated.name || 'item'}_additional`));
            const results = await Promise.all(uploadPromises);
            results.forEach(result => {
                if (result) {
                    newAdditionalImagePaths.push(result.path || result.url);
                }
            });
        }
        // For now, let's just overwrite. A more complex implementation would allow removing/reordering.
        updated.additional_image_urls = newAdditionalImagePaths;


        updated.id = item.id; // preserve id
        updated.createdAt = item.createdAt;
        try {
            const toSave = { ...updated };
            // Avoid storing base64/data URLs
            if (updated.imagePath && updated.imagePath !== updated.imageUrl) {
                toSave.imageUrl = updated.imagePath; // store storage path in DB
            } else if (updated.imageUrl && /^https?:\/\//i.test(updated.imageUrl)) {
                toSave.imageUrl = updated.imageUrl; // store HTTP(S) URL if applicable
            } else {
                toSave.imageUrl = null; // don 00t persist data URLs
            }

            if (updated.additional_image_urls) {
                toSave.additional_image_urls = updated.additional_image_urls;
            }

            const saved = await upsertInventoryItem(toSave);
            const normalized = this.normalizeDbItemToLocal(saved);
            if (normalized.imagePath && !normalized.imageUrl) {
                try {
                    const show = await getInventoryFileUrl(normalized.imagePath);
                    if (show) normalized.imageUrl = show;
                } catch (urlErr) {
                    console.warn('Failed to resolve image URL after edit:', urlErr);
                    // Use path as-is if resolution fails so at least something is shown in debug
                    normalized.imageUrl = normalized.imagePath;
                }
            }
            if (!normalized.imageUrl && updated.imageUrl) normalized.imageUrl = updated.imageUrl;

            // Resolve additional images for display
            if (normalized.additional_image_urls && Array.isArray(normalized.additional_image_urls)) {
                normalized.additional_image_urls = await Promise.all(
                    normalized.additional_image_urls.map(async (path) => {
                        if (path && !path.startsWith('http')) {
                            return await getInventoryFileUrl(path) || path;
                        }
                        return path;
                    })
                );
            }

            const idx = this.inventory.findIndex(x => x.id === item.id);
            if (idx >= 0) this.inventory[idx] = normalized;
            this.saveInventoryToStorage();
            this.renderInventoryGrid();
            this.toast('Item updated', 'success');
            this.closeInventoryModal();
        } catch (err) {
            console.warn('Supabase upsert failed; updating locally:', err?.message || err);
            const idx = this.inventory.findIndex(x => x.id === item.id);
            if (idx >= 0) this.inventory[idx] = updated;
            this.saveInventoryToStorage();
            this.renderInventoryGrid();
            this.toast('Item updated locally', 'info');
            this.closeInventoryModal();
        }
        this.inventoryForm?.removeEventListener('submit', handler);
        // Rebind default submit
        this.inventoryForm?.addEventListener('submit', this._defaultInventorySubmitBound || (this._defaultInventorySubmitBound = (ev) => {
            ev.preventDefault();
            this.saveCurrentInventoryForm();
        }));
    };
    // Replace existing handler by cloning
    const form = this.inventoryForm;
    if (form) {
        const clone = form.cloneNode(true);
        form.parentNode.replaceChild(clone, form);
        this.inventoryForm = clone;
        this.inventoryForm.addEventListener('submit', handler);
        // Re-attach cancel buttons and dynamic refs inside modal
        this.cancelInventoryBtn = document.getElementById('cancelInventoryBtn');
        this.cancelInventoryBtn?.addEventListener('click', () => this.closeInventoryModal());
        // Re-cache image elements and bind preview
        this.imageFileInput = document.getElementById('inv_imageFile');
        this.imagePreview = document.getElementById('inv_imagePreview');
        this.imagePlaceholder = document.getElementById('inv_imagePlaceholder');
        this.bindImagePreviewListener();
    this.additionalImageInputs = document.querySelectorAll('.additional-image-input');
    this.additionalImagePreviews = document.querySelectorAll('.additional-image-preview');
    this.additionalImagePlaceholders = document.querySelectorAll('.additional-image-placeholder');
        this.bindAdditionalImagePreviewListeners();

        // Populate existing image preview if any
        if (item.imageUrl && this.imagePreview) {
            this.imagePreview.src = item.imageUrl;
            this.imagePreview.style.display = 'block';
            if (this.imagePlaceholder) this.imagePlaceholder.style.display = 'none';
        } else {
            if (this.imagePreview) this.imagePreview.style.display = 'none';
            if (this.imagePlaceholder) this.imagePlaceholder.style.display = 'inline';
        }

        // Populate additional images
        item.additional_image_urls?.forEach((url, index) => {
            const preview = document.getElementById(`inv_imagePreview_${index + 1}`);
            const placeholder = document.getElementById(`inv_imagePlaceholder_${index + 1}`);
            if (preview && url) {
                preview.src = url;
                preview.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
            }
        });
    }
};

BusinessDashboard.prototype.loadInventoryFromStorage = function () {
    try {
        const raw = localStorage.getItem(this._storageKey('inventory'));
        return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
};

BusinessDashboard.prototype.saveInventoryToStorage = function () {
    try { localStorage.setItem(this._storageKey('inventory'), JSON.stringify(this.inventory || [])); } catch (_) {}
};

function parseCsv(text) {
    const rows = text.split(/\r?\n/).filter(l => l.trim().length > 0).map(line => {
        // naive CSV: split by comma, handle basic quotes
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (ch === ',' && !inQuotes) {
                result.push(cur); cur = '';
            } else {
                cur += ch;
            }
        }
        result.push(cur);
        return result.map(c => c.trim());
    });
    if (rows.length === 0) return { headers: [], records: [] };
    const headers = rows[0].map(h => h.toLowerCase());
    const records = rows.slice(1).map(r => Object.fromEntries(r.map((v,i) => [headers[i] || `col${i}`, v])));
    return { headers, records };
}

BusinessDashboard.prototype.downloadCsvTemplate = function () {
    const category = this.getBusinessCategory();
    // base template
    const baseHeaders = ['name','price','category','stock','sku','description','imageUrl'];
    const extra = (category === 'Restaurant' || category === 'Cafe') ? ['prepTime','isVeg','isAvailable']
        : (category === 'Hotel') ? ['roomType','occupancy','isAvailable']
        : (category === 'Salon' || category === 'Gym') ? ['duration','requiresStaff','isAvailable']
        : ['isAvailable'];
    const headers = [...baseHeaders, ...extra];
    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
};

BusinessDashboard.prototype.previewCsv = function (text) {
    if (!text) {
        this.toast('Paste or upload a CSV first', 'warning');
        return;
    }
    const { headers, records } = parseCsv(text);
    if (!headers.length) { this.toast('Could not parse CSV', 'error'); return; }
    // Build table
    const th = `<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
    const rows = records.slice(0, 100).map(r => `<tr>${headers.map(h => `<td>${escapeHtml(r[h] ?? '')}</td>`).join('')}</tr>`).join('');
    const tb = `<tbody>${rows}</tbody>`;
    if (this.bulkPreviewTable) this.bulkPreviewTable.innerHTML = th + tb;
    if (this.bulkPreview) this.bulkPreview.style.display = 'block';
    this._bulkParsed = { headers, records };
};

BusinessDashboard.prototype.confirmBulkAdd = async function () {
    const parsed = this._bulkParsed;
    if (!parsed?.headers?.length) { this.toast('No parsed items to add', 'warning'); return; }
    const category = this.getBusinessCategory();
    const H = (k) => parsed.headers.indexOf(k.toLowerCase());
    const idx = {
        name: H('name'), price: H('price'), category: H('category'), stock: H('stock'), sku: H('sku'), description: H('description'), imageUrl: H('imageurl'),
        prepTime: H('preptime'), isVeg: H('isveg'), isAvailable: H('isavailable'),
        roomType: H('roomtype'), occupancy: H('occupancy'), duration: H('duration'), requiresStaff: H('requiresstaff'),
    };
    const toNum = (v) => {
        const n = parseFloat((v ?? '').toString().replace(/[^0-9.\-]/g,''));
        return Number.isFinite(n) ? n : 0;
    };
    const toBool = (v) => {
        const s = (v ?? '').toString().trim().toLowerCase();
        return s === 'true' || s === '1' || s === 'yes' || s === 'y';
    };
    const items = parsed.records.map(r => {
        const get = (i) => (i >= 0 ? r[parsed.headers[i]] : '');
        const item = {
            id: `item_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
            businessCategory: category,
            name: get(idx.name),
            price: toNum(get(idx.price)),
            sku: get(idx.sku),
            stock: Math.max(0, Math.floor(toNum(get(idx.stock)))) || 0,
            category: get(idx.category),
            imageUrl: get(idx.imageUrl),
            description: get(idx.description),
            createdAt: new Date().toISOString(),
            flags: {
                isVeg: toBool(get(idx.isVeg)),
                isAvailable: idx.isAvailable >= 0 ? toBool(get(idx.isAvailable)) : true,
                requiresStaff: toBool(get(idx.requiresStaff)),
            },
            meta: {
                prepTime: Math.max(0, Math.floor(toNum(get(idx.prepTime)))) || 0,
                roomType: get(idx.roomType),
                occupancy: Math.max(0, Math.floor(toNum(get(idx.occupancy)))) || 0,
                duration: Math.max(0, Math.floor(toNum(get(idx.duration)))) || 0,
            },
        };
        return item;
    }).filter(it => (it.name || '').trim().length > 0);
    if (!items.length) { this.toast('No valid items in CSV', 'warning'); return; }
    // Write to Supabase in bulk if possible (images must be URLs already in CSV)
    try {
        const saved = await bulkInsertInventory(items);
        const normalized = saved.map((row) => this.normalizeDbItemToLocal(row));
        this.inventory = [...normalized, ...(this.inventory || [])];
        this.saveInventoryToStorage();
        this.renderInventoryGrid();
        this.toast(`${normalized.length} items added`, 'success');
        this.closeInventoryModal();
        return;
    } catch (err) {
        console.warn('Supabase bulk insert failed; adding locally:', err?.message || err);
    }
    // Fallback local
    this.inventory = Array.isArray(this.inventory) ? this.inventory : [];
    this.inventory = [...items, ...this.inventory];
    this.saveInventoryToStorage();
    this.renderInventoryGrid();
    this.toast(`${items.length} items added locally`, 'info');
};

function escapeHtml(str) {
    return (str ?? '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatCurrency(n) {
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0); }
    catch (_) { return `$${(n || 0).toFixed?.(2) ?? n}`; }
}

BusinessDashboard.prototype.toast = function (message, type = 'info') {
    try {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.style.position = 'fixed';
        toast.style.bottom = '16px';
        toast.style.right = '16px';
        toast.style.background = '#fff';
        toast.style.padding = '10px 14px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
    } catch (_) {}
};

BusinessDashboard.prototype.troubleshootImages = function () {
    // Open the debug page in a new tab/window
    const debugUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, 'debug-inventory-images.html');
    window.open(debugUrl, '_blank');
    
    // Also log debug info to console
    console.group('🔧 Inventory Images Debug');
    console.log('Current inventory items:', this.inventory);
    
    // Test image URLs
    if (this.inventory && this.inventory.length > 0) {
        console.log('Testing image URLs...');
        this.inventory.forEach((item, index) => {
            console.group(`Item ${index + 1}: ${item.name}`);
            console.log('Image URL:', item.imageUrl);
            console.log('Image Path:', item.imagePath);
            console.log('Full item:', item);
            
            if (item.imageUrl) {
                const img = new Image();
                img.onload = () => console.log('✅ Image loads successfully');
                img.onerror = (e) => console.error('❌ Image failed to load:', e);
                img.src = item.imageUrl;
            } else {
                console.warn('⚠️ No image URL found');
            }
            console.groupEnd();
        });
    } else {
        console.warn('No inventory items found');
    }
    
    // Test Supabase connection
    import('./supabase.js').then(({ supabase, getCurrentUserOrThrow }) => {
        getCurrentUserOrThrow().then(user => {
            console.log('✅ User authenticated:', user.email);
        }).catch(err => {
            console.error('❌ Authentication failed:', err.message);
        });
    });
    
    console.groupEnd();
    
    this.toast('Debug information logged to console. Check the debug page for detailed analysis.', 'info');
};
