import os
import sys

# Add ml folder to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from app.services.matcher import calculate_skill_match
from app.services.recommender import recommend_internships
from app.services.nlp_classifier import analyze_journal_entry
from app.models.schemas import (
    RecommendInternshipsRequest, 
    InternshipPostingItem,
    JournalAnalysisRequest,
)

def run_tests():
    print("=" * 60)
    print("TEST 1: SKILL MATCHING SCORE (Cosine / Weighted)")
    print("=" * 60)
    student_skills = ["Python", "MySQL", "Laravel", "Git"]
    required_skills = ["Python", "MySQL", "Docker", "AWS"]
    optional_skills = ["Laravel"]

    result = calculate_skill_match(student_skills, required_skills, optional_skills)
    print(f"Match Percentage: {result.match_percentage}%")
    print(f"Readiness Level:  {result.readiness_level}")
    print(f"Matched Skills:   {result.matched_skills}")
    print(f"Missing Skills:   {result.missing_skills}")
    print(f"Score Details:    {result.score_details}")

    print("\n" + "=" * 60)
    print("TEST 2: INTERNSHIP RECOMMENDATION ENGINE")
    print("=" * 60)
    postings = [
        InternshipPostingItem(
            id=1,
            title="Backend Web Developer Intern",
            company_name="TechCorp Solutions",
            required_course="BSIT",
            required_skills=["Python", "Laravel", "MySQL", "Git"]
        ),
        InternshipPostingItem(
            id=2,
            title="Network & Systems Administrator Intern",
            company_name="Globe Net IT",
            required_course="BSIT",
            required_skills=["Cisco", "Linux", "Windows Server", "Network Security"]
        ),
        InternshipPostingItem(
            id=3,
            title="Tourism Guest Coordinator Intern",
            company_name="Palawan Grand Travel",
            required_course="BSTM",
            required_skills=["Amadeus CRS", "Tour Guiding", "Itinerary Planning"]
        )
    ]

    rec_req = RecommendInternshipsRequest(
        student_course="BSIT",
        student_skills=student_skills,
        postings=postings,
        top_k=3
    )
    rec_result = recommend_internships(rec_req)
    for r in rec_result.recommendations:
        print(f"Rank #{r.rank}: [{r.match_percentage}%] {r.title} @ {r.company_name}")
        print(f"         Matched: {r.matched_skills} | Missing: {r.missing_skills}")

    print("\n" + "=" * 60)
    print("TEST 3: JOURNAL ENTRY NLP ANALYSIS")
    print("=" * 60)
    # Case A: Good course-related journal entry
    good_entry = JournalAnalysisRequest(
        student_course="BSIT",
        journal_text="Ngayong araw, nag-design ako ng database schema at nag-debug ng API endpoints sa Laravel para sa login authentication module."
    )
    res_a = analyze_journal_entry(good_entry)
    print("[Good Entry Test]")
    print(f"Course Related:   {res_a.is_course_related} (Confidence: {res_a.confidence_score})")
    print(f"Flag Level:       {res_a.flag_level}")
    print(f"Detected Tasks:   {res_a.detected_tasks}")
    print(f"Feedback:         {res_a.feedback}")

    # Case B: Errand / Irrelevant task journal entry
    errand_entry = JournalAnalysisRequest(
        student_course="BSIT",
        journal_text="Inutusan ako ni sir mag-timpla ng kape, mag-walis at mag-linis sa pantry, tapos nag-photocopy ng mga personal na papel."
    )
    res_b = analyze_journal_entry(errand_entry)
    print("\n[Errand Entry Test]")
    print(f"Course Related:   {res_b.is_course_related} (Confidence: {res_b.confidence_score})")
    print(f"Flag Level:       {res_b.flag_level}")
    print(f"Feedback:         {res_b.feedback}")

    print("\n" + "=" * 60)
    print("ALL ML TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
