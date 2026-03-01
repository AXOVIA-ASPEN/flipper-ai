# Config

Configuration files by tool or platform. Reference from repo root.

| Folder | Contents |
|--------|----------|
| [docker/](./docker/) | `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml` |
| [pm2/](./pm2/) | `ecosystem.config.js` — PM2 process manager |
| [railway/](./railway/) | `railway.json` — Railway deployment |

**Vercel** (`vercel.json`) and **Firebase** (`firebase.json`, `.firebaserc`) remain at repo root for CLI compatibility.

**Examples (from repo root):**
```bash
docker compose -f config/docker/docker-compose.yml up -d
docker compose -f config/docker/docker-compose.prod.yml build
pm2 start config/pm2/ecosystem.config.js
```
