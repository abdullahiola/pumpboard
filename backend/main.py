import asyncio
import json
import os
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

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
STATIC_DIR = Path(__file__).parent / "static"
UPLOADS_DIR = Path(__file__).parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Serve uploaded files at /uploads/*
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Telegram visitor alerts
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")  # optional: auto-discovered if empty
TELEGRAM_CHAT_FILE = Path(__file__).parent / "data" / "telegram_chat.json"
_resolved_chat_id: str = ""
VISIT_SECRET = os.getenv("VISIT_SECRET", "")  # optional shared secret with the frontend
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


# --- Data helpers ---

def load_developers() -> list[dict]:
    if not DEVELOPERS_FILE.exists():
        return []
    with open(DEVELOPERS_FILE, "r") as f:
        return json.load(f)


def save_developers(devs: list[dict]):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(DEVELOPERS_FILE, "w") as f:
        json.dump(devs, f, indent=2)


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

def _github_headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


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

    async with httpx.AsyncClient(timeout=10) as client:
        # Fetch profile
        try:
            resp = await client.get(f"{GITHUB_API}/users/{username}", headers=headers)
            if resp.status_code == 200:
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
                if resp.status_code == 200:
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
                if resp.status_code == 200:
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


async def _lookup_location(client: httpx.AsyncClient, ip: str) -> tuple[str, str]:
    """Best-effort geo lookup (free tier, no key). Returns (location, country)."""
    if not ip:
        return "", ""
    if ip in _geo_cache:
        return _geo_cache[ip]
    try:
        resp = await client.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,country,city"},
        )
        geo = resp.json()
        if geo.get("status") == "success":
            country = geo.get("country") or ""
            location = ", ".join(filter(None, [geo.get("city"), country]))
            if len(_geo_cache) > 5000:
                _geo_cache.clear()
            _geo_cache[ip] = (location, country)
            return location, country
    except (httpx.RequestError, ValueError):
        pass
    return "", ""


def _owner_chat_id() -> str:
    """The chat that receives alerts: env override, else the persisted owner."""
    global _resolved_chat_id
    if TELEGRAM_CHAT_ID:
        return TELEGRAM_CHAT_ID
    if _resolved_chat_id:
        return _resolved_chat_id
    if TELEGRAM_CHAT_FILE.exists():
        try:
            with open(TELEGRAM_CHAT_FILE, "r") as f:
                _resolved_chat_id = str(json.load(f).get("chat_id", ""))
        except (json.JSONDecodeError, OSError):
            pass
    return _resolved_chat_id


def _claim_owner(chat_id: str):
    global _resolved_chat_id
    _resolved_chat_id = chat_id
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(TELEGRAM_CHAT_FILE, "w") as f:
        json.dump({"chat_id": chat_id}, f)


def _stats_message() -> str:
    def top(bucket: dict, n: int = 5):
        return sorted(bucket.items(), key=lambda kv: kv[1], reverse=True)[:n]

    s = _visit_stats
    lines = ["📊 PumpBoard visit stats", f"Total page views: {s.get('total', 0)}"]
    if s.get("byCountry"):
        lines += ["", "Top locations:"]
        lines += [f"• {name}: {n}" for name, n in top(s["byCountry"])]
    if s.get("byDevice"):
        lines += ["", "Devices:"]
        lines += [f"• {name}: {n}" for name, n in top(s["byDevice"], 10)]
    if s.get("byPath"):
        lines += ["", "Top pages:"]
        lines += [f"• {name}: {n}" for name, n in top(s["byPath"])]
    return "\n".join(lines)


async def _process_visit(v: VisitIn, notify: bool):
    """Record the visit in the stats and, when allowed, alert via Telegram."""
    async with httpx.AsyncClient(timeout=5) as client:
        location, country = await _lookup_location(client, v.ip)
        device = _classify_device(v.userAgent)

        _visit_stats["total"] = _visit_stats.get("total", 0) + 1
        for field, key in (
            ("byCountry", country or "Unknown"),
            ("byDevice", device),
            ("byPath", v.path or "/"),
        ):
            bucket = _visit_stats.setdefault(field, {})
            bucket[key] = bucket.get(key, 0) + 1
        save_visit_stats()

        chat_id = _owner_chat_id()
        if not (notify and chat_id and TELEGRAM_BOT_TOKEN):
            return

        label = "🤖 Bot/crawler" if device == "Bot" else "👀 Visitor"
        lines = [f"{label} on pumpboard.dev", f"Page: {v.path or '/'}"]
        if v.ip:
            lines.append(f"IP: {v.ip}")
        if location:
            lines.append(f"Location: {location}")
        if device != "Bot":
            lines.append(f"Device: {device}")
        if v.userAgent:
            lines.append(f"Agent: {v.userAgent[:200]}")
        if v.referrer:
            lines.append(f"From: {v.referrer}")

        try:
            await client.post(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                json={"chat_id": chat_id, "text": "\n".join(lines)},
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
    """Long-poll Telegram for incoming messages. The first chat to message the
    bot is claimed as the owner; /start and /stats from the owner reply with
    the visit stats. Messages from any other chat are ignored."""
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
                for update in resp.json().get("result", []):
                    offset = update["update_id"] + 1
                    msg = update.get("message") or {}
                    chat_id = str((msg.get("chat") or {}).get("id") or "")
                    if not chat_id:
                        continue

                    owner = _owner_chat_id()
                    if not owner:
                        _claim_owner(chat_id)
                        owner = chat_id
                    if chat_id != owner:
                        continue

                    text = (msg.get("text") or "").strip().lower()
                    if text.startswith("/start") or text.startswith("/stats"):
                        reply = _stats_message()
                        if text.startswith("/start"):
                            reply = (
                                "✅ Connected. You'll get an alert when someone "
                                "visits pumpboard.dev. Send /stats anytime for "
                                "a summary.\n\n" + reply
                            )
                        await client.post(
                            f"{api}/sendMessage",
                            json={"chat_id": chat_id, "text": reply},
                        )
        except Exception:
            await asyncio.sleep(5)  # network hiccup or Telegram error; retry


# --- Endpoints ---

@app.get("/api/developers", response_model=list[DeveloperOut])
async def list_developers(type: Optional[str] = None):
    """List all developers, optionally filtered by type."""
    devs = load_developers()
    if type:
        devs = [d for d in devs if d.get("type") == type]

    enriched = []
    for dev in devs:
        enriched.append(await enrich_developer(dev))
    return enriched


@app.get("/api/developers/{github}", response_model=DeveloperOut)
async def get_developer(github: str):
    """Get a single developer by GitHub username."""
    devs = load_developers()
    dev = next((d for d in devs if d["github"] == github), None)
    if not dev:
        raise HTTPException(status_code=404, detail="Developer not found")
    return await enrich_developer(dev)


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
        "avatar_url",
    }
    for key, value in updates.items():
        if key in allowed_fields:
            target[key] = value

    save_developers(devs)
    evict_cached_github(identifier)
    return await enrich_developer(target)


# --- Stats endpoints ---

def compute_stats() -> dict:
    """Derive stats from profiles; only transactions is stored manually."""
    stats = load_stats()
    devs = load_developers()
    stats["totalDonated"] = round(sum(d.get("totalClaimed", 0) or 0 for d in devs), 2)
    stats["developers"] = len(devs)
    stats["activeProjects"] = len([d for d in devs if d.get("repo")])
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


@app.post("/api/upload", dependencies=[Depends(require_admin)])
async def upload_image(file: UploadFile):
    """Upload an avatar image. Returns the permanent URL. Requires X-API-Key header."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, GIF allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

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
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    background:#0a0f1c;color:#e0e0e0;
    min-height:100dvh;display:flex;align-items:center;justify-content:center;
    padding:20px;position:relative;overflow:hidden;
  }
  body::before,body::after{content:"";position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
  body::before{width:420px;height:420px;background:rgba(13,147,115,0.16);top:-120px;right:-120px}
  body::after{width:360px;height:360px;background:rgba(78,205,196,0.10);bottom:-140px;left:-100px}
  .card{
    position:relative;z-index:1;
    background:rgba(15,23,41,0.88);
    border:1px solid rgba(78,205,196,0.15);
    border-radius:20px;padding:40px 30px;
    width:100%;max-width:400px;text-align:center;
    box-shadow:0 24px 64px rgba(0,0,0,0.45);
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  }
  .logo{width:52px;height:52px;margin:0 auto 18px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:linear-gradient(135deg,#0d9373,#4ecdc4);box-shadow:0 8px 24px rgba(13,147,115,0.35)}
  h1{font-size:1.35rem;margin-bottom:6px;background:linear-gradient(135deg,#0d9373,#4ecdc4);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  p{color:#5a6f7e;font-size:0.85rem;margin-bottom:26px}
  input{width:100%;padding:13px 16px;border-radius:10px;border:1px solid rgba(78,205,196,0.2);background:rgba(255,255,255,0.05);color:#e0e0e0;font-size:1rem;margin-bottom:14px;outline:none;transition:border-color .2s,box-shadow .2s}
  input:focus{border-color:rgba(78,205,196,0.55);box-shadow:0 0 0 3px rgba(78,205,196,0.12)}
  button{width:100%;padding:13px;border:none;border-radius:10px;background:linear-gradient(135deg,#0d9373,#00d4aa);color:#fff;font-size:0.95rem;font-weight:600;cursor:pointer;transition:opacity .2s,transform .1s}
  button:hover{opacity:0.92}
  button:active{transform:scale(0.985)}
  button:disabled{opacity:0.6;cursor:wait}
  .err{color:#f87171;font-size:0.82rem;margin-top:14px;display:none}
  .card.shake{animation:shake .4s}
  @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
  @media (max-width:420px){.card{padding:32px 22px}}
</style></head><body>
<div class="card" id="card">
  <div class="logo">⚡</div>
  <h1>PumpBoard Admin</h1>
  <p>Enter your admin key to continue</p>
  <form onsubmit="return tryLogin()">
    <input type="password" id="key" placeholder="Admin key" autocomplete="current-password" autofocus />
    <button type="submit" id="btn">Login</button>
  </form>
  <div class="err" id="err">Invalid key — try again</div>
</div>
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
  btn.disabled=false;btn.textContent='Login';
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
