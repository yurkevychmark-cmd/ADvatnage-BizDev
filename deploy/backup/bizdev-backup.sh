#!/usr/bin/env bash
# Зашифрований нічний бекап бази BizDev: pg_dump → age. Копії забирає Mac Марка
# (pull-bizdev-backups.sh), там же ротація й навчальне відновлення.
#
# Схема та сама, що в бекапі бази платформи (репо blackaffiliate, ops/backup,
# автор Павло): дамп і підрахунок рядків з одного знімку бази, sha256 відкритого
# дампу поруч, відкритий текст на диск не потрапляє — pg_dump іде в age конвеєром.
# Відмінності: база bizdev-db (користувач bizdev, 10 таблиць, дамп ~42 КБ), без S3
# і без дампу ролей — ролі bizdev_api / bizdev_authenticator створює initdb.
#
# Живе на 144.91.104.211 у /opt/bizdev/backup, запускається кроном від marko.
# Шифр — на кілька публічних ключів (AGE_RECIPIENTS у backup.env поруч, chmod 600):
# BizDev-ключ Марка (приватний лише на його Mac) і ключ бекапів платформи (Mac
# Павла), щоб копії не загинули разом з одним ноутом. Приватних ключів на сервері
# немає — свої бекапи сервер розшифрувати не може.

set -Eeuo pipefail
umask 077

HERE="$(cd "$(dirname "$0")" && pwd)"
CONFIG="${BIZDEV_BACKUP_CONFIG:-$HERE/backup.env}"
[ -f "$CONFIG" ] && . "$CONFIG"

: "${AGE_RECIPIENTS:?AGE_RECIPIENTS не задано — публічні ключі age через пробіл}"
DB_CONTAINER="${DB_CONTAINER:-bizdev-db}"
DB_NAME="${DB_NAME:-bizdev}"
DB_USER="${DB_USER:-bizdev}"
SPOOL="${SPOOL:-/opt/bizdev/backups}"
RETAIN_LOCAL="${RETAIN_LOCAL:-7}"
STATUS_FILE="${STATUS_FILE:-$SPOOL/last-success}"
MIN_BYTES="${MIN_BYTES:-10000}"   # дамп ~42 КБ (07.10.2026); менше 10 КБ — щось зламалось
MIN_TABLES="${MIN_TABLES:-10}"
COUNTS_SQL="${COUNTS_SQL:-$HERE/row-counts.sql}"

recipients=()
for r in $AGE_RECIPIENTS; do recipients+=(-r "$r"); done

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$SPOOL"
db_file="$SPOOL/db-$DB_NAME-$stamp.dump.age"

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }
fail() { log "FAIL: $*"; rm -f "$db_file.part" "$db_file.sha256.part" "$db_file.counts.part"; exit 1; }
trap 'fail "рядок $LINENO: $BASH_COMMAND"' ERR
# Будь-який вихід — і через set -u, якого ERR не ловить, — не лишає .part.
trap 'rm -f "$db_file.part" "$db_file.sha256.part" "$db_file.counts.part" "$SPOOL/.hash.fifo"' EXIT

log "start $stamp"
[ -f "$COUNTS_SQL" ] || fail "немає $COUNTS_SQL"

# Дамп і підрахунок рядків — з ОДНОГО знімку: відкрита транзакція експортує свій
# знімок, pg_dump бере саме його (--snapshot), а рядки рахуються в тій самій
# транзакції. Навчальне відновлення звіряє відновлене рівно з миттю дампу.
coproc SNAP { docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -qAtX -v ON_ERROR_STOP=1; }
printf 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSELECT pg_export_snapshot();\n' >&"${SNAP[1]}"
read -r -t 30 snapshot <&"${SNAP[0]}" || fail "знімок бази не експортувався"
{ cat "$COUNTS_SQL"; echo "SELECT '__END__';"; } >&"${SNAP[1]}"
: > "$db_file.counts.part"
while :; do
  read -r -t 300 line <&"${SNAP[0]}" || fail "підрахунок рядків не завершився"
  [ "$line" = "__END__" ] && break
  printf '%s\n' "$line" >> "$db_file.counts.part"
done
[ "$(wc -l < "$db_file.counts.part")" -ge "$MIN_TABLES" ] || fail "підозріло мало таблиць у підрахунку"

# Custom-формат (стиснений, pg_restore відновлює вибірково) і sha256 відкритого
# дампу: розшифрувавши копію, Mac звіряє, що отримав рівно знятий дамп.
fifo="$SPOOL/.hash.fifo"
rm -f "$fifo"; mkfifo "$fifo"
sha256sum < "$fifo" | cut -d' ' -f1 > "$db_file.sha256.part" &
hash_pid=$!
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-password --snapshot="$snapshot" \
  | tee "$fifo" \
  | age "${recipients[@]}" -o "$db_file.part"
wait "$hash_pid"
rm -f "$fifo"
echo "COMMIT;" >&"${SNAP[1]}"
exec {SNAP[1]}>&-
wait "$SNAP_PID" 2>/dev/null || true
[ -s "$db_file.sha256.part" ] || fail "хеш дампу не записався"

size="$(stat -c %s "$db_file.part")"
[ "$size" -ge "$MIN_BYTES" ] || fail "дамп підозріло малий: $size байт"
mv "$db_file.part" "$db_file"
mv "$db_file.sha256.part" "$db_file.sha256"
mv "$db_file.counts.part" "$db_file.counts"
log "encrypted $(basename "$db_file") $size bytes"

# На сервері — лише черга з RETAIN_LOCAL останніх; сховище з ротацією — на Mac.
ls -1t "$SPOOL"/db-*.dump.age 2>/dev/null | tail -n +"$((RETAIN_LOCAL + 1))" | sed 'p;s/$/.sha256/p;s/\.sha256$/.counts/' | xargs -r rm -f

printf '%s %s %s\n' "$stamp" "$size" "$(basename "$db_file")" > "$STATUS_FILE"
log "ok"
