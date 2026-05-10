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
      // ─── Cat menu / recording flow ───
      'cat.menu.aria':         'Cat menu',
      'cat.menu.record':       'Record (R)',
      'cat.menu.community':    'Community',
      'cat.menu.canon':        'Play Canon',
      'cat.menu.canonSource':  'Sheet Music',
      'cat.menu.stop':         'Stop Recording',
      'cat.menu.stopPlayback': 'Stop Playback',
      'cat.menu.skip':         'Skip',
      'rec.bar.label':         'REC',
      'rec.bar.stop':          '■ Stop',
      'rec.preview':           '▶ Preview',
      'rec.previewStop':       '■ Stop',
      'rec.discard':           '✕ Discard',
      'rec.share':             '↗ Share',
      'rec.recorded':          'recorded',
      'countdown.hint':        'Canon paused',
      'submit.placeholder':       'Your name (optional)',
      'submit.titlePlaceholder':  'Track name',
      'submit.discard':           'Discard',
      'submit.share':          'Share',
      'submit.sharing':        'Sharing...',
      'submit.error.network':  'Network error',
      'submit.error.failed':   'Failed',
      'submit.error.rateLimit':'Too many submissions, try again later',
      'submit.error.tooLong':  'Recording too long (6:21 max)',
      'community.title':       'Community',
      'community.loading':     'Loading...',
      'community.empty':       'No recordings yet. Be the first!',
      'community.error':       'Failed to load',
      'community.retry':       'Retry',
      'community.delete':      'Delete',
      'community.deleteConfirm': 'Enter password to delete',
      'community.deleteWrong': 'Wrong password',
      'community.deleteFailed':'Failed to delete',
      'community.deleting':    'Deleting...',
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
      // ─── 小猫菜单 / 录制 ───
      'cat.menu.aria':         '小猫菜单',
      'cat.menu.record':       '录制 (R)',
      'cat.menu.community':    '社区',
      'cat.menu.canon':        '播放卡农',
      'cat.menu.canonSource':  '曲谱出处',
      'cat.menu.stop':         '停止录制',
      'cat.menu.stopPlayback': '停止播放',
      'cat.menu.skip':         '跳过',
      'rec.bar.label':         '录制中',
      'rec.bar.stop':          '■ 停止',
      'rec.preview':           '▶ 试听',
      'rec.previewStop':       '■ 停止',
      'rec.discard':           '✕ 丢弃',
      'rec.share':             '↗ 分享',
      'rec.recorded':          '已录制',
      'countdown.hint':        '卡农已暂停',
      'submit.placeholder':       '你的名字（可选）',
      'submit.titlePlaceholder':  '曲目名称',
      'submit.discard':           '丢弃',
      'submit.share':          '分享',
      'submit.sharing':        '提交中...',
      'submit.error.network':  '网络错误',
      'submit.error.failed':   '提交失败',
      'submit.error.rateLimit':'提交太频繁,请稍后再试',
      'submit.error.tooLong':  '录音过长(最长 6 分 21 秒)',
      'community.title':       '社区录音',
      'community.loading':     '加载中...',
      'community.empty':       '还没有录音,来弹一段吧!',
      'community.error':       '加载失败',
      'community.retry':       '重试',
      'community.delete':      '删除',
      'community.deleteConfirm': '输入密码以删除',
      'community.deleteWrong': '密码错误',
      'community.deleteFailed':'删除失败',
      'community.deleting':    '删除中...',
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
    if (SUPPORTED.indexOf(stored) >= 0) return stored;
    // First visit (no stored choice yet): respect the browser language so
    // visitors land in their native tongue without manually toggling.
    var nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (nav.indexOf('zh') === 0) return 'zh';
    return DEFAULT_LANG;
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
