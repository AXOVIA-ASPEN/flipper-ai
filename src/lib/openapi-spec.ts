/**
 * OpenAPI 3.0 Specification for Flipper AI API
 * Auto-generated from route handlers and Zod schemas
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 * Generated: February 17, 2026
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Flipper AI API',
    description:
      'Multi-marketplace flipping tool API. Find underpriced items, analyze profit margins, and automate listing across eBay, Craigslist, Facebook Marketplace, OfferUp, and Mercari.',
    version: '1.0.0',
    contact: {
      name: 'Axovia AI',
      email: 'support@axoviaai.com',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Current environment',
    },
    {
      url: 'https://flipper-ai.vercel.app/api',
      description: 'Production',
    },
  ],
  tags: [
    { name: 'Health', description: 'Liveness, readiness, and metrics probes' },
    { name: 'Auth', description: 'Authentication and provider connections' },
    { name: 'Listings', description: 'Marketplace listing management' },
    { name: 'Opportunities', description: 'Flip opportunity tracking' },
    { name: 'Analyze', description: 'AI-powered listing analysis' },
    { name: 'Scrapers', description: 'Marketplace data ingestion' },
    { name: 'Scraper Jobs', description: 'Background scraper job management' },
    { name: 'Messages', description: 'Seller communication' },
    { name: 'Inventory', description: 'Purchased inventory and ROI' },
    { name: 'Posting Queue', description: 'Multi-platform listing queue' },
    { name: 'Descriptions', description: 'AI listing description generation' },
    { name: 'Images', description: 'Image proxy and optimization' },
    { name: 'Reports', description: 'Profit/loss and analytics reports' },
    { name: 'Analytics', description: 'Business analytics' },
    { name: 'Price History', description: 'Historical price tracking' },
    { name: 'Search Configs', description: 'Saved search configurations' },
    { name: 'User', description: 'User settings and onboarding' },
    { name: 'Webhooks', description: 'External event webhooks (Stripe)' },
    { name: 'Checkout', description: 'Subscription billing' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'NextAuth session JWT',
      },
      ApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for programmatic access',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Not found' },
          details: { type: 'object', additionalProperties: true },
        },
      },
      Platform: {
        type: 'string',
        enum: ['CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'EBAY', 'OFFERUP', 'MERCARI'],
        example: 'EBAY',
      },
      OpportunityStatus: {
        type: 'string',
        enum: ['IDENTIFIED', 'CONTACTED', 'PURCHASED', 'LISTED', 'SOLD'],
        example: 'IDENTIFIED',
      },
      Pagination: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
      Listing: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          externalId: { type: 'string' },
          platform: { $ref: '#/components/schemas/Platform' },
          url: { type: 'string', format: 'uri' },
          title: { type: 'string', maxLength: 500 },
          description: { type: 'string', maxLength: 10000 },
          askingPrice: { type: 'number', minimum: 0 },
          estimatedValue: { type: 'number', minimum: 0 },
          valueScore: { type: 'number', minimum: 0, maximum: 100 },
          condition: { type: 'string' },
          location: { type: 'string' },
          sellerName: { type: 'string' },
          sellerContact: { type: 'string' },
          imageUrls: { type: 'array', items: { type: 'string', format: 'uri' } },
          category: { type: 'string' },
          status: { type: 'string' },
          scrapedAt: { type: 'string', format: 'date-time' },
          postedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateListing: {
        type: 'object',
        required: ['externalId', 'platform', 'url', 'title', 'askingPrice'],
        properties: {
          externalId: { type: 'string', minLength: 1 },
          platform: { $ref: '#/components/schemas/Platform' },
          url: { type: 'string', format: 'uri' },
          title: { type: 'string', minLength: 1, maxLength: 500 },
          description: { type: 'string', maxLength: 10000 },
          askingPrice: { type: 'number', minimum: 0 },
          condition: { type: 'string', maxLength: 100 },
          location: { type: 'string', maxLength: 500 },
          sellerName: { type: 'string', maxLength: 200 },
          sellerContact: { type: 'string', maxLength: 500 },
          imageUrls: { type: 'array', items: { type: 'string', format: 'uri' }, maxItems: 20 },
          category: { type: 'string', maxLength: 200 },
          postedAt: { type: 'string', format: 'date-time' },
        },
      },
      Opportunity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          listingId: { type: 'string', format: 'uuid' },
          status: { $ref: '#/components/schemas/OpportunityStatus' },
          notes: { type: 'string', maxLength: 5000 },
          profitEstimate: { type: 'number' },
          actualProfit: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          listing: { $ref: '#/components/schemas/Listing' },
        },
      },
      CreateOpportunity: {
        type: 'object',
        required: ['listingId'],
        properties: {
          listingId: { type: 'string', minLength: 1 },
          notes: { type: 'string', maxLength: 5000 },
        },
      },
      ScraperJob: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          platform: { $ref: '#/components/schemas/Platform' },
          status: { type: 'string', enum: ['PENDING', 'RUNNING', 'DONE', 'FAILED'] },
          location: { type: 'string' },
          category: { type: 'string' },
          itemsFound: { type: 'integer' },
          error: { type: 'string' },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          listingId: { type: 'string', format: 'uuid' },
          direction: { type: 'string', enum: ['SENT', 'RECEIVED'] },
          content: { type: 'string' },
          platform: { $ref: '#/components/schemas/Platform' },
          sentAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      InventoryItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          listingId: { type: 'string', format: 'uuid' },
          purchasePrice: { type: 'number' },
          salePrice: { type: 'number' },
          shippingCost: { type: 'number' },
          platformFees: { type: 'number' },
          profit: { type: 'number' },
          roi: { type: 'number', description: 'Return on investment percentage' },
          status: { type: 'string', enum: ['IN_STOCK', 'LISTED', 'SOLD'] },
          purchasedAt: { type: 'string', format: 'date-time' },
          soldAt: { type: 'string', format: 'date-time' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'down'] },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number', description: 'Uptime in seconds' },
          version: { type: 'string' },
          environment: { type: 'string' },
        },
      },
      AnalysisResult: {
        type: 'object',
        properties: {
          listingId: { type: 'string' },
          estimatedValue: { type: 'number' },
          valueScore: { type: 'number', minimum: 0, maximum: 100 },
          profitEstimate: { type: 'number' },
          roi: { type: 'number' },
          recommendation: {
            type: 'string',
            enum: ['BUY', 'SKIP', 'WATCH'],
          },
          reasoning: { type: 'string' },
          marketComparisons: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                platform: { $ref: '#/components/schemas/Platform' },
                avgPrice: { type: 'number' },
                sampleSize: { type: 'integer' },
              },
            },
          },
          analyzedAt: { type: 'string', format: 'date-time' },
        },
      },
      PostingQueueItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          listingId: { type: 'string', format: 'uuid' },
          platform: { $ref: '#/components/schemas/Platform' },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'POSTED', 'FAILED'] },
          scheduledAt: { type: 'string', format: 'date-time' },
          postedAt: { type: 'string', format: 'date-time' },
          error: { type: 'string' },
          retryCount: { type: 'integer' },
          externalPostId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SearchConfig: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          platform: { $ref: '#/components/schemas/Platform' },
          keywords: { type: 'array', items: { type: 'string' } },
          location: { type: 'string' },
          category: { type: 'string' },
          minPrice: { type: 'number' },
          maxPrice: { type: 'number' },
          minValueScore: { type: 'number' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      UserSettings: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          plan: { type: 'string', enum: ['FREE', 'PRO', 'TEAM'] },
          aiProvider: { type: 'string', enum: ['anthropic', 'openai'] },
          defaultPlatforms: { type: 'array', items: { $ref: '#/components/schemas/Platform' } },
          notifications: {
            type: 'object',
            properties: {
              email: { type: 'boolean' },
              highValueAlerts: { type: 'boolean' },
              weeklyDigest: { type: 'boolean' },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Unauthorized' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Not found' },
          },
        },
      },
      BadRequest: {
        description: 'Invalid request parameters',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      InternalError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Internal server error' },
          },
        },
      },
    },
    parameters: {
      ListingId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Listing ID',
      },
      OpportunityId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: 'Opportunity ID',
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
        description: 'Max records to return',
      },
      OffsetParam: {
        name: 'offset',
        in: 'query',
        schema: { type: 'integer', minimum: 0, default: 0 },
        description: 'Records to skip for pagination',
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    // -----------------------------------------------------------------------
    // Health
    // -----------------------------------------------------------------------
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Lightweight health check. Returns 200 if the server is running.',
        security: [],
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Checks database connectivity and external service availability.',
        security: [],
        operationId: 'getHealthReady',
        responses: {
          '200': {
            description: 'All dependencies healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    checks: {
                      type: 'object',
                      properties: {
                        database: { type: 'string' },
                        ai: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '503': {
            description: 'One or more dependencies unavailable',
          },
        },
      },
    },
    '/health/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Application metrics',
        description: 'Returns internal application metrics (counters, timings).',
        operationId: 'getHealthMetrics',
        responses: {
          '200': {
            description: 'Metrics snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: { type: 'number' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Auth
    // -----------------------------------------------------------------------
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register new user',
        description: 'Create a new user account with email and password.',
        security: [],
        operationId: 'registerUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string', minLength: 1, maxLength: 100 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    userId: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '409': {
            description: 'Email already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/auth/facebook/authorize': {
      get: {
        tags: ['Auth'],
        summary: 'Initiate Facebook OAuth',
        description: 'Redirects to Facebook OAuth consent screen.',
        operationId: 'facebookAuthorize',
        responses: {
          '302': { description: 'Redirect to Facebook' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/facebook/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Facebook OAuth callback',
        description: 'Handles the OAuth redirect from Facebook and stores tokens.',
        operationId: 'facebookCallback',
        parameters: [
          { name: 'code', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '302': { description: 'Redirect to dashboard' },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/facebook/status': {
      get: {
        tags: ['Auth'],
        summary: 'Facebook connection status',
        operationId: 'facebookStatus',
        responses: {
          '200': {
            description: 'Connection status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    connected: { type: 'boolean' },
                    expiresAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/facebook/disconnect': {
      post: {
        tags: ['Auth'],
        summary: 'Disconnect Facebook account',
        operationId: 'facebookDisconnect',
        responses: {
          '200': { description: 'Disconnected successfully' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Listings
    // -----------------------------------------------------------------------
    '/listings': {
      get: {
        tags: ['Listings'],
        summary: 'List marketplace listings',
        description: 'Returns paginated listings with optional filters.',
        operationId: 'getListings',
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          {
            name: 'platform',
            in: 'query',
            schema: { $ref: '#/components/schemas/Platform' },
          },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          {
            name: 'minScore',
            in: 'query',
            schema: { type: 'number', minimum: 0, maximum: 100 },
          },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'minPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          '200': {
            description: 'Paginated listing results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    listings: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Listings'],
        summary: 'Create listing',
        description: 'Manually add a marketplace listing.',
        operationId: 'createListing',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateListing' } },
          },
        },
        responses: {
          '201': {
            description: 'Listing created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Listing' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/listings/{id}': {
      get: {
        tags: ['Listings'],
        summary: 'Get listing by ID',
        operationId: 'getListingById',
        parameters: [{ $ref: '#/components/parameters/ListingId' }],
        responses: {
          '200': {
            description: 'Listing details',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Listing' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Listings'],
        summary: 'Update listing',
        operationId: 'updateListing',
        parameters: [{ $ref: '#/components/parameters/ListingId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateListing' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated listing',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Listing' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Listings'],
        summary: 'Delete listing',
        operationId: 'deleteListing',
        parameters: [{ $ref: '#/components/parameters/ListingId' }],
        responses: {
          '204': { description: 'Listing deleted' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/listings/{id}/description': {
      post: {
        tags: ['Listings'],
        summary: 'Generate AI description for listing',
        operationId: 'generateListingDescription',
        parameters: [{ $ref: '#/components/parameters/ListingId' }],
        responses: {
          '200': {
            description: 'Generated description',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    description: { type: 'string' },
                    keywords: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/listings/{id}/market-value': {
      get: {
        tags: ['Listings'],
        summary: 'Get market value estimate',
        operationId: 'getListingMarketValue',
        parameters: [{ $ref: '#/components/parameters/ListingId' }],
        responses: {
          '200': {
            description: 'Market value estimate',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    estimatedValue: { type: 'number' },
                    valueScore: { type: 'number' },
                    comparables: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/listings/ebay': {
      get: {
        tags: ['Listings'],
        summary: 'eBay-specific listings',
        operationId: 'getEbayListings',
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
        ],
        responses: {
          '200': {
            description: 'eBay listings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    listings: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/listings/track': {
      post: {
        tags: ['Listings'],
        summary: 'Track a listing URL',
        description: 'Submit a marketplace URL to be scraped and tracked.',
        operationId: 'trackListing',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Tracking initiated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobId: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Opportunities
    // -----------------------------------------------------------------------
    '/opportunities': {
      get: {
        tags: ['Opportunities'],
        summary: 'List flip opportunities',
        operationId: 'getOpportunities',
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/OpportunityStatus' },
          },
          { name: 'platform', in: 'query', schema: { $ref: '#/components/schemas/Platform' } },
          { name: 'minScore', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 } },
          { name: 'maxScore', in: 'query', schema: { type: 'number', minimum: 0, maximum: 100 } },
          { name: 'minProfit', in: 'query', schema: { type: 'number' } },
          { name: 'maxProfit', in: 'query', schema: { type: 'number' } },
        ],
        responses: {
          '200': {
            description: 'Opportunity list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    opportunities: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Opportunity' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Opportunities'],
        summary: 'Create opportunity',
        description: 'Mark a listing as a flip opportunity.',
        operationId: 'createOpportunity',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateOpportunity' } },
          },
        },
        responses: {
          '201': {
            description: 'Opportunity created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Opportunity' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/opportunities/{id}': {
      get: {
        tags: ['Opportunities'],
        summary: 'Get opportunity by ID',
        operationId: 'getOpportunityById',
        parameters: [{ $ref: '#/components/parameters/OpportunityId' }],
        responses: {
          '200': {
            description: 'Opportunity details',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Opportunity' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Opportunities'],
        summary: 'Update opportunity status',
        operationId: 'updateOpportunity',
        parameters: [{ $ref: '#/components/parameters/OpportunityId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { $ref: '#/components/schemas/OpportunityStatus' },
                  notes: { type: 'string', maxLength: 5000 },
                  actualProfit: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated opportunity',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Opportunity' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Opportunities'],
        summary: 'Delete opportunity',
        operationId: 'deleteOpportunity',
        parameters: [{ $ref: '#/components/parameters/OpportunityId' }],
        responses: {
          '204': { description: 'Deleted' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Analyze
    // -----------------------------------------------------------------------
    '/analyze/{listingId}': {
      post: {
        tags: ['Analyze'],
        summary: 'AI-analyze a listing',
        description:
          'Run AI analysis on a listing to get value score, profit estimate, and buy/skip recommendation.',
        operationId: 'analyzeListing',
        parameters: [
          {
            name: 'listingId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Analysis result',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AnalysisResult' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': {
            description: 'Rate limited',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Scrapers
    // -----------------------------------------------------------------------
    '/scraper/ebay': {
      post: {
        tags: ['Scrapers'],
        summary: 'Scrape eBay',
        description: 'Trigger an eBay search scrape for underpriced items.',
        operationId: 'scrapeEbay',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  category: { type: 'string' },
                  maxPrice: { type: 'number' },
                  location: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Scraped listings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    listings: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/scraper/craigslist': {
      post: {
        tags: ['Scrapers'],
        summary: 'Scrape Craigslist',
        operationId: 'scrapeCraigslist',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  location: { type: 'string' },
                  category: { type: 'string' },
                  maxPrice: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Scraped listings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    listings: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/scraper/facebook': {
      post: {
        tags: ['Scrapers'],
        summary: 'Scrape Facebook Marketplace',
        operationId: 'scrapeFacebook',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  location: { type: 'string' },
                  radius: { type: 'integer', description: 'Search radius in miles' },
                  maxPrice: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Scraped listings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    listings: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/scraper/mercari': {
      post: {
        tags: ['Scrapers'],
        summary: 'Scrape Mercari',
        operationId: 'scrapeMercari',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  category: { type: 'string' },
                  maxPrice: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Scraped listings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    listings: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/scraper/offerup': {
      post: {
        tags: ['Scrapers'],
        summary: 'Scrape OfferUp',
        operationId: 'scrapeOfferUp',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  location: { type: 'string' },
                  maxPrice: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Scraped listings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    listings: { type: 'array', items: { $ref: '#/components/schemas/Listing' } },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/scrape/facebook': {
      post: {
        tags: ['Scrapers'],
        summary: 'Facebook scrape (alternate endpoint)',
        operationId: 'scrapeFacebookAlt',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  location: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Scrape results' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Scraper Jobs
    // -----------------------------------------------------------------------
    '/scraper-jobs': {
      get: {
        tags: ['Scraper Jobs'],
        summary: 'List scraper jobs',
        operationId: 'getScraperJobs',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'platform', in: 'query', schema: { $ref: '#/components/schemas/Platform' } },
          { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: {
          '200': {
            description: 'Scraper job list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobs: { type: 'array', items: { $ref: '#/components/schemas/ScraperJob' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Scraper Jobs'],
        summary: 'Create scraper job',
        operationId: 'createScraperJob',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['platform'],
                properties: {
                  platform: { $ref: '#/components/schemas/Platform' },
                  location: { type: 'string', maxLength: 500 },
                  category: { type: 'string', maxLength: 200 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Job created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ScraperJob' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/scraper-jobs/{id}': {
      get: {
        tags: ['Scraper Jobs'],
        summary: 'Get scraper job',
        operationId: 'getScraperJobById',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Job details',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ScraperJob' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Scraper Jobs'],
        summary: 'Cancel scraper job',
        operationId: 'deleteScraperJob',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Job cancelled' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Messages
    // -----------------------------------------------------------------------
    '/messages': {
      get: {
        tags: ['Messages'],
        summary: 'List seller messages',
        operationId: 'getMessages',
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          { name: 'listingId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Message list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Messages'],
        summary: 'Send/generate seller message',
        operationId: 'createMessage',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['listingId'],
                properties: {
                  listingId: { type: 'string', format: 'uuid' },
                  content: { type: 'string', maxLength: 2000 },
                  generateAI: { type: 'boolean', description: 'Let AI generate the message' },
                  tone: {
                    type: 'string',
                    enum: ['professional', 'casual', 'negotiating'],
                    default: 'casual',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Message sent',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Message' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/messages/{id}': {
      get: {
        tags: ['Messages'],
        summary: 'Get message thread',
        operationId: 'getMessageById',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Message thread',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Message' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Messages'],
        summary: 'Delete message',
        operationId: 'deleteMessage',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Inventory
    // -----------------------------------------------------------------------
    '/inventory/roi': {
      get: {
        tags: ['Inventory'],
        summary: 'Inventory ROI report',
        description: 'Returns ROI stats for purchased inventory.',
        operationId: 'getInventoryRoi',
        parameters: [
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'platform', in: 'query', schema: { $ref: '#/components/schemas/Platform' } },
        ],
        responses: {
          '200': {
            description: 'ROI summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalInvested: { type: 'number' },
                    totalRevenue: { type: 'number' },
                    totalProfit: { type: 'number' },
                    avgRoi: { type: 'number' },
                    itemCount: { type: 'integer' },
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/InventoryItem' },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Posting Queue
    // -----------------------------------------------------------------------
    '/posting-queue': {
      get: {
        tags: ['Posting Queue'],
        summary: 'List posting queue items',
        operationId: 'getPostingQueue',
        parameters: [
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/OffsetParam' },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'PROCESSING', 'POSTED', 'FAILED'] },
          },
          { name: 'platform', in: 'query', schema: { $ref: '#/components/schemas/Platform' } },
        ],
        responses: {
          '200': {
            description: 'Queue items',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PostingQueueItem' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Posting Queue'],
        summary: 'Add to posting queue',
        operationId: 'addToPostingQueue',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['listingId', 'platform'],
                properties: {
                  listingId: { type: 'string', format: 'uuid' },
                  platform: { $ref: '#/components/schemas/Platform' },
                  scheduledAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Added to queue',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PostingQueueItem' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/posting-queue/stats': {
      get: {
        tags: ['Posting Queue'],
        summary: 'Posting queue statistics',
        operationId: 'getPostingQueueStats',
        responses: {
          '200': {
            description: 'Queue stats',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pending: { type: 'integer' },
                    processing: { type: 'integer' },
                    posted: { type: 'integer' },
                    failed: { type: 'integer' },
                    totalToday: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/posting-queue/{id}': {
      get: {
        tags: ['Posting Queue'],
        summary: 'Get queue item',
        operationId: 'getPostingQueueItem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Queue item',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PostingQueueItem' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Posting Queue'],
        summary: 'Remove queue item',
        operationId: 'removePostingQueueItem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Removed' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/posting-queue/{id}/retry': {
      post: {
        tags: ['Posting Queue'],
        summary: 'Retry failed queue item',
        operationId: 'retryPostingQueueItem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Retry queued',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PostingQueueItem' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Descriptions
    // -----------------------------------------------------------------------
    '/descriptions': {
      post: {
        tags: ['Descriptions'],
        summary: 'Generate listing description',
        description: 'AI-generates an optimized description for a product.',
        operationId: 'generateDescription',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title'],
                properties: {
                  title: { type: 'string' },
                  category: { type: 'string' },
                  condition: { type: 'string' },
                  targetPlatform: { $ref: '#/components/schemas/Platform' },
                  existingDescription: { type: 'string' },
                  keywords: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Generated description',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    description: { type: 'string' },
                    title: { type: 'string' },
                    keywords: { type: 'array', items: { type: 'string' } },
                    seoScore: { type: 'number' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { description: 'Rate limited' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Images
    // -----------------------------------------------------------------------
    '/images/proxy': {
      get: {
        tags: ['Images'],
        summary: 'Proxy marketplace image',
        description: 'Fetches and proxies an external marketplace image to bypass CORS.',
        security: [],
        operationId: 'proxyImage',
        parameters: [
          {
            name: 'url',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uri' },
            description: 'Image URL to proxy',
          },
        ],
        responses: {
          '200': {
            description: 'Image data',
            content: {
              'image/jpeg': {},
              'image/png': {},
              'image/webp': {},
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Reports
    // -----------------------------------------------------------------------
    '/reports/generate': {
      post: {
        tags: ['Reports'],
        summary: 'Generate profit/loss report',
        operationId: 'generateReport',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['startDate', 'endDate'],
                properties: {
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  platform: { $ref: '#/components/schemas/Platform' },
                  format: { type: 'string', enum: ['json', 'csv', 'pdf'], default: 'json' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Generated report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    period: { type: 'object' },
                    summary: { type: 'object' },
                    byPlatform: { type: 'object' },
                    byCategory: { type: 'object' },
                    transactions: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
              'text/csv': {},
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Analytics
    // -----------------------------------------------------------------------
    '/analytics/profit-loss': {
      get: {
        tags: ['Analytics'],
        summary: 'Profit & loss analytics',
        operationId: 'getProfitLoss',
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['week', 'month', 'quarter', 'year', 'all'] } },
          { name: 'platform', in: 'query', schema: { $ref: '#/components/schemas/Platform' } },
        ],
        responses: {
          '200': {
            description: 'P&L data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalRevenue: { type: 'number' },
                    totalCost: { type: 'number' },
                    grossProfit: { type: 'number' },
                    netProfit: { type: 'number' },
                    roi: { type: 'number' },
                    chartData: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Price History
    // -----------------------------------------------------------------------
    '/price-history': {
      get: {
        tags: ['Price History'],
        summary: 'Historical price data',
        operationId: 'getPriceHistory',
        parameters: [
          { name: 'title', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'platform', in: 'query', schema: { $ref: '#/components/schemas/Platform' } },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
          { $ref: '#/components/parameters/LimitParam' },
        ],
        responses: {
          '200': {
            description: 'Price history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          date: { type: 'string', format: 'date' },
                          avgPrice: { type: 'number' },
                          minPrice: { type: 'number' },
                          maxPrice: { type: 'number' },
                          volume: { type: 'integer' },
                        },
                      },
                    },
                    summary: { type: 'object' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Search Configs
    // -----------------------------------------------------------------------
    '/search-configs': {
      get: {
        tags: ['Search Configs'],
        summary: 'List saved search configs',
        operationId: 'getSearchConfigs',
        responses: {
          '200': {
            description: 'Search configurations',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SearchConfig' },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Search Configs'],
        summary: 'Create search config',
        operationId: 'createSearchConfig',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'platform'],
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 100 },
                  platform: { $ref: '#/components/schemas/Platform' },
                  keywords: { type: 'array', items: { type: 'string' } },
                  location: { type: 'string' },
                  category: { type: 'string' },
                  minPrice: { type: 'number' },
                  maxPrice: { type: 'number' },
                  minValueScore: { type: 'number' },
                  isActive: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Config created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SearchConfig' } },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/search-configs/{id}': {
      get: {
        tags: ['Search Configs'],
        summary: 'Get search config',
        operationId: 'getSearchConfigById',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Config',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SearchConfig' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Search Configs'],
        summary: 'Update search config',
        operationId: 'updateSearchConfig',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SearchConfig' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated config',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SearchConfig' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Search Configs'],
        summary: 'Delete search config',
        operationId: 'deleteSearchConfig',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // User
    // -----------------------------------------------------------------------
    '/user/settings': {
      get: {
        tags: ['User'],
        summary: 'Get user settings',
        operationId: 'getUserSettings',
        responses: {
          '200': {
            description: 'User settings',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserSettings' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      patch: {
        tags: ['User'],
        summary: 'Update user settings',
        operationId: 'updateUserSettings',
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UserSettings' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated settings',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserSettings' } },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/user/settings/validate-key': {
      post: {
        tags: ['User'],
        summary: 'Validate AI API key',
        operationId: 'validateApiKey',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['provider', 'apiKey'],
                properties: {
                  provider: { type: 'string', enum: ['anthropic', 'openai'] },
                  apiKey: { type: 'string', minLength: 10 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Validation result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    valid: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/user/onboarding': {
      post: {
        tags: ['User'],
        summary: 'Complete onboarding',
        operationId: 'completeOnboarding',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  step: { type: 'string' },
                  data: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Step recorded' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/user/unsubscribe': {
      post: {
        tags: ['User'],
        summary: 'Unsubscribe from emails',
        security: [],
        operationId: 'unsubscribeEmail',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Unsubscribed' },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Checkout
    // -----------------------------------------------------------------------
    '/checkout': {
      post: {
        tags: ['Checkout'],
        summary: 'Create checkout session',
        description: 'Creates a Stripe checkout session for subscription upgrade.',
        operationId: 'createCheckout',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['plan'],
                properties: {
                  plan: { type: 'string', enum: ['PRO', 'TEAM'] },
                  successUrl: { type: 'string', format: 'uri' },
                  cancelUrl: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Checkout session created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri', description: 'Stripe checkout URL' },
                    sessionId: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/checkout/portal': {
      post: {
        tags: ['Checkout'],
        summary: 'Open billing portal',
        description: 'Creates a Stripe customer portal session for subscription management.',
        operationId: 'createBillingPortal',
        responses: {
          '200': {
            description: 'Portal URL',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Webhooks
    // -----------------------------------------------------------------------
    '/webhooks/stripe': {
      post: {
        tags: ['Webhooks'],
        summary: 'Stripe webhook receiver',
        description:
          'Receives Stripe webhook events (payment success, subscription updates, etc.).',
        security: [],
        operationId: 'stripeWebhook',
        parameters: [
          {
            name: 'stripe-signature',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'Stripe webhook signature for verification',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Stripe Event object',
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          '200': { description: 'Event processed' },
          '400': { description: 'Invalid signature or payload' },
        },
      },
    },
  },
};
