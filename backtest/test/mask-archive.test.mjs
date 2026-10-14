import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskArchive } from '../lib/mask-archive.mjs';

const hidden = (input, secret, kind) => {
  const r = maskArchive(input);
  assert.ok(!r.text.includes(secret), `лишилось «${secret}» у «${r.text}»`);
  assert.ok(r.masked.includes(kind), `немає виду ${kind}: ${JSON.stringify(r.masked)}`);
};
const intact = (input) => assert.equal(maskArchive(input).text, input);

test('email, телефон, IP', () => {
  hidden('write to john.doe@example.com please', 'john.doe@example.com', 'email');
  hidden('📧 Email: [geral@azimutedigital.com](mailto:geral@azimutedigital.com)', 'azimutedigital', 'email');
  hidden('call me +351 912 345 678 tomorrow', '912 345 678', 'phone');
  hidden('whatsapp 0970 404 813', '404 813', 'phone');
  hidden('🌐 IP: 185.63.12.77', '185.63.12.77', 'ip');
});

test('повідомлення з самого пароля й токени в посиланнях', () => {
  hidden('Media123!', 'Media123!', 'password');
  hidden('qwerty1234', 'qwerty1234', 'password');
  hidden('https://app.example.com/?token=abc123def456&x=1', 'abc123def456', 'key');
});

test('звичайна мова архіву лишається', () => {
  intact('I will pass his telegram username');
  intact("the install won't show up, ZM Apps doesn't pass that event to the tracker");
  intact('We can pass this to AppCraft support');
  intact('*↩︎ у відповідь Filipe Albano, 04.03.2026 17:34*');
  intact('meeting 07.10.2026 at 15:00, budget $15 000');
  intact('Longfu88 is the brand');
  intact('@Sid5491 can we do a call');
  intact('Hi, can you please delete the access to this account');
  intact('it also asks for password');
  assert.equal(maskArchive('mail [a@b.co](mailto:a@b.co) ok').text, 'mail [email] ok');
});

test('пароль після ключового слова все ще ховається', () => {
  hidden('pass: Hunter22', 'Hunter22', 'password');
  hidden('password is Zx9_kLm', 'Zx9_kLm', 'password');
  hidden('пароль від кабінету Qwerty123', 'Qwerty123', 'password');
});
