# Outreach Bot

A Telegram bot that keeps your team from double-messaging the same GitHub
developers. Before anyone reaches out, they reserve the contact in the bot.
The bot keeps one shared list, so a second reservation attempt is rejected
with the name of whoever already has it.

## Commands

| Command | What it does |
|---|---|
| `/reserve <username or URL>` | Lock a contact to you. Rejected if someone already has them. |
| `/check <username>` | See who, if anyone, has this contact. |
| `/done <username> [note]` | Mark your outreach as sent, with an optional note. |
| `/release <username>` | Give the contact back (only you can release your own). |
| `/list` | Your active reservations. |
| `/list all` | Recent activity across the whole team. |
| `/find <stars> [language]` | Discover repo owners by star range, e.g. `/find 500..2000 python` or `/find 1000` (1000+). Shows each owner's reservation status so you only chase free ones. |
| `/help` | Command summary. |

Usernames can be pasted as `torvalds`, `@torvalds`, or a full profile/repo
URL like `https://github.com/torvalds/linux`.

## Setup

This bot deploys as part of the pumpboard docker-compose stack.

1. Message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot`,
   and copy the token it gives you.
2. On the server, put the token in `outreach-bot/.env`:

```
TELEGRAM_BOT_TOKEN=123456:ABC...
GITHUB_TOKEN=
```

`GITHUB_TOKEN` is optional. Without it, `/find` uses GitHub's anonymous
search limit (10 searches/minute shared by the whole team). Any personal
access token, no scopes needed, raises that to 30/minute.

3. Start it: `docker compose up -d --build outreach-bot`
   (or just run the usual deploy; `deploy.sh` creates the `.env` skeleton
   if it's missing and the container idles until a token is set).
4. Add the bot to your team group chat (recommended, so everyone sees
   reservations happen), or have each teammate DM it. The database is
   shared either way.

To run locally without Docker:

```bash
pip install -r requirements.txt
TELEGRAM_BOT_TOKEN=123456:ABC... python bot.py
```

Note for group chats: by default Telegram bots only see messages that start
with `/`, which is all this bot needs. No privacy changes required.

## Data

Everything is stored in `data/contacts.json`, one record per GitHub
username: who reserved them, when, status (`reserved` or `done`), and any
note. Back up or edit that file freely while the bot is stopped.

## Suggested team protocol

1. Found someone worth contacting? `/reserve` them first, before writing
   the message.
2. Sent the message? `/done username replied via email` so the history
   stays useful.
3. Changed your mind? `/release` so a teammate can pick them up.
