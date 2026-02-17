/**
 * API Documentation page — interactive Swagger UI
 * Route: /docs
 *
 * Renders the OpenAPI spec via Swagger UI from CDN (no npm package needed).
 * The spec is served by GET /api/docs.
 *
 * Author: Stephen Boyett
 * Company: Axovia AI
 */
export const metadata = {
  title: 'API Documentation — Flipper AI',
  description: 'Interactive API reference for the Flipper AI REST API',
};

export default function DocsPage() {
  return (
    <html lang="en">
      <head>
        <title>Flipper AI — API Documentation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        <style>{`
          body { margin: 0; padding: 0; background: #0f172a; }
          .swagger-ui .topbar { background: #1e293b; border-bottom: 1px solid #334155; }
          .swagger-ui .topbar .download-url-wrapper .select-label span { color: #94a3b8; }
          .swagger-ui .info .title { color: #f8fafc; }
          .swagger-ui .info, .swagger-ui .info p { color: #cbd5e1; }
          /* Branding banner */
          #flipper-banner {
            background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%);
            padding: 16px 32px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          #flipper-banner h1 {
            color: white;
            margin: 0;
            font-family: system-ui, sans-serif;
            font-size: 1.4rem;
            font-weight: 700;
          }
          #flipper-banner .badge {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 2px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-family: system-ui, sans-serif;
          }
          #flipper-banner .penguin { font-size: 2rem; }
        `}</style>
      </head>
      <body>
        <div id="flipper-banner">
          <span className="penguin">🐧</span>
          <h1>Flipper AI API</h1>
          <span className="badge">v1.0.0</span>
          <span className="badge">OpenAPI 3.0</span>
        </div>
        <div id="swagger-ui" />
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function () {
                SwaggerUIBundle({
                  url: '/api/docs',
                  dom_id: '#swagger-ui',
                  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
                  layout: 'BaseLayout',
                  deepLinking: true,
                  displayRequestDuration: true,
                  filter: true,
                  tryItOutEnabled: true,
                  persistAuthorization: true,
                  displayOperationId: false,
                  defaultModelsExpandDepth: 2,
                  defaultModelExpandDepth: 2,
                  docExpansion: 'none',
                  syntaxHighlight: { activate: true, theme: 'agate' },
                });
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
