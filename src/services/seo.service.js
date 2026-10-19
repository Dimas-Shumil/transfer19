'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { env } = require('../config/env');
const root = path.resolve(__dirname, '../..');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'": '&#39;' })[c]);
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'": '&apos;' })[c]);
const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const localImage = value => typeof value === 'string' && /^\/site\/img\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..');
const origin = () => env.appOrigin || `http://localhost:${env.port}`;

function publicPageMeta(html, route, title, description, pageType = 'WebPage') {
  const canonical = origin() + route;
  const meta = `\n    <link rel="canonical" href="${escapeHtml(canonical)}" />` +
    `\n    <meta property="og:type" content="website" />` +
    `\n    <meta property="og:site_name" content="Трансфер19" />` +
    `\n    <meta property="og:title" content="${escapeHtml(title)}" />` +
    `\n    <meta property="og:description" content="${escapeHtml(description)}" />` +
    `\n    <meta property="og:url" content="${escapeHtml(canonical)}" />` +
    `\n    <script type="application/ld+json">${jsonLd({ '@context': 'https://schema.org', '@type': pageType, url: canonical, name: title, description, inLanguage: 'ru-RU' })}</script>\n`;
  return html.replace(/<\/head>/i, `${meta}  </head>`);
}
function homepageHtml(vehicles = []) {
  let html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  // Retain the original home-card layout, but populate it exclusively from published vehicles.
  const cards = vehicles.slice(0, 3).map(vehicle => {
    const hero = gallery(vehicle)[0];
    const image = hero
      ? `<img src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.alt || vehicle.name)}" loading="lazy" />`
      : `<span class="car-card__placeholder">Фотография будет добавлена</span>`;
    // Короткая подпись оригинального дизайна — только для стандартных общих описаний.
    // Если владелец изменит shortDescription в CRM, показываем именно его текст.
    const originalCaptions = {
      'stepwgn-white': 'Простор и комфорт в дороге',
      'stepwgn-dark': 'Продуманный комфорт',
      'voxy-white': 'Комфорт для вашей поездки'
    };
    const description = String(vehicle.shortDescription || '').trim();
    const defaultSeedDescriptions = {
      'stepwgn-white': 'Просторный минивэн для семейных, индивидуальных и междугородних поездок по Хакасии.',
      'stepwgn-dark': 'Вместительный минивэн для поездок по городу и междугородних маршрутов.',
      'voxy-white': 'Минивэн для индивидуальных трансферов, отдыха и поездок по Хакасии.'
    };
    const genericDescription = !description || description === defaultSeedDescriptions[vehicle.slug] || /^(?:индивидуальные и междугородние трансферы по хакасии\.?|пассажирские поездки по хакасии\.?|индивидуальные и междугородние поездки по хакасии\.?)$/i.test(description);
    const caption = genericDescription ? (originalCaptions[vehicle.slug] || 'Комфортные пассажирские поездки') : description;
    return `<article class="car-card" data-reveal><div class="car-card__image">${image}` +
      `<span class="car-card__tag">МИНИВЭН</span>` +
      `<button type="button" class="car-card__select circle-icon" data-select-car="${escapeHtml(vehicle.slug)}" aria-label="Выбрать ${escapeHtml(vehicle.name)}"${vehicle.status !== 'AVAILABLE' ? ' disabled title="Уточните доступность автомобиля"' : ''}>` +
      `<span class="circle-icon__glyph" aria-hidden="true">+</span></button></div>` +
      `<div class="car-card__caption"><h3>${escapeHtml(vehicle.name)}</h3>` +
      `<p>${escapeHtml(caption)}</p></div></article>`;
  }).join('') || '<p class="fleet__empty">Автомобили пока не опубликованы. Свяжитесь с нами для подбора трансфера.</p>';
  const start = html.indexOf('<div class="fleet__cards">');
  const end = html.indexOf('\n      </section>', start);
  if (start < 0 || end < 0) throw new Error('Не найден контейнер карточек автопарка на главной');
  html = html.slice(0, start) + `<div class="fleet__cards">${cards}</div>` + html.slice(end);
  return publicPageMeta(html, '/', 'Трансфер19 — пассажирские трансферы по Хакасии', 'Индивидуальные и междугородние поездки на минивэнах по Хакасии. Подбор автомобиля и предварительная заявка на трансфер.');
}
function sitemap(vehicles = []) {
  const urls = [
    { path: '/', lastmod: null },
    { path: '/autopark.html', lastmod: null },
    ...vehicles.filter(vehicle => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vehicle.slug)).map(vehicle => ({
      path: `/autopark/${vehicle.slug}`,
      lastmod: vehicle.updatedAt instanceof Date ? vehicle.updatedAt.toISOString().slice(0, 10) : null
    }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(({ path, lastmod }) => `<url><loc>${escapeXml(origin() + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n') +
    '\n</urlset>';
}
function gallery(vehicle) {
  const seen = new Set();
  return [{ image: vehicle.previewImage, alt: vehicle.name }, ...(vehicle.images || [])].filter(item => {
    if (!localImage(item.image) || seen.has(item.image)) return false;
    seen.add(item.image); return true;
  });
}
function vehicleHtml(vehicle) {
  const name = String(vehicle.name || 'Автомобиль').slice(0, 160);
  const short = String(vehicle.shortDescription || vehicle.description || 'Пассажирский трансфер по Хакасии.').replace(/\s+/g, ' ').trim().slice(0, 250);
  const canonical = `${origin()}/autopark/${encodeURIComponent(vehicle.slug)}`;
  const title = `${name} — пассажирские трансферы | Трансфер19`;
  const photos = gallery(vehicle);
  const hero = photos[0];
  const graph = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: origin() + '/' },
        { '@type': 'ListItem', position: 2, name: 'Автопарк', item: origin() + '/autopark.html' },
        { '@type': 'ListItem', position: 3, name, item: canonical }
      ] },
      { '@type': 'WebPage', name: title, url: canonical, description: short, inLanguage: 'ru-RU' }
    ]
  };
  const metadata = `\n    <link rel="canonical" href="${escapeHtml(canonical)}" />` +
    `\n    <meta property="og:type" content="website" />` +
    `\n    <meta property="og:site_name" content="Трансфер19" />` +
    `\n    <meta property="og:title" content="${escapeHtml(title)}" />` +
    `\n    <meta property="og:description" content="${escapeHtml(short)}" />` +
    `\n    <meta property="og:url" content="${escapeHtml(canonical)}" />` +
    (hero ? `\n    <meta property="og:image" content="${escapeHtml(origin() + hero.image)}" />` : '') +
    `\n    <script type="application/ld+json">${jsonLd(graph)}</script>\n`;
  let html = fs.readFileSync(path.join(root, 'public/car.html'), 'utf8');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/, `$1${escapeHtml(short)}$2`);
  html = html.replace('  </head>', `${metadata}  </head>`);
  html = html.replace(/(<h1 class="car-card__title" id="car-title">)[^<]*(<\/h1>)/, `$1${escapeHtml(name)}$2`);
  html = html.replace(/(<span aria-current="page" data-car-crumb>)[^<]*(<\/span>)/, `$1${escapeHtml(name)}$2`);
  html = html.replace(/(<p class="car-card__description" data-car-description>)[\s\S]*?(<\/p>)/, `$1${escapeHtml(short)}$2`);
  html = html.replace('href="/#booking"\n                  data-car-book', `href="/?vehicle=${encodeURIComponent(vehicle.slug)}#booking"\n                  data-car-book`);
  const facts = [
    ['Тип транспорта', 'Минивэн'],
    ['Пассажирские места', vehicle.passengerSeats == null ? 'Уточняются' : String(vehicle.passengerSeats)],
    ['Багаж', vehicle.luggageCapacity || 'По запросу'],
    ['Маршруты', vehicle.serviceArea || 'Уточняются']
  ];
  const definition = (itemClass, rows) => rows.map(([key, value]) => `<div class="${itemClass}"><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  html = html.replace(/(<dl\s+class="car-facts"[^>]*>)[\s\S]*?(<\/dl>)/, `$1${definition('car-facts__item', facts)}$2`);
  html = html.replace(/(<dl\s+class="car-spec-table"[^>]*>)[\s\S]*?(<\/dl>)/, `$1${definition('car-spec-table__row', [
    ['Автомобиль', name], ['Пассажирских мест', vehicle.passengerSeats ?? 'Уточняются'],
    ['Багаж', vehicle.luggageCapacity || 'Уточняется'], ['Особенности салона', vehicle.cabinFeatures || 'Уточняются'],
    ['Удобства', vehicle.amenities || 'Уточняются'], ['Маршруты', vehicle.serviceArea || 'Уточняются']
  ])}$2`);
  if (hero) {
    html = html.replace(/(<img\s+class="car-gallery__image"\s+src=")[^"]*("\s+alt=")[^"]*/, `$1${escapeHtml(hero.image)}$2${escapeHtml(hero.alt || name)}`);
  } else html = html.replace(/<div\s+class="car-gallery"[\s\S]*?<div\s+class="car-card__details"/, '<div class="car-card__details"');
  return html;
}
function fleetHtml(vehicles) {
  const template = fs.readFileSync(path.join(root, 'public/autopark.html'), 'utf8');
  const cards = vehicles.map((v, index) => {
    const photos = gallery(v);
    const hero = photos[0];
    const media = hero ? `<img class="vehicle-card__image" src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.alt || v.name)}" width="1200" height="900" data-gallery-main />` : '<p>Фотография появится после загрузки</p>';
    const features = [v.passengerSeats ? `${v.passengerSeats} пассажирских мест` : 'Места уточняются', v.luggageCapacity || 'Багаж по запросу', v.serviceArea || 'Хакасия и регионы'];
    return `<article class="vehicle-card is-visible" data-vehicle-card>` +
      `<div class="vehicle-card__image-wrap">${media}<span class="vehicle-card__number">${String(index + 1).padStart(2, '0')}</span></div>` +
      `<div class="vehicle-card__body"><p class="vehicle-card__category">ПАССАЖИРСКИЙ МИНИВЭН</p><h2>${escapeHtml(v.name)}</h2><p class="vehicle-card__description">${escapeHtml(v.shortDescription || 'Пассажирские поездки по Хакасии')}</p>` +
      `<ul class="vehicle-card__features">${features.map(f => `<li><span>${escapeHtml(f)}</span></li>`).join('')}</ul>` +
      `<a class="vehicle-card__more" href="/car.html?slug=${encodeURIComponent(v.slug)}">Подробнее <span class="vehicle-card__more-symbol circle-icon" aria-hidden="true"><span class="circle-icon__glyph">+</span></span></a></div></article>`;
  }).join('') || '<p class="autopark-fleet__note">Нет опубликованных автомобилей.</p>';
  const html = template.replace(/(<div\s+class="autopark-fleet__grid"\s+data-fleet-grid[^>]*>)[\s\S]*?(<\/div>)/, `$1${cards}$2`);
  return publicPageMeta(html, '/autopark.html', 'Автопарк — пассажирские минивэны | Трансфер19', 'Автопарк для индивидуальных и междугородних трансферов по Хакасии.');
}
module.exports = { sitemap, vehicleHtml, fleetHtml, homepageHtml };
