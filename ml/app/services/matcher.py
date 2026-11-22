import json
import logging
import os
import re
from typing import List, Dict
from ..models.schemas import SkillMatchResponse

logger = logging.getLogger(__name__)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TAXONOMY_PATH = os.path.join(BASE_DIR, "datasets", "processed", "onet_taxonomy.json")
_TAXONOMY_NAMES: Dict[str, str] = {}
_NON_MATCHABLE_NAMES = set()
_TAXONOMY_MTIME = 0.0


def _normalize_base(skill: str) -> str:
    value = skill.lower().strip()
    value = re.sub(r'[._\-/]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def _load_taxonomy_names() -> Dict[str, str]:
    """Load only O*NET skill names; occupation aliases are intentionally excluded."""
    global _TAXONOMY_NAMES, _NON_MATCHABLE_NAMES, _TAXONOMY_MTIME

    try:
        mtime = os.path.getmtime(TAXONOMY_PATH)
    except OSError:
        return _TAXONOMY_NAMES

    if _TAXONOMY_NAMES and mtime == _TAXONOMY_MTIME:
        return _TAXONOMY_NAMES

    try:
        with open(TAXONOMY_PATH, "r", encoding="utf-8-sig") as file:
            payload = json.load(file)
        names = {}
        non_matchable = set()
        for item in payload.get("skills", []):
            name = item.get("name")
            if isinstance(name, str) and name.strip():
                normalized = _normalize_base(name)
                if item.get("matchable", True):
                    names[normalized] = normalized
                else:
                    non_matchable.add(normalized)
        _TAXONOMY_NAMES = names
        _NON_MATCHABLE_NAMES = non_matchable
        _TAXONOMY_MTIME = mtime
    except (OSError, json.JSONDecodeError, TypeError) as error:
        logger.warning("Unable to load O*NET taxonomy from %s: %s", TAXONOMY_PATH, error)

    return _TAXONOMY_NAMES


def normalize_skill(skill: str) -> str:
    """Normalize a skill into a canonical, comparable representation."""
    s = _normalize_base(skill)
    aliases = {
        'js': 'javascript',
        'javascript programming': 'javascript',
        'ts': 'typescript',
        'typescript programming': 'typescript',
        'py': 'python',
        'postgres': 'postgresql',
        'postgres sql': 'postgresql',
        'vuejs': 'vue',
        'vue js': 'vue',
        'reactjs': 'react',
        'react js': 'react',
        'nodejs': 'node',
        'node js': 'node',
        'rest api': 'api development',
        'restful api': 'api development',
        'api development': 'api development',
        'database management': 'database',
        'database management systems': 'database',
        'relational database': 'database',
        'sql databases': 'sql',
        'version control': 'git',
        'source control': 'git',
        'user interface design': 'ui ux design',
        'user experience design': 'ui ux design',
        'ui design': 'ui ux design',
        'ux design': 'ui ux design',
    }
    normalized = aliases.get(s, s)
    return _load_taxonomy_names().get(normalized, normalized)


def skills_match(left: str, right: str) -> bool:
    """Match exact canonical skills, with conservative phrase containment."""
    if _normalize_base(left) in _NON_MATCHABLE_NAMES or _normalize_base(right) in _NON_MATCHABLE_NAMES:
        return False
    left_norm = normalize_skill(left)
    right_norm = normalize_skill(right)
    if left_norm == right_norm:
        return True
    # Only allow containment for multi-word phrases to avoid Python matching
    # unrelated skills such as PyTorch or JavaScript matching Java.
    if ' ' in left_norm and ' ' in right_norm:
        return left_norm in right_norm or right_norm in left_norm
    return False

def calculate_skill_match(
    student_skills_raw: List[str],
    required_skills_raw: List[str],
    optional_skills_raw: List[str] = None
) -> SkillMatchResponse:
    if optional_skills_raw is None:
        optional_skills_raw = []

    # Student skills are selected as a set; proficiency is not collected by the UI.
    student_map: Dict[str, str] = {} # normalized_name -> original_name
    for item in student_skills_raw:
        orig_name = item.strip()
            
        if orig_name:
            norm = normalize_skill(orig_name)
            student_map[norm] = orig_name

    # Required skills
    matched_skills = []
    missing_skills = []
    
    total_required_weight = 0
    earned_weight = 0

    for req in required_skills_raw:
        req_clean = req.strip()
        if not req_clean:
            continue
            
        total_required_weight += 1
        
        # Check direct or partial inclusion
        matched = False
        for s_norm in student_map:
            if skills_match(req_clean, s_norm):
                matched_skills.append(req_clean)
                earned_weight += 1
                matched = True
                break
        
        if not matched:
            missing_skills.append(req_clean)

    # Calculate match percentage
    if total_required_weight == 0:
        match_percentage = 0.0
    else:
        raw_pct = (earned_weight / total_required_weight) * 100.0
        match_percentage = round(min(100.0, max(0.0, raw_pct)), 1)

    # Optional skills bonus (up to 5% bonus)
    optional_matches = []
    for opt in optional_skills_raw:
        for s_norm in student_map:
            if skills_match(opt.strip(), s_norm):
                optional_matches.append(opt.strip())
                break
    
    if optional_matches and match_percentage < 100.0:
        bonus = min(5.0, len(optional_matches) * 2.0)
        match_percentage = round(min(100.0, match_percentage + bonus), 1)

    # Determine readiness level
    if match_percentage >= 75.0:
        readiness_level = "High Match"
    elif match_percentage >= 45.0:
        readiness_level = "Moderate Match"
    else:
        readiness_level = "Low Match"

    return SkillMatchResponse(
        match_percentage=match_percentage,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        readiness_level=readiness_level,
        score_details={
            "earned_weight": earned_weight,
            "total_required_weight": total_required_weight,
            "optional_skills_matched": optional_matches
        }
    )
