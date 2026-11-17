// Запуск: node bot/test.js
const assert = require('assert');
const { handler, buildMessage } = require('./index.js');

const lead = { phone: '+7 (999) 901-48-14', channel: 'tg', service: 'Котельная', object: 'Частный дом', form: 'quiz' };
assert.match(buildMessage(lead), /Телефон: \+7 \(999\) 901-48-14\nСвязь: Telegram\nРаботы: Котельная\nОбъект: Частный дом\nФорма: Квиз/);
assert.strictEqual(buildMessage({ ...lead, phone: '123' }), null);
assert.strictEqual(buildMessage({ ...lead, website: 'spam' }), '');

(async () => {
  const sent = [];
  global.fetch = async (url, opt) => { sent.push(JSON.parse(opt.body)); return { ok: true }; };
  process.env.CHAT_ID = '1';
  const ev = (o) => ({ httpMethod: 'POST', headers: { Origin: 'https://vashsantehnik.pro' }, body: JSON.stringify(lead), ...o });

  assert.strictEqual((await handler(ev())).statusCode, 200);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual((await handler(ev({ headers: { Origin: 'https://evil.example' } }))).statusCode, 403);
  assert.strictEqual((await handler(ev({ body: '{bad' }))).statusCode, 400);
  assert.strictEqual((await handler(ev({ body: JSON.stringify({ ...lead, website: 'x' }) }))).statusCode, 200);
  assert.strictEqual(sent.length, 1, 'spam must not reach Telegram');
  assert.strictEqual((await handler(ev({ httpMethod: 'OPTIONS' }))).statusCode, 204);

  process.env.TG_API = 'https://relay.example';
  global.fetch = async (url) => { assert.ok(url.startsWith('https://relay.example/bot')); throw new Error('down'); };
  assert.strictEqual((await handler(ev())).statusCode, 502, 'network error must give 502, not hang');
  console.log('all bot tests passed');
})();
