# Зашифрований бекап бази BizDev

Сервер раз на добу знімає дамп `bizdev-db` і шифрує його публічними ключами. Mac
Марка — сховище: щогодини забирає нові копії, перевіряє, тримає за ротацією і раз
на місяць сам відновлює свіжу копію в тимчасову базу. Таск 09620367 (кр. 4),
рішення Марка 07.10.2026: «Нічний бекап бази - зроби ти».

Схема — та сама, що в бекапі бази платформи (репо blackaffiliate, `ops/backup`,
автор Павло). `age-lite.mjs`, `rotate.mjs` і `row-counts.sql` узято звідти без змін
(коміт 13450e5b). Свої тут лише скрипти під базу BizDev.

```
144.91.104.211 (крон marko, 03:37 Europe/Berlin)     Mac Марка (launchd, щогодини)
один знімок бази (REPEATABLE READ, експорт)
 ├─ pg_dump --snapshot ─┬─ age → *.dump.age  ──rsync──▶ ~/db-backups-bizdev/
 │                      └─ sha256 → *.sha256           ├─ розшифрувати в пам'яті → звірити sha256
 └─ рядки кожної таблиці → *.counts                    ├─ ротація: 7 денних · 4 тижневі · 6 місячних
(тримає 7 останніх — черга, не сховище)                └─ раз на місяць: навчальне відновлення
                                                           копію → тимчасова база на сервері
                                                           (образ bizdev-db, без мережі) →
                                                           рядки кожної таблиці == *.counts
```

- **Два ключі.** Шифр — на два публічні ключі: BizDev-ключ Марка та ключ бекапів
  платформи (Mac Павла). Якщо ноут Марка пропаде, копії на сервері розшифрує ключ Павла.
- **Що лишається на сервері.** Бойова база лише читається. Відкритий текст ніде на диск
  не пишеться. Приватних ключів на сервері немає.
- **Ролі окремо не знімаються:** `bizdev_api` і `bizdev_authenticator` створює
  `deploy/initdb/01-roles.sh` на чистому томі.
- **Сповіщення macOS:**
  - копія не збіглась із дампом;
  - найсвіжішій копії понад 26 год;
  - теку чи ключ не прочитати;
  - навчальне відновлення провалилось.

  Провалене відновлення повторюється раз на 20 год, доки не пройде.

| Файл | Де живе |
|---|---|
| `bizdev-backup.sh`, `row-counts.sql`, `backup.env` (лише публічні ключі, 600) | сервер `/opt/bizdev/backup/`; лог `/opt/bizdev/backup/backup.log`; черга копій `/opt/bizdev/backups/` |
| `pull-bizdev-backups.sh`, `restore-drill.sh`, `age-lite.mjs`, `rotate.mjs`, `row-counts.sql` | Mac `~/Library/Application Support/advantage-db-backup-bizdev/` |
| `co.advantage-agency.bizdev-backup-pull.plist` | Mac `~/Library/LaunchAgents/`; лог `~/Library/Logs/advantage-bizdev-backup-pull.log` |
| приватний ключ Марка | Mac `~/.config/advantage-db-backup-bizdev/age-key.txt` (600) — варто зберегти копію в менеджері паролів |
| копії й логи навчальних відновлень | Mac `~/db-backups-bizdev/`; посилання — `~/Desktop/ADvantage/Server-Backups/bizdev-db-backups` |

Чому теки не на робочому столі: macOS (TCC) не пускає фонову задачу launchd у
`~/Desktop`, тому там лише посилання.

## Перевірено 07.10.2026

- **Перша копія.** 42 152 байти, у заголовку два одержувачі. Розшифрована на Mac,
  sha256 збігся.
- **Навчальне відновлення першої копії.** `pg_restore` завершився з кодом 0 за 2 с.
  Усі 10 таблиць збіглися рядок у рядок, зокрема buyers 8, operators 30, projects 8,
  activity_log 45.
- **Навмисно зіпсовані копії** (з `NOTIFY=0`) дають провал:
  - підмінений байт у шифрі — «не розшифрувався або не збігся з дампом»;
  - дамп без даних operators — `pg_restore` падає на зовнішньому ключі;
  - дамп без даних activity_log — `pg_restore` код 0, ловить звірка рядків
    (45 проти 0).
- **launchd-прогін** завершився з кодом 0: ssh працює з ключа без пароля.

## Встановити заново

Сервер (від marko):
```bash
install -d -m 700 /opt/bizdev/backup /opt/bizdev/backups
install -m 700 bizdev-backup.sh /opt/bizdev/backup/
install -m 600 row-counts.sql /opt/bizdev/backup/
install -m 600 backup.env.example /opt/bizdev/backup/backup.env   # вписати AGE_RECIPIENTS
( crontab -l; echo '37 3 * * * /opt/bizdev/backup/bizdev-backup.sh >> /opt/bizdev/backup/backup.log 2>&1' ) | crontab -
```

Mac:
```bash
D="$HOME/Library/Application Support/advantage-db-backup-bizdev"; mkdir -p "$D"
install -m 700 pull-bizdev-backups.sh restore-drill.sh "$D/"; install -m 600 age-lite.mjs rotate.mjs row-counts.sql "$D/"
sed "s#__HOME__#$HOME#g" co.advantage-agency.bizdev-backup-pull.plist > ~/Library/LaunchAgents/co.advantage-agency.bizdev-backup-pull.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/co.advantage-agency.bizdev-backup-pull.plist
```
Новий ключ: `node age-lite.mjs keygen ~/.config/advantage-db-backup-bizdev/age-key.txt`. Команда друкує
публічний ключ — його вписати в `backup.env` на сервері.

Відкат: на сервері прибрати рядок через `crontab -e`.
На Mac:
```bash
launchctl bootout gui/$(id -u)/co.advantage-agency.bizdev-backup-pull
```
і видалити plist. Базу ці скрипти не змінюють.

## Відновити

Розшифрувати:
```bash
node age-lite.mjs decrypt age-key.txt db-bizdev-<час>.dump.age db.dump   # або: age -d -i age-key.txt …
```

Відновити в базу, створену з `deploy/initdb` (ролі вже є):
```bash
docker exec -i bizdev-db pg_restore -U bizdev -d bizdev --clean --if-exists < db.dump
```

Прогнати навчальне відновлення руками:
`"$HOME/Library/Application Support/advantage-db-backup-bizdev/restore-drill.sh"`.
Тести на зіпсованих копіях — лише з `NOTIFY=0` і окремою `DEST`. Після відновлення
`db.dump` видалити: це відкритий текст.
