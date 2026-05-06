import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, h as createAstro, o as renderHead, k as renderComponent, p as renderSlot } from './astro/server_zKUY4SJo.mjs';
import 'piccolore';
import 'clsx';
/* empty css                        */

const $$Astro$1 = createAstro();
const $$Nav = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Nav;
  const { currentPath } = Astro2.props;
  const links = [
    { href: "/", label: "Dashboard", icon: "\u25EB" },
    { href: "/buyers", label: "Buyers", icon: "\u2295" },
    { href: "/operators", label: "Operators", icon: "\u229B" },
    { href: "/deals", label: "Deals", icon: "\u21CB" }
  ];
  function isActive(href) {
    if (href === "/") return currentPath === "/";
    return currentPath.startsWith(href);
  }
  return renderTemplate`${maybeRenderHead()}<aside class="fixed left-0 top-0 h-screen w-56 bg-card border-r border-border flex flex-col" style="box-shadow: 4px 0 24px rgba(225,29,72,0.06);"> <div class="p-5 border-b border-border flex items-center gap-2.5"> <div class="w-7 h-7 bg-accent rounded-md flex items-center justify-center shrink-0"> <span class="text-white font-black text-xs leading-none">AD</span> </div> <span class="text-white font-black text-lg tracking-tight">vantage</span> </div> <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto"> ${links.map((link) => renderTemplate`<a${addAttribute(link.href, "href")}${addAttribute(`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive(link.href) ? "bg-accent/15 text-accent font-medium border border-accent/25" : "text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent"}`, "class")}> <span class="text-base">${link.icon}</span> ${link.label} </a>`)} </nav> <div class="p-4 border-t border-border"> <p class="text-xs text-gray-700">Internal Tool v1.0</p> </div> </aside>`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/components/Nav.astro", void 0);

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="en" class="dark" data-astro-cid-dmqsi53g> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} | ADvantage BizDev</title>${renderHead()}</head> <body class="text-gray-100 min-h-screen flex" data-astro-cid-dmqsi53g> ${renderComponent($$result, "Nav", $$Nav, { "currentPath": Astro2.url.pathname, "data-astro-cid-dmqsi53g": true })} <main class="flex-1 ml-60 p-8 min-h-screen" data-astro-cid-dmqsi53g> ${renderSlot($$result, $$slots["default"])} </main> </body></html>`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/components/Layout.astro", void 0);

export { $$Layout as $ };
