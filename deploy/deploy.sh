#!/bin/sh
# Деплой BizDev з цього репо на сервер: код → /opt/bizdev/src, збірка образу там же.
# Використання: deploy/deploy.sh   (потрібен ssh-доступ marko@144.91.104.211)
set -eu
HOST="${BIZDEV_HOST:-marko@144.91.104.211}"
cd "$(dirname "$0")/.."
rsync -az --delete --exclude-from=.dockerignore ./ "$HOST:/opt/bizdev/src/"
rsync -az deploy/docker-compose.yml "$HOST:/opt/bizdev/docker-compose.yml"
rsync -az --delete deploy/initdb/ "$HOST:/opt/bizdev/initdb/"
# --pull=false: базові образи вже на сервері (ліміт Docker Hub на анонімні завантаження).
ssh "$HOST" 'cd /opt/bizdev && docker compose build --pull=false bizdev-portal && docker compose up -d'
