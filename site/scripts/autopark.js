'use strict';

(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const grid = document.querySelector('[data-fleet-grid]');
  const localImage = (url) => typeof url === 'string' && /^\/site\/img\/[a-zA-Z0-9_./-]+$/.test(url) && !url.includes('..');
  const node = (tag, className, content = null) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== null) el.textContent = content;
    return el;
  };
  function gallery(vehicle) {
    const records = [{ image: vehicle.previewImage, alt: vehicle.name }, ...(vehicle.images || [])];
    const seen = new Set();
    return records.filter(({ image }) => {
      if (!localImage(image) || seen.has(image)) return false;
      seen.add(image);
      return true;
    });
  }
  function carCard(vehicle, index) {
    const article = node('article', 'vehicle-card is-visible');
    article.dataset.vehicleCard = '';
    const images = gallery(vehicle);
    const cover = node('div', 'vehicle-card__image-wrap');
    const primary = images[0];
    let main;
    if (primary) {
      main = node('img', 'vehicle-card__image');
      main.src = primary.image; main.alt = primary.alt || vehicle.name;
      main.loading = 'lazy'; main.decoding = 'async'; main.dataset.galleryMain = '';
      cover.append(main);
    } else cover.append(node('p', 'vehicle-card__image-placeholder', 'Фотография автомобиля появится после загрузки'));
    cover.append(node('span', 'vehicle-card__number', String(index + 1).padStart(2, '0')));
    const body = node('div', 'vehicle-card__body');
    body.append(node('p', 'vehicle-card__category', 'ПАССАЖИРСКИЙ МИНИВЭН'));
    body.append(node('h2', null, vehicle.name));
    body.append(node('p', 'vehicle-card__description', vehicle.shortDescription || 'Индивидуальные и междугородние трансферы по Хакасии.'));
    const features = node('ul', 'vehicle-card__features');
    for (const [label, icon] of [
      [vehicle.passengerSeats ? `${vehicle.passengerSeats} пассажирских мест` : 'Места уточняются', 'users'],
      [vehicle.luggageCapacity || 'Багаж по запросу', 'map'],
      [vehicle.serviceArea || 'Хакасия и регионы', 'star']
    ]) {
      const li = node('li');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', `/site/img/icons.svg#${icon}`);
      svg.append(use); li.append(svg, node('span', null, label)); features.append(li);
    }
    body.append(features);
    if (images.length > 0) {
      const thumbs = node('div', 'vehicle-card__gallery');
      thumbs.setAttribute('role', 'group'); thumbs.setAttribute('aria-label', `Фотографии ${vehicle.name}`);
      images.forEach((picture, pictureIndex) => {
        const button = node('button', `vehicle-card__thumb${pictureIndex === 0 ? ' is-active' : ''}`);
        button.type = 'button'; button.dataset.galleryThumb = '';
        button.setAttribute('aria-label', `Фото ${pictureIndex + 1}`);
        button.setAttribute('aria-pressed', String(pictureIndex === 0));
        const thumb = node('img'); thumb.src = picture.image; thumb.alt = ''; thumb.loading = 'lazy';
        button.append(thumb);
        button.addEventListener('click', () => {
          thumbs.querySelectorAll('button').forEach(b => {
            b.classList.toggle('is-active', b === button);
            b.setAttribute('aria-pressed', String(b === button));
          });
          if (!main || main.src.endsWith(picture.image)) return;
          const preload = new Image();
          preload.onload = () => {
            if (!reduceMotion.matches) main.classList.add('is-changing');
            main.src = picture.image; main.alt = picture.alt || vehicle.name;
            main.classList.remove('is-changing');
          };
          preload.src = picture.image;
        });
        thumbs.append(button);
      });
      body.append(thumbs);
    }
    const link = node('a', 'vehicle-card__more', 'Подробнее ');
    link.href = `/car.html?slug=${encodeURIComponent(vehicle.slug)}`;
    const circle = node('span', 'vehicle-card__more-symbol circle-icon');
    circle.setAttribute('aria-hidden', 'true'); circle.append(node('span', 'circle-icon__glyph', '+'));
    link.append(circle); body.append(link); article.append(cover, body);
    return article;
  }
  async function renderFleet() {
    if (!grid) return;
    try {
      const response = await fetch('/api/vehicles', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('API автомобилей недоступен');
      const result = await response.json();
      if (!result.success || !Array.isArray(result.vehicles)) throw new Error('Не удалось получить автомобили');
      grid.replaceChildren(...(result.vehicles.length
        ? result.vehicles.map(carCard)
        : [node('p', 'autopark-fleet__note', 'Сейчас нет опубликованных автомобилей. Свяжитесь с нами, чтобы уточнить варианты поездки.')]
      ));
    } catch (error) {
      grid.replaceChildren(node('p', 'autopark-fleet__note', 'Не удалось загрузить автопарк. Обновите страницу или свяжитесь с нами.'));
      console.warn('Трансфер19 автопарк:', error.message);
    }
  }
  renderFleet();

  const feature = document.querySelector('.autopark-hero__feature');
  if (feature) {
    const photo = feature.querySelector('[data-feature-photo]');
    const title = feature.querySelector('[data-feature-title]');
    const description = feature.querySelector('[data-feature-description]');
    const index = feature.querySelector('[data-feature-index]');
    const slides = [
      { src: '/site/img/autopark-salon.webp', alt: 'Пример салона минивэна', title: 'Просторный салон', description: 'Комфорт в дороге' },
      { src: '/site/img/autopark-interior.webp', alt: 'Пример пассажирских сидений', title: 'Удобные сиденья', description: 'Приятная поездка' }
    ];
    let current = 0;
    function navigate(delta) {
      current = (current + delta + slides.length) % slides.length;
      const next = slides[current];
      if (photo) { photo.src = next.src; photo.alt = next.alt; }
      if (title) title.textContent = next.title;
      if (description) description.textContent = next.description;
      if (index) index.textContent = `${String(current + 1).padStart(2, '0')} / 02`;
    }
    feature.querySelector('[data-feature-previous]')?.addEventListener('click', () => navigate(-1));
    feature.querySelector('[data-feature-next]')?.addEventListener('click', () => navigate(1));
  }

  const reveals = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -20px 0px', threshold: 0.04 });
    document.body.classList.add('has-motion');
    reveals.forEach(el => observer.observe(el));
  }
})();
