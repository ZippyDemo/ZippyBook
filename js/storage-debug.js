// Lightweight client-side storage bucket verifier.
// Usage in browser console on any page that loads this module:
//   await ZippyStorageDebug.verifyBucket('business-featured-images');
//   await ZippyStorageDebug.verifyAllRequiredBuckets();
import { supabase } from './supabase.js';

async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

async function head(url, timeoutMs = 2500) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { method: 'HEAD', mode: 'cors', signal: ctrl.signal });
    clearTimeout(t);
    return res?.ok || false;
  } catch (_) {
    return false;
  }
}

export async function verifyBucket(bucket) {
  const out = { bucket, exists: false, insertOk: false, readOk: false, publicUrlOk: false, signedUrlOk: false, path: null, publicUrl: null, signedUrl: null, message: '' };
  try {
    const user = await getUser();
    if (!user) {
      out.message = 'Not authenticated. Log in first to test authenticated bucket policies.';
      return out;
    }
    const storage = supabase.storage.from(bucket);
    const path = `${user.id}/.healthcheck-${Date.now()}.txt`;
    const blob = new Blob([`ok ${new Date().toISOString()}`], { type: 'text/plain' });
    // Try upload
    const { error: upErr } = await storage.upload(path, blob, { upsert: true, cacheControl: '1' });
    if (upErr) {
      const msg = (upErr.message || '').toLowerCase();
      if (msg.includes('not found')) {
        out.message = 'Bucket not found.';
        return out; // exists=false, insertOk=false
      }
      // Bucket exists but policy likely blocks insert
      out.exists = true;
      out.message = `Upload failed (likely policy). ${upErr.message}`;
      return out;
    }
    out.exists = true;
    out.insertOk = true;
    out.path = path;

    // Try public URL
    const { data: pub } = storage.getPublicUrl(path);
    const purl = pub?.publicUrl || null;
    if (purl) {
      out.publicUrl = purl;
      out.publicUrlOk = await head(purl);
    }

    // Try signed URL
    const { data: sign, error: signErr } = await storage.createSignedUrl(path, 60);
    if (!signErr && sign?.signedUrl) {
      out.signedUrl = sign.signedUrl;
      out.signedUrlOk = await head(sign.signedUrl);
    }

    // Consider read OK if either public or signed works
    out.readOk = !!(out.publicUrlOk || out.signedUrlOk);
    out.message = 'OK';
    return out;
  } catch (e) {
    out.message = e?.message || String(e);
    return out;
  }
}

export async function verifyAllRequiredBuckets() {
  const buckets = [
    'business-featured-images',
    'business-logos',
    'profile-images',
    'inventory-images',
  ];
  const results = [];
  for (const b of buckets) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await verifyBucket(b));
  }
  return results;
}

// Expose for easy console access without import ceremony
if (typeof window !== 'undefined') {
  window.ZippyStorageDebug = { verifyBucket, verifyAllRequiredBuckets };
}
