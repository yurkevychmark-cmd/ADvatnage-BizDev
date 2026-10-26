/**
 * Клієнт моделей: Anthropic API (рішення Марка 26.10 — ключ із плану Claude, ліміт на AI-агентів).
 * Ключ лише в env сервера (BIZDEV_ANTHROPIC_API_KEY), у код і git не потрапляє.
 * temperature не передаємо: API 2026-10-21 приймає лише вибірку за замовчуванням.
 */
import Anthropic from '@anthropic-ai/sdk';

const env = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined);

/** Моделі за замовчуванням: пише одна, оцінює інша (критерій 3/8). Перевизначаються env. */
export const DRAFTER_MODEL = () => env('BIZDEV_DRAFTER_MODEL') || 'claude-sonnet-5-5';
export const JUDGE_MODEL = () => env('BIZDEV_JUDGE_MODEL') || 'claude-opus-5-5';

export const llmConfigured = () => !!env('BIZDEV_ANTHROPIC_API_KEY');

export type Effort = 'low' | 'medium' | 'high';

export interface ChatOpts {
  model: string;
  system: string;
  user: string;
  /** Глибина роздумів моделі; на Opus 5.5 за замовчуванням medium. */
  effort?: Effort;
  maxTokens?: number;
}

/** Токени за весь процес — для звіту про вартість прогону. */
export const usage = { input: 0, output: 0, calls: 0 };

let client: Anthropic | null = null;
const getClient = () => {
  const apiKey = env('BIZDEV_ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('BIZDEV_ANTHROPIC_API_KEY не задано');
  // SDK сам повторює 408/409/429/5xx і обриви зв'язку
  return (client ??= new Anthropic({ apiKey, maxRetries: 4, timeout: 180_000 }));
};

export async function chat(o: ChatOpts): Promise<string> {
  const res = await getClient().beta.messages.create({
    model: o.model,
    // з запасом на роздуми моделі: платимо лише за використане
    max_tokens: o.maxTokens ?? 16000,
    output_config: { effort: o.effort ?? 'medium' },
    system: o.system,
    messages: [{ role: 'user', content: o.user }],
    // якщо модель відмовить з міркувань безпеки — сервер повторить на запасній
    fallbacks: 'default',
    betas: ['server-side-fallback-2026-07-01'],
  });
  usage.calls++;
  usage.input += res.usage.input_tokens;
  usage.output += res.usage.output_tokens;
  if (res.stop_reason === 'refusal') throw new Error(`модель відмовилась (${res.stop_details?.category ?? 'без категорії'})`);
  if (res.stop_reason === 'max_tokens') throw new Error('відповідь моделі обрізана лімітом токенів');
  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  if (!text.trim()) throw new Error('порожня відповідь моделі');
  return text;
}

/** Перший JSON-об'єкт у відповіді моделі (моделі інколи обгортають його в ```json). */
export function parseJsonObject(text: string): any {
  const t = text.replace(/```(?:json)?/g, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('у відповіді моделі немає JSON');
  return JSON.parse(t.slice(start, end + 1));
}
