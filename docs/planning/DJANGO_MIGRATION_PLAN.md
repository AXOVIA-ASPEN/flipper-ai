# Flipper AI - Django + React Migration Plan

**Decision Date:** February 19, 2026 01:28 UTC  
**Estimated Time:** 2-3 weeks  
**Reason:** Leverage Python ecosystem for web scraping, AI processing, and familiarity

---

## Why Django + React is Better for Flipper AI

### Python Advantages:
✅ **Web Scraping:** BeautifulSoup, Scrapy, Selenium (much better than Node.js)  
✅ **AI/ML:** Better Claude API integration, easier prompt engineering  
✅ **Data Processing:** Pandas for analyzing marketplace data  
✅ **Background Jobs:** Celery for async scraping (scales better than cron)  
✅ **Admin Panel:** Django Admin for managing listings, users, jobs  

### Your Familiarity:
✅ You know Django architecture  
✅ Faster debugging  
✅ Easier to maintain long-term  

---

## Migration Timeline (2-3 Weeks)

### Week 1: Backend + Core Features (Days 1-7)
- **Days 1-2:** Django project setup, models, authentication
- **Days 3-4:** API endpoints (DRF), basic CRUD operations
- **Days 5-6:** Marketplace scraping (eBay, Craigslist, Facebook)
- **Day 7:** AI analysis integration (Claude API)

### Week 2: Frontend + Integration (Days 8-14)
- **Days 8-9:** React app setup, routing, authentication
- **Days 10-11:** Dashboard, listings UI, scraper interface
- **Days 12-13:** Real-time updates, notifications
- **Day 14:** Testing, bug fixes

### Week 3: Polish + Deploy (Days 15-21)
- **Days 15-16:** Admin panel customization, background jobs
- **Days 17-18:** Production deployment (Railway, Render, or AWS)
- **Days 19-20:** Integration testing, performance optimization
- **Day 21:** Launch prep, final QA

---

## Project Structure

```
flipper-ai-django/
├── backend/                    # Django API
│   ├── config/                # Django settings
│   ├── apps/
│   │   ├── users/            # User authentication
│   │   ├── listings/         # Marketplace listings
│   │   ├── scraper/          # Web scraping logic
│   │   ├── analysis/         # AI value analysis
│   │   ├── opportunities/    # Deal tracking
│   │   └── notifications/    # Real-time alerts
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API client
│   │   ├── store/            # State management (Redux/Zustand)
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js        # or webpack
│
├── docker-compose.yml         # Local development
├── .env.example
└── README.md
```

---

## Phase 1: Backend Setup (Days 1-2)

### 1.1 Initialize Django Project

```bash
# Create new directory (keep old Next.js for reference)
mkdir flipper-ai-django
cd flipper-ai-django

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # or: venv\Scripts\activate on Windows

# Install Django + essentials
pip install django djangorestframework django-cors-headers
pip install psycopg2-binary python-decouple celery redis
pip install anthropic beautifulsoup4 requests

# Create Django project
django-admin startproject config .

# Create apps
python manage.py startapp users
python manage.py startapp listings
python manage.py startapp scraper
python manage.py startapp analysis
python manage.py startapp opportunities
```

### 1.2 Database Models

**users/models.py:**
```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    subscription_tier = models.CharField(
        max_length=20,
        choices=[('FREE', 'Free'), ('PRO', 'Pro'), ('BUSINESS', 'Business')],
        default='FREE'
    )
    onboarding_complete = models.BooleanField(default=False)
    onboarding_step = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    llm_model = models.CharField(max_length=50, default='claude-sonnet-4')
    discount_threshold = models.IntegerField(default=50)
    auto_analyze = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    # ... other notification settings
```

**listings/models.py:**
```python
from django.db import models
from users.models import User

class Listing(models.Model):
    PLATFORM_CHOICES = [
        ('EBAY', 'eBay'),
        ('CRAIGSLIST', 'Craigslist'),
        ('FACEBOOK', 'Facebook Marketplace'),
        ('OFFERUP', 'OfferUp'),
        ('MERCARI', 'Mercari'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    external_id = models.CharField(max_length=255)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    url = models.URLField()
    title = models.CharField(max_length=500)
    description = models.TextField(null=True, blank=True)
    asking_price = models.DecimalField(max_digits=10, decimal_places=2)
    condition = models.CharField(max_length=100, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    
    # AI Analysis fields
    estimated_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    value_score = models.IntegerField(null=True, blank=True)  # 0-100
    profit_potential = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    analysis_notes = models.TextField(null=True, blank=True)
    
    scraped_at = models.DateTimeField(auto_now_add=True)
    analyzed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['platform', 'external_id']
        indexes = [
            models.Index(fields=['platform', 'scraped_at']),
            models.Index(fields=['value_score']),
            models.Index(fields=['user', 'platform']),
        ]
```

**scraper/models.py:**
```python
class ScraperJob(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RUNNING', 'Running'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scraper_jobs')
    platform = models.CharField(max_length=20)
    search_query = models.CharField(max_length=500)
    location = models.CharField(max_length=255, null=True, blank=True)
    max_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    results_count = models.IntegerField(default=0)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
```

### 1.3 Django REST Framework Setup

**config/settings.py:**
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    
    # Local apps
    'users',
    'listings',
    'scraper',
    'analysis',
    'opportunities',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # ... other middleware
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
}

# CORS (for React frontend)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default
    "http://localhost:3000",
    "https://flipper-ai.vercel.app",  # Production
]

# PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'flipper_ai'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Celery (background tasks)
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
```

---

## Phase 2: Web Scraping (Days 3-6)

### 2.1 eBay Scraper (Python is WAY better for this)

**scraper/scrapers/ebay.py:**
```python
import requests
from bs4 import BeautifulSoup
from typing import List, Dict
from anthropic import Anthropic

class EbayScraper:
    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    def search(self, query: str, max_price: float = None) -> List[Dict]:
        """
        Scrape eBay search results
        Python + BeautifulSoup is much cleaner than Node.js
        """
        url = f"https://www.ebay.com/sch/i.html?_nkw={query}"
        if max_price:
            url += f"&_udhi={max_price}"
        
        response = requests.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        soup = BeautifulSoup(response.text, 'html.parser')
        
        listings = []
        for item in soup.select('.s-item'):
            try:
                listings.append({
                    'title': item.select_one('.s-item__title').text,
                    'price': self._parse_price(item.select_one('.s-item__price').text),
                    'url': item.select_one('.s-item__link')['href'],
                    'image': item.select_one('.s-item__image img')['src'],
                    'condition': item.select_one('.SECONDARY_INFO')?.text,
                    'location': item.select_one('.s-item__location')?.text,
                })
            except Exception as e:
                continue
        
        return listings
    
    def analyze_value(self, listing: Dict) -> Dict:
        """
        Use Claude to estimate market value
        """
        prompt = f"""Analyze this eBay listing:
        
Title: {listing['title']}
Price: ${listing['price']}
Condition: {listing.get('condition', 'Unknown')}

Research the typical market value for this item. Return JSON:
{{
    "estimated_value": <float>,
    "value_score": <0-100 int>,
    "profit_potential": <float>,
    "analysis": "<reasoning>"
}}"""
        
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return json.loads(response.content[0].text)
```

### 2.2 Celery Background Tasks

**scraper/tasks.py:**
```python
from celery import shared_task
from .scrapers.ebay import EbayScraper
from .models import ScraperJob
from listings.models import Listing

@shared_task
def run_scraper_job(job_id: int):
    """
    Run scraping job in background (much better than cron!)
    """
    job = ScraperJob.objects.get(id=job_id)
    job.status = 'RUNNING'
    job.save()
    
    try:
        if job.platform == 'EBAY':
            scraper = EbayScraper()
            results = scraper.search(job.search_query, job.max_price)
            
            # Save listings and analyze
            for result in results:
                listing, created = Listing.objects.get_or_create(
                    platform='EBAY',
                    external_id=result['url'].split('/')[-1],
                    defaults={
                        'user': job.user,
                        'title': result['title'],
                        'asking_price': result['price'],
                        'url': result['url'],
                        # ... other fields
                    }
                )
                
                if created:
                    # Analyze value in background
                    analyze_listing.delay(listing.id)
            
            job.status = 'COMPLETED'
            job.results_count = len(results)
            job.save()
            
    except Exception as e:
        job.status = 'FAILED'
        job.error_message = str(e)
        job.save()

@shared_task
def analyze_listing(listing_id: int):
    """
    AI analysis in background
    """
    listing = Listing.objects.get(id=listing_id)
    scraper = EbayScraper()  # or appropriate scraper
    analysis = scraper.analyze_value({
        'title': listing.title,
        'price': float(listing.asking_price),
        'condition': listing.condition,
    })
    
    listing.estimated_value = analysis['estimated_value']
    listing.value_score = analysis['value_score']
    listing.profit_potential = analysis['profit_potential']
    listing.analysis_notes = analysis['analysis']
    listing.analyzed_at = timezone.now()
    listing.save()
```

---

## Phase 3: React Frontend (Days 8-11)

### 3.1 Setup React with Vite

```bash
cd flipper-ai-django
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install axios react-router-dom @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3.2 API Client

**frontend/src/services/api.ts:**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const auth = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register/', data),
  
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),
  
  logout: () => api.post('/auth/logout/'),
};

export const listings = {
  getAll: (params?: { platform?: string; min_score?: number }) =>
    api.get('/listings/', { params }),
  
  getById: (id: number) => api.get(`/listings/${id}/`),
  
  analyze: (id: number) => api.post(`/listings/${id}/analyze/`),
};

export const scraper = {
  createJob: (data: { platform: string; search_query: string; max_price?: number }) =>
    api.post('/scraper/jobs/', data),
  
  getJobs: () => api.get('/scraper/jobs/'),
  
  getJobStatus: (id: number) => api.get(`/scraper/jobs/${id}/`),
};

export default api;
```

### 3.3 Key React Components

**Can reuse from Next.js:**
- ✅ Landing page (copy HTML/CSS)
- ✅ Auth forms (login, register)
- ✅ Dashboard layout
- ✅ Listing cards
- ✅ Tables, modals, forms

**Just need to:**
- Remove Next.js-specific code (`next/link` → `react-router-dom`)
- Replace API calls with new Django endpoints
- Update authentication flow

---

## Phase 4: Deployment (Days 17-19)

### Option A: Railway (Easiest)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy (auto-detects Django + PostgreSQL + Redis)
railway up
```

### Option B: Render.com (Free tier)
- Add `render.yaml`
- Connect GitHub repo
- Auto-deploys on push

### Option C: AWS/GCP (Production-grade)
- ECS/Cloud Run for Django
- RDS/Cloud SQL for PostgreSQL
- ElastiCache/Memorystore for Redis
- Vercel for React frontend

---

## What to Migrate from Next.js

### ✅ Keep & Reuse:
- Landing page HTML/CSS
- UI components (copy JSX → convert to plain React)
- Business logic (rewrite in Python)
- API endpoint structure (same routes, different implementation)
- Test cases (rewrite for Django/Pytest)

### ❌ Discard:
- Next.js framework code
- Prisma schema/migrations
- NextAuth config
- Vercel-specific optimizations

---

## Advantages You'll Gain

### Development:
- ✅ Better web scraping (Python > Node.js for this)
- ✅ Django Admin panel (manage data without custom UI)
- ✅ Celery for real background jobs (not cron)
- ✅ Better AI integration (Python ecosystem)
- ✅ Easier debugging (you know Django)

### Production:
- ✅ PostgreSQL without Prisma headaches
- ✅ Scalable background processing
- ✅ Better data analytics capabilities
- ✅ More deployment options

---

## Timeline Checklist

**Week 1:**
- [ ] Django project setup
- [ ] User authentication (register, login, JWT)
- [ ] Core models (User, Listing, ScraperJob)
- [ ] eBay scraper implementation
- [ ] AI analysis integration
- [ ] Basic API endpoints (DRF)

**Week 2:**
- [ ] React app setup (Vite + TypeScript)
- [ ] Authentication flow (login, register, protected routes)
- [ ] Dashboard UI
- [ ] Listings page + filters
- [ ] Scraper interface
- [ ] Real-time updates (WebSocket or polling)

**Week 3:**
- [ ] Celery background tasks
- [ ] Admin panel customization
- [ ] Production deployment (Railway/Render)
- [ ] Environment variables setup
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Launch prep

---

## Next Steps

1. **Create new repo:** `flipper-ai-django`
2. **Set up Django project** (I can do this)
3. **Start with authentication** (critical path)
4. **Add scraping** (Python will be much easier)
5. **Build React frontend** (reuse Next.js UI)
6. **Deploy to Railway** (simplest option)
7. **Launch on Product Hunt** (3 weeks from now)

---

**Ready to start? I can initialize the Django project structure in the next 30 minutes.**
