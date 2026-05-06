/* empty css                                   */
import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../../chunks/astro/server_zKUY4SJo.mjs';
import 'piccolore';
import { $ as $$Layout } from '../../chunks/Layout_Csh5F8eE.mjs';
import { supabase } from '../../chunks/supabase_CUAAmmKv.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  const trafficOptions = ["Meta Ads", "InApp", "DSP", "Google Ads", "TikTok Ads"];
  if (Astro2.request.method === "POST") {
    const form = await Astro2.request.formData();
    const action = form.get("_action");
    if (action === "delete") {
      await supabase.from("operators").delete().eq("id", id);
      return Astro2.redirect("/operators");
    }
    const geoRaw = form.get("target_geos") || "";
    const geo = geoRaw.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean);
    const traffic = trafficOptions.filter((t) => form.get(`traffic_${t}`));
    const ratingRaw = form.get("rating");
    const dealType = form.get("deal_type");
    await supabase.from("operators").update({
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
    }).eq("id", id);
    return Astro2.redirect("/operators");
  }
  const { data: operator } = await supabase.from("operators").select("*").eq("id", id).single();
  if (!operator) return Astro2.redirect("/operators");
  const op = operator;
  const inputCls = "w-full bg-card-2 border border-border rounded-lg px-4 py-2 text-gray-100 focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder-gray-600 transition-colors";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": `Edit ${op.name}` }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-8"> <a href="/operators" class="text-gray-600 hover:text-gray-300 text-sm transition-colors">&larr; Back to Operators</a> <h1 class="text-2xl font-bold mt-2">${op.name}</h1> ${op.brand && renderTemplate`<p class="text-gray-500 text-sm">${op.brand}</p>`} </div> <form method="POST" class="bg-card rounded-xl border border-border p-6 max-w-2xl space-y-5"> <!-- Name + Brand --> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Name *</label> <input type="text" name="name" required${addAttribute(op.name, "value")}${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Brand</label> <input type="text" name="brand"${addAttribute(op.brand || "", "value")}${addAttribute(inputCls, "class")}> </div> </div> <!-- Contact + Payment Method --> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Contact <span class="text-gray-600">(TG / WhatsApp)</span></label> <input type="text" name="contact"${addAttribute(op.contact || "", "value")} placeholder="@username or +380…"${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Payment Method</label> <select name="payment_method"${addAttribute(inputCls, "class")}> <option value="">— Select —</option> <option value="Bank Transfer"${addAttribute(op.payment_method === "Bank Transfer", "selected")}>Bank Transfer</option> <option value="Crypto"${addAttribute(op.payment_method === "Crypto", "selected")}>Crypto</option> <option value="Bank Transfer + Crypto"${addAttribute(op.payment_method === "Bank Transfer + Crypto", "selected")}>Bank Transfer + Crypto</option> </select> </div> </div> <!-- Target GEOs --> <div> <label class="block text-sm text-gray-400 mb-1">Target GEOs <span class="text-gray-600">(comma-separated)</span></label> <input type="text" name="target_geos"${addAttribute((op.target_geos ?? []).join(", "), "value")}${addAttribute(inputCls, "class")}> </div> <!-- Budget --> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Budget Min (USD/mo)</label> <input type="number" name="budget_min" step="100" min="0"${addAttribute(op.budget_min, "value")}${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Budget Max (USD/mo)</label> <input type="number" name="budget_max" step="100" min="0"${addAttribute(op.budget_max, "value")}${addAttribute(inputCls, "class")}> </div> </div> <!-- Traffic Types --> <div> <label class="block text-sm text-gray-400 mb-2">Preferred Traffic Types</label> <div class="flex flex-wrap gap-3"> ${trafficOptions.map((t) => renderTemplate`<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer group"> <input type="checkbox"${addAttribute(`traffic_${t}`, "name")}${addAttribute((op.preferred_traffic ?? []).includes(t), "checked")} class="rounded bg-card-2 border-border text-accent focus:ring-accent focus:ring-offset-0"> <span class="group-hover:text-accent transition-colors">${t}</span> </label>`)} </div> </div> <!-- Deal Type + Dynamic Value --> <div> <label class="block text-sm text-gray-400 mb-2">Deal Terms (operator pays us)</label> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-xs text-gray-500 mb-1">Deal Type</label> <select name="deal_type" id="deal_type"${addAttribute(inputCls, "class")}> <option value="CPA"${addAttribute(op.deal_type === "CPA", "selected")}>CPA</option> <option value="RevShare"${addAttribute(op.deal_type === "RevShare", "selected")}>RevShare</option> <option value="Spend"${addAttribute(op.deal_type === "Spend", "selected")}>% of Spend</option> <option value="Hybrid"${addAttribute(op.deal_type === "Hybrid", "selected")}>Hybrid (CPA + RevShare)</option> </select> </div> <div id="cpa-group"${addAttribute(op.deal_type === "RevShare" || op.deal_type === "Spend" ? "hidden" : "", "class")}> <label class="block text-xs text-gray-500 mb-1">CPA Value ($)</label> <input type="number" name="cpa_value" step="0.01" min="0"${addAttribute(op.cpa_value || "", "value")} placeholder="50"${addAttribute(inputCls, "class")}> </div> <div id="rev-group"${addAttribute(op.deal_type === "CPA" || op.deal_type === "Spend" ? "hidden" : "", "class")}> <label class="block text-xs text-gray-500 mb-1">RevShare %</label> <input type="number" name="revshare_pct" step="0.01" min="0" max="100"${addAttribute(op.revshare_pct || "", "value")} placeholder="30"${addAttribute(inputCls, "class")}> </div> <div id="spend-group"${addAttribute(op.deal_type !== "Spend" ? "hidden" : "", "class")}> <label class="block text-xs text-gray-500 mb-1">% of Spend</label> <input type="number" name="spend_pct" step="0.01" min="0" max="100"${addAttribute(op.spend_pct || "", "value")} placeholder="15"${addAttribute(inputCls, "class")}> </div> </div> </div> <!-- Rating --> <div> <label class="block text-sm text-gray-400 mb-1">Rating <span class="text-gray-600">(1–10)</span></label> <input type="number" name="rating" id="rating_input" min="1" max="10"${addAttribute(op.rating ?? "", "value")} placeholder="e.g. 8"${addAttribute(inputCls, "class")}> <div class="flex gap-0.5 mt-2"> ${Array.from({ length: 10 }, (_, i) => renderTemplate`<span${addAttribute(`w-2 h-2 rounded-full rating-dot transition-colors ${op.rating != null && i < op.rating ? op.rating >= 8 ? "bg-success" : op.rating >= 5 ? "bg-warning" : "bg-danger" : "bg-gray-700"}`, "class")}${addAttribute(i + 1, "data-index")}></span>`)} </div> </div> <!-- Notes --> <div> <label class="block text-sm text-gray-400 mb-1">Notes</label> <textarea name="notes" rows="3"${addAttribute(`${inputCls} resize-none`, "class")}>${op.notes || ""}</textarea> </div> <div class="flex items-center justify-between pt-2"> <button type="submit" class="bg-accent hover:bg-accent-dark text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-accent/20">
Save Changes
</button> <button type="submit" name="_action" value="delete" onclick="return confirm('Delete this operator?')" class="bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 rounded-lg px-4 py-2.5 text-sm transition-colors">
Delete Operator
</button> </div> </form> ` })} ${renderScript($$result, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/operators/[id].astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/operators/[id].astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/operators/[id].astro";
const $$url = "/operators/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
