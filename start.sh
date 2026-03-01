#!/bin/sh
# Entrypoint script for Cloud Run container.
# Loads secrets from GCP Secret Manager, then starts the Next.js app.
# Used as CMD in Dockerfile (created in Story 1.3).

set -e
python3 helpers/secrets.py
exec node_modules/.bin/next start
