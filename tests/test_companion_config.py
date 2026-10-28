from assistant.backend.config import Settings


def test_workspace_configuration_isolated_from_course_app(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///course-app.db")
    monkeypatch.setenv("LLM_API_KEY", "course-provider-key")
    monkeypatch.setenv("LLM_MODEL", "course-model")
    monkeypatch.delenv("PATHLY_DATABASE_URL", raising=False)
    for suffix in ("API_KEY", "MODEL", "BASE_URL", "TIMEOUT_SECONDS"):
        monkeypatch.delenv("COMPANION_LLM_" + suffix, raising=False)
    config = Settings.from_env()
    assert config.database_url == "sqlite:///./pathly.db"
    assert config.llm_api_key == "" and config.llm_model == ""


def test_workspace_reads_its_explicit_provider_and_database(monkeypatch):
    monkeypatch.setenv("PATHLY_DATABASE_URL", "sqlite:///workspace-test.db")
    monkeypatch.setenv("COMPANION_LLM_API_KEY", "workspace-provider-key")
    monkeypatch.setenv("COMPANION_LLM_MODEL", "workspace-model")
    config = Settings.from_env()
    assert config.database_url == "sqlite:///workspace-test.db"
    assert config.llm_api_key == "workspace-provider-key"
    assert config.llm_model == "workspace-model"
