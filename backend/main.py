import json
import os
import time
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="PumpBoard API", version="1.0.0")

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

# GitHub config
GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
CACHE_TTL = 300  # 5 minutes

# In-memory cache: { github_username: { data: {...}, expires: timestamp } }
_cache: dict = {}


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
    name: Optional[str] = None
    bio: Optional[str] = None
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
    # Live GitHub fields (developers only)
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
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


async def fetch_github_profile(username: str, repo: str = "") -> dict:
    """Fetch user profile, repo stars, and top languages from GitHub."""
    cache_key = f"{username}:{repo}"
    now = time.time()

    if cache_key in _cache and _cache[cache_key]["expires"] > now:
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

    async with httpx.AsyncClient(timeout=10) as client:
        # Fetch profile
        try:
            resp = await client.get(f"{GITHUB_API}/users/{username}", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
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

    _cache[cache_key] = {"data": result, "expires": now + CACHE_TTL}
    return result


async def enrich_developer(dev: dict) -> dict:
    """Merge stored developer data with live GitHub data (developers only)."""
    if dev.get("type") == "creator" or not dev.get("github"):
        return dev
    github_data = await fetch_github_profile(dev["github"], dev.get("repo", ""))
    return {**dev, **github_data}


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
    if any(d["github"] == dev_in.github for d in devs):
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
    _cache.pop(identifier, None)


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
        "instagram", "tiktok", "x", "name", "bio", "avatar_url",
    }
    for key, value in updates.items():
        if key in allowed_fields:
            target[key] = value

    save_developers(devs)
    _cache.pop(identifier, None)
    return await enrich_developer(target)


# --- Stats endpoints ---

@app.get("/api/stats")
async def get_stats():
    """Get platform stats (public)."""
    return load_stats()


@app.put("/api/stats", dependencies=[Depends(require_admin)])
async def update_stats(stats: dict):
    """Update platform stats. Requires X-API-Key header."""
    current = load_stats()
    for key in DEFAULT_STATS:
        if key in stats:
            current[key] = stats[key]
    save_stats(current)
    return current


# --- Admin UI ---

@app.get("/admin")
async def admin_login_page():
    """Serve a password gate that unlocks the admin dashboard."""
    return HTMLResponse("""
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PumpBoard Admin Login</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,sans-serif;background:#0a0f1c;color:#e0e0e0;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:rgba(15,23,41,0.9);border:1px solid rgba(78,205,196,0.15);border-radius:16px;padding:40px;width:100%;max-width:380px;text-align:center}
  h1{font-size:1.3rem;margin-bottom:8px;background:linear-gradient(135deg,#0d9373,#4ecdc4);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  p{color:#5a6f7e;font-size:0.85rem;margin-bottom:24px}
  input{width:100%;padding:12px 16px;border-radius:8px;border:1px solid rgba(78,205,196,0.2);background:rgba(255,255,255,0.05);color:#e0e0e0;font-size:0.9rem;margin-bottom:16px}
  input:focus{outline:none;border-color:rgba(78,205,196,0.5)}
  button{width:100%;padding:12px;border:none;border-radius:8px;background:linear-gradient(135deg,#0d9373,#00d4aa);color:#fff;font-size:0.9rem;font-weight:600;cursor:pointer}
  button:hover{opacity:0.9}
  .err{color:#f87171;font-size:0.8rem;margin-top:8px;display:none}
</style></head><body>
<div class="card">
  <h1>PumpBoard Admin</h1>
  <p>Enter your admin key to continue</p>
  <form onsubmit="return tryLogin()">
    <input type="password" id="key" placeholder="Admin key" autofocus />
    <button type="submit">Login</button>
  </form>
  <div class="err" id="err">Invalid key</div>
</div>
<script>
function tryLogin(){
  var k=document.getElementById('key').value;
  fetch('/api/admin/verify',{headers:{'X-API-Key':k}})
    .then(function(r){if(r.ok){sessionStorage.setItem('pb-admin-key',k);window.location='/admin/dashboard'}else{document.getElementById('err').style.display='block'}})
    .catch(function(){document.getElementById('err').style.display='block'});
  return false;
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
