"""
Professional support search route — called directly by SupportWidget (Stage 2).

Flow:
  1. Widget POSTs country + city + search preferences
  2. Build a targeted search query
  3. Run OpenAI Responses API with web_search_preview to find real listings
  4. Extract structured results via a follow-up JSON extraction call
  5. Return results + hardcoded crisis resource for the country

Note: each search call consumes the user's API credits (intentional — their key, their cost).
"""

import json
import logging
import os

from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel

from .crisis import get_crisis_resource
from .logger import log_support_search

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Request model ─────────────────────────────────────────────────────────────

class SupportSearchRequest(BaseModel):
    country:             str
    city:                str
    concern_type:        str
    format_preference:   str
    language_preference: str = ""
    api_key:             str = ""


# ── Query builder ─────────────────────────────────────────────────────────────

def _build_query(req: SupportSearchRequest) -> str:
    concern = req.concern_type.replace("_", " ")
    parts = [f"licensed {concern} therapist OR counselor OR mental health clinic"]
    parts.append(f"{req.city}, {req.country}")
    if req.language_preference:
        parts.append(f"{req.language_preference}-speaking")
    if req.format_preference == "online":
        parts.append("online sessions")
    elif req.format_preference == "in_person":
        parts.append("in-person")
    return " ".join(parts)


# ── Web search via OpenAI Responses API ───────────────────────────────────────

async def _search_web(client: AsyncOpenAI, query: str) -> str:
    """Search the web using OpenAI's built-in web_search_preview tool.
    Returns the model's text answer (which contains cited listings)."""
    try:
        response = await client.responses.create(
            model="gpt-4o-mini",
            tools=[{"type": "web_search_preview"}],
            input=f"Find real licensed therapists or mental health centers for: {query}. "
                  f"Include their name, specialty, whether they offer in-person or online, and their website URL.",
        )
        for item in response.output:
            if getattr(item, "type", None) == "message":
                for block in item.content:
                    if getattr(block, "type", None) == "output_text":
                        return block.text
        return ""
    except Exception as e:
        logger.error("Web search failed: %s", e, exc_info=True)
        raise RuntimeError(f"Web search unavailable: {e}") from e


# ── Structured extraction ─────────────────────────────────────────────────────

_EXTRACTION_SYSTEM = (
    "Extract therapist and mental health clinic listings from the search result text below. "
    "Return a JSON object: {\"results\": [...]}. Each result must have:\n"
    "  name        — string, the therapist's or clinic's actual name\n"
    "  type        — one of: \"therapist\", \"center\", \"platform\"\n"
    "  format      — one of: \"in_person\", \"online\", \"hybrid\"\n"
    "  description — one sentence covering specialty, language, or approach\n"
    "  url         — the actual URL from the text, or empty string if none found\n"
    "Include only real named listings. Omit generic blog posts or directories. Max 5 items. "
    "If none found, return {\"results\": []}."
)


async def _extract_results(client: AsyncOpenAI, raw_text: str) -> list[dict]:
    """Parse the web search text into structured therapist/clinic listings."""
    if not raw_text.strip():
        return []
    try:
        extraction = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _EXTRACTION_SYSTEM},
                {"role": "user",   "content": raw_text},
            ],
            response_format={"type": "json_object"},
            max_tokens=1024,
        )
        data = json.loads(extraction.choices[0].message.content or "{}")
        return data.get("results", [])
    except Exception as e:
        logger.warning("Result extraction failed: %s", e, exc_info=True)
        return []


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/api/support/search")
async def support_search(req: SupportSearchRequest):
    key = (req.api_key or "").strip() or os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="No OpenAI API key provided")

    aclient = AsyncOpenAI(api_key=key)
    query   = _build_query(req)

    logger.info(
        "Support search — country=%s city=%s concern=%s format=%s",
        req.country, req.city, req.concern_type, req.format_preference,
    )

    try:
        raw_text = await _search_web(aclient, query)
        results  = await _extract_results(aclient, raw_text)
    except Exception as e:
        logger.error("Support search failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    crisis = get_crisis_resource(req.country)
    logger.info("Support search returned %d results", len(results))
    log_support_search(
        country=req.country,
        city=req.city,
        concern_type=req.concern_type,
        format_preference=req.format_preference,
        language_preference=req.language_preference,
        query=query,
        results=results,
        crisis=crisis,
    )
    return {"results": results, "crisis": crisis}
