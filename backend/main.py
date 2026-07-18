import json
import os
import time
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="PumpBoard API", version="1.0.0")

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


@app.post("/api/developers", response_model=DeveloperOut, status_code=201)
async def add_developer(dev_in: DeveloperIn):
    """Add a new developer by GitHub username."""
    devs = load_developers()

    # Check for duplicates
    if any(d["github"] == dev_in.github for d in devs):
        raise HTTPException(status_code=409, detail="Developer already exists")

    new_dev = dev_in.model_dump()
    devs.append(new_dev)
    save_developers(devs)

    return await enrich_developer(new_dev)


@app.delete("/api/developers/{identifier}", status_code=204)
async def remove_developer(identifier: str):
    """Remove a developer by GitHub username or creator by name."""
    devs = load_developers()
    filtered = [
        d for d in devs
        if d.get("github") != identifier and d.get("name") != identifier
    ]

    if len(filtered) == len(devs):
        raise HTTPException(status_code=404, detail="Profile not found")

    save_developers(filtered)
    _cache.pop(identifier, None)


# --- Admin UI ---

@app.get("/admin")
async def admin_page():
    """Serve the admin dashboard."""
    return FileResponse(STATIC_DIR / "admin.html")
