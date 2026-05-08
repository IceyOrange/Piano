window.PianoApp = window.PianoApp || {};

(function () {
  var STORAGE_KEY = 'piano.lang';
  var DEFAULT_LANG = 'en';
  var SUPPORTED = ['en', 'zh'];

  var STRINGS = {
    en: {
      'nav.home':              'Home',
      'nav.portfolio':         'Portfolio',
      'nav.experience':        'Experience',
      'nav.about':             'About',
      'page.portfolio.title':  'Use of useless.',
      'page.experience.title': 'Exploration.',
      'page.about.title':      'About.',
      'doc.portfolio.title':   'Portfolio',
      'doc.experience.title':  'Experience',
      'doc.about.title':       'About',
      'doc.portfolio.desc':    'Use of useless, the greatest of uses.',
      'doc.experience.desc':   'Like a wild swan stepping on snow.',
      'doc.about.desc':        'Take a look around. ;)',
      'portfolio.viewProject': 'View Project',
      'experience.present':    'Present',
      'experience.quote':      'Wherever the heart finds peace, there is home. — Su Shi',
      'lang.toggleTo':         '中',
      'lang.toggleAria':       'Switch to Chinese',
    },
    zh: {
      'nav.home':              '首页',
      'nav.portfolio':         '作品集',
      'nav.experience':        '足迹',
      'nav.about':             '关于我',
      'page.portfolio.title':  '无用之用',
      'page.experience.title': '探索',
      'page.about.title':      '关于我',
      'doc.portfolio.title':   '作品集',
      'doc.experience.title':  '足迹',
      'doc.about.title':       '关于我',
      'doc.portfolio.desc':    '无用之用，方为大用',
      'doc.experience.desc':   '应似飞鸿踏雪泥',
      'doc.about.desc':        '随便看看 👋',
      'portfolio.viewProject': '作品链接',
      'experience.present':    '至今',
      'experience.quote':      '此心安处，便是吾乡。 —— 苏轼',
      'lang.toggleTo':         'EN',
      'lang.toggleAria':       '切换为英文',
    },
  };

  function safeStorage(method, key, value) {
    try {
      if (method === 'get') return localStorage.getItem(key);
      if (method === 'set') return localStorage.setItem(key, value);
    } catch (e) { /* private mode etc. */ }
    return null;
  }

  function getLang() {
    var stored = safeStorage('get', STORAGE_KEY);
    return SUPPORTED.indexOf(stored) >= 0 ? stored : DEFAULT_LANG;
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) < 0) return;
    safeStorage('set', STORAGE_KEY, lang);
    apply();
    if (typeof window.PianoApp.rerenderPage === 'function') {
      window.PianoApp.rerenderPage();
    }
  }

  function t(key) {
    var lang = getLang();
    return (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.en && STRINGS.en[key]) || key;
  }

  function apply() {
    var lang = getLang();
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    document.documentElement.setAttribute('data-lang', lang);

    // text content via [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // attributes via [data-i18n-attr="key:attr,key:attr"]
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length === 2) el.setAttribute(bits[1].trim(), t(bits[0].trim()));
      });
    });
    // <title> via [data-i18n-doc-title]
    var titleSrc = document.querySelector('[data-i18n-doc-title]');
    if (titleSrc) {
      var key = titleSrc.getAttribute('data-i18n-doc-title');
      if (key) document.title = t(key);
    }
    // <meta name="description"> via [data-i18n-meta-desc]
    var metaSrc = document.querySelector('meta[data-i18n-meta-desc]');
    if (metaSrc) {
      var key2 = metaSrc.getAttribute('data-i18n-meta-desc');
      if (key2) metaSrc.setAttribute('content', t(key2));
    }

    // Sync the toggle button label
    document.querySelectorAll('.lang-toggle').forEach(function (btn) {
      btn.textContent = t('lang.toggleTo');
      btn.setAttribute('aria-label', t('lang.toggleAria'));
    });
  }

  function bindToggle() {
    document.querySelectorAll('.lang-toggle').forEach(function (btn) {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        setLang(getLang() === 'zh' ? 'en' : 'zh');
      });
    });
  }

  window.PianoApp.i18n = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    apply: apply,
    bindToggle: bindToggle,
  };

  // Apply right away — this script lives at the end of <body>, so all i18n-tagged
  // elements above it are already in the DOM and we can mutate them before paint
  // to avoid an English↔Chinese flicker.
  apply();
  bindToggle();
  // Belt-and-suspenders: re-run on DOMContentLoaded for any late-attached nodes.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { apply(); bindToggle(); });
  }
})();
