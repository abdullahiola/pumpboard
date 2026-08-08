"""Outreach bot: coordinates GitHub outreach across a team via Telegram.

Before messaging a developer, a teammate reserves them here. The bot keeps
one shared database, so a second reservation attempt is rejected and the
team never double-messages the same person.

Commands:
  /reserve <github user or URL>   lock a contact to you
  /check <github user>            see who (if anyone) has them
  /done <github user> [note]      mark your outreach as sent
  /release <github user>          give up your reservation
  /list                           your active reservations
  /list all                       recent activity across the team
  /find <stars> [language]        discover repos by star range, e.g.
                                  /find 500..2000 python
  /help                           this summary

Add the bot to your team group chat, or let each teammate DM it. Either
way the database is shared, so duplicates are caught everywhere.
"""

import asyncio
import json
import os
import re
import time
from pathlib import Path

import httpx

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")  # optional: raises search rate limit
DATA_DIR = Path(__file__).parent / "data"
CONTACTS_FILE = DATA_DIR / "contacts.json"

# github username -> record
# record: {reservedBy, reservedById, reservedAt, status, note, doneAt}
_contacts: dict = {}


def load_contacts():
    global _contacts
    if CONTACTS_FILE.exists():
        try:
            with open(CONTACTS_FILE, "r") as f:
                _contacts = json.load(f)
        except (json.JSONDecodeError, OSError):
            _contacts = {}


def save_contacts():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = CONTACTS_FILE.with_suffix(".json.tmp")
    with open(tmp, "w") as f:
        json.dump(_contacts, f, indent=2)
    tmp.replace(CONTACTS_FILE)


GITHUB_URL_RE = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/([A-Za-z0-9-]+)", re.IGNORECASE
)
USERNAME_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$")


def normalize_username(raw: str) -> str | None:
    """Accept a bare username, @username, or a github.com profile/repo URL."""
    raw = raw.strip().lstrip("@")
    m = GITHUB_URL_RE.match(raw)
    if m:
        raw = m.group(1)
    return raw.lower() if USERNAME_RE.match(raw) else None


def display_name(user: dict) -> str:
    name = " ".join(
        filter(None, [user.get("first_name", ""), user.get("last_name", "")])
    ).strip()
    handle = user.get("username", "")
    if name and handle:
        return f"{name} (@{handle})"
    return name or f"@{handle}" or "someone"


def fmt_when(ts: float) -> str:
    return time.strftime("%b %-d", time.localtime(ts))


def profile_url(username: str) -> str:
    return f"https://github.com/{username}"


HELP_TEXT = (
    "🤝 Outreach bot. One shared list, no double-messaging.\n\n"
    "Before you contact a developer, reserve them:\n"
    "/reserve <github username or URL>\n\n"
    "Other commands:\n"
    "/check <username> · who has this contact\n"
    "/done <username> [note] · mark your outreach as sent\n"
    "/release <username> · give the contact back\n"
    "/list · your active reservations\n"
    "/list all · recent team activity\n"
    "/find 500..2000 python · discover repos by star range"
)


def cmd_reserve(username: str, sender: dict) -> str:
    rec = _contacts.get(username)
    who = display_name(sender)
    if rec:
        holder = rec.get("reservedBy", "someone")
        same_person = str(sender.get("id")) == str(rec.get("reservedById"))
        if rec.get("status") == "done":
            when = fmt_when(rec.get("doneAt", rec.get("reservedAt", 0)))
            note = f'\n📝 "{rec["note"]}"' if rec.get("note") else ""
            return (
                f"⛔️ {username} was already contacted by {holder} on {when}.{note}\n"
                "No need to message them again."
            )
        if same_person:
            return f"👍 You already have {username} reserved."
        when = fmt_when(rec.get("reservedAt", 0))
        return (
            f"⛔️ {username} is reserved by {holder} since {when}.\n"
            "Pick someone else, or ask them to /release."
        )
    _contacts[username] = {
        "reservedBy": who,
        "reservedById": str(sender.get("id")),
        "reservedAt": time.time(),
        "status": "reserved",
    }
    save_contacts()
    return (
        f"✅ {username} is reserved for you, {who}.\n"
        f"{profile_url(username)}\n"
        f"When you've messaged them: /done {username}"
    )


def cmd_check(username: str) -> str:
    rec = _contacts.get(username)
    if not rec:
        return f"🟢 {username} is free. Reserve them with /reserve {username}"
    holder = rec.get("reservedBy", "someone")
    if rec.get("status") == "done":
        when = fmt_when(rec.get("doneAt", rec.get("reservedAt", 0)))
        note = f'\n📝 "{rec["note"]}"' if rec.get("note") else ""
        return f"✉️ {username} was contacted by {holder} on {when}.{note}"
    when = fmt_when(rec.get("reservedAt", 0))
    return f"🔒 {username} is reserved by {holder} since {when}."


def cmd_done(username: str, note: str, sender: dict) -> str:
    rec = _contacts.get(username)
    if not rec:
        # They messaged without reserving first; record it anyway.
        _contacts[username] = rec = {
            "reservedBy": display_name(sender),
            "reservedById": str(sender.get("id")),
            "reservedAt": time.time(),
        }
    rec["status"] = "done"
    rec["doneAt"] = time.time()
    if note:
        rec["note"] = note
    save_contacts()
    return f"✉️ Logged: {username} contacted by {rec['reservedBy']}."


def cmd_release(username: str, sender: dict) -> str:
    rec = _contacts.get(username)
    if not rec:
        return f"🟢 {username} wasn't reserved."
    if str(sender.get("id")) != str(rec.get("reservedById")):
        return (
            f"🙅 Only {rec.get('reservedBy', 'the person who reserved them')} "
            f"can release {username}."
        )
    if rec.get("status") == "done":
        return f"✉️ {username} is already marked as contacted; nothing to release."
    del _contacts[username]
    save_contacts()
    return f"🟢 {username} is free again."


def cmd_list(sender: dict, show_all: bool) -> str:
    if show_all:
        items = sorted(
            _contacts.items(),
            key=lambda kv: kv[1].get("doneAt") or kv[1].get("reservedAt", 0),
            reverse=True,
        )[:20]
        if not items:
            return "Nothing yet. Reserve your first contact with /reserve <username>"
        lines = ["📋 Recent team activity:"]
        for username, rec in items:
            icon = "✉️" if rec.get("status") == "done" else "🔒"
            verb = "contacted" if rec.get("status") == "done" else "reserved"
            when = fmt_when(rec.get("doneAt") or rec.get("reservedAt", 0))
            lines.append(f"{icon} {username} · {verb} by {rec.get('reservedBy')} · {when}")
        return "\n".join(lines)

    mine = [
        (u, r)
        for u, r in _contacts.items()
        if str(r.get("reservedById")) == str(sender.get("id"))
        and r.get("status") != "done"
    ]
    if not mine:
        return "You have no active reservations. Grab one with /reserve <username>"
    mine.sort(key=lambda kv: kv[1].get("reservedAt", 0), reverse=True)
    lines = ["📋 Your reservations:"]
    for username, rec in mine:
        lines.append(f"🔒 {username} · since {fmt_when(rec.get('reservedAt', 0))}")
    lines.append("\nMark one as sent with /done <username>")
    return "\n".join(lines)


STARS_RE = re.compile(r"^(\d+)(?:\.\.(\d+))?$")


async def cmd_find(stars_arg: str, language: str) -> str:
    m = STARS_RE.match(stars_arg)
    if not m:
        return (
            "Usage: /find <stars> [language]\n"
            "Examples:\n"
            "/find 500..2000 · repos with 500 to 2000 stars\n"
            "/find 1000 python · Python repos with 1000+ stars"
        )
    stars = stars_arg if m.group(2) else f">={stars_arg}"
    query = f"stars:{stars}"
    if language:
        query += f" language:{language}"

    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            "https://api.github.com/search/repositories",
            params={"q": query, "sort": "stars", "order": "desc", "per_page": 30},
            headers=headers,
        )
    if resp.status_code == 403:
        return "🐢 GitHub search rate limit hit. Try again in a minute."
    data = resp.json()
    items = data.get("items") or []
    if not items:
        return f"No repos found for {query}."

    # One line per unique owner; orgs can't be messaged, so keep users only.
    lines = [f"🔎 {query} · {data.get('total_count', 0)} repos, top owners:"]
    seen_owners = set()
    for repo in items:
        owner = (repo.get("owner") or {}).get("login", "")
        if not owner or owner.lower() in seen_owners:
            continue
        if (repo.get("owner") or {}).get("type") != "User":
            continue
        seen_owners.add(owner.lower())
        rec = _contacts.get(owner.lower())
        if rec and rec.get("status") == "done":
            status = f"✉️ contacted by {rec.get('reservedBy')}"
        elif rec:
            status = f"🔒 reserved by {rec.get('reservedBy')}"
        else:
            status = "🟢 free"
        lines.append(
            f"• {owner} · {repo.get('name')} ⭐{repo.get('stargazers_count', 0):,}"
            f" · {status}"
        )
        if len(seen_owners) >= 10:
            break
    if len(lines) == 1:
        return f"Found repos for {query}, but the top results are all orgs, not individual users. Try a narrower range."
    lines.append("\nGrab one with /reserve <username>")
    return "\n".join(lines)


async def handle_command(text: str, sender: dict) -> str | None:
    parts = text.strip().split(maxsplit=2)
    if not parts or not parts[0].startswith("/"):
        return None
    cmd = parts[0].lower().split("@")[0]  # strip @BotName suffix in groups
    arg = parts[1] if len(parts) > 1 else ""
    rest = parts[2] if len(parts) > 2 else ""

    if cmd in ("/start", "/help"):
        return HELP_TEXT

    if cmd == "/list":
        return cmd_list(sender, show_all=arg.lower() == "all")

    if cmd == "/find":
        return await cmd_find(arg, rest.strip())

    if cmd in ("/reserve", "/check", "/done", "/release"):
        if not arg:
            return f"Usage: {cmd} <github username or URL>"
        if rest and cmd != "/done":  # e.g. "/reserve Linus Torvalds"
            return (
                f"🤔 One GitHub username or profile URL at a time, "
                f"e.g. {cmd} torvalds"
            )
        username = normalize_username(arg)
        if not username:
            return f"🤔 That doesn't look like a GitHub username or profile URL: {arg}"
        if cmd == "/reserve":
            return cmd_reserve(username, sender)
        if cmd == "/check":
            return cmd_check(username)
        if cmd == "/done":
            return cmd_done(username, rest.strip(), sender)
        if cmd == "/release":
            return cmd_release(username, sender)

    return None  # not a command we know; stay quiet in group chats


async def poller():
    if not TELEGRAM_BOT_TOKEN:
        # Don't crash-loop under docker restart policies; idle until configured.
        print(
            "TELEGRAM_BOT_TOKEN is not set (get one from @BotFather, put it in "
            "outreach-bot/.env, then restart this container). Sleeping.",
            flush=True,
        )
        while True:
            await asyncio.sleep(3600)
    api = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
    offset = 0
    print("outreach bot: polling for messages...", flush=True)
    while True:
        try:
            async with httpx.AsyncClient(timeout=40) as client:
                resp = await client.get(
                    f"{api}/getUpdates", params={"offset": offset, "timeout": 25}
                )
                data = resp.json()
                if not data.get("ok"):
                    print(f"getUpdates error: {data}", flush=True)
                    await asyncio.sleep(5)
                    continue
                for update in data.get("result", []):
                    offset = update["update_id"] + 1
                    try:
                        await handle_update(client, api, update)
                    except Exception as e:
                        print(f"update error: {e!r}", flush=True)
        except Exception as e:
            print(f"poller error: {e!r}", flush=True)
            await asyncio.sleep(5)


async def handle_update(client: httpx.AsyncClient, api: str, update: dict):
    msg = update.get("message") or {}
    chat_id = (msg.get("chat") or {}).get("id")
    sender = msg.get("from") or {}
    text = msg.get("text") or ""
    if not chat_id or not text:
        return
    reply = await handle_command(text, sender)
    if reply:
        await client.post(
            f"{api}/sendMessage",
            json={"chat_id": chat_id, "text": reply, "disable_web_page_preview": True},
        )


if __name__ == "__main__":
    load_contacts()
    asyncio.run(poller())
