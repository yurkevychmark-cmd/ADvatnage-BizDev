#!/bin/sh
# Ролі для PostgREST: портал ходить у базу лише через нього, у внутрішній мережі Docker.
# bizdev_authenticator — логін PostgREST; bizdev_api — права на таблиці public.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
create role bizdev_api nologin;
create role bizdev_authenticator login noinherit password '${BIZDEV_API_PASSWORD}';
grant bizdev_api to bizdev_authenticator;
grant usage on schema public to bizdev_api;
alter default privileges in schema public grant select, insert, update, delete on tables to bizdev_api;
alter default privileges in schema public grant usage, select on sequences to bizdev_api;
alter default privileges in schema public grant execute on functions to bizdev_api;
SQL
