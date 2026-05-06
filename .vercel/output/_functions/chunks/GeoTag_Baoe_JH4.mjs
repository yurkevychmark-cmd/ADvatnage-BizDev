import { e as createComponent, m as maybeRenderHead, r as renderTemplate, h as createAstro } from './astro/server_zKUY4SJo.mjs';
import 'piccolore';
import 'clsx';

const $$Astro = createAstro();
const $$GeoTag = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$GeoTag;
  const { code } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<span class="inline-block bg-accent/15 text-accent text-xs px-2 py-0.5 rounded border border-accent/25 font-medium tracking-wide"> ${code} </span>`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/components/GeoTag.astro", void 0);

export { $$GeoTag as $ };
