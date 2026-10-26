/**
 * Захист від «списування» (критерій 2 таска 3/8): відповідь Марка, з якою порівнюють чернетку,
 * агент не бачить ні в профілі, ні в прикладах. Перевіряємо текст підказки перед кожним викликом.
 *
 * Правило: відповідь з 4+ слів — шукаємо в підказці будь-який її відрізок з 4 слів поспіль
 * (або всю, якщо вона коротша за 6 слів); коротку («Thank you», «Okay») — лише як окрему
 * репліку слово в слово: така фраза не видає конкретну відповідь, але дубль усе одно не показуємо.
 */

export const normalize = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}'@$%]+/gu, ' ').trim();

const words = (s: string) => normalize(s).split(' ').filter(Boolean);

/** Відрізки з n слів поспіль. */
function shingles(ws: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= ws.length; i++) out.push(ws.slice(i, i + n).join(' '));
  return out;
}

/** Фрагмент відповіді, знайдений у тексті, або null. */
export function findLeak(text: string, reply: string): string | null {
  const rw = words(reply);
  if (!rw.length) return null;
  const hay = ` ${normalize(text)} `;
  if (rw.length < 4) {
    // коротка репліка — лише як окрема фраза (рядок цілком), не як частина іншого речення
    const lines = text.split('\n').map((l) => normalize(l.replace(/^[>\-*\s]+|^\*\*[^*]+\*\*/g, ''))).filter(Boolean);
    const whole = rw.join(' ');
    return lines.some((l) => l === whole) ? whole : null;
  }
  const n = Math.min(4, rw.length);
  for (const sh of shingles(rw, n)) if (hay.includes(` ${sh} `)) return sh;
  return null;
}

/** Чи вважається приклад «тим самим», що й оцінювана відповідь (тоді його не показуємо). */
export function sameText(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
