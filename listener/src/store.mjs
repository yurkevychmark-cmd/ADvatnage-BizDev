// Запис розмов у bizdev-db під роллю bizdev_listener (deploy/initdb/04-telegram.sh).
// Сюди потрапляє лише вже замаскований текст: маскування — у toRow(), до будь-якого SQL.
import pg from 'pg';
import { mask } from './mask.mjs';

const pool = new pg.Pool({
  host: process.env.BIZDEV_DB_HOST ?? 'bizdev-db',
  database: process.env.BIZDEV_DB_NAME ?? 'bizdev',
  user: 'bizdev_listener',
  password: process.env.BIZDEV_LISTENER_PASSWORD,
  max: 3,
});
pool.on('error', (e) => console.error('[db]', e.message));

export async function upsertChat({ chatId, title, kind, accessHash }) {
  await pool.query(
    `insert into tg_chats (chat_id, title, kind, access_hash) values ($1, $2, $3, $4)
     on conflict (chat_id) do update
       set title = excluded.title, kind = excluded.kind,
           access_hash = coalesce(excluded.access_hash, tg_chats.access_hash), updated_at = now()`,
    [chatId, title, kind, accessHash],
  );
}

export async function knownChats() {
  const { rows } = await pool.query(`select chat_id::text as id, title, kind, access_hash from tg_chats`);
  return rows;
}

/** Найбільший записаний message_id у чаті — з нього дочитуємо пропущене. */
export async function lastMessageId(chatId) {
  const { rows } = await pool.query(`select max(message_id)::text as m from tg_messages where chat_id = $1`, [chatId]);
  return rows[0].m ? Number(rows[0].m) : null;
}

/**
 * @param {object} m — повідомлення в нейтральному вигляді (див. main.mjs → describe())
 * text тут ще сирий; у базу йде лише mask(text).
 */
export function toRow(m) {
  const { text, masked } = mask(m.text);
  return [m.chatId, m.messageId, m.sentAt, m.editedAt, m.senderId, m.senderName, m.senderUsername,
    m.isOutgoing, m.replyToId, text, masked, m.media];
}

export async function saveMessage(m) {
  await pool.query(
    `insert into tg_messages (chat_id, message_id, sent_at, edited_at, sender_id, sender_name, sender_username,
                              is_outgoing, reply_to_id, text, masked, media)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict (chat_id, message_id) do update
       set edited_at = excluded.edited_at, text = excluded.text, masked = excluded.masked, media = excluded.media,
           sender_name = coalesce(excluded.sender_name, tg_messages.sender_name)`,
    toRow(m),
  );
}

/** Для сторінки порталу: скільки повідомлень і коли останнє — по дозволених чатах. */
export async function chatStats(ids) {
  if (!ids.length) return [];
  const { rows } = await pool.query(
    `select c.chat_id::text as id, c.title, c.kind, count(m.message_id)::int as messages, max(m.sent_at) as last_at
       from tg_chats c left join tg_messages m on m.chat_id = c.chat_id
      where c.chat_id = any($1::bigint[]) group by c.chat_id`,
    [ids],
  );
  return rows;
}

export async function dbOk() {
  await pool.query('select 1');
}
