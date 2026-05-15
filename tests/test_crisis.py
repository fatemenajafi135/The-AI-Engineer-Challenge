"""
Tests for api/crisis.py — get_crisis_resource lookups.
"""

import pytest
from api.crisis import get_crisis_resource, _DEFAULT, CRISIS_RESOURCES


class TestGetCrisisResource:
    def test_exact_lowercase_match_iran(self):
        result = get_crisis_resource("iran")
        assert result["name"] == "Social Emergency"
        assert result["number"] == "123"

    def test_case_insensitive_match_iran(self):
        result = get_crisis_resource("Iran")
        assert result["name"] == "Social Emergency"

    def test_uppercase_iran(self):
        result = get_crisis_resource("IRAN")
        assert result["name"] == "Social Emergency"

    def test_us_shorthand(self):
        result = get_crisis_resource("us")
        assert "988" in (result["number"] or "")

    def test_united_states_full(self):
        result = get_crisis_resource("United States")
        assert result["url"] == "https://988lifeline.org"

    def test_uk_shorthand(self):
        result = get_crisis_resource("uk")
        assert result["name"] == "Samaritans"

    def test_united_kingdom_full(self):
        result = get_crisis_resource("united kingdom")
        assert result["name"] == "Samaritans"

    def test_canada(self):
        result = get_crisis_resource("Canada")
        assert result["number"] is not None
        assert "Crisis" in result["name"]

    def test_australia(self):
        result = get_crisis_resource("Australia")
        assert "Lifeline" in result["name"]

    def test_germany(self):
        result = get_crisis_resource("Germany")
        assert result["number"] is not None

    def test_new_zealand(self):
        result = get_crisis_resource("new zealand")
        assert "Lifeline" in result["name"]

    def test_fuzzy_match_partial_key(self):
        # "united" is a substring of "united states" / "united kingdom"
        result = get_crisis_resource("states")
        # Should match "united states" via substring
        assert result is not _DEFAULT

    def test_unknown_country_returns_default(self):
        result = get_crisis_resource("Atlantis")
        assert result == _DEFAULT

    def test_gibberish_country_returns_default(self):
        result = get_crisis_resource("XYZ_NOT_A_COUNTRY_12345")
        assert result == _DEFAULT

    def test_default_has_url(self):
        assert _DEFAULT["url"] is not None
        assert _DEFAULT["url"].startswith("http")

    def test_default_has_name(self):
        assert len(_DEFAULT["name"]) > 5

    def test_result_always_has_required_keys(self):
        for country in ["Iran", "US", "Canada", "totally unknown"]:
            result = get_crisis_resource(country)
            assert "name" in result
            assert "number" in result
            assert "url" in result

    def test_trailing_whitespace_handled(self):
        result = get_crisis_resource("  Australia  ")
        assert result["name"] == "Lifeline Australia"

    def test_all_resource_entries_have_required_keys(self):
        for country_key, resource in CRISIS_RESOURCES.items():
            assert "name" in resource, f"{country_key} missing 'name'"
            assert "number" in resource, f"{country_key} missing 'number'"
            assert "url" in resource, f"{country_key} missing 'url'"
