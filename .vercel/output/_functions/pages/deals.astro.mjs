/* empty css                                */
import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../chunks/astro/server_zKUY4SJo.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_Csh5F8eE.mjs';
import { supabase } from '../chunks/supabase_CUAAmmKv.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  if (Astro2.request.method === "POST") {
    const form = await Astro2.request.formData();
    const action = form.get("_action");
    if (action === "create") {
      const buyerId = form.get("buyer_id");
      const opId = form.get("operator_id");
      const { data: buyer } = await supabase.from("buyers").select("name").eq("id", buyerId).single();
      const { data: op } = await supabase.from("operators").select("name").eq("id", opId).single();
      const dealType = form.get("deal_type");
      await supabase.from("projects").insert({
        name: `${buyer?.name ?? "?"} \u2194 ${op?.name ?? "?"}`,
        buyer_id: buyerId || null,
        operator_id: opId || null,
        pipeline_stage: form.get("pipeline_stage") || "new",
        deal_type: dealType,
        planned_spend: Number(form.get("planned_spend")) || 0,
        expected_conversions: Number(form.get("expected_conversions")) || 0,
        cpa_payout: dealType === "CPA" ? Number(form.get("op_value")) || 0 : 0,
        revshare_pct: dealType !== "CPA" ? Number(form.get("op_value")) || 0 : 0,
        avg_revenue_per_user: Number(form.get("avg_revenue_per_user")) || 0,
        buyer_fee: Number(form.get("buyer_fee")) || 0,
        side_costs: Number(form.get("side_costs")) || 0,
        notes: form.get("notes") || null,
        status: "active"
      });
    }
    if (action === "update_stage") {
      await supabase.from("projects").update({ pipeline_stage: form.get("stage") }).eq("id", form.get("deal_id"));
    }
    if (action === "update_actuals") {
      await supabase.from("projects").update({
        actual_spend: Number(form.get("actual_spend")) || null,
        actual_conversions: Number(form.get("actual_conversions")) || null,
        actual_revenue: Number(form.get("actual_revenue")) || null,
        buyer_fee: Number(form.get("buyer_fee")) || 0,
        side_costs: Number(form.get("side_costs")) || 0,
        notes: form.get("notes") || null
      }).eq("id", form.get("deal_id"));
    }
    if (action === "delete") {
      await supabase.from("projects").delete().eq("id", form.get("deal_id"));
    }
    return Astro2.redirect("/deals");
  }
  const stageFilter = Astro2.url.searchParams.get("stage") ?? "all";
  const query = supabase.from("projects").select("*, buyer:buyers(id,name), operator:operators(id,name,deal_type,cpa_value,revshare_pct,spend_pct)").order("created_at", { ascending: false });
  if (stageFilter !== "all") query.eq("pipeline_stage", stageFilter);
  const { data: deals } = await query;
  const { data: buyers } = await supabase.from("buyers").select("id, name").order("name");
  const { data: operators } = await supabase.from("operators").select("id, name, deal_type, cpa_value, revshare_pct, spend_pct").order("name");
  const stages = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "negotiation", label: "Negotiation" },
    { key: "trial", label: "Trial" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "no_deal", label: "No Deal" }
  ];
  const stageBadge = {
    new: "bg-gray-700/60 text-gray-300 border-gray-600",
    negotiation: "bg-warning/20 text-warning border-warning/30",
    trial: "bg-accent/20 text-accent border-accent/30",
    active: "bg-success/20 text-success border-success/30",
    completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    no_deal: "bg-danger/20 text-danger border-danger/30"
  };
  function calcRevenue(deal) {
    const type = deal.deal_type ?? "CPA";
    const hasActuals = deal.actual_spend != null || deal.actual_conversions != null || deal.actual_revenue != null;
    if (hasActuals) {
      if (type === "CPA" && deal.actual_conversions != null) return deal.cpa_payout * deal.actual_conversions;
      if (type === "RevShare" && deal.actual_revenue != null) return deal.revshare_pct / 100 * deal.actual_revenue;
      if (type === "Spend" && deal.actual_spend != null) return deal.revshare_pct / 100 * deal.actual_spend;
    }
    if (type === "CPA") return deal.cpa_payout * deal.expected_conversions;
    if (type === "RevShare") return deal.revshare_pct / 100 * (deal.expected_conversions * deal.avg_revenue_per_user);
    if (type === "Spend") return deal.revshare_pct / 100 * deal.planned_spend;
    return null;
  }
  function calcNet(deal) {
    const rev = calcRevenue(deal);
    if (rev == null) return null;
    return rev - (deal.buyer_fee ?? 0) - (deal.side_costs ?? 0);
  }
  function fmt(n) {
    return "$" + n.toLocaleString(void 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  const dealTypeLabel = { CPA: "CPA", RevShare: "RevShare", Spend: "% of Spend" };
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Deals" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex items-center justify-between mb-6"> <div> <h1 class="text-2xl font-bold">Deals</h1> <p class="text-gray-500 text-sm mt-1">Buyer–Operator partnerships, pipeline & economics</p> </div> <button id="toggle-form" class="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-accent/20">
+ New Deal
</button> </div>  <div id="new-deal-form" class="hidden mb-6 bg-card rounded-xl border border-border p-6"> <h2 class="font-semibold mb-5 text-base">New Deal</h2> <form method="POST"> <input type="hidden" name="_action" value="create"> <div class="grid grid-cols-2 gap-4 mb-4"> <div> <label class="block text-xs text-gray-500 mb-1">Buyer</label> <select name="buyer_id" required class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> <option value="">— Select buyer —</option> ${(buyers ?? []).map((b) => renderTemplate`<option${addAttribute(b.id, "value")}>${b.name}</option>`)} </select> </div> <div> <label class="block text-xs text-gray-500 mb-1">Operator</label> <select name="operator_id" required id="op-select" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> <option value="">— Select operator —</option> ${(operators ?? []).map((o) => renderTemplate`<option${addAttribute(o.id, "value")}>${o.name}</option>`)} </select> </div> </div> <div class="grid grid-cols-3 gap-4 mb-4"> <div> <label class="block text-xs text-gray-500 mb-1">Stage</label> <select name="pipeline_stage" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> <option value="new">New</option> <option value="negotiation">Negotiation</option> <option value="trial">Trial</option> <option value="active">Active</option> </select> </div> <div> <label class="block text-xs text-gray-500 mb-1">Deal Type (operator pays us)</label> <select name="deal_type" id="deal-type-select" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> <option value="CPA">CPA (per conversion)</option> <option value="RevShare">RevShare (% of revenue)</option> <option value="Spend">% of Spend (media spend)</option> </select> </div> <div> <label class="block text-xs text-gray-500 mb-1" id="op-value-label">CPA Value ($)</label> <input type="number" name="op_value" step="0.01" min="0" placeholder="0" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> </div> </div> <div class="grid grid-cols-2 gap-4 mb-4"> <div> <label class="block text-xs text-gray-500 mb-1">Planned Media Spend ($)</label> <input type="number" name="planned_spend" step="100" min="0" placeholder="10000" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Expected Conversions (FTDs)</label> <input type="number" name="expected_conversions" min="0" placeholder="200" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> </div> </div> <div class="grid grid-cols-3 gap-4 mb-4"> <div> <label class="block text-xs text-gray-500 mb-1">Avg Revenue/User (ARPU) <span class="text-gray-700">RevShare only</span></label> <input type="number" name="avg_revenue_per_user" step="0.01" min="0" placeholder="150" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Buyer Fee ($) <span class="text-gray-700">optional</span></label> <input type="number" name="buyer_fee" step="0.01" min="0" placeholder="0" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Side Costs ($) <span class="text-gray-700">accounts, tools…</span></label> <input type="number" name="side_costs" step="0.01" min="0" placeholder="0" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> </div> </div> <div class="mb-5"> <label class="block text-xs text-gray-500 mb-1">Notes</label> <input type="text" name="notes" placeholder="Any extra details…" class="w-full bg-card-2 border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div class="flex gap-3"> <button type="submit" class="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
Create Deal
</button> <button type="button" id="cancel-form" class="text-gray-500 hover:text-gray-300 text-sm px-4 py-2 rounded-lg border border-border transition-colors">
Cancel
</button> </div> </form> </div>  <div class="flex gap-1 mb-6 bg-card-2 p-1 rounded-lg w-fit border border-border"> ${stages.map((s) => renderTemplate`<a${addAttribute(`/deals${s.key !== "all" ? `?stage=${s.key}` : ""}`, "href")}${addAttribute(`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${stageFilter === s.key ? "bg-card text-white shadow" : "text-gray-500 hover:text-gray-300"}`, "class")}>${s.label}</a>`)} </div>  ${!deals || deals.length === 0 ? renderTemplate`<div class="bg-card rounded-xl border border-border p-16 text-center"> <p class="text-gray-500 mb-2">No deals yet.</p> <p class="text-gray-700 text-sm">Click "+ New Deal" to connect a buyer with an operator.</p> </div>` : renderTemplate`<div class="space-y-3"> ${deals.map((deal) => {
    const rev = calcRevenue(deal);
    const net = calcNet(deal);
    const hasActuals = deal.actual_spend != null || deal.actual_conversions != null;
    const stage = deal.pipeline_stage ?? "new";
    const dtype = deal.deal_type ?? "CPA";
    const opValue = dtype === "CPA" ? deal.cpa_payout : deal.revshare_pct;
    const opValueLabel = dtype === "CPA" ? `$${opValue}/conv` : `${opValue}%`;
    return renderTemplate`<div class="bg-card rounded-xl border border-border hover:border-accent/20 transition-colors"> <!-- Header row --> <div class="flex items-center gap-4 p-5"> <div class="flex-1 min-w-0"> <div class="flex items-center gap-2 flex-wrap"> <span class="font-semibold">${deal.buyer?.name ?? "\u2014"}</span> <span class="text-gray-600 text-xs">↔</span> <span class="font-semibold">${deal.operator?.name ?? "\u2014"}</span> <span${addAttribute(`text-xs px-2 py-0.5 rounded border font-medium ${stageBadge[stage] ?? stageBadge.new}`, "class")}> ${stage.charAt(0).toUpperCase() + stage.slice(1)} </span> <span class="text-xs px-2 py-0.5 rounded bg-card-2 border border-border text-gray-400"> ${dealTypeLabel[dtype] ?? dtype} · ${opValueLabel} </span> ${hasActuals && renderTemplate`<span class="text-xs text-gray-600">● actual</span>`} </div> <!-- Economics strip --> <div class="flex items-center gap-5 mt-2 text-sm"> <span class="text-gray-500">
Spend: <span class="text-gray-300 font-mono">${hasActuals && deal.actual_spend != null ? fmt(deal.actual_spend) : fmt(deal.planned_spend)}</span> </span> ${deal.buyer_fee > 0 && renderTemplate`<span class="text-gray-500">
Buyer fee: <span class="text-gray-300 font-mono">${fmt(deal.buyer_fee)}</span> </span>`} ${deal.side_costs > 0 && renderTemplate`<span class="text-gray-500">
Costs: <span class="text-gray-300 font-mono">${fmt(deal.side_costs)}</span> </span>`} ${rev != null && renderTemplate`<span class="text-gray-500">
Revenue: <span class="font-mono text-gray-300">${fmt(rev)}</span> </span>`} ${net != null && renderTemplate`<span${addAttribute(`font-semibold font-mono ${net >= 0 ? "text-success" : "text-danger"}`, "class")}>
Net: ${net >= 0 ? "+" : ""}${fmt(net)} </span>`} </div> </div> <!-- Stage change --> <form method="POST" class="flex items-center gap-1 shrink-0"> <input type="hidden" name="_action" value="update_stage"> <input type="hidden" name="deal_id"${addAttribute(deal.id, "value")}> <select name="stage" onchange="this.form.submit()" class="bg-card-2 border border-border rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:border-accent outline-none"> ${[
      ["new", "New"],
      ["negotiation", "Negotiation"],
      ["trial", "Trial"],
      ["active", "Active"],
      ["completed", "Completed"],
      ["no_deal", "No Deal"]
    ].map(([val, label]) => renderTemplate`<option${addAttribute(val, "value")}${addAttribute(val === stage, "selected")}>${label}</option>`)} </select> </form> <!-- Toggle expand --> <button class="expand-btn text-gray-600 hover:text-gray-300 text-lg transition-colors shrink-0"${addAttribute(deal.id, "data-id")}>
⌄
</button> </div> <!-- Expandable: update actuals + delete --> <div${addAttribute(`expand-${deal.id}`, "id")} class="hidden border-t border-border p-5"> <form method="POST" class="grid grid-cols-2 gap-4"> <input type="hidden" name="_action" value="update_actuals"> <input type="hidden" name="deal_id"${addAttribute(deal.id, "value")}> <div class="col-span-2"> <p class="text-xs text-gray-500 uppercase tracking-wide mb-3">Actual Results</p> </div> <div> <label class="block text-xs text-gray-500 mb-1">Actual Spend ($)</label> <input type="number" name="actual_spend" step="0.01"${addAttribute(deal.actual_spend ?? "", "value")} class="w-full bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Actual Conversions</label> <input type="number" name="actual_conversions"${addAttribute(deal.actual_conversions ?? "", "value")} class="w-full bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1"> ${dtype === "RevShare" ? "Operator Revenue ($)" : dtype === "Spend" ? "Total Spend Billed ($)" : "Actual Revenue ($)"} </label> <input type="number" name="actual_revenue" step="0.01"${addAttribute(deal.actual_revenue ?? "", "value")} class="w-full bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Notes</label> <input type="text" name="notes"${addAttribute(deal.notes ?? "", "value")} class="w-full bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Buyer Fee ($)</label> <input type="number" name="buyer_fee" step="0.01"${addAttribute(deal.buyer_fee ?? 0, "value")} class="w-full bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Side Costs ($) <span class="text-gray-700">accounts, tools…</span></label> <input type="number" name="side_costs" step="0.01"${addAttribute(deal.side_costs ?? 0, "value")} class="w-full bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-accent outline-none"> </div> <div class="col-span-2 flex items-center justify-between"> <button type="submit" class="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
Save
</button> <form method="POST" style="display:inline"> <input type="hidden" name="_action" value="delete"> <input type="hidden" name="deal_id"${addAttribute(deal.id, "value")}> <button type="submit" onclick="return confirm('Delete this deal?')" class="text-danger hover:bg-danger/10 text-sm px-3 py-1.5 rounded-lg border border-danger/20 transition-colors">
Delete Deal
</button> </form> </div> </form> </div> </div>`;
  })} </div>`}` })} ${renderScript($$result, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/deals/index.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/deals/index.astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/deals/index.astro";
const $$url = "/deals";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
