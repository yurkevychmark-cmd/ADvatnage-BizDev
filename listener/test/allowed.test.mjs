import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChatIds, mergeAllowed } from '../src/allowed.mjs';

test('список з env: числа з позначкою типу, сміття відкидається', () => {
  assert.deepEqual(parseChatIds(' 546596137, -1001234567890 ,abc,, -42 '), ['546596137', '-1001234567890', '-42']);
  assert.deepEqual(parseChatIds(''), []);
  assert.deepEqual(parseChatIds(undefined), []);
});

test('дозволені = прив\'язані в картках ∪ env; без env працює лише з карток', () => {
  const m = mergeAllowed(['1', '2'], ['2', '3']);
  assert.deepEqual([...m.entries()].sort(), [['1', 'env'], ['2', 'card+env'], ['3', 'card']]);
  assert.deepEqual([...mergeAllowed([], ['-1009']).keys()], ['-1009']);
  assert.equal(mergeAllowed([], []).size, 0);
});
