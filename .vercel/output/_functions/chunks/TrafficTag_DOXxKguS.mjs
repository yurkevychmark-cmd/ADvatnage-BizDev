import { e as createComponent, m as maybeRenderHead, r as renderTemplate, h as createAstro } from './astro/server_zKUY4SJo.mjs';
import 'piccolore';
import 'clsx';

const $$Astro = createAstro();
const $$TrafficTag = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$TrafficTag;
  const { type } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<span class="inline-block bg-card-2 text-gray-400 text-xs px-2 py-0.5 rounded border border-border"> ${type} </span>`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/components/TrafficTag.astro", void 0);

export { $$TrafficTag as $ };
