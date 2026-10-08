import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRow } from '../src/store.mjs';

test('у рядок для бази йде лише замаскований текст', () => {
  const raw = 'пароль: Qwerty!2024, гаманець 0x52908400098527886E0F7030069857D2E4169EE7, код 48213';
  const row = toRow({ chatId: '-1001', messageId: 7, sentAt: new Date(), text: raw, media: 'photo' });
  const flat = JSON.stringify(row);
  for (const secret of ['Qwerty!2024', '0x52908400098527886E0F7030069857D2E4169EE7', '48213']) {
    assert.ok(!flat.includes(secret), `у рядку лишилось ${secret}`);
  }
  assert.deepEqual(row[10], ['code', 'password', 'wallet']);
  assert.equal(row[11], 'photo');
});
