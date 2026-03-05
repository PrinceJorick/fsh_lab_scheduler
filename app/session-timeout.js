// ============================================================================
// SESSION-TIMEOUT.JS — 1-Hour Inactivity Auto-Logout
// Include on every protected page AFTER auth.js:
//   dashboard.html, laboratory.html, mail.html, profile.html
// ============================================================================

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const WARNING_BEFORE_MS   = 60 * 1000;       // warn 1 minute before logout
const CHECK_INTERVAL_MS   = 10 * 1000;       // check every 10 seconds
const STORAGE_KEY         = 'fsh_last_active';

let _warningShown   = false;
let _warningTimer   = null;
let _checkInterval  = null;
let _warningElement = null;

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

function recordActivity() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    // If the warning is showing, dismiss it — user came back
    if (_warningShown) {
        _warningShown = false;
        hideWarning();
    }
}

function getLastActive() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) : Date.now();
}

function getInactiveMs() {
    return Date.now() - getLastActive();
}

// ============================================================================
// LOGOUT
// ============================================================================

async function forceLogout(reason = 'inactivity') {
    stopInactivityTimer();

    // Best-effort server logout (don't await — we're leaving)
    const token = localStorage.getItem('fsh_token');
    if (token) {
        fetch('https://fsh-scheduler.medranowilljairuz.workers.dev/api/logout', {
            method:  'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).catch(() => {});
    }

    // Clear all session data
    localStorage.removeItem('fsh_token');
    localStorage.removeItem('fsh_user_email');
    localStorage.removeItem('fsh_user_role');
    localStorage.removeItem('fsh_last_unread_count');
    localStorage.removeItem(STORAGE_KEY);

    if (reason === 'inactivity') {
        // Flag for login page to show a message
        sessionStorage.setItem('fsh_timeout_reason', 'inactivity');
    }

    fshNavigate('index.html');
}

// ============================================================================
// WARNING BANNER
// ============================================================================

function showWarning(secondsLeft) {
    if (_warningShown) {
        // Just update the countdown
        const counter = document.getElementById('fsh-timeout-counter');
        if (counter) counter.textContent = secondsLeft;
        return;
    }

    _warningShown = true;

    _warningElement = document.createElement('div');
    _warningElement.id = 'fsh-timeout-warning';
    _warningElement.innerHTML = `
        <div id="fsh-timeout-inner">
            <span>⚠️ You'll be logged out in <strong><span id="fsh-timeout-counter">${secondsLeft}</span>s</strong> due to inactivity.</span>
            <button id="fsh-timeout-stay">Stay Logged In</button>
        </div>
    `;

    const style = document.createElement('style');
    style.id = 'fsh-timeout-style';
    style.textContent = `
        #fsh-timeout-warning {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            z-index: 99999;
            background: #f59e0b;
            color: #1a1a1a;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'IBM Plex Sans', sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
            animation: fsh-slide-up 0.3s ease;
        }
        @keyframes fsh-slide-up {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
        }
        #fsh-timeout-inner {
            display: flex;
            align-items: center;
            gap: 20px;
            max-width: 600px;
            width: 100%;
            justify-content: center;
        }
        #fsh-timeout-stay {
            background: #081316;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 8px 20px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.2s;
        }
        #fsh-timeout-stay:hover { background: #2a3a3f; }
        @media (max-width: 480px) {
            #fsh-timeout-inner { flex-direction: column; gap: 10px; text-align: center; }
        }
    `;

    if (!document.getElementById('fsh-timeout-style')) {
        document.head.appendChild(style);
    }
    document.body.appendChild(_warningElement);

    document.getElementById('fsh-timeout-stay').addEventListener('click', () => {
        recordActivity();
    });

    // Countdown ticker inside the banner
    let seconds = secondsLeft;
    _warningTimer = setInterval(() => {
        seconds--;
        const counter = document.getElementById('fsh-timeout-counter');
        if (counter) counter.textContent = Math.max(0, seconds);
        if (seconds <= 0) clearInterval(_warningTimer);
    }, 1000);
}

function hideWarning() {
    if (_warningTimer)   { clearInterval(_warningTimer); _warningTimer = null; }
    const el = document.getElementById('fsh-timeout-warning');
    if (el) el.remove();
    _warningElement = null;
}

// ============================================================================
// MAIN CHECK LOOP
// ============================================================================

function checkInactivity() {
    const inactiveMs = getInactiveMs();

    if (inactiveMs >= INACTIVITY_LIMIT_MS) {
        // Time's up
        forceLogout('inactivity');
        return;
    }

    const remainingMs = INACTIVITY_LIMIT_MS - inactiveMs;

    if (remainingMs <= WARNING_BEFORE_MS) {
        const secondsLeft = Math.ceil(remainingMs / 1000);
        showWarning(secondsLeft);
    } else if (_warningShown) {
        hideWarning();
        _warningShown = false;
    }
}

// ============================================================================
// PATCH /api/session CALLS TO INCLUDE X-Last-Active HEADER
// This lets the Worker verify inactivity server-side on every session check.
// We hook into fetch so auth.js / profile.js don't need to be modified.
// ============================================================================

(function patchFetchForLastActive() {
    const _originalFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
        // Only patch the exact /api/session endpoint, nothing else
        if (url.endsWith('/api/session')) {
            init = init ? Object.assign({}, init) : {};
            init.headers = Object.assign({}, init.headers, {
                'X-Last-Active': localStorage.getItem(STORAGE_KEY) || Date.now().toString()
            });
        }
        return _originalFetch(input, init);
    };
})();

// ============================================================================
// START / STOP
// ============================================================================

function startInactivityTimer() {
    // Record now so the clock starts fresh on page load
    recordActivity();

    // Listen for any user activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(evt => document.addEventListener(evt, recordActivity, { passive: true }));

    // Periodic check
    _checkInterval = setInterval(checkInactivity, CHECK_INTERVAL_MS);
}

function stopInactivityTimer() {
    if (_checkInterval) { clearInterval(_checkInterval); _checkInterval = null; }
    if (_warningTimer)  { clearInterval(_warningTimer);  _warningTimer  = null; }
    hideWarning();
}

// ============================================================================
// SHOW TIMEOUT MESSAGE ON LOGIN PAGE
// ============================================================================

function showTimeoutMessageIfNeeded() {
    const reason = sessionStorage.getItem('fsh_timeout_reason');
    if (reason === 'inactivity') {
        sessionStorage.removeItem('fsh_timeout_reason');

        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #ef4444; color: white; padding: 12px 24px;
            border-radius: 50px; font-size: 14px; font-weight: 500;
            z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            white-space: nowrap;
        `;
        banner.textContent = '⏱ You were logged out after 1 hour of inactivity.';
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 6000);
    }
}

// ============================================================================
// AUTO-INIT
// ============================================================================

function checkAndInit() {
    const isLoginPage = !!document.getElementById('selection-view');
    if (isLoginPage) {
        showTimeoutMessageIfNeeded();
        return;
    }

    const token = localStorage.getItem('fsh_token');
    if (!token) return;

    // If already inactive for over 1 hour, boot them immediately
    if (getInactiveMs() >= INACTIVITY_LIMIT_MS) {
        forceLogout('inactivity');
        return;
    }

    startInactivityTimer();
}

// Runs on normal page load
document.addEventListener('DOMContentLoaded', checkAndInit);

// Runs when Chrome restores a tab from session restore or bfcache
// This is the key fix for "closed and reopened browser" scenario
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        // Page was restored from bfcache — check immediately
        const token = localStorage.getItem('fsh_token');
        if (!token) return;
        if (getInactiveMs() >= INACTIVITY_LIMIT_MS) {
            forceLogout('inactivity');
        }
    }
});

// Also check when the tab becomes visible again (e.g. switching back to it)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        const token = localStorage.getItem('fsh_token');
        if (!token) return;
        if (getInactiveMs() >= INACTIVITY_LIMIT_MS) {
            forceLogout('inactivity');
        }
    }
});

// Expose for manual use if needed
window.startInactivityTimer = startInactivityTimer;
window.stopInactivityTimer  = stopInactivityTimer;
window.recordActivity       = recordActivity;