/* empty css                                */
import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute, l as renderScript } from '../chunks/astro/server_zKUY4SJo.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_Csh5F8eE.mjs';
import { supabase } from '../chunks/supabase_CUAAmmKv.mjs';
export { renderers } from '../renderers.mjs';

function round2(n) {
  return Math.round(n * 100) / 100;
}
function calculateEconomics(input) {
  const { planned_spend, expected_conversions, avg_revenue_per_user, cpa_payout, revshare_pct } = input;
  const effective_cpa = expected_conversions > 0 ? planned_spend / expected_conversions : 0;
  const ltv = avg_revenue_per_user;
  const revenue_per_conv = cpa_payout + avg_revenue_per_user * revshare_pct / 100;
  const gross_revenue = expected_conversions * revenue_per_conv;
  const profit = gross_revenue - planned_spend;
  const roi = planned_spend > 0 ? profit / planned_spend * 100 : 0;
  const breakeven_conversions = revenue_per_conv > 0 ? Math.ceil(planned_spend / revenue_per_conv) : 0;
  return {
    effective_cpa: round2(effective_cpa),
    ltv: round2(ltv),
    gross_revenue: round2(gross_revenue),
    roi: round2(roi),
    profit: round2(profit),
    breakeven_conversions
  };
}

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const url = Astro2.url;
  const matchId = url.searchParams.get("match_id");
  const buyerId = url.searchParams.get("buyer_id");
  const operatorId = url.searchParams.get("operator_id");
  let prefill = { cpa_payout: 0, revshare_pct: 0, buyerName: "", operatorName: "" };
  if (operatorId) {
    const { data: op } = await supabase.from("operators").select("*").eq("id", operatorId).single();
    if (op) {
      prefill.cpa_payout = op.cpa_value || 0;
      prefill.revshare_pct = op.revshare_pct || 0;
      prefill.operatorName = op.name;
    }
  }
  if (buyerId) {
    const { data: b } = await supabase.from("buyers").select("name").eq("id", buyerId).single();
    if (b) prefill.buyerName = b.name;
  }
  let savedMessage = "";
  if (Astro2.request.method === "POST") {
    const form = await Astro2.request.formData();
    const inputs = {
      planned_spend: Number(form.get("planned_spend")) || 0,
      expected_conversions: Number(form.get("expected_conversions")) || 0,
      avg_revenue_per_user: Number(form.get("avg_revenue_per_user")) || 0,
      cpa_payout: Number(form.get("cpa_payout")) || 0,
      revshare_pct: Number(form.get("revshare_pct")) || 0
    };
    const results = calculateEconomics(inputs);
    const { error } = await supabase.from("projects").insert({
      name: form.get("project_name") || "Untitled Project",
      match_id: matchId || null,
      buyer_id: buyerId || null,
      operator_id: operatorId || null,
      planned_spend: inputs.planned_spend,
      expected_conversions: inputs.expected_conversions,
      avg_revenue_per_user: inputs.avg_revenue_per_user,
      cpa_payout: inputs.cpa_payout,
      revshare_pct: inputs.revshare_pct,
      calc_cpa: results.effective_cpa,
      calc_ltv: results.ltv,
      calc_roi: results.roi,
      calc_breakeven: results.breakeven_conversions
    });
    if (!error) savedMessage = "Project saved!";
  }
  const inputCls = "w-full bg-card-2 border border-border rounded-lg px-4 py-2 text-gray-100 focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder-gray-600 transition-colors";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Unit Economics Calculator" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-8"> <h1 class="text-2xl font-bold">Unit Economics Calculator</h1> <p class="text-gray-600 text-sm mt-1">
Full project economics before launch
${prefill.buyerName && prefill.operatorName && renderTemplate`<span class="text-gray-500"> — ${prefill.buyerName} ↔ ${prefill.operatorName}</span>`} </p> </div> ${savedMessage && renderTemplate`<div class="bg-success/10 text-success border border-success/25 rounded-lg px-4 py-3 mb-6 text-sm"> ${savedMessage} </div>`}<div class="grid grid-cols-2 gap-6"> <div class="bg-card rounded-xl border border-border p-6"> <h2 class="text-base font-semibold mb-5 flex items-center gap-2"> <span class="w-1.5 h-4 bg-accent rounded-full"></span>
Inputs
</h2> <form method="POST" id="calcForm" class="space-y-4"> <div> <label class="block text-sm text-gray-500 mb-1">Project Name</label> <input type="text" name="project_name" placeholder="e.g. DE Casino Push Campaign"${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-500 mb-1">Planned Spend (USD)</label> <input type="number" name="planned_spend" id="planned_spend" step="0.01" min="0" value="10000"${addAttribute(`calc-input ${inputCls}`, "class")}> </div> <div> <label class="block text-sm text-gray-500 mb-1">Expected Conversions (FTDs)</label> <input type="number" name="expected_conversions" id="expected_conversions" min="0" value="200"${addAttribute(`calc-input ${inputCls}`, "class")}> </div> <div> <label class="block text-sm text-gray-500 mb-1">Avg Revenue per User (ARPU / LTV)</label> <input type="number" name="avg_revenue_per_user" id="avg_revenue_per_user" step="0.01" min="0" value="150"${addAttribute(`calc-input ${inputCls}`, "class")}> </div> <div> <label class="block text-sm text-gray-500 mb-1">CPA Payout (USD per conversion)</label> <input type="number" name="cpa_payout" id="cpa_payout" step="0.01" min="0"${addAttribute(prefill.cpa_payout || 50, "value")}${addAttribute(`calc-input ${inputCls}`, "class")}> </div> <div> <label class="block text-sm text-gray-500 mb-1">RevShare %</label> <input type="number" name="revshare_pct" id="revshare_pct" step="0.01" min="0" max="100"${addAttribute(prefill.revshare_pct || 0, "value")}${addAttribute(`calc-input ${inputCls}`, "class")}> </div> <button type="submit" class="bg-accent hover:bg-accent-dark text-white font-medium px-6 py-2.5 rounded-lg transition-colors w-full shadow-lg shadow-accent/20 mt-2">
Save as Project
</button> </form> </div> <div> <div class="bg-card rounded-xl border border-border p-6 sticky top-8"> <h2 class="text-base font-semibold mb-5 flex items-center gap-2"> <span class="w-1.5 h-4 bg-accent rounded-full"></span>
Results
</h2> <div class="space-y-3"> <div class="flex justify-between items-center p-3 bg-card-2 rounded-lg border border-border"> <span class="text-sm text-gray-500">Effective CPA</span> <span class="font-mono font-semibold" id="r_cpa">$0.00</span> </div> <div class="flex justify-between items-center p-3 bg-card-2 rounded-lg border border-border"> <span class="text-sm text-gray-500">LTV (ARPU)</span> <span class="font-mono font-semibold" id="r_ltv">$0.00</span> </div> <div class="flex justify-between items-center p-3 bg-card-2 rounded-lg border border-border"> <span class="text-sm text-gray-500">Gross Revenue</span> <span class="font-mono font-semibold" id="r_revenue">$0.00</span> </div> <div class="flex justify-between items-center p-3 bg-card-2 rounded-lg border border-border"> <span class="text-sm text-gray-500">Profit</span> <span class="font-mono font-semibold" id="r_profit">$0.00</span> </div> <div class="flex justify-between items-center p-4 rounded-xl border-2 border-border" id="roi_box"> <span class="text-sm font-medium text-gray-400">ROI</span> <span class="font-mono text-2xl font-black" id="r_roi">0.00%</span> </div> <div class="flex justify-between items-center p-3 bg-card-2 rounded-lg border border-border"> <span class="text-sm text-gray-500">Break-even Conversions</span> <span class="font-mono font-semibold" id="r_breakeven">0</span> </div> <div class="pt-2"> <div class="flex justify-between text-xs text-gray-600 mb-1.5"> <span>Break-even progress</span> <span id="r_progress_label">0%</span> </div> <div class="w-full bg-card-2 rounded-full h-2 border border-border overflow-hidden"> <div class="h-2 rounded-full transition-all duration-300" id="r_bar" style="width: 0%; background-color: #e11d48;"></div> </div> </div> </div> </div> </div> </div> ${renderScript($$result2, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/calculator/index.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/calculator/index.astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/calculator/index.astro";
const $$url = "/calculator";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
