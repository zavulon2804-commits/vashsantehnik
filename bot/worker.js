// Cloudflare Worker: пересылает sendMessage в Telegram, потому что из Yandex Cloud api.telegram.org недоступен.
// Токен не хранится здесь, его передаёт функция Yandex в адресе запроса, как в обычном Bot API.
const CHAT_ID = '1042629660'; // пересылаем только в этот чат, чтобы Worker не стал открытым прокси

export default {
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (req.method !== 'POST' || !/^\/bot\d+:[\w-]+\/sendMessage$/.test(path)) return new Response('not found', { status: 404 });
    let body;
    try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
    if (String(body.chat_id) !== CHAT_ID) return new Response('forbidden', { status: 403 });
    return fetch('https://api.telegram.org' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
};
