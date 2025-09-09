import { config } from './config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = config.SUPABASE_URL;
const supabaseKey = config.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configuration missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Small helper to get the current authenticated user (throws if not logged in)
async function getCurrentUserOrThrow() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const user = data?.user;
    if (!user) throw new Error('Not authenticated');
    return user;
}

// Try to ensure a URL is browser-accessible. If the bucket is private, getPublicUrl returns
// a URL that 403s when fetched. We attempt a quick HEAD; on failure we create a signed URL.
async function ensureAccessibleStorageUrl(storageRef, path, preferPublic = true, signedSeconds = 60 * 60 * 24 * 30) {
    try {
        const { data: publicData } = storageRef.getPublicUrl(path);
        const publicUrl = publicData?.publicUrl || null;
        if (preferPublic && publicUrl) {
            try {
                const ctrl = new AbortController();
                const t = setTimeout(() => ctrl.abort(), 2500);
                const res = await fetch(publicUrl, { method: 'HEAD', mode: 'cors', signal: ctrl.signal });
                clearTimeout(t);
                if (res && res.ok) return publicUrl;
            } catch (_) {
                // Fall through to signed URL if public check fails
            }
        }
        const { data: signedData, error: signedErr } = await storageRef.createSignedUrl(path, signedSeconds);
        if (signedErr) throw signedErr;
        if (!signedData?.signedUrl) throw new Error('Failed to create signed URL');
        return signedData.signedUrl;
    } catch (err) {
        throw err;
    }
}

// Function to add a profile
export async function addProfile(profile) {
    // Ensure the profile is linked to the authenticated user (RLS: id must equal auth.uid())
    const user = await getCurrentUserOrThrow();
    const payload = { ...profile, id: user.id };

    // Use upsert for idempotency (avoid duplicate key errors if profile exists)
    const { data, error } = await supabase
        .from('profiles')
        .upsert([payload], { onConflict: 'id' });
    if (error) throw error;
    return data;
}

// Fetch the current authenticated user's profile record (or null if none)
export async function fetchCurrentProfile() {
    const user = await getCurrentUserOrThrow();
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

// Upsert the current authenticated user's profile with provided fields
export async function upsertCurrentProfile(fields) {
    const user = await getCurrentUserOrThrow();
    const payload = { id: user.id, ...(fields || {}) };
    const { data, error } = await supabase
        .from('profiles')
        .upsert([payload], { onConflict: 'id' })
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

// Update auth user's public metadata (first_name, last_name, phone, address, role)
export async function updateAuthUserMetadata({ first_name, last_name, phone, address, role } = {}) {
    const updates = { data: {} };
    if (first_name !== undefined) updates.data.first_name = first_name;
    if (last_name !== undefined) updates.data.last_name = last_name;
    if (phone !== undefined) updates.data.phone = phone;
    if (address !== undefined) updates.data.address = address;
    if (role !== undefined) updates.data.role = role;
    const { data, error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    return data?.user || null;
}

// Function to fetch profiles
export async function fetchProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*');
    if (error) throw error;
    return data;
}

// Function to add a reservation
export async function addReservation(reservation) {
    // Attach the authenticated user's ID for RLS (assumes a user_id column with policy on auth.uid())
    const user = await getCurrentUserOrThrow();
    const payload = { ...reservation, user_id: user.id };

    const { data, error } = await supabase
        .from('reservations')
        .insert([payload]);
    if (error) throw error;
    return data;
}

// Function to fetch reservations
export async function fetchReservations() {
    const { data, error } = await supabase
        .from('reservations')
        .select('*');
    if (error) throw error;
    return data;
}

// Function to fetch data from the reservations table
export async function fetchSpreadsheetReservations() {
    const { data, error } = await supabase
        .from('reservations')
        .select('*');
    if (error) throw error;
    return data;
}

// Sign up a user with email/password and create a linked profile
// details: { email, password, firstName, lastName, phone, address, role }
export async function signUpWithProfile(details) {
    const { email, password, firstName, lastName, phone, address, role } = details || {};
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    // Create auth user (stores profile fields also as user metadata)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: role || 'customer',
                first_name: firstName || null,
                last_name: lastName || null,
                phone: phone || null,
                address: address || null,
            },
        },
    });
    if (signUpError) throw signUpError;

    const user = signUpData?.user || null;
    const session = signUpData?.session || null;

    // If email confirmation is ON in your project, session will be null until the user confirms.
    // In that case, we cannot insert into RLS-protected tables yet; return a hint to the caller.
    if (!user) {
        return { user: null, session: null, profile: null, needsConfirmation: true };
    }

    // Prepare profile payload; set id to auth user id for 1:1 relation
    const profile = {
        id: user.id,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        address: address || null,
        role: role || 'customer',
    };

    // If we have a session (email confirmations disabled), insert/upsert profile now
    // If not, the caller should either rely on a DB trigger or prompt the user to verify email first
    let upserted = null;
    if (session) {
        const { data, error } = await supabase
            .from('profiles')
            .upsert([profile], { onConflict: 'id' })
            .select('*')
            .single();
        if (error) throw error;
        upserted = data;
    }

    return { user, session, profile: upserted, needsConfirmation: !session };
}

// Sign in with email/password and return the user's role
// Returns: { user, session, role }
export async function signInWithEmail({ email, password }) {
    if (!email || !password) throw new Error('Email and password are required');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = data?.user || null;
    const session = data?.session || null;
    let role = user?.user_metadata?.role || null;
    if (!role && user) {
        const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        if (!profErr && prof) role = prof.role || role;
    }
    return { user, session, role: role || 'customer' };
}

// Get current authenticated user's role (from metadata first, then profile)
export async function getCurrentUserRole() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    const user = data.user;
    if (user.user_metadata?.role) return user.user_metadata.role;
    const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    return prof?.role || null;
}

// ===== Business Profiles API =====
// Table: business_profiles (expected schema)
// Columns: id (uuid, PK, references auth.users.id), name text, category text, description text,
//          phone text, email text, address text, website text, hours text, logo_url text,
//          updated_at timestamp

// Fetch the current user's business profile
export async function fetchBusinessProfile() {
    const user = await getCurrentUserOrThrow();
    const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
    if (error) throw error;
    return data || null;
}

// Upsert the current user's business profile
export async function upsertBusinessProfile(profile) {
    const user = await getCurrentUserOrThrow();
    const payload = { id: user.id, ...(profile || {}) };
    const { data, error } = await supabase
        .from('business_profiles')
        .upsert([payload], { onConflict: 'id' })
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

// Upload a business logo to Supabase Storage and return a public URL
// Requires a storage bucket named 'business-logos' with public access or signed URL generation.
export async function uploadBusinessLogo(file) {
    if (!file) throw new Error('No file provided');
    const user = await getCurrentUserOrThrow();
    const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const bucket = 'business-logos';

    const storage = supabase.storage.from(bucket);
    const { error: uploadError } = await storage.upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type || 'image/png' });
    if (uploadError) throw uploadError;
    // Return a working URL regardless of bucket visibility
    return await ensureAccessibleStorageUrl(storage, path, true, 60 * 60 * 24 * 365);
}

// Upload a business featured image (cover/banner) to Supabase Storage and return a public (or signed) URL
// Requires a storage bucket named 'business-featured-images' with public access or signed URL generation.
export async function uploadBusinessFeaturedImage(file) {
    if (!file) throw new Error('No file provided');
    const user = await getCurrentUserOrThrow();
    const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const bucket = 'business-featured-images';

    const storage = supabase.storage.from(bucket);
    const { error: uploadError } = await storage.upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/png',
    });
    if (uploadError) {
        const msg = (uploadError.message || '').toLowerCase();
        if (msg.includes('not found')) {
            throw new Error('Storage bucket "business-featured-images" not found. Create it in Supabase Storage and enable uploads for authenticated users.');
        }
        if (msg.includes('permission') || msg.includes('row level security') || msg.includes('rls')) {
            throw new Error('Insufficient permissions to upload to "business-featured-images". Update Storage policies to allow inserts for authenticated users.');
        }
        throw uploadError;
    }
    // Return a working URL regardless of bucket visibility
    return await ensureAccessibleStorageUrl(storage, path, true, 60 * 60 * 24 * 365);
}

// Upload a customer profile image to Supabase Storage and return a public URL
// Requires a storage bucket named 'profile-images' with public access or signed URL generation.
export async function uploadProfileImage(file) {
    if (!file) throw new Error('No file provided');
    const user = await getCurrentUserOrThrow();
    const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const bucket = 'profile-images';

    const storage = supabase.storage.from(bucket);
    const { error: uploadError } = await storage.upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/png',
    });
    if (uploadError) {
        const msg = (uploadError.message || '').toLowerCase();
        if (msg.includes('not found')) {
            throw new Error('Storage bucket "profile-images" not found. Create it in Supabase Storage and enable uploads for authenticated users.');
        }
        if (msg.includes('permission') || msg.includes('row level security') || msg.includes('rls')) {
            throw new Error('Insufficient permissions to upload to "profile-images". Update Storage policies to allow inserts for authenticated users.');
        }
        throw uploadError;
    }
    // Return a working URL regardless of bucket visibility
    return await ensureAccessibleStorageUrl(storage, path, true, 60 * 60 * 24 * 365);
}

// Update the current user's avatar URL on auth.users (user metadata)
// This stores the URL under user.user_metadata.avatar_url
export async function updateProfileAvatar(avatarUrl) {
    await getCurrentUserOrThrow();
    const { data, error } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
    if (error) throw error;
    return data?.user || null;
}

// ===== Inventory API (Supabase) =====
// Expected table: business_inventory
// Columns:
//   id text primary key
//   business_id uuid references auth.users(id)
//   name text, price numeric, sku text, stock int, category text,
//   image_url text, description text, flags jsonb, meta jsonb,
//   created_at timestamp, updated_at timestamp

// Upload an inventory image to Supabase Storage and return a public URL
// Requires a storage bucket named 'inventory-images'
export async function uploadInventoryImage(file, preferredFileName) {
    if (!file) throw new Error('No file provided');
    const user = await getCurrentUserOrThrow();
    const ext = (file.name?.split('.').pop() || 'png').toLowerCase();
    const safeName = (preferredFileName || 'item').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const path = `${user.id}/${Date.now()}_${safeName}.${ext}`;
    const bucket = 'inventory-images';

    const storage = supabase.storage.from(bucket);
    const { error: uploadError } = await storage.upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/png',
    });
    if (uploadError) {
        const msg = (uploadError.message || '').toLowerCase();
        if (msg.includes('not found')) {
            throw new Error('Storage bucket "inventory-images" not found. Create it in Supabase Storage and enable uploads for authenticated users.');
        }
        if (msg.includes('permission') || msg.includes('row level security') || msg.includes('rls')) {
            throw new Error('Insufficient permissions to upload to "inventory-images". Update Storage policies to allow inserts for authenticated users.');
        }
        throw uploadError;
    }
    // Return both the storage path (for DB) and a working URL for immediate UI use
    const accessibleUrl = await ensureAccessibleStorageUrl(storage, path, true, 60 * 60 * 24 * 7);
    return { url: accessibleUrl, path };
}

// Given a stored path like `${userId}/timestamp_name.ext`, return an accessible URL
export async function getInventoryFileUrl(path, preferPublic = true) {
    if (!path) return '';
    // If caller passed a Supabase public URL to an object, attempt to derive bucket and key
    if (/^https?:\/\//i.test(path)) {
        try {
            const u = new URL(path);
            const supa = new URL(config.SUPABASE_URL);
            if (u.host === supa.host && u.pathname.startsWith('/storage/v1/object/')) {
                // Patterns: /storage/v1/object/public/<bucket>/<key>
                //           /storage/v1/object/sign/<bucket>/<key>?token=...
                const parts = u.pathname.split('/').filter(Boolean);
                // parts = ['storage','v1','object','public|sign', bucket, ...key]
                const bucket = parts[4];
                const key = parts.slice(5).join('/');
                const storageRef = supabase.storage.from(bucket);
                return await ensureAccessibleStorageUrl(storageRef, key, preferPublic, 60 * 60 * 24 * 7);
            }
        } catch (_) {
            // Fall through to returning the URL as-is
        }
        return path;
    }
    const storage = supabase.storage.from('inventory-images');
    try {
        return await ensureAccessibleStorageUrl(storage, path, preferPublic, 60 * 60 * 24 * 7);
    } catch (_) {
        return '';
    }
}

export async function fetchInventory() {
    const user = await getCurrentUserOrThrow();
    const { data, error } = await supabase
        .from('business_inventory')
        .select('*')
        .eq('business_id', user.id)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
}

export async function upsertInventoryItem(item) {
    const user = await getCurrentUserOrThrow();
    const now = new Date().toISOString();
    const payload = {
        id: item.id,
        business_id: user.id,
        name: item.name ?? null,
        price: item.price ?? null,
        sku: item.sku ?? null,
        stock: item.stock ?? null,
        category: item.category ?? null,
        image_url: item.imageUrl ?? null,
        additional_image_urls: item.additional_image_urls ?? null,
        description: item.description ?? null,
        flags: item.flags ?? null,
        meta: item.meta ?? null,
        created_at: item.createdAt ?? now,
        updated_at: now,
    };
    const { data, error } = await supabase
        .from('business_inventory')
        .upsert([payload], { onConflict: 'id' })
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

export async function bulkInsertInventory(items) {
    if (!Array.isArray(items) || !items.length) return [];
    const user = await getCurrentUserOrThrow();
    const now = new Date().toISOString();
    const rows = items.map((item) => ({
        id: item.id,
        business_id: user.id,
        name: item.name ?? null,
        price: item.price ?? null,
        sku: item.sku ?? null,
        stock: item.stock ?? null,
        category: item.category ?? null,
        image_url: item.imageUrl ?? null,
        additional_image_urls: item.additional_image_urls ?? null,
        description: item.description ?? null,
        flags: item.flags ?? null,
        meta: item.meta ?? null,
        created_at: item.createdAt ?? now,
        updated_at: now,
    }));
    // Insert in batches (e.g., 200) to avoid payload limits
    const batchSize = 200;
    const inserted = [];
    for (let i = 0; i < rows.length; i += batchSize) {
        const slice = rows.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from('business_inventory')
            .upsert(slice, { onConflict: 'id' })
            .select('*');
        if (error) throw error;
        if (Array.isArray(data)) inserted.push(...data);
    }
    return inserted;
}

export async function deleteInventoryItem(id) {
    const user = await getCurrentUserOrThrow();
    const { error } = await supabase
        .from('business_inventory')
        .delete()
        .eq('id', id)
        .eq('business_id', user.id);
    if (error) throw error;
    return true;
}
