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
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', toggleMobileNav);
        if (navBackdrop) navBackdrop.addEventListener('click', closeMobileNav);
        navLinks.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', closeMobileNav);
        });
    }

    // ---- Global Escape handler ------------------------------------------------
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (accMenu && accMenu.classList.contains('active')) {
            setAccExpanded(false);
            if (accBtn) accBtn.focus();
        }
        if (navLinks && navLinks.classList.contains('open')) {
            closeMobileNav();
        }
    });
})();
