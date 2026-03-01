import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

describe('Firebase Hosting Deploy Configuration', () => {
  describe('deploy-hosting.sh', () => {
    const scriptPath = join(ROOT, 'scripts/deploy/deploy-hosting.sh');

    it('should exist at scripts/deploy/deploy-hosting.sh', () => {
      expect(existsSync(scriptPath)).toBe(true);
    });

    it('should be a shell script', () => {
      const content = readFileSync(scriptPath, 'utf-8');
      expect(content.startsWith('#!/')).toBe(true);
    });

    it('should reference the correct Firebase project', () => {
      const content = readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('axovia-flipper');
    });

    it('should call build-hosting.sh before deploying', () => {
      const content = readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('build-hosting.sh');
    });

    it('should support preview channel deployment', () => {
      const content = readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('hosting:channel:deploy');
    });

    it('should verify deployment after deploy', () => {
      const content = readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('curl');
    });
  });

  describe('Makefile targets', () => {
    let makefile: string;

    beforeAll(() => {
      makefile = readFileSync(join(ROOT, 'Makefile'), 'utf-8');
    });

    it('should have deploy-hosting target', () => {
      expect(makefile).toContain('deploy-hosting:');
    });

    it('should have build-hosting target', () => {
      expect(makefile).toContain('build-hosting:');
    });
  });
});
