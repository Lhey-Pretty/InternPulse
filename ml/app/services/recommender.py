from typing import List
from .matcher import calculate_skill_match
from ..models.schemas import (
    RecommendInternshipsRequest, 
    RecommendInternshipsResponse, 
    RecommendedPosting
)

def recommend_internships(request: RecommendInternshipsRequest) -> RecommendInternshipsResponse:
    evaluated = []

    for posting in request.postings:
        # Calculate skill match score
        match_res = calculate_skill_match(
            student_skills_raw=request.student_skills,
            required_skills_raw=posting.required_skills
        )
        
        score = match_res.match_percentage
        reasons = [
            f"Matches {len(match_res.matched_skills)} of {len(posting.required_skills)} required skills"
        ]

        # Course alignment multiplier
        # If posting has required_course specified and matches student course, give priority
        if posting.required_course:
            posting_course = posting.required_course.upper().replace(' ', '').replace('-', '')
            student_course = request.student_course.upper().replace(' ', '').replace('-', '')
            if posting_course != student_course:
                # Different course penalty
                score = score * 0.6
                reasons.append("Course mismatch reduced the score")
            else:
                # Same course boost
                score = min(100.0, score * 1.1)
                reasons.append("Course aligned with the internship requirement")

        evaluated.append({
            "id": posting.id,
            "title": posting.title,
            "company_name": posting.company_name,
            "match_percentage": round(score, 1),
            "matched_skills": match_res.matched_skills,
            "missing_skills": match_res.missing_skills,
            "confidence": round(min(1.0, max(0.0, score / 100.0)), 2),
            "why_recommended": reasons,
        })

    # Sort descending by match percentage
    evaluated.sort(key=lambda x: x["match_percentage"], reverse=True)

    # Take top_k
    top_postings = []
    for rank, item in enumerate(evaluated[:request.top_k], start=1):
        top_postings.append(RecommendedPosting(
            id=item["id"],
            title=item["title"],
            company_name=item["company_name"],
            match_percentage=item["match_percentage"],
            matched_skills=item["matched_skills"],
            missing_skills=item["missing_skills"],
            rank=rank,
            confidence=item["confidence"],
            why_recommended=item["why_recommended"],
        ))

    return RecommendInternshipsResponse(
        student_course=request.student_course,
        total_evaluated=len(request.postings),
        recommendations=top_postings
    )
