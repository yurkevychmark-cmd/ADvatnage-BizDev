-- Кількість рядків у кожній таблиці з даними — та сама вибірка на проді (у знімку
-- дампу) і у відновленій базі, щоб їх можна було звірити рядок у рядок.
-- Таблиці, що належать розширенням (pg_net, pgsodium…), не рахуються: їхні дані
-- pg_dump не забирає за задумом, розширення створює їх наново.
SELECT n.nspname || '.' || c.relname,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
ORDER BY 1;
