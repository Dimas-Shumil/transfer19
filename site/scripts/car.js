'use strict';

(() => {
  const slug = new URLSearchParams(window.location.search).get('slug') ||
    window.location.pathname.match(/^\/autopark\/([a-z0-9-]+)\/?$/)?.[1];
  const localImage = url => typeof url === 'string' && /^\/site\/img\/[a-zA-Z0-9_./-]+$/.test(url) && !url.includes('..');
  const text = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value ?? '';
  };
  const dl = (selector, rows, className) => {
    const parent = document.querySelector(selector);
    if (!parent) return;
    parent.replaceChildren(...rows.filter(([, value]) => value != null && value !== '').map(([key, value]) => {
      const item = document.createElement('div'); item.className = className;
      const dt = document.createElement('dt'); dt.textContent = key;
      const dd = document.createElement('dd'); dd.textContent = String(value);
      item.append(dt, dd); return item;
    }));
  };
  function unavailable(message) {
    document.title = 'Автомобиль недоступен — Трансфер19';
    text('#car-title', 'Автомобиль недоступен');
    text('[data-car-description]', message);
    text('[data-car-variant]', 'Выберите другой автомобиль в автопарке');
    document.querySelector('.car-gallery')?.remove();
    document.querySelector('.car-specs')?.remove();
    document.querySelector('.car-cargo')?.remove();
  }
  async function render() {
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return unavailable('Проверьте ссылку или вернитесь в автопарк.');
    let vehicle;
    try {
      const response = await fetch(`/api/vehicles/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } });
      if (response.status === 404) return unavailable('Этот автомобиль снят с публикации или не найден.');
      if (!response.ok) throw new Error('API временно недоступен');
      const payload = await response.json();
      if (!payload.success || !payload.vehicle) throw new Error('Некорректный ответ API');
      vehicle = payload.vehicle;
    } catch (error) {
      return unavailable('Не удалось получить информацию. Обновите страницу или свяжитесь с нами.');
    }
    document.title = `${vehicle.name} — минивэн для трансферов | Трансфер19`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = vehicle.shortDescription || `${vehicle.name}: описание и фотографии автомобиля для пассажирских трансферов по Хакасии.`;
    text('#car-title', vehicle.name);
    text('[data-car-crumb]', vehicle.name);
    text('[data-car-variant]', 'Пассажирский минивэн');
    text('[data-car-description]', vehicle.shortDescription || vehicle.description || 'Трансферы по Хакасии и соседним регионам.');
    text('[data-car-trips-description]', vehicle.description || vehicle.shortDescription || 'Маршрут, пассажиров и багаж согласуем перед выездом.');
    const book = document.querySelector('[data-car-book]');
    if (book) book.href = `/?vehicle=${encodeURIComponent(vehicle.slug)}#booking`;
    dl('[data-car-facts]', [
      ['Тип транспорта', 'Минивэн'],
      ['Пассажирские места', vehicle.passengerSeats == null ? 'Уточняются' : vehicle.passengerSeats],
      ['Багаж', vehicle.luggageCapacity || 'По запросу'],
      ['Маршруты', vehicle.serviceArea || 'Уточняются']
    ], 'car-facts__item');
    dl('[data-car-specs]', [
      ['Автомобиль', vehicle.name],
      ['Количество пассажиров', vehicle.passengerSeats == null ? 'Уточняется при бронировании' : vehicle.passengerSeats],
      ['Места для багажа', vehicle.luggageCapacity || 'Уточняются'],
      ['Особенности салона', vehicle.cabinFeatures || 'Уточняются'],
      ['Удобства', vehicle.amenities || 'Уточняются'],
      ['Маршруты', vehicle.serviceArea || 'Хакасия и соседние регионы']
    ], 'car-spec-table__row');
    const photos = [{ image: vehicle.previewImage, alt: vehicle.name }, ...(vehicle.images || [])]
      .filter((p, i, arr) => localImage(p.image) && arr.findIndex(x => x.image === p.image) === i);
    const gallery = document.querySelector('.car-gallery');
    if (!photos.length) {
      gallery?.remove();
    } else {
      const main = document.querySelector('[data-car-main-image]');
      const thumbs = document.querySelector('[data-car-thumbs]');
      const counter = document.querySelector('[data-car-counter]');
      const stage = document.querySelector('[data-car-gallery-main]');
      let activeIndex = 0;
      let token = 0;
      const buttons = [];
      function show(n) {
        const next = (n + photos.length) % photos.length;
        const picture = photos[next]; const requestId = ++token;
        const preload = new Image();
        preload.onload = () => {
          if (requestId !== token) return;
          activeIndex = next;
          if (main) { main.src = picture.image; main.alt = picture.alt || vehicle.name; }
          if (counter) counter.textContent = `${next + 1} / ${photos.length}`;
          buttons.forEach((button, index) => {
            button.classList.toggle('is-active', index === next);
            button.setAttribute('aria-pressed', String(index === next));
          });
        };
        preload.onerror = () => {};
        preload.src = picture.image;
      }
      photos.forEach((picture, i) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = `car-gallery__thumb${i === 0 ? ' is-active' : ''}`;
        button.setAttribute('aria-label', `Показать фото ${i + 1}`);
        button.setAttribute('aria-pressed', String(i === 0));
        const image = document.createElement('img'); image.src = picture.image;
        image.alt = ''; image.loading = 'lazy'; image.draggable = false;
        button.append(image); button.addEventListener('click', () => show(i)); buttons.push(button);
      });
      thumbs?.replaceChildren(...buttons);
      if (main) { main.src = photos[0].image; main.alt = photos[0].alt || vehicle.name; }
      if (counter) counter.textContent = `1 / ${photos.length}`;
      document.querySelector('[data-car-disclaimer]')?.remove();
      document.querySelector('[data-car-prev]')?.addEventListener('click', () => show(activeIndex - 1));
      document.querySelector('[data-car-next]')?.addEventListener('click', () => show(activeIndex + 1));
      stage?.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault(); show(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
        }
      });
      let x = null, y = null;
      stage?.addEventListener('touchstart', event => {
        if (event.touches.length === 1) { x = event.touches[0].clientX; y = event.touches[0].clientY; }
      }, { passive: true });
      stage?.addEventListener('touchend', event => {
        if (x == null || y == null) return;
        const dx = event.changedTouches[0].clientX - x;
        const dy = event.changedTouches[0].clientY - y;
        x = y = null;
        if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.2) show(activeIndex + (dx < 0 ? 1 : -1));
      }, { passive: true });
    }
    const travelList = document.querySelector('[data-car-trips]');
    if (travelList) {
      const entries = (vehicle.amenities || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean);
      travelList.replaceChildren(...(entries.length ? entries : ['Индивидуальные трансферы', 'Семейные поездки', 'Междугородние маршруты']).map(value => {
        const li = document.createElement('li'); li.textContent = value; return li;
      }));
    }
    const visual = document.querySelector('.car-cargo__visual');
    const otherPhoto = photos[1] || photos[0];
    if (visual && otherPhoto) {
      const img = visual.querySelector('img');
      if (img) { img.src = otherPhoto.image; img.alt = otherPhoto.alt || vehicle.name; }
      visual.querySelector('.car-cargo__visual-caption')?.remove();
    } else visual?.remove();
  }
  render();
  const reveals = [...document.querySelectorAll('[data-car-reveal]')];
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible'); observer.unobserve(entry.target);
    }), { threshold: 0.04, rootMargin: '0px 0px -20px 0px' });
    document.body.classList.add('has-car-motion');
    reveals.forEach(el => observer.observe(el));
  }
})();
