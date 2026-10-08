#!/bin/sh
# Запрошення у BizDev-портал: одноразове посилання на 24 години, за яким людина сама
# ставить собі пароль. Те саме для забутого пароля — нове посилання ставить новий.
#
#   deploy/auth/invite.sh <email> ["Ім'я"]           — відкриває посилання в браузері цього Mac
#   PRINT=1 deploy/auth/invite.sh <email> ["Ім'я"]   — друкує посилання, щоб передати людині
#
# Посилання — разовий ключ до порталу: не класти в чати, таски чи базу знань.
# Створити запрошення може лише власник бази на сервері; з порталу — ні.
set -eu
EMAIL="${1:?usage: invite.sh <email> [name]}"
NAME="${2:-}"
HOST="${BIZDEV_HOST:-marko@144.91.104.211}"
SITE="${BIZDEV_URL:-https://bizdev.advantage-agency.duckdns.org}"

# Значення йдуть у SQL-літерал через stdin, а не в рядок віддаленої команди.
lit() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/''/g")"; }
TOKEN=$(printf 'select portal_auth.create_invite(%s, %s);\n' "$(lit "$EMAIL")" "$(lit "$NAME")" \
  | ssh "$HOST" "docker exec -i bizdev-db psql -U bizdev -d bizdev -At -v ON_ERROR_STOP=1 -f -")
[ "${#TOKEN}" -eq 64 ] || { echo "invite.sh: запрошення не створено" >&2; exit 1; }

URL="$SITE/invite/$TOKEN"
if [ "${PRINT:-0}" = 1 ]; then
  printf '%s\n' "$URL"
else
  open "$URL"
  echo "Запрошення для $EMAIL відкрито в браузері (одноразове, діє 24 години)."
fi
