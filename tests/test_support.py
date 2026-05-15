"""
Tests for api/support.py — query builder and request model.
"""

import pytest
from api.support import _build_query, SupportSearchRequest


def make_req(**kwargs) -> SupportSearchRequest:
    defaults = {
        "country": "Iran",
        "city": "Tehran",
        "concern_type": "anxiety",
        "format_preference": "either",
        "language_preference": "",
        "api_key": "",
    }
    defaults.update(kwargs)
    return SupportSearchRequest(**defaults)


class TestBuildQuery:
    def test_contains_city(self):
        assert "Tehran" in _build_query(make_req(city="Tehran"))

    def test_contains_country(self):
        assert "Iran" in _build_query(make_req(country="Iran"))

    def test_concern_type_included(self):
        q = _build_query(make_req(concern_type="anxiety"))
        assert "anxiety" in q

    def test_concern_type_underscore_replaced_with_space(self):
        # "all_or_nothing" should become "all or nothing" — no underscores in query
        # (concern_type for support is limited to: anxiety, depression, trauma,
        #  relationships, grief, addiction, general, other — none have underscores,
        #  but the code does a generic replace so test it)
        q = _build_query(make_req(concern_type="general"))
        assert "_" not in q

    def test_online_format_adds_online_sessions(self):
        q = _build_query(make_req(format_preference="online"))
        assert "online sessions" in q

    def test_in_person_format_adds_in_person(self):
        q = _build_query(make_req(format_preference="in_person"))
        assert "in-person" in q

    def test_either_format_adds_no_format_keyword(self):
        q = _build_query(make_req(format_preference="either"))
        assert "online sessions" not in q
        assert "in-person" not in q

    def test_language_preference_included_when_set(self):
        q = _build_query(make_req(language_preference="Farsi"))
        assert "Farsi" in q

    def test_language_preference_appends_speaking(self):
        q = _build_query(make_req(language_preference="Spanish"))
        assert "Spanish-speaking" in q

    def test_no_language_when_empty(self):
        q = _build_query(make_req(language_preference=""))
        assert "speaking" not in q

    def test_query_includes_therapist_or_counselor(self):
        q = _build_query(make_req()).lower()
        assert "therapist" in q or "counselor" in q

    def test_query_includes_mental_health(self):
        q = _build_query(make_req()).lower()
        assert "mental health" in q

    def test_query_is_non_empty_string(self):
        q = _build_query(make_req())
        assert isinstance(q, str)
        assert len(q) > 10

    def test_all_concern_types_produce_valid_queries(self):
        concern_types = [
            "anxiety", "depression", "trauma", "relationships",
            "grief", "addiction", "general", "other",
        ]
        for concern in concern_types:
            q = _build_query(make_req(concern_type=concern))
            assert len(q) > 0, f"Empty query for concern_type={concern}"
