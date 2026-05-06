/* empty css                                */
import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../chunks/astro/server_zKUY4SJo.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_Csh5F8eE.mjs';
import { $ as $$ScoreBadge } from '../chunks/ScoreBadge_C3flcjKn.mjs';
import { $ as $$GeoTag } from '../chunks/GeoTag_Baoe_JH4.mjs';
import { supabase } from '../chunks/supabase_CUAAmmKv.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  if (Astro2.request.method === "POST") {
    const form = await Astro2.request.formData();
    const matchId = form.get("match_id");
    const stage = form.get("stage");
    await supabase.from("matches").update({ pipeline_stage: stage }).eq("id", matchId);
    return Astro2.redirect("/pipeline");
  }
  const { data: matches } = await supabase.from("matches").select("*, buyer:buyers(*), operator:operators(*)").neq("status", "rejected").order("score", { ascending: false });
  const stages = [
    { key: "new", label: "New", color: "border-gray-600", badge: "bg-gray-700 text-gray-300" },
    { key: "negotiation", label: "Negotiation", color: "border-warning/40", badge: "bg-warning/15 text-warning" },
    { key: "trial", label: "Trial Run", color: "border-accent/40", badge: "bg-accent/15 text-accent" },
    { key: "active", label: "Active", color: "border-success/40", badge: "bg-success/15 text-success" },
    { key: "completed", label: "Completed", color: "border-blue-500/40", badge: "bg-blue-500/15 text-blue-400" }
  ];
  function matchesForStage(stage) {
    return (matches ?? []).filter((m) => (m.pipeline_stage ?? "new") === stage);
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Pipeline" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex items-center justify-between mb-8"> <div> <h1 class="text-2xl font-bold">Pipeline</h1> <p class="text-gray-500 text-sm mt-1">Deal stages for all active matches</p> </div> <a href="/matchmaking" class="text-sm text-gray-500 hover:text-gray-300 transition-colors border border-border px-4 py-2 rounded-lg bg-card-2">
← Matchmaking
</a> </div> <div class="flex gap-4 overflow-x-auto pb-4" style="min-height: 70vh;"> ${stages.map((stage) => {
    const cards = matchesForStage(stage.key);
    return renderTemplate`<div${addAttribute(`flex-shrink-0 w-72 bg-card rounded-xl border ${stage.color} flex flex-col`, "class")}> <div class="px-4 py-3 border-b border-border flex items-center justify-between"> <div class="flex items-center gap-2"> <span${addAttribute(`text-xs px-2 py-0.5 rounded font-medium ${stage.badge}`, "class")}>${stage.label}</span> </div> <span class="text-xs text-gray-600 font-mono">${cards.length}</span> </div> <div class="flex-1 p-3 space-y-3 overflow-y-auto"> ${cards.length === 0 && renderTemplate`<p class="text-gray-700 text-xs text-center py-8">No deals</p>`} ${cards.map((m) => renderTemplate`<div class="bg-card-2 rounded-lg border border-border p-3 hover:border-accent/30 transition-colors"> <div class="flex items-start justify-between mb-2"> <div class="flex-1 min-w-0"> <p class="text-sm font-medium truncate">${m.buyer?.name}</p> <p class="text-xs text-gray-500 truncate">↔ ${m.operator?.name}</p> </div> ${renderComponent($$result2, "ScoreBadge", $$ScoreBadge, { "score": m.score })} </div> <div class="flex flex-wrap gap-1 mb-3"> ${(m.geo_overlap ?? []).slice(0, 3).map((g) => renderTemplate`${renderComponent($$result2, "GeoTag", $$GeoTag, { "code": g })}`)} </div> <form method="POST" class="flex gap-1"> <input type="hidden" name="match_id"${addAttribute(m.id, "value")}> <select name="stage" class="flex-1 bg-card border border-border rounded text-xs px-2 py-1 text-gray-300 focus:border-accent outline-none"> ${stages.map((s) => renderTemplate`<option${addAttribute(s.key, "value")}${addAttribute(s.key === (m.pipeline_stage ?? "new"), "selected")}>${s.label}</option>`)} </select> <button type="submit" class="bg-accent/10 hover:bg-accent/20 text-accent border border-accent/25 rounded px-2 py-1 text-xs transition-colors">
→
</button> </form> </div>`)} </div> </div>`;
  })} </div> ` })}`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/pipeline/index.astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/pipeline/index.astro";
const $$url = "/pipeline";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
