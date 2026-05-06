/* empty css                                   */
import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../../chunks/astro/server_zKUY4SJo.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../chunks/Layout_Csh5F8eE.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$Add = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Add;
  const trafficOptions = ["Meta Ads", "InApp", "DSP", "Google Ads", "TikTok Ads"];
  if (Astro2.request.method === "POST") {
    const { supabase } = await import('../../chunks/supabase_CUAAmmKv.mjs');
    const form = await Astro2.request.formData();
    const geoRaw = form.get("target_geos") || "";
    const geo = geoRaw.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean);
    const traffic = trafficOptions.filter((t) => form.get(`traffic_${t}`));
    const ratingRaw = form.get("rating");
    const dealType = form.get("deal_type");
    const { error } = await supabase.from("operators").insert({
      name: form.get("name"),
      brand: form.get("brand") || null,
      contact: form.get("contact") || null,
      payment_method: form.get("payment_method") || null,
      target_geos: geo,
      budget_min: Number(form.get("budget_min")) || 0,
      budget_max: Number(form.get("budget_max")) || 0,
      preferred_traffic: traffic,
      deal_type: dealType || "CPA",
      cpa_value: Number(form.get("cpa_value")) || null,
      revshare_pct: Number(form.get("revshare_pct")) || null,
      spend_pct: Number(form.get("spend_pct")) || null,
      rating: ratingRaw ? Number(ratingRaw) : null,
      notes: form.get("notes") || null
    });
    if (!error) return Astro2.redirect("/operators");
  }
  const inputCls = "w-full bg-card-2 border border-border rounded-lg px-4 py-2 text-gray-100 focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder-gray-600 transition-colors";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Add Operator" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-8"> <a href="/operators" class="text-gray-600 hover:text-gray-300 text-sm transition-colors">&larr; Back to Operators</a> <h1 class="text-2xl font-bold mt-2">Add Operator</h1> </div> <form method="POST" class="bg-card rounded-xl border border-border p-6 max-w-2xl space-y-5"> <!-- Name + Brand --> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Name *</label> <input type="text" name="name" required${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Brand</label> <input type="text" name="brand"${addAttribute(inputCls, "class")}> </div> </div> <!-- Contact + Payment Method --> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Contact <span class="text-gray-600">(TG / WhatsApp)</span></label> <input type="text" name="contact" placeholder="@username or +380…"${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Payment Method</label> <select name="payment_method"${addAttribute(inputCls, "class")}> <option value="">— Select —</option> <option value="Bank Transfer">Bank Transfer</option> <option value="Crypto">Crypto</option> <option value="Bank Transfer + Crypto">Bank Transfer + Crypto</option> </select> </div> </div> <!-- Target GEOs --> <div> <label class="block text-sm text-gray-400 mb-1">Target GEOs <span class="text-gray-600">(comma-separated)</span></label> <input type="text" name="target_geos" placeholder="DE, BR, IN, US"${addAttribute(inputCls, "class")}> </div> <!-- Budget --> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Budget Min (USD/mo)</label> <input type="number" name="budget_min" step="100" min="0" placeholder="10000"${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Budget Max (USD/mo)</label> <input type="number" name="budget_max" step="100" min="0" placeholder="100000"${addAttribute(inputCls, "class")}> </div> </div> <!-- Traffic Types --> <div> <label class="block text-sm text-gray-400 mb-2">Preferred Traffic Types</label> <div class="flex flex-wrap gap-3"> ${trafficOptions.map((t) => renderTemplate`<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer group"> <input type="checkbox"${addAttribute(`traffic_${t}`, "name")} class="rounded bg-card-2 border-border text-accent focus:ring-accent focus:ring-offset-0"> <span class="group-hover:text-accent transition-colors">${t}</span> </label>`)} </div> </div> <!-- Deal Type + Dynamic Value --> <div> <label class="block text-sm text-gray-400 mb-2">Deal Terms (operator pays us)</label> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-xs text-gray-500 mb-1">Deal Type</label> <select name="deal_type" id="deal_type"${addAttribute(inputCls, "class")}> <option value="CPA">CPA</option> <option value="RevShare">RevShare</option> <option value="Spend">% of Spend</option> <option value="Hybrid">Hybrid (CPA + RevShare)</option> </select> </div> <div id="cpa-group"> <label class="block text-xs text-gray-500 mb-1" id="value-label">CPA Value ($)</label> <input type="number" name="cpa_value" id="cpa-input" step="0.01" min="0" placeholder="50"${addAttribute(inputCls, "class")}> </div> <div id="rev-group" class="hidden"> <label class="block text-xs text-gray-500 mb-1">RevShare %</label> <input type="number" name="revshare_pct" step="0.01" min="0" max="100" placeholder="30"${addAttribute(inputCls, "class")}> </div> <div id="spend-group" class="hidden"> <label class="block text-xs text-gray-500 mb-1">% of Spend</label> <input type="number" name="spend_pct" step="0.01" min="0" max="100" placeholder="15"${addAttribute(inputCls, "class")}> </div> </div> </div> <!-- Rating --> <div> <label class="block text-sm text-gray-400 mb-1">Rating <span class="text-gray-600">(1–10)</span></label> <input type="number" name="rating" id="rating_input" min="1" max="10" placeholder="e.g. 8"${addAttribute(inputCls, "class")}> <div class="flex gap-0.5 mt-2"> ${Array.from({ length: 10 }, (_, i) => renderTemplate`<span class="w-2 h-2 rounded-full bg-gray-700 rating-dot transition-colors"${addAttribute(i + 1, "data-index")}></span>`)} </div> </div> <!-- Notes --> <div> <label class="block text-sm text-gray-400 mb-1">Notes</label> <textarea name="notes" rows="3"${addAttribute(`${inputCls} resize-none`, "class")}></textarea> </div> <button type="submit" class="bg-accent hover:bg-accent-dark text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-accent/20">
Create Operator
</button> </form> ` })} ${renderScript($$result, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/operators/add.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/operators/add.astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/operators/add.astro";
const $$url = "/operators/add";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Add,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
