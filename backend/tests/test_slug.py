from app.services.slug import generate_slug


def test_basic_slug():
    assert generate_slug("123 Main Street, Austin TX") == "123-main-street-austin-tx"


def test_strips_special_chars():
    assert generate_slug("456 Oak Ave. #2B, Dallas TX") == "456-oak-ave-2b-dallas-tx"


def test_lowercases():
    assert generate_slug("789 ELM BLVD") == "789-elm-blvd"


def test_trims_dashes():
    assert generate_slug("  123 Main St  ") == "123-main-st"
