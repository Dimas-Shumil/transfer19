"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
process.env.APP_ORIGIN = 'https://transfer19.example';
const { sitemap, vehicleHtml, fleetHtml, homepageHtml } = require('../src/services/seo.service');

test('sitemap exposes only public canonical pages and published vehicles', () => {
  const xml = sitemap([{ slug: 'stepwgn-white', updatedAt: new Date('2026-10-14T12:00:00.000Z') }]);
  assert.match(xml, /https:\/\/transfer19\.example\/autopark\/stepwgn-white/);
  assert.match(xml, /<lastmod>2026-10-14<\/lastmod>/);
  assert.doesNotMatch(xml, /(?:\/index\.html|\/control\/)/);
});

test('vehicle SSR uses canonical and passenger characteristics with escaped HTML', () => {
  const html = vehicleHtml({ slug: 'stepwgn-white', name: 'Honda <script>alert(1)</script>',
    shortDescription: 'Трансфер', passengerSeats: 6, luggageCapacity: 'Два чемодана',
    serviceArea: 'Абакан', images: [] });
  assert.match(html, /<link rel="canonical" href="https:\/\/transfer19\.example\/autopark\/stepwgn-white"/);
  assert.match(html, /Honda &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<dd>6<\/dd>/);
  assert.match(html, /<dd>Два чемодана<\/dd>/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
});

test('homepage and fleet SSR have distinct canonicals and valid structured data', () => {
  const pages = [homepageHtml(), fleetHtml([])];
  const urls = [];
  for (const html of pages) {
    const canon = html.match(/<link rel="canonical" href="([^"]+)"/);
    assert.ok(canon);
    urls.push(canon[1]);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
    assert.ok(blocks.length);
    blocks.forEach(match => assert.doesNotThrow(() => JSON.parse(match[1])));
  }
  assert.notEqual(urls[0], urls[1]);
});

test('public requests use Web Push, require CRM auth for push, without SMTP', () => {
  const req = fs.readFileSync(path.join(root, 'src/routes/public-orders.routes.js'), 'utf8');
  assert.match(req, /sendNewOrderNotification\(order\)/);
  assert.doesNotMatch(req, /sendNewRequestNotification|mail\.service|nodemailer/);
  const routes = fs.readFileSync(path.join(root, 'src/routes/control.routes.js'), 'utf8');
  assert.ok(routes.indexOf('router.use(requireAuth, requireOwner)') < routes.indexOf('router.use("/push", pushRoutes)'));
  const sw = fs.readFileSync(path.join(root, 'control/push-sw.js'), 'utf8');
  assert.match(sw, /notificationclick/);
  assert.doesNotMatch(sw, /addEventListener\("fetch"/);
});

test('package-lock preserves web-push and does not add nodemailer', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  assert.equal(pkg.dependencies['web-push'], '3.6.7');
  assert.equal(lock.packages['node_modules/web-push'].version, '3.6.7');
  assert.equal(pkg.dependencies.nodemailer, undefined);
});
