from assistant.rules import reply


def test_greeting():
    assert "Hello" in reply("hi")


def test_office_lookup():
    assert "I.101" in reply("Where is the Training Office?")
    assert "B.201" in reply("Where is the Library?")
    assert "I.102" in reply("Student Affairs")
    assert "E.005" in reply("Where is the IT Helpdesk?")


def test_unknown():
    assert "don't know" in reply("what is the meaning of life")


def test_empty():
    assert reply("   ") == "Please type a question."
