import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Api } from 'telegram';
import { forbiddenRequest, makeReadOnly } from '../src/guard.mjs';

const peer = new Api.InputPeerSelf();

test('надсилання, пересилання, «прочитано», «друкує», вступ у чат — заборонено', () => {
  for (const r of [
    new Api.messages.SendMessage({ peer, message: 'x', randomId: 1n }),
    new Api.messages.ForwardMessages({ fromPeer: peer, toPeer: peer, id: [1], randomId: [1n] }),
    new Api.messages.ReadHistory({ peer, maxId: 1 }),
    new Api.messages.SetTyping({ peer, action: new Api.SendMessageTypingAction() }),
    new Api.messages.SendReaction({ peer, msgId: 1 }),
    new Api.channels.JoinChannel({ channel: new Api.InputChannelEmpty() }),
    new Api.account.UpdateStatus({ offline: false }),
    new Api.auth.ResetAuthorizations(),
    new Api.auth.SignUp({ phoneNumber: '+1', phoneCodeHash: 'x', firstName: 'x', lastName: '' }),
    new Api.help.AcceptTermsOfService({ id: new Api.DataJSON({ data: '{}' }) }),
    new Api.InvokeWithLayer({ layer: 1, query: new Api.messages.SendMessage({ peer, message: 'x', randomId: 1n }) }),
  ]) assert.ok(forbiddenRequest(r), `пропущено ${r.className}`);
});

test('вхід і читання — дозволено', () => {
  for (const r of [
    new Api.auth.SendCode({ phoneNumber: '+1', apiId: 1, apiHash: 'x', settings: new Api.CodeSettings({}) }),
    new Api.auth.SignIn({ phoneNumber: '+1', phoneCodeHash: 'x', phoneCode: '1' }),
    new Api.auth.LogOut(),
    new Api.account.GetPassword(),
    new Api.updates.GetState(),
    new Api.updates.GetDifference({ pts: 1, date: 1, qts: 1 }),
    new Api.messages.GetHistory({ peer, offsetId: 0, offsetDate: 0, addOffset: 0, limit: 1, maxId: 0, minId: 0, hash: 0n }),
    new Api.messages.GetDialogs({ offsetDate: 0, offsetId: 0, offsetPeer: peer, limit: 1, hash: 0n }),
    new Api.contacts.ResolveUsername({ username: 'x' }),
    new Api.InvokeWithLayer({ layer: 1, query: new Api.InitConnection({ apiId: 1, deviceModel: '', systemVersion: '', appVersion: '', systemLangCode: '', langPack: '', langCode: '', query: new Api.help.GetConfig() }) }),
  ]) assert.equal(forbiddenRequest(r), null, `заблоковано ${r.className}`);
});

test('makeReadOnly: заборонений запит не доходить до справжнього invoke', async () => {
  let called = 0;
  const client = makeReadOnly({ invoke: async () => { called++; return 'ok'; } }, () => {});
  await assert.rejects(client.invoke(new Api.messages.SendMessage({ peer, message: 'x', randomId: 1n })), /READ_ONLY_LISTENER/);
  assert.equal(called, 0);
  assert.equal(await client.invoke(new Api.updates.GetState()), 'ok');
  assert.equal(called, 1);
});
