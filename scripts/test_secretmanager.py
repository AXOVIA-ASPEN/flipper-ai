"""
file: scripts/test_secretmanager.py
author: Stephen Boyett
company: Axovia AI
date: 2026-04-12
version: 1.0
brief: Tests for the EnvSecretManager class in scripts/secretmanager.py.

description:
    Unit tests for the YAML-driven GCP Secret Manager integration module.
    Covers YAML loading, scope filtering, secret lookup, environment variable
    injection, SecretScope enum values, and error handling for missing config.
    All GCP API calls are mocked.
"""

import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import yaml

from secretmanager import EnvSecretManager, Secret, SecretScope

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_YAML = {
    "stored-secrets": {
        "environments": {
            "all": {
                "firebase-auth-domain": {
                    "name": "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
                    "description": "Firebase Auth domain",
                },
            },
            "production": {
                "database-url": {
                    "name": "DATABASE_URL",
                    "description": "Cloud SQL PostgreSQL connection string (REQUIRED)",
                },
                "encryption-secret": {
                    "name": "ENCRYPTION_SECRET",
                    "description": "General encryption key (REQUIRED)",
                },
                "openai-api-key": {
                    "name": "OPENAI_API_KEY",
                    "description": "OpenAI API key",
                },
            },
            "staging": {
                "database-url": {
                    "name": "DATABASE_URL",
                    "description": "Staging Cloud SQL connection string",
                },
            },
            "dev": {
                "database-url": {
                    "name": "DATABASE_URL",
                    "description": "Local PostgreSQL connection string",
                },
            },
        }
    }
}


@pytest.fixture()
def yaml_config_file(tmp_path: Path) -> Path:
    """Write sample YAML config to a temp file and return the path."""
    config_file = tmp_path / "secretmanager.yaml"
    config_file.write_text(yaml.dump(SAMPLE_YAML, default_flow_style=False))
    return config_file


@pytest.fixture()
def manager(yaml_config_file: Path) -> EnvSecretManager:
    """Return an EnvSecretManager initialised from the sample YAML fixture."""
    return EnvSecretManager(
        project_id="test-project",
        config_path=yaml_config_file,
    )


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    """Remove secrets-related env vars before each test."""
    for key in [
        "DATABASE_URL",
        "ENCRYPTION_SECRET",
        "OPENAI_API_KEY",
        "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    ]:
        monkeypatch.delenv(key, raising=False)


# ---------------------------------------------------------------------------
# Test SecretScope enum
# ---------------------------------------------------------------------------


class TestSecretScope:
    """Verify SecretScope enum values."""

    def test_scope_values(self):
        assert SecretScope.ALL == "ALL"
        assert SecretScope.DEV == "DEV"
        assert SecretScope.PROD == "PROD"
        assert SecretScope.STAGING == "STAGING"

    def test_scope_is_str_enum(self):
        # StrEnum values are usable as strings
        assert f"prefix_{SecretScope.PROD}" == "prefix_PROD"


# ---------------------------------------------------------------------------
# Test YAML loading
# ---------------------------------------------------------------------------


class TestYamlLoading:
    """Verify secrets are correctly parsed from YAML config."""

    def test_loads_all_secrets(self, manager: EnvSecretManager):
        names = {s.name for s in manager.secrets}
        assert "DATABASE_URL" in names
        assert "ENCRYPTION_SECRET" in names
        assert "OPENAI_API_KEY" in names
        assert "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" in names

    def test_secret_scopes_assigned(self, manager: EnvSecretManager):
        db_secrets = [s for s in manager.secrets if s.name == "DATABASE_URL"]
        scopes = {s.scope for s in db_secrets}
        assert SecretScope.PROD in scopes
        assert SecretScope.STAGING in scopes
        assert SecretScope.DEV in scopes

    def test_all_scope_secret(self, manager: EnvSecretManager):
        firebase = manager.get_secret("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
        assert firebase is not None
        assert firebase.scope == SecretScope.ALL

    def test_descriptions_loaded(self, manager: EnvSecretManager):
        firebase = manager.get_secret("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
        assert firebase is not None
        assert firebase.description == "Firebase Auth domain"


# ---------------------------------------------------------------------------
# Test scope filtering
# ---------------------------------------------------------------------------


class TestScopeFiltering:
    """Verify get_secrets_by_scope returns correct secrets."""

    def test_production_scope_includes_all(self, manager: EnvSecretManager):
        prod_secrets = manager.get_secrets_by_scope(SecretScope.PROD)
        names = {s.name for s in prod_secrets}
        # Should include production-scoped secrets
        assert "DATABASE_URL" in names
        assert "ENCRYPTION_SECRET" in names
        # Should include ALL-scoped secrets
        assert "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" in names

    def test_staging_scope(self, manager: EnvSecretManager):
        staging_secrets = manager.get_secrets_by_scope(SecretScope.STAGING)
        names = {s.name for s in staging_secrets}
        assert "DATABASE_URL" in names
        assert "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" in names
        # Should NOT include production-only secrets
        assert "ENCRYPTION_SECRET" not in names

    def test_dev_scope(self, manager: EnvSecretManager):
        dev_secrets = manager.get_secrets_by_scope(SecretScope.DEV)
        names = {s.name for s in dev_secrets}
        assert "DATABASE_URL" in names
        assert "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" in names


# ---------------------------------------------------------------------------
# Test get_secret lookup
# ---------------------------------------------------------------------------


class TestGetSecret:
    """Verify get_secret returns correct results for found and not found."""

    def test_found(self, manager: EnvSecretManager):
        secret = manager.get_secret("ENCRYPTION_SECRET")
        assert secret is not None
        assert secret.name == "ENCRYPTION_SECRET"
        assert secret.scope == SecretScope.PROD

    def test_not_found(self, manager: EnvSecretManager):
        secret = manager.get_secret("NONEXISTENT_SECRET")
        assert secret is None


# ---------------------------------------------------------------------------
# Test load_into_environ
# ---------------------------------------------------------------------------


class TestLoadIntoEnviron:
    """Verify load_into_environ populates os.environ via mocked GCP client."""

    def test_loads_secrets_into_env(self, manager: EnvSecretManager):
        mock_client = MagicMock()

        def _access(request):
            name = request["name"].split("/secrets/")[1].split("/versions")[0]
            response = MagicMock()
            response.payload.data = f"mock-value-{name}".encode("utf-8")
            return response

        mock_client.access_secret_version.side_effect = _access
        manager._client = mock_client

        count = manager.load_into_environ(SecretScope.PROD)

        assert count > 0
        # Production secrets should be in env
        assert os.environ.get("DATABASE_URL") is not None
        assert os.environ.get("ENCRYPTION_SECRET") is not None
        # ALL-scope secrets should also be in env
        assert os.environ.get("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") is not None

    def test_load_count_matches_scope(self, manager: EnvSecretManager):
        mock_client = MagicMock()

        def _access(request):
            response = MagicMock()
            response.payload.data = b"mock-value"
            return response

        mock_client.access_secret_version.side_effect = _access
        manager._client = mock_client

        count = manager.load_into_environ(SecretScope.PROD)
        expected = len(manager.get_secrets_by_scope(SecretScope.PROD))
        assert count == expected


# ---------------------------------------------------------------------------
# Test error on missing config file
# ---------------------------------------------------------------------------


class TestMissingConfig:
    """Verify FileNotFoundError when config file does not exist."""

    def test_missing_config_raises(self, tmp_path: Path):
        missing_path = tmp_path / "does-not-exist.yaml"
        with pytest.raises(FileNotFoundError, match="Secret config not found"):
            EnvSecretManager(
                project_id="test-project",
                config_path=missing_path,
            )
