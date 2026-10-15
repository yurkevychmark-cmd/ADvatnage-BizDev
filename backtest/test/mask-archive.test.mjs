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

test('BizDev-чати: токени, хеші транзакцій, гаманці', () => {
  hidden('EAARsvin9dDABRQim6GmQMgo0iI8WyOHrqhaIw2pdBvslhXjel2xpJtAYzzEduwhTWsuvURoGCZC', 'EAARsvin9dDABRQim6GmQMgo0iI8WyOHrqhaIw2pdBvslhXjel2xpJtAYzzEduwhTWsuvURoGCZC', 'key');
  hidden('65fc3009d779949ea898f7981f86e387fffe5da788f97fee981a01031f500c2e', '65fc3009d779949ea898f7981f86e387fffe5da788f97fee981a01031f500c2e', 'key');
  hidden('https://tronscan.io/#/transaction/9979c1f58c933c09e4787106c95dbfdb92dd2dba76f233778cbc8f3809308f95', '9979c1f58c933c09e4787106c95dbfdb92dd2dba76f233778cbc8f3809308f95', 'key');
  hidden('TLw3iYwrFqawQBYkRdjjgj6o7oDWcvMYrz', 'TLw3iYwrFqawQBYkRdjjgj6o7oDWcvMYrz', 'wallet');
  hidden('contact@m.advantage-agency.co', 'contact@m.advantage-agency.co', 'email');
  hidden('folder https://drive.google.com/drive/folders/1LR-fJyPwEunKKkNjkq2zMF7jF3IFjl0J?usp=drive_link ok', '1LR-fJyPwEunKKkNjkq2zMF7jF3IFjl0J', 'doc_link');
  hidden('100070712302213|someuser1964|a@b.co|VLteam1022025|c@d.co|c_user=100070712302213;xs=37:qUFd:2:1777118491', 'VLteam1022025', 'credentials');
  hidden('Login: x\nPass: Kq9pass\nc_user=61577290657188;xs=3:dmFrKfHZxyUi6Q:2:1750252796:-1:-1;fr=0M7T2DWeLdrOetzsX', 'dmFrKfHZxyUi6Q', 'credentials');
  hidden('185.63.12.77:46511:X0Wls5sIILD36Tf:hXvi1030GsUVn91', 'hXvi1030GsUVn91', 'credentials');
  hidden('Statistic token\n107c589155381c98eac560319ae2c72a\nvisit_id', '107c589155381c98eac560319ae2c72a', 'key');
  hidden('https://lk.zm.app/team/verify?invite_token=ghtra--ouQQIPXuYDkPymmROdxbBktPwSCgXzPNr4Kg', 'ghtra--ouQQ', 'key');
  intact('Partner ID: 153279');
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
