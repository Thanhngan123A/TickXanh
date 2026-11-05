
(function () {
    const LANG_MAP = {
        // English
        US: 'en', GB: 'en', CA: 'en', AU: 'en',
        NZ: 'en', IE: 'en', SG: 'en',

        // Asia
        JP: 'ja', KR: 'ko', CN: 'zh-CN',
        TW: 'zh-TW', HK: 'zh-TW', TH: 'th',
        ID: 'id', MY: 'ms', PH: 'tl',
        IN: 'hi', PK: 'ur', BD: 'bn',

        // Europe
        FR: 'fr', DE: 'de', IT: 'it',
        ES: 'es', PT: 'pt', NL: 'nl',
        BE: 'fr', CH: 'de', AT: 'de',

        // Scandinavia
        SE: 'sv', NO: 'no', DK: 'da',
        FI: 'fi', IS: 'is',

        // Eastern Europe
        PL: 'pl', CZ: 'cs', SK: 'sk',
        HU: 'hu', RO: 'ro', BG: 'bg',
        HR: 'hr', SI: 'sl', RS: 'sr',
        BA: 'bs', ME: 'sr', MK: 'mk',

        // Baltic
        LT: 'lt', LV: 'lv', EE: 'et',

        // Southern Europe
        GR: 'el', AL: 'sq',

        // Middle East
        SA: 'ar', AE: 'ar', EG: 'ar',
        IQ: 'ar', MA: 'ar',
        IL: 'he', // Hebrew - Do Thái
        IR: 'fa', AF: 'fa', TR: 'tr',

        // Latin America
        MX: 'es', AR: 'es', CO: 'es',
        CL: 'es', PE: 'es', VE: 'es',
        UY: 'es', PY: 'es', BO: 'es', EC: 'es',

        // Brazil
        BR: 'pt',

        // Africa
        ZA: 'en', NG: 'en', KE: 'en',

        // Ukraine / Russia
        UA: 'uk', RU: 'ru'
    };

    const SOURCE_LANG = 'en';
    const OVERLAY_ID = 'translate-overlay';
    const WIDGET_ID = 'google_translate_element';

    var overlay;
    var translateStarted = false;

    // Loading overlay
    function createOverlay() {
        if (document.getElementById(OVERLAY_ID)) return;

        overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        overlay.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:999999',
            'background:rgba(255,255,255,0.48)',
            'backdrop-filter:blur(6px)',
            '-webkit-backdrop-filter:blur(6px)',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'transition:opacity .4s ease',
            'opacity:1'
        ].join(';');

        var spinner = document.createElement('div');

        spinner.style.cssText = [
            'width:36px',
            'height:36px',
            'border:3px solid #e0e0e0',
            'border-top-color:#1877f2',
            'border-radius:50%',
            'animation:_tl_spin .7s linear infinite'
        ].join(';');

        var style = document.createElement('style');

        style.textContent = `
            @keyframes _tl_spin {
                to { transform: rotate(360deg); }
            }

            #google_translate_element {
                position: fixed !important;
                left: -9999px !important;
                top: -9999px !important;
                visibility: hidden !important;
            }

            .goog-te-banner-frame,
            .skiptranslate iframe {
                display: none !important;
            }

            body {
                top: 0 !important;
            }

            html {
                margin-top: 0 !important;
            }
        `;

        document.head.appendChild(style);
        overlay.appendChild(spinner);
        document.body.appendChild(overlay);

        return overlay;
    }

    function removeOverlay() {
        var el = document.getElementById(OVERLAY_ID);

        if (!el) return;

        el.style.opacity = '0';

        setTimeout(function () {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 420);
    }

    // Cookie helpers
    function getCookie(name) {
        var match = document.cookie.match(
            new RegExp('(?:^|;\\s*)' + name + '=([^;]*)')
        );

        return match ? decodeURIComponent(match[1]) : null;
    }

    function getSavedLanguage() {
        var cookie = getCookie('googtrans');

        if (!cookie) return null;

        var parts = cookie.split('/');

        if (parts.length >= 3 && parts[2]) {
            return parts[2];
        }

        return null;
    }

    function setCookie(lang) {
        var value = '/' + SOURCE_LANG + '/' + lang;

        document.cookie =
            'googtrans=' + value + '; path=/; SameSite=Lax';

        var hostname = location.hostname;

        if (
            hostname &&
            hostname !== 'localhost' &&
            hostname.indexOf('.') !== -1
        ) {
            document.cookie =
                'googtrans=' + value +
                '; path=/; domain=' + hostname +
                '; SameSite=Lax';
        }
    }

    // Detect country by IP
    async function getCountryCode() {
        try {
            var res = await fetch('https://apip.cc/json');

            if (!res.ok) throw new Error('API error');

            var data = await res.json();

            if (data.CountryCode) {
                return data.CountryCode.toUpperCase();
            }
        } catch (e) {
            console.warn('Primary IP API failed');
        }

        try {
            var res2 = await fetch('https://ipapi.co/json/');

            if (!res2.ok) throw new Error('API error');

            var data2 = await res2.json();

            return (data2.country_code || '').toUpperCase();
        } catch (e) {
            console.warn('Backup IP API failed');
        }

        return '';
    }

    // Initialize Google Translate
    function initializeGoogleTranslate(lang) {
        if (translateStarted) return;

        translateStarted = true;

        window.googleTranslateElementInit = function () {
            try {
                new google.translate.TranslateElement({
                    pageLanguage: SOURCE_LANG,
                    autoDisplay: false,
                    multilanguagePage: true
                }, WIDGET_ID);

                applyTranslation(lang);

            } catch (e) {
                console.error('Google Translate initialization error:', e);
                removeOverlay();
            }
        };

        // Create hidden Google Translate element
        if (!document.getElementById(WIDGET_ID)) {
            var widget = document.createElement('div');
            widget.id = WIDGET_ID;
            document.body.appendChild(widget);
        }

        // Load Google Translate script
        var script = document.createElement('script');

        script.src =
            'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';

        script.async = true;

        script.onerror = function () {
            console.error('Cannot load Google Translate');
            removeOverlay();
        };

        document.head.appendChild(script);

        // Fallback timeout
        setTimeout(function () {
            if (!document.documentElement.className.match(
                /translated-(ltr|rtl)/
            )) {
                removeOverlay();
            }
        }, 20000);
    }

    // Apply selected language
    function applyTranslation(lang) {
        var attempts = 0;

        var timer = setInterval(function () {
            attempts++;

            var select = document.querySelector('.goog-te-combo');

            if (select) {
                clearInterval(timer);

                if (select.value !== lang) {
                    select.value = lang;

                    select.dispatchEvent(
                        new Event('change', { bubbles: true })
                    );
                }

                waitForTranslation(15000);
                return;
            }

            if (attempts >= 100) {
                clearInterval(timer);
                console.error('Google Translate selector not found');
                removeOverlay();
            }

        }, 200);
    }

    // Wait for translation
    function waitForTranslation(timeout) {
        var html = document.documentElement;

        if (/translated-(ltr|rtl)/.test(html.className)) {
            removeOverlay();
            return;
        }

        var finished = false;

        var observer = new MutationObserver(function () {
            if (/translated-(ltr|rtl)/.test(html.className)) {
                finish();
            }
        });

        function finish() {
            if (finished) return;

            finished = true;
            observer.disconnect();
            clearTimeout(timer);
            removeOverlay();
        }

        observer.observe(html, {
            attributes: true,
            attributeFilter: ['class']
        });

        var timer = setTimeout(function () {
            finish();
        }, timeout || 15000);
    }

    // Main
    async function run() {
        createOverlay();

        try {
            // Use existing language cookie
            var savedLang = getSavedLanguage();

            if (savedLang && savedLang !== SOURCE_LANG) {
                initializeGoogleTranslate(savedLang);
                return;
            }

            // Detect country
            var countryCode = await getCountryCode();

            var targetLang = LANG_MAP[countryCode];

            // No translation needed
            if (!targetLang || targetLang === SOURCE_LANG) {
                removeOverlay();
                return;
            }

            // Save language
            setCookie(targetLang);

            // Initialize and translate immediately
            initializeGoogleTranslate(targetLang);

        } catch (e) {
            console.error('Translation error:', e);
            removeOverlay();
        }
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

})();
