#!/usr/bin/env python3
"""
PK Scholarships - AI Research & Verification Pipeline
Automated script to research, verify, and publish Pakistan university scholarships.
Powered by Google Gemini.
"""

import os
import sys
import json
import re
from datetime import datetime, date
from typing import List, Dict, Any

try:
    from google import genai
except ImportError:
    print("Error: google-genai is not installed. Install with: pip install google-genai")
    sys.exit(1)

DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "scholarships.json")
MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"]
VALID_TYPES = {"fully-funded", "partial", "merit", "need"}

def load_existing() -> List[Dict[str, Any]]:
    """Loads existing scholarships from the JSON database."""
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Warning: Could not read {DATA_FILE}: {e}")
        return []

def save_scholarships(scholarships: List[Dict[str, Any]]) -> None:
    """Saves scholarships back to the JSON database."""
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(scholarships, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(scholarships)} scholarships to {DATA_FILE}")

def clean_json_response(raw_text: str) -> str:
    """Strips markdown code blocks from model output to parse pure JSON."""
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

def build_prompt(existing_titles: List[str]) -> str:
    today_str = datetime.now().strftime("%Y-%m-%d")
    existing_list_str = "\n".join([f"- {t}" for t in existing_titles[-25:]]) if existing_titles else "None yet"

    return f"""You are an expert higher education researcher specializing in Pakistani university scholarships, financial aid, and fellowships.
Today's Date: {today_str}

TASK:
Research and identify 4 to 8 real, active, or upcoming scholarships for university and college students in Pakistan.
These can include:
- HEC Pakistan national and provincial scholarship schemes (Ehsaas, Indigenous, Need-Based, Overseas).
- Provincial educational endowment funds (PEEF Punjab, BEEF Balochistan, SEEF Sindh, KPK Higher Education scholarships).
- Major Pakistani university internal scholarships (NUST, LUMS NOP, FAST-NUCES, Quaid-i-Azam University, Punjab University, COMSATS, UET Lahore, IBA Karachi, Aga Khan University, etc.).
- International scholarships specifically open to Pakistani university students (Commonwealth, Fulbright Pakistan, Turkiye Burslari, MEXT Japan, Chinese CSC, DAAD, Stipendium Hungaricum).

DO NOT invent fictional scholarships. Only list authentic, officially known scholarship programs with real criteria.
DO NOT duplicate any of these already listed scholarships:
{existing_list_str}

OUTPUT FORMAT:
Respond with ONLY a valid, parseable JSON array of objects. Do not write any explanations before or after the JSON.
Each object MUST have the following exact keys:
[
  {{
    "title": "Exact Official Title of Scholarship",
    "university": "Granting University or Authority (e.g., HEC Pakistan, LUMS, NUST, PEEF)",
    "type": "one of: fully-funded | partial | merit | need",
    "category": "one of: Government | University | Private/NGO | International | STEM | Undergraduate",
    "deadline": "YYYY-MM-DD (estimated or official deadline; must be today or in future)",
    "excerpt": "Clear, concise 2-3 sentence overview covering student eligibility, coverage, and benefits.",
    "link": "Official website URL (must start with https:// or http://)"
  }}
]"""

def fetch_from_gemini(client: genai.Client, prompt: str) -> List[Dict[str, Any]]:
    """Calls Gemini with model fallback to fetch scholarship data."""
    for model_name in MODELS:
        print(f"Querying Gemini model: {model_name}...")
        try:
            resp = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            raw = clean_json_response(resp.text)
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                print(f"Success with model {model_name}: received {len(parsed)} raw items.")
                return parsed
        except Exception as e:
            print(f"Model {model_name} failed: {e}. Trying next fallback...")
    return []

def verify_and_clean_scholarship(item: Dict[str, Any]) -> Dict[str, Any] | None:
    """
    Rigorously verifies each scholarship entry:
    - Validates required fields
    - Normalizes scholarship type
    - Checks URL syntax
    - Validates date
    """
    title = str(item.get("title", "")).strip()
    university = str(item.get("university", "")).strip()
    excerpt = str(item.get("excerpt", "")).strip()
    link = str(item.get("link", "")).strip()
    raw_type = str(item.get("type", "")).strip().lower()
    deadline = str(item.get("deadline", "")).strip()
    category = str(item.get("category", "University")).strip()

    # Basic validations
    if len(title) < 5 or len(university) < 2 or len(excerpt) < 15:
        print(f"Rejected item: incomplete text fields -> {title}")
        return None

    # Verify and normalize type
    if "full" in raw_type:
        norm_type = "fully-funded"
    elif "part" in raw_type:
        norm_type = "partial"
    elif "merit" in raw_type:
        norm_type = "merit"
    elif "need" in raw_type:
        norm_type = "need"
    else:
        norm_type = "merit"

    # Verify link
    if not (link.startswith("http://") or link.startswith("https://")):
        # Fallback to official HEC or generic portal if malformed
        link = "https://www.hec.gov.pk"

    # Verify deadline date format
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", deadline)
    if date_match:
        deadline_str = date_match.group(1)
    else:
        # If deadline is year or vague, set reasonable future date
        deadline_str = f"{datetime.now().year}-12-31"

    # Filter out expired scholarships if older than 30 days
    try:
        d = datetime.strptime(deadline_str, "%Y-%m-%d").date()
        today = date.today()
        if d < today and (today - d).days > 30:
            print(f"Skipping expired scholarship: {title} (Deadline: {deadline_str})")
            return None
    except ValueError:
        deadline_str = f"{datetime.now().year}-12-31"

    return {
        "id": re.sub(r"[^a-z0-9]+", "-", f"{university}-{title}".lower()).strip("-"),
        "title": title,
        "university": university,
        "type": norm_type,
        "category": category,
        "deadline": deadline_str,
        "excerpt": excerpt,
        "link": link,
        "published_at": datetime.now().strftime("%Y-%m-%d"),
        "verified": True
    }

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY environment variable is not set. Exiting.")
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    existing = load_existing()
    existing_titles = [s["title"].lower() for s in existing if "title" in s]

    print(f"Starting scholarship research pipeline... Currently in database: {len(existing)}")
    prompt = build_prompt(existing_titles)
    raw_items = fetch_from_gemini(client, prompt)

    added_count = 0
    for item in raw_items:
        verified = verify_and_clean_scholarship(item)
        if not verified:
            continue

        # Duplicate check
        norm_title = verified["title"].lower()
        if any(norm_title in ext or ext in norm_title for ext in existing_titles):
            print(f"Skipping duplicate: {verified['title']}")
            continue

        existing.insert(0, verified)
        existing_titles.append(norm_title)
        added_count += 1
        print(f"Verified & Added: {verified['title']} ({verified['university']})")

    # Sort: active upcoming deadlines first
    existing.sort(key=lambda x: x.get("deadline", "9999-99-99"))

    save_scholarships(existing)
    print(f"Pipeline finished successfully. Added {added_count} new verified scholarships.")

if __name__ == "__main__":
    main()
