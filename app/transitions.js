// ============================================================================
// TRANSITIONS.JS — Smooth fade in/out with FSH logo between page navigations
// Add to every page BEFORE </body>: <script src="transitions.js"></script>
// ============================================================================

(function () {
    const MIN_DISPLAY_MS = 700; // overlay stays at least this long on arrival

    // ── Build overlay ─────────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'fsh-transition-overlay';

    const img = document.createElement('img');
    img.src = '../public/fsh_logo_colored.png';
    img.alt = '';
    overlay.appendChild(img);

    // Insert immediately so it covers the page from the very first paint
    if (document.body) {
        document.body.insertBefore(overlay, document.body.firstChild);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.body.insertBefore(overlay, document.body.firstChild);
        });
    }

    // Match theme before first paint — no flash of wrong color
    const theme = localStorage.getItem('fsh_theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    overlay.setAttribute('data-theme-overlay', theme);

    // Keep overlay theme in sync whenever the user toggles dark/light mode
    const themeObserver = new MutationObserver(() => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        overlay.setAttribute('data-theme-overlay', current);
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    // ── ARRIVAL: fade out after load + min display time ───────────────────────
    const pageArriveTime = Date.now();

    function fadeIn() {
        const elapsed   = Date.now() - pageArriveTime;
        const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

        setTimeout(() => {
            // Enable transition only now, right before fading out
            overlay.classList.add('fsh-fading');
            overlay.classList.add('fsh-out');
            overlay.addEventListener('transitionend', () => {
                overlay.style.display = 'none';
            }, { once: true });
        }, remaining);
    }

    if (document.readyState === 'complete') {
        fadeIn();
    } else {
        window.addEventListener('load', fadeIn);
    }

    // ── DEPARTURE: snap overlay visible instantly, then navigate ─────────────
    function shouldIntercept(href) {
        if (!href) return false;
        if (/^(https?:|mailto:|tel:|#|javascript:)/.test(href)) return false;
        return true;
    }

    function fadeOutThen(callback) {
        // Remove display:none and any leftover classes
        overlay.style.display = '';
        overlay.classList.remove('fsh-out', 'fsh-fading');
        // opacity is 1 and there's no transition — overlay is instantly visible.
        // Navigate after a brief hold so the overlay is painted before we leave.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setTimeout(callback, 80);
            });
        });
    }

    // Intercept <a> clicks
    document.addEventListener('click', function (e) {
        const anchor = e.target.closest('a[href]');
        if (!anchor) return;
        const href = anchor.getAttribute('href');
        if (!shouldIntercept(href)) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (anchor.target === '_blank') return;

        e.preventDefault();
        fadeOutThen(() => { window.location.href = href; });
    });

    // Programmatic navigation helper
    window.fshNavigate = function (url) {
        if (!shouldIntercept(url)) {
            window.location.href = url;
            return;
        }
        fadeOutThen(() => { window.location.href = url; });
    };

    // bfcache restore — fade in again
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            overlay.style.display = '';
            overlay.classList.remove('fsh-out', 'fsh-fading');
            fadeIn();
        }
    });

})();