"""Tests for helpers/secrets.py — GCP Secret Manager integration module.

Uses pytest + pytest-mock. All GCP API calls are mocked.
"""

import os
from dataclasses import fields
from unittest.mock import MagicMock

import pytest
from google.api_core.exceptions import NotFound


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    """Remove secrets-related env vars before each test so tests are isolated."""
    keys_to_remove = [
        "BUILD_ENV",
        "DATABASE_URL",
        "AUTH_SECRET",
        "ENCRYPTION_SECRET",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GITHUB_CLIENT_ID",
        "GITHUB_CLIENT_SECRET",
        "FACEBOOK_APP_ID",
        "FACEBOOK_APP_SECRET",
        "HCAPTCHA_SECRET_KEY",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
        "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "CLAUDE_API_KEY",
        "GOOGLE_API_KEY",
        "FLIPPER_API_KEYS",
        "EBAY_OAUTH_TOKEN",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "RESEND_API_KEY",
        "SENTRY_DSN",
        "SENTRY_AUTH_TOKEN",
        "METRICS_TOKEN",
    ]
    for key in keys_to_remove:
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def mock_sm_client(mocker):
    """Return a mocked SecretManagerServiceClient whose access_secret_version
    resolves to a payload with the secret name as the value."""

    mock_client_class = mocker.patch(
        "secrets.SecretManagerServiceClient",  # patched in the secrets module
    )
    mock_instance = MagicMock()
    mock_client_class.return_value = mock_instance

    def _access(request):
        # Extract the secret name from the resource path
        # Format: projects/axovia-flipper/secrets/{NAME}/versions/latest
        name = request["name"].split("/secrets/")[1].split("/versions")[0]
        # Return the env-var portion (strip the ENV_ prefix)
        parts = name.split("_", 1)  # e.g. PRODUCTION_DATABASE_URL -> DATABASE_URL
        env_var_name = parts[1] if len(parts) > 1 else name
        response = MagicMock()
        response.payload.data = f"mock-value-{env_var_name}".encode("utf-8")
        return response

    mock_instance.access_secret_version.side_effect = _access
    return mock_instance


@pytest.fixture
def mock_sm_client_with_missing_optional(mocker):
    """Client that raises NotFound for optional secrets but succeeds for required ones."""

    mock_client_class = mocker.patch("secrets.SecretManagerServiceClient")
    mock_instance = MagicMock()
    mock_client_class.return_value = mock_instance

    REQUIRED_FIELDS = {"DATABASE_URL", "AUTH_SECRET", "ENCRYPTION_SECRET"}

    def _access(request):
        name = request["name"].split("/secrets/")[1].split("/versions")[0]
        parts = name.split("_", 1)
        env_var_name = parts[1] if len(parts) > 1 else name
        if env_var_name not in REQUIRED_FIELDS:
            raise NotFound(f"Secret {name} not found")
        response = MagicMock()
        response.payload.data = f"mock-value-{env_var_name}".encode("utf-8")
        return response

    mock_instance.access_secret_version.side_effect = _access
    return mock_instance


# ---------------------------------------------------------------------------
# Task 4.2: Test dataclass structure
# ---------------------------------------------------------------------------

class TestDataclassStructure:
    """Verify all category dataclasses exist with correct fields and types."""

    def test_database_secrets_fields(self):
        from secrets import DatabaseSecrets
        f = {field.name: field.type for field in fields(DatabaseSecrets)}
        assert "DATABASE_URL" in f
        assert f["DATABASE_URL"] == "str"

    def test_auth_secrets_fields(self):
        from secrets import AuthSecrets
        f = {field.name for field in fields(AuthSecrets)}
        expected = {
            "AUTH_SECRET", "ENCRYPTION_SECRET",
            "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
            "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET",
            "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET",
            "HCAPTCHA_SECRET_KEY",
        }
        assert expected == f

    def test_auth_secrets_required_vs_optional(self):
        from secrets import AuthSecrets
        for field in fields(AuthSecrets):
            if field.name in ("AUTH_SECRET", "ENCRYPTION_SECRET"):
                assert field.type == "str", f"{field.name} should be required (str)"
            else:
                assert "Optional" in str(field.type), f"{field.name} should be Optional"

    def test_api_key_secrets_fields(self):
        from secrets import ApiKeySecrets
        f = {field.name for field in fields(ApiKeySecrets)}
        expected = {
            "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "CLAUDE_API_KEY",
            "GOOGLE_API_KEY", "FLIPPER_API_KEYS", "EBAY_OAUTH_TOKEN",
        }
        assert expected == f

    def test_payment_secrets_fields(self):
        from secrets import PaymentSecrets
        f = {field.name for field in fields(PaymentSecrets)}
        assert f == {"STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"}

    def test_email_secrets_fields(self):
        from secrets import EmailSecrets
        f = {field.name for field in fields(EmailSecrets)}
        assert f == {"RESEND_API_KEY"}

    def test_monitoring_secrets_fields(self):
        from secrets import MonitoringSecrets
        f = {field.name for field in fields(MonitoringSecrets)}
        assert f == {"SENTRY_DSN", "SENTRY_AUTH_TOKEN", "METRICS_TOKEN"}

    def test_firebase_secrets_fields(self):
        from secrets import FirebaseSecrets
        f = {field.name for field in fields(FirebaseSecrets)}
        assert f == {"FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"}

    def test_firebase_secrets_all_optional(self):
        from secrets import FirebaseSecrets
        for field in fields(FirebaseSecrets):
            assert "Optional" in str(field.type), (
                f"FirebaseSecrets.{field.name} should be Optional"
            )

    def test_all_optional_fields_have_none_default(self):
        from secrets import (
            AuthSecrets, FirebaseSecrets, ApiKeySecrets, PaymentSecrets,
            EmailSecrets, MonitoringSecrets,
        )
        for cls in (AuthSecrets, FirebaseSecrets, ApiKeySecrets, PaymentSecrets, EmailSecrets, MonitoringSecrets):
            for field in fields(cls):
                if "Optional" in str(field.type):
                    assert field.default is None, (
                        f"{cls.__name__}.{field.name} Optional field should default to None"
                    )


# ---------------------------------------------------------------------------
# Task 4.3: Test BUILD_ENV validation
# ---------------------------------------------------------------------------

class TestBuildEnvValidation:
    """BUILD_ENV must be 'staging' or 'production'. Anything else raises ValueError."""

    def test_valid_staging(self, mock_sm_client):
        from secrets import load_secrets
        load_secrets("staging")  # should not raise

    def test_valid_production(self, mock_sm_client):
        from secrets import load_secrets
        load_secrets("production")  # should not raise

    def test_missing_build_env_none(self, mocker):
        mocker.patch("secrets.SecretManagerServiceClient")
        from secrets import load_secrets
        with pytest.raises(ValueError, match="BUILD_ENV"):
            load_secrets(None)

    def test_missing_build_env_empty(self, mocker):
        mocker.patch("secrets.SecretManagerServiceClient")
        from secrets import load_secrets
        with pytest.raises(ValueError, match="BUILD_ENV"):
            load_secrets("")

    def test_invalid_build_env_dev(self, mocker):
        mocker.patch("secrets.SecretManagerServiceClient")
        from secrets import load_secrets
        with pytest.raises(ValueError, match="BUILD_ENV"):
            load_secrets("dev")

    def test_invalid_build_env_local(self, mocker):
        mocker.patch("secrets.SecretManagerServiceClient")
        from secrets import load_secrets
        with pytest.raises(ValueError, match="BUILD_ENV"):
            load_secrets("local")


# ---------------------------------------------------------------------------
# Task 4.4: Test secret loading with mocked client
# ---------------------------------------------------------------------------

class TestSecretLoading:
    """Verify load_secrets calls access_secret_version with correct resource names."""

    def test_production_prefix(self, mock_sm_client):
        from secrets import load_secrets
        load_secrets("production")
        calls = mock_sm_client.access_secret_version.call_args_list
        resource_names = [c.kwargs["request"]["name"] for c in calls]
        # All should start with the production prefix
        for rn in resource_names:
            assert "/secrets/PRODUCTION_" in rn

    def test_staging_prefix(self, mock_sm_client):
        from secrets import load_secrets
        load_secrets("staging")
        calls = mock_sm_client.access_secret_version.call_args_list
        resource_names = [c.kwargs["request"]["name"] for c in calls]
        for rn in resource_names:
            assert "/secrets/STAGING_" in rn

    def test_resource_name_format(self, mock_sm_client):
        from secrets import load_secrets
        load_secrets("production")
        calls = mock_sm_client.access_secret_version.call_args_list
        for c in calls:
            rn = c.kwargs["request"]["name"]
            assert rn.startswith("projects/axovia-flipper/secrets/")
            assert rn.endswith("/versions/latest")

    def test_all_dataclass_fields_fetched(self, mock_sm_client):
        from secrets import load_secrets, ALL_SECRET_FIELDS
        load_secrets("production")
        call_count = mock_sm_client.access_secret_version.call_count
        assert call_count == len(ALL_SECRET_FIELDS)


# ---------------------------------------------------------------------------
# Task 4.5: Test environment variable injection
# ---------------------------------------------------------------------------

class TestEnvVarInjection:
    """After load_secrets(), os.environ should contain the fetched values."""

    def test_required_secrets_in_env(self, mock_sm_client):
        from secrets import load_secrets
        load_secrets("production")
        assert os.environ.get("DATABASE_URL") == "mock-value-DATABASE_URL"
        assert os.environ.get("AUTH_SECRET") == "mock-value-AUTH_SECRET"
        assert os.environ.get("ENCRYPTION_SECRET") == "mock-value-ENCRYPTION_SECRET"

    def test_optional_secrets_in_env(self, mock_sm_client):
        from secrets import load_secrets
        load_secrets("production")
        assert os.environ.get("OPENAI_API_KEY") == "mock-value-OPENAI_API_KEY"
        assert os.environ.get("STRIPE_SECRET_KEY") == "mock-value-STRIPE_SECRET_KEY"
        assert os.environ.get("RESEND_API_KEY") == "mock-value-RESEND_API_KEY"


# ---------------------------------------------------------------------------
# Task 4.6: Test optional secrets — NotFound sets None
# ---------------------------------------------------------------------------

class TestOptionalSecretsNotFound:
    """Optional secrets that don't exist in GCP should result in None (not set in env)."""

    def test_optional_not_found_sets_none(self, mock_sm_client_with_missing_optional):
        from secrets import load_secrets
        load_secrets("production")
        # Required secrets should be set
        assert os.environ.get("DATABASE_URL") == "mock-value-DATABASE_URL"
        # Optional secrets should NOT be in os.environ (None means not set)
        assert os.environ.get("OPENAI_API_KEY") is None
        assert os.environ.get("STRIPE_SECRET_KEY") is None


# ---------------------------------------------------------------------------
# Task 4.7: Test required secrets — NotFound raises ValueError
# ---------------------------------------------------------------------------

class TestRequiredSecretsNotFound:
    """Required secrets that don't exist in GCP should raise ValueError."""

    def test_missing_database_url_raises(self, mocker):
        mock_client_class = mocker.patch("secrets.SecretManagerServiceClient")
        mock_instance = MagicMock()
        mock_client_class.return_value = mock_instance
        mock_instance.access_secret_version.side_effect = NotFound("not found")

        from secrets import load_secrets
        with pytest.raises(ValueError, match="DATABASE_URL"):
            load_secrets("production")

    def test_missing_auth_secret_raises(self, mocker):
        mock_client_class = mocker.patch("secrets.SecretManagerServiceClient")
        mock_instance = MagicMock()
        mock_client_class.return_value = mock_instance

        call_count = 0
        def _access(request):
            nonlocal call_count
            name = request["name"].split("/secrets/")[1].split("/versions")[0]
            parts = name.split("_", 1)
            env_var_name = parts[1] if len(parts) > 1 else name
            # DATABASE_URL succeeds, AUTH_SECRET fails
            if env_var_name == "AUTH_SECRET":
                raise NotFound("not found")
            response = MagicMock()
            response.payload.data = f"val-{env_var_name}".encode("utf-8")
            return response

        mock_instance.access_secret_version.side_effect = _access

        from secrets import load_secrets
        with pytest.raises(ValueError, match="AUTH_SECRET"):
            load_secrets("production")
