import asyncio
import io
import json
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal, Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field, field_validator

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _cache.update(load_github_cache())
    _visit_stats.update(load_visit_stats())
    refresher = asyncio.create_task(github_refresher())
    poller = asyncio.create_task(telegram_poller())
    yield
    refresher.cancel()
    poller.cancel()


app = FastAPI(title="PumpBoard API", version="1.0.0", lifespan=lifespan)

# Admin auth
ADMIN_KEY = os.getenv("ADMIN_KEY", "")


async def require_admin(x_api_key: str = Header(default="")):
    """Dependency that checks X-API-Key header against ADMIN_KEY."""
    if not ADMIN_KEY:
        raise HTTPException(status_code=500, detail="ADMIN_KEY not configured on server")
    if x_api_key != ADMIN_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
DATA_DIR = Path(__file__).parent / "data"
DEVELOPERS_FILE = DATA_DIR / "developers.json"
STATS_FILE = DATA_DIR / "stats.json"
STORIES_FILE = DATA_DIR / "stories.json"
# Listing applications from /contact; personal data, so kept out of git
APPLICATIONS_FILE = DATA_DIR / "applications.json"
STATIC_DIR = Path(__file__).parent / "static"
UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Serve uploaded files at /uploads/*
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Telegram visitor alerts
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")  # optional extra recipient
TELEGRAM_CHAT_FILE = Path(__file__).parent / "data" / "telegram_chat.json"  # legacy single-owner file
TELEGRAM_SUBS_FILE = Path(__file__).parent / "data" / "telegram_subscribers.json"
_subscribers: set[str] | None = None
VISIT_SECRET = os.getenv("VISIT_SECRET", "")  # optional shared secret with the frontend

# Lets the backend expire the frontend's cached API data right after a story
# changes, instead of waiting out the hour-long fetch cache
FRONTEND_URL_INTERNAL = os.getenv("FRONTEND_URL_INTERNAL", "http://localhost:3000")
REVALIDATE_SECRET = os.getenv("REVALIDATE_SECRET", "")
_background_tasks: set = set()
VISIT_COOLDOWN = 3600  # at most one alert per visitor per hour
_visit_notified: dict = {}  # visitor key -> last alert timestamp

# Aggregate visit stats, persisted to data/visits.json
VISITS_FILE = DATA_DIR / "visits.json"
_visit_stats: dict = {"total": 0, "byCountry": {}, "byDevice": {}, "byPath": {}}
_geo_cache: dict = {}  # ip -> (location string, country)

# GitHub config
GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_CACHE_FILE = DATA_DIR / "github_cache.json"
REFRESH_INTERVAL = 3.5 * 24 * 3600  # refresh each profile roughly twice a week
REFRESH_CHECK_EVERY = 6 * 3600  # background task wakes up every 6 hours

# Cache: { "username:repo": { data: {...}, fetched_at: timestamp } }
# Persisted to GITHUB_CACHE_FILE so it survives restarts. Requests are always
# served from this cache; only the background refresher talks to GitHub
# (except the very first fetch for a profile not cached yet).
_cache: dict = {}


def load_github_cache() -> dict:
    if not GITHUB_CACHE_FILE.exists():
        return {}
    try:
        with open(GITHUB_CACHE_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_github_cache():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(GITHUB_CACHE_FILE, "w") as f:
        json.dump(_cache, f, indent=2)


# --- Models ---

class DeveloperIn(BaseModel):
    github: str = ""
    repo: str = ""  # format: "owner/repo-name"
    type: str = "developer"  # "developer" or "creator"
    tags: list[str] = []
    totalClaimed: float = 0
    solAmount: float = 0
    instagram: str = ""
    tiktok: str = ""
    x: str = ""  # Twitter/X handle
    website: str = ""  # personal/project website URL
    name: Optional[str] = None
    bio: Optional[str] = None
    summary: Optional[str] = None  # short description of what they built
    avatar_url: Optional[str] = None
    project_icon: str = ""  # the repo's logo in the Active Projects list; "" uses the repo owner's GitHub avatar

    @field_validator("repo")
    @classmethod
    def _normalize_repo(cls, v: str) -> str:
        return normalize_repo(v)


class DeveloperOut(BaseModel):
    github: str = ""
    repo: str = ""
    type: str = "developer"
    tags: list[str] = []
    totalClaimed: float = 0
    solAmount: float = 0
    instagram: str = ""
    tiktok: str = ""
    x: str = ""
    website: str = ""
    # Live GitHub fields (developers only)
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    summary: Optional[str] = None
    public_repos: int = 0
    followers: int = 0
    stars: int = 0
    repo_url: str = ""
    languages: list[str] = []
    project_icon: str = ""
    story_slug: str = ""  # newest published story about this developer, if any


StoryKind = Literal["milestone", "spotlight", "update"]


class StoryIn(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")  # used in the /journal/{slug} URL
    kind: StoryKind = "spotlight"
    github: str = ""  # links the post to a listed developer; required for spotlights
    title: str = Field(min_length=1)
    excerpt: str = ""
    # Plain text; blank lines split paragraphs, "## " starts a subheading and
    # a line of just ![alt](url) is an image
    body: str = ""
    image: str = ""  # cover image URL, usually from /api/upload
    stat: str = ""  # milestones: the headline number, e.g. "$200K+"
    # The post's announcement on X, shown as a "View on X" button
    x_url: str = Field(default="", pattern=r"^(https://(www\.)?(x|twitter)\.com/\S+)?$")
    author_name: str = ""  # the admin who wrote it; spotlights fall back to the developer
    author_avatar: str = ""
    published: bool = False
    pinned: bool = False  # takes the big slot at the top of /journal; one post at a time
    date: str = ""  # YYYY-MM-DD, defaults to today on create


class StoryOut(BaseModel):
    slug: str
    kind: StoryKind = "spotlight"
    github: str = ""
    title: str
    excerpt: str = ""
    body: str = ""
    image: str = ""
    stat: str = ""
    x_url: str = ""
    author_name: str = ""
    author_avatar: str = ""
    published: bool = False
    pinned: bool = False
    date: str = ""
    # Filled from the linked developer profile
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    repo: str = ""
    repo_url: str = ""
    views: int = 0  # human page views of /journal/{slug}, bots excluded


class AdminStoryOut(StoryOut):
    preview_token: str = ""  # lets a draft be opened at /journal/{slug}?preview=...


# --- Data helpers ---

def normalize_repo(repo: str) -> str:
    """Accept "owner/name" or a pasted github.com URL; store and query "owner/name"."""
    repo = (repo or "").strip()
    for prefix in ("https://github.com/", "http://github.com/", "https://www.github.com/", "github.com/"):
        if repo.lower().startswith(prefix):
            repo = repo[len(prefix):]
            break
    return repo.removesuffix(".git").strip("/")


def load_developers() -> list[dict]:
    if not DEVELOPERS_FILE.exists():
        return []
    with open(DEVELOPERS_FILE, "r") as f:
        devs = json.load(f)
    # Older entries were saved with a full URL, which broke the GitHub lookup
    for d in devs:
        if d.get("repo"):
            d["repo"] = normalize_repo(d["repo"])
    return devs


def save_developers(devs: list[dict]):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DEVELOPERS_FILE, "w") as f:
        json.dump(devs, f, indent=2)


def load_stories() -> list[dict]:
    if not STORIES_FILE.exists():
        return []
    with open(STORIES_FILE, "r") as f:
        return json.load(f)


def save_stories(stories: list[dict]):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(STORIES_FILE, "w") as f:
        json.dump(stories, f, indent=2)


DEFAULT_STATS = {
    "totalDonated": 0,
    "developers": 0,
    "transactions": 0,
    "activeProjects": 0,
}


def load_stats() -> dict:
    if not STATS_FILE.exists():
        return {**DEFAULT_STATS}
    with open(STATS_FILE, "r") as f:
        return json.load(f)


def save_stats(data: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATS_FILE, "w") as f:
        json.dump(data, f, indent=2)


# --- GitHub API helpers ---

# GitHub reports a spent budget as 403/429 with x-ratelimit-remaining: 0.
# Remember when it resets so we stop spending requests on a limit we know
# is exhausted — without this, every call re-tries the full fan-out.
_rate_limited_until: float = 0.0


def _github_headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _github_ok(resp: httpx.Response, what: str) -> bool:
    """True if the response carries data; otherwise say why it didn't.

    A rate-limited or errored response is a perfectly normal HTTP reply, so
    it never raises — without this it would fail the status check silently
    and surface as a profile with no name and no avatar.
    """
    global _rate_limited_until

    if resp.status_code == 200:
        return True

    if resp.status_code in (403, 429) and resp.headers.get("x-ratelimit-remaining") == "0":
        try:
            reset = float(resp.headers.get("x-ratelimit-reset", 0))
        except ValueError:
            reset = 0.0
        _rate_limited_until = reset
        minutes = max(0, int((reset - time.time()) // 60))
        hint = (
            "set GITHUB_TOKEN in backend/.env for 5000 req/hr"
            if not GITHUB_TOKEN
            else "the token's hourly budget is spent"
        )
        print(
            f"github: rate limited fetching {what} — resets in ~{minutes}m ({hint})",
            flush=True,
        )
    else:
        print(f"github: {what} returned HTTP {resp.status_code}", flush=True)

    return False


async def fetch_github_profile(username: str, repo: str = "", force: bool = False) -> dict:
    """Fetch user profile, repo stars, and top languages from GitHub.

    Serves from the persistent cache regardless of age — freshness is the
    background refresher's job. Pass force=True to hit GitHub directly.
    """
    cache_key = f"{username}:{repo}"
    now = time.time()

    if cache_key in _cache and not force:
        return _cache[cache_key]["data"]

    headers = _github_headers()
    result = {
        "name": None,
        "avatar_url": None,
        "bio": None,
        "public_repos": 0,
        "followers": 0,
        "stars": 0,
        "repo_url": "",
        "languages": [],
    }
    fetch_ok = False  # only cache when GitHub actually answered

    # Rate limited and not yet reset: serve what we have rather than spend
    # requests that we already know will be refused
    if now < _rate_limited_until:
        if cache_key in _cache:
            return _cache[cache_key]["data"]
        return result

    async with httpx.AsyncClient(timeout=10) as client:
        # Fetch profile
        try:
            resp = await client.get(f"{GITHUB_API}/users/{username}", headers=headers)
            if _github_ok(resp, f"profile {username}"):
                data = resp.json()
                fetch_ok = True
                result["name"] = data.get("name") or data.get("login", username)
                result["avatar_url"] = data.get("avatar_url")
                result["bio"] = data.get("bio")
                result["public_repos"] = data.get("public_repos", 0)
                result["followers"] = data.get("followers", 0)
        except httpx.RequestError:
            pass

        # Fetch specific repo stars if repo is provided
        if repo:
            try:
                resp = await client.get(f"{GITHUB_API}/repos/{repo}", headers=headers)
                if _github_ok(resp, f"repo {repo}"):
                    repo_data = resp.json()
                    result["stars"] = repo_data.get("stargazers_count", 0)
                    result["repo_url"] = repo_data.get("html_url", f"https://github.com/{repo}")
                    lang = repo_data.get("language")
                    if lang:
                        result["languages"] = [lang]
            except httpx.RequestError:
                pass
        else:
            # Fallback: sum stars from recent repos
            try:
                resp = await client.get(
                    f"{GITHUB_API}/users/{username}/repos",
                    headers=headers,
                    params={"sort": "updated", "per_page": 20},
                )
                if _github_ok(resp, f"repos of {username}"):
                    repos = resp.json()
                    result["stars"] = sum(r.get("stargazers_count", 0) for r in repos)
                    langs = []
                    for r in repos:
                        lang = r.get("language")
                        if lang and lang not in langs:
                            langs.append(lang)
                    result["languages"] = langs[:5]
            except httpx.RequestError:
                pass

    if fetch_ok:
        _cache[cache_key] = {"data": result, "fetched_at": now}
        save_github_cache()
    elif cache_key in _cache:
        # GitHub unavailable (rate limit/outage): serve the last good data
        return _cache[cache_key]["data"]

    return result


async def github_refresher():
    """Background task: re-fetch each developer's GitHub data when the cached
    copy is older than REFRESH_INTERVAL (about twice a week)."""
    while True:
        try:
            now = time.time()
            for dev in load_developers():
                if dev.get("type") == "creator" or not dev.get("github"):
                    continue
                cache_key = f"{dev['github']}:{dev.get('repo', '')}"
                entry = _cache.get(cache_key)
                if not entry or now - entry.get("fetched_at", 0) > REFRESH_INTERVAL:
                    await fetch_github_profile(dev["github"], dev.get("repo", ""), force=True)
        except Exception:
            pass  # never let a bad cycle kill the refresher
        await asyncio.sleep(REFRESH_CHECK_EVERY)


def evict_cached_github(username: str):
    """Drop all cached entries for a GitHub username (any repo)."""
    stale = [k for k in _cache if k.split(":", 1)[0] == username]
    for k in stale:
        _cache.pop(k, None)
    if stale:
        save_github_cache()


async def enrich_developer(dev: dict) -> dict:
    """Merge stored developer data with live GitHub data (developers only)."""
    if dev.get("type") == "creator" or not dev.get("github"):
        return dev
    github_data = await fetch_github_profile(dev["github"], dev.get("repo", ""))
    merged = {**dev, **github_data}
    # Admin-set fields take priority over live GitHub data
    for field in ("name", "bio", "avatar_url"):
        if dev.get(field):
            merged[field] = dev[field]
    return merged


# --- Visitor alerts ---

class VisitIn(BaseModel):
    path: str = ""
    ip: str = ""
    userAgent: str = ""
    referrer: str = ""
    language: str = ""


BOT_UA_MARKERS = (
    "bot", "crawler", "spider", "crawl", "slurp", "curl", "wget",
    "python-requests", "httpx", "go-http-client", "claude", "gpt",
    "anthropic", "openai", "perplexity", "headless",
)


def _looks_like_bot(user_agent: str) -> bool:
    ua = user_agent.lower()
    return not ua or any(marker in ua for marker in BOT_UA_MARKERS)


def _classify_device(user_agent: str) -> str:
    if _looks_like_bot(user_agent):
        return "Bot"
    ua = user_agent.lower()
    if "ipad" in ua or "tablet" in ua:
        return "Tablet"
    if "iphone" in ua or "android" in ua or "mobi" in ua:
        return "Mobile"
    return "Desktop"


def load_visit_stats() -> dict:
    if not VISITS_FILE.exists():
        return {}
    try:
        with open(VISITS_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_visit_stats():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(VISITS_FILE, "w") as f:
        json.dump(_visit_stats, f, indent=2)


async def _lookup_geo(client: httpx.AsyncClient, ip: str) -> dict:
    """Best-effort geo/ISP lookup (free tier, no key needed)."""
    if not ip:
        return {}
    if ip in _geo_cache:
        return _geo_cache[ip]
    try:
        resp = await client.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,country,regionName,city,isp,timezone,proxy,mobile"},
        )
        geo = resp.json()
        if geo.get("status") == "success":
            info = {
                "location": ", ".join(
                    filter(None, [geo.get("city"), geo.get("regionName"), geo.get("country")])
                ),
                "country": geo.get("country") or "",
                "isp": geo.get("isp") or "",
                "timezone": geo.get("timezone") or "",
                "proxy": bool(geo.get("proxy")),
                "cellular": bool(geo.get("mobile")),
            }
            if len(_geo_cache) > 5000:
                _geo_cache.clear()
            _geo_cache[ip] = info
            return info
    except (httpx.RequestError, ValueError):
        pass
    return {}


def _parse_ua(user_agent: str) -> tuple[str, str]:
    """Best-effort (OS, browser) from a user agent string."""
    ua = user_agent.lower()
    if "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    elif "android" in ua:
        os_name = "Android"
    elif "windows" in ua:
        os_name = "Windows"
    elif "mac os" in ua or "macintosh" in ua:
        os_name = "macOS"
    elif "linux" in ua:
        os_name = "Linux"
    else:
        os_name = ""

    if "edg/" in ua or "edge/" in ua:
        browser = "Edge"
    elif "opr/" in ua or "opera" in ua:
        browser = "Opera"
    elif "samsungbrowser" in ua:
        browser = "Samsung Browser"
    elif "firefox/" in ua or "fxios/" in ua:
        browser = "Firefox"
    elif "chrome/" in ua or "crios/" in ua:
        browser = "Chrome"
    elif "safari/" in ua:
        browser = "Safari"
    else:
        browser = ""
    return os_name, browser


def _referrer_domain(referrer: str) -> str:
    """The site a visitor came from; empty for internal navigation."""
    if not referrer:
        return ""
    domain = referrer.split("//")[-1].split("/")[0]
    return "" if "pumpboard.dev" in domain else domain


def _load_subscribers() -> set[str]:
    """Every chat that gets alerts. Seeded from the legacy single-owner
    file and the TELEGRAM_CHAT_ID env var so existing recipients keep
    getting alerts after the upgrade."""
    global _subscribers
    if _subscribers is not None:
        return _subscribers
    subs: set[str] = set()
    if TELEGRAM_SUBS_FILE.exists():
        try:
            with open(TELEGRAM_SUBS_FILE, "r") as f:
                subs = {str(c) for c in json.load(f).get("chat_ids", [])}
        except (json.JSONDecodeError, OSError):
            pass
    if TELEGRAM_CHAT_FILE.exists():
        try:
            with open(TELEGRAM_CHAT_FILE, "r") as f:
                legacy = str(json.load(f).get("chat_id", ""))
            if legacy:
                subs.add(legacy)
        except (json.JSONDecodeError, OSError):
            pass
    if TELEGRAM_CHAT_ID:
        subs.add(TELEGRAM_CHAT_ID)
    _subscribers = subs
    return subs


def _save_subscribers():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(TELEGRAM_SUBS_FILE, "w") as f:
        json.dump({"chat_ids": sorted(_load_subscribers())}, f)


def _subscribe(chat_id: str) -> bool:
    """Add a chat to the alert list. Returns False if already subscribed."""
    subs = _load_subscribers()
    if chat_id in subs:
        return False
    subs.add(chat_id)
    _save_subscribers()
    return True


def _unsubscribe(chat_id: str) -> bool:
    subs = _load_subscribers()
    if chat_id not in subs:
        return False
    subs.discard(chat_id)
    _save_subscribers()
    return True


def _short(n: int) -> str:
    """Compact count for chat: 950, 1.2k, 100k, 1.5M."""
    if n < 1000:
        return str(n)
    # Largest unit the rounded value still reaches, so 999,950 is 1M, not 1000k
    for div, suffix in ((1_000_000_000, "B"), (1_000_000, "M"), (1_000, "k")):
        value = round(n / div, 1)
        if value >= 1:
            return f"{value:.1f}".removesuffix(".0") + suffix
    return str(n)


def _stats_message() -> str:
    def top(bucket: dict, n: int = 5):
        return sorted(bucket.items(), key=lambda kv: kv[1], reverse=True)[:n]

    s = _visit_stats
    lines = ["📊 PumpBoard visit stats", f"Total page views: {_short(s.get('total', 0))}"]
    if s.get("byCountry"):
        lines += ["", "Top locations:"]
        lines += [f"• {name}: {_short(n)}" for name, n in top(s["byCountry"])]
    if s.get("byDevice"):
        lines += ["", "Devices:"]
        lines += [f"• {name}: {_short(n)}" for name, n in top(s["byDevice"], 10)]
    if s.get("byPath"):
        lines += ["", "Top pages:"]
        lines += [f"• {name}: {_short(n)}" for name, n in top(s["byPath"])]
    if s.get("byReferrer"):
        lines += ["", "Top referrers:"]
        lines += [f"• {name}: {_short(n)}" for name, n in top(s["byReferrer"])]
    # Only posts still published, by title; views are human, bots excluded
    titles = {st["slug"]: st["title"] for st in load_stories() if st.get("published")}
    story_views = {titles[slug]: n for slug, n in s.get("storyViews", {}).items() if slug in titles}
    if story_views:
        lines += ["", "Top Journal posts:"]
        lines += [f"• {title}: {_short(n)}" for title, n in top(story_views)]
    return "\n".join(lines)


def _visit_alert_text(v: VisitIn, geo: dict, device: str) -> str:
    os_name, browser = _parse_ua(v.userAgent)
    ref_domain = _referrer_domain(v.referrer)

    if device == "Bot":
        lines = ["🤖 Bot visit · pumpboard.dev", ""]
        lines.append(f"📄 Page: {v.path or '/'}")
        if v.userAgent:
            lines.append(f"🆔 {v.userAgent[:150]}")
    else:
        icon = "📱" if device in ("Mobile", "Tablet") else "💻"
        lines = ["👀 New visitor · pumpboard.dev", ""]
        lines.append(f"📄 Page: {v.path or '/'}")
        device_desc = " · ".join(filter(None, [device, os_name, browser]))
        if device_desc:
            lines.append(f"{icon} {device_desc}")
        if v.language:
            lines.append(f"🗣 Language: {v.language}")

    if geo.get("location"):
        lines.append(f"📍 {geo['location']}")
    if geo.get("isp"):
        isp_line = f"📡 {geo['isp']}"
        if geo.get("cellular"):
            isp_line += " (cellular)"
        if geo.get("proxy"):
            isp_line += " ⚠️ VPN/proxy"
        lines.append(isp_line)
    if ref_domain:
        lines.append(f"🔗 From: {ref_domain}")
    if geo.get("timezone"):
        lines.append(f"🕒 {geo['timezone']}")
    if v.ip:
        lines.append(f"🌐 {v.ip}")
    return "\n".join(lines)


async def _process_visit(v: VisitIn, notify: bool):
    """Record the visit in the stats and, when allowed, alert via Telegram."""
    async with httpx.AsyncClient(timeout=5) as client:
        geo = await _lookup_geo(client, v.ip)
        device = _classify_device(v.userAgent)
        ref_domain = _referrer_domain(v.referrer)

        _visit_stats["total"] = _visit_stats.get("total", 0) + 1
        counted = [
            ("byCountry", geo.get("country") or "Unknown"),
            ("byDevice", device),
            ("byPath", v.path or "/"),
        ]
        if ref_domain:
            counted.append(("byReferrer", ref_domain))
        story_slug = (v.path or "").removeprefix("/journal/").strip("/")
        if (
            device != "Bot"
            and v.path.startswith("/journal/")
            and any(s["slug"] == story_slug and s.get("published") for s in load_stories())
        ):
            counted.append(("storyViews", story_slug))
        for field, key in counted:
            bucket = _visit_stats.setdefault(field, {})
            bucket[key] = bucket.get(key, 0) + 1
        save_visit_stats()

        chat_ids = _load_subscribers()
        if not (notify and chat_ids and TELEGRAM_BOT_TOKEN):
            return

        text = _visit_alert_text(v, geo, device)
        for chat_id in list(chat_ids):
            try:
                await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={"chat_id": chat_id, "text": text},
                )
            except httpx.RequestError:
                pass


@app.post("/api/visit", status_code=204)
async def track_visit(v: VisitIn, x_visit_secret: str = Header(default="")):
    """Called by the Next.js server on page views; records stats and alerts."""
    if VISIT_SECRET and x_visit_secret != VISIT_SECRET:
        raise HTTPException(status_code=401, detail="Invalid visit secret")

    now = time.time()
    key = v.ip or v.userAgent or "unknown"
    notify = now - _visit_notified.get(key, 0) >= VISIT_COOLDOWN
    if notify:
        _visit_notified[key] = now
        # Keep the dedupe map from growing forever
        if len(_visit_notified) > 10000:
            cutoff = now - VISIT_COOLDOWN
            for k in [k for k, ts in _visit_notified.items() if ts < cutoff]:
                _visit_notified.pop(k, None)

    asyncio.create_task(_process_visit(v, notify))


async def telegram_poller():
    """Long-poll Telegram for incoming messages. Any chat that sends /start
    is subscribed to visitor alerts; /stats replies with the summary and
    /stop unsubscribes."""
    if not TELEGRAM_BOT_TOKEN:
        return
    api = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
    offset = 0
    while True:
        try:
            async with httpx.AsyncClient(timeout=40) as client:
                resp = await client.get(
                    f"{api}/getUpdates", params={"offset": offset, "timeout": 25}
                )
                data = resp.json()
                if not data.get("ok"):
                    print(f"telegram getUpdates error: {data}", flush=True)
                    await asyncio.sleep(5)
                    continue
                for update in data.get("result", []):
                    offset = update["update_id"] + 1
                    try:
                        await _handle_telegram_update(client, api, update)
                    except Exception as e:
                        print(f"telegram update error: {e!r}", flush=True)
        except Exception as e:
            print(f"telegram poller error: {e!r}", flush=True)
            await asyncio.sleep(5)  # network hiccup or Telegram outage; retry


async def _handle_telegram_update(client: httpx.AsyncClient, api: str, update: dict):
    msg = update.get("message") or {}
    chat_id = str((msg.get("chat") or {}).get("id") or "")
    if not chat_id:
        return

    text = (msg.get("text") or "").strip().lower().split("@")[0]
    reply = ""
    if text.startswith("/start"):
        _subscribe(chat_id)
        reply = (
            "✅ Connected. You'll get an alert when someone visits "
            "pumpboard.dev. Send /stats anytime for a summary, or /stop "
            "to stop the alerts.\n\n" + _stats_message()
        )
    elif text.startswith("/stats"):
        _subscribe(chat_id)  # anyone asking for stats wants alerts too
        reply = _stats_message()
    elif text.startswith("/stop"):
        if _unsubscribe(chat_id):
            reply = "👌 Alerts stopped for this chat. Send /start to resume."
        else:
            reply = "This chat wasn't getting alerts. Send /start to subscribe."
    if reply:
        await client.post(
            f"{api}/sendMessage",
            json={"chat_id": chat_id, "text": reply},
        )


# --- Endpoints ---

@app.get("/api/developers", response_model=list[DeveloperOut])
async def list_developers(type: Optional[str] = None):
    """List all developers, optionally filtered by type."""
    devs = load_developers()
    if type:
        devs = [d for d in devs if d.get("type") == type]

    slugs = story_slugs_by_github()
    enriched = []
    for dev in devs:
        profile = await enrich_developer(dev)
        enriched.append({**profile, "story_slug": slugs.get(dev.get("github"), "")})
    return enriched


@app.get("/api/developers/{github}", response_model=DeveloperOut)
async def get_developer(github: str):
    """Get a single developer by GitHub username."""
    devs = load_developers()
    dev = next((d for d in devs if d["github"] == github), None)
    if not dev:
        raise HTTPException(status_code=404, detail="Developer not found")
    profile = await enrich_developer(dev)
    return {**profile, "story_slug": story_slugs_by_github().get(github, "")}


@app.post("/api/developers", response_model=DeveloperOut, status_code=201, dependencies=[Depends(require_admin)])
async def add_developer(dev_in: DeveloperIn):
    """Add a new developer by GitHub username. Requires X-API-Key header."""
    devs = load_developers()

    # Check for duplicates
    if dev_in.type == "creator":
        if dev_in.name and any(d.get("name") == dev_in.name and d.get("type") == "creator" for d in devs):
            raise HTTPException(status_code=409, detail="Creator already exists")
    else:
        if dev_in.github and any(d["github"] == dev_in.github for d in devs):
            raise HTTPException(status_code=409, detail="Developer already exists")

    new_dev = dev_in.model_dump()
    devs.append(new_dev)
    save_developers(devs)
    revalidate_frontend()

    return await enrich_developer(new_dev)


@app.delete("/api/developers/{identifier}", status_code=204, dependencies=[Depends(require_admin)])
async def remove_developer(identifier: str):
    """Remove a developer by GitHub username or creator by name. Requires X-API-Key header."""
    devs = load_developers()
    filtered = [
        d for d in devs
        if d.get("github") != identifier and d.get("name") != identifier
    ]

    if len(filtered) == len(devs):
        raise HTTPException(status_code=404, detail="Profile not found")

    save_developers(filtered)
    evict_cached_github(identifier)


@app.put("/api/developers/{identifier}", response_model=DeveloperOut, dependencies=[Depends(require_admin)])
async def update_developer(identifier: str, updates: dict):
    """Update a developer/creator by GitHub username or name. Requires X-API-Key header."""
    devs = load_developers()
    target = None
    for d in devs:
        if d.get("github") == identifier or d.get("name") == identifier:
            target = d
            break

    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")

    allowed_fields = {
        "github", "repo", "type", "tags", "totalClaimed", "solAmount",
        "instagram", "tiktok", "x", "website", "name", "bio", "summary",
        "avatar_url", "project_icon",
    }
    for key, value in updates.items():
        if key in allowed_fields:
            target[key] = value

    save_developers(devs)
    evict_cached_github(identifier)
    revalidate_frontend()
    return await enrich_developer(target)


# --- Stories endpoints ---

async def enrich_story(story: dict, devs: list[dict]) -> dict:
    """Attach the linked developer's name, avatar and repo to a story."""
    views = _visit_stats.get("storyViews", {}).get(story.get("slug"), 0)
    dev = next((d for d in devs if d.get("github") == story.get("github")), None)
    if not dev:
        return {**story, "views": views}
    profile = await enrich_developer(dev)
    return {
        **story,
        "views": views,
        "name": profile.get("name"),
        "avatar_url": profile.get("avatar_url"),
        "repo": profile.get("repo") or "",
        "repo_url": profile.get("repo_url") or "",
    }


def unpin_all(stories: list[dict]):
    """Only one post holds the top slot; pinning another releases it."""
    for s in stories:
        s["pinned"] = False


def sorted_stories(stories: list[dict]) -> list[dict]:
    """Newest first; posts on the same day keep the later-added one on top."""
    order = sorted(enumerate(stories), key=lambda p: (p[1].get("date", ""), p[0]), reverse=True)
    return [s for _, s in order]


def story_slugs_by_github() -> dict:
    """Map each developer to their newest published story's slug."""
    slugs: dict = {}
    for s in sorted_stories([s for s in load_stories() if s.get("published") and s.get("github")]):
        slugs.setdefault(s["github"], s["slug"])
    return slugs


async def _revalidate_frontend():
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(
                f"{FRONTEND_URL_INTERNAL}/api/revalidate",
                headers={"X-Revalidate-Secret": REVALIDATE_SECRET},
                json={"tags": ["stories", "developers"]},
            )
            if resp.status_code != 200:
                print(f"frontend revalidate returned HTTP {resp.status_code}", flush=True)
    except httpx.RequestError as e:
        print(f"frontend revalidate failed: {e!r}", flush=True)


def revalidate_frontend():
    """Fire-and-forget: a story change shows on the site on the next page load."""
    if REVALIDATE_SECRET:
        # Keep a reference so the task isn't garbage-collected before it runs
        task = asyncio.create_task(_revalidate_frontend())
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)


def validate_story(story_in: StoryIn, devs: list[dict]):
    if story_in.kind == "spotlight" and not story_in.github:
        raise HTTPException(status_code=422, detail="A spotlight needs a developer")
    if story_in.github and not any(d.get("github") == story_in.github for d in devs):
        raise HTTPException(status_code=404, detail="No listed developer with that GitHub username")


@app.get("/api/stories", response_model=list[StoryOut])
async def list_stories():
    """List published stories, newest first."""
    devs = load_developers()
    published = [s for s in load_stories() if s.get("published")]
    return [await enrich_story(s, devs) for s in sorted_stories(published)]


@app.get("/api/stories/{slug}", response_model=StoryOut)
async def get_story(slug: str, preview: str = ""):
    """Get a single published story by slug; a draft too with its preview token."""
    story = next((s for s in load_stories() if s["slug"] == slug), None)
    can_preview = bool(preview) and secrets.compare_digest(preview, (story or {}).get("preview_token", ""))
    if not story or not (story.get("published") or can_preview):
        raise HTTPException(status_code=404, detail="Story not found")
    return await enrich_story(story, load_developers())


@app.get("/api/admin/stories", response_model=list[AdminStoryOut], dependencies=[Depends(require_admin)])
async def list_all_stories():
    """List every story, drafts included. Requires X-API-Key header."""
    devs = load_developers()
    return [await enrich_story(s, devs) for s in sorted_stories(load_stories())]


@app.post("/api/stories", response_model=AdminStoryOut, status_code=201, dependencies=[Depends(require_admin)])
async def add_story(story_in: StoryIn):
    """Add a story. Requires X-API-Key header."""
    stories = load_stories()
    if any(s["slug"] == story_in.slug for s in stories):
        raise HTTPException(status_code=409, detail="A story with that slug already exists")
    devs = load_developers()
    validate_story(story_in, devs)

    new_story = story_in.model_dump()
    new_story["preview_token"] = secrets.token_urlsafe(16)
    if not new_story["date"]:
        new_story["date"] = time.strftime("%Y-%m-%d")
    if new_story["pinned"]:
        unpin_all(stories)
    stories.append(new_story)
    save_stories(stories)
    revalidate_frontend()
    return await enrich_story(new_story, devs)


@app.put("/api/stories/{slug}", response_model=AdminStoryOut, dependencies=[Depends(require_admin)])
async def update_story(slug: str, story_in: StoryIn):
    """Replace a story. Requires X-API-Key header."""
    stories = load_stories()
    idx = next((i for i, s in enumerate(stories) if s["slug"] == slug), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Story not found")
    if story_in.slug != slug and any(s["slug"] == story_in.slug for s in stories):
        raise HTTPException(status_code=409, detail="A story with that slug already exists")
    devs = load_developers()
    validate_story(story_in, devs)

    updated = story_in.model_dump()
    updated["date"] = updated["date"] or stories[idx].get("date", "")
    updated["preview_token"] = stories[idx].get("preview_token") or secrets.token_urlsafe(16)
    if updated["pinned"]:
        unpin_all(stories)
    stories[idx] = updated
    save_stories(stories)
    revalidate_frontend()
    return await enrich_story(updated, devs)


@app.delete("/api/stories/{slug}", status_code=204, dependencies=[Depends(require_admin)])
async def remove_story(slug: str):
    """Remove a story. Requires X-API-Key header."""
    stories = load_stories()
    filtered = [s for s in stories if s["slug"] != slug]
    if len(filtered) == len(stories):
        raise HTTPException(status_code=404, detail="Story not found")
    save_stories(filtered)
    revalidate_frontend()


# --- Listing applications (the /contact form) ---

class ApplicationIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    github: str = Field(min_length=1, max_length=100)
    x: str = Field(default="", max_length=100)
    project: str = Field(min_length=1, max_length=300)
    message: str = Field(min_length=1, max_length=4000)
    # Honeypot: hidden on the form, so only bots fill it in
    website: str = ""


APPLICATION_LIMIT = 5  # per IP per hour
_application_times: dict[str, list[float]] = {}


def load_applications() -> list[dict]:
    if not APPLICATIONS_FILE.exists():
        return []
    try:
        with open(APPLICATIONS_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def save_applications(apps: list[dict]):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(APPLICATIONS_FILE, "w") as f:
        json.dump(apps, f, indent=2)


async def _telegram_broadcast(text: str):
    """Send a message to every chat subscribed to the bot."""
    chat_ids = _load_subscribers()
    if not (chat_ids and TELEGRAM_BOT_TOKEN):
        return
    async with httpx.AsyncClient(timeout=5) as client:
        for chat_id in list(chat_ids):
            try:
                await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={"chat_id": chat_id, "text": text},
                )
            except httpx.RequestError:
                pass


def _application_alert_text(app_: dict) -> str:
    lines = ["📝 New listing application · pumpboard.dev", ""]
    lines.append(f"👤 {app_['name']} (github.com/{app_['github']})")
    if app_["x"]:
        lines.append(f"🐦 X: {app_['x']}")
    lines.append(f"📦 {app_['project']}")
    lines += ["", app_["message"][:1500]]
    return "\n".join(lines)


@app.post("/api/applications", status_code=201)
async def submit_application(app_in: ApplicationIn, request: Request):
    """Public: the /contact form. Stored for the admin and sent to the Telegram bot."""
    if app_in.website:
        return {"ok": True}  # a bot filled the honeypot; pretend it worked

    ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
          or (request.client.host if request.client else ""))
    now = time.time()
    recent = [t for t in _application_times.get(ip, []) if now - t < 3600]
    if len(recent) >= APPLICATION_LIMIT:
        raise HTTPException(status_code=429, detail="Too many applications. Try again later.")
    _application_times[ip] = recent + [now]

    new_app = {
        "id": uuid.uuid4().hex,
        "name": app_in.name.strip(),
        "github": app_in.github.strip().removeprefix("@"),
        "x": app_in.x.strip(),
        "project": app_in.project.strip(),
        "message": app_in.message.strip(),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
    }
    apps = load_applications()
    apps.append(new_app)
    save_applications(apps)

    task = asyncio.create_task(_telegram_broadcast(_application_alert_text(new_app)))
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)
    return {"ok": True}


@app.get("/api/admin/applications", dependencies=[Depends(require_admin)])
async def list_applications():
    """List listing applications, newest first. Requires X-API-Key header."""
    return list(reversed(load_applications()))


@app.delete("/api/applications/{app_id}", status_code=204, dependencies=[Depends(require_admin)])
async def remove_application(app_id: str):
    """Remove a handled application. Requires X-API-Key header."""
    apps = load_applications()
    filtered = [a for a in apps if a.get("id") != app_id]
    if len(filtered) == len(apps):
        raise HTTPException(status_code=404, detail="Application not found")
    save_applications(filtered)


# --- Stats endpoints ---

def compute_stats() -> dict:
    """Derive stats from profiles and visits; only transactions is stored manually."""
    stats = load_stats()
    devs = load_developers()
    stats["totalDonated"] = round(sum(d.get("totalClaimed", 0) or 0 for d in devs), 2)
    stats["developers"] = len(devs)
    stats["activeProjects"] = len([d for d in devs if d.get("repo")])
    # Human page views from the visit tracker the Telegram bot reports on
    stats["siteVisits"] = _visit_stats.get("total", 0) - _visit_stats.get("byDevice", {}).get("Bot", 0)
    return stats


@app.get("/api/stats")
async def get_stats():
    """Get platform stats (public). Auto-computed from profiles except transactions."""
    return compute_stats()


@app.put("/api/stats", dependencies=[Depends(require_admin)])
async def update_stats(stats: dict):
    """Update manual stats (transactions only — the rest are auto-computed). Requires X-API-Key header."""
    current = load_stats()
    if "transactions" in stats:
        current["transactions"] = stats["transactions"]
    save_stats(current)
    return compute_stats()


# --- Image Upload ---

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB

# What each kind of upload must measure. Covers match the 1200x630 link-preview
# size so the card, the post and the X/Telegram preview all show the same crop.
# The admin page shows the same rules (IMAGE_RULES there); keep the two in step.
IMAGE_RULES = {
    "cover": {"ratio": 1200 / 630, "min_w": 1200, "min_h": 630, "label": "1200 x 630 (or larger, same shape)"},
    "avatar": {"ratio": 1.0, "min_w": 200, "min_h": 200, "label": "square, at least 200 x 200"},
    "inline": {"ratio": None, "min_w": 800, "min_h": 0, "label": "at least 800 wide"},
}
RATIO_TOLERANCE = 0.02  # 2%, so a 1200x628 export still passes


def check_image_size(contents: bytes, kind: str):
    """Reject an upload whose dimensions don't fit its kind's rule."""
    rule = IMAGE_RULES[kind]
    try:
        width, height = Image.open(io.BytesIO(contents)).size
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Couldn't read that image")
    if width < rule["min_w"] or height < rule["min_h"]:
        raise HTTPException(
            status_code=400,
            detail=f"Image is {width} x {height}. It needs to be {rule['label']}.",
        )
    if rule["ratio"] and abs(width / height - rule["ratio"]) / rule["ratio"] > RATIO_TOLERANCE:
        raise HTTPException(
            status_code=400,
            detail=f"Image is {width} x {height}, the wrong shape. It needs to be {rule['label']}.",
        )


@app.post("/api/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile, kind: Optional[Literal["cover", "avatar", "inline"]] = None):
    """Upload an image; `kind` enforces its dimensions. Returns the permanent URL. Requires X-API-Key header."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, GIF allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    if kind:
        check_image_size(contents, kind)

    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOADS_DIR / filename

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/{filename}"}


# --- Admin UI ---

@app.get("/admin")
async def admin_login_page():
    """Serve a password gate that unlocks the admin dashboard."""
    return HTMLResponse("""
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PumpBoard Admin Login</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Same dark-theme tokens as the site and static/admin.html */
  :root{
    --pb-primary:#0b7d61;--pb-primary-hover:#0a6b53;--pb-accent:#2fbe98;--pb-danger:#f87171;
    --pb-bg-primary:#0e1011;--pb-bg-secondary:#141719;--pb-bg-card:#15181a;
    --pb-text-primary:#e9ecee;--pb-text-secondary:#a1aaaf;--pb-text-muted:#737c82;
    --pb-border:rgba(255,255,255,0.09);--pb-border-hover:rgba(255,255,255,0.18);--pb-border-active:rgba(47,190,152,0.5);
    --pb-radius-md:8px;--pb-radius-xl:14px;--pb-transition:0.15s ease;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    background:var(--pb-bg-primary);color:var(--pb-text-primary);
    -webkit-font-smoothing:antialiased;
  }
  /* Centred in its own wrapper, so elements browser extensions add to body can't push it aside */
  .wrap{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{
    width:100%;max-width:380px;padding:36px 32px;
    background:var(--pb-bg-card);border:1px solid var(--pb-border);border-radius:var(--pb-radius-xl);
    box-shadow:0 8px 24px rgba(0,0,0,0.45);
  }
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:28px}
  .mark{width:32px;height:32px;object-fit:contain;flex-shrink:0}
  .brand span{font-weight:600;font-size:1.05rem}
  h1{font-size:1.35rem;font-weight:600;margin-bottom:6px}
  p{color:var(--pb-text-secondary);font-size:0.9rem;margin-bottom:24px}
  label{display:block;font-size:0.82rem;font-weight:500;color:var(--pb-text-secondary);margin-bottom:6px}
  input{width:100%;padding:10px 12px;border-radius:var(--pb-radius-md);border:1px solid var(--pb-border);background:var(--pb-bg-secondary);color:var(--pb-text-primary);font:inherit;font-size:0.95rem;margin-bottom:16px;outline:none;transition:border-color var(--pb-transition)}
  input:hover{border-color:var(--pb-border-hover)}
  input:focus{border-color:var(--pb-border-active)}
  button{width:100%;padding:11px;border:none;border-radius:var(--pb-radius-md);background:var(--pb-primary);color:#fff;font:inherit;font-size:0.92rem;font-weight:500;cursor:pointer;transition:background-color var(--pb-transition)}
  button:hover{background:var(--pb-primary-hover)}
  button:disabled{opacity:0.6;cursor:wait}
  :focus-visible{outline:2px solid var(--pb-accent);outline-offset:2px}
  .err{color:var(--pb-danger);font-size:0.85rem;margin-top:14px;display:none}
  .card.shake{animation:shake .4s}
  @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
  @media (prefers-reduced-motion:reduce){.card.shake{animation:none}}
  @media (max-width:420px){.card{padding:28px 22px}}
</style></head><body>
<main class="wrap">
<div class="card" id="card">
  <div class="brand"><img class="mark" src="/admin/logo.png" alt=""><span>PumpBoard</span></div>
  <h1>Admin login</h1>
  <p>Enter your admin key to continue.</p>
  <form onsubmit="return tryLogin()">
    <label for="key">Admin key</label>
    <input type="password" id="key" autocomplete="current-password" autofocus />
    <button type="submit" id="btn">Log in</button>
  </form>
  <div class="err" id="err" role="alert">That key didn't work. Try again.</div>
</div>
</main>
<script>
function tryLogin(){
  var k=document.getElementById('key').value;
  if(!k)return false;
  var btn=document.getElementById('btn');
  btn.disabled=true;btn.textContent='Checking…';
  document.getElementById('err').style.display='none';
  fetch('/api/admin/verify',{headers:{'X-API-Key':k}})
    .then(function(r){
      if(r.ok){sessionStorage.setItem('pb-admin-key',k);window.location='/admin/dashboard'}
      else{loginFailed()}
    })
    .catch(loginFailed);
  return false;
}
function loginFailed(){
  var btn=document.getElementById('btn');
  btn.disabled=false;btn.textContent='Log in';
  document.getElementById('err').style.display='block';
  var c=document.getElementById('card');
  c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');
}
</script>
</body></html>""")


@app.get("/api/admin/verify")
async def verify_admin_key(_: None = Depends(require_admin)):
    """Verify the admin key is valid."""
    return {"ok": True}


@app.get("/admin/dashboard")
async def admin_dashboard():
    """Serve the admin dashboard (auth checked client-side via stored key)."""
    return FileResponse(STATIC_DIR / "admin.html")


@app.get("/admin/logo.png")
async def admin_logo():
    """The site's logo for the admin pages; a copy of public/logo-icon.png,
    since the frontend's files aren't reachable from here in local dev."""
    return FileResponse(STATIC_DIR / "logo-icon.png")
