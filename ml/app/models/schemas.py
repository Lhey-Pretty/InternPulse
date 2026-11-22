from typing import Annotated, Literal, List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

SUPPORTED_COURSES = {
    "BSIT",
    "BSCPE",
    "BSTM",
    "BSHM",
    "BSCRIM",
    "FISHERIES",
    "POLSCI",
    "BEED",
    "BSED_ENGLISH",
    "BSED_SCIENCE",
    "BSED_MATH",
}

Skill = Annotated[str, Field(min_length=1, max_length=128)]
SkillList = Annotated[List[Skill], Field(max_length=100)]
CourseText = Annotated[str, Field(min_length=1, max_length=40)]
JournalText = Annotated[str, Field(min_length=1, max_length=10_000)]
ModelPreference = Optional[Literal["pytorch", "sklearn", "rules"]]

class SkillMatchRequest(BaseModel):
    student_skills: SkillList
    required_skills: SkillList
    optional_skills: Optional[SkillList] = Field(default_factory=list)

class SkillMatchResponse(BaseModel):
    match_percentage: float = Field(..., description="Overall match percentage 0-100%")
    matched_skills: List[str]
    missing_skills: List[str]
    readiness_level: str # 'High Match', 'Moderate Match', 'Low Match'
    score_details: dict

class InternshipPostingItem(BaseModel):
    id: int
    title: str = Field(min_length=1, max_length=256)
    company_name: Optional[str] = Field(default=None, max_length=256)
    required_course: Optional[CourseText] = None
    required_skills: SkillList = Field(default_factory=list)
    location: Optional[str] = Field(default=None, max_length=256)
    is_remote: Optional[bool] = False

class RecommendInternshipsRequest(BaseModel):
    student_course: CourseText
    student_skills: SkillList
    postings: List[InternshipPostingItem] = Field(max_length=100)
    top_k: int = Field(default=5, ge=1, le=10)

    @field_validator("postings")
    @classmethod
    def limit_total_skills(cls, value):
        if sum(len(posting.required_skills) for posting in value) > 1000:
            raise ValueError("At most 1000 total required skills per recommendation request")
        return value

class RecommendedPosting(BaseModel):
    id: int
    title: str
    company_name: Optional[str] = None
    match_percentage: float
    matched_skills: List[str]
    missing_skills: List[str]
    rank: int
    confidence: float = 0.0
    why_recommended: List[str] = Field(default_factory=list)

class RecommendInternshipsResponse(BaseModel):
    student_course: str
    total_evaluated: int
    recommendations: List[RecommendedPosting]

class JournalAnalysisRequest(BaseModel):
    student_course: CourseText
    journal_text: JournalText
    preferred_model: ModelPreference = None

    @field_validator("journal_text")
    @classmethod
    def validate_journal_text(cls, value):
        if not value.strip():
            raise ValueError("Journal text must not be blank")
        return value

    @field_validator("student_course")
    @classmethod
    def validate_student_course(cls, value: str) -> str:
        normalized = value.upper().replace(" ", "").replace("-", "_")
        # Handle variants like BSED_SCIENCE or BSEDSCIENCE
        cleaned = normalized.replace("_", "")
        matched = None
        for course in SUPPORTED_COURSES:
            if course.replace("_", "") == cleaned:
                matched = course
                break
        if not matched:
            raise ValueError(f"Unsupported course. Expected one of: {', '.join(sorted(SUPPORTED_COURSES))}")
        return matched

class JournalAnalysisResponse(BaseModel):
    is_course_related: bool
    confidence_score: float # 0.0 - 1.0
    detected_tasks: List[str]
    flag_level: str # 'Normal', 'Warning - Errand / Administrative', 'Unrelated'
    feedback: str
    model_used: Optional[str] = "fallback" # 'pytorch', 'sklearn', 'rules'
    version: Optional[int] = None

# Laravel backend JournalClassificationService compatibility
class LaravelJournalAnalyzeRequest(JournalAnalysisRequest):
    journal_entry_id: Optional[int] = Field(default=None, ge=1)
    callback_url: Optional[str] = Field(default=None, max_length=2048)

# Batch prediction schemas
class BatchJournalItem(JournalAnalysisRequest):
    id: Optional[Annotated[str, Field(max_length=128)] | int] = None

class BatchJournalAnalysisRequest(BaseModel):
    entries: List[BatchJournalItem] = Field(min_length=1, max_length=50)
    preferred_model: ModelPreference = None

    @field_validator("entries")
    @classmethod
    def limit_total_text(cls, value):
        if sum(len(item.journal_text) for item in value) > 100_000:
            raise ValueError("At most 100000 journal characters per batch")
        return value

class BatchJournalResultItem(BaseModel):
    id: Optional[str | int] = None
    student_course: str
    is_course_related: bool
    confidence_score: float
    flag_level: str
    detected_tasks: List[str]
    feedback: str
    model_used: str

class BatchJournalAnalysisResponse(BaseModel):
    total_processed: int
    success_count: int
    failure_count: int
    processing_time_ms: float
    results: List[BatchJournalResultItem]

# Dual-model comparison & A/B testing
class DualModelAnalysisResponse(BaseModel):
    journal_text_preview: str
    student_course: str
    models_compared: List[str]
    rule_based_result: JournalAnalysisResponse
    ml_result: JournalAnalysisResponse
    is_agreement: bool
    confidence_delta: float
    latency_ms: Dict[str, float]
    recommendation: str

# Interpretability & Explainability
class FeatureAttribution(BaseModel):
    feature: str
    importance_weight: float
    impact: str # 'positive' (supports course-related), 'negative' (supports errand/unrelated)

class JournalExplanationResponse(BaseModel):
    journal_text: str
    student_course: str
    predicted_label: str
    confidence: float
    model_type: str
    top_features: List[FeatureAttribution]
    detected_errands: List[str]
    detected_course_tasks: List[str]
    explanation_summary: str

# Optional offline evaluation endpoint response models. Training itself is run
# outside the local inference service (for example, in Colab).
class OptunaOptimizationRequest(BaseModel):
    program_code: str
    n_trials: int = Field(default=10, ge=1, le=50)
    timeout_seconds: Optional[int] = Field(default=300, ge=1, le=300)

class OptunaOptimizationResponse(BaseModel):
    program_code: str
    optimizer: Optional[str] = "grid_search"
    n_trials_completed: int
    best_params: Dict[str, Any]
    best_score: float
    metric_name: str = "val_f1"

# Evaluation & Metrics
class MetricsSummaryResponse(BaseModel):
    program_code: str
    model_type: str
    accuracy: float
    f1_score: float
    precision: float
    recall: float
    class_names: List[str]
    confusion_matrix: List[List[int]]
    per_class_metrics: Dict[str, Dict[str, float]]
    roc_auc_curves: Optional[Dict[str, Any]] = None
    calibration_data: Optional[Dict[str, Any]] = None
