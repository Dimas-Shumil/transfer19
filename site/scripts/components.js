"use strict";

// Единый загрузчик HTML-компонентов.
// Разметка: /components/header.html и /components/footer.html
// Стили: site/sass/_header.scss и _footer.scss (сборка через home.scss, @use)
(() => {
  const componentsDir = new URL("../../components/", document.currentScript.src);
  const templates = new Map();

  function loadHTML(filename) {
    if (!templates.has(filename)) {
      const url = new URL(filename, componentsDir);
      // После смены бренда загружаем свежие header/footer, не используя старый кеш.
      url.searchParams.set('v', '20261023-comfort-sibiri');
      const request = fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error(`${filename}: HTTP ${response.status}`);
        }
        return response.text();
      }).catch((error) => {
        // После ошибки разрешаем повторную попытку загрузки.
        templates.delete(filename);
        throw error;
      });
      templates.set(filename, request);
    }
    return templates.get(filename);
  }

  // Hash-ссылки общих компонентов относятся к секциям главной.
  // На внутренних страницах #contacts остаётся локальным для футера,
  // остальные якоря общего компонента ведём обратно на index.html.
  function normalizeLinks(component) {
    const isAbout = document.body.classList.contains("page-about");
    const isAutopark = document.body.classList.contains("page-autopark");
    const isCar = document.body.classList.contains("page-car");
    if (!isAbout && !isAutopark && !isCar) return;

    component.querySelectorAll('a[href^="#"]').forEach((link) => {
      const hash = link.getAttribute("href");
      if (hash === "#contacts") return;

      if (link.classList.contains("site-footer__to-top")) {
        if (isAbout) link.setAttribute("href", "#about");
        else if (isCar) link.setAttribute("href", "#car");
        else link.setAttribute("href", "#autopark");
        return;
      }

      link.setAttribute("href", `index.html${hash}`);
    });

    if (isAbout) {
      component.querySelectorAll('a[href="about.html"]').forEach((link) => {
        link.setAttribute("aria-current", "page");
      });
    }

    if (isAutopark || isCar) {
      component.querySelectorAll('a[href="autopark.html"]').forEach((link) => {
        link.setAttribute("aria-current", "page");
      });
    }
  }

  class HTMLComponent extends HTMLElement {
    async load(filename, initialize) {
      if (this._loading || this._loaded) return;
      this._loading = true;
      try {
        const html = await loadHTML(filename);
        if (!this.isConnected) return;
        this.innerHTML = html;
        normalizeLinks(this);
        this._loaded = true;
        this._cleanup = initialize?.(this);
      } catch (error) {
        console.error(`Не удалось подключить components/${filename}`, error);
      } finally {
        this._loading = false;
      }
    }

    disconnectedCallback() {
      this._cleanup?.();
      this._cleanup = null;
    }
  }

  function initHeader(component) {
    const header = component.querySelector("[data-site-header]");
    const burger = component.querySelector(".site-header__burger");
    const mobileNav = component.querySelector(".site-header__mobile");
    if (!header || !burger || !mobileNav) return;

    const desktop = window.matchMedia("(min-width: 1101px)");
    let prevY = Math.max(0, window.scrollY);
    let accumulated = 0;
    let direction = 0;
    let scrollScheduled = false;
    let menuOpen = false;
    let keepVisibleUntil = 0;

    function updateHeader() {
      scrollScheduled = false;
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - prevY;
      prevY = currentY;
      header.classList.toggle("is-scrolled", currentY > 24);

      if (currentY < 105 || menuOpen || Date.now() < keepVisibleUntil) {
        header.classList.remove("is-hidden");
        accumulated = 0;
        direction = 0;
        return;
      }
      if (Math.abs(delta) < 1) return;

      const nextDirection = Math.sign(delta);
      if (nextDirection !== direction) accumulated = 0;
      direction = nextDirection;
      accumulated += delta;

      if (accumulated >= 25) {
        header.classList.add("is-hidden");
        accumulated = 0;
      } else if (accumulated <= -14) {
        header.classList.remove("is-hidden");
        accumulated = 0;
      }
    }

    function onScroll() {
      if (scrollScheduled) return;
      scrollScheduled = true;
      window.requestAnimationFrame(updateHeader);
    }

    function toggleMenu(open, returnFocus = false) {
      if (menuOpen === open) return;
      menuOpen = open;
      header.classList.toggle("is-menu-open", open);
      header.classList.remove("is-hidden");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      mobileNav.setAttribute("aria-hidden", String(!open));
      mobileNav.inert = !open;
      document.body.classList.toggle("is-menu-open", open);

      if (open) {
        mobileNav.querySelector("a[href]")?.focus({ preventScroll: true });
      } else {
        keepVisibleUntil = Date.now() + 800;
        if (returnFocus) burger.focus({ preventScroll: true });
      }
    }

    function onBurgerClick() {
      toggleMenu(!menuOpen);
    }

    function onMobileClick(event) {
      if (event.target.closest("a[href]")) toggleMenu(false);
    }

    function onKeyDown(event) {
      if (!menuOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        toggleMenu(false, true);
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = [burger, ...mobileNav.querySelectorAll("a[href]")];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function onBreakpointChange() {
      if (desktop.matches) toggleMenu(false);
    }

    burger.addEventListener("click", onBurgerClick);
    mobileNav.addEventListener("click", onMobileClick);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpointChange);
    window.addEventListener("scroll", onScroll, { passive: true });
    updateHeader();

    return () => {
      toggleMenu(false);
      burger.removeEventListener("click", onBurgerClick);
      mobileNav.removeEventListener("click", onMobileClick);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpointChange);
      window.removeEventListener("scroll", onScroll);
    };
  }

  function initFooter(component) {
    const year = component.querySelector("[data-footer-year]");
    if (year) year.textContent = new Date().getFullYear();

    const footer = component.querySelector('.site-footer');
    const hero = document.querySelector('main > section:first-of-type');
    if (!footer || !hero) return;
    const actions = document.createElement('nav');
    actions.className = 'mobile-contact';
    actions.setAttribute('aria-label', 'Связаться с компанией');
    actions.setAttribute('aria-hidden', 'true');
    actions.inert = true;
    // Единственный источник номера — подтверждённый контакт компании.
    const phone = footer.dataset.phone || '';
    // Inline SVG: не зависит от кеша внешнего спрайта и поддержки <use> в WebView.
    const iconPaths = {
      phone: '<path d="M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
      message: '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 3V6a2 2 0 0 1 2-2Z"/><path d="M7 9h10M7 13h6"/>'
    };
    const icon = (name) => `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">${iconPaths[name]}</svg>`;
    actions.innerHTML = `<a class="mobile-contact__link mobile-contact__link--call" data-mobile-call ${phone ? `href="tel:${phone}"` : 'aria-disabled="true" tabindex="-1"'}>${icon('phone')}<span>Позвонить</span></a><a class="mobile-contact__link mobile-contact__link--message" href="/#booking">${icon('message')}<span>Написать</span></a>`;
    document.body.append(actions);
    const mobile = matchMedia('(max-width: 767px)');
    // Порог появления: Hero целиком ушёл за верхнюю границу экрана.
    const HERO_EXIT_OFFSET = 0;
    let frame = 0;
    let footerObserver;
    let footerNear = true;
    let disposed = false;
    function update() {
      frame = 0;
      const blocked = document.body.classList.contains('is-menu-open') ||
        document.querySelector('dialog[open]') ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      const visible = mobile.matches && hero.getBoundingClientRect().bottom <= HERO_EXIT_OFFSET && !footerNear && !blocked;
      actions.classList.toggle('is-visible', visible);
      actions.inert = !visible;
      actions.setAttribute('aria-hidden', String(!visible));
    }
    function schedule() {
      if (!frame && !disposed) frame = requestAnimationFrame(update);
    }
    function observeFooter() {
      footerObserver?.disconnect();
      // Запас до футера равен полной высоте CTA вместе с нижним отступом/safe area.
      const clearance = Math.ceil(actions.offsetHeight + (parseFloat(getComputedStyle(actions).bottom) || 0) + 8);
      footerNear = footer.getBoundingClientRect().top <= innerHeight + clearance;
      footerObserver = new IntersectionObserver(([entry]) => {
        footerNear = entry.isIntersecting || entry.boundingClientRect.top <= 0;
        schedule();
      }, { rootMargin: `0px 0px ${clearance}px 0px`, threshold: 0 });
      footerObserver.observe(footer);
      schedule();
    }
    const sizeObserver = new ResizeObserver(observeFooter);
    sizeObserver.observe(actions);
    sizeObserver.observe(hero);
    const stateObserver = new MutationObserver(schedule);
    stateObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.querySelectorAll('dialog').forEach(dialog => stateObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] }));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', observeFooter, { passive: true });
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    mobile.addEventListener('change', observeFooter);
    observeFooter();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      footerObserver.disconnect();
      sizeObserver.disconnect();
      stateObserver.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', observeFooter);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      mobile.removeEventListener('change', observeFooter);
      actions.remove();
    };
  }

  class SiteHeader extends HTMLComponent {
    connectedCallback() {
      if (this._loaded) {
        if (!this._cleanup) this._cleanup = initHeader(this);
        return;
      }
      this.load("header.html", initHeader);
    }
  }

  class SiteFooter extends HTMLComponent {
    connectedCallback() {
      if (this._loaded) {
        if (!this._cleanup) this._cleanup = initFooter(this);
        return;
      }
      this.load("footer.html", initFooter);
    }
  }

  if (!customElements.get("site-header")) customElements.define("site-header", SiteHeader);
  if (!customElements.get("site-footer")) customElements.define("site-footer", SiteFooter);
})();
