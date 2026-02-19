#!/usr/bin/env ts-node
/**
 * Automated refactoring script: Integrate error library into all API routes
 * 
 * Transforms:
 * - return NextResponse.json({ error: 'message' }, { status: 400 })
 * Into:
 * - throw new ValidationError('message')
 * - return handleError(error) in catch blocks
 * 
 * Also adds proper imports for error handling utilities.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface RefactorStats {
  filesProcessed: number;
  filesModified: number;
  errorsReplaced: number;
  importsAdded: number;
  tryBlocksAdded: number;
}

const stats: RefactorStats = {
  filesProcessed: 0,
  filesModified: 0,
  errorsReplaced: 0,
  importsAdded: 0,
  tryBlocksAdded: 0,
};

/**
 * Check if file already imports error utilities
 */
function hasErrorImport(content: string): boolean {
  return content.includes("from '@/lib/errors'") || content.includes('from "@/lib/errors"');
}

/**
 * Add error handling imports to a file
 */
function addErrorImports(content: string): string {
  // Find the last import statement
  const importRegex = /^import .* from ['"].*['"];?\s*$/gm;
  const matches = Array.from(content.matchAll(importRegex));
  
  if (matches.length === 0) {
    // No imports found, add at the top after comments
    const firstCodeLine = content.search(/^[^/\n]/m);
    const importStatement = "import { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';\n\n";
    return content.slice(0, firstCodeLine) + importStatement + content.slice(firstCodeLine);
  }
  
  const lastImport = matches[matches.length - 1];
  const insertIndex = (lastImport.index ?? 0) + lastImport[0].length;
  
  const importStatement = "\nimport { handleError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';";
  
  return content.slice(0, insertIndex) + importStatement + content.slice(insertIndex);
}

/**
 * Replace manual error responses with standardized error throws
 */
function refactorErrorResponses(content: string): { content: string; replacements: number } {
  let modified = content;
  let replacements = 0;
  
  // Pattern 1: return NextResponse.json({ error: '...' }, { status: 400 })
  // → throw new ValidationError('...')
  const pattern1 = /return\s+NextResponse\.json\(\s*{\s*(?:success:\s*false,?\s*)?error:\s*['"]([^'"]+)['"]\s*}\s*,\s*{\s*status:\s*(\d+)\s*}\s*\)/g;
  
  modified = modified.replace(pattern1, (match, errorMsg, status) => {
    replacements++;
    const statusNum = parseInt(status, 10);
    
    if (statusNum === 400 || statusNum === 422) {
      return `throw new ValidationError('${errorMsg}')`;
    } else if (statusNum === 401) {
      return `throw new UnauthorizedError('${errorMsg}')`;
    } else if (statusNum === 403) {
      return `throw new ForbiddenError('${errorMsg}')`;
    } else if (statusNum === 404) {
      return `throw new NotFoundError('${errorMsg}')`;
    } else {
      return `throw new AppError(ErrorCode.INTERNAL_ERROR, '${errorMsg}')`;
    }
  });
  
  // Pattern 2: return NextResponse.json({ success: false, error: '...' }, { status: 404 })
  // Same as above but with explicit success field
  
  // Pattern 3: catch blocks with manual error responses
  // catch (error) { return NextResponse.json({ error: 'msg' }, { status: 500 }) }
  // → catch (error) { return handleError(error, request.url) }
  const catchPattern = /catch\s*\([^)]*\)\s*{\s*(?:console\.error[^;]*;)?\s*return\s+NextResponse\.json\([^)]+\)\s*;?\s*}/g;
  
  modified = modified.replace(catchPattern, () => {
    replacements++;
    return `catch (error) {\n    return handleError(error, request.url);\n  }`;
  });
  
  return { content: modified, replacements };
}

/**
 * Ensure route handler is wrapped in try-catch
 */
function ensureTryCatch(content: string): { content: string; added: boolean } {
  // Check if already has try-catch
  if (/export\s+async\s+function\s+\w+\([^)]*\)\s*{\s*try\s*{/m.test(content)) {
    return { content, added: false };
  }
  
  // Pattern: export async function GET(request: NextRequest) { ... }
  // Wrap body in try-catch
  const functionPattern = /(export\s+async\s+function\s+(\w+)\([^)]*\)\s*{)/g;
  
  let modified = content;
  let added = false;
  
  modified = modified.replace(functionPattern, (match, funcDecl, funcName) => {
    // Find the closing brace for this function
    const startIndex = content.indexOf(funcDecl) + funcDecl.length;
    let depth = 1;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < content.length && depth > 0; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
    
    if (endIndex > startIndex) {
      const bodyContent = content.slice(startIndex, endIndex);
      
      // Don't wrap if body is very simple (just a return statement)
      if (bodyContent.trim().startsWith('return') && bodyContent.trim().split('\n').length < 3) {
        return match;
      }
      
      added = true;
      const wrappedBody = `\n  try {${bodyContent}\n  } catch (error) {\n    return handleError(error, request.url);\n  }\n`;
      const before = content.slice(0, content.indexOf(funcDecl) + funcDecl.length);
      const after = content.slice(endIndex);
      
      content = before + wrappedBody + after;
    }
    
    return match;
  });
  
  return { content: modified, added };
}

/**
 * Process a single route file
 */
function processRouteFile(filePath: string): void {
  stats.filesProcessed++;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Step 1: Add error imports if not present
  if (!hasErrorImport(content)) {
    content = addErrorImports(content);
    modified = true;
    stats.importsAdded++;
  }
  
  // Step 2: Refactor error responses
  const refactorResult = refactorErrorResponses(content);
  if (refactorResult.replacements > 0) {
    content = refactorResult.content;
    stats.errorsReplaced += refactorResult.replacements;
    modified = true;
  }
  
  // Step 3: Ensure try-catch (commented out for now - too risky to automate)
  // const tryCatchResult = ensureTryCatch(content);
  // if (tryCatchResult.added) {
  //   content = tryCatchResult.content;
  //   stats.tryBlocksAdded++;
  //   modified = true;
  // }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    stats.filesModified++;
    console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
  } else {
    console.log(`⏭️  ${path.relative(process.cwd(), filePath)} (no changes needed)`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Refactoring error handling in API routes...\n');
  
  // Find all route.ts files
  const routeFiles = glob.sync('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true,
  });
  
  console.log(`Found ${routeFiles.length} route files\n`);
  
  // Process each file
  for (const file of routeFiles) {
    processRouteFile(file);
  }
  
  // Print summary
  console.log('\n📊 Refactoring Summary:');
  console.log(`   Files processed: ${stats.filesProcessed}`);
  console.log(`   Files modified: ${stats.filesModified}`);
  console.log(`   Error responses replaced: ${stats.errorsReplaced}`);
  console.log(`   Imports added: ${stats.importsAdded}`);
  console.log(`   Try-catch blocks added: ${stats.tryBlocksAdded}`);
  console.log('\n✨ Done! Remember to:');
  console.log('   1. Review the changes with git diff');
  console.log('   2. Run tests: npm test');
  console.log('   3. Run linter: npm run lint');
  console.log('   4. Commit: git add -A && git commit -m "🐛 [P1] Integrate error library"');
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
