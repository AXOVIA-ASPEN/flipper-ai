# Flipper AI - Hybrid Architecture Plan

**Decision Date:** February 19, 2026 01:48 UTC  
**Architecture:** Django + Cloud Run + Cloud SQL + Firebase Auth + Firebase Hosting  
**Timeline:** 2-3 weeks

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     USER BROWSER                        │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              FIREBASE HOSTING (React SPA)               │
│  - Static files (HTML, CSS, JS)                        │
│  - Global CDN                                           │
│  - HTTPS automatic                                      │
└─────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │           │
                    ▼           ▼
        ┌──────────────┐  ┌──────────────┐
        │  FIREBASE    │  │   DJANGO     │
        │    AUTH      │  │  CLOUD RUN   │
        │              │  │              │
        │ - Email/Pass │  │ - REST API   │
        │ - Google     │  │ - Scraping   │
        │ - GitHub     │  │ - AI Analysis│
        │ - JWT Tokens │  │ - Background │
        └──────────────┘  └──────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │  CLOUD SQL   │
                        │ (PostgreSQL) │
                        │              │
                        │ - Users      │
                        │ - Listings   │
                        │ - Jobs       │
                        └──────────────┘
```

---

## Why This Architecture is Better

### Frontend (React + Firebase Hosting)
✅ **Fast:** Global CDN, edge caching  
✅ **Simple:** `firebase deploy` to production  
✅ **Free tier:** Generous limits  
✅ **HTTPS:** Automatic SSL certificates  

### Authentication (Firebase Auth)
✅ **Already configured:** We have the credentials!  
✅ **Managed service:** No auth code to maintain  
✅ **JWT tokens:** Standard, secure  
✅ **Social login:** Google/GitHub built-in  

### Backend (Django on Cloud Run)
✅ **Python ecosystem:** BeautifulSoup, Scrapy for scraping  
✅ **Auto-scaling:** 0 to 1000 instances automatically  
✅ **Pay per use:** Only charged when handling requests  
✅ **Stateless:** Perfect for REST APIs  

### Database (Cloud SQL PostgreSQL)
✅ **Managed PostgreSQL:** No Prisma config issues  
✅ **Django ORM:** Built-in, battle-tested  
✅ **Automatic backups:** Point-in-time recovery  
✅ **Scales vertically:** Upgrade instance size as needed  

---

## Project Structure

```
flipper-ai-hybrid/
├── backend/                    # Django REST API
│   ├── config/                # Django settings
│   │   ├── settings.py        # Base settings
│   │   ├── settings_prod.py   # Production overrides
│   │   └── urls.py
│   ├── apps/
│   │   ├── users/            # User profiles (Firebase UID linked)
│   │   ├── listings/         # Marketplace listings
│   │   ├── scraper/          # Web scraping logic
│   │   ├── analysis/         # AI value analysis
│   │   └── opportunities/    # Deal tracking
│   ├── requirements.txt
│   ├── Dockerfile            # Cloud Run container
│   ├── cloudbuild.yaml       # CI/CD pipeline
│   └── manage.py
│
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── services/
│   │   │   ├── api.ts        # Django API client
│   │   │   └── firebase.ts   # Firebase Auth
│   │   └── App.tsx
│   ├── public/
│   ├── firebase.json         # Firebase Hosting config
│   ├── .firebaserc          # Firebase project config
│   └── package.json
│
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml   # Deploy Django to Cloud Run
│       └── deploy-frontend.yml  # Deploy React to Firebase
│
└── README.md
```

---

## Implementation Plan (2-3 Weeks)

### Week 1: Backend Core (Days 1-7)

**Day 1-2: Django Setup**
- [x] Create Django project
- [ ] Set up Cloud SQL PostgreSQL instance
- [ ] Configure Django settings for production
- [ ] Create user model (Firebase UID integration)
- [ ] Set up Django REST Framework

**Day 3-4: Core Models & APIs**
- [ ] Listings model + API endpoints
- [ ] ScraperJob model + API endpoints
- [ ] Opportunities model + API endpoints
- [ ] Firebase Auth verification middleware

**Day 5-6: Web Scraping**
- [ ] eBay scraper (BeautifulSoup)
- [ ] Craigslist scraper
- [ ] Facebook Marketplace scraper
- [ ] Background task system (Cloud Tasks or Celery)

**Day 7: AI Integration**
- [ ] Claude API integration
- [ ] Value estimation logic
- [ ] Market analysis

### Week 2: Frontend & Integration (Days 8-14)

**Day 8-9: React Setup**
- [ ] Create React app (Vite + TypeScript)
- [ ] Set up Firebase Hosting
- [ ] Configure Firebase Auth client
- [ ] API client service (Axios + interceptors)

**Day 10-11: Core Pages**
- [ ] Landing page (reuse from Next.js)
- [ ] Login/Signup pages (Firebase Auth)
- [ ] Dashboard
- [ ] Listings page

**Day 12-13: Scraping Interface**
- [ ] Scraper job creation
- [ ] Job status tracking
- [ ] Results display
- [ ] Filters and search

**Day 14: Integration Testing**
- [ ] Auth flow (Firebase → Django)
- [ ] End-to-end scraping workflow
- [ ] Error handling

### Week 3: Deployment & Polish (Days 15-21)

**Day 15-16: Cloud Run Deployment**
- [ ] Create Dockerfile
- [ ] Set up Cloud Build
- [ ] Configure Cloud SQL connection
- [ ] Environment variables
- [ ] Deploy to staging

**Day 17-18: Firebase Deployment**
- [ ] Build optimized React bundle
- [ ] Deploy to Firebase Hosting
- [ ] Configure custom domain
- [ ] Set up CORS for API

**Day 19-20: Testing & Optimization**
- [ ] Load testing
- [ ] Security audit
- [ ] Performance optimization
- [ ] Bug fixes

**Day 21: Launch Preparation**
- [ ] Final QA
- [ ] Documentation
- [ ] Product Hunt materials
- [ ] Demo video

---

## Step-by-Step Setup

### 1. Create Django Project

```bash
# Create new directory
mkdir flipper-ai-hybrid
cd flipper-ai-hybrid

# Create backend
mkdir backend
cd backend
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install django djangorestframework django-cors-headers
pip install psycopg2-binary python-decouple
pip install firebase-admin anthropic beautifulsoup4 requests
pip install gunicorn

# Create Django project
django-admin startproject config .

# Create apps
python manage.py startapp users
python manage.py startapp listings
python manage.py startapp scraper
python manage.py startapp analysis
```

### 2. Set Up Cloud SQL

```bash
# Install gcloud CLI (if not already)
gcloud auth login
gcloud config set project axovia-flipper

# Create Cloud SQL instance
gcloud sql instances create flipper-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create flipper_prod --instance=flipper-db

# Create user
gcloud sql users create django_user \
  --instance=flipper-db \
  --password=<SECURE_PASSWORD>
```

### 3. Configure Django Settings

**config/settings.py:**
```python
import os
from decouple import config

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate(config('FIREBASE_SERVICE_ACCOUNT_KEY'))
firebase_admin.initialize_app(cred)

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': '/cloudsql/' + config('CLOUD_SQL_CONNECTION_NAME'),
        'NAME': config('DB_NAME', default='flipper_prod'),
        'USER': config('DB_USER', default='django_user'),
        'PASSWORD': config('DB_PASSWORD'),
    }
}

# CORS (allow Firebase Hosting)
CORS_ALLOWED_ORIGINS = [
    "https://axovia-flipper.web.app",
    "https://axovia-flipper.firebaseapp.com",
    "http://localhost:5173",  # Dev
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'users.authentication.FirebaseAuthentication',
    ],
}
```

### 4. Firebase Auth Middleware

**users/authentication.py:**
```python
from rest_framework import authentication
from rest_framework import exceptions
from firebase_admin import auth

class FirebaseAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None
        
        try:
            # Extract token (Bearer <token>)
            token = auth_header.split(' ')[1]
            decoded_token = auth.verify_id_token(token)
            uid = decoded_token['uid']
            
            # Get or create user linked to Firebase UID
            user, created = User.objects.get_or_create(firebase_uid=uid)
            return (user, None)
        except Exception:
            raise exceptions.AuthenticationFailed('Invalid token')
```

### 5. Create Dockerfile

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Run gunicorn
CMD exec gunicorn config.wsgi:application \
    --bind :$PORT \
    --workers 1 \
    --threads 8 \
    --timeout 0
```

### 6. Deploy to Cloud Run

**cloudbuild.yaml:**
```yaml
steps:
  # Build container
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/flipper-backend', '.']
  
  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/flipper-backend']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'flipper-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/flipper-backend'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--add-cloudsql-instances'
      - '$_CLOUD_SQL_CONNECTION_NAME'

images:
  - 'gcr.io/$PROJECT_ID/flipper-backend'
```

Deploy:
```bash
gcloud builds submit --config cloudbuild.yaml
```

### 7. Set Up React Frontend

```bash
cd ../
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
npm install firebase axios react-router-dom @tanstack/react-query

# Initialize Firebase
firebase init hosting
# Select: axovia-flipper project
# Public directory: dist
# Single-page app: Yes
# GitHub Actions: Yes

# Deploy
npm run build
firebase deploy
```

---

## Environment Variables

### Cloud Run (Backend)
```bash
gcloud run services update flipper-backend \
  --set-env-vars="
    DJANGO_SECRET_KEY=<random-key>,
    DB_NAME=flipper_prod,
    DB_USER=django_user,
    DB_PASSWORD=<password>,
    CLOUD_SQL_CONNECTION_NAME=axovia-flipper:us-central1:flipper-db,
    ANTHROPIC_API_KEY=<key>,
    FIREBASE_SERVICE_ACCOUNT_KEY=<json>
  "
```

### Firebase Hosting (Frontend)
**.env.production:**
```bash
VITE_API_URL=https://flipper-backend-xxxxx-uc.a.run.app
VITE_FIREBASE_API_KEY=AIzaSyDUbLTQogeNg5YZzrIF0ATZJ_YvBbtF3Ls
VITE_FIREBASE_AUTH_DOMAIN=axovia-flipper.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=axovia-flipper
```

---

## Advantages of This Architecture

### Development
- ✅ Python for scraping (way better than Node.js)
- ✅ Django Admin for data management
- ✅ Firebase Auth (no custom auth code)
- ✅ Modern React frontend

### Production
- ✅ Auto-scaling backend (Cloud Run)
- ✅ Global CDN frontend (Firebase)
- ✅ Managed PostgreSQL (Cloud SQL)
- ✅ Zero cold starts (Cloud Run gen2)

### Cost
- ✅ Cloud Run: Pay per request
- ✅ Firebase Hosting: Free tier generous
- ✅ Cloud SQL: $7-15/month (db-f1-micro)
- ✅ Total: ~$20-30/month to start

---

## Next Steps

**RIGHT NOW:**
1. Create Django project structure
2. Set up Cloud SQL instance
3. Configure Firebase Auth integration
4. Build core API endpoints

**TOMORROW:**
1. Implement web scrapers
2. Add AI analysis
3. Create React frontend
4. Deploy to staging

**LAUNCH (Week 3):**
1. Deploy to production
2. Final testing
3. Product Hunt launch

---

**Ready to start? I can initialize the Django project in the next 30 minutes.**
