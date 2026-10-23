'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.env.APP_ORIGIN = 'https://transfer-comfort-sibiri.ru';
const { homepageHtml, fleetHtml, vehicleHtml, routeHtml, routes, sitemap } = require('../src/services/seo.service');
const domain = 'https://transfer-comfort-sibiri.ru';
function ld(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
  assert.equal(blocks.length, 1, 'Нужен один безопасный JSON-LD блок');
  return JSON.parse(blocks[0][1]);
}
test('все публичные страницы имеют уникальный title, description, canonical и валидный schema.org', () => {
  const pages = [
    ['/', homepageHtml()],
    ['/autopark.html', fleetHtml([])],
    ['/autopark/stepwgn-white', vehicleHtml({ slug:'stepwgn-white', name:'Honda Stepwgn', passengerSeats:6, shortDescription:'Трансфер' })],
    ...Object.values(routes).map(r => [r.path,routeHtml(r.slug)])
  ];
  const titles = new Set();
  for (const [route, html] of pages) {
    assert.equal((html.match(/<title>/g) || []).length,1,route);
    assert.equal((html.match(/<meta\s+name="description"/g) || []).length,1,route);
    assert.equal((html.match(/rel="canonical"/g) || []).length,1,route);
    assert.ok(html.includes(`rel="canonical" href="${domain}${route}"`),route);
    assert.ok(html.includes(`content="${domain}${route}"`),route);
    assert.ok(html.includes('meta name="twitter:card"'),route);
    assert.ok(html.includes('meta name="robots" content="index,follow'),route);
    const graph=ld(html)['@graph'];
    assert.ok(graph.find(x=>x['@type']==='Organization'),route);
    assert.ok(graph.find(x=>x['@type']==='WebPage'),route);
    const title=html.match(/<title>([^<]+)<\/title>/)[1];
    assert.ok(!titles.has(title),`Дубль title: ${title}`);
    titles.add(title);
  }
});
test('маршруты представлены настоящим читаемым контентом, а неизвестные URL не рендерятся', () => {
  for (const route of Object.values(routes)) {
    const html = routeHtml(route.slug);
    assert.ok(html.includes('<h1>'),route.slug);
    assert.ok(html.includes('<summary>'),route.slug);
    assert.ok(html.includes('href="/#booking"'),route.slug);
  }
  assert.equal(routeHtml('unknown'),null);
  assert.equal(routeHtml('__proto__'),null);
});
test('sitemap использует только основные страницы и опубликованные машины', () => {
  const xml=sitemap([{slug:'stepwgn-white',updatedAt:new Date('2026-10-23T10:00:00Z')},{slug:'../fake'}]);
  const locs=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
  assert.equal(locs.length,6);
  assert.equal(locs.length,new Set(locs).size);
  assert.ok(locs.includes(`${domain}/services/airport-abakan`));
  assert.ok(locs.includes(`${domain}/autopark/stepwgn-white`));
  assert.ok(!xml.includes('about.html'));
  assert.ok(!xml.includes('car.html?slug='));
  assert.ok(!xml.includes('www.transfer-comfort-sibiri.ru'));
});
test('SSR нейтрализует внедрение HTML через CRM поля', () => {
  const html=vehicleHtml({slug:'stepwgn-white',name:'<script>alert(1)</script>',shortDescription:'<img src=x onerror=alert(1)>',passengerSeats:7});
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('<dd>7</dd>'));
  ld(html);
});
test('локальный robots, nginx и SSR согласованы с production доменом', () => {
  const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
  const nginx=fs.readFileSync(path.join(root,'deploy/nginx-transfer19.conf.example'),'utf8');
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  assert.ok(robots.includes(`Sitemap: ${domain}/sitemap.xml`));
  assert.ok(nginx.includes('server_name transfer-comfort-sibiri.ru'));
  assert.ok(server.includes("return res.redirect(301, `/autopark/${encodeURIComponent(vehicle.slug)}`)"));
  for (const f of ['robots.txt','sitemap.xml','deploy/nginx-transfer19.conf.example','public/index.html','public/autopark.html']) {
    const s=fs.readFileSync(path.join(root,f),'utf8');
    assert.ok(!s.includes('svoi-' + 'perevozki.ru'),f);
  }
});
