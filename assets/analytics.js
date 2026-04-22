/* ==========================================================================
   Reizes Law — Analytics + Cookie Banner
   Event tracking for GA4 (G-NYGP4NDRD2) plus a dismissible cookie banner.
   Respects user opt-out via localStorage flag 'reizes_analytics_opt_out'.
   ========================================================================== */

(function () {
    'use strict';

    var MEASUREMENT_ID = 'G-NYGP4NDRD2';
    var CONSENT_KEY = 'reizes_cookie_consent';
    var OPT_OUT_KEY = 'reizes_analytics_opt_out';

    // localStorage helpers — guard against SecurityError in private browsing
    // modes, sandboxed iframes, or when storage is disabled.
    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* swallow */ } }

    // 1. Honor opt-out early. gtag.js checks this flag on every call.
    if (lsGet(OPT_OUT_KEY) === '1') {
        window['ga-disable-' + MEASUREMENT_ID] = true;
    }

    // Safe wrapper: gtag may not be loaded if script blocked / opted out.
    function track(eventName, params) {
        if (typeof window.gtag !== 'function') return;
        if (window['ga-disable-' + MEASUREMENT_ID]) return;
        try {
            window.gtag('event', eventName, params || {});
        } catch (e) { /* swallow */ }
    }

    // Expose for inline scripts (e.g., form success handler on homepage).
    window.reizesTrack = track;

    // 2. Inject banner styles (self-contained; works on pages without styles.css).
    function injectBannerStyles() {
        if (document.getElementById('reizesBannerStyles')) return;
        var s = document.createElement('style');
        s.id = 'reizesBannerStyles';
        s.textContent = [
            '.cookie-banner{',
            '  position:fixed;left:20px;right:20px;bottom:20px;z-index:10000;',
            '  background:#1a2b3c;color:#ffffff;',
            '  padding:20px 24px;border-radius:12px;',
            '  box-shadow:0 20px 50px rgba(0,0,0,0.25);',
            '  border:1px solid rgba(197,160,89,0.3);',
            '  display:flex;align-items:center;gap:24px;flex-wrap:wrap;',
            '  font-family:"Montserrat",sans-serif;font-size:0.9rem;line-height:1.55;',
            '  transform:translateY(200%);transition:transform 0.45s cubic-bezier(0.165,0.84,0.44,1);',
            '  max-width:820px;margin:0 auto;',
            '}',
            '.cookie-banner.visible{transform:translateY(0);}',
            '.cookie-banner__text{flex:1;min-width:240px;color:#dde3ea;}',
            '.cookie-banner__text strong{color:#ffffff;}',
            '.cookie-banner__text a{color:#c5a059;text-decoration:underline;}',
            '.cookie-banner__text a:hover{text-decoration:none;}',
            '.cookie-banner__actions{display:flex;gap:12px;flex-wrap:wrap;}',
            '.cookie-banner__btn{',
            '  font:inherit;font-weight:600;font-size:0.82rem;',
            '  text-transform:uppercase;letter-spacing:1px;',
            '  padding:12px 26px;border:1px solid #c5a059;cursor:pointer;',
            '  transition:all 0.3s ease;border-radius:4px;',
            '}',
            '.cookie-banner__btn--accept{background:#c5a059;color:#1a2b3c;}',
            '.cookie-banner__btn--accept:hover{background:#d4b476;}',
            '.cookie-banner__btn--decline{background:transparent;color:#c5a059;}',
            '.cookie-banner__btn--decline:hover{background:#c5a059;color:#1a2b3c;}',
            '@media (max-width:560px){',
            '  .cookie-banner{left:12px;right:12px;bottom:12px;padding:18px;gap:16px;}',
            '  .cookie-banner__actions{width:100%;}',
            '  .cookie-banner__btn{flex:1;padding:12px 18px;}',
            '}'
        ].join('');
        document.head.appendChild(s);
    }

    // 3. Build + show the cookie banner if no consent recorded yet.
    function maybeShowBanner() {
        if (lsGet(CONSENT_KEY)) return;
        injectBannerStyles();

        // Resolve privacy page URL: always root-absolute.
        var banner = document.createElement('div');
        banner.className = 'cookie-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', 'Cookie notice');
        banner.innerHTML =
            '<div class="cookie-banner__text">' +
                '<strong>We use cookies.</strong> This site uses Google Analytics to understand how visitors engage with our content. ' +
                'See our <a href="/privacy/">Privacy Policy</a> for details and opt-out instructions.' +
            '</div>' +
            '<div class="cookie-banner__actions">' +
                '<button type="button" class="cookie-banner__btn cookie-banner__btn--decline" data-consent="declined">Decline</button>' +
                '<button type="button" class="cookie-banner__btn cookie-banner__btn--accept" data-consent="accepted">Accept</button>' +
            '</div>';
        document.body.appendChild(banner);

        // Animate in next frame.
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { banner.classList.add('visible'); });
        });

        banner.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-consent]');
            if (!btn) return;
            var choice = btn.getAttribute('data-consent');
            lsSet(CONSENT_KEY, choice);
            if (choice === 'declined') {
                lsSet(OPT_OUT_KEY, '1');
                window['ga-disable-' + MEASUREMENT_ID] = true;
            }
            track('cookie_consent', { choice: choice });
            banner.classList.remove('visible');
            setTimeout(function () { banner.remove(); }, 500);
        });
    }

    // 4. Wire up event tracking once DOM is ready.
    function wireEvents() {
        // Floating "Call Now" pill (bottom-right)
        document.querySelectorAll('.floating-call').forEach(function (el) {
            el.addEventListener('click', function () {
                track('click_call_now', { location: 'floating_button' });
            });
        });

        // Any other tel: or mailto: link on the page
        document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
            if (el.classList.contains('floating-call')) return; // already tracked
            el.addEventListener('click', function () {
                var num = (el.getAttribute('href') || '').replace(/^tel:/, '');
                track('click_phone', {
                    phone_number: num,
                    location: locationOf(el)
                });
            });
        });
        document.querySelectorAll('a[href^="mailto:"]').forEach(function (el) {
            el.addEventListener('click', function () {
                track('click_email', { location: locationOf(el) });
            });
        });

        // Contact form
        var form = document.getElementById('contactForm');
        if (form) {
            form.addEventListener('submit', function () {
                track('form_submit', { form_id: 'contactForm' });
            });
        }

        // FAQ expansions
        document.querySelectorAll('.faq-question').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var labelEl = btn.querySelector('span');
                var q = labelEl ? labelEl.textContent.trim().slice(0, 90) : 'unknown';
                track('faq_expand', { question: q });
            });
        });

        // Service-card clicks (homepage practice-area tiles)
        document.querySelectorAll('.service-card').forEach(function (el) {
            el.addEventListener('click', function () {
                var title = el.querySelector('h3');
                track('click_practice_area', {
                    area: title ? title.textContent.trim() : 'unknown',
                    destination: el.getAttribute('href') || ''
                });
            });
        });

        // Primary CTA buttons (e.g., "Initiate Consultation")
        document.querySelectorAll('.cta-button').forEach(function (el) {
            el.addEventListener('click', function () {
                track('click_cta', {
                    label: (el.textContent || '').trim().slice(0, 60),
                    destination: el.getAttribute('href') || ''
                });
            });
        });
    }

    // Infer a readable "location" for a clicked link (top-bar, footer, etc.)
    function locationOf(el) {
        if (el.closest('.top-bar')) return 'top_bar';
        if (el.closest('footer')) return 'footer';
        if (el.closest('.contact')) return 'contact_section';
        if (el.closest('nav')) return 'nav';
        if (el.closest('.page-hero')) return 'page_hero';
        return 'body';
    }

    function onReady(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    onReady(function () {
        wireEvents();
        maybeShowBanner();
    });
})();
