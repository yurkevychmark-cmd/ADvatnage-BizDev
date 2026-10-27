// Стрічка «Розмова» (таск 1dcedada): порядок, підписи чатів, курсор опитування.
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/timeline.ts');
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-')), 'timeline.mjs');
await build({ entryPoints: [src], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'silent' });
const { buildTimeline } = await import(pathToFileURL(out).href);

const chats = [{ chat_id: -1001, title: 'Moonroll x ADV', side: 'operator' }, { chat_id: 555, title: 'Luke', side: 'buyer' }];
const msg = (chat, id, sent, ins, out = false, text = 't') => ({ chat_id: chat, message_id: id, sent_at: sent, inserted_at: ins, sender_name: 'X', is_outgoing: out, text, media: null });

test('повідомлення обох чатів, чернетки й нотатки — одна стрічка за часом', () => {
  const { items } = buildTimeline(
    [msg(-1001, 2, '2026-10-27T10:05:00Z', '2026-10-27T10:05:01Z'), msg(555, 9, '2026-10-27T10:00:00Z', '2026-10-27T10:00:01Z', true)],
    [{ id: 'd1', chat_id: -1001, body: 'чернетка', status: 'draft', why: 'бо', created_at: '2026-10-27T10:06:00Z' }],
    [{ id: 'n1', body: 'нотатка', created_at: '2026-10-27T10:01:00Z' }],
    chats, null,
  );
  assert.deepEqual(items.map((i) => i.key), ['m:555:9', 'n:n1', 'm:-1001:2', 'd:d1']);
  assert.equal(items[0].side, 'buyer');
  assert.equal(items[0].outgoing, true);
  assert.equal(items[2].chat, 'Moonroll x ADV');
  assert.equal(items[3].chat, 'Moonroll x ADV');
});

test('курсор — найпізніша поява в базі, а не час відправки (дочитане слухачем не губиться)', () => {
  // старе за часом відправки, але записане щойно
  const late = msg(555, 3, '2026-10-20T09:00:00Z', '2026-10-27T11:00:00Z');
  const { cursor } = buildTimeline([late, msg(555, 10, '2026-10-27T10:59:00Z', '2026-10-27T10:59:01Z')], [], [], chats, '2026-10-27T10:00:00Z');
  assert.equal(cursor, '2026-10-27T11:00:00Z');
});

test('нічого нового — курсор лишається тим самим', () => {
  assert.equal(buildTimeline([], [], [], chats, '2026-10-27T10:00:00Z').cursor, '2026-10-27T10:00:00Z');
  assert.equal(buildTimeline([], [], [], chats, null).cursor, null);
});
