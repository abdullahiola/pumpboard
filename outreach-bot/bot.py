"""Outreach bot: coordinates GitHub outreach across a team via Telegram.

Before messaging a developer, a teammate reserves them here. The bot keeps
one shared database, so a second reservation attempt is rejected and the
team never double-messages the same person.

Commands:
  /add <repo, user, or link>      add a contact as yours
  /check <github user>            see if they're added, and by whom
  /done <github user> [note]      mark your outreach as sent
  /release <github user>          give the contact back
  /list                           your contacts
  /list all                       recent activity across the team
  /find <stars> [language]        discover repos by star range, e.g.
                                  /find 4000-5000 python
  /export <stars> [language]      full results + contacts as CSV
  /help                           this summary

You can also paste GitHub links or usernames with no command at all,
and the bot replies with each one's status (free / added / contacted).
With /autoadd on (off by default, per chat), pasting instead adds the
free ones to whoever pasted them.

Add the bot to your team group chat, or let each teammate DM it. Either
way the database is shared, so duplicates are caught everywhere.
"""

import asyncio
import csv
import io
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

SETTINGS_FILE = DATA_DIR / "settings.json"
# chat_id -> {"autoadd": bool}
_settings: dict = {}


def load_settings():
    global _settings
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                _settings = json.load(f)
        except (json.JSONDecodeError, OSError):
            _settings = {}


def save_settings():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = SETTINGS_FILE.with_suffix(".json.tmp")
    with open(tmp, "w") as f:
        json.dump(_settings, f, indent=2)
    tmp.replace(SETTINGS_FILE)


def autoadd_enabled(chat_id) -> bool:
    return bool(_settings.get(str(chat_id), {}).get("autoadd"))


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
OWNER_REPO_RE = re.compile(r"^([A-Za-z0-9-]+)/[\w.-]+$")
USERNAME_RE = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$")


def normalize_username(raw: str) -> str | None:
    """Accept a bare username, @username, owner/repo shorthand, or a
    github.com profile/repo URL. Always resolves to the owner."""
    raw = raw.strip().lstrip("@")
    m = GITHUB_URL_RE.match(raw) or OWNER_REPO_RE.match(raw)
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
    "Before you contact a developer, add them:\n"
    "/add <repo, username, or github link>\n\n"
    "Other commands:\n"
    "/check <username> · see if they're already added, and by whom\n"
    "/done <username> [note] · mark your outreach as sent\n"
    "/release <username> · give the contact back\n"
    "/list · your contacts\n"
    "/list all · recent team activity\n"
    "/find 4000-5000 python · discover repos by star range\n"
    "/export 4000-5000 python · full results + contact info as CSV\n\n"
    "Or just paste GitHub links or usernames (no command) and I'll "
    "tell you which are free and which are taken. With /autoadd on, "
    "pasting adds the free ones to you instead."
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
            return f"👍 You already added {username}."
        when = fmt_when(rec.get("reservedAt", 0))
        return (
            f"⛔️ {username} was already added by {holder} on {when}.\n"
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
        f"✅ {username} added, they're yours, {who}.\n"
        f"{profile_url(username)}\n"
        f"When you've messaged them: /done {username}"
    )


def cmd_check(username: str) -> str:
    rec = _contacts.get(username)
    if not rec:
        return f"🟢 {username} isn't added yet. Grab them with /add {username}"
    holder = rec.get("reservedBy", "someone")
    if rec.get("status") == "done":
        when = fmt_when(rec.get("doneAt", rec.get("reservedAt", 0)))
        note = f'\n📝 "{rec["note"]}"' if rec.get("note") else ""
        return f"✉️ {username} was contacted by {holder} on {when}.{note}"
    when = fmt_when(rec.get("reservedAt", 0))
    return f"🔒 {username} was added by {holder} on {when}."


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
        return f"🟢 {username} wasn't added."
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
            return "Nothing yet. Add your first contact with /add <username>"
        lines = ["📋 Recent team activity:"]
        for username, rec in items:
            icon = "✉️" if rec.get("status") == "done" else "🔒"
            verb = "contacted" if rec.get("status") == "done" else "added"
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
        return "You have no contacts yet. Grab one with /add <username>"
    mine.sort(key=lambda kv: kv[1].get("reservedAt", 0), reverse=True)
    lines = ["📋 Your contacts:"]
    for username, rec in mine:
        lines.append(f"🔒 {username} · added {fmt_when(rec.get('reservedAt', 0))}")
    lines.append("\nMark one as sent with /done <username>")
    return "\n".join(lines)


STARS_RE = re.compile(r"^(\d+)(?:(?:-|\.\.)(\d+))?$")


def _stars_qualifier(m: re.Match) -> str:
    """GitHub's search API wants 'stars:100..500' or 'stars:>=100'."""
    if m.group(2):
        return f"{m.group(1)}..{m.group(2)}"
    return f">={m.group(1)}"


async def cmd_find(stars_arg: str, language: str) -> str:
    m = STARS_RE.match(stars_arg)
    if not m:
        return (
            "Usage: /find <stars> [language]\n"
            "Examples:\n"
            "/find 4000-5000 · repos with 4000 to 5000 stars\n"
            "/find 1000 python · Python repos with 1000+ stars"
        )
    query = f"stars:{_stars_qualifier(m)}"
    if language:
        query += f" language:{language}"

    async with httpx.AsyncClient(timeout=15) as client:
        total, repos, rate_limited = await _search_repos(client, query, pages=1)
    if rate_limited:
        return "🐢 GitHub search rate limit hit. Try again in a minute."
    if not repos:
        return f"No repos found for {query}."

    owners = _unique_user_owners(repos)
    if not owners:
        return (
            f"Found repos for {query}, but the top results are all orgs, "
            "not individual users. Try a narrower range."
        )

    lines = [f"🔎 {query} · {total} repos, top owners:"]
    for login, repo in list(owners.items())[:10]:
        lines.append(
            f"• {login} · {repo.get('name')} ⭐{repo.get('stargazers_count', 0):,}"
            f" · {_owner_status(login)}\n  {repo.get('html_url', '')}"
        )
    lines.append(
        "\nGrab one with /add <username>, "
        "or /export for the full list as a spreadsheet"
    )
    return "\n".join(lines)


def _gh_headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


async def _search_repos(client, query: str, pages: int):
    """Fetch up to `pages` x 100 repos sorted by stars. Returns
    (total_count, repos, rate_limited)."""
    repos, total = [], 0
    for page in range(1, pages + 1):
        resp = await client.get(
            "https://api.github.com/search/repositories",
            params={
                "q": query, "sort": "stars", "order": "desc",
                "per_page": 100, "page": page,
            },
            headers=_gh_headers(),
        )
        if resp.status_code == 403:
            return total, repos, True
        data = resp.json()
        total = data.get("total_count", total)
        items = data.get("items") or []
        repos.extend(items)
        if len(items) < 100:
            break
    return total, repos, False


def _unique_user_owners(repos: list) -> dict:
    """login -> their highest-starred repo, individual users only (orgs
    can't be direct-messaged). Preserves stars-descending order."""
    owners: dict = {}
    for repo in repos:
        owner = repo.get("owner") or {}
        login = owner.get("login", "")
        if login and owner.get("type") == "User" and login.lower() not in owners:
            owners[login.lower()] = repo
    return owners


def _owner_status(login: str) -> str:
    rec = _contacts.get(login.lower())
    if rec and rec.get("status") == "done":
        return f"✉️ contacted by {rec.get('reservedBy')}"
    if rec:
        return f"🔒 added by {rec.get('reservedBy')}"
    return "🟢 free"


async def build_prospects_csv(stars_arg: str, language: str):
    """Search a star range, enrich each owner with their public profile,
    and return (filename, csv_bytes, caption). Returns an error string
    on bad input or rate limiting."""
    m = STARS_RE.match(stars_arg)
    if not m:
        return (
            "Usage: /export <stars> [language]\n"
            "Example: /export 4000-5000 python\n"
            "Sends a CSV of repo owners in that range with their public "
            "contact info."
        )
    query = f"stars:{_stars_qualifier(m)}"
    if language:
        query += f" language:{language}"

    # Each owner costs one profile request. Anonymous core API allows only
    # 60/hour, so stay well under it; a token allows 5000/hour.
    owner_cap = 200 if GITHUB_TOKEN else 25

    async with httpx.AsyncClient(timeout=30) as client:
        total, repos, rate_limited = await _search_repos(client, query, pages=3)
        if rate_limited and not repos:
            return "🐢 GitHub search rate limit hit. Try again in a minute."
        owners = _unique_user_owners(repos)
        if not owners:
            return f"No individual repo owners found for {query}."
        capped = list(owners.items())[:owner_cap]

        sem = asyncio.Semaphore(10)

        async def fetch_profile(login: str):
            async with sem:
                try:
                    r = await client.get(
                        f"https://api.github.com/users/{login}",
                        headers=_gh_headers(),
                    )
                    if r.status_code == 200:
                        return r.json()
                except httpx.RequestError:
                    pass
                return {}

        profiles = await asyncio.gather(
            *(fetch_profile(repo["owner"]["login"]) for _, repo in capped)
        )

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "username", "name", "email", "blog", "twitter", "company",
        "location", "followers", "top_repo", "repo_url", "repo_stars",
        "profile_url", "status", "status_by",
    ])
    emails = 0
    for (login, repo), prof in zip(capped, profiles):
        if prof.get("email"):
            emails += 1
        rec = _contacts.get(login) or {}
        w.writerow([
            repo["owner"]["login"],
            prof.get("name") or "",
            prof.get("email") or "",
            prof.get("blog") or "",
            prof.get("twitter_username") or "",
            prof.get("company") or "",
            prof.get("location") or "",
            prof.get("followers", ""),
            repo.get("name", ""),
            repo.get("html_url", ""),
            repo.get("stargazers_count", ""),
            f"https://github.com/{repo['owner']['login']}",
            rec.get("status") or "free",
            rec.get("reservedBy") or "",
        ])

    safe_range = stars_arg.replace("..", "-")
    filename = f"prospects_{safe_range}{'_' + language if language else ''}.csv"
    caption = (
        f"📊 {len(capped)} owners for {query} ({total} repos matched). "
        f"{emails} have a public email; blog/twitter columns are fallbacks."
    )
    if not GITHUB_TOKEN:
        caption += (
            "\n⚠️ Capped at 25 without a GITHUB_TOKEN; add one to "
            "outreach-bot/.env for up to 200."
        )
    elif len(owners) > owner_cap:
        caption += f"\nCapped at {owner_cap}; narrow the range for full coverage."
    return filename, buf.getvalue().encode(), caption


def extract_github_refs(text: str, chat_type: str) -> list[str]:
    """Pull GitHub usernames out of free-form pasted text: profile/repo
    URLs, @names, and owner/repo tokens. Bare words are only treated as
    usernames in a private chat where the whole message looks like a
    pasted list, so the bot doesn't butt into normal group conversation."""
    refs: list[str] = []
    seen: set[str] = set()

    def add(login: str):
        login = login.lower()
        if login not in seen and USERNAME_RE.match(login):
            seen.add(login)
            refs.append(login)

    for m in GITHUB_URL_RE.finditer(text):
        add(m.group(1))

    bare: list[str] = []
    list_like = True
    for tok in re.split(r"[\s,;]+", text):
        tok = tok.strip(".,;:()<>*").rstrip("/")
        if not tok or "github.com" in tok.lower():
            continue
        if tok.startswith("@"):
            add(tok.lstrip("@"))
        elif (m := OWNER_REPO_RE.match(tok)):
            add(m.group(1))
        elif USERNAME_RE.match(tok):
            bare.append(tok)
        else:
            list_like = False
    if chat_type == "private" and list_like:
        for tok in bare:
            add(tok)
    return refs[:30]


def check_pasted(text: str, chat_type: str) -> str | None:
    refs = extract_github_refs(text, chat_type)
    if not refs:
        return None
    if len(refs) == 1:
        return cmd_check(refs[0])
    lines = [f"📋 Checked {len(refs)} contacts:"]
    free = 0
    for login in refs:
        status = _owner_status(login)
        free += status.startswith("🟢")
        lines.append(f"• {login} · {status}")
    lines.append(f"\n{free} of {len(refs)} are free. Grab one with /add <username>")
    return "\n".join(lines)


def autoadd_pasted(text: str, chat_type: str, sender: dict) -> str | None:
    """With /autoadd on: pasted contacts that are free get added to the
    paster on the spot; taken ones are reported instead."""
    refs = extract_github_refs(text, chat_type)
    if not refs:
        return None
    if len(refs) == 1 and refs[0] not in _contacts:
        return cmd_reserve(refs[0], sender)
    added, taken = [], []
    for login in refs:
        if login in _contacts:
            taken.append(f"• {login} · {_owner_status(login)}")
        else:
            _contacts[login] = {
                "reservedBy": display_name(sender),
                "reservedById": str(sender.get("id")),
                "reservedAt": time.time(),
                "status": "reserved",
            }
            added.append(f"• {login}")
    if added:
        save_contacts()
    lines = []
    if added:
        lines.append(f"✅ Added {len(added)} to you, {display_name(sender)}:")
        lines += added
    if taken:
        if lines:
            lines.append("")
        lines.append("⛔️ Already taken:")
        lines += taken
    if added:
        lines.append("\nMark sent with /done <username>, undo with /release")
    return "\n".join(lines)


def cmd_autoadd(chat_id, arg: str) -> str:
    arg = arg.lower()
    if arg in ("on", "off"):
        _settings.setdefault(str(chat_id), {})["autoadd"] = arg == "on"
        save_settings()
        if arg == "on":
            return (
                "🪄 Auto-add is ON for this chat. Paste GitHub links or "
                "usernames and free ones are added to whoever pasted them. "
                "Turn off with /autoadd off"
            )
        return "👌 Auto-add is OFF. Pasting now only checks."
    state = "on" if autoadd_enabled(chat_id) else "off"
    return f"Auto-add is {state} for this chat. Use /autoadd on or /autoadd off."


async def handle_command(
    text: str, sender: dict, chat_type: str = "private", chat_id: str = ""
) -> str | None:
    parts = text.strip().split(maxsplit=2)
    if not parts:
        return None
    if not parts[0].startswith("/"):
        if autoadd_enabled(chat_id):
            return autoadd_pasted(text, chat_type, sender)
        return check_pasted(text, chat_type)
    cmd = parts[0].lower().split("@")[0]  # strip @BotName suffix in groups
    arg = parts[1] if len(parts) > 1 else ""
    rest = parts[2] if len(parts) > 2 else ""

    if cmd in ("/start", "/help"):
        return HELP_TEXT

    if cmd == "/list":
        return cmd_list(sender, show_all=arg.lower() == "all")

    if cmd == "/autoadd":
        return cmd_autoadd(chat_id, arg)

    if cmd == "/find":
        return await cmd_find(arg, rest.strip())

    if cmd == "/reserve":  # legacy alias
        cmd = "/add"
    if cmd in ("/add", "/check", "/done", "/release"):
        if not arg:
            return f"Usage: {cmd} <repo, username, or github link>"
        if rest and cmd != "/done":  # e.g. "/add Linus Torvalds"
            return (
                f"🤔 One GitHub username, repo, or link at a time, "
                f"e.g. {cmd} torvalds"
            )
        username = normalize_username(arg)
        if not username:
            return f"🤔 That doesn't look like a GitHub username, repo, or link: {arg}"
        if cmd == "/add":
            return cmd_reserve(username, sender)
        if cmd == "/check":
            return cmd_check(username)
        if cmd == "/done":
            return cmd_done(username, rest.strip(), sender)
        if cmd == "/release":
            return cmd_release(username, sender)

    return None  # not a command we know; stay quiet in group chats


BOT_COMMANDS = [
    {"command": "add", "description": "Add a contact as yours: /add torvalds"},
    {"command": "check", "description": "See if a contact is already added, and by whom"},
    {"command": "done", "description": "Mark outreach as sent, optional note"},
    {"command": "release", "description": "Give a contact back"},
    {"command": "list", "description": "Your reservations (or: /list all)"},
    {"command": "find", "description": "Discover repos by stars: /find 4000-5000 python"},
    {"command": "export", "description": "Full results as CSV: /export 4000-5000 python"},
    {"command": "autoadd", "description": "Pasting adds instead of checks: /autoadd on|off"},
    {"command": "help", "description": "Show all commands"},
]


async def register_commands(client: httpx.AsyncClient, api: str):
    """Populate Telegram's '/' autocomplete menu with our commands."""
    try:
        resp = await client.post(f"{api}/setMyCommands", json={"commands": BOT_COMMANDS})
        if not resp.json().get("ok"):
            print(f"setMyCommands error: {resp.text}", flush=True)
    except httpx.RequestError as e:
        print(f"setMyCommands failed: {e!r}", flush=True)


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
    async with httpx.AsyncClient(timeout=15) as client:
        await register_commands(client, api)
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
    parts = text.strip().split(maxsplit=2)
    cmd = parts[0].lower().split("@")[0] if parts else ""
    if cmd == "/export":
        arg = parts[1] if len(parts) > 1 else ""
        rest = parts[2] if len(parts) > 2 else ""
        await client.post(
            f"{api}/sendChatAction",
            json={"chat_id": chat_id, "action": "upload_document"},
        )
        result = await build_prospects_csv(arg, rest.strip())
        if isinstance(result, str):  # usage or error message
            await client.post(
                f"{api}/sendMessage", json={"chat_id": chat_id, "text": result}
            )
            return
        filename, csv_bytes, caption = result
        await client.post(
            f"{api}/sendDocument",
            data={"chat_id": str(chat_id), "caption": caption},
            files={"document": (filename, csv_bytes, "text/csv")},
        )
        return

    reply = await handle_command(
        text,
        sender,
        chat_type=(msg.get("chat") or {}).get("type", "private"),
        chat_id=str(chat_id),
    )
    if reply:
        await client.post(
            f"{api}/sendMessage",
            json={"chat_id": chat_id, "text": reply, "disable_web_page_preview": True},
        )


if __name__ == "__main__":
    load_contacts()
    load_settings()
    asyncio.run(poller())
