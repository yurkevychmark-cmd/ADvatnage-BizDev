import json, re, sys
d = json.load(open(sys.argv[1]))["definitions"]
ORDER = ["buyers", "operators", "matches", "match_comments", "projects", "report_entries", "tasks", "activity_log", "profiles", "invite_tokens"]
assert set(ORDER) == set(d), set(d) ^ set(ORDER)
TYPE = {"timestamp with time zone": "timestamptz"}
ON_DELETE = {("matches", "buyers"): "cascade", ("matches", "operators"): "cascade", ("match_comments", "matches"): "cascade",
             ("report_entries", "projects"): "cascade"}
# Колонки, яких потребує код порталу, але немає в живій базі (matchmaking пише їх у matches).
CODE_ONLY = {"matches": [
    ("score", "numeric not null default 0"), ("geo_overlap", "text[] not null default '{}'"),
    ("traffic_overlap", "text[] not null default '{}'"), ("budget_fit", "boolean not null default false"),
    ("pipeline_stage", "text not null default 'new'"), ("created_at", "timestamptz not null default now()")]}
def default(v, typ):
    if v is None: return ""
    if isinstance(v, bool): return f" default {'true' if v else 'false'}"
    if isinstance(v, (int, float)): return f" default {v}"
    s = str(v)
    if re.search(r"\w\(.*\)$", s) or "::" in s: return f" default {s}"
    return " default '" + s.replace("'", "''") + "'"
out = ["-- Схема BizDev на нашому сервері (таск 09620367).",
       "-- Згенеровано 07.10.2026 з опису живих таблиць Supabase-проєкту unipibjiywsluluavkgv",
       "-- (PostgREST OpenAPI): усі таблиці й колонки, типи, not null, значення за замовчуванням,",
       "-- первинні й зовнішні ключі. numeric — без точності, щоб жодне значення не округлилось.",
       "-- Плюс колонки, яких потребує код, але немає в живій базі (CODE_ONLY у gen_schema.py).",
       "-- on delete для зовнішніх ключів OpenAPI не показує — обрано за змістом (див. ON_DELETE).",
       'create extension if not exists "pgcrypto";', 'create extension if not exists "uuid-ossp";', "",
       "create or replace function public.set_updated_at() returns trigger as $$",
       "begin new.updated_at = now(); return new; end;", "$$ language plpgsql;", ""]
fks = []; triggers = []
for t in ORDER:
    props = d[t]["properties"]; req = set(d[t].get("required", []))
    cols = []
    for c, p in props.items():
        typ = TYPE.get(p.get("format"), p.get("format"))
        line = f"  {c} {typ}"
        desc = p.get("description") or ""
        if "<pk/>" in desc: line += " primary key"
        elif c in req: line += " not null"
        line += default(p.get("default"), typ)
        cols.append(line)
        for ft, fc in re.findall(r"<fk table='(\w+)' column='(\w+)'/>", desc):
            fks.append(f"alter table public.{t} add foreign key ({c}) references public.{ft}({fc}) on delete {ON_DELETE.get((t, ft), 'set null')};")
    for c, ddl in CODE_ONLY.get(t, []):
        if c not in props: cols.append(f"  {c} {ddl}")
    out.append(f"create table public.{t} (\n" + ",\n".join(cols) + "\n);\n")
    if "updated_at" in props:
        triggers.append(f"create trigger trg_{t}_updated before update on public.{t} for each row execute function public.set_updated_at();")
out += fks + [""]
out += ["-- upsert у matchmaking іде з onConflict buyer_id,operator_id",
        "create unique index matches_buyer_operator_key on public.matches(buyer_id, operator_id);",
        "create index idx_report_entries_project on public.report_entries(project_id, granularity, entry_date);",
        "create index idx_activity_log_created on public.activity_log(created_at desc);", ""]
out += triggers
print("\n".join(out))
