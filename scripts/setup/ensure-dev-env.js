#!/usr/bin/env node
/**
 * ensure-dev-env.js
 * Ensures .env exists and DATABASE_URL is set so "make preview" can run.
 * Copies .env.example to .env if missing; sets default PostgreSQL URL if none set.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

const DEFAULT_DATABASE_URL = 'postgresql://localhost:5432/flipper_dev';

function main() {
  let created = false;
  if (!fs.existsSync(envPath)) {
    if (!fs.existsSync(examplePath)) {
      console.error('Missing .env.example; cannot create .env.');
      process.exit(1);
    }
    fs.copyFileSync(examplePath, envPath);
    console.log('Created .env from .env.example');
    created = true;
  }

  let content = fs.readFileSync(envPath, 'utf8');
  const databaseUrlMatch = content.match(/^\s*DATABASE_URL\s*=\s*(.*)/m);
  const currentUrl = databaseUrlMatch ? databaseUrlMatch[1].trim().replace(/^["']|["']$/g, '') : '';

  const needsDefault =
    !currentUrl ||
    currentUrl === 'file:./dev.db' ||
    currentUrl === 'your-database-url';

  if (needsDefault) {
    if (content.match(/^\s*DATABASE_URL\s*=/m)) {
      content = content.replace(/^\s*DATABASE_URL\s*=.*/m, `DATABASE_URL="${DEFAULT_DATABASE_URL}"`);
    } else {
      content = content.replace(
        /(# ---- Database ----)/,
        `$1\nDATABASE_URL="${DEFAULT_DATABASE_URL}"`
      );
    }
    fs.writeFileSync(envPath, content);
    console.log('Set DATABASE_URL to default PostgreSQL URL for local dev.');
    console.log('Ensure PostgreSQL is running and create the DB if needed:');
    console.log('  createdb flipper_dev');
  }

  if (created || needsDefault) {
    console.log('');
  }
}

main();
