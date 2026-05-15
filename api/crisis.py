"""
Static crisis resource mappings by country.
Search engines are unreliable for crisis lines — always surface these from a hardcoded map.
"""

# Country name → crisis line. Keys are lowercase; lookup is fuzzy (substring match).
CRISIS_RESOURCES: dict[str, dict] = {
    "us":             {"name": "988 Suicide & Crisis Lifeline",           "number": "988",              "url": "https://988lifeline.org"},
    "united states":  {"name": "988 Suicide & Crisis Lifeline",           "number": "988",              "url": "https://988lifeline.org"},
    "uk":             {"name": "Samaritans",                              "number": "116 123",           "url": "https://www.samaritans.org"},
    "united kingdom": {"name": "Samaritans",                              "number": "116 123",           "url": "https://www.samaritans.org"},
    "canada":         {"name": "Crisis Services Canada",                  "number": "1-833-456-4566",    "url": "https://www.crisisservicescanada.ca"},
    "australia":      {"name": "Lifeline Australia",                      "number": "13 11 14",          "url": "https://www.lifeline.org.au"},
    "ireland":        {"name": "Samaritans Ireland",                      "number": "116 123",           "url": "https://www.samaritans.org/ireland"},
    "new zealand":    {"name": "Lifeline New Zealand",                    "number": "0800 543 354",      "url": "https://www.lifeline.org.nz"},
    "iran":           {"name": "Social Emergency",                        "number": "123",               "url": None},
    "germany":        {"name": "Telefonseelsorge",                        "number": "0800 111 0 111",    "url": "https://www.telefonseelsorge.de"},
    "france":         {"name": "Numéro national de prévention du suicide","number": "3114",              "url": "https://www.3114.fr"},
    "india":          {"name": "iCall",                                   "number": "9152987821",        "url": "https://icallhelpline.org"},
    "japan":          {"name": "Inochi no Denwa",                         "number": "0120-783-556",      "url": "https://www.inochi.or.jp"},
    "netherlands":    {"name": "Stichting 113 Zelfmoordpreventie",        "number": "113",               "url": "https://www.113.nl"},
    "sweden":         {"name": "Mind Självmordslinjen",                   "number": "90101",             "url": "https://mind.se"},
    "spain":          {"name": "Teléfono de la Esperanza",                "number": "717 003 717",       "url": "https://www.telefonodelaesperanza.org"},
    "brazil":         {"name": "CVV — Centro de Valorização da Vida",     "number": "188",               "url": "https://www.cvv.org.br"},
    "south africa":   {"name": "SADAG",                                   "number": "0800 456 789",      "url": "https://www.sadag.org"},
}

_DEFAULT: dict = {
    "name":   "International Association for Suicide Prevention",
    "number": None,
    "url":    "https://www.iasp.info/resources/Crisis_Centres/",
}


def get_crisis_resource(country: str) -> dict:
    """Return the crisis line for a country (case-insensitive, fuzzy substring match)."""
    key = country.lower().strip()
    if key in CRISIS_RESOURCES:
        return CRISIS_RESOURCES[key]
    for k, v in CRISIS_RESOURCES.items():
        if k in key or key in k:
            return v
    return _DEFAULT
