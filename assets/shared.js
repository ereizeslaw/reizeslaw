/* ==========================================================================
   Reizes Law — Shared JS (sub-pages)
   Accessibility widget, hamburger menu, scroll-to-top, Escape handling.
   FAQ accordion and Web3Forms handler are homepage-only and not included.
   ========================================================================== */
(function () {
    'use strict';

    // ---- Accessibility widget -------------------------------------------------
    var accBtn = document.getElementById('accBtn');
    var accMenu = document.getElementById('accMenu');

    function setAccExpanded(open) {
        if (!accBtn || !accMenu) return;
        accBtn.setAttribute('aria-expanded', String(open));
        accMenu.classList.toggle('active', open);
    }

    if (accBtn && accMenu) {
        accBtn.addEventListener('click', function () {
            var isOpen = accMenu.classList.contains('active');
            setAccExpanded(!isOpen);
        });
    }

    function toggleFeature(className, sourceEl) {
        var active = document.body.classList.toggle(className);
        var checkMap = {
            'high-contrast': 'contrast-check',
            'large-text': 'text-check',
            'highlight-links': 'links-check'
        };
        var cb = document.getElementById(checkMap[className]);
        if (cb) cb.checked = active;
        if (sourceEl) sourceEl.setAttribute('aria-checked', String(active));
    }

    document.querySelectorAll('.acc-option[data-feature]').forEach(function (el) {
        el.addEventListener('click', function () {
            toggleFeature(el.dataset.feature, el);
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleFeature(el.dataset.feature, el);
            }
        });
    });

    var accReset = document.getElementById('accReset');
    if (accReset) {
        accReset.addEventListener('click', function () {
            document.body.classList.remove('high-contrast', 'large-text', 'highlight-links');
            ['contrast-check', 'text-check', 'links-check'].forEach(function (id) {
                var cb = document.getElementById(id);
                if (cb) cb.checked = false;
            });
            document.querySelectorAll('.acc-option[data-feature]').forEach(function (el) {
                el.setAttribute('aria-checked', 'false');
            });
        });
    }

    // Close accessibility menu when clicking outside
    document.addEventListener('click', function (event) {
        if (!accMenu) return;
        if (!event.target.closest('.accessibility-widget') && accMenu.classList.contains('active')) {
            setAccExpanded(false);
        }
    });

    // ---- Scroll-to-top button -------------------------------------------------
    var scrollTopBtn = document.getElementById('scrollTop');
    function onScroll() {
        if (!scrollTopBtn) return;
        if (window.scrollY > 400) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    }
    if (scrollTopBtn) {
        window.addEventListener('scroll', onScroll, { passive: true });
        scrollTopBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        onScroll();
    }

    // ---- Mobile hamburger menu -----------------------------------------------
    var hamburger = document.getElementById('hamburger');
    var navLinks = document.getElementById('navLinks');
    var navBackdrop = document.getElementById('navBackdrop');

    function closeMobileNav() {
        if (!hamburger || !navLinks) return;
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        if (navBackdrop) navBackdrop.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    }
    function toggleMobileNav() {
        if (!hamburger || !navLinks) return;
        var isOpen = navLinks.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        if (navBackdrop) navBackdrop.classList.toggle('active', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
    }
    // ---- Nav dropdown (Expertise) --------------------------------------------
    // Desktop: reveal on hover (pure CSS). Mobile: tap the trigger to toggle.
    var MOBILE_BREAKPOINT = 1100;
    function isMobileNav() {
        return window.matchMedia('(max-width: ' + MOBILE_BREAKPOINT + 'px)').matches;
    }

    function closeAllDropdowns() {
        document.querySelectorAll('.has-dropdown.open').forEach(function (li) {
            li.classList.remove('open');
            var trig = li.querySelector('.nav-dropdown-trigger');
            if (trig) trig.setAttribute('aria-expanded', 'false');
        });
    }

    document.querySelectorAll('.nav-dropdown-trigger').forEach(function (trigger) {
        trigger.addEventListener('click', function (e) {
            if (isMobileNav()) {
                // On mobile, tapping the trigger toggles the dropdown inline
                e.preventDefault();
                var li = trigger.closest('.has-dropdown');
                if (!li) return;
                var wasOpen = li.classList.contains('open');
                // Close any other open dropdowns
                document.querySelectorAll('.has-dropdown.open').forEach(function (o) {
                    if (o !== li) {
                        o.classList.remove('open');
                        var t = o.querySelector('.nav-dropdown-trigger');
                        if (t) t.setAttribute('aria-expanded', 'false');
                    }
                });
                li.classList.toggle('open', !wasOpen);
                trigger.setAttribute('aria-expanded', String(!wasOpen));
            }
            // Desktop: let the link navigate (goes to #expertise).
        });
    });

    // Close dropdowns when any dropdown-menu link is clicked
    document.querySelectorAll('.dropdown-menu a').forEach(function (a) {
        a.addEventListener('click', function () {
            closeAllDropdowns();
        });
    });

    // Desktop: close dropdowns when clicking outside the nav
    document.addEventListener('click', function (event) {
        if (isMobileNav()) return;
        if (!event.target.closest('.has-dropdown')) {
            closeAllDropdowns();
        }
    });

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', toggleMobileNav);
        if (navBackdrop) navBackdrop.addEventListener('click', closeMobileNav);
        navLinks.querySelectorAll('a').forEach(function (a) {
            // Do not close the mobile nav when the Expertise trigger itself is tapped —
            // that tap is meant to open the dropdown, not close the menu.
            if (a.classList.contains('nav-dropdown-trigger') && isMobileNav()) return;
            a.addEventListener('click', function () {
                closeAllDropdowns();
                closeMobileNav();
            });
        });
    }

    // Reset dropdown state when crossing the breakpoint
    window.addEventListener('resize', function () {
        closeAllDropdowns();
    });

    // ---- Global Escape handler ------------------------------------------------
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (accMenu && accMenu.classList.contains('active')) {
            setAccExpanded(false);
            if (accBtn) accBtn.focus();
        }
        if (document.querySelector('.has-dropdown.open')) {
            closeAllDropdowns();
        }
        if (navLinks && navLinks.classList.contains('open')) {
            closeMobileNav();
        }
    });
})();
