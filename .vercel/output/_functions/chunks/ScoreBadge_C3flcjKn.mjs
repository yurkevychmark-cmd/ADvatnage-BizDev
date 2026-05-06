import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, h as createAstro } from './astro/server_zKUY4SJo.mjs';
import 'piccolore';
import 'clsx';

const $$Astro = createAstro();
const $$ScoreBadge = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$ScoreBadge;
  const { score } = Astro2.props;
  const color = score >= 60 ? "text-success bg-success/15 border-success/30" : score >= 30 ? "text-warning bg-warning/15 border-warning/30" : "text-danger bg-danger/15 border-danger/30";
  return renderTemplate`${maybeRenderHead()}<span${addAttribute(`inline-block text-xs font-bold px-2.5 py-1 rounded border ${color}`, "class")}> ${score}%
</span>`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/components/ScoreBadge.astro", void 0);

export { $$ScoreBadge as $ };
