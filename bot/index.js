// Yandex Cloud Function: принимает заявку с сайта и пересылает её в Telegram.
// Переменные окружения функции: BOT_TOKEN (токен от @BotFather), CHAT_ID (кому слать заявки), TG_API (адрес Worker).
const ORIGINS = ['https://vashsantehnik.pro', 'https://www.vashsantehnik.pro'];
const CHANNELS = { call: 'Звонок', tg: 'Telegram', max: 'Max' };
const FORMS = { hero: 'Первый экран', quiz: 'Квиз', final: 'Финальная форма' };
const PHONE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 80);

// null: заявка неверная; '': спам-бот заполнил скрытое поле, молча принимаем
function buildMessage(d) {
  if (!d || typeof d !== 'object') return null;
  if (d.website) return '';
  if (!PHONE.test(d.phone || '')) return null;
  const lines = ['Новая заявка с сайта', 'Телефон: ' + d.phone];
  if (CHANNELS[d.channel]) lines.push('Связь: ' + CHANNELS[d.channel]);
  if (clean(d.service)) lines.push('Работы: ' + clean(d.service));
  if (clean(d.object)) lines.push('Объект: ' + clean(d.object));
  lines.push('Форма: ' + (FORMS[d.form] || 'Сайт'));
  return lines.join('\n');
}

module.exports.handler = async (event) => {
  const h = event.headers || {};
  const origin = h.Origin || h.origin || '';
  const cors = {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  const reply = (statusCode, body) => ({ statusCode, headers: cors, body });
  if (event.httpMethod === 'OPTIONS') return reply(204, '');
  if (event.httpMethod !== 'POST' || !ORIGINS.includes(origin)) return reply(403, 'forbidden');

  let raw = event.body || '';
  if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  if (raw.length > 2000) return reply(413, 'too large');
  let data;
  try { data = JSON.parse(raw); } catch { return reply(400, 'bad json'); }

  const text = buildMessage(data);
  if (text === null) return reply(400, 'bad lead');
  if (text === '') return reply(200, 'ok');

  // TG_API: адрес Cloudflare Worker, api.telegram.org из Yandex Cloud недоступен
  const api = process.env.TG_API || 'https://api.telegram.org';
  try {
    const r = await fetch(`${api}/bot${process.env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.CHAT_ID, text }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? reply(200, 'ok') : reply(502, 'telegram error ' + r.status);
  } catch (e) {
    return reply(502, 'telegram unreachable');
  }
};
module.exports.buildMessage = buildMessage;
