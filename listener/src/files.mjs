// Стан слухача на томі сервера (/data, том bizdev_tg), поза git і поза базою.
// Файли 600: сесія Telegram, ключ застосунку, токен бота-пульта.
import { readFile, writeFile, rename, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = process.env.BIZDEV_TG_DATA ?? '/data';

export async function readJson(name) {
  try {
    return JSON.parse(await readFile(join(DIR, name), 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

export async function writeJson(name, value) {
  await mkdir(DIR, { recursive: true, mode: 0o700 });
  const path = join(DIR, name);
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await rename(tmp, path);
}

export async function removeFile(name) {
  await rm(join(DIR, name), { force: true });
}
