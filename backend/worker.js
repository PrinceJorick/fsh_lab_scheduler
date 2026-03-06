// ============================================================================
// FSH LAB SCHEDULER — Cloudflare Worker (Single File)
//
// Bindings to set in Workers dashboard (Settings → Bindings):
//   DB               = your D1 database (fsh-scheduler)
//   JWT_SECRET       = any long random string
//   VAPID_PUBLIC_KEY  = uS7za5yoC3nV-_xrbAAtp3ey1vknCgV0kUGWc-VNXXKaad-0fU6GO5Y-3FQeiWmCpJmj3d68DcV-QLP8XPKhfg
//   VAPID_PRIVATE_KEY = mmnftH1OhjuWPtxUHolpgqSZo93evA3FfkCz_FzyoX4
// ============================================================================

const ALLOWED_ORIGIN = 'https://fshschedulercopy.pages.dev';

// ============================================================================
// ADMIN WHITELIST — only these emails can sign up or log in as Admin
// ============================================================================

const ADMIN_WHITELIST = [
    's2025108603@firstasia.edu.ph',
    'aaguevarra@firstasia.edu.ph',
    's2025108625@firstasia.edu.ph',
];

function corsHeaders(request) {
    const origin  = request.headers.get('Origin') || '';
    const allowed = origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost');
    return {
        'Access-Control-Allow-Origin':      allowed ? origin : ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods':     'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':     'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

function json(data, status = 200, request = null) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...(request ? corsHeaders(request) : {}) }
    });
}

// ============================================================================
// JWT
// ============================================================================

async function signJWT(payload, secret) {
    const header  = { alg: 'HS256', typ: 'JWT' };
    const encoded = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    const key     = await importKey(secret);
    const sig     = await crypto.subtle.sign('HMAC', key, str2ab(encoded));
    return `${encoded}.${ab2b64url(sig)}`;
}

async function verifyJWT(token, secret) {
    try {
        const [h, p, s] = token.split('.');
        if (!h || !p || !s) return null;
        const key   = await importKey(secret);
        const valid = await crypto.subtle.verify('HMAC', key, b64url2ab(s), str2ab(`${h}.${p}`));
        if (!valid) return null;
        const payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && Date.now() / 1000 > payload.exp) return null;
        return payload;
    } catch { return null; }
}

async function importKey(secret) {
    return crypto.subtle.importKey('raw', str2ab(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function b64url(str)    { return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function ab2b64url(ab)  { return btoa(String.fromCharCode(...new Uint8Array(ab))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function b64url2ab(str) { const b = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const ab = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) ab[i] = b.charCodeAt(i); return ab.buffer; }
function str2ab(str)    { return new TextEncoder().encode(str); }

function makeToken(user, secret) {
    return signJWT({ sub: user.id, email: user.email, role: user.role, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, secret);
}

async function getSessionUser(request, secret) {
    const auth  = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    return await verifyJWT(token, secret);
}

// ============================================================================
// PASSWORD HASHING
// ============================================================================

async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2(password, salt);
    return `${buf2hex(salt)}:${buf2hex(hash)}`;
}

async function verifyPassword(password, stored) {
    const [saltHex, hashHex] = stored.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = hex2buf(saltHex);
    const hash = await pbkdf2(password, salt);
    const a = hex2buf(hashHex), b = new Uint8Array(hash);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

async function pbkdf2(password, salt) {
    const km = await crypto.subtle.importKey('raw', str2ab(password), 'PBKDF2', false, ['deriveBits']);
    return crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256);
}

function buf2hex(buf) { return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''); }
function hex2buf(hex) { const a = new Uint8Array(hex.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.slice(i*2, i*2+2), 16); return a; }

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function findUserByEmail(env, email) {
    return env.DB.prepare('SELECT id, email, password, role FROM users WHERE email = ?').bind(email).first() || null;
}
async function createUser(env, email, hash, role) {
    const r = await env.DB.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)').bind(email, hash, role).run();
    return r.meta.last_row_id;
}
async function updatePassword(env, userId, hash) {
    await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(hash, userId).run();
}
function generateId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function validateEmail(e) { return e.endsWith('@firstasia.edu.ph') && e.includes('@'); }
function validatePassword(p) { return typeof p === 'string' && p.length >= 6; }

// ============================================================================
// WEB PUSH HELPERS
// ============================================================================

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function importVapidPrivateKey(privateKeyB64) {
    const keyData = urlBase64ToUint8Array(privateKeyB64);
    const pkcs8Header = new Uint8Array([
        0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13,
        0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
        0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
    ]);
    const pkcs8 = new Uint8Array(pkcs8Header.length + keyData.length);
    pkcs8.set(pkcs8Header);
    pkcs8.set(keyData, pkcs8Header.length);

    return crypto.subtle.importKey(
        'pkcs8', pkcs8,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false, ['sign']
    );
}

async function buildVapidAuth(endpoint, vapidPublic, vapidPrivate, subject) {
    const url      = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const expiry   = Math.floor(Date.now() / 1000) + 12 * 3600;

    const header  = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const payload = b64url(JSON.stringify({ aud: audience, exp: expiry, sub: subject }));
    const sigInput = `${header}.${payload}`;

    const privateKey = await importVapidPrivateKey(vapidPrivate);
    const signature  = await crypto.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        privateKey,
        str2ab(sigInput)
    );

    const jwt = `${sigInput}.${ab2b64url(signature)}`;
    return `vapid t=${jwt}, k=${vapidPublic}`;
}

async function sendWebPush(subscription, payload, env) {
    const { endpoint, keys } = subscription;
    const { p256dh, auth }   = keys;

    const encrypted = await encryptWebPush(payload, p256dh, auth);

    const vapidAuth = await buildVapidAuth(
        endpoint,
        env.VAPID_PUBLIC_KEY,
        env.VAPID_PRIVATE_KEY,
        `mailto:admin@${ALLOWED_ORIGIN.replace('https://', '')}`
    );

    const response = await fetch(endpoint, {
        method:  'POST',
        headers: {
            'Authorization':  vapidAuth,
            'Content-Type':   'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL':            '86400',
        },
        body: encrypted
    });

    return response.status;
}

async function encryptWebPush(payloadStr, p256dhB64, authB64) {
    const payloadBytes = str2ab(payloadStr);

    const p256dh = urlBase64ToUint8Array(p256dhB64);
    const receiverPublicKey = await crypto.subtle.importKey(
        'raw', p256dh,
        { name: 'ECDH', namedCurve: 'P-256' },
        true, []
    );

    const senderKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true, ['deriveKey', 'deriveBits']
    );

    const senderPublicKeyRaw = new Uint8Array(
        await crypto.subtle.exportKey('raw', senderKeyPair.publicKey)
    );

    const sharedSecret = await crypto.subtle.deriveBits(
        { name: 'ECDH', public: receiverPublicKey },
        senderKeyPair.privateKey, 256
    );

    const authSecret = urlBase64ToUint8Array(authB64);

    const ikm = await hkdf(
        new Uint8Array(sharedSecret),
        authSecret,
        concat(str2ab('WebPush: info\x00'), p256dh, senderPublicKeyRaw),
        32
    );

    const salt = crypto.getRandomValues(new Uint8Array(16));

    const cek   = await hkdf(ikm, salt, str2ab('Content-Encoding: aes128gcm\x00'), 16);
    const nonce = await hkdf(ikm, salt, str2ab('Content-Encoding: nonce\x00'), 12);

    const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);

    const paddedPayload = concat(payloadBytes, new Uint8Array([2]));

    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload)
    );

    const rs = 4096;
    const header = new Uint8Array(21 + senderPublicKeyRaw.length);
    header.set(salt, 0);
    new DataView(header.buffer).setUint32(16, rs, false);
    header[20] = senderPublicKeyRaw.length;
    header.set(senderPublicKeyRaw, 21);

    return concat(header, ciphertext);
}

async function hkdf(ikm, salt, info, length) {
    const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const prk     = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));
    const prkKey  = await crypto.subtle.importKey('raw', prk,  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const infoWithCounter = concat(info, new Uint8Array([1]));
    const okm     = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoWithCounter));
    return okm.slice(0, length);
}

function concat(...arrays) {
    const total = arrays.reduce((n, a) => n + a.length, 0);
    const out   = new Uint8Array(total);
    let offset  = 0;
    for (const a of arrays) { out.set(a, offset); offset += a.length; }
    return out;
}

async function pushToUser(env, toEmail, payload) {
    try {
        const subs = await env.DB.prepare(
            `SELECT * FROM push_subscriptions WHERE email = ?`
        ).bind(toEmail).all();

        const deadSubs = [];

        for (const sub of (subs.results || [])) {
            const subscription = {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth }
            };
            const status = await sendWebPush(subscription, JSON.stringify(payload), env);

            if (status === 410 || status === 404) {
                deadSubs.push(sub.id);
            }
        }

        for (const id of deadSubs) {
            await env.DB.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).bind(id).run();
        }
    } catch (err) {
        console.error('Push failed:', err);
    }
}

// ============================================================================
// AUTH HANDLERS
// ============================================================================

async function handleSignup(request, env) {
    const body     = await request.json().catch(() => ({}));
    const email    = (body.email    || '').toLowerCase().trim();
    const password = (body.password || '').trim();
    const role     = body.role === 'Admin' ? 'Admin' : 'Teacher';

    if (!email || !password) return json({ success: false, message: 'Email and password are required.' }, 400, request);
    if (!validateEmail(email)) return json({ success: false, message: 'Access Denied: Use your school email (@firstasia.edu.ph).' }, 400, request);
    if (!validatePassword(password)) return json({ success: false, message: 'Password must be at least 6 characters.' }, 400, request);

    // Whitelist check — only approved emails can register as Admin
    if (role === 'Admin' && !ADMIN_WHITELIST.includes(email))
        return json({ success: false, message: 'Access Denied: Your account is not authorized for Admin access.' }, 403, request);

    const existing = await findUserByEmail(env, email);
    if (existing) return json({ success: false, message: 'An account with this email already exists. Please sign in.' }, 409, request);

    const hash   = await hashPassword(password);
    const userId = await createUser(env, email, hash, role);
    const token  = await makeToken({ id: userId, email, role }, env.JWT_SECRET);
    return json({ success: true, message: 'Account created.', token, user: { id: userId, email, role } }, 201, request);
}

async function handleLogin(request, env) {
    const body     = await request.json().catch(() => ({}));
    const email    = (body.email    || '').toLowerCase().trim();
    const password = (body.password || '').trim();

    if (!email || !password) return json({ success: false, message: 'Email and password are required.' }, 400, request);
    if (!validateEmail(email)) return json({ success: false, message: 'Access Denied: Use your school email (@firstasia.edu.ph).' }, 400, request);

    const user = await findUserByEmail(env, email);
    if (!user) return json({ success: false, message: 'No account found. Please sign up first.' }, 401, request);

    const valid = await verifyPassword(password, user.password);
    if (!valid) return json({ success: false, message: 'Incorrect password.' }, 401, request);

    // Whitelist check — block non-whitelisted accounts from logging in as Admin
    if (user.role === 'Admin' && !ADMIN_WHITELIST.includes(email))
        return json({ success: false, message: 'Access Denied: Your account is not authorized for Admin access.' }, 403, request);

    const token = await makeToken(user, env.JWT_SECRET);
    return json({ success: true, message: 'Login successful.', token, user: { id: user.id, email: user.email, role: user.role } }, 200, request);
}

async function handleLogout(request, env) {
    return json({ success: true, message: 'Logged out.' }, 200, request);
}

const INACTIVITY_LIMIT_SECONDS = 60 * 60; // 1 hour

async function handleSession(request, env) {
    const user = await getSessionUser(request, env.JWT_SECRET);
    if (!user) return json({ success: false, message: 'Not authenticated.' }, 401, request);

    // ── Inactivity check ──────────────────────────────────────────────────
    // The frontend sends X-Last-Active (Unix ms) on every session call.
    // Only reject if the header is present, is a valid number, and is
    // clearly over 1 hour old. If missing or invalid, allow through —
    // the frontend timer is the primary enforcement layer.
    const lastActiveHeader = request.headers.get('X-Last-Active');
    if (lastActiveHeader) {
        const lastActiveMs = parseInt(lastActiveHeader, 10);
        if (!isNaN(lastActiveMs) && lastActiveMs > 0) {
            const inactiveSecs = (Date.now() - lastActiveMs) / 1000;
            if (inactiveSecs > INACTIVITY_LIMIT_SECONDS) {
                return json({ success: false, message: 'Session expired due to inactivity.' }, 401, request);
            }
        }
    }

    return json({ success: true, message: 'Session active.', user: { id: user.sub, email: user.email, role: user.role } }, 200, request);
}

async function handleChangePassword(request, env) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);

    const body = await request.json().catch(() => ({}));
    const currentPassword = (body.current_password || '').trim();
    const newPassword     = (body.new_password     || '').trim();

    if (!currentPassword || !newPassword) return json({ success: false, message: 'Both current and new password are required.' }, 400, request);
    if (!validatePassword(newPassword)) return json({ success: false, message: 'New password must be at least 6 characters.' }, 400, request);
    if (currentPassword === newPassword) return json({ success: false, message: 'New password must be different from current password.' }, 400, request);

    const user = await findUserByEmail(env, sessionUser.email);
    if (!user) return json({ success: false, message: 'User not found.' }, 404, request);

    const valid = await verifyPassword(currentPassword, user.password);
    if (!valid) return json({ success: false, message: 'Current password is incorrect.' }, 401, request);

    await updatePassword(env, user.id, await hashPassword(newPassword));
    return json({ success: true, message: 'Password changed successfully.' }, 200, request);
}

async function handleResetPassword(request, env) {
    const body        = await request.json().catch(() => ({}));
    const email       = (body.email        || '').toLowerCase().trim();
    const newPassword = (body.new_password || '').trim();

    if (!email || !newPassword) return json({ success: false, message: 'Email and new password are required.' }, 400, request);
    if (!validateEmail(email))  return json({ success: false, message: 'Invalid email.' }, 400, request);
    if (!validatePassword(newPassword)) return json({ success: false, message: 'Password must be at least 6 characters.' }, 400, request);

    const user = await findUserByEmail(env, email);
    if (!user) return json({ success: false, message: 'No account found with this email.' }, 404, request);

    await updatePassword(env, user.id, await hashPassword(newPassword));
    return json({ success: true, message: 'Password reset successfully.' }, 200, request);
}

// ============================================================================
// PUSH SUBSCRIPTION HANDLERS
// ============================================================================

async function handleSubscribePush(request, env) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);

    const body = await request.json().catch(() => ({}));
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth)
        return json({ success: false, message: 'Invalid subscription object.' }, 400, request);

    await env.DB.prepare(
        `INSERT INTO push_subscriptions (id, email, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth`
    ).bind(generateId(), sessionUser.email, endpoint, keys.p256dh, keys.auth).run();

    return json({ success: true, message: 'Push subscription saved.' }, 200, request);
}

async function handleUnsubscribePush(request, env) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);

    const body = await request.json().catch(() => ({}));
    if (body.endpoint) {
        await env.DB.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).bind(body.endpoint).run();
    } else {
        await env.DB.prepare(`DELETE FROM push_subscriptions WHERE email = ?`).bind(sessionUser.email).run();
    }

    return json({ success: true, message: 'Unsubscribed.' }, 200, request);
}

async function handleGetVapidKey(request, env) {
    return json({ success: true, publicKey: env.VAPID_PUBLIC_KEY }, 200, request);
}

// ============================================================================
// RESERVATION HANDLERS
// ============================================================================

async function handleCreateReservation(request, env) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);

    const body = await request.json().catch(() => ({}));
    const { lab, date, timeSlot, teacherName, subject, grade, students, purpose } = body;

    if (!lab || !date || !timeSlot || !teacherName || !subject || !grade || !students || !purpose)
        return json({ success: false, message: 'All reservation fields are required.' }, 400, request);

    const conflict = await env.DB.prepare(
        `SELECT id FROM reservations WHERE lab = ? AND date = ? AND time_slot = ? AND status != 'declined'`
    ).bind(lab, date, timeSlot).first();

    if (conflict)
        return json({ success: false, message: 'This time slot is already reserved. Please choose another.' }, 409, request);

    const id = generateId();
    await env.DB.prepare(
        `INSERT INTO reservations (id, lab, date, time_slot, teacher_name, subject, grade, students, purpose, requester, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
    ).bind(id, lab, date, timeSlot, teacherName, subject, grade, parseInt(students), purpose, sessionUser.email).run();

    const admins = await env.DB.prepare(`SELECT email FROM users WHERE role = 'Admin'`).all();
    const notifBatch = (admins.results || []).map(admin => {
        const nid = generateId();
        return env.DB.prepare(
            `INSERT INTO notifications (id, type, reservation_id, from_email, to_email, subject, message, lab, date, time_slot, status)
             VALUES (?, 'request', ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
        ).bind(
            nid, id, sessionUser.email, admin.email,
            `New Lab Request: ${lab}`,
            `${sessionUser.email.split('@')[0]} has requested ${lab} for ${subject} class.`,
            lab, date, timeSlot
        );
    });

    if (notifBatch.length > 0) await env.DB.batch(notifBatch);

    for (const admin of (admins.results || [])) {
        await pushToUser(env, admin.email, {
            title: '📬 New Lab Reservation Request',
            body:  `${sessionUser.email.split('@')[0]} requested ${lab} on ${date} (${timeSlot})`,
            icon:  '/public/fsh_logo_colored.png',
            badge: '/public/fsh_logo_colored.png',
            tag:   `request-${id}`,
            data:  { url: '/mail' }
        });
        // Send email notification to admin
        await sendReservationRequestEmail(admin.email, sessionUser.email, lab, date, timeSlot, subject, teacherName, env).catch(() => {});
    }

    return json({ success: true, message: 'Reservation submitted.', id }, 201, request);
}

async function handleGetReservations(request, env) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);

    const url = new URL(request.url);
    const lab = url.searchParams.get('lab');

    let results;
    if (sessionUser.role === 'Admin') {
        results = lab
            ? await env.DB.prepare(`SELECT * FROM reservations WHERE lab = ? ORDER BY created_at DESC`).bind(lab).all()
            : await env.DB.prepare(`SELECT * FROM reservations ORDER BY created_at DESC`).all();
    } else {
        results = lab
            ? await env.DB.prepare(
                `SELECT * FROM reservations 
                 WHERE lab = ? AND (status = 'approved' OR requester = ?) 
                 ORDER BY created_at DESC`
              ).bind(lab, sessionUser.email).all()
            : await env.DB.prepare(
                `SELECT * FROM reservations 
                 WHERE (status = 'approved' OR requester = ?) 
                 ORDER BY created_at DESC`
              ).bind(sessionUser.email).all();
    }

    const reservations = (results.results || []).map(r => ({
        id: r.id, lab: r.lab, date: r.date, timeSlot: r.time_slot,
        teacherName: r.teacher_name, subject: r.subject, grade: r.grade,
        students: r.students, purpose: r.purpose, requester: r.requester,
        status: r.status, createdAt: r.created_at, updatedAt: r.updated_at
    }));

    return json({ success: true, reservations }, 200, request);
}

async function handleUpdateReservation(request, env, id) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);

    const body = await request.json().catch(() => ({}));
    const reservation = await env.DB.prepare(`SELECT * FROM reservations WHERE id = ?`).bind(id).first();
    if (!reservation) return json({ success: false, message: 'Reservation not found.' }, 404, request);

    // ── TEACHER: can edit their own reservation fields (resets to pending) ──
    if (sessionUser.role !== 'Admin') {
        if (reservation.requester !== sessionUser.email)
            return json({ success: false, message: 'You can only edit your own reservations.' }, 403, request);
        if (reservation.status === 'declined')
            return json({ success: false, message: 'Declined reservations cannot be edited.' }, 400, request);

        const { date, timeSlot, teacherName, subject, grade, students, purpose } = body;
        if (!date || !timeSlot || !teacherName || !subject || !grade || !students || !purpose)
            return json({ success: false, message: 'All reservation fields are required.' }, 400, request);

        // Check for conflicts (excluding this reservation)
        const conflict = await env.DB.prepare(
            `SELECT id FROM reservations WHERE lab = ? AND date = ? AND time_slot = ? AND status != 'declined' AND id != ?`
        ).bind(reservation.lab, date, timeSlot, id).first();
        if (conflict)
            return json({ success: false, message: 'That time slot is already taken. Please choose another.' }, 409, request);

        await env.DB.prepare(
            `UPDATE reservations SET date = ?, time_slot = ?, teacher_name = ?, subject = ?, grade = ?, students = ?, purpose = ?, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(date, timeSlot, teacherName, subject, grade, parseInt(students), purpose, id).run();

        // Notify admins of the edit
        const admins = await env.DB.prepare(`SELECT email FROM users WHERE role = 'Admin'`).all();
        const notifBatch = (admins.results || []).map(admin => {
            const nid = generateId();
            return env.DB.prepare(
                `INSERT INTO notifications (id, type, reservation_id, from_email, to_email, subject, message, lab, date, time_slot, status)
                 VALUES (?, 'request', ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
            ).bind(
                nid, id, sessionUser.email, admin.email,
                `Updated Lab Request: ${reservation.lab}`,
                `${sessionUser.email.split('@')[0]} has updated their reservation for ${reservation.lab}.`,
                reservation.lab, date, timeSlot
            );
        });
        if (notifBatch.length > 0) await env.DB.batch(notifBatch);

        return json({ success: true, message: 'Reservation updated and resubmitted for approval.' }, 200, request);
    }

    // ── ADMIN: can approve or decline ──
    const status = body.status;
    if (status !== 'approved' && status !== 'declined')
        return json({ success: false, message: 'Status must be approved or declined.' }, 400, request);

    await env.DB.prepare(`UPDATE reservations SET status = ? WHERE id = ?`).bind(status, id).run();

    const notifStatus = status === 'approved' ? 'approved' : 'rejected';
    await env.DB.prepare(
        `UPDATE notifications SET status = ? WHERE reservation_id = ? AND type = 'request'`
    ).bind(notifStatus, id).run();

    const approved = status === 'approved';
    const message  = approved
        ? `Your reservation for ${reservation.lab} on ${reservation.date} (${reservation.time_slot}) has been approved!`
        : `Your reservation for ${reservation.lab} on ${reservation.date} (${reservation.time_slot}) was not approved. Please try a different time slot.`;

    await env.DB.prepare(
        `INSERT INTO notifications (id, type, reservation_id, from_email, to_email, subject, message, lab, date, time_slot, status)
         VALUES (?, 'approval', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        generateId(), id, sessionUser.email, reservation.requester,
        approved ? 'Reservation Approved' : 'Reservation Not Approved',
        message, reservation.lab, reservation.date, reservation.time_slot, notifStatus
    ).run();

    await pushToUser(env, reservation.requester, {
        title: approved ? '✅ Reservation Approved!' : '❌ Reservation Not Approved',
        body:  message,
        icon:  '/public/fsh_logo_colored.png',
        badge: '/public/fsh_logo_colored.png',
        tag:   `approval-${id}`,
        data:  { url: '/mail' }
    });

    // Send email notification to teacher
    await sendReservationStatusEmail(reservation.requester, reservation.lab, reservation.date, reservation.time_slot, approved, env).catch(() => {});

    return json({ success: true, message: `Reservation ${status}.` }, 200, request);
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

async function handleGetNotifications(request, env) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);

    const results = await env.DB.prepare(
        `SELECT * FROM notifications WHERE to_email = ? ORDER BY created_at DESC`
    ).bind(sessionUser.email).all();

    const notifications = (results.results || []).map(n => ({
        id: n.id, type: n.type, reservationId: n.reservation_id,
        from: n.from_email, to: n.to_email, subject: n.subject,
        message: n.message, lab: n.lab, date: n.date, timeSlot: n.time_slot,
        status: n.status, read: n.is_read === 1, createdAt: n.created_at
    }));

    return json({ success: true, notifications, unreadCount: notifications.filter(n => !n.read).length }, 200, request);
}

async function handleMarkNotificationRead(request, env, id) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);
    await env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ? AND to_email = ?`).bind(id, sessionUser.email).run();
    return json({ success: true, message: 'Notification marked as read.' }, 200, request);
}

async function handleMarkAllNotificationsRead(request, env) {
    const sessionUser = await getSessionUser(request, env.JWT_SECRET);
    if (!sessionUser) return json({ success: false, message: 'Not authenticated.' }, 401, request);
    await env.DB.prepare(`UPDATE notifications SET is_read = 1 WHERE to_email = ?`).bind(sessionUser.email).run();
    return json({ success: true, message: 'All notifications marked as read.' }, 200, request);
}

// ============================================================================
// OTP / FORGOT PASSWORD HANDLERS
// ============================================================================

async function sendOTPEmail(toEmail, otp, env) {
    // Uses Gmail SMTP via Brevo (Sendinblue) free SMTP relay
    // env.SMTP_USER = your Gmail address
    // env.SMTP_PASS = your Gmail App Password
    // We use Brevo's free SMTP API instead since Workers can't do raw SMTP

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'api-key':      env.BREVO_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sender:      { name: 'FSH Lab Scheduler', email: env.BREVO_SENDER_EMAIL },
            to:          [{ email: toEmail }],
            subject:     'Your Password Reset Code - FSH Lab Scheduler',
            htmlContent: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #081316; margin: 0;">FSH Lab Scheduler</h2>
                        <p style="color: #707475; margin: 5px 0 0;">Password Reset</p>
                    </div>
                    <div style="background: #f9f9f9; border-radius: 12px; padding: 30px; text-align: center;">
                        <p style="color: #081316; margin: 0 0 15px;">Your verification code is:</p>
                        <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #081316; margin: 20px 0;">${otp}</div>
                        <p style="color: #707475; font-size: 13px; margin: 15px 0 0;">This code expires in <strong>10 minutes</strong>.</p>
                    </div>
                    <p style="color: #707475; font-size: 12px; text-align: center; margin-top: 20px;">
                        If you didn't request this, you can safely ignore this email.
                    </p>
                </div>
            `
        })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.message || data.code || res.status };
}

async function sendReservationRequestEmail(toEmail, requesterEmail, lab, date, timeSlot, subject, teacherName, env) {
    const requesterName = requesterEmail.split('@')[0];
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender:      { name: 'FSH Lab Scheduler', email: env.BREVO_SENDER_EMAIL },
            to:          [{ email: toEmail }],
            subject:     `New Lab Reservation Request: ${lab}`,
            htmlContent: `
                <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #081316; margin: 0;">FSH Lab Scheduler</h2>
                        <p style="color: #707475; margin: 5px 0 0;">New Reservation Request</p>
                    </div>
                    <div style="background: #f9f9f9; border-radius: 12px; padding: 30px;">
                        <p style="color: #081316; margin: 0 0 20px;">A new lab reservation request requires your attention.</p>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Requested by</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${requesterName}</td></tr>
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Laboratory</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${lab}</td></tr>
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Date</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${date}</td></tr>
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Time Slot</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${timeSlot}</td></tr>
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Subject</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${subject}</td></tr>
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Teacher</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${teacherName}</td></tr>
                        </table>
                        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center;">
                            <p style="color: #707475; font-size: 13px; margin: 0 0 12px;">Please log in to the FSH Lab Scheduler to approve or decline this request.</p>
                            <a href="https://fshschedulercopy.pages.dev" style="background: #081316; color: white; padding: 10px 24px; border-radius: 50px; font-size: 13px; font-weight: 600; text-decoration: none;">Open FSH Lab Scheduler</a>
                        </div>
                    </div>
                    <p style="color: #707475; font-size: 12px; text-align: center; margin-top: 20px;">FSH Lab Scheduler — Fidelis Senior High</p>
                </div>
            `
        })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.message || data.code || res.status };
}

async function sendReservationStatusEmail(toEmail, lab, date, timeSlot, approved, env) {
    const statusColor  = approved ? '#22c55e' : '#ef4444';
    const statusText   = approved ? 'Approved ✅' : 'Not Approved ❌';
    const statusMsg    = approved
        ? 'Your reservation has been approved. You\'re all set!'
        : 'Your reservation was not approved. Please try a different time slot or contact the admin.';

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender:      { name: 'FSH Lab Scheduler', email: env.BREVO_SENDER_EMAIL },
            to:          [{ email: toEmail }],
            subject:     `Reservation ${approved ? 'Approved' : 'Not Approved'}: ${lab}`,
            htmlContent: `
                <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #081316; margin: 0;">FSH Lab Scheduler</h2>
                        <p style="color: #707475; margin: 5px 0 0;">Reservation Update</p>
                    </div>
                    <div style="background: #f9f9f9; border-radius: 12px; padding: 30px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <span style="background: ${statusColor}; color: white; padding: 6px 20px; border-radius: 50px; font-size: 14px; font-weight: 600;">${statusText}</span>
                        </div>
                        <p style="color: #081316; text-align: center; margin: 0 0 20px;">${statusMsg}</p>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Laboratory</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${lab}</td></tr>
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Date</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${date}</td></tr>
                            <tr><td style="padding: 8px 0; color: #707475; font-size: 13px;">Time Slot</td><td style="padding: 8px 0; color: #081316; font-weight: 600;">${timeSlot}</td></tr>
                        </table>
                        <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center;">
                            <p style="color: #707475; font-size: 13px; margin: 0;">Log in to the FSH Lab Scheduler to view your notifications.</p>
                        </div>
                    </div>
                    <p style="color: #707475; font-size: 12px; text-align: center; margin-top: 20px;">FSH Lab Scheduler — Fidelis Senior High</p>
                </div>
            `
        })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.message || data.code || res.status };
}

async function handleSendOTP(request, env) {
    const body  = await request.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase().trim();

    if (!validateEmail(email))
        return json({ success: false, message: 'Access Denied: Use your school email.' }, 400, request);

    const user = await findUserByEmail(env, email);
    if (!user)
        return json({ success: false, message: 'No account found with this email.' }, 404, request);

    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    await env.DB.prepare(
        `INSERT INTO otp_codes (email, code, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at`
    ).bind(email, otp, expires).run();

    const { ok, error } = await sendOTPEmail(email, otp, env);
    if (!ok)
        return json({ success: false, message: `Failed to send email: ${error}` }, 500, request);

    return json({ success: true, message: 'Verification code sent to your email.' }, 200, request);
}

async function handleVerifyOTP(request, env) {
    const body  = await request.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase().trim();
    const code  = (body.code  || '').trim();

    const record = await env.DB.prepare(
        `SELECT * FROM otp_codes WHERE email = ?`
    ).bind(email).first();

    if (!record)
        return json({ success: false, message: 'No OTP found. Please request a new code.' }, 404, request);
    if (Date.now() > record.expires_at)
        return json({ success: false, message: 'Code has expired. Please request a new one.' }, 400, request);
    if (record.code !== code)
        return json({ success: false, message: 'Invalid verification code.' }, 400, request);

    await env.DB.prepare(`DELETE FROM otp_codes WHERE email = ?`).bind(email).run();

    return json({ success: true, message: 'Code verified.' }, 200, request);
}

// ============================================================================
// MAIN FETCH HANDLER
// ============================================================================

// ============================================================================
// EMAIL VERIFICATION HANDLERS (for signup)
// ============================================================================

async function sendVerificationEmail(toEmail, code, env) {
    const verifyLink = `https://fshschedulercopy.pages.dev/index.html?verify=${code}&email=${encodeURIComponent(toEmail)}`;
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sender:      { name: 'FSH Lab Scheduler', email: env.BREVO_SENDER_EMAIL },
            to:          [{ email: toEmail }],
            subject:     'Verify your email - FSH Lab Scheduler',
            htmlContent: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #081316; margin: 0;">FSH Lab Scheduler</h2>
                        <p style="color: #707475; margin: 5px 0 0;">Email Verification</p>
                    </div>
                    <div style="background: #f9f9f9; border-radius: 12px; padding: 30px; text-align: center;">
                        <p style="color: #081316; margin: 0 0 20px;">Thanks for signing up! Please verify your email to continue.</p>
                        <p style="color: #707475; font-size: 13px; margin: 0 0 10px;">Your verification code is:</p>
                        <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #081316; margin: 15px 0;">${code}</div>
                        <p style="color: #707475; font-size: 13px; margin: 0 0 25px;">This code expires in <strong>10 minutes</strong>.</p>
                        <p style="color: #707475; font-size: 13px; margin: 0 0 15px;">Or click the button below to verify automatically:</p>
                        <a href="${verifyLink}" style="background: #081316; color: white; padding: 12px 28px; border-radius: 50px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">Verify Email</a>
                    </div>
                    <p style="color: #707475; font-size: 12px; text-align: center; margin-top: 20px;">
                        If you did not sign up for FSH Lab Scheduler, you can safely ignore this email.
                    </p>
                </div>
            `
        })
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, error: data.message || data.code || res.status };
}

async function handleSendVerification(request, env) {
    const body  = await request.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase().trim();

    if (!validateEmail(email))
        return json({ success: false, message: 'Access Denied: Use your school email.' }, 400, request);

    // Check if account already exists
    const existing = await findUserByEmail(env, email);
    if (existing)
        return json({ success: false, message: 'An account with this email already exists. Please sign in.' }, 409, request);

    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Reuse otp_codes table with a 'signup:' prefix to avoid collision with password reset codes
    await env.DB.prepare(
        `INSERT INTO otp_codes (email, code, expires_at)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at`
    ).bind(`signup:${email}`, code, expires).run();

    const { ok, error } = await sendVerificationEmail(email, code, env);
    if (!ok)
        return json({ success: false, message: `Failed to send verification email: ${error}` }, 500, request);

    return json({ success: true, message: 'Verification code sent to your email.' }, 200, request);
}

async function handleVerifySignup(request, env) {
    const body  = await request.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase().trim();
    const code  = (body.code  || '').trim();

    const record = await env.DB.prepare(
        `SELECT * FROM otp_codes WHERE email = ?`
    ).bind(`signup:${email}`).first();

    if (!record)
        return json({ success: false, message: 'No verification request found. Please request a new code.' }, 404, request);
    if (Date.now() > record.expires_at)
        return json({ success: false, message: 'Code has expired. Please request a new one.' }, 400, request);
    if (record.code !== code)
        return json({ success: false, message: 'Invalid verification code.' }, 400, request);

    // Clean up
    await env.DB.prepare(`DELETE FROM otp_codes WHERE email = ?`).bind(`signup:${email}`).run();

    return json({ success: true, message: 'Email verified.' }, 200, request);
}

export default {
    async fetch(request, env) {
        const url      = new URL(request.url);
        const pathname = url.pathname;

        if (request.method === 'OPTIONS')
            return new Response(null, { status: 204, headers: corsHeaders(request) });

        // Auth
        if (pathname === '/api/signup'          && request.method === 'POST')  return handleSignup(request, env);
        if (pathname === '/api/login'           && request.method === 'POST')  return handleLogin(request, env);
        if (pathname === '/api/logout'          && request.method === 'POST')  return handleLogout(request, env);
        if (pathname === '/api/session'         && request.method === 'GET')   return handleSession(request, env);
        if (pathname === '/api/change-password' && request.method === 'POST')  return handleChangePassword(request, env);
        if (pathname === '/api/reset-password'  && request.method === 'POST')  return handleResetPassword(request, env);
        if (pathname === '/api/send-verification'  && request.method === 'POST')  return handleSendVerification(request, env);
        if (pathname === '/api/verify-signup'        && request.method === 'POST')  return handleVerifySignup(request, env);
        if (pathname === '/api/send-otp'            && request.method === 'POST')  return handleSendOTP(request, env);
        if (pathname === '/api/verify-otp'          && request.method === 'POST')  return handleVerifyOTP(request, env);

        // Push subscriptions
        if (pathname === '/api/push/vapid-public-key' && request.method === 'GET')    return handleGetVapidKey(request, env);
        if (pathname === '/api/push/subscribe'        && request.method === 'POST')   return handleSubscribePush(request, env);
        if (pathname === '/api/push/unsubscribe'      && request.method === 'DELETE') return handleUnsubscribePush(request, env);

        // Reservations
        if (pathname === '/api/reservations' && request.method === 'POST') return handleCreateReservation(request, env);
        if (pathname === '/api/reservations' && request.method === 'GET')  return handleGetReservations(request, env);
        const resMatch = pathname.match(/^\/api\/reservations\/([^/]+)$/);
        if (resMatch && request.method === 'PATCH') return handleUpdateReservation(request, env, resMatch[1]);

        // Notifications
        if (pathname === '/api/notifications'          && request.method === 'GET')   return handleGetNotifications(request, env);
        if (pathname === '/api/notifications/read-all' && request.method === 'PATCH') return handleMarkAllNotificationsRead(request, env);
        const notifMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
        if (notifMatch && request.method === 'PATCH') return handleMarkNotificationRead(request, env, notifMatch[1]);

        return json({ success: false, message: 'Not found.' }, 404, request);
    }
};
