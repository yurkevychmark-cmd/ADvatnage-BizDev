#!/bin/bash
# Навчальне відновлення бекапу бази BizDev: доводить, що копія у сховищі
# ВІДНОВЛЮЄТЬСЯ з повними даними, а не лише розшифровується.
#
# Береться найсвіжіша перевірена копія зі сховища (тека на Mac), розшифровується
# тут приватним ключем і потоком іде в тимчасову базу на сервері — окремий
# контейнер з тим самим образом, що й bizdev-db, без мережі, після прогону
# видаляється. Потім кількість рядків у КОЖНІЙ таблиці звіряється з тим, що було
# в базі в мить дампу (файл .counts, знятий у тому самому знімку, що й дамп).
# Провал — сповіщення macOS і код 1, а не тиша.
#
#   restore-drill.sh [файл.dump.age]   — прогнати зараз (за замовчуванням найсвіжіша копія)
#   restore-drill.sh --if-due          — лише якщо минув місяць від останнього вдалого
#                                        (так його щогодини кличе pull-bizdev-backups.sh)
# Лог кожного прогону — $DEST/drill-logs/. Тести на навмисно зіпсованих копіях —
# лише з NOTIFY=0, щоб тестовий провал не прийшов Марку справжньою тривогою.
#
# Перенесено з навчального відновлення бекапу платформи (blackaffiliate, ops/backup).

set -uo pipefail
umask 077

DEST="${DEST:-$HOME/db-backups-bizdev}"
KEY="${KEY:-$HOME/.config/advantage-db-backup-bizdev/age-key.txt}"
HOST="${HOST:-marko@144.91.104.211}"
DRILL_DAYS="${DRILL_DAYS:-30}"
RETRY_HOURS="${RETRY_HOURS:-20}"
NOTIFY="${NOTIFY:-1}"
CONTAINER="bizdev-restore-drill"
KEY_TABLES="public.buyers public.operators public.projects public.activity_log"
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE="${NODE:-$(ls -d "$HOME"/.nvm/versions/node/*/bin/node /opt/homebrew/bin/node /usr/local/bin/node 2>/dev/null | tail -1)}"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=20 "$HOST")

mkdir -p "$DEST/drill-logs"
LOG="$DEST/drill-logs/drill-$(date -u +%Y%m%dT%H%M%SZ).log"

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$LOG"; }
notify() {
  [ "$NOTIFY" = 1 ] || { log "(тестовий прогін: сповіщення не показано)"; return; }
  osascript -e "display notification \"$1\" with title \"BizDev backup\" sound name \"Basso\"" >/dev/null 2>&1 || true
}
fail() { log "FAIL: $1"; notify "Навчальне відновлення BizDev провалилось: $1"; exit 1; }

if [ "${1:-}" = "--if-due" ]; then
  now=$(date +%s)
  last_ok=$(stat -f %m "$DEST/.drill-last-ok" 2>/dev/null || echo 0)
  last_try=$(stat -f %m "$DEST/.drill-last-try" 2>/dev/null || echo 0)
  if [ $((now - last_ok)) -lt $((DRILL_DAYS * 86400)) ] || [ $((now - last_try)) -lt $((RETRY_HOURS * 3600)) ]; then
    rm -f "$LOG"; exit 0
  fi
  shift
fi

FILE="${1:-}"
if [ -z "$FILE" ]; then
  for f in $(ls -1t "$DEST"/db-*.dump.age 2>/dev/null); do [ -e "$f.verified" ] && { FILE="$f"; break; }; done
fi
: > "$DEST/.drill-last-try"
[ -n "$FILE" ] && [ -f "$FILE" ] || fail "у сховищі немає перевіреної копії"
[ -s "$FILE.counts" ] || fail "до $(basename "$FILE") немає підрахунку рядків (.counts) — нема з чим звіряти"
log "копія: $(basename "$FILE")"

TMP="$(mktemp -d)"
cleanup() { "${SSH[@]}" "docker rm -f $CONTAINER >/dev/null 2>&1"; rm -rf "$TMP"; }
trap cleanup EXIT

IMAGE="$("${SSH[@]}" "docker inspect bizdev-db --format '{{.Config.Image}}'")" || fail "сервер недоступний"
PW="$(openssl rand -hex 16)"   # одноразовий, лише для контейнера без мережі
PQ="docker exec -i $CONTAINER psql -U postgres -qAtX"
"${SSH[@]}" "{ docker rm -f $CONTAINER >/dev/null 2>&1 || true; } && docker run -d --name $CONTAINER --network none -e POSTGRES_PASSWORD=$PW $IMAGE >/dev/null \
  && for i in \$(seq 1 60); do $PQ -d postgres -c 'select 1' </dev/null >/dev/null 2>&1 && break; sleep 2; done \
  && sleep 3 && $PQ -d postgres -c 'create database drill' </dev/null" >/dev/null || fail "тимчасова база не піднялась"
log "тимчасова база: $IMAGE, без мережі"

t0=$(date +%s)
"$NODE" "$HERE/age-lite.mjs" decrypt "$KEY" "$FILE" 2> "$TMP/decrypt.err" \
  | "${SSH[@]}" "docker exec -i $CONTAINER pg_restore -U postgres -d drill --no-owner --no-privileges" \
  2> "$TMP/restore.err"
rcs=("${PIPESTATUS[@]}")
[ "${rcs[0]}" -eq 0 ] || fail "копія не розшифрувалась: $(head -c 200 "$TMP/decrypt.err")"
log "pg_restore: код ${rcs[1]} за $(( $(date +%s) - t0 )) с"
[ "${rcs[1]}" -eq 0 ] || fail "pg_restore код ${rcs[1]}: $(grep -m2 -iE 'error|помилк' "$TMP/restore.err" | tr '\n' ' ' | cut -c1-200)"

"${SSH[@]}" "$PQ -d drill" < "$HERE/row-counts.sql" > "$TMP/restored.tsv" || fail "не вдалось порахувати рядки у відновленій базі"

# Звірка всіх таблиць: у мить дампу проти відновленого.
awk -F'|' 'NR == FNR { want[$1] = $2; n++; next } { got[$1] = $2 }
  END { for (t in want) if (!(t in got)) { print "  " t ": у базі " want[t] ", у відновленій таблиці НЕМАЄ"; bad++ }
                        else if (got[t] != want[t]) { print "  " t ": у базі " want[t] ", відновлено " got[t]; bad++ }
        printf "SUMMARY %d %d\n", n, bad }' "$FILE.counts" "$TMP/restored.tsv" > "$TMP/diff.txt"
read -r _ total bad < <(tail -1 "$TMP/diff.txt")

# Ключові таблиці — окремим рядком: у мить дампу, відновлено, у базі зараз.
now_sql=""; for t in $KEY_TABLES; do now_sql="$now_sql select '$t', count(*) from $t union all"; done
"${SSH[@]}" "docker exec -i bizdev-db psql -U bizdev -d bizdev -qAtX" <<< "${now_sql% union all};" > "$TMP/prod-now.tsv"
for t in $KEY_TABLES; do
  log "  $t: у мить дампу $(grep "^$t|" "$FILE.counts" | cut -d'|' -f2), відновлено $(grep "^$t|" "$TMP/restored.tsv" | cut -d'|' -f2), зараз $(grep "^$t|" "$TMP/prod-now.tsv" | cut -d'|' -f2)"
done

if [ "$bad" -ne 0 ]; then
  grep -v '^SUMMARY' "$TMP/diff.txt" | tee -a "$LOG"
  fail "$bad з $total таблиць не збіглись ($(basename "$FILE"))"
fi
log "OK: усі $total таблиць збіглися з базою рядок у рядок"
: > "$DEST/.drill-last-ok"
