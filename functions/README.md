# Flipper AI Cloud Functions

Cloud Functions for CPU-intensive scraping operations.

## Architecture

### Playwright Functions (Docker)
- **scrapeCraigslist** - Scrapes Craigslist using Playwright
- **scrapeOfferup** - Scrapes OfferUp using Playwright

These use custom Docker containers with Chromium pre-installed.

### API Functions (Standard)
- **scrapeEbay** - Scrapes eBay using official API
- **scrapeFacebook** - Scrapes Facebook Marketplace (placeholder)
- **scrapeMercari** - Scrapes Mercari (placeholder)

These use standard Cloud Functions runtime.

### Utility Functions
- **health** - Health check endpoint

## Development

### Install Dependencies

```bash
npm install
```

### Generate Prisma Client

```bash
npm run prisma:generate
```

### Build

```bash
npm run build
```

### Test Locally

```bash
# Start Firebase emulators
npm run serve

# Call function locally
curl -X POST http://localhost:5001/axovia-flipper/us-east1/scrapeCraigslist \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "location": "sarasota",
    "category": "electronics"
  }'
```

## Deployment

### Quick Deploy (All Functions)

```bash
./deploy.sh
```

### Deploy Individual Functions

```bash
# Standard functions
firebase deploy --only functions:scrapeEbay

# Docker functions
gcloud functions deploy scrapeCraigslist \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-east1 \
  --source=. \
  --entry-point=scrapeCraigslist \
  --trigger-http \
  --allow-unauthenticated \
  --memory=2GB \
  --timeout=300s
```

## Environment Variables

### Required Secrets

Store sensitive data in Google Secret Manager:

```bash
# OpenAI API Key
echo -n "sk-..." | gcloud secrets create OPENAI_API_KEY --data-file=-

# eBay OAuth Token
echo -n "v^1.1#..." | gcloud secrets create EBAY_OAUTH_TOKEN --data-file=-

# Database URL
echo -n "postgresql://..." | gcloud secrets create DATABASE_URL --data-file=-
```

### Access Secrets in Functions

```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/axovia-flipper/secrets/OPENAI_API_KEY/versions/latest',
});

const apiKey = version.payload?.data?.toString();
```

Or use Firebase Functions config:

```bash
firebase functions:config:set openai.key="sk-..."
```

## Monitoring

### View Logs

```bash
# All functions
firebase functions:log

# Specific function
gcloud functions logs read scrapeCraigslist --region=us-east1 --limit=50
```

### Performance Metrics

View in Firebase Console:
https://console.firebase.google.com/project/axovia-flipper/functions

## Troubleshooting

### Function Timeout

Increase timeout (max 540s):

```bash
gcloud functions deploy scrapeCraigslist --timeout=540s
```

### Memory Issues

Increase memory:

```bash
gcloud functions deploy scrapeCraigslist --memory=4GB
```

### Playwright Errors

Check Docker container includes all dependencies:

```bash
docker build -f Dockerfile.playwright -t test .
docker run -it test npx playwright install --dry-run
```

### Database Connection

Verify DATABASE_URL is set:

```bash
gcloud functions describe scrapeCraigslist --region=us-east1 --gen2 --format="value(serviceConfig.environmentVariables)"
```

## Cost Optimization

### Cold Start Reduction

- Use Cloud Run instead (min instances)
- Keep functions warm with scheduled pings
- Reduce bundle size

### Resource Optimization

- Use appropriate memory allocation
- Set reasonable timeouts
- Cache Prisma client

## Security

### CORS Configuration

See `src/lib/cors.ts` for CORS handling.

### Authentication

Currently allows unauthenticated access. Add authentication:

```typescript
import { getAuth } from 'firebase-admin/auth';

const token = req.headers.authorization?.split('Bearer ')[1];
const decodedToken = await getAuth().verifyIdToken(token);
const userId = decodedToken.uid;
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Load Testing

```bash
autocannon -c 10 -d 30 https://us-east1-axovia-flipper.cloudfunctions.net/health
```

## Contributing

1. Create feature branch
2. Make changes
3. Test locally with emulators
4. Deploy to dev environment
5. Test in production
6. Submit PR

## Resources

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Functions 2nd Gen](https://cloud.google.com/functions/docs/2nd-gen/overview)
- [Playwright Docs](https://playwright.dev/)
- [Prisma Docs](https://www.prisma.io/docs)
