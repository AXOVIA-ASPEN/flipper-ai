"""GCP Secret Manager integration module for Flipper.ai.

Single source of truth for all secret references. Runs at container startup
(before `next start`) to pull secrets from GCP Secret Manager and inject them
as environment variables.

Usage (from start.sh):
    python helpers/secrets.py && exec next start

Requires BUILD_ENV env var set to 'staging' or 'production'.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, fields
from typing import Optional

from google.api_core.exceptions import NotFound
from google.cloud.secretmanager import SecretManagerServiceClient

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GCP_PROJECT_ID = "axovia-flipper"
VALID_ENVS = ("staging", "production")

# ---------------------------------------------------------------------------
# Secret category dataclasses
# ---------------------------------------------------------------------------


@dataclass
class DatabaseSecrets:
    DATABASE_URL: str  # Cloud SQL PostgreSQL connection string (REQUIRED)


@dataclass
class AuthSecrets:
    AUTH_SECRET: str  # NextAuth secret (REQUIRED)
    ENCRYPTION_SECRET: str  # General encryption key (REQUIRED)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GITHUB_CLIENT_ID: Optional[str] = None
    GITHUB_CLIENT_SECRET: Optional[str] = None
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None
    HCAPTCHA_SECRET_KEY: Optional[str] = None


@dataclass
class FirebaseSecrets:
    FIREBASE_CLIENT_EMAIL: Optional[str] = None
    FIREBASE_PRIVATE_KEY: Optional[str] = None
    # Note: NEXT_PUBLIC_ prefix means this value is exposed in the client bundle.
    # Consider setting as a regular env var instead of a Secret Manager secret.
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: Optional[str] = None


@dataclass
class ApiKeySecrets:
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    CLAUDE_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    FLIPPER_API_KEYS: Optional[str] = None
    EBAY_OAUTH_TOKEN: Optional[str] = None


@dataclass
class PaymentSecrets:
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None


@dataclass
class EmailSecrets:
    RESEND_API_KEY: Optional[str] = None


@dataclass
class MonitoringSecrets:
    SENTRY_DSN: Optional[str] = None
    SENTRY_AUTH_TOKEN: Optional[str] = None
    METRICS_TOKEN: Optional[str] = None


# All dataclass types in loading order
_SECRET_CLASSES = (
    DatabaseSecrets,
    AuthSecrets,
    FirebaseSecrets,
    ApiKeySecrets,
    PaymentSecrets,
    EmailSecrets,
    MonitoringSecrets,
)

# Pre-computed list of (field_name, is_required) for every secret field.
# NOTE: _f.type == "str" works because `from __future__ import annotations`
# stores all annotations as strings. If annotations change to use `str | None`
# (PEP 604) instead of `Optional[str]`, this check must be updated.
ALL_SECRET_FIELDS: list[tuple[str, bool]] = []
for _cls in _SECRET_CLASSES:
    for _f in fields(_cls):
        _is_required = _f.type == "str"
        ALL_SECRET_FIELDS.append((_f.name, _is_required))


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------


def load_secrets(build_env: str | None) -> None:
    """Pull secrets from GCP Secret Manager and set them as env vars.

    Args:
        build_env: Must be 'staging' or 'production'.

    Raises:
        ValueError: If build_env is invalid or a required secret is missing.
    """
    if not build_env or build_env not in VALID_ENVS:
        raise ValueError(
            f"BUILD_ENV must be one of {VALID_ENVS}, got {build_env!r}"
        )

    prefix = build_env.upper()
    client = SecretManagerServiceClient()

    loaded = 0
    skipped = 0
    for field_name, is_required in ALL_SECRET_FIELDS:
        secret_name = f"{prefix}_{field_name}"
        resource = (
            f"projects/{GCP_PROJECT_ID}/secrets/{secret_name}/versions/latest"
        )
        try:
            response = client.access_secret_version(
                request={"name": resource}
            )
            value = response.payload.data.decode("utf-8")
            os.environ[field_name] = value
            loaded += 1
        except NotFound:
            if is_required:
                raise ValueError(
                    f"Required secret {field_name} not found in GCP Secret "
                    f"Manager (looked up {secret_name})"
                )
            # Optional secret — leave unset (None equivalent)
            skipped += 1

    print(
        f"[secrets] Loaded {loaded}/{len(ALL_SECRET_FIELDS)} secrets "
        f"for {build_env} ({skipped} optional skipped)",
        file=sys.stderr,
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    load_secrets(os.environ.get("BUILD_ENV", ""))
