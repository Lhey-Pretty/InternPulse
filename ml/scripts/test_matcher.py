import os
import sys
import unittest

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

from pydantic import ValidationError

from app.models.schemas import JournalAnalysisRequest, RecommendInternshipsRequest
from app.services.matcher import calculate_skill_match, normalize_skill


class MatcherTests(unittest.TestCase):
    def test_aliases_match(self):
        result = calculate_skill_match(
            ["React.js"],
            ["React"],
        )
        self.assertEqual(result.matched_skills, ["React"])
        self.assertEqual(result.missing_skills, [])

    def test_related_api_alias_matches(self):
        result = calculate_skill_match(["RESTful API"], ["API Development"])
        self.assertEqual(result.matched_skills, ["API Development"])

    def test_short_skill_does_not_false_match(self):
        result = calculate_skill_match(["PyTorch"], ["Python"])
        self.assertEqual(result.matched_skills, [])
        self.assertEqual(result.missing_skills, ["Python"])

    def test_proficiency_does_not_affect_binary_skill_score(self):
        result = calculate_skill_match(["Python"], ["Python", "Git"])
        self.assertEqual(result.match_percentage, 50.0)

    def test_normalization_is_stable(self):
        self.assertEqual(normalize_skill("Postgres-SQL"), "postgresql")

    def test_onet_taxonomy_does_not_use_occupation_aliases(self):
        result = calculate_skill_match(
            ["Compensation and Benefits Managers"],
            ["!Trak-it Solutions !Trak-it HR"],
        )
        self.assertEqual(result.matched_skills, [])
        self.assertEqual(result.missing_skills, ["!Trak-it Solutions !Trak-it HR"])

    def test_noisy_onet_product_is_not_matchable(self):
        result = calculate_skill_match(
            ["!Trak-it Solutions !Trak-it HR"],
            ["!Trak-it Solutions !Trak-it HR"],
        )
        self.assertEqual(result.matched_skills, [])
        self.assertEqual(result.missing_skills, ["!Trak-it Solutions !Trak-it HR"])

    def test_empty_requirements_are_not_a_match(self):
        result = calculate_skill_match(["Python"], [])
        self.assertEqual(result.match_percentage, 0.0)
        self.assertEqual(result.readiness_level, "Low Match")

    def test_recommendation_limit_is_bounded(self):
        with self.assertRaises(ValidationError):
            RecommendInternshipsRequest(
                student_course="BSIT",
                student_skills=[],
                postings=[],
                top_k=0,
            )

    def test_unknown_journal_course_is_rejected(self):
        with self.assertRaises(ValidationError):
            JournalAnalysisRequest(
                student_course="UNKNOWN",
                journal_text="I coded an API",
            )


if __name__ == "__main__":
    unittest.main()
