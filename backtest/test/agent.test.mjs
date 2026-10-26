// Тести чистої частини прогону (таск cfb5898d): «списування», вибір прикладів, правило збігу.
//   npm test                         — на вигаданих даних
//   BT_PAIRS=<pairs.json> npm test   — ще й на всіх справжніх парах (файл з import-pairs, поза git)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadAgent } from '../lib/agent-bundle.mjs';

const core = await loadAgent();
const { buildDraftPrompt, decideMatch, packBatches, evalRow, normalizeDraft } = core;

const ex = (id, chat, ts, partner, reply, type = 'integration') => ({
  id, pair_id: id, chat, ts, situation_type: type, partner_author: 'Luke', partner_role: 'оператор', partner_message: partner, reply, active: true,
});
const pair = (id, chat, ts, partner, reply, type = 'integration') => ({
  id, chat, chat_title: chat, ts, partner_author: 'Luke', partner_role: 'оператор', partner_message: partner, real_reply: reply,
  context: [], relevant: true, filter_reason: null, situation_type: type,
});

test('агент не бачить оцінюваної відповіді: ні своєї пари, ні її копії в іншому прикладі', () => {
  const p = pair('p_1', 'king', '2026-07-01 10:00', 'Can you give us access to Voluum?', 'Sure, please send the email for the Voluum invite');
  const pool = [
    ex('p_1', 'king', '2026-07-01 10:00', 'Can you give us access to Voluum?', 'Sure, please send the email for the Voluum invite'),
    ex('p_2', 'moon', '2026-07-05 10:00', 'Access to tracker?', 'Sure, please send the email for the Voluum invite and we add you'),
    ex('p_3', 'moon', '2026-07-06 10:00', 'Need access to Keitaro', 'Will add you today'),
  ];
  const r = buildDraftPrompt(p, pool);
  assert.equal(r.leak, null);
  assert.ok(!r.picked.some((e) => e.id === 'p_1'), 'своя пара');
  assert.ok(!r.picked.some((e) => e.id === 'p_2'), 'приклад з тим самим фрагментом відповіді');
  assert.ok(r.picked.some((e) => e.id === 'p_3'));
  assert.ok(!r.system.includes('send the email for the Voluum invite'));
});

test('у тому самому чаті агент бачить лише раніші приклади', () => {
  const p = pair('p_10', 'king', '2026-07-10 10:00', 'any update on creatives?', 'We will send them tomorrow', 'creatives');
  const pool = [
    ex('p_11', 'king', '2026-07-12 10:00', 'creatives received, thanks', 'Great', 'creatives'),
    ex('p_12', 'king', '2026-07-01 10:00', 'need new creatives for VN', 'Our designer is on it', 'creatives'),
    ex('p_13', 'moon', '2026-08-01 10:00', 'creatives for BR?', 'Will check with the team', 'creatives'),
  ];
  const ids = buildDraftPrompt(p, pool).picked.map((e) => e.id);
  assert.ok(!ids.includes('p_11'));
  assert.ok(ids.includes('p_12') && ids.includes('p_13'));
});

test('3–5 прикладів, найближчі за словами вище', () => {
  const p = pair('p_20', 'x', '2026-09-01 10:00', 'Please send the transaction hash for the deposit', 'Sending it now', 'money');
  const pool = Array.from({ length: 12 }, (_, i) => ex(`p_${30 + i}`, 'y', '2026-08-01 10:00', i === 7 ? 'where is the transaction hash?' : `random talk number ${i}`, `reply ${i}`, i === 7 ? 'money' : 'smalltalk'));
  const picked = buildDraftPrompt(p, pool).picked;
  assert.ok(picked.length >= 3 && picked.length <= 5, String(picked.length));
  assert.equal(picked[0].id, 'p_37');
});

test('вимкнений приклад агент не бере', () => {
  const p = pair('p_40', 'x', '2026-09-01 10:00', 'tracker access please', 'Done');
  const pool = [ex('p_41', 'y', '2026-08-01 10:00', 'tracker access please', 'Added you'), ex('p_42', 'y', '2026-08-02', 'a', 'b'), ex('p_43', 'y', '2026-08-03', 'c', 'd')];
  pool[0].active = false;
  assert.ok(!buildDraftPrompt(p, pool).picked.some((e) => e.id === 'p_41'));
});

test('рядок профілю, що видає відповідь, прибирається саме для цієї ситуації', () => {
  // фраза з розділу «Тон» стильового профілю
  const p = pair('p_50', 'x', '2026-09-01 10:00', 'when will the payout come?', "I'll check and get back to you");
  const r = buildDraftPrompt(p, []);
  assert.equal(r.leak, null);
  assert.ok(r.profileLinesRemoved >= 1);
  assert.ok(!/check and get back to you/i.test(r.system));
});

test('збіг: вигаданий факт — завжди «не збіг»; червоний тип — лише передача Марку', () => {
  const ok = { same_action: true, invented_fact: false, tone_ok: true };
  assert.equal(decideMatch('integration', { route: 'draft' }, ok, true), true);
  assert.equal(decideMatch('integration', { route: 'draft' }, { ...ok, invented_fact: true }, true), false);
  assert.equal(decideMatch('integration', { route: 'draft' }, { ...ok, tone_ok: false }, true), false);
  assert.equal(decideMatch('integration', { route: 'draft' }, ok, false), false);
  assert.equal(decideMatch('integration', { route: 'human' }, ok, true), false);
  assert.equal(decideMatch('money', { route: 'human' }, { ...ok, same_action: false }, true), true);
  assert.equal(decideMatch('money', { route: 'draft' }, ok, true), false);
});

test('пачки для субагента: відповідь однієї ситуації не трапляється в підказці іншої з тієї ж пачки', () => {
  const items = [
    { sid: 'a', prompt: 'Приклад: Sure, please send the email for the Voluum invite', reply: 'Ok thanks' },
    { sid: 'b', prompt: 'Розмова про трекер', reply: 'Sure, please send the email for the Voluum invite' },
    { sid: 'c', prompt: 'Інша розмова', reply: 'We will launch tomorrow morning' },
  ];
  const batches = packBatches(items, 8);
  const where = (sid) => batches.findIndex((b) => b.some((x) => x.sid === sid));
  assert.notEqual(where('a'), where('b'));
  assert.ok(batches.every((b) => b.length <= 8));
  assert.equal(batches.flat().length, 3);
});

test('оцінка: вигаданий факт не дає збігу навіть коли модель-оцінювач каже «та сама дія»', () => {
  const d = normalizeDraft({ route: 'draft', messages: ['Will send it tomorrow'] });
  const ok = { same_action: true, invented_fact: false, tone_ok: true };
  assert.equal(evalRow('s', 'integration', d, ok, 'Will send it tomorrow', 'j').match, true);
  const r = evalRow('s', 'integration', d, { ...ok, invented_fact: true, invented_what: 'строк' }, 'Will send it tomorrow', 'j');
  assert.equal(r.match, false);
  assert.match(r.reason, /Вигадано/);
  assert.equal(normalizeDraft({ route: 'draft', messages: [] }).route, 'human');
});

// На справжніх парах: для кожної — жодного фрагмента її відповіді в профілі, паспорті й прикладах.
const pairsFile = process.env.BT_PAIRS;
test('справжні пари: у підказці агента немає жодної оцінюваної відповіді', { skip: !pairsFile && 'BT_PAIRS не задано' }, () => {
  const pairs = JSON.parse(fs.readFileSync(pairsFile, 'utf8')).map((r) => ({ ...r, relevant: true, filter_reason: null, situation_type: r.situation_type ?? 'other' }));
  const pool = pairs.map((r) => ex(r.id, r.chat, r.ts, r.partner_message, r.real_reply, r.situation_type));
  let removed = 0;
  for (const p of pairs) {
    const r = buildDraftPrompt(p, pool);
    assert.equal(r.leak, null, `${p.id}: «${r.leak}»`);
    assert.ok(!r.picked.some((e) => e.id === p.id));
    assert.ok(r.picked.length >= 3, `${p.id}: ${r.picked.length} прикладів`);
    removed += r.profileLinesRemoved;
  }
  const items = pairs.map((p) => { const r = buildDraftPrompt(p, pool); return { sid: p.id, prompt: `${r.system}\n${r.user}`, reply: p.real_reply }; });
  const batches = packBatches(items, 8);
  for (const b of batches) for (const x of b) for (const y of b) if (x !== y) assert.equal(core.findLeak(x.prompt, y.reply), null, `${x.sid} видає ${y.sid}`);
  console.log(`пар ${pairs.length}; рядків профілю прибрано разом ${removed}; пачок по 8: ${batches.length}`);
});
