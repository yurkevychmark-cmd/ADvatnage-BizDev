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
  const coopOptions = ["% Spend", "% Spend + Rate", "CPA", "% Profit"];
  if (Astro2.request.method === "POST") {
    const { supabase } = await import('../../chunks/supabase_CUAAmmKv.mjs');
    const form = await Astro2.request.formData();
    const geoRaw = form.get("geo_expertise") || "";
    const geo = geoRaw.split(",").map((g) => g.trim().toUpperCase()).filter(Boolean);
    const traffic = trafficOptions.filter((t) => form.get(`traffic_${t}`));
    const ratingRaw = form.get("rating");
    const { error } = await supabase.from("buyers").insert({
      name: form.get("name"),
      type: form.get("buyer_type") || "EXTERNAL",
      contact_name: form.get("contact_name") || null,
      contact_email: form.get("contact_email") || null,
      contact_telegram: form.get("contact_telegram") || null,
      geo_expertise: geo,
      traffic_types: traffic,
      monthly_budget_capacity: Number(form.get("monthly_budget_capacity")) || 0,
      cooperation_model: form.get("cooperation_model") || null,
      rating: ratingRaw ? Number(ratingRaw) : null,
      notes: form.get("notes") || null
    });
    if (!error) return Astro2.redirect("/buyers");
  }
  const inputCls = "w-full bg-card-2 border border-border rounded-lg px-4 py-2 text-gray-100 focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder-gray-600 transition-colors";
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Add Buyer" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mb-8"> <a href="/buyers" class="text-gray-600 hover:text-gray-300 text-sm transition-colors">&larr; Back to Buyers</a> <h1 class="text-2xl font-bold mt-2">Add Buyer</h1> </div> <form method="POST" class="bg-card rounded-xl border border-border p-6 max-w-2xl space-y-5"> <!-- Name + Buyer Type --> <div class="grid grid-cols-2 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Name *</label> <input type="text" name="name" required${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-2">Buyer Type</label> <div class="flex gap-2"> ${["EXTERNAL", "INTERNAL"].map((t) => renderTemplate`<label class="flex items-center gap-2 flex-1 bg-card-2 border border-border rounded-lg px-3 py-2 cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent/10 transition-colors"> <input type="radio" name="buyer_type"${addAttribute(t, "value")} class="accent-rose-600"${addAttribute(t === "EXTERNAL", "checked")}> <span class="text-sm text-gray-300">${t === "EXTERNAL" ? "External" : "Internal"}</span> </label>`)} </div> </div> </div> <!-- Contacts --> <div class="grid grid-cols-3 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Contact Name</label> <input type="text" name="contact_name"${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Email</label> <input type="email" name="contact_email"${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Telegram</label> <input type="text" name="contact_telegram" placeholder="@username"${addAttribute(inputCls, "class")}> </div> </div> <!-- GEO --> <div> <label class="block text-sm text-gray-400 mb-1">GEO Expertise <span class="text-gray-600">(comma-separated)</span></label> <input type="text" name="geo_expertise" placeholder="DE, BR, IN, US"${addAttribute(inputCls, "class")}> </div> <!-- Traffic Types --> <div> <label class="block text-sm text-gray-400 mb-2">Traffic Types</label> <div class="flex flex-wrap gap-3"> ${trafficOptions.map((t) => renderTemplate`<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer group"> <input type="checkbox"${addAttribute(`traffic_${t}`, "name")} class="rounded bg-card-2 border-border text-accent focus:ring-accent focus:ring-offset-0"> <span class="group-hover:text-accent transition-colors">${t}</span> </label>`)} </div> </div> <!-- Cooperation Model + Budget + Rating --> <div class="grid grid-cols-3 gap-4"> <div> <label class="block text-sm text-gray-400 mb-1">Cooperation Model</label> <select name="cooperation_model"${addAttribute(inputCls, "class")}> <option value="">— Select —</option> ${coopOptions.map((o) => renderTemplate`<option${addAttribute(o, "value")}>${o}</option>`)} </select> </div> <div> <label class="block text-sm text-gray-400 mb-1">Monthly Budget (USD)</label> <input type="number" name="monthly_budget_capacity" step="0.01" min="0" placeholder="50000"${addAttribute(inputCls, "class")}> </div> <div> <label class="block text-sm text-gray-400 mb-1">Rating <span class="text-gray-600">(1–10)</span></label> <input type="number" name="rating" id="rating_input" min="1" max="10" placeholder="e.g. 8"${addAttribute(inputCls, "class")}> <div class="flex gap-0.5 mt-2" id="rating_dots"> ${Array.from({ length: 10 }, (_, i) => renderTemplate`<span class="w-2 h-2 rounded-full bg-gray-700 rating-dot transition-colors"${addAttribute(i + 1, "data-index")}></span>`)} </div> </div> </div> <!-- Notes --> <div> <label class="block text-sm text-gray-400 mb-1">Notes</label> <textarea name="notes" rows="3"${addAttribute(`${inputCls} resize-none`, "class")}></textarea> </div> <button type="submit" class="bg-accent hover:bg-accent-dark text-white font-medium px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-accent/20">
Create Buyer
</button> </form> ` })} ${renderScript($$result, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/buyers/add.astro?astro&type=script&index=0&lang.ts")}`;
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/buyers/add.astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/buyers/add.astro";
const $$url = "/buyers/add";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Add,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
