(() => {
  'use strict';
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return;
  const key = 'transfer19:pwa:';
  const read = name => { try { return localStorage.getItem(key + name); } catch { return null; } };
  const write = (name, value) => { try { localStorage.setItem(key + name, value); } catch { /* Storage may be unavailable. */ } };
  const standalone = matchMedia('(display-mode: standalone)');
  const installed = () => standalone.matches || navigator.standalone === true;
  let deferred = null;
  let banner = null;
  let dismissed = false;
  const remove = () => {
    banner?.remove(); banner = null;
    document.documentElement.classList.remove('has-pwa-banner');
  };
  const rememberInstalled = () => { write('installed', '1'); remove(); };
  const later = () => {
    write('later', String(Date.now() + 2 * 24 * 60 * 60 * 1000));
    dismissed = true; remove();
  };
  const show = () => {
    if (banner || dismissed || installed() || read('installed') === '1' || Number(read('later')) > Date.now()) return;
    banner = document.createElement('aside');
    banner.className = 'pwa-banner';
    banner.setAttribute('aria-label', 'Установка приложения Комфорт Сибири');
    banner.innerHTML = `<div class="pwa-banner__inner"><img src="/site/img/pwa-192.png" width="48" height="48" alt="" /><div class="pwa-banner__copy"><strong>Комфорт Сибири — всегда под рукой</strong><p id="pwa-help">Установите приложение на телефон — открывайте с главного экрана.</p></div><div class="pwa-banner__actions"><button type="button" class="pwa-banner__install">Установить</button><button type="button" class="pwa-banner__later">Позже</button></div></div>`;
    banner.querySelector('.pwa-banner__later').addEventListener('click', later);
    banner.querySelector('.pwa-banner__install').addEventListener('click', async () => {
      if (deferred) {
        const prompt = deferred; deferred = null;
        try {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice.outcome === 'accepted') rememberInstalled(); else later();
        } catch { instructions(); }
      } else instructions();
    });
    document.body.prepend(banner);
    document.documentElement.classList.add('has-pwa-banner');
  };
  const instructions = () => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    banner.querySelector('#pwa-help').textContent = ios
      ? 'Откройте меню «Поделиться» → «На экран Домой» → «Добавить». Если пункта нет, откройте сайт в Safari.'
      : 'В меню браузера выберите «Установить приложение» или «Добавить на главный экран». Если пункта нет, откройте сайт в Chrome или Edge.';
    banner.querySelector('.pwa-banner__install').textContent = 'Как установить';
  };
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); deferred = event;
    // An install prompt confirms the app is currently installable again.
    write('installed', '0'); show();
  });
  window.addEventListener('appinstalled', rememberInstalled);
  standalone.addEventListener('change', () => { if (installed()) rememberInstalled(); });
  window.addEventListener('storage', event => {
    if (event.key === key + 'installed' || event.key === key + 'later') {
      if (read('installed') === '1' || Number(read('later')) > Date.now()) remove();
    }
  });
  if (installed()) rememberInstalled();
  navigator.serviceWorker.register('/pwa-sw.js', { scope: '/' }).catch(() => {});
  show();
})();
