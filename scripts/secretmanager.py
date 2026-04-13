"""
file: scripts/secretmanager.py
author: Stephen Boyett <stephen.boyett@silverlinesoftware.co>
company: Axovia AI
date: 2026-04-12
version: 1.0
brief: GCP Secret Manager CLI and reusable class for per-environment secrets management.

description:
    Reads config/secretmanager.yaml as the single source of truth for which GCP
    Secret Manager secrets map to which environments (production, staging, dev, all).
    Provides an importable EnvSecretManager class for the pipeline, build commands,
    and test frameworks, plus CLI subcommands: validate, populate, audit.

    CLI usage:
        python scripts/secretmanager.py validate --env staging
        python scripts/secretmanager.py populate --env staging --dry-run
        python scripts/secretmanager.py audit

see also:
    - config/secretmanager.yaml
    - helpers/secrets.py (legacy loader — to be replaced by this module)

---
Copyright 2026 (c) Axovia AI
---
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path

import yaml

# ── Constants ────────────────────────────────────────────────────────

GCP_PROJECT_ID = "axovia-flipper"
CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "secretmanager.yaml"


# ── Enum & Dataclass ────────────────────────────────────────────────


class SecretScope(StrEnum):
    ALL = "ALL"
    DEV = "DEV"
    PROD = "PROD"
    STAGING = "STAGING"


@dataclass
class Secret:
    """Represents a single Environment Secret stored in Google Cloud Secret Manager."""

    name: str
    scope: SecretScope
    description: str | None = None
    value: str | None = field(default=None, repr=False)


# ── Secret Manager ──────────────────────────────────────────────────


class EnvSecretManager:
    """Class for managing Environment Secrets stored in GCP for Flipper.ai.

    Reads from `config/secretmanager.yaml` as the single source of truth for
    which secrets exist and which scopes they belong to. All cloud operations
    go through the `google-cloud-secret-manager` SDK.
    """

    def __init__(
        self,
        project_id: str = GCP_PROJECT_ID,
        config_path: Path = CONFIG_PATH,
    ):
        self._project_id = project_id
        self._config_path = config_path
        self._client = None  # lazy: SecretManagerServiceClient
        self._secrets: list[Secret] = []
        self._load_secrets()

    # ── GCP client (lazy) ────────────────────────────────────────────

    @property
    def client(self):
        """Lazily initialise the GCP Secret Manager client."""
        if self._client is None:
            from google.cloud import secretmanager as sm

            self._client = sm.SecretManagerServiceClient()
        return self._client

    @property
    def parent(self) -> str:
        """GCP resource parent path."""
        return f"projects/{self._project_id}"

    # ── YAML loading ─────────────────────────────────────────────────

    def _load_secrets(self) -> None:
        """Parse config/secretmanager.yaml and populate self._secrets."""
        if not self._config_path.exists():
            raise FileNotFoundError(f"Secret config not found: {self._config_path}")

        raw = yaml.safe_load(self._config_path.read_text()) or {}
        environments = raw.get("stored-secrets", {}).get("environments", {})

        self._secrets = []
        for env_name, entries in environments.items():
            scope = self._env_name_to_scope(env_name)
            if entries is None:
                continue
            for _slug, config in entries.items():
                if config is None:
                    continue
                self._secrets.append(
                    Secret(
                        name=config["name"],
                        scope=scope,
                        description=config.get("description"),
                    )
                )

    @staticmethod
    def _env_name_to_scope(env_name: str) -> SecretScope:
        """Map a YAML environment key to a SecretScope enum."""
        mapping = {
            "production": SecretScope.PROD,
            "staging": SecretScope.STAGING,
            "dev": SecretScope.DEV,
            "all": SecretScope.ALL,
        }
        key = env_name.strip().lower()
        if key not in mapping:
            raise ValueError(
                f"Unknown environment in secretmanager.yaml: '{env_name}'"
            )
        return mapping[key]

    # ── Read helpers ─────────────────────────────────────────────────

    @property
    def secrets(self) -> list[Secret]:
        """All secrets loaded from the YAML config."""
        return list(self._secrets)

    def get_secret(self, name: str) -> Secret | None:
        """Look up a single secret by GCP name from the loaded config."""
        return next((s for s in self._secrets if s.name == name), None)

    def get_secrets_by_scope(self, scope: SecretScope) -> list[Secret]:
        """Return all secrets that match the given scope (or ALL)."""
        return [
            s
            for s in self._secrets
            if s.scope == scope or s.scope == SecretScope.ALL
        ]

    # ── Cloud → Local ────────────────────────────────────────────────

    def download_secret_value(self, secret_name: str, scope: SecretScope | None = None) -> str:
        """Pull the latest version of a secret from GCP Secret Manager.

        If scope is provided, the GCP secret name is prefixed:
        e.g. PRODUCTION_DATABASE_URL. If not, the raw name is used.
        """
        gcp_name = secret_name
        if scope and scope != SecretScope.ALL:
            gcp_name = f"{scope.value}_{secret_name}"

        resource = f"{self.parent}/secrets/{gcp_name}/versions/latest"
        response = self.client.access_secret_version(request={"name": resource})
        return response.payload.data.decode("utf-8")

    def download_secrets_by_scope(self, scope: SecretScope) -> list[Secret]:
        """Download the value of every secret matching *scope* from the cloud.

        Returns the list of secrets with their `.value` populated.
        Raises on any individual download failure so callers know which
        secret is broken rather than silently skipping it.
        """
        targets = self.get_secrets_by_scope(scope)
        for secret in targets:
            try:
                secret.value = self.download_secret_value(secret.name, scope)
            except Exception as exc:
                raise RuntimeError(
                    f"Failed to download secret '{secret.name}' from GCP Secret Manager."
                ) from exc
        return targets

    # ── Local → Cloud ────────────────────────────────────────────────

    def store_secret(self, secret: Secret) -> None:
        """Store (create or add a new version of) a secret in GCP.

        The secret must already be registered in `secretmanager.yaml`.
        """
        if self.get_secret(secret.name) is None:
            raise ValueError(
                f"Secret '{secret.name}' is not configured in {self._config_path}. "
                "Add it to the YAML before storing in the cloud."
            )
        if secret.value is None:
            raise ValueError(f"Secret '{secret.name}' has no value to store.")

        gcp_name = secret.name
        if secret.scope != SecretScope.ALL:
            gcp_name = f"{secret.scope.value}_{secret.name}"

        secret_path = f"{self.parent}/secrets/{gcp_name}"

        # Create the secret resource if it doesn't exist yet.
        try:
            self.client.get_secret(request={"name": secret_path})
        except Exception:
            self.client.create_secret(
                request={
                    "parent": self.parent,
                    "secret_id": gcp_name,
                    "secret": {"replication": {"automatic": {}}},
                }
            )

        # Add the new secret version.
        self.client.add_secret_version(
            request={
                "parent": secret_path,
                "payload": {"data": secret.value.encode("utf-8")},
            }
        )

    # ── YAML config management ───────────────────────────────────────

    def add_secret(self, secret: Secret) -> None:
        """Register a new secret in `secretmanager.yaml`.

        Does NOT push the value to the cloud — call `store_secret` after
        this to upload the value.
        """
        if self.get_secret(secret.name) is not None:
            raise ValueError(
                f"Secret '{secret.name}' already exists in the config."
            )

        raw = yaml.safe_load(self._config_path.read_text()) or {}
        environments = raw.setdefault("stored-secrets", {}).setdefault(
            "environments", {}
        )

        env_key = self._scope_to_env_name(secret.scope)
        env_section = environments.setdefault(env_key, {})

        slug = secret.name.lower().replace("_", "-")
        env_section[slug] = {
            "name": secret.name,
            "description": secret.description,
        }

        self._config_path.write_text(
            yaml.dump(raw, default_flow_style=False, sort_keys=False)
        )
        self._secrets.append(secret)

    def update_secret(self, secret: Secret) -> None:
        """Update the description / scope of an existing secret in `secretmanager.yaml`."""
        existing = self.get_secret(secret.name)
        if existing is None:
            raise ValueError(
                f"Secret '{secret.name}' not found in config — use add_secret first."
            )

        raw = yaml.safe_load(self._config_path.read_text()) or {}
        environments = raw.get("stored-secrets", {}).get("environments", {})

        # Remove from old environment section.
        old_env_key = self._scope_to_env_name(existing.scope)
        old_section = environments.get(old_env_key, {})
        slug = secret.name.lower().replace("_", "-")
        old_section.pop(slug, None)

        # Insert into (possibly new) environment section.
        new_env_key = self._scope_to_env_name(secret.scope)
        new_section = environments.setdefault(new_env_key, {})
        new_section[slug] = {
            "name": secret.name,
            "description": secret.description,
        }

        self._config_path.write_text(
            yaml.dump(raw, default_flow_style=False, sort_keys=False)
        )
        self._load_secrets()

    @staticmethod
    def _scope_to_env_name(scope: SecretScope) -> str:
        """Map a SecretScope enum back to a YAML environment key."""
        return {
            SecretScope.PROD: "production",
            SecretScope.STAGING: "staging",
            SecretScope.DEV: "dev",
            SecretScope.ALL: "all",
        }[scope]

    # ── Cloud inventory ──────────────────────────────────────────────

    def list_cloud_secrets(self) -> list[str]:
        """List all secret names that exist in GCP Secret Manager."""
        response = self.client.list_secrets(request={"parent": self.parent})
        return [s.name.split("/")[-1] for s in response]

    def audit_drift(self) -> dict[str, list[str]]:
        """Compare YAML config against what actually exists in GCP.

        Returns a dict with two keys:
          - 'missing_in_cloud': configured in YAML but not in GCP
          - 'missing_in_yaml': exists in GCP but not in YAML config
        """
        cloud_names = set(self.list_cloud_secrets())
        yaml_names = {s.name for s in self._secrets}
        return {
            "missing_in_cloud": sorted(yaml_names - cloud_names),
            "missing_in_yaml": sorted(cloud_names - yaml_names),
        }

    # ── Env file generation ──────────────────────────────────────────

    def generate_env_file(self, scope: SecretScope) -> str:
        """Generate a .env file body for the given scope.

        Each line is ``SECRET_NAME=<value>`` (or a placeholder comment
        if the value hasn't been downloaded).
        """
        secrets = self.get_secrets_by_scope(scope)
        lines: list[str] = [
            f"# Auto-generated from config/secretmanager.yaml for scope: {scope.value}",
            f"# Secrets: {len(secrets)}",
            "",
        ]
        for secret in secrets:
            val = (
                secret.value
                if secret.value is not None
                else "# MISSING — not downloaded"
            )
            lines.append(f"{secret.name}={val}")
        lines.append("")
        return "\n".join(lines)

    # ── Container startup (replaces helpers/secrets.py) ──────────────

    def load_into_environ(self, scope: SecretScope) -> int:
        """Download all secrets for scope and inject into os.environ.

        Returns the number of secrets successfully loaded.
        This is the method called at container startup (start.sh).
        """
        import os

        secrets = self.download_secrets_by_scope(scope)
        for secret in secrets:
            if secret.value is not None:
                os.environ[secret.name] = secret.value
        return len(secrets)


# ── CLI ──────────────────────────────────────────────────────────────


_SCOPE_MAP: dict[str, SecretScope] = {
    "production": SecretScope.PROD,
    "staging": SecretScope.STAGING,
    "dev": SecretScope.DEV,
    "all": SecretScope.ALL,
}


def _resolve_scope(env_name: str) -> SecretScope:
    """Resolve a user-supplied environment name to a SecretScope."""
    key = env_name.strip().lower()
    if key not in _SCOPE_MAP:
        print(
            f"Error: Unknown environment '{env_name}'. "
            f"Must be one of: {', '.join(_SCOPE_MAP.keys())}",
            file=sys.stderr,
        )
        sys.exit(1)
    return _SCOPE_MAP[key]


def cmd_validate(args: argparse.Namespace) -> None:
    """Validate that all secrets for an environment exist in GCP."""
    mgr = EnvSecretManager()
    scope = _resolve_scope(args.env)
    secrets = mgr.get_secrets_by_scope(scope)

    print(f"Validating {len(secrets)} secrets for scope: {scope.value}")
    print()

    cloud_names = set(mgr.list_cloud_secrets())
    missing: list[str] = []
    for s in secrets:
        status = "OK" if s.name in cloud_names else "MISSING"
        marker = "+" if status == "OK" else "X"
        print(f"  [{marker}] {s.name:45s} {status}")
        if status == "MISSING":
            missing.append(s.name)

    print()
    if missing:
        print(f"FAIL: {len(missing)} secret(s) missing in GCP Secret Manager.")
        sys.exit(1)
    else:
        print(f"PASS: All {len(secrets)} secrets present.")


def cmd_populate(args: argparse.Namespace) -> None:
    """Generate an .env file for an environment from GCP secret values."""
    mgr = EnvSecretManager()
    scope = _resolve_scope(args.env)

    if args.dry_run:
        secrets = mgr.get_secrets_by_scope(scope)
        print(f"[dry-run] Would generate .env for scope: {scope.value}")
        print(f"[dry-run] {len(secrets)} secret(s):")
        for s in secrets:
            print(f"  {s.name}=<will be downloaded from GCP>")
        return

    secrets = mgr.download_secrets_by_scope(scope)
    content = mgr.generate_env_file(scope)

    out_path = Path(f".env.{args.env.lower()}")
    if args.output:
        out_path = Path(args.output)

    out_path.write_text(content)
    print(f"Wrote {len(secrets)} secrets to {out_path}")


def cmd_audit(args: argparse.Namespace) -> None:
    """Audit drift between YAML config and GCP Secret Manager."""
    mgr = EnvSecretManager()
    drift = mgr.audit_drift()

    missing_cloud = drift["missing_in_cloud"]
    missing_yaml = drift["missing_in_yaml"]

    if missing_cloud:
        print(
            f"UNPROVISIONED — in YAML but not in GCP ({len(missing_cloud)}):"
        )
        for name in missing_cloud:
            print(f"  [!] {name}")
    else:
        print("[+] All YAML secrets exist in GCP.")

    print()

    if missing_yaml:
        print(f"ORPHANED — in GCP but not in YAML ({len(missing_yaml)}):")
        for name in missing_yaml:
            print(f"  [!] {name}")
    else:
        print("[+] No orphaned secrets in GCP.")

    print()
    if missing_cloud or missing_yaml:
        print("DRIFT DETECTED")
        sys.exit(1)
    else:
        print("NO DRIFT — YAML and GCP are in sync.")


def cmd_load(args: argparse.Namespace) -> None:
    """Load secrets into environment (container startup replacement)."""
    mgr = EnvSecretManager()
    scope = _resolve_scope(args.env)
    count = mgr.load_into_environ(scope)
    print(
        f"[secrets] Loaded {count} secrets for {args.env} into environment",
        file=sys.stderr,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="secretmanager",
        description="Flipper.ai GCP Secret Manager CLI — reads config/secretmanager.yaml",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # validate
    p_validate = sub.add_parser(
        "validate", help="Check all secrets for an env exist in GCP"
    )
    p_validate.add_argument(
        "--env",
        required=True,
        help="Environment: production, staging, dev, all",
    )

    # populate
    p_populate = sub.add_parser(
        "populate", help="Generate .env file from GCP secret values"
    )
    p_populate.add_argument(
        "--env",
        required=True,
        help="Environment: production, staging, dev, all",
    )
    p_populate.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be written without downloading",
    )
    p_populate.add_argument(
        "--output", "-o", help="Output file path (default: .env.<env>)"
    )

    # audit
    sub.add_parser(
        "audit", help="Compare YAML config vs GCP (detect drift)"
    )

    # load (container startup)
    p_load = sub.add_parser(
        "load", help="Load secrets into env vars (container startup)"
    )
    p_load.add_argument(
        "--env",
        required=True,
        help="Environment: production, staging, dev, all",
    )

    args = parser.parse_args()
    dispatch = {
        "validate": cmd_validate,
        "populate": cmd_populate,
        "audit": cmd_audit,
        "load": cmd_load,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
