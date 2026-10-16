'use strict';

// Трансфер19 / Автопарк. Только интерфейс: никаких запросов к API или БД.
(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function switchPhoto(image, nextSrc, nextAlt, onCommit) {
    if (!image || !nextSrc) return;
    const requested = (image.dataset.requestVersion = String(Number(image.dataset.requestVersion || 0) + 1));
    if (image.getAttribute('src') === nextSrc) { image.classList.remove('is-changing'); return; }
    const preload = new Image();
    preload.onload = () => {
      if (requested !== image.dataset.requestVersion) return;
      if (prefersReducedMotion.matches) {
        image.src = nextSrc;
        image.alt = nextAlt;
        onCommit?.();
        return;
      }
      image.classList.add('is-changing');
      window.setTimeout(() => {
        if (requested !== image.dataset.requestVersion) return;
        image.src = nextSrc;
        image.alt = nextAlt;
        image.classList.remove('is-changing');
        onCommit?.();
      }, 205);
    };
    preload.onerror = () => {
      if (requested === image.dataset.requestVersion) image.classList.remove('is-changing');
    };
    preload.src = nextSrc;
  }

  document.querySelectorAll('[data-vehicle-card]').forEach((card) => {
    const main = card.querySelector('[data-gallery-main]');
    const thumbnails = [...card.querySelectorAll('[data-gallery-thumb]')];
    thumbnails.forEach((thumbnail) => thumbnail.addEventListener('click', () => {
      thumbnails.forEach((item) => {
        const active = item === thumbnail;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      switchPhoto(main, thumbnail.dataset.src, thumbnail.dataset.alt || '', null);
    }));
  });

  const feature = document.querySelector('.autopark-hero__feature');
  if (feature) {
    const photo = feature.querySelector('[data-feature-photo]');
    const title = feature.querySelector('[data-feature-title]');
    const description = feature.querySelector('[data-feature-description]');
    const index = feature.querySelector('[data-feature-index]');
    const slides = [
      { src: '/site/img/autopark-salon.webp', alt: 'Пример просторного салона минивэна', title: 'Просторный салон', description: 'Комфорт в дороге' },
      { src: '/site/img/autopark-interior.webp', alt: 'Пример пассажирских сидений минивэна', title: 'Удобные сиденья', description: 'Приятная поездка' }
    ];
    let current = 0;
    function navigate(delta) {
      current = (current + delta + slides.length) % slides.length;
      const next = slides[current];
      switchPhoto(photo, next.src, next.alt, () => {
        title.textContent = next.title;
        description.textContent = next.description;
        index.textContent = `${String(current + 1).padStart(2, '0')} / 02`;
      });
    }
    feature.querySelector('[data-feature-previous]')?.addEventListener('click', () => navigate(-1));
    feature.querySelector('[data-feature-next]')?.addEventListener('click', () => navigate(1));
  }

  const carInfo = {
    'stepwgn-white': {
      title: 'Honda Stepwgn · белый',
      description: 'Минивэн для семейных и индивидуальных поездок, городских трансферов и междугородних маршрутов.',
      photo: '/site/img/autopark-stepwgn-white.webp',
      alt: 'Белый Honda Stepwgn на фоне гор'
    },
    'stepwgn-dark': {
      title: 'Honda Stepwgn · тёмный',
      description: 'Практичный вариант для поездок небольшой компанией, по личным делам и за пределы города.',
      photo: '/site/img/autopark-stepwgn-dark.webp',
      alt: 'Тёмный Honda Stepwgn на фоне гор'
    },
    'voxy-white': {
      title: 'Toyota Voxy · белый',
      description: 'Комфортный минивэн для путешествий, трансферов и маршрутов по Хакасии и соседним регионам.',
      photo: '/site/img/autopark-voxy-white.webp',
      alt: 'Белый Toyota Voxy на фоне гор'
    }
  };
  const dialog = document.querySelector('[data-car-dialog]');
  if (dialog) {
    document.querySelectorAll('[data-car-details]').forEach((button) => {
      button.addEventListener('click', () => {
        const car = carInfo[button.dataset.carDetails];
        if (!car) return;
        dialog.querySelector('[data-dialog-title]').textContent = car.title;
        dialog.querySelector('[data-dialog-description]').textContent = car.description;
        const photo = dialog.querySelector('[data-dialog-photo]');
        photo.src = car.photo;
        photo.alt = car.alt;
        if (typeof dialog.showModal === 'function') dialog.showModal();
      });
    });
    dialog.querySelector('[data-car-close]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  const reveals = [...document.querySelectorAll('[data-reveal]')];
  if (!('IntersectionObserver' in window) || prefersReducedMotion.matches) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -20px 0px', threshold: 0.04 });
  document.body.classList.add('has-motion');
  reveals.forEach((node) => observer.observe(node));
})();
