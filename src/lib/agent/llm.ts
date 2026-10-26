/**
 * Клієнт моделей: OpenAI-сумісний виклик через OpenRouter (план BizDev-агента: провайдер-нейтрально,
 * модель — рядок у конфізі). Ключ лише в env сервера (BIZDEV_OPENROUTER_API_KEY), у код і git не потрапляє.
 */

const env = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined);

/** Моделі за замовчуванням: пише одна, оцінює інша (критерій 3/8). Перевизначаються env. */
export const DRAFTER_MODEL = () => env('BIZDEV_DRAFTER_MODEL') || 'anthropic/claude-sonnet-5.5';
export const JUDGE_MODEL = () => env('BIZDEV_JUDGE_MODEL') || 'anthropic/claude-opus-5.5';

export const llmConfigured = () => !!env('BIZDEV_OPENROUTER_API_KEY');

export interface ChatOpts {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

export async function chat(o: ChatOpts): Promise<string> {
  const key = env('BIZDEV_OPENROUTER_API_KEY');
  if (!key) throw new Error('BIZDEV_OPENROUTER_API_KEY не задано');
  const base = env('BIZDEV_OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1';
  let last: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'ADvantage BizDev backtest' },
        body: JSON.stringify({
          model: o.model,
          temperature: o.temperature ?? 0.2,
          max_tokens: o.maxTokens ?? 1200,
          messages: [{ role: 'system', content: o.system }, { role: 'user', content: o.user }],
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (res.status === 429 || res.status >= 500) { last = new Error(`LLM ${res.status}`); continue; }
      const body: any = await res.json();
      if (!res.ok) throw new Error(`LLM ${res.status}: ${body?.error?.message ?? 'помилка'}`);
      const text = body?.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text.trim()) { last = new Error('порожня відповідь моделі'); continue; }
      return text;
    } catch (e) {
      last = e;
      if (e instanceof Error && /^LLM 4\d\d:/.test(e.message)) throw e; // помилка запиту — повтор не допоможе
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

/** Перший JSON-об'єкт у відповіді моделі (моделі інколи обгортають його в ```json). */
export function parseJsonObject(text: string): any {
  const t = text.replace(/```(?:json)?/g, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('у відповіді моделі немає JSON');
  return JSON.parse(t.slice(start, end + 1));
}
