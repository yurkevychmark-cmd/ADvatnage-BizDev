// BizDev-слухач (таск 140108c8, BizDev-агент · 2/8): робочий Telegram-акаунт → bizdev-db.
//
// - Читає лише дозволені чати (BIZDEV_TG_ALLOWED_CHATS). Повідомлення з будь-якого
//   іншого чату відкидається першим рядком обробника: ні тексту, ні назви чату в базі.
// - Нічого не надсилає: клієнт обгорнуто guard.mjs, дозволені лише вхід і читання.
// - У базу йде замаскований текст (mask.mjs); медіа не завантажуються.
// - Сесія Telegram і ключ застосунку — файлом на томі /data, поза git і поза базою.
// - Вхід ведеться зі сторінки порталу /telegram через внутрішній HTTP (лише мережа
//   bizdev-net, назовні не відкритий). Код і пароль 2FA ніде не зберігаються й не пишуться в лог.
import http from 'node:http';
import { TelegramClient, Api, utils } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import { EditedMessage } from 'telegram/events/EditedMessage.js';
import { makeReadOnly } from './guard.mjs';
import * as store from './store.mjs';
import { readJson, writeJson, removeFile } from './files.mjs';
import { loadPult, pultStatus, configurePult, forgetPult, notifyOwner } from './pult.mjs';

const ALLOWED = new Set(
  (process.env.BIZDEV_TG_ALLOWED_CHATS ?? '').split(/[\s,]+/).filter(Boolean).map((s) => String(BigInt(s))),
);
const FIRST_HISTORY = Number(process.env.BIZDEV_TG_FIRST_HISTORY ?? 500);
const CATCHUP_MS = 2 * 60_000;
const SESSION_FILE = 'tg-session.json';
const PORT = 8080;

/** @type {'disconnected'|'sending_code'|'need_code'|'checking'|'need_password'|'connected'|'error'} */
let step = 'disconnected';
let client = null;   // підключений клієнт
let account = null;  // { id, username, name, phoneTail, since }
let login = null;    // незавершений вхід: { client, apiId, apiHash, codeWaiter, passWaiter, hint }
let lastError = null;
let lastMessageAt = null;
let stepChanged = [];

const log = (...a) => console.log(new Date().toISOString(), ...a);

function setStep(s) {
  step = s;
  const w = stepChanged; stepChanged = [];
  w.forEach((r) => r());
}
const nextStep = (ms = 30_000) => new Promise((r) => { stepChanged.push(r); setTimeout(r, ms); });

/** Помилка Telegram → людське пояснення. Тексту коду чи пароля тут немає ніколи. */
function humanError(e) {
  const m = String(e?.errorMessage ?? e?.message ?? e);
  if (/PHONE_CODE_INVALID|PHONE_CODE_EMPTY/.test(m)) return 'The code is wrong. Check it and try again.';
  if (/PHONE_CODE_EXPIRED/.test(m)) return 'The code expired. Start again to get a new one.';
  if (/PASSWORD_HASH_INVALID/.test(m)) return 'The 2FA password is wrong.';
  if (/PHONE_NUMBER_INVALID/.test(m)) return 'Telegram does not recognise this phone number. Use the international format, e.g. +380…';
  if (/PHONE_NUMBER_UNOCCUPIED/.test(m)) return 'This number has no Telegram account. Create it in the Telegram app first.';
  if (/PHONE_NUMBER_BANNED/.test(m)) return 'Telegram has banned this phone number.';
  if (/API_ID_INVALID|API_ID_PUBLISHED_FLOOD/.test(m)) return 'Telegram rejected api_id / api_hash. Copy them again from my.telegram.org.';
  if (/FLOOD_WAIT_(\d+)/.test(m)) return `Telegram asks to wait ${m.match(/FLOOD_WAIT_(\d+)/)[1]} s before the next attempt.`;
  if (/SESSION_REVOKED|AUTH_KEY_UNREGISTERED|USER_DEACTIVATED/.test(m)) return 'The session was ended (from the phone or by Telegram). Connect the account again.';
  return 'Telegram returned an error. Try again in a minute.';
}

function newClient(session, apiId, apiHash) {
  const c = new TelegramClient(new StringSession(session), Number(apiId), apiHash, {
    connectionRetries: 10,
    deviceModel: 'ADvantage BizDev',
    systemVersion: 'Linux',
    appVersion: '1.0',
  });
  c.setLogLevel('warn');
  return makeReadOnly(c, (s) => log(s));
}

// ── Вхід ────────────────────────────────────────────────────────────────────────────────

async function startLogin({ apiId, apiHash, phone }) {
  if (client) throw new Error('The account is already connected.');
  if (!/^\d{3,10}$/.test(String(apiId ?? '')) || !/^[a-f0-9]{32}$/i.test(String(apiHash ?? ''))) {
    throw new Error('api_id is a number and api_hash is 32 hex characters — copy both from my.telegram.org.');
  }
  await cancelLogin();
  lastError = null;
  const c = newClient('', apiId, apiHash);
  login = { client: c, apiId: Number(apiId), apiHash: String(apiHash), codeWaiter: null, passWaiter: null, hint: null };
  setStep('sending_code');
  const mine = login;
  c.connect()
    .then(() => c.start({
      phoneNumber: String(phone).replace(/[^\d+]/g, ''),
      phoneCode: () => new Promise((res) => { if (login === mine) { mine.codeWaiter = res; setStep('need_code'); } }),
      password: (hint) => new Promise((res) => { if (login === mine) { mine.hint = hint || null; mine.passWaiter = res; setStep('need_password'); } }),
      // Номер без акаунта: GramJS зареєстрував би новий. Не робимо — лише вхід у наявний.
      firstAndLastNames: async () => { throw Object.assign(new Error('PHONE_NUMBER_UNOCCUPIED'), { errorMessage: 'PHONE_NUMBER_UNOCCUPIED' }); },
      onError: async (e) => {
        lastError = humanError(e);
        const retry = /PHONE_CODE_INVALID|PHONE_CODE_EMPTY|PASSWORD_HASH_INVALID/.test(String(e?.errorMessage ?? e?.message));
        if (!retry && login === mine) setStep('error');
        return !retry;
      },
    }))
    .then(() => (login === mine ? finishLogin(mine) : null))
    .catch((e) => {
      if (login !== mine) return;
      lastError ??= humanError(e);
      log('[login] failed:', String(e?.errorMessage ?? e?.message).slice(0, 80));
      c.destroy().catch(() => {});
      login = null;
      setStep('error');
    });
  await nextStep();
}

async function submitCode(code) {
  if (step !== 'need_code' || !login?.codeWaiter) throw new Error('No code is expected now. Start again.');
  lastError = null;
  const w = login.codeWaiter; login.codeWaiter = null;
  setStep('checking');
  w(String(code).replace(/\D/g, ''));
  await nextStep();
}

async function submitPassword(password) {
  if (step !== 'need_password' || !login?.passWaiter) throw new Error('No password is expected now. Start again.');
  lastError = null;
  const w = login.passWaiter; login.passWaiter = null;
  setStep('checking');
  w(String(password));
  await nextStep();
}

async function cancelLogin() {
  if (!login) return;
  const l = login; login = null;
  await l.client.destroy().catch(() => {});
  if (!client) setStep('disconnected');
}

async function finishLogin(l) {
  await writeJson(SESSION_FILE, { apiId: l.apiId, apiHash: l.apiHash, session: l.client.session.save() });
  login = null;
  await attach(l.client);
  await notifyOwner(`Акаунт підключено: ${accountLine()}. Слухаю дозволених чатів: ${ALLOWED.size}.`);
}

// ── Робота ──────────────────────────────────────────────────────────────────────────────

function accountLine() {
  if (!account) return '—';
  return `${account.name}${account.username ? ` (@${account.username})` : ''}`;
}

async function attach(c) {
  const me = await c.getMe();
  account = {
    id: me.id.toString(),
    username: me.username ?? null,
    name: [me.firstName, me.lastName].filter(Boolean).join(' ') || 'без імені',
    phoneTail: me.phone ? `…${String(me.phone).slice(-4)}` : null,
    since: new Date().toISOString(),
  };
  client = c;
  c.addEventHandler(onMessage, new NewMessage({}));
  c.addEventHandler(onMessage, new EditedMessage({}));
  lastError = null;
  setStep('connected');
  log(`[tg] connected as ${account.id}, allowed chats: ${ALLOWED.size}`);
  catchUp().catch((e) => log('[catchup]', e.message));
}

async function onMessage(event) {
  const msg = event.message;
  const chatId = utils.getPeerId(msg.peerId);
  if (!ALLOWED.has(chatId)) return; // чат поза списком: не читаємо далі ні рядка
  try {
    await record(msg, chatId);
  } catch (e) {
    log('[tg] record failed', chatId, msg.id, e.message);
  }
}

function chatInfo(entity) {
  if (entity instanceof Api.User) {
    return { kind: 'user', title: [entity.firstName, entity.lastName].filter(Boolean).join(' ') || entity.username || null, accessHash: entity.accessHash?.toString() ?? null };
  }
  if (entity instanceof Api.Channel) return { kind: 'channel', title: entity.title, accessHash: entity.accessHash?.toString() ?? null };
  return { kind: 'group', title: entity?.title ?? null, accessHash: null };
}

function mediaKind(media) {
  if (!media || media instanceof Api.MessageMediaWebPage) return null;
  if (media instanceof Api.MessageMediaPhoto) return 'photo';
  if (media instanceof Api.MessageMediaDocument) {
    const attrs = media.document?.attributes ?? [];
    if (attrs.some((a) => a instanceof Api.DocumentAttributeSticker)) return 'sticker';
    if (attrs.some((a) => a instanceof Api.DocumentAttributeAudio && a.voice)) return 'voice';
    if (attrs.some((a) => a instanceof Api.DocumentAttributeVideo)) return 'video';
    return 'document';
  }
  return 'other';
}

const seenChats = new Map(); // chatId → час останнього оновлення назви

async function record(msg, chatId) {
  if (!(msg instanceof Api.Message)) return; // службові («вступив у групу») не пишемо
  if (!seenChats.has(chatId) || Date.now() - seenChats.get(chatId) > 3_600_000) {
    const chat = await msg.getChat().catch(() => null);
    await store.upsertChat({ chatId, ...chatInfo(chat) });
    seenChats.set(chatId, Date.now());
  }
  const sender = msg.sender ?? (await msg.getSender().catch(() => null));
  const s = sender ? chatInfo(sender) : null;
  await store.saveMessage({
    chatId,
    messageId: msg.id,
    sentAt: new Date(msg.date * 1000),
    editedAt: msg.editDate ? new Date(msg.editDate * 1000) : null,
    senderId: msg.senderId?.toString() ?? null,
    senderName: s?.title ?? null,
    senderUsername: sender?.username ?? null,
    isOutgoing: !!msg.out,
    replyToId: msg.replyTo?.replyToMsgId ?? null,
    text: msg.message ?? '',
    media: mediaKind(msg.media),
  });
  lastMessageAt = new Date().toISOString();
}

/** Вхідний peer дозволеного чату: з бази (access_hash) або, якщо ще не бачили, зі списку діалогів. */
async function inputPeers() {
  const known = new Map((await store.knownChats()).map((r) => [r.id, r]));
  const peers = new Map();
  const missing = [];
  for (const id of ALLOWED) {
    const r = known.get(id);
    const n = BigInt(id);
    if (r?.kind === 'channel' && r.access_hash) peers.set(id, new Api.InputPeerChannel({ channelId: -n - 1_000_000_000_000n, accessHash: BigInt(r.access_hash) }));
    else if (r?.kind === 'user' && r.access_hash) peers.set(id, new Api.InputPeerUser({ userId: n, accessHash: BigInt(r.access_hash) }));
    else if (r?.kind === 'group') peers.set(id, new Api.InputPeerChat({ chatId: -n }));
    else missing.push(id);
  }
  if (missing.length) {
    // Перше знайомство з чатом: access_hash є лише в списку діалогів. Із нього беремо
    // тільки записи дозволених чатів; решта (назви, останні повідомлення) не обробляється.
    for await (const d of client.iterDialogs({})) {
      const id = utils.getPeerId(d.entity);
      if (!missing.includes(id)) continue;
      await store.upsertChat({ chatId: id, ...chatInfo(d.entity) });
      peers.set(id, utils.getInputPeer(d.entity));
    }
  }
  return peers;
}

let catching = false;
async function catchUp() {
  if (!client || catching || !ALLOWED.size) return;
  catching = true;
  try {
    const peers = await inputPeers();
    for (const [id, peer] of peers) {
      const last = await store.lastMessageId(id);
      const msgs = last == null
        ? (await client.getMessages(peer, { limit: FIRST_HISTORY })).reverse()
        : await client.getMessages(peer, { minId: last, reverse: true, limit: 3000 });
      for (const m of msgs) await record(m, id);
      if (msgs.length) log(`[catchup] ${id}: +${msgs.length}`);
    }
  } catch (e) {
    if (/SESSION_REVOKED|AUTH_KEY_UNREGISTERED|USER_DEACTIVATED/.test(String(e?.errorMessage ?? e?.message))) await lostSession(e);
    else log('[catchup]', String(e?.errorMessage ?? e?.message).slice(0, 120));
  } finally {
    catching = false;
  }
}

async function lostSession(e) {
  log('[tg] session lost:', String(e?.errorMessage ?? e?.message));
  const c = client; client = null;
  await c?.destroy().catch(() => {});
  await removeFile(SESSION_FILE);
  lastError = humanError(e);
  setStep('disconnected');
  await notifyOwner(`Акаунт відключено: ${accountLine()}. Сесію завершено — потрібно підключити знову на сторінці порталу.`);
  account = null;
}

async function logout() {
  if (!client) return;
  const c = client; client = null;
  await c.invoke(new Api.auth.LogOut()).catch((e) => log('[tg] logout', e.message));
  await c.destroy().catch(() => {});
  await removeFile(SESSION_FILE);
  await notifyOwner(`Акаунт відключено з порталу: ${accountLine()}.`);
  account = null;
  setStep('disconnected');
}

async function boot() {
  await loadPult(async () => (client ? `Акаунт підключено: ${accountLine()}. Дозволених чатів: ${ALLOWED.size}.` : 'Акаунт не підключено.'));
  const saved = await readJson(SESSION_FILE);
  if (!saved?.session) return;
  const c = newClient(saved.session, saved.apiId, saved.apiHash);
  try {
    await c.connect();
    if (!(await c.checkAuthorization())) throw Object.assign(new Error('AUTH_KEY_UNREGISTERED'), { errorMessage: 'AUTH_KEY_UNREGISTERED' });
    await attach(c);
  } catch (e) {
    client = c;
    await lostSession(e);
  }
}

// ── Внутрішній HTTP для порталу ─────────────────────────────────────────────────────────

async function status() {
  let allowed = [];
  try {
    const stats = new Map((await store.chatStats([...ALLOWED])).map((r) => [r.id, r]));
    allowed = [...ALLOWED].map((id) => ({ id, title: null, messages: 0, lastAt: null, ...(stats.get(id) ?? {}) }));
  } catch (e) {
    lastError ??= 'Database is unavailable.';
  }
  return { step, account, error: lastError, hint: login?.hint ?? null, lastMessageAt, allowed, pult: pultStatus() };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 10_000) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const routes = {
  'GET /health': async () => ({ ok: true, step }),
  'GET /status': status,
  'POST /login/start': async (b) => { await startLogin(b); return status(); },
  'POST /login/code': async (b) => { await submitCode(b.code); return status(); },
  'POST /login/password': async (b) => { await submitPassword(b.password); return status(); },
  'POST /login/cancel': async () => { await cancelLogin(); lastError = null; if (!client) setStep('disconnected'); return status(); },
  'POST /logout': async () => { await logout(); return status(); },
  'POST /pult': async (b) => { await configurePult(b.token); return status(); },
  'POST /pult/forget': async () => { await forgetPult(); return status(); },
  // Для налаштування BIZDEV_TG_ALLOWED_CHATS: лише id, тип і назва — без повідомлень.
  'GET /dialogs': async () => {
    if (!client) throw new Error('The account is not connected.');
    const out = [];
    for await (const d of client.iterDialogs({})) out.push({ id: utils.getPeerId(d.entity), kind: chatInfo(d.entity).kind, title: chatInfo(d.entity).title });
    return out;
  },
};

http.createServer(async (req, res) => {
  const route = routes[`${req.method} ${req.url.split('?')[0]}`];
  res.setHeader('Content-Type', 'application/json');
  if (!route) { res.statusCode = 404; return res.end('{"error":"not found"}'); }
  try {
    const body = req.method === 'POST' ? await readBody(req) : {};
    res.end(JSON.stringify(await route(body)));
  } catch (e) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, () => log(`[http] :${PORT}`));

setInterval(() => catchUp().catch(() => {}), CATCHUP_MS);
boot().catch((e) => log('[boot]', e.message));
