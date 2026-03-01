#!/usr/bin/env tsx
/**
 * API Documentation Generator
 * Scans all route.ts files and generates comprehensive API documentation
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

interface RouteInfo {
  path: string;
  methods: string[];
  description: string;
  params?: string[];
  queryParams?: string[];
  requestBody?: string;
  responseExample?: string;
  authRequired: boolean;
}

function extractRouteInfo(filePath: string, apiPath: string): RouteInfo | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Extract description from top comment
    const descMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
    const description = descMatch ? descMatch[1].trim() : 'No description';
    
    // Detect HTTP methods
    const methods: string[] = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PATCH')) methods.push('PATCH');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');
    
    // Detect auth requirement
    const authRequired = content.includes('getCurrentUserId') || content.includes('getServerSession');
    
    // Extract URL params (e.g., [id], [listingId])
    const params: string[] = [];
    const paramMatches = apiPath.matchAll(/\[([^\]]+)\]/g);
    for (const match of paramMatches) {
      params.push(match[1]);
    }
    
    // Extract query params from searchParams.get()
    const queryParams: string[] = [];
    const queryMatches = content.matchAll(/searchParams\.get\(['"]([^'"]+)['"]\)/g);
    for (const match of queryMatches) {
      queryParams.push(match[1]);
    }
    
    return {
      path: apiPath,
      methods,
      description,
      params: params.length > 0 ? params : undefined,
      queryParams: queryParams.length > 0 ? queryParams : undefined,
      authRequired,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

function findAllRoutes(baseDir: string, prefix = ''): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const entries = readdirSync(baseDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(baseDir, entry.name);
    
    if (entry.isDirectory()) {
      // Handle dynamic routes like [id]
      const pathSegment = entry.name.startsWith('[') ? `:${entry.name.slice(1, -1)}` : entry.name;
      routes.push(...findAllRoutes(fullPath, `${prefix}/${pathSegment}`));
    } else if (entry.name === 'route.ts') {
      const apiPath = `/api${prefix}`;
      const routeInfo = extractRouteInfo(fullPath, apiPath);
      if (routeInfo && routeInfo.methods.length > 0) {
        routes.push(routeInfo);
      }
    }
  }
  
  return routes;
}

function generateMarkdown(routes: RouteInfo[]): string {
  let md = `# Flipper AI - API Documentation

**Generated:** ${new Date().toISOString()}  
**Total Endpoints:** ${routes.length}

---

## Table of Contents

`;

  // Group routes by category
  const categories = new Map<string, RouteInfo[]>();
  routes.forEach(route => {
    const category = route.path.split('/')[2] || 'misc';
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(route);
  });

  // Generate TOC
  for (const [category] of categories) {
    md += `- [${category.charAt(0).toUpperCase() + category.slice(1)}](#${category})\n`;
  }

  md += `\n---\n\n`;

  // Generate sections
  for (const [category, categoryRoutes] of categories) {
    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    
    for (const route of categoryRoutes.sort((a, b) => a.path.localeCompare(b.path))) {
      md += `### \`${route.methods.join(', ')}\` ${route.path}\n\n`;
      md += `**Description:** ${route.description}\n\n`;
      
      if (route.authRequired) {
        md += `**Authentication:** 🔒 Required\n\n`;
      }
      
      if (route.params && route.params.length > 0) {
        md += `**URL Parameters:**\n`;
        route.params.forEach(param => {
          md += `- \`${param}\` (required)\n`;
        });
        md += `\n`;
      }
      
      if (route.queryParams && route.queryParams.length > 0) {
        md += `**Query Parameters:**\n`;
        route.queryParams.forEach(param => {
          md += `- \`${param}\` (optional)\n`;
        });
        md += `\n`;
      }
      
      // Add method-specific details
      route.methods.forEach(method => {
        md += `#### ${method}\n\n`;
        
        if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
          md += `**Request Body:**\n\`\`\`json\n{\n  // See TypeScript types for schema\n}\n\`\`\`\n\n`;
        }
        
        md += `**Response:**\n\`\`\`json\n{\n  "success": true,\n  // Additional fields based on endpoint\n}\n\`\`\`\n\n`;
      });
      
      md += `---\n\n`;
    }
  }
  
  // Add authentication section
  md += `## Authentication\n\n`;
  md += `Most endpoints require authentication. Include credentials via:\n\n`;
  md += `- **Cookie:** Session cookie (automatic in browser)\n`;
  md += `- **Header:** \`Authorization: Bearer <token>\` (API access)\n\n`;
  md += `**401 Unauthorized:** No valid credentials\n`;
  md += `**403 Forbidden:** Valid credentials but insufficient permissions\n\n`;
  
  // Add error codes
  md += `## Error Codes\n\n`;
  md += `| Code | Meaning |\n`;
  md += `|------|----------|\n`;
  md += `| 200 | Success |\n`;
  md += `| 201 | Created |\n`;
  md += `| 400 | Bad Request - Invalid input |\n`;
  md += `| 401 | Unauthorized - Authentication required |\n`;
  md += `| 403 | Forbidden - Insufficient permissions |\n`;
  md += `| 404 | Not Found - Resource doesn't exist |\n`;
  md += `| 409 | Conflict - Resource already exists |\n`;
  md += `| 500 | Internal Server Error |\n\n`;
  
  return md;
}

// Main execution
const apiDir = join(process.cwd(), 'app', 'api');
const docsDir = join(process.cwd(), 'docs', 'api');

console.log('🔍 Scanning API routes...');
const routes = findAllRoutes(apiDir);

console.log(`✅ Found ${routes.length} endpoints`);

if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

const markdown = generateMarkdown(routes);
const outputPath = join(docsDir, 'README.md');
writeFileSync(outputPath, markdown);

console.log(`📝 Documentation written to: ${outputPath}`);
console.log('\n📊 Summary:');
console.log(`   Total endpoints: ${routes.length}`);
console.log(`   Authenticated: ${routes.filter(r => r.authRequired).length}`);
console.log(`   Public: ${routes.filter(r => !r.authRequired).length}`);
