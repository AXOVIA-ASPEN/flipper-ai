import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Firebase Hosting Build Configuration', () => {
  let packageJson: { scripts: Record<string, string> };

  beforeAll(() => {
    const raw = readFileSync(join(ROOT, 'package.json'), 'utf-8');
    packageJson = JSON.parse(raw);
  });

  describe('package.json scripts', () => {
    it('should have a build:hosting script', () => {
      expect(packageJson.scripts['build:hosting']).toBeDefined();
    });

    it('build:hosting should set NEXT_OUTPUT=export', () => {
      expect(packageJson.scripts['build:hosting']).toContain('NEXT_OUTPUT=export');
    });

    it('build:hosting should run next build', () => {
      expect(packageJson.scripts['build:hosting']).toContain('next build');
    });
  });

  describe('next.config.js', () => {
    let configContent: string;

    beforeAll(() => {
      configContent = readFileSync(join(ROOT, 'next.config.js'), 'utf-8');
    });

    it('should use conditional output mode based on NEXT_OUTPUT env var', () => {
      expect(configContent).toContain('NEXT_OUTPUT');
      expect(configContent).toContain("'export'");
      expect(configContent).toContain("'standalone'");
    });

    it('should conditionally set images.unoptimized for export mode', () => {
      expect(configContent).toContain('unoptimized');
    });
  });

  describe('build-hosting.sh script', () => {
    it('should exist at scripts/build-hosting.sh', () => {
      expect(existsSync(join(ROOT, 'scripts/build-hosting.sh'))).toBe(true);
    });

    it('should be a shell script', () => {
      const content = readFileSync(join(ROOT, 'scripts/build-hosting.sh'), 'utf-8');
      expect(content.startsWith('#!/')).toBe(true);
    });

    it('should run build:hosting', () => {
      const content = readFileSync(join(ROOT, 'scripts/build-hosting.sh'), 'utf-8');
      expect(content).toContain('build:hosting');
    });

    it('should validate out/ directory exists after build', () => {
      const content = readFileSync(join(ROOT, 'scripts/build-hosting.sh'), 'utf-8');
      expect(content).toContain('out');
    });
  });

  describe('.gitignore', () => {
    it('should include out/ directory', () => {
      const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('out/');
    });
  });
});
