import logging
import os
import re
from difflib import get_close_matches
from typing import List, Optional, Dict

import joblib

from ..models.schemas import JournalAnalysisRequest, JournalAnalysisResponse

logger = logging.getLogger(__name__)
MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
)

# Cache for loaded classifiers per program
_CLASSIFIERS: Dict[str, Optional[object]] = {}
_MODEL_LOAD_ATTEMPTED: Dict[str, bool] = {}

# Core errand keywords (exact and base forms)
ERRAND_KEYWORDS = [
    # Food/drinks
    "coffee", "kape", "timpla", "tinapay", "lunch", "merienda", "snack", "breakfast", "dinner",
    "pagkain", "softdrinks", "juice", "tubig", "biscuit",
    # Cleaning
    "walis", "linis", "mop", "sweep", "hugas", "dishes", "pantry", "basura", "trash",
    "broom", "dustpan", "cleaning", "clean", "vacuum",
    # Personal errands
    "photocopy", "xerox", "errand", "bills", "hatid", "sundo", "deliver",
    "groceries", "grocery", "palengke", "market", "shopping",
    # Idle
    "tambay", "idle", "natulog", "waited", "waiting", "nothing",
]

# Course task keywords
COURSE_TASK_KEYWORDS = {
    "BSIT": [
        "code", "coding", "program", "programming", "software", "bug", "debug", 
        "database", "sql", "mysql", "api", "endpoint", "frontend", "backend", 
        "html", "css", "javascript", "react", "vue", "laravel", "php", "python", 
        "server", "deploy", "git", "github", "testing", "unit test", "network", 
        "router", "security", "ui", "ux", "wireframe", "system", "data",
        "implement", "implementation", "develop", "feature", "notification",
        "authentication", "application", "web app", "mobile app", "website",
        "troubleshoot", "troubleshooting",
    ],
    "BSCPE": [
        "hardware", "circuit", "pcb", "microcontroller", "arduino", "raspberry", 
        "sensor", "soldering", "embedded", "firmware", "iot", "troubleshoot hardware", 
        "logic gate", "component", "wiring", "oscilloscope", "power supply"
    ],
    "BSTM": [
        "tour", "tourist", "guide", "guiding", "itinerary", "travel", "ticket", 
        "flight", "booking", "reservation", "amadeus", "customer", "guest", 
        "destination", "visa", "airport", "hotel booking", "tourism marketing"
    ],
    "BSHM": [
        "front office", "check-in", "check-out", "reception", "guest service", 
        "room service", "housekeeping", "food and beverage", "f&b", "kitchen", 
        "culinary", "prep", "sanitation", "haccp", "pos", "dining", "banquet"
    ],
    "BSCRIM": [
        "investigation", "crime scene", "evidence", "chain of custody", "fingerprint", 
        "dactyloscopy", "patrol", "security", "report writing", "blotter", "police", 
        "suspect", "witness", "affidavit", "forensic", "ballistics", "surveillance"
    ],
    "BSED_ENGLISH": [
        "lesson plan", "teaching", "teach", "curriculum", "classroom", "student", 
        "quiz", "exam", "grading", "assessment", "literature", "reading comprehension", 
        "grammar", "essay", "rubric", "turnitin", "speech", "oral communication", 
        "debate", "esl", "phonetics", "activity sheet"
    ],
    "BSED_SCIENCE": [
        "lesson plan", "teaching", "teach", "curriculum", "classroom", "student", 
        "quiz", "exam", "grading", "assessment", "phet", "science experiment", 
        "laboratory", "lab safety", "chemical", "reagent", "microscope", "specimen", 
        "physics", "chemistry", "biology", "scientific inquiry"
    ],
    "BSED_MATH": [
        "lesson plan", "teaching", "teach", "curriculum", "classroom", "student", 
        "quiz", "exam", "grading", "assessment", "geogebra", "desmos", "algebra", 
        "geometry", "trigonometry", "calculus", "math problem", "word problem", 
        "statistics", "proof", "tos"
    ],
    "BEED": [
        "lesson plan", "elementary", "kindergarten", "reading", "literacy", 
        "math", "phonics", "storytelling", "child", "children", "flashcards", 
        "classroom management", "activity", "seatwork", "primary grades"
    ],
    "FISHERIES": [
        "aquaculture", "fish", "pond", "hatchery", "fingerling", "feed", 
        "feeding", "water quality", "salinity", "ph level", "dissolved oxygen", 
        "harvest", "sampling", "disease", "marine", "net", "aquatic"
    ],
    "POLSCI": [
        "legal research", "case brief", "jurisprudence", "court", "resolution", 
        "ordinance", "policy", "legislative", "lgu", "local government", "advocacy", 
        "statute", "affidavit", "hearing", "docket", "public relations", "constitutional"
    ]
}

BSIT_DEVELOPMENT_ACTIONS = (
    "code", "coded", "coding", "implement", "implemented", "implementing",
    "develop", "developed", "developing", "create", "created", "creating",
    "build", "built", "building", "debug", "debugged", "debugging", "fix",
    "fixed", "fixing", "test", "tested", "testing", "configure", "configured",
    "configuring", "design", "designed", "designing", "deploy", "deployed",
    "install", "installed", "migrate", "migrated", "maintain", "maintained",
    "resolve", "resolved", "troubleshoot", "troubleshooting", "inayos", "inaayos",
)

def _fuzzy_detect_errands(text: str) -> List[str]:
    """
    Detect errand keywords even with typos using fuzzy matching.
    Uses difflib.get_close_matches with 80% similarity threshold.
    Example: 'coffe' matches 'coffee', 'timpa' matches 'timpla'
    """
    words = re.findall(r'\b\w+\b', text.lower())
    found = []
    for word in words:
        if len(word) < 3:  # skip very short words
            continue
        matches = get_close_matches(word, ERRAND_KEYWORDS, n=1, cutoff=0.80)
        if matches:
            found.append(matches[0])  # return the matched keyword, not the typo
    return list(set(found))


def _load_program_classifier(program_code: str):
    """
    Load the trained classifier for a specific program.
    Returns the model or None if not found/not trained yet.
    """
    global _CLASSIFIERS, _MODEL_LOAD_ATTEMPTED
    
    # Return cached model if already loaded
    if program_code in _CLASSIFIERS:
        return _CLASSIFIERS[program_code]
    
    # Return None if we already tried loading this program
    if _MODEL_LOAD_ATTEMPTED.get(program_code, False):
        return None
    
    _MODEL_LOAD_ATTEMPTED[program_code] = True
    
    model_path = os.path.join(MODELS_DIR, f"{program_code.lower()}_classifier.joblib")
    
    if not os.path.exists(model_path):
        logger.info(f"Classifier not found for {program_code} at {model_path}; using rule-based analysis.")
        _CLASSIFIERS[program_code] = None
        return None
    
    try:
        model = joblib.load(model_path)
        _CLASSIFIERS[program_code] = model
        logger.info(f"Loaded classifier for {program_code}")
        return model
    except (OSError, ValueError, ImportError) as error:
        logger.warning(f"Unable to load classifier for {program_code}: {error}")
        _CLASSIFIERS[program_code] = None
        return None


def _detect_course_tasks(text: str, course: str) -> List[str]:
    relevant_keywords = COURSE_TASK_KEYWORDS.get(course, [])
    return [
        keyword
        for keyword in relevant_keywords
        if re.search(r'\b' + re.escape(keyword) + r'\b', text)
    ]


def _apply_bsit_technical_work_override(
    request: JournalAnalysisRequest,
    response: JournalAnalysisResponse,
) -> JournalAnalysisResponse:
    """Correct high-confidence BSIT false negatives on concrete technical work."""
    if response.is_course_related or request.student_course.upper() != "BSIT":
        return response

    text = request.journal_text.lower()
    detected_tasks = _detect_course_tasks(text, "BSIT")
    has_development_action = any(
        re.search(r"\b" + re.escape(action) + r"\b", text)
        for action in BSIT_DEVELOPMENT_ACTIONS
    )

    # The TF-IDF model is trained mostly on long English task descriptions;
    # short Taglish intern logs need a domain-evidence guard to avoid labeling
    # explicit implementation/debugging work as unrelated.
    if len(detected_tasks) < 2 or not has_development_action:
        return response

    response.is_course_related = True
    response.confidence_score = 0.80
    if response.flag_level != "Warning - Errand / Administrative":
        response.flag_level = "Normal"
    response.feedback = (
        "Classified as BSIT-related because the entry describes technical work: "
        + ", ".join(detected_tasks[:5])
        + "."
    )
    return response


def _analyze_with_trained_model(
    request: JournalAnalysisRequest,
    model,
) -> JournalAnalysisResponse:
    text = request.journal_text.strip()
    if not text:
        return JournalAnalysisResponse(
            is_course_related=False,
            confidence_score=0.0,
            detected_tasks=[],
            flag_level="Unrelated",
            feedback="Empty journal entry text provided.",
        )

    prediction = str(model.predict([text])[0])
    probabilities = model.predict_proba([text])[0]
    confidence_score = round(float(max(probabilities)), 2)
    detected_tasks = _detect_course_tasks(text.lower(), request.student_course)

    if prediction == "course_related":
        flag_level = "Normal"
        feedback = (
            f"Trained model classified this entry as aligned with "
            f"{request.student_course} activities."
        )
        is_course_related = True
    elif prediction == "errand":
        flag_level = "Warning - Errand / Administrative"
        feedback = "Trained model flagged this entry as an errand or administrative activity."
        is_course_related = False
    else:
        flag_level = "Unrelated"
        feedback = (
            f"Trained model found no clear {request.student_course} internship activity "
            "in this entry."
        )
        is_course_related = False

    return JournalAnalysisResponse(
        is_course_related=is_course_related,
        confidence_score=confidence_score,
        detected_tasks=detected_tasks,
        flag_level=flag_level,
        feedback=feedback,
    )


def _analyze_with_rules(request: JournalAnalysisRequest) -> JournalAnalysisResponse:
    text = request.journal_text.lower()
    course = request.student_course.upper().replace(' ', '').replace('-', '')
    
    # 1. Check for errand / non-internship red flags (FUZZY - handles typos)
    flagged_errands = _fuzzy_detect_errands(text)

    # Also check multi-word phrase patterns (e.g., "bought them lunch", "ran an errand")
    MULTI_WORD_PATTERNS = [
        r'\bbought\s+\w+\s*(coffee?|lunch|food|snack|merienda|breakfast|dinner)\b',
        r'\b(fetch|carry|bring)\s+(food|lunch|snack|coffee?|drinks?)\b',
        r'\b(run|running|ran)\s+(an?\s+)?errand\b',
        r'\bnothing\s+to\s+do\b',
        r'\bjust\s+(waited?|sat|stayed?)\b',
        r'\bwala\s*(kaming?|akong)\s+ginawa\b',
    ]
    for pattern in MULTI_WORD_PATTERNS:
        matches = re.findall(pattern, text)
        if matches:
            flagged_errands.append("errand/idle activity")
    flagged_errands = list(set(flagged_errands))

    # 2. Check for course-specific relevant keywords
    detected_tasks = _detect_course_tasks(text, course)

    # 3. Calculate alignment score
    word_count = len(text.split())
    if word_count == 0:
        return JournalAnalysisResponse(
            is_course_related=False,
            confidence_score=0.0,
            detected_tasks=[],
            flag_level="Unrelated",
            feedback="Empty journal entry text provided."
        )

    task_match_ratio = min(1.0, len(detected_tasks) / 3.0)
    
    # If errand patterns detected with no/low course tasks
    if flagged_errands and len(detected_tasks) == 0:
        is_course_related = False
        # Lower confidence = more certain it's an errand (not course-related)
        confidence_score = round(max(0.05, 0.20 - (len(flagged_errands) * 0.05)), 2)
        flag_level = "Warning - Errand / Administrative"
        feedback = f"Entry flagged: mentions errand or utility tasks ({', '.join(set(flagged_errands))}) without any course-related competencies detected."
    elif flagged_errands and len(detected_tasks) > 0:
        is_course_related = True
        confidence_score = round(max(0.5, 0.6 + (task_match_ratio * 0.3) - 0.2), 2)
        flag_level = "Warning - Errand / Administrative"
        feedback = f"Entry contains valid technical tasks ({', '.join(detected_tasks[:3])}), but also mentions secondary errand activities."
    elif len(detected_tasks) >= 2:
        is_course_related = True
        confidence_score = round(min(0.98, 0.75 + (task_match_ratio * 0.23)), 2)
        flag_level = "Normal"
        feedback = f"Excellent! Activities are clearly aligned with {request.student_course} curriculum competencies."
    elif len(detected_tasks) == 1:
        is_course_related = True
        confidence_score = 0.68
        flag_level = "Normal"
        feedback = f"Relevant task detected ({detected_tasks[0]}). More descriptive details recommended."
    else:
        # No course task AND no errand keyword matched — still a low-value entry
        # Give a low score but not 0 since we can't be 100% sure
        is_course_related = False
        confidence_score = 0.15  # Low — walang makitang kahit na anong relevant
        flag_level = "Unrelated"
        feedback = f"Activities described do not show clear application of {request.student_course} specific competencies. Please elaborate on actual tasks performed."

    return JournalAnalysisResponse(
        is_course_related=is_course_related,
        confidence_score=confidence_score,
        detected_tasks=detected_tasks,
        flag_level=flag_level,
        feedback=feedback
    )


def analyze_journal_entry(request: JournalAnalysisRequest) -> JournalAnalysisResponse:
    """
    Analyze a journal entry using our unified model hierarchy:
    Course-specific sklearn -> shared JOURNAL sklearn -> rule-based analysis.
    """
    try:
        from .model_manager import get_model_manager
        manager = get_model_manager()
        response, model_used = manager.predict_with_fallback(
            request=request,
            preferred_model=request.preferred_model
        )
        response = _apply_bsit_technical_work_override(request, response)
        response.model_used = model_used
        return response
    except Exception as e:
        logger.warning(f"Unified model manager failed, running safe rule fallback: {e}")
        resp = _analyze_with_rules(request)
        resp = _apply_bsit_technical_work_override(request, resp)
        resp.model_used = "rules"
        return resp
