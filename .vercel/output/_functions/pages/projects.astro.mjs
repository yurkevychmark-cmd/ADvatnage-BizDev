/* empty css                                */
import { e as createComponent, r as renderTemplate, n as defineScriptVars, k as renderComponent, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../chunks/astro/server_zKUY4SJo.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_Csh5F8eE.mjs';
import { supabase } from '../chunks/supabase_CUAAmmKv.mjs';
export { renderers } from '../renderers.mjs';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  if (Astro2.request.method === "POST") {
    const form = await Astro2.request.formData();
    const action = form.get("_action");
    if (action === "update_actuals") {
      const id = form.get("project_id");
      await supabase.from("projects").update({
        actual_spend: Number(form.get("actual_spend")) || null,
        actual_conversions: Number(form.get("actual_conversions")) || null,
        actual_revenue: Number(form.get("actual_revenue")) || null,
        status: form.get("status")
      }).eq("id", id);
    }
    if (action === "delete") {
      await supabase.from("projects").delete().eq("id", form.get("project_id"));
    }
    return Astro2.redirect("/projects");
  }
  const { data: projects } = await supabase.from("projects").select("*, buyer:buyers(name), operator:operators(name)").order("created_at", { ascending: false });
  const projectsJson = JSON.stringify(projects ?? []);
  return renderTemplate(_a || (_a = __template(["", " <script>(function(){", `
  const projects = JSON.parse(projectsJson);
  document.getElementById('export-csv')?.addEventListener('click', () => {
    const headers = ['Name','Buyer','Operator','Status','Planned Spend','Expected Conv.','Calc ROI %','Actual Spend','Actual Conv.','Actual Revenue'];
    const rows = projects.map(p => [
      p.name,
      p.buyer?.name ?? '',
      p.operator?.name ?? '',
      p.status,
      p.planned_spend,
      p.expected_conversions,
      p.calc_roi ?? '',
      p.actual_spend ?? '',
      p.actual_conversions ?? '',
      p.actual_revenue ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => \`"\${String(v).replace(/"/g, '""')}"\`).join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'projects.csv';
    a.click();
  });
})();<\/script>`], ["", " <script>(function(){", `
  const projects = JSON.parse(projectsJson);
  document.getElementById('export-csv')?.addEventListener('click', () => {
    const headers = ['Name','Buyer','Operator','Status','Planned Spend','Expected Conv.','Calc ROI %','Actual Spend','Actual Conv.','Actual Revenue'];
    const rows = projects.map(p => [
      p.name,
      p.buyer?.name ?? '',
      p.operator?.name ?? '',
      p.status,
      p.planned_spend,
      p.expected_conversions,
      p.calc_roi ?? '',
      p.actual_spend ?? '',
      p.actual_conversions ?? '',
      p.actual_revenue ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => \\\`"\\\${String(v).replace(/"/g, '""')}"\\\`).join(',')).join('\\\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'projects.csv';
    a.click();
  });
})();<\/script>`])), renderComponent($$result, "Layout", $$Layout, { "title": "Projects" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex items-center justify-between mb-8"> <div> <h1 class="text-2xl font-bold">Projects</h1> <p class="text-gray-500 text-sm mt-1">Campaign performance — planned vs actual</p> </div> <div class="flex items-center gap-3"> <button id="export-csv" class="text-sm text-gray-400 hover:text-gray-200 border border-border px-4 py-2 rounded-lg bg-card-2 transition-colors">
↓ Export CSV
</button> <a href="/calculator" class="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-lg shadow-accent/20">
+ New Project
</a> </div> </div> ${!projects || projects.length === 0 ? renderTemplate`<div class="bg-card rounded-xl border border-border p-12 text-center"> <p class="text-gray-500 mb-2">No projects yet.</p> <a href="/calculator" class="text-accent hover:underline text-sm">Create one in the Calculator</a> </div>` : renderTemplate`<div class="space-y-4"> ${projects.map((p) => {
    const actualRoi = p.actual_revenue != null && p.actual_spend != null && p.actual_spend > 0 ? ((p.actual_revenue - p.actual_spend) / p.actual_spend * 100).toFixed(1) : null;
    return renderTemplate`<div class="bg-card rounded-xl border border-border p-6 hover:border-accent/25 transition-colors"> <div class="flex items-start justify-between mb-4"> <div> <h3 class="font-semibold text-lg">${p.name}</h3> ${(p.buyer || p.operator) && renderTemplate`<p class="text-gray-500 text-sm mt-0.5"> ${p.buyer?.name} ${p.buyer && p.operator ? "\u2194" : ""} ${p.operator?.name} </p>`} </div> <div class="flex items-center gap-3"> <select${addAttribute(`form_${p.id}`, "form")} name="status" class="bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:border-accent outline-none"> ${["draft", "active", "completed", "cancelled"].map((s) => renderTemplate`<option${addAttribute(s, "value")}${addAttribute(p.status === s, "selected")}>${s}</option>`)} </select> </div> </div> <div class="grid grid-cols-3 gap-4 mb-5"> <!-- Planned --> <div class="bg-card-2 rounded-lg border border-border p-4"> <p class="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1"> <span class="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Planned
</p> <div class="space-y-1.5 text-sm"> <div class="flex justify-between"> <span class="text-gray-500">Spend</span> <span class="font-mono">$${Number(p.planned_spend).toLocaleString()}</span> </div> <div class="flex justify-between"> <span class="text-gray-500">Conversions</span> <span class="font-mono">${p.expected_conversions}</span> </div> <div class="flex justify-between"> <span class="text-gray-500">ROI</span> <span${addAttribute(`font-mono font-semibold ${(p.calc_roi ?? 0) >= 0 ? "text-success" : "text-danger"}`, "class")}> ${p.calc_roi != null ? `${p.calc_roi}%` : "\u2014"} </span> </div> </div> </div> <!-- Actual --> <div${addAttribute(`rounded-lg border p-4 ${p.actual_spend != null ? "bg-card-2 border-success/20" : "bg-card-2 border-border border-dashed"}`, "class")}> <p class="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1"> <span${addAttribute(`w-1.5 h-1.5 rounded-full ${p.actual_spend != null ? "bg-success" : "bg-gray-700"}`, "class")}></span> Actual
</p> <div class="space-y-1.5 text-sm"> <div class="flex justify-between"> <span class="text-gray-500">Spend</span> <span class="font-mono">${p.actual_spend != null ? `$${Number(p.actual_spend).toLocaleString()}` : "\u2014"}</span> </div> <div class="flex justify-between"> <span class="text-gray-500">Conversions</span> <span class="font-mono">${p.actual_conversions ?? "\u2014"}</span> </div> <div class="flex justify-between"> <span class="text-gray-500">ROI</span> <span${addAttribute(`font-mono font-semibold ${actualRoi != null ? Number(actualRoi) >= 0 ? "text-success" : "text-danger" : "text-gray-600"}`, "class")}> ${actualRoi != null ? `${actualRoi}%` : "\u2014"} </span> </div> </div> </div> <!-- Delta --> <div class="bg-card-2 rounded-lg border border-border p-4"> <p class="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1"> <span class="w-1.5 h-1.5 rounded-full bg-accent"></span> Delta
</p> <div class="space-y-1.5 text-sm"> <div class="flex justify-between"> <span class="text-gray-500">Spend</span> <span${addAttribute(`font-mono ${p.actual_spend != null ? p.actual_spend > p.planned_spend ? "text-danger" : "text-success" : "text-gray-600"}`, "class")}> ${p.actual_spend != null ? `${p.actual_spend > p.planned_spend ? "+" : ""}$${Math.abs(p.actual_spend - p.planned_spend).toLocaleString()}` : "\u2014"} </span> </div> <div class="flex justify-between"> <span class="text-gray-500">Conv.</span> <span${addAttribute(`font-mono ${p.actual_conversions != null ? p.actual_conversions >= p.expected_conversions ? "text-success" : "text-danger" : "text-gray-600"}`, "class")}> ${p.actual_conversions != null ? `${p.actual_conversions >= p.expected_conversions ? "+" : ""}${p.actual_conversions - p.expected_conversions}` : "\u2014"} </span> </div> <div class="flex justify-between"> <span class="text-gray-500">ROI Δ</span> <span${addAttribute(`font-mono font-semibold ${actualRoi != null && p.calc_roi != null ? Number(actualRoi) >= p.calc_roi ? "text-success" : "text-danger" : "text-gray-600"}`, "class")}> ${actualRoi != null && p.calc_roi != null ? `${(Number(actualRoi) - p.calc_roi).toFixed(1)}pp` : "\u2014"} </span> </div> </div> </div> </div> <!-- Update actuals form --> <form${addAttribute(`form_${p.id}`, "id")} method="POST" class="border-t border-border pt-4 flex gap-3 items-end flex-wrap"> <input type="hidden" name="_action" value="update_actuals"> <input type="hidden" name="project_id"${addAttribute(p.id, "value")}> <div> <label class="block text-xs text-gray-500 mb-1">Actual Spend</label> <input type="number" name="actual_spend" step="0.01"${addAttribute(p.actual_spend ?? "", "value")} placeholder="0" class="w-32 bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Actual Conversions</label> <input type="number" name="actual_conversions"${addAttribute(p.actual_conversions ?? "", "value")} placeholder="0" class="w-32 bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-accent outline-none"> </div> <div> <label class="block text-xs text-gray-500 mb-1">Actual Revenue</label> <input type="number" name="actual_revenue" step="0.01"${addAttribute(p.actual_revenue ?? "", "value")} placeholder="0" class="w-32 bg-card-2 border border-border rounded-lg px-3 py-1.5 text-sm text-gray-100 focus:border-accent outline-none"> </div> <button type="submit" class="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors shadow-sm shadow-accent/20">
Save Actuals
</button> <button type="submit"${addAttribute(`del_${p.id}`, "form")} onclick="return confirm('Delete project?')" class="text-danger bg-danger/10 hover:bg-danger/20 border border-danger/20 text-sm px-3 py-1.5 rounded-lg transition-colors ml-auto">
Delete
</button> </form> <form${addAttribute(`del_${p.id}`, "id")} method="POST"> <input type="hidden" name="_action" value="delete"> <input type="hidden" name="project_id"${addAttribute(p.id, "value")}> </form> </div>`;
  })} </div>`}` }), defineScriptVars({ projectsJson }));
}, "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/projects/index.astro", void 0);

const $$file = "/Users/macbookpro15/Desktop/GitHub Adv/ADvatnage BizDev/src/pages/projects/index.astro";
const $$url = "/projects";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
