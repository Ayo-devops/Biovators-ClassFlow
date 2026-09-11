import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source = await fs.readFile(new URL('../lib/deadlines.js', import.meta.url), 'utf8');
const { daysUntil, deadlineStatus } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const lateToday = new Date(2026, 8, 11, 23, 59);
assert.equal(daysUntil('2026-09-11', lateToday), 0);
assert.equal(deadlineStatus('2026-09-11', lateToday).label, 'Due today');
assert.equal(deadlineStatus('2026-09-10', lateToday).label, 'Overdue');
assert.equal(daysUntil('2026-09-13', lateToday), 2);
assert.equal(daysUntil('2027-01-01', new Date(2026, 11, 31, 23)), 1);
assert.equal(daysUntil('2028-03-01', new Date(2028, 1, 28)), 2);
const manifestSource = await fs.readFile(new URL('../app/manifest.js', import.meta.url), 'utf8');
const { default: manifest } = await import('data:text/javascript;base64,' + Buffer.from(manifestSource).toString('base64'));
const config = manifest();
assert.equal(config.display, 'standalone');
assert(config.icons.some(i => i.purpose === 'maskable'));
for (const icon of config.icons) {
  const png = await fs.readFile(new URL('../public' + icon.src, import.meta.url));
  const size = Number(icon.sizes.split('x')[0]);
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
const listeners = {};
const fallback = { offline: true };
let offline = false;
vm.runInNewContext(await fs.readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), {
  self: { addEventListener: (name, handler) => { listeners[name] = handler; } },
  fetch: async () => { if (offline) throw Error('offline'); return { online: true }; },
  caches: { match: async () => fallback },
});
let response;
const event = { request: { method: 'GET', mode: 'navigate' }, respondWith: value => { response = value; } };
listeners.fetch(event);
assert.deepEqual(await response, { online: true });
offline = true;
listeners.fetch(event);
assert.equal(await response, fallback);
for (const request of [{ method: 'POST', mode: 'navigate' }, { method: 'GET', mode: 'cors' }]) {
  listeners.fetch({ request, respondWith: () => { throw Error('API/mutation was intercepted'); } });
}
console.log('Passed: date boundaries, manifest and PNG sizes, online navigation, offline fallback, API and mutation exclusion.');
