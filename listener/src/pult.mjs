// Бот-пульт Марка (план plan-bizdev-agent). На етапі 2/8 він лише прив'язується до
// власника і повідомляє про стан акаунта; кнопки з'являться в 6/8.
//
// Прив'язка: токен бота вводиться на сторінці порталу /telegram, там же видно разовий
// код. Власник надсилає боту «/start <код>» — з цієї миті бот пише лише в його чат.
// Усім іншим бот не відповідає.
import { randomBytes } from 'node:crypto';
import { readJson, writeJson, removeFile } from './files.mjs';

const FILE = 'pult.json';
let state = null; // { token, botUsername, ownerChatId, bindCode }
let polling = false;
let onStatusRequest = async () => '';

async function api(method, params = {}) {
  const res = await fetch(`https://api.telegram.org/bot${state.token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(65_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!body.ok) throw new Error(`pult ${method}: ${body.description ?? res.status}`);
  return body.result;
}

export async function loadPult(statusText) {
  onStatusRequest = statusText;
  state = await readJson(FILE);
  if (state?.token) startPolling();
}

export function pultStatus() {
  if (!state?.token) return { configured: false };
  return {
    configured: true,
    botUsername: state.botUsername,
    bound: !!state.ownerChatId,
    bindCode: state.ownerChatId ? null : state.bindCode,
  };
}

/** Новий токен з порталу: перевіряємо в Telegram, зберігаємо, видаємо код прив'язки. */
export async function configurePult(token) {
  const prev = state;
  state = { token: String(token).trim() };
  try {
    const me = await api('getMe');
    state = { token: state.token, botUsername: me.username, ownerChatId: null, bindCode: randomBytes(4).toString('hex') };
  } catch (e) {
    state = prev;
    throw new Error('Telegram did not accept this bot token');
  }
  await writeJson(FILE, state);
  startPolling();
  return pultStatus();
}

export async function forgetPult() {
  state = null;
  await removeFile(FILE);
}

/** Повідомлення Марку. Пульт не налаштований чи не прив'язаний — тихо нічого. */
export async function notifyOwner(text) {
  if (!state?.token || !state.ownerChatId) return false;
  try {
    await api('sendMessage', { chat_id: state.ownerChatId, text });
    return true;
  } catch (e) {
    console.error('[pult] notify', e.message);
    return false;
  }
}

async function handle(update) {
  const msg = update.message;
  if (!msg?.text || msg.chat?.type !== 'private') return;
  const [cmd, arg] = msg.text.trim().split(/\s+/, 2);

  if (!state.ownerChatId) {
    if (cmd === '/start' && arg && state.bindCode && arg === state.bindCode) {
      state = { ...state, ownerChatId: msg.chat.id, bindCode: null };
      await writeJson(FILE, state);
      await api('sendMessage', { chat_id: msg.chat.id, text: 'Пульт підключено. Сюди приходитимуть повідомлення BizDev-агента.' });
      const s = await onStatusRequest();
      if (s) await api('sendMessage', { chat_id: msg.chat.id, text: s });
    }
    return;
  }
  if (msg.chat.id !== state.ownerChatId) return;
  if (cmd === '/status' || cmd === '/start') {
    await api('sendMessage', { chat_id: msg.chat.id, text: (await onStatusRequest()) || 'Стан невідомий.' });
  }
}

async function startPolling() {
  if (polling) return;
  polling = true;
  let offset = 0;
  while (state?.token) {
    try {
      const updates = await api('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        await handle(u).catch((e) => console.error('[pult] handle', e.message));
      }
    } catch (e) {
      console.error('[pult] poll', e.message);
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
  polling = false;
}
