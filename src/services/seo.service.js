'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { env } = require('../config/env');
const root = path.resolve(__dirname, '../..');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
const localImage = value => typeof value === 'string' && /^\/site\/img\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..');
const origin = () => env.appOrigin || `http://localhost:${env.port}`;
const URLS = Object.freeze({ home: '/', fleet: '/autopark.html' });

// Подтверждённые макетом услуги; цены, расстояния, часы, телефон и обещания не выдумываем.
const routes = Object.freeze({
  'abakan-krasnoyarsk': {
    path: '/routes/abakan-krasnoyarsk', slug: 'abakan-krasnoyarsk',
    crumb: 'Абакан — Красноярск', heading: 'Трансфер Абакан — Красноярск',
    title: 'Трансфер Абакан — Красноярск на минивэне | Комфорт Сибири',
    description: 'Междугородний трансфер Абакан — Красноярск с водителем. Подберите минивэн, укажите дату и количество пассажиров. Стоимость поездки рассчитывается индивидуально.',
    intro: 'Междугородняя поездка с водителем без необходимости самостоятельно управлять автомобилем. Время выезда, точку подачи и маршрут согласуем заранее.',
    details: [
      ['Отправление и прибытие', 'Укажите, откуда вас забрать в Абакане и куда нужно приехать в Красноярске. Конкретные адреса и остановки согласовываются при подтверждении поездки.'],
      ['Автомобиль и багаж', 'В автопарке представлены пассажирские минивэны. Количество мест, объём багажа и доступность конкретной машины уточняются для вашей даты.'],
      ['Стоимость поездки', 'Назовите дату и время, количество пассажиров и особенности маршрута. После этого можно согласовать стоимость трансфера без неподтверждённых фиксированных тарифов.']
    ],
    faq: [
      ['Как заказать поездку Абакан — Красноярск?', 'Оставьте предварительную заявку на сайте. Укажите маршрут, дату, число пассажиров и контакт для согласования деталей.'],
      ['Есть ли фиксированная цена?', 'Стоимость зависит от деталей поездки и уточняется индивидуально до подтверждения заказа.'],
      ['Можно ли поехать с багажом?', 'Даже при выборе минивэна важно заранее сообщить количество и габариты багажа, чтобы подобрать подходящую машину.']
    ]
  },
  'abakan-shira': {
    path: '/routes/abakan-shira', slug: 'abakan-shira',
    crumb: 'Абакан — Шира', heading: 'Трансфер Абакан — Шира',
    title: 'Трансфер Абакан — Шира и к озёрам | Комфорт Сибири',
    description: 'Поездка из Абакана в Шира и к местам отдыха на минивэне с водителем. Согласование точки прибытия, даты, пассажиров и багажа перед трансфером.',
    intro: 'Поездка к озёрам и местам отдыха в районе Шира. Расскажите, куда именно направляетесь — подберём вариант трансфера для вашей группы.',
    details: [
      ['Точная точка прибытия', 'В заявке укажите Шира, а затем сообщите конкретный адрес или место отдыха. Это поможет корректно согласовать маршрут.'],
      ['Путешествие с семьёй или компанией', 'Для небольших групп доступны минивэны из автопарка. Количество пассажиров и багаж необходимо согласовать до бронирования.'],
      ['Планирование даты', 'Отправьте предполагаемые дату и время. Доступность автомобиля и итоговые условия подтвердят после обработки заявки.']
    ],
    faq: [
      ['Можно ли заказать трансфер к озёрам Шира?', 'На сайте предусмотрено направление Шира. Укажите конкретное место отдыха в деталях заказа при согласовании.'],
      ['Можно ли взять вещи для отдыха?', 'Сообщите о чемоданах, сумках и другом крупном багаже заранее; вместимость зависит от автомобиля.'],
      ['Сколько стоит поездка из Абакана?', 'Стоимость определяется после уточнения даты, пункта назначения и состава пассажиров.']
    ]
  },
  'airport-abakan': {
    path: '/services/airport-abakan', slug: 'airport-abakan',
    crumb: 'Аэропорт Абакана', heading: 'Трансфер из аэропорта Абакана',
    title: 'Трансфер из аэропорта Абакана на минивэне | Комфорт Сибири',
    description: 'Предварительная заявка на поездку из аэропорта Абакана и обратно. Минивэны с водителем для поездок по Хакасии. Время подачи и стоимость согласовываются.',
    intro: 'Запланируйте поездку из аэропорта Абакана до нужного адреса или обратный трансфер. В заявке можно выбрать аэропорт в качестве точки отправления или назначения.',
    details: [
      ['Данные поездки', 'Укажите дату, желаемое время подачи, количество пассажиров и адрес назначения. При согласовании заказа можно передать дополнительную информацию о рейсе.'],
      ['Автомобиль', 'Подбор минивэна зависит от числа пассажиров, объёма багажа и доступности транспорта на выбранную дату.'],
      ['Встреча и стоимость', 'Точное место встречи, время подачи, условия ожидания и итоговую стоимость необходимо согласовать до подтверждения заказа.']
    ],
    faq: [
      ['Можно ли выбрать аэропорт Абакана в форме?', 'Да. В форме заявки аэропорт Абакана доступен как пункт отправления или прибытия.'],
      ['Учитывается ли количество чемоданов?', 'Да, при согласовании важно указать багаж, чтобы оценить вместимость автомобиля.'],
      ['Как узнать стоимость трансфера?', 'Отправьте предварительный запрос с датой и маршрутом; стоимость согласовывается после уточнения деталей.']
    ]
  }
});

function gallery(vehicle) {
  const seen = new Set();
  return [{ image: vehicle.previewImage, alt: vehicle.name }, ...(vehicle.images || [])].filter(item => {
    if (!localImage(item.image) || seen.has(item.image)) return false;
    seen.add(item.image);
    return true;
  });
}

function businessGraph() {
  const base = origin();
  return [
    { '@type': 'Organization', '@id': `${base}/#organization`, name: 'Комфорт Сибири', url: `${base}/`, areaServed: { '@type': 'AdministrativeArea', name: 'Республика Хакасия' } },
    { '@type': 'WebSite', '@id': `${base}/#website`, name: 'Комфорт Сибири', url: `${base}/`, inLanguage: 'ru-RU', publisher: { '@id': `${base}/#organization` } },
    { '@type': 'Service', '@id': `${base}/#transfer-service`, name: 'Пассажирские трансферы по Хакасии', serviceType: 'Пассажирские трансферы на минивэнах с водителем', provider: { '@id': `${base}/#organization` }, areaServed: [{ '@type': 'Place', name: 'Абакан' }, { '@type': 'AdministrativeArea', name: 'Республика Хакасия' }] }
  ];
}
function breadcrumbGraph(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: origin() + item.path }))
  };
}
function metadata({ route, title, description, image, graph = [], ogType = 'website' }) {
  const url = origin() + route;
  const titleText = escapeHtml(title);
  const desc = escapeHtml(description);
  const photo = localImage(image) ? origin() + image : null;
  const page = { '@type': 'WebPage', '@id': `${url}#webpage`, name: title, url, description, inLanguage: 'ru-RU', isPartOf: { '@id': `${origin()}/#website` }, about: { '@id': `${origin()}/#transfer-service` } };
  const all = [...businessGraph(), page, ...graph];
  return `\n    <link rel="canonical" href="${escapeHtml(url)}" />` +
    '\n    <meta name="robots" content="index,follow,max-image-preview:large" />' +
    `\n    <meta property="og:type" content="${escapeHtml(ogType)}" />` +
    '\n    <meta property="og:locale" content="ru_RU" />' +
    '\n    <meta property="og:site_name" content="Комфорт Сибири" />' +
    `\n    <meta property="og:title" content="${titleText}" />` +
    `\n    <meta property="og:description" content="${desc}" />` +
    `\n    <meta property="og:url" content="${escapeHtml(url)}" />` +
    (photo ? `\n    <meta property="og:image" content="${escapeHtml(photo)}" />` : '') +
    '\n    <meta name="twitter:card" content="summary" />' +
    `\n    <meta name="twitter:title" content="${titleText}" />` +
    `\n    <meta name="twitter:description" content="${desc}" />` +
    (photo ? `\n    <meta name="twitter:image" content="${escapeHtml(photo)}" />` : '') +
    `\n    <script type="application/ld+json">${jsonLd({ '@context': 'https://schema.org', '@graph': all })}</script>\n`;
}
function applyMeta(html, opts) {
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(opts.title)}</title>`);
  html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/i, (_, a, b) => `${a}${escapeHtml(opts.description)}${b}`);
  return html.replace(/<\/head>/i, `${metadata(opts)}  </head>`);
}
function homepageHtml(vehicles = []) {
  let html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const captions = { 'stepwgn-white': 'Простор и комфорт в дороге', 'stepwgn-dark': 'Продуманный комфорт', 'voxy-white': 'Комфорт для вашей поездки' };
  const defaults = { 'stepwgn-white': 'Просторный минивэн для семейных, индивидуальных и междугородних поездок по Хакасии.', 'stepwgn-dark': 'Вместительный минивэн для поездок по городу и междугородних маршрутов.', 'voxy-white': 'Минивэн для индивидуальных трансферов, отдыха и поездок по Хакасии.' };
  const cards = vehicles.slice(0, 3).map(vehicle => {
    const hero = gallery(vehicle)[0];
    const image = hero ? `<img src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.alt || vehicle.name)}" loading="lazy" />` : '<span class="car-card__placeholder">Фотография будет добавлена</span>';
    const description = String(vehicle.shortDescription || '').trim();
    const generic = !description || description === defaults[vehicle.slug] || /^(?:индивидуальные и междугородние трансферы по хакасии\.?|пассажирские поездки по хакасии\.?|индивидуальные и междугородние поездки по хакасии\.?)$/i.test(description);
    const caption = generic ? (captions[vehicle.slug] || 'Комфортные пассажирские поездки') : description;
    return `<article class="car-card" data-reveal><div class="car-card__image">${image}` +
      '<span class="car-card__tag">МИНИВЭН</span>' +
      `<button type="button" class="car-card__select circle-icon" data-select-car="${escapeHtml(vehicle.slug)}" aria-label="Выбрать ${escapeHtml(vehicle.name)}"${vehicle.status !== 'AVAILABLE' ? ' disabled title="Уточните доступность автомобиля"' : ''}><span class="circle-icon__glyph" aria-hidden="true">+</span></button></div>` +
      `<div class="car-card__caption"><h3>${escapeHtml(vehicle.name)}</h3><p>${escapeHtml(caption)}</p></div></article>`;
  }).join('') || '<p class="fleet__empty">Автомобили пока не опубликованы. Свяжитесь с нами для подбора трансфера.</p>';
  const start = html.indexOf('<div class="fleet__cards">');
  const end = html.indexOf('\n      </section>', start);
  if (start < 0 || end < 0) throw new Error('Не найден контейнер карточек автопарка на главной');
  html = html.slice(0, start) + `<div class="fleet__cards">${cards}</div>` + html.slice(end);
  return applyMeta(html, {
    route: '/', title: 'Трансфер по Хакасии и из Абакана — минивэны | Комфорт Сибири',
    description: 'Трансферы из Абакана, поездки по Хакасии и в Красноярск на минивэнах с водителем. Выберите маршрут и оставьте заявку — стоимость уточним индивидуально.',
    graph: []
  });
}
function fleetHtml(vehicles = []) {
  const template = fs.readFileSync(path.join(root, 'public/autopark.html'), 'utf8');
  const cards = vehicles.map((v, index) => {
    const hero = gallery(v)[0];
    const media = hero ? `<img class="vehicle-card__image" src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.alt || v.name)}" width="1200" height="900" loading="lazy" data-gallery-main />` : '<p>Фотография появится после загрузки</p>';
    const features = [v.passengerSeats ? `${v.passengerSeats} пассажирских мест` : 'Места уточняются', v.luggageCapacity || 'Багаж по запросу', v.serviceArea || 'Хакасия и регионы'];
    return '<article class="vehicle-card is-visible" data-vehicle-card>' +
      `<div class="vehicle-card__image-wrap">${media}<span class="vehicle-card__number">${String(index + 1).padStart(2, '0')}</span></div>` +
      `<div class="vehicle-card__body"><p class="vehicle-card__category">ПАССАЖИРСКИЙ МИНИВЭН</p><h2>${escapeHtml(v.name)}</h2><p class="vehicle-card__description">${escapeHtml(v.shortDescription || 'Пассажирские поездки по Хакасии')}</p>` +
      `<ul class="vehicle-card__features">${features.map(f => `<li><span>${escapeHtml(f)}</span></li>`).join('')}</ul>` +
      `<a class="vehicle-card__more" href="/autopark/${encodeURIComponent(v.slug)}">Подробнее <span class="vehicle-card__more-symbol circle-icon" aria-hidden="true"><span class="circle-icon__glyph">+</span></span></a></div></article>`;
  }).join('') || '<p class="autopark-fleet__note">Нет опубликованных автомобилей.</p>';
  const html = template.replace(/(<div\s+class="autopark-fleet__grid"\s+data-fleet-grid[^>]*>)[\s\S]*?(<\/div>)/, `$1${cards}$2`);
  return applyMeta(html, { route: '/autopark.html', title: 'Автопарк минивэнов для трансфера в Хакасии | Комфорт Сибири',
    description: 'Минивэны Honda Stepwgn и Toyota Voxy для индивидуальных и междугородних поездок из Абакана. Фотографии, описание салона и заявка на трансфер.',
    graph: [breadcrumbGraph([{ name: 'Главная', path: '/' }, { name: 'Автопарк', path: '/autopark.html' }])] });
}
function vehicleHtml(vehicle) {
  const name = String(vehicle.name || 'Автомобиль').slice(0, 160);
  const short = String(vehicle.shortDescription || vehicle.description || 'Пассажирский трансфер по Хакасии.').replace(/\s+/g, ' ').trim().slice(0, 245);
  const canonicalRoute = `/autopark/${encodeURIComponent(vehicle.slug)}`;
  const title = String(vehicle.seoTitle || '').trim() || `${name} — минивэн для трансферов | Комфорт Сибири`;
  const seoDescription = String(vehicle.seoDescription || '').trim() || short;
  const photos = gallery(vehicle);
  const hero = photos[0];
  const item = { '@type': 'Vehicle', '@id': `${origin()}${canonicalRoute}#vehicle`, name, description: seoDescription, ...(hero ? { image: photos.map(p => origin() + p.image) } : {}),
    ...(Number.isInteger(vehicle.passengerSeats) && vehicle.passengerSeats > 0 ? { seatingCapacity: vehicle.passengerSeats } : {}) };
  let html = fs.readFileSync(path.join(root, 'public/car.html'), 'utf8');
  html = html.replace(/(<h1 class="car-card__title" id="car-title">)[^<]*(<\/h1>)/, (_, a, b) => `${a}${escapeHtml(name)}${b}`);
  html = html.replace(/(<span aria-current="page" data-car-crumb>)[^<]*(<\/span>)/, (_, a, b) => `${a}${escapeHtml(name)}${b}`);
  html = html.replace(/(<p class="car-card__description" data-car-description>)[\s\S]*?(<\/p>)/, (_, a, b) => `${a}${escapeHtml(short)}${b}`);
  html = html.replace('href="/#booking"\n                  data-car-book', `href="/?vehicle=${encodeURIComponent(vehicle.slug)}#booking"\n                  data-car-book`);
  const definition = (itemClass, rows) => rows.map(([key, value]) => `<div class="${itemClass}"><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('');
  const facts = [['Тип транспорта','Минивэн'], ['Пассажирские места',vehicle.passengerSeats == null ? 'Уточняются' : vehicle.passengerSeats], ['Багаж', vehicle.luggageCapacity || 'По запросу'], ['Маршруты', vehicle.serviceArea || 'Уточняются']];
  html = html.replace(/(<dl\s+class="car-facts"[^>]*>)[\s\S]*?(<\/dl>)/, (_,a,b) => `${a}${definition('car-facts__item', facts)}${b}`);
  html = html.replace(/(<dl\s+class="car-spec-table"[^>]*>)[\s\S]*?(<\/dl>)/, (_,a,b) => `${a}${definition('car-spec-table__row', [['Автомобиль',name], ['Пассажирских мест',vehicle.passengerSeats ?? 'Уточняются'], ['Багаж',vehicle.luggageCapacity || 'Уточняется'], ['Особенности салона',vehicle.cabinFeatures || 'Уточняются'], ['Удобства',vehicle.amenities || 'Уточняются'], ['Маршруты',vehicle.serviceArea || 'Уточняются']])}${b}`);
  if (hero) {
    html = html.replace(/(<img\s+class="car-gallery__image"\s+src=")[^"]*("\s+alt=")[^"]*/, (_, a, b) => `${a}${escapeHtml(hero.image)}${b}${escapeHtml(hero.alt || name)}`);
  } else {
    html = html.replace(/<div\s+class="car-gallery"[\s\S]*?<div\s+class="car-card__details"/, '<div class="car-card__details"');
  }
  return applyMeta(html, {
    route: canonicalRoute, title, description: seoDescription, image: hero?.image,
    graph: [breadcrumbGraph([{ name: 'Главная', path: '/' }, { name: 'Автопарк', path: '/autopark.html' }, { name, path: canonicalRoute }]), item]
  });
}
function routeHtml(key) {
  const page = Object.hasOwn(routes, key) ? routes[key] : null;
  if (!page) return null;
  let html = fs.readFileSync(path.join(root, 'public/route.html'), 'utf8');
  const content = page.details.map(([h, p]) => `<h3>${escapeHtml(h)}</h3><p>${escapeHtml(p)}</p>`).join('');
  const faq = page.faq.map(([q, a]) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('');
  const values = { BREADCRUMB: page.crumb, HEADING: page.heading, INTRO: page.intro, DETAILS: content, FAQ: faq };
  html = html.replace(/\{\{(BREADCRUMB|HEADING|INTRO|DETAILS|FAQ)\}\}/g, (_, name) => ['DETAILS', 'FAQ'].includes(name) ? values[name] : escapeHtml(values[name]));
  return applyMeta(html, {
    route: page.path, title: page.title, description: page.description,
    graph: [breadcrumbGraph([{ name: 'Главная', path: '/' }, { name: page.crumb, path: page.path }]),
      { '@type': 'Service', '@id': `${origin()}${page.path}#service`, name: page.heading,
        description: page.description, provider: { '@id': `${origin()}/#organization` },
        areaServed: { '@type': 'AdministrativeArea', name: 'Республика Хакасия' } }]
  });
}
function sitemap(vehicles = []) {
  const pages = [URLS.home, URLS.fleet, ...Object.values(routes).map(r => r.path)];
  const vehiclesUrls = vehicles.filter(v => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug)).map(v => ({ path: `/autopark/${v.slug}`, lastmod: v.updatedAt instanceof Date ? v.updatedAt.toISOString().slice(0,10) : null }));
  const items = [...pages.map(path => ({ path, lastmod: null })), ...vehiclesUrls];
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    items.map(({ path, lastmod }) => `<url><loc>${escapeXml(origin() + path)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>';
}
module.exports = { sitemap, vehicleHtml, fleetHtml, homepageHtml, routeHtml, routes };
