/* empty css                                */
import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../chunks/astro/server_zKUY4SJo.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_Csh5F8eE.mjs';
import { $ as $$GeoTag } from '../chunks/GeoTag_Baoe_JH4.mjs';
import { $ as $$TrafficTag } from '../chunks/TrafficTag_DOXxKguS.mjs';
import { $ as $$ScoreBadge } from '../chunks/ScoreBadge_C3flcjKn.mjs';
import { supabase } from '../chunks/supabase_CUAAmmKv.mjs';
export { renderers } from '../renderers.mjs';

const W_GEO = 0.45;
const W_TRAFFIC = 0.3;
const W_BUDGET = 0.25;
function computeMatches(buyers, operators) {
  const results = [];
  for (const buyer of buyers) {
    const buyerGeo = buyer.geo_expertise ?? [];
    const buyerTraffic = buyer.traffic_types ?? [];
    for (const operator of operators) {
      const opGeo = operator.target_geos ?? [];
      const opTraffic = operator.preferred_traffic ?? [];
      const geoOverlap = buyerGeo.filter((g) => opGeo.includes(g));
      const geoUnion = (/* @__PURE__ */ new Set([...buyerGeo, ...opGeo])).size;
      const geoScore = geoUnion > 0 ? geoOverlap.length / geoUnion * 100 : 0;
      const trafficOverlap = buyerTraffic.filter((t) => opTraffic.includes(t));
      const trafficUnion = (/* @__PURE__ */ new Set([...buyerTraffic, ...opTraffic])).size;
      const trafficScore = trafficUnion > 0 ? trafficOverlap.length / trafficUnion * 100 : 0;
      const budgetFit = buyer.monthly_budget_capacity >= operator.budget_min && buyer.monthly_budget_capacity <= operator.budget_max * 1.5;
      const budgetScore = budgetFit ? 100 : 0;
      const totalScore = Math.round(
        geoScore * W_GEO + trafficScore * W_TRAFFIC + budgetScore * W_BUDGET
      );
      if (totalScore > 0) {
        results.push({
          buyer_id: buyer.id,
          operator_id: operator.id,
          score: totalScore,
          geo_overlap: geoOverlap,
          traffic_overlap: trafficOverlap,
          budget_fit: budgetFit
        });
      }
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  let message = "";
  if (Astro2.request.method === "POST") {
    const form = await Astro2.request.formData();
    const action = form.get("_action");
    if (action === "run") {
      const { data: buyers } = await supabase.from("buyers").select("*");
      const { data: operators } = await supabase.from("operators").select("*");
      if (buyers && operators && buyers.length > 0 && operators.length > 0) {
        const results = computeMatches(buyers, operators);
        for (const r of results) {
          await supabase.from("matches").upsert({
            buyer_id: r.buyer_id,
            operator_id: r.operator_id,
            score: r.score,
            geo_overlap: r.geo_overlap,
            traffic_overlap: r.traffic_overlap,
            budget_fit: r.budget_fit,
            status: "suggested",
            pipeline_stage: "new"
          }, { onConflict: "buyer_id,operator_id" });
        }
        message = `Generated ${results.length} matches`;
      } else {
        message = "Need at least 1 buyer and 1 operator";
      }
    }
    if (action === "update_status") {
      await supabase.from("matches").update({ status: form.get("status") }).eq("id", form.get("match_id"));
    }
    if (action === "add_comment") {
      await supabase.from("match_comments").insert({
        match_id: form.get("match_id"),
        author: form.get("author") || "Manager",
        body: form.get("body")
      });
    }
    if (action === "delete") {
      await supabase.from("matches").delete().eq("id", form.get("match_id"));
    }
  }
  const { data: matches } = await supabase.from("matches").select("*, buyer:buyers(*), operator:operators(*)").order("score", { ascending: false });
  const { data: comments } = await supabase.from("match_comments").select("*").order("created_at", { ascending: true });
  function commentsFor(matchId) {
    return (comments ?? []).filter((c) => c.match_id === matchId);
  }
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Matchmaking" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex items-center justify-between mb-6"> <div> <h1 class="text-2xl font-bold">Matchmaking</h1> <p class="text-gray-500 text-sm mt-1">Find the best buyer-operator pairs</p> </div> <div class="flex gap-3"> <a href="/pipeline" class="text-sm text-gray-400 hover:text-gray-200 border border-border px-4 py-2.5 rounded-lg bg-card-2 transition-colors">
Pipeline →
</a> <form method="POST"> <input type="hidden" name="_action" value="run"> <button type="submit" class="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-accent/20">
Run Matchmaking
</button> </form> </div> </div> ${message && renderTemplate`<div class="bg-accent/10 text-accent border border-accent/25 rounded-lg px-4 py-3 mb-5 text-sm">${message}</div>`} <div class="flex gap-3 mb-6"> <input type="text" id="filter_search" placeholder="Filter by buyer or operator..." class="flex-1 bg-card-2 border border-border rounded-lg px-4 py-2 text-sm text-gray-100 focus:border-accent outline-none placeholder-gray-600"> <select id="filter_status" class="bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-accent outline-none"> <option value="">All statuses</option> <option value="suggested">Suggested</option> <option value="accepted">Accepted</option> <option value="active">Active</option> <option value="rejected">Rejected</option> </select> <select id="filter_min_score" class="bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-accent outline-none"> <option value="0">Any score</option> <option value="30">30%+</option> <option value="60">60%+</option> <option value="80">80%+</option> </select> </div> ${!matches || matches.length === 0 ? renderTemplate`<div class="bg-card rounded-xl border border-border p-12 text-center"> <p class="text-gray-500 mb-2">No matches yet.</p> <p class="text-gray-700 text-sm">Add buyers and operators, then click "Run Matchmaking".</p> </div>` : renderTemplate`<div class="space-y-4" id="matches_list"> ${matches.map((m) => {
    const matchComments = commentsFor(m.id);
    return renderTemplate`<div class="match-card bg-card rounded-xl border border-border hover:border-accent/25 transition-colors"${addAttribute(m.buyer?.name?.toLowerCase() ?? "", "data-buyer")}${addAttribute(m.operator?.name?.toLowerCase() ?? "", "data-operator")}${addAttribute(m.status, "data-status")}${addAttribute(m.score, "data-score")}> <div class="p-6"> <div class="flex items-start gap-4"> ${renderComponent($$result2, "ScoreBadge", $$ScoreBadge, { "score": m.score })} <div class="flex-1 min-w-0"> <div class="flex items-center gap-2 mb-3 flex-wrap"> <span class="font-semibold">${m.buyer?.name}</span> <span class="text-gray-600 text-xs">↔</span> <span class="font-semibold">${m.operator?.name}</span> ${m.operator?.brand && renderTemplate`<span class="text-gray-600 text-sm">(${m.operator.brand})</span>`} <span${addAttribute(`text-xs px-2 py-0.5 rounded border ml-auto ${m.status === "active" ? "bg-success/15 text-success border-success/30" : m.status === "accepted" ? "bg-accent/15 text-accent border-accent/30" : m.status === "rejected" ? "bg-danger/15 text-danger border-danger/30" : "bg-card-2 text-gray-500 border-border"}`, "class")}>${m.status}</span> </div> <div class="grid grid-cols-3 gap-4 text-sm"> <div> <p class="text-gray-600 text-xs mb-1 uppercase tracking-wide">GEO Overlap</p> <div class="flex flex-wrap gap-1"> ${(m.geo_overlap ?? []).length > 0 ? (m.geo_overlap ?? []).map((g) => renderTemplate`${renderComponent($$result2, "GeoTag", $$GeoTag, { "code": g })}`) : renderTemplate`<span class="text-gray-700 text-xs">None</span>`} </div> </div> <div> <p class="text-gray-600 text-xs mb-1 uppercase tracking-wide">Traffic</p> <div class="flex flex-wrap gap-1"> ${(m.traffic_overlap ?? []).length > 0 ? (m.traffic_overlap ?? []).map((t) => renderTemplate`${renderComponent($$result2, "TrafficTag", $$TrafficTag, { "type": t })}`) : renderTemplate`<span class="text-gray-700 text-xs">None</span>`} </div> </div> <div> <p class="text-gray-600 text-xs mb-1 uppercase tracking-wide">Budget Fit</p> <span${addAttribute(`text-sm font-medium ${m.budget_fit ? "text-success" : "text-danger"}`, "class")}> ${m.budget_fit ? "\u2713 Yes" : "\u2717 No"} </span> </div> </div> </div> </div> <div class="flex items-center gap-2 mt-4 pt-4 border-t border-border"> ${m.status !== "accepted" && m.status !== "active" && renderTemplate`<button${addAttribute(`openMarginModal('${m.id}','${(m.buyer?.name ?? "").replace(/'/g, "\\'")}','${(m.operator?.name ?? "").replace(/'/g, "\\'")}',${m.operator?.revshare_pct || 0},${m.operator?.cpa_value || 0})`, "onclick")} class="text-success bg-success/10 hover:bg-success/20 border border-success/25 text-xs px-3 py-1.5 rounded-lg transition-colors">Accept</button>`} ${m.status !== "rejected" && renderTemplate`<form method="POST" class="inline"> <input type="hidden" name="_action" value="update_status"> <input type="hidden" name="match_id"${addAttribute(m.id, "value")}> <input type="hidden" name="status" value="rejected"> <button type="submit" class="text-danger bg-danger/10 hover:bg-danger/20 border border-danger/25 text-xs px-3 py-1.5 rounded-lg transition-colors">Reject</button> </form>`} ${m.status === "accepted" && renderTemplate`<form method="POST" class="inline"> <input type="hidden" name="_action" value="update_status"> <input type="hidden" name="match_id"${addAttribute(m.id, "value")}> <input type="hidden" name="status" value="active"> <button type="submit" class="text-accent bg-accent/10 hover:bg-accent/20 border border-accent/25 text-xs px-3 py-1.5 rounded-lg transition-colors">Activate</button> </form>`} <button${addAttribute(`toggleComments('${m.id}')`, "onclick")} class="text-gray-500 hover:text-gray-300 text-xs px-3 py-1.5 rounded-lg bg-card-2 border border-border hover:border-gray-600 transition-colors">
Notes ${matchComments.length > 0 ? `(${matchComments.length})` : ""} </button> <a${addAttribute(`/calculator?match_id=${m.id}&buyer_id=${m.buyer_id}&operator_id=${m.operator_id}`, "href")} class="text-gray-500 hover:text-gray-300 text-xs px-3 py-1.5 rounded-lg bg-card-2 border border-border hover:border-gray-600 transition-colors ml-auto">
Calculator
</a> <form method="POST" class="inline" onsubmit="return confirm('Delete this match?')"> <input type="hidden" name="_action" value="delete"> <input type="hidden" name="match_id"${addAttribute(m.id, "value")}> <button type="submit" class="text-gray-700 hover:text-danger text-xs px-3 py-1.5 rounded-lg transition-colors">Delete</button> </form> </div> </div> <!-- Comments panel --> <div${addAttribute(`comments_${m.id}`, "id")} class="hidden border-t border-border px-6 pb-5 pt-4"> <p class="text-xs text-gray-500 uppercase tracking-wide mb-3">Notes & Activity</p> ${matchComments.length > 0 && renderTemplate`<div class="space-y-2 mb-4"> ${matchComments.map((c) => renderTemplate`<div class="bg-card-2 rounded-lg px-3 py-2 border border-border"> <div class="flex items-center gap-2 mb-1"> <span class="text-xs font-medium text-accent">${c.author}</span> <span class="text-xs text-gray-700">${new Date(c.created_at).toLocaleDateString("uk-UA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span> </div> <p class="text-sm text-gray-300">${c.body}</p> </div>`)} </div>`} <form method="POST" class="flex gap-2"> <input type="hidden" name="_action" value="add_comment"> <input type="hidden" name="match_id"${addAttribute(m.id, "value")}> <input type="text" name="author" placeholder="Your name" class="w-28 bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-accent outline-none placeholder-gray-700"> <input type="text" name="body" required placeholder="Add a note..." class="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-accent outline-none placeholder-gray-700"> <button type="submit" class="bg-accent/15 hover:bg-accent/25 text-accent border border-accent/25 text-xs px-3 py-1.5 rounded-lg transition-colors">Add</button> </form> </div> </div>`;
  })} </div>`}` })} <!-- Agency Margin Modal --> <div id="margin-modal" class="hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"> <div class="bg-card border border-border rounded-2xl p-7 w-full max-w-md shadow-2xl" style="box-shadow: 0 0 60px rgba(225,29,72,0.15);"> <div class="flex items-center justify-between mb-1"> <h2 class="text-lg font-bold">Agency Economics Check</h2> <button onclick="closeMarginModal()" class="text-gray-600 hover:text-gray-300 text-xl leading-none transition-colors">&times;</button> </div> <p class="text-gray-600 text-sm mb-5" id="modal-subtitle">Check agency margin before accepting</p> <div class="bg-card-2 border border-border rounded-lg px-4 py-2.5 mb-5 text-xs text-gray-500 font-mono">
Agency Profit % = Operator % − Buyer % − Costs %
</div> <div class="space-y-4"> <div class="grid grid-cols-3 gap-3"> <div> <label class="block text-xs text-gray-500 mb-1">Operator %</label> <input type="number" id="m_operator_pct" step="0.1" min="0" max="100" value="40" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-gray-100 focus:border-accent outline-none text-sm"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Buyer %</label> <input type="number" id="m_buyer_pct" step="0.1" min="0" max="100" value="30" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-gray-100 focus:border-accent outline-none text-sm"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Costs %</label> <input type="number" id="m_costs_pct" step="0.1" min="0" max="100" value="5" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-gray-100 focus:border-accent outline-none text-sm"> </div> </div> <div> <label class="block text-xs text-gray-500 mb-1">Campaign Volume (USD)</label> <input type="number" id="m_volume" step="100" min="0" value="10000" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-gray-100 focus:border-accent outline-none text-sm"> </div> </div> <div id="m_result" class="mt-5 rounded-xl border-2 p-5 text-center transition-all border-border"> <p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Agency Net Margin</p> <p class="text-5xl font-black my-2" id="m_margin_pct">0%</p> <p class="text-sm" id="m_profit_abs">$0 profit on $10,000</p> <p class="text-xs mt-2" id="m_warning"></p> </div> <p class="text-xs text-gray-700 mt-3 text-center">Max Buyer %: <span id="m_max_buyer_val" class="text-gray-500">—</span></p> <div class="flex gap-3 mt-6"> <button onclick="closeMarginModal()" class="flex-1 bg-card-2 hover:bg-border text-gray-300 font-medium py-2.5 rounded-lg transition-colors border border-border text-sm">Cancel</button> <form method="POST" class="flex-1" id="m_accept_form"> <input type="hidden" name="_action" value="update_status"> <input type="hidden" name="status" value="accepted"> <input type="hidden" name="match_id" id="m_match_id_input" value=""> <button type="submit" id="m_confirm_btn" class="w-full font-medium py-2.5 rounded-lg transition-colors text-sm bg-success text-white hover:bg-green-600">
Confirm & Accept
</button> </form> </div> </div> </div> ${renderScript($$result, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/matchmaking/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/matchmaking/index.astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/matchmaking/index.astro";
const $$url = "/matchmaking";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
