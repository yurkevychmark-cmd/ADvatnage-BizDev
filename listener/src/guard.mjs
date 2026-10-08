// Слухач лише читає (таск 140108c8, «Не змінюється: агент нічого не надсилає»).
// Це забезпечено не логікою слухача, а самим клієнтом: кожен запит до Telegram
// проходить тут, і пропускаються лише вхід (auth.*) та читання (Get*/Resolve*/Check*).
// Надіслати, переслати, позначити прочитаним, «друкує», вступити в чат — неможливо,
// навіть якщо такий виклик з'явиться в коді помилково.

const ALLOWED_VERBS = /^(Get|Resolve|Check|Search)/;
// Обгортки MTProto, у них усередині справжній запит — перевіряємо його.
const WRAPPERS = /^(InvokeWithLayer|InitConnection|InvokeWithoutUpdates|InvokeAfterMsg|InvokeWithTakeout)$/;
const SERVICE = /^(Ping|PingDelayDisconnect|DestroySession|GetFutureSalts)$/;

/** @returns {string | null} назва забороненого запиту або null, якщо можна */
export function forbiddenRequest(request) {
  let r = request;
  for (let depth = 0; r && depth < 6; depth++) {
    const name = String(r.className ?? '');
    if (WRAPPERS.test(name)) { r = r.query; continue; }
    if (SERVICE.test(name)) return null;
    const [ns, method] = name.includes('.') ? name.split('.', 2) : ['', name];
    // auth.* — вхід і вихід. Окрім: вибити інші пристрої акаунта й зареєструвати новий акаунт.
    if (ns === 'auth') return /^auth\.(ResetAuthorizations|SignUp)$/.test(name) ? name : null;
    if (ALLOWED_VERBS.test(method)) return null;
    return name || 'unknown';
  }
  return 'unknown';
}

/** Обгортає client.invoke: заборонений запит — виняток, до Telegram він не доходить. */
export function makeReadOnly(client, log = console.error) {
  const invoke = client.invoke.bind(client);
  client.invoke = (request, ...rest) => {
    const bad = forbiddenRequest(request);
    if (bad) {
      log(`[guard] заблоковано ${bad}`);
      return Promise.reject(new Error(`READ_ONLY_LISTENER: ${bad} заборонено`));
    }
    return invoke(request, ...rest);
  };
  return client;
}
