/* empty css                                */
import { e as createComponent, m as maybeRenderHead, r as renderTemplate, h as createAstro, k as renderComponent, g as addAttribute } from '../chunks/astro/server_zKUY4SJo.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_Csh5F8eE.mjs';
import 'clsx';
import { $ as $$ScoreBadge } from '../chunks/ScoreBadge_C3flcjKn.mjs';
import { $ as $$GeoTag } from '../chunks/GeoTag_Baoe_JH4.mjs';
import { supabase } from '../chunks/supabase_CUAAmmKv.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$StatCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$StatCard;
  const { label, value, sub } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="bg-card rounded-xl p-6 border border-border relative overflow-hidden group hover:border-accent/30 transition-colors"> <div class="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div> <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">${label}</p> <p class="text-2xl font-bold">${value}</p> ${sub && renderTemplate`<p class="text-xs text-gray-600 mt-1">${sub}</p>`} </div>`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/components/StatCard.astro", void 0);

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const { count: buyerCount } = await supabase.from("buyers").select("*", { count: "exact", head: true });
  const { count: operatorCount } = await supabase.from("operators").select("*", { count: "exact", head: true });
  const { count: matchCount } = await supabase.from("matches").select("*", { count: "exact", head: true });
  const { count: projectCount } = await supabase.from("projects").select("*", { count: "exact", head: true });
  const { data: recentMatches } = await supabase.from("matches").select("*, buyer:buyers(*), operator:operators(*)").order("score", { ascending: false }).limit(5);
  const { data: recentProjects } = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(5);
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Dashboard" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-8"> <h1 class="text-2xl font-bold">Dashboard</h1> <p class="text-gray-600 text-sm mt-1">Overview of your matchmaking pipeline</p> </div> <div class="grid grid-cols-4 gap-4 mb-8"> ${renderComponent($$result2, "StatCard", $$StatCard, { "label": "Buyers", "value": buyerCount ?? 0 })} ${renderComponent($$result2, "StatCard", $$StatCard, { "label": "Operators", "value": operatorCount ?? 0 })} ${renderComponent($$result2, "StatCard", $$StatCard, { "label": "Matches", "value": matchCount ?? 0 })} ${renderComponent($$result2, "StatCard", $$StatCard, { "label": "Projects", "value": projectCount ?? 0 })} </div> <div class="flex gap-3 mb-8"> <a href="/buyers/add" class="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-accent/20">
+ Add Buyer
</a> <a href="/operators/add" class="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-accent/20">
+ Add Operator
</a> <a href="/matchmaking" class="bg-card-2 hover:bg-border text-gray-300 hover:text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors border border-border">
Run Matchmaking
</a> </div> <div class="grid grid-cols-2 gap-6"> <div class="bg-card rounded-xl border border-border p-6"> <h2 class="text-base font-semibold mb-4 flex items-center gap-2"> <span class="w-1.5 h-4 bg-accent rounded-full inline-block"></span>
Top Matches
</h2> ${!recentMatches || recentMatches.length === 0 ? renderTemplate`<p class="text-gray-600 text-sm">No matches yet. Add buyers and operators, then run matchmaking.</p>` : renderTemplate`<div class="space-y-2"> ${recentMatches.map((m) => renderTemplate`<div class="flex items-center justify-between p-3 bg-card-2 rounded-lg border border-border hover:border-accent/30 transition-colors"> <div> <div class="text-sm"> <span class="font-medium">${m.buyer?.name}</span> <span class="text-gray-600 mx-2">↔</span> <span class="font-medium">${m.operator?.name}</span> </div> <div class="flex gap-1 mt-1"> ${(m.geo_overlap ?? []).map((g) => renderTemplate`${renderComponent($$result2, "GeoTag", $$GeoTag, { "code": g })}`)} </div> </div> ${renderComponent($$result2, "ScoreBadge", $$ScoreBadge, { "score": m.score })} </div>`)} </div>`} </div> <div class="bg-card rounded-xl border border-border p-6"> <h2 class="text-base font-semibold mb-4 flex items-center gap-2"> <span class="w-1.5 h-4 bg-accent rounded-full inline-block"></span>
Recent Projects
</h2> ${!recentProjects || recentProjects.length === 0 ? renderTemplate`<p class="text-gray-600 text-sm">No projects yet. Use the calculator to create one.</p>` : renderTemplate`<table class="w-full text-sm"> <thead> <tr class="text-gray-600 text-xs uppercase tracking-wide"> <th class="text-left pb-3">Name</th> <th class="text-left pb-3">Status</th> <th class="text-right pb-3">ROI</th> </tr> </thead> <tbody> ${recentProjects.map((p) => renderTemplate`<tr class="border-t border-border"> <td class="py-2.5 text-gray-300">${p.name}</td> <td class="py-2.5"> <span${addAttribute(`text-xs px-2 py-0.5 rounded border ${p.status === "active" ? "bg-success/15 text-success border-success/30" : p.status === "completed" ? "bg-accent/15 text-accent border-accent/30" : "bg-card-2 text-gray-500 border-border"}`, "class")}>${p.status}</span> </td> <td${addAttribute(`py-2.5 text-right font-mono font-semibold ${p.calc_roi >= 0 ? "text-success" : "text-danger"}`, "class")}> ${p.calc_roi != null ? `${p.calc_roi}%` : "\u2014"} </td> </tr>`)} </tbody> </table>`} </div> </div> ` })}`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/index.astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
